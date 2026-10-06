const path = require('path');
require('dotenv').config();

const dbType = process.env.DB_TYPE || (process.env.DATABASE_URL ? 'postgres' : 'sqlite');
const isSqlite = dbType === 'sqlite';
const isPostgres = dbType === 'postgres' || (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres'));

let pgPool = null;
let mysqlPool = null;
let sqliteDbInstance = null;

function getSqliteDb() {
  if (!sqliteDbInstance) {
    const sqlite3 = require('sqlite3').verbose();
    const sqliteDbPath = path.resolve(__dirname, '..', process.env.DB_PATH || 'chefhub.sqlite');
    sqliteDbInstance = new sqlite3.Database(sqliteDbPath);
    sqliteDbInstance.run('PRAGMA foreign_keys = ON');
  }
  return sqliteDbInstance;
}

function getPgPool() {
  if (!pgPool) {
    const { Pool } = require('pg');
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  }
  return pgPool;
}

// Unified query wrapper
async function query(sql, params = []) {
  if (isPostgres) {
    const pool = getPgPool();
    let paramIndex = 1;
    let pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    pgSql = pgSql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');
    pgSql = pgSql.replace(/INTEGER PRIMARY KEY AUTO_INCREMENT/gi, 'SERIAL PRIMARY KEY');
    pgSql = pgSql.replace(/DATETIME/gi, 'TIMESTAMP');

    const isInsert = pgSql.trim().toUpperCase().startsWith('INSERT');
    if (isInsert && !pgSql.toUpperCase().includes('RETURNING')) {
      pgSql += ' RETURNING *';
    }

    const res = await pool.query(pgSql, params);
    if (isInsert && res.rows.length > 0) {
      const firstRow = res.rows[0];
      const keys = Object.keys(firstRow);
      const idKey = keys.find(k => k.endsWith('_id')) || keys[0];
      return { insertId: firstRow[idKey], rows: res.rows, affectedRows: res.rowCount };
    }
    return res.rows;
  } else if (isSqlite) {
    const db = getSqliteDb();
    return new Promise((resolve, reject) => {
      const trimmedSql = sql.trim();
      const isSelect = trimmedSql.toUpperCase().startsWith('SELECT') || trimmedSql.toUpperCase().startsWith('PRAGMA');
      
      if (isSelect) {
        db.all(sql, params, (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        });
      } else {
        db.run(sql, params, function (err) {
          if (err) return reject(err);
          resolve({ insertId: this.lastID, affectedRows: this.changes });
        });
      }
    });
  } else {
    if (!mysqlPool) {
      const mysql = require('mysql2/promise');
      mysqlPool = mysql.createPool({
        host: process.env.MYSQL_HOST || 'localhost',
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'chefhub_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
    }
    const [results] = await mysqlPool.execute(sql, params);
    return results;
  }
}

/**
 * Executes a callback inside an ACID transaction with support for PostgreSQL, SQLite, and MySQL.
 * Provides transactional row-locking (e.g. SELECT ... FOR UPDATE) and guaranteed atomic COMMIT/ROLLBACK.
 */
async function withTransaction(callback) {
  if (isPostgres) {
    const pool = getPgPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const txQuery = async (sql, params = []) => {
        let paramIndex = 1;
        let pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
        pgSql = pgSql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');
        pgSql = pgSql.replace(/INTEGER PRIMARY KEY AUTO_INCREMENT/gi, 'SERIAL PRIMARY KEY');
        pgSql = pgSql.replace(/DATETIME/gi, 'TIMESTAMP');

        const isInsert = pgSql.trim().toUpperCase().startsWith('INSERT');
        if (isInsert && !pgSql.toUpperCase().includes('RETURNING')) {
          pgSql += ' RETURNING *';
        }

        const res = await client.query(pgSql, params);
        if (isInsert && res.rows.length > 0) {
          const firstRow = res.rows[0];
          const keys = Object.keys(firstRow);
          const idKey = keys.find(k => k.endsWith('_id')) || keys[0];
          return { insertId: firstRow[idKey], rows: res.rows, affectedRows: res.rowCount };
        }
        return res.rows;
      };

      const result = await callback(txQuery);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } else if (isSqlite) {
    const db = getSqliteDb();
    // In SQLite, BEGIN IMMEDIATE acquires an exclusive reservation lock immediately,
    // guaranteeing no other thread or connection can write concurrently.
    await new Promise((resolve, reject) => {
      db.run('BEGIN IMMEDIATE', (err) => (err ? reject(err) : resolve()));
    });

    try {
      const txQuery = async (sql, params = []) => {
        // Strip FOR UPDATE since SQLite uses file-level locking rather than row-level locks
        const cleanSql = sql.replace(/\s+FOR\s+UPDATE/gi, '');
        const trimmedSql = cleanSql.trim();
        const isSelect = trimmedSql.toUpperCase().startsWith('SELECT') || trimmedSql.toUpperCase().startsWith('PRAGMA');

        return new Promise((resolve, reject) => {
          if (isSelect) {
            db.all(cleanSql, params, (err, rows) => {
              if (err) return reject(err);
              resolve(rows);
            });
          } else {
            db.run(cleanSql, params, function (err) {
              if (err) return reject(err);
              resolve({ insertId: this.lastID, affectedRows: this.changes });
            });
          }
        });
      };

      const result = await callback(txQuery);
      await new Promise((resolve, reject) => {
        db.run('COMMIT', (err) => (err ? reject(err) : resolve()));
      });
      return result;
    } catch (err) {
      await new Promise((resolve) => {
        db.run('ROLLBACK', () => resolve());
      });
      throw err;
    }
  } else {
    // MySQL
    if (!mysqlPool) {
      const mysql = require('mysql2/promise');
      mysqlPool = mysql.createPool({
        host: process.env.MYSQL_HOST || 'localhost',
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'chefhub_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
    }

    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();
      const txQuery = async (sql, params = []) => {
        const [results] = await connection.execute(sql, params);
        return results;
      };

      const result = await callback(txQuery);
      await connection.commit();
      return result;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
}

async function initRelationalDb() {
  console.log(`[Relational Engine] Initializing storage mode: ${isSqlite ? 'SQLite' : isPostgres ? 'PostgreSQL (Supabase)' : 'MySQL'}`);
  
  // 1. Users Table
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY ${isSqlite ? 'AUTOINCREMENT' : 'AUTO_INCREMENT'},
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      plain_password VARCHAR(255),
      role VARCHAR(50) NOT NULL CHECK (role IN ('CUSTOMER', 'VENDOR', 'RIDER', 'ADMIN')),
      phone VARCHAR(50),
      status VARCHAR(50) DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await query(`ALTER TABLE users ADD COLUMN plain_password VARCHAR(255)`);
  } catch (err) {
    // Column already exists
  }

  // 2. Dishes Table
  await query(`
    CREATE TABLE IF NOT EXISTS dishes (
      dish_id INTEGER PRIMARY KEY ${isSqlite ? 'AUTOINCREMENT' : 'AUTO_INCREMENT'},
      vendor_id INTEGER NOT NULL,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      base_price DECIMAL(10,2) NOT NULL,
      daily_stock INTEGER DEFAULT 20,
      is_available INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES users(user_id) ON DELETE CASCADE
    )
  `);

  try {
    await query(`ALTER TABLE dishes ADD COLUMN daily_stock INTEGER DEFAULT 20`);
  } catch (err) {
    // Column already exists
  }

  try {
    await query(`ALTER TABLE dishes ADD COLUMN out_of_stock_reason VARCHAR(255) DEFAULT 'Daily portions fully exhausted (0 remaining)'`);
  } catch (err) {
    // Column already exists
  }

  try {
    await query(`ALTER TABLE dishes ADD COLUMN description TEXT`);
  } catch (err) {
    // Column already exists
  }

  try {
    await query(`ALTER TABLE dishes ADD COLUMN image_url VARCHAR(500)`);
  } catch (err) {
    // Column already exists
  }

  // 3. Inventory Table
  await query(`
    CREATE TABLE IF NOT EXISTS inventory (
      ingredient_id INTEGER PRIMARY KEY ${isSqlite ? 'AUTOINCREMENT' : 'AUTO_INCREMENT'},
      vendor_id INTEGER NOT NULL,
      ingredient_name VARCHAR(255) NOT NULL,
      stock_quantity DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      unit VARCHAR(50) NOT NULL,
      reorder_level DECIMAL(10,2) DEFAULT 10.00,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES users(user_id) ON DELETE CASCADE
    )
  `);

  // 4. Dish Recipes Junction Table (Solves relational recipe inventory auto-deduction flaw!)
  await query(`
    CREATE TABLE IF NOT EXISTS dish_recipes (
      recipe_id INTEGER PRIMARY KEY ${isSqlite ? 'AUTOINCREMENT' : 'AUTO_INCREMENT'},
      dish_id INTEGER NOT NULL,
      ingredient_id INTEGER NOT NULL,
      quantity_required DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (dish_id) REFERENCES dishes(dish_id) ON DELETE CASCADE,
      FOREIGN KEY (ingredient_id) REFERENCES inventory(ingredient_id) ON DELETE CASCADE
    )
  `);

  // 5. Orders Table
  await query(`
    CREATE TABLE IF NOT EXISTS orders (
      order_id INTEGER PRIMARY KEY ${isSqlite ? 'AUTOINCREMENT' : 'AUTO_INCREMENT'},
      customer_id INTEGER NOT NULL,
      vendor_id INTEGER NOT NULL,
      rider_id INTEGER,
      total_amount DECIMAL(10,2) NOT NULL,
      escrow_status VARCHAR(50) DEFAULT 'HOLDING',
      payment_status VARCHAR(50) DEFAULT 'PAID',
      status VARCHAR(50) DEFAULT 'PLACED',
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES users(user_id),
      FOREIGN KEY (vendor_id) REFERENCES users(user_id)
    )
  `);

  // 6. Order Items Table
  await query(`
    CREATE TABLE IF NOT EXISTS order_items (
      order_item_id INTEGER PRIMARY KEY ${isSqlite ? 'AUTOINCREMENT' : 'AUTO_INCREMENT'},
      order_id INTEGER NOT NULL,
      dish_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price_at_purchase DECIMAL(10,2) NOT NULL,
      subtotal DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
      FOREIGN KEY (dish_id) REFERENCES dishes(dish_id)
    )
  `);

  // 7. Payouts Table (85% Vendor, 10% Rider, 5% Admin Commission split)
  await query(`
    CREATE TABLE IF NOT EXISTS payouts (
      payout_id INTEGER PRIMARY KEY ${isSqlite ? 'AUTOINCREMENT' : 'AUTO_INCREMENT'},
      order_id INTEGER NOT NULL,
      vendor_id INTEGER NOT NULL,
      rider_id INTEGER,
      vendor_amount DECIMAL(10,2) NOT NULL,
      rider_amount DECIMAL(10,2) NOT NULL,
      platform_commission DECIMAL(10,2) NOT NULL,
      payout_status VARCHAR(50) DEFAULT 'SCHEDULED',
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
    )
  `);

  // 8. Transactional Outbox Events Table (Guarantees Relational -> NoSQL Eventual Consistency)
  await query(`
    CREATE TABLE IF NOT EXISTS outbox_events (
      event_id INTEGER PRIMARY KEY ${isSqlite ? 'AUTOINCREMENT' : 'AUTO_INCREMENT'},
      aggregate_type VARCHAR(100) NOT NULL,
      aggregate_id VARCHAR(100) NOT NULL,
      event_type VARCHAR(100) NOT NULL,
      payload TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'PENDING',
      retry_count INTEGER DEFAULT 0,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME
    )
  `);

  try {
    await query(`CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox_events(status, created_at)`);
  } catch (err) {}

  try {
    await query(`ALTER TABLE users ADD COLUMN primary_address TEXT`);
  } catch (err) {}

  try {
    await query(`ALTER TABLE users ADD COLUMN latitude DECIMAL(10,6) DEFAULT 12.9716`);
  } catch (err) {}

  try {
    await query(`ALTER TABLE users ADD COLUMN longitude DECIMAL(10,6) DEFAULT 77.5946`);
  } catch (err) {}

  try {
    await query(`ALTER TABLE orders ADD COLUMN delivery_address TEXT`);
  } catch (err) {}

  try {
    await query(`ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(50)`);
  } catch (err) {}

  try {
    await query(`ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0`);
  } catch (err) {}

  // 9. Coupons Table (Strict Discount Codes & Promotions)
  await query(`
    CREATE TABLE IF NOT EXISTS coupons (
      coupon_id INTEGER PRIMARY KEY ${isSqlite ? 'AUTOINCREMENT' : 'AUTO_INCREMENT'},
      code VARCHAR(50) UNIQUE NOT NULL,
      description VARCHAR(255) NOT NULL,
      discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('PERCENT', 'FLAT')),
      discount_val DECIMAL(10,2) NOT NULL,
      min_order DECIMAL(10,2) DEFAULT 0,
      max_discount DECIMAL(10,2) DEFAULT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed default platform coupons if empty
  try {
    const existingCoupons = await query('SELECT count(*) as count FROM coupons');
    const count = existingCoupons[0]?.count || 0;
    if (count === 0) {
      const defaultCoupons = [
        ['CHEF50', '50% Flat Discount on gourmet dishes (up to ₹150 off)', 'PERCENT', 50.00, 250.00, 150.00, 1],
        ['GOURMET20', '20% Off on artisanal kitchen orders above ₹200', 'PERCENT', 20.00, 200.00, 100.00, 1],
        ['FIRSTBITE', 'Flat ₹100 Welcome Discount for new foodies', 'FLAT', 100.00, 300.00, 100.00, 1],
        ['FREESHIP', 'Zero Delivery Fee - 100% Free Express Logistics', 'FLAT', 40.00, 150.00, 40.00, 1]
      ];
      for (const [code, desc, type, val, minO, maxD, act] of defaultCoupons) {
        await query(
          'INSERT INTO coupons (code, description, discount_type, discount_val, min_order, max_discount, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [code, desc, type, val, minO, maxD, act]
        );
      }
      console.log('[Relational Engine] Seeded 4 platform promotional coupons (CHEF50, GOURMET20, FIRSTBITE, FREESHIP).');
    }
  } catch (err) {
    // Already populated or table locked
  }

  console.log('[Relational Engine] All 9 relational tables checked/created successfully (including outbox_events & coupons).');

  if (isPostgres) {
    const tables = ['users', 'dishes', 'inventory', 'dish_recipes', 'orders', 'order_items', 'payouts', 'outbox_events', 'coupons'];
    for (const t of tables) {
      try {
        await query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
      } catch (err) {
        // Ignored if already enabled or not supported
      }
    }
    console.log('[Relational Engine] Row Level Security (RLS) enabled on all 9 tables.');
  }
}

module.exports = {
  query,
  withTransaction,
  initRelationalDb
};
