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

  console.log('[Relational Engine] All 7 relational tables checked/created successfully.');
}

module.exports = {
  query,
  initRelationalDb
};
