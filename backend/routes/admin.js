const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../config/mysql_db');
const { MongoAdapter } = require('../config/mongo_db');
const { authenticateToken, requireRole } = require('../middleware/auth_rbac');

// Global Users Management
router.get('/users', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const users = await query(`
      SELECT user_id, name, email, plain_password, role, phone, status, created_at 
      FROM users 
      ORDER BY user_id ASC
    `);
    return res.json({ success: true, users });
  } catch (err) {
    console.error('Fetch admin users error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch global users.' });
  }
});

// CREATE NEW USER (Admin User Creation CRUD)
router.post('/users', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Name, Email, Password, and Role are required.' });
    }

    if (!['CUSTOMER', 'VENDOR', 'RIDER'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be CUSTOMER, VENDOR, or RIDER. (Admin count is restricted to 1).' });
    }

    const existing = await query('SELECT user_id FROM users WHERE LOWER(email) = LOWER(?)', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: `Email '${email}' is already registered.` });
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = await query(`
      INSERT INTO users (name, email, password_hash, plain_password, role, phone, status)
      VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
    `, [name, email, hashed, password, role, phone || null]);

    await MongoAdapter.addAuditLog(req.user.user_id, 'USER_CREATED', {
      created_user_id: result.insertId,
      name,
      email,
      role
    });

    return res.json({ success: true, message: `User '${name}' (${role}) created successfully!`, user_id: result.insertId });
  } catch (err) {
    console.error('Create user error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create user.' });
  }
});
// UPDATE USER DETAILS (Admin Edit User CRUD)
router.put('/users/:id', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const user_id = req.params.id;
    const { name, email, password, role, phone, status } = req.body;

    const targetUser = await query('SELECT * FROM users WHERE user_id = ?', [user_id]);
    if (targetUser.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    let hashed = targetUser[0].password_hash;
    let plainPass = targetUser[0].plain_password;
    if (password && password.trim() !== '') {
      hashed = await bcrypt.hash(password, 10);
      plainPass = password;
    }

    await query(`
      UPDATE users 
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          password_hash = ?,
          plain_password = ?,
          role = COALESCE(?, role),
          phone = COALESCE(?, phone),
          status = COALESCE(?, status)
      WHERE user_id = ?
    `, [name, email, hashed, plainPass, role, phone, status, user_id]);

    await MongoAdapter.addAuditLog(req.user.user_id, 'USER_UPDATED', {
      updated_user_id: user_id,
      name: name || targetUser[0].name,
      email: email || targetUser[0].email,
      role: role || targetUser[0].role
    });

    return res.json({ success: true, message: `User #${user_id} updated successfully!` });
  } catch (err) {
    console.error('Update user error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update user.' });
  }
});

// DELETE USER (Admin User Deletion CRUD)
router.delete('/users/:id', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const user_id = req.params.id;

    const targetUser = await query('SELECT * FROM users WHERE user_id = ?', [user_id]);
    if (targetUser.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (targetUser[0].role === 'ADMIN') {
      return res.status(400).json({ success: false, message: 'Cannot delete Master Admin account.' });
    }

    await query('DELETE FROM users WHERE user_id = ?', [user_id]);

    await MongoAdapter.addAuditLog(req.user.user_id, 'USER_DELETED', {
      deleted_user_id: user_id,
      email: targetUser[0].email
    });

    return res.json({ success: true, message: `User #${user_id} deleted successfully.` });
  } catch (err) {
    console.error('Delete user error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete user.' });
  }
});

// Ban / Unban User Account
router.patch('/users/:id/status', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const user_id = req.params.id;
    const { status } = req.body; // 'ACTIVE' or 'BANNED'

    if (!['ACTIVE', 'BANNED'].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be 'ACTIVE' or 'BANNED'." });
    }

    const targetUser = await query('SELECT * FROM users WHERE user_id = ?', [user_id]);
    if (targetUser.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (targetUser[0].role === 'ADMIN') {
      return res.status(400).json({ success: false, message: 'Cannot ban Master Admin account.' });
    }

    await query('UPDATE users SET status = ? WHERE user_id = ?', [status, user_id]);

    await MongoAdapter.addAuditLog(req.user.user_id, 'USER_STATUS_CHANGE', {
      target_user_id: user_id,
      target_email: targetUser[0].email,
      new_status: status
    });

    return res.json({ success: true, message: `User #${user_id} status updated to ${status}.` });
  } catch (err) {
    console.error('Update user status error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update user status.' });
  }
});

// Admin Global Dish Inventory Management & Out-of-Stock Reason Controls
router.get('/dishes', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const dishes = await query(`
      SELECT d.*, u.name AS vendor_name, u.email AS vendor_email
      FROM dishes d
      JOIN users u ON d.vendor_id = u.user_id
      ORDER BY d.dish_id DESC
    `);
    return res.json({ success: true, dishes });
  } catch (err) {
    console.error('Fetch admin dishes error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch global dish menu.' });
  }
});

router.put('/dishes/:id', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const dish_id = req.params.id;
    const { name, category, base_price, daily_stock, is_available, out_of_stock_reason } = req.body;

    const availVal = (is_available === false || is_available === 0 || is_available === '0' || is_available === 'false') ? 0 : 1;
    let stockVal = daily_stock !== undefined && daily_stock !== '' ? Number(daily_stock) : 20;

    if (availVal === 1 && stockVal <= 0) {
      stockVal = 20; // Auto replenish daily stock when toggling ON
    }

    const defaultReason = availVal === 1 ? 'In Stock' : (out_of_stock_reason || 'Kitchen prep closed for today');

    await query(`
      UPDATE dishes
      SET name = COALESCE(?, name),
          category = COALESCE(?, category),
          base_price = COALESCE(?, base_price),
          daily_stock = ?,
          is_available = ?,
          out_of_stock_reason = ?
      WHERE dish_id = ?
    `, [name || null, category || null, base_price !== undefined ? Number(base_price) : null, stockVal, availVal, defaultReason, dish_id]);

    const targetDish = await query('SELECT vendor_id FROM dishes WHERE dish_id = ?', [dish_id]);
    if (targetDish.length > 0) {
      const vendor_id = targetDish[0].vendor_id;
      const mongoMenu = await MongoAdapter.findVendorMenu(vendor_id);
      if (mongoMenu && mongoMenu.categories) {
        for (const cat of mongoMenu.categories) {
          if (cat.dishes) {
            const d = cat.dishes.find(x => Number(x.dish_id) === Number(dish_id));
            if (d) d.is_available = availVal === 1;
          }
        }
        await MongoAdapter.findOrSeedVendorMenus([mongoMenu]);
      }
    }

    await MongoAdapter.addAuditLog(req.user.user_id, 'ADMIN_DISH_UPDATED', {
      dish_id,
      is_available: availVal === 1,
      out_of_stock_reason: defaultReason
    });

    return res.json({ success: true, message: `Dish #${dish_id} updated successfully by Admin!` });
  } catch (err) {
    console.error('Admin edit dish error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update dish details.' });
  }
});

// Platform Metrics & System Analytics
router.get('/metrics', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const userCounts = await query(`
      SELECT role, COUNT(*) as count FROM users GROUP BY role
    `);

    const orderStats = await query(`
      SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as gross_revenue FROM orders
    `);

    const payoutStats = await query(`
      SELECT 
        COALESCE(SUM(vendor_amount), 0) as total_vendor_payouts,
        COALESCE(SUM(rider_amount), 0) as total_rider_payouts,
        COALESCE(SUM(platform_commission), 0) as total_platform_commission
      FROM payouts
    `);

    const allOrders = await query(`
      SELECT o.*, uc.name AS customer_name, uv.name AS vendor_name
      FROM orders o
      JOIN users uc ON o.customer_id = uc.user_id
      JOIN users uv ON o.vendor_id = uv.user_id
      ORDER BY o.timestamp DESC
      LIMIT 20
    `);

    const reviews = await MongoAdapter.getReviews();

    return res.json({
      success: true,
      metrics: {
        users: userCounts,
        orders_summary: orderStats[0],
        financials: payoutStats[0],
        recent_orders: allOrders,
        total_reviews: reviews.length,
        sentiment_summary: {
          positive: reviews.filter(r => r.sentiment_label === 'POSITIVE').length,
          neutral: reviews.filter(r => r.sentiment_label === 'NEUTRAL').length,
          negative: reviews.filter(r => r.sentiment_label === 'NEGATIVE').length
        }
      }
    });
  } catch (err) {
    console.error('Fetch admin metrics error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch platform metrics.' });
  }
});

// System Audit Logs (from MongoDB)
router.get('/audit-logs', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const logs = await MongoAdapter.getAuditLogs();
    return res.json({ success: true, logs });
  } catch (err) {
    console.error('Fetch audit logs error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch system audit logs.' });
  }
});

// Global Reviews Endpoint (from MongoDB)
router.get('/reviews', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const reviews = await MongoAdapter.getReviews();
    const formatted = [];
    for (const r of reviews) {
      const cust = await query('SELECT name FROM users WHERE user_id = ?', [r.customer_id]);
      const vend = await query('SELECT name FROM users WHERE user_id = ?', [r.vendor_id]);
      formatted.push({
        ...r,
        customer_name: cust.length > 0 ? cust[0].name : 'Customer',
        vendor_name: vend.length > 0 ? vend[0].name : 'Vendor'
      });
    }
    return res.json({ success: true, reviews: formatted });
  } catch (err) {
    console.error('Fetch admin reviews error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch global reviews.' });
  }
});

// Global Payouts Ledger (Escrow Split Audit)
router.get('/payouts', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const payouts = await query(`
      SELECT p.*, o.total_amount, o.timestamp AS order_date,
             uc.name AS customer_name, uv.name AS vendor_name, ur.name AS rider_name
      FROM payouts p
      JOIN orders o ON p.order_id = o.order_id
      JOIN users uc ON o.customer_id = uc.user_id
      JOIN users uv ON p.vendor_id = uv.user_id
      LEFT JOIN users ur ON p.rider_id = ur.user_id
      ORDER BY p.executed_at DESC
    `);
    return res.json({ success: true, payouts });
  } catch (err) {
    console.error('Fetch admin payouts error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch global payouts ledger.' });
  }
});

module.exports = router;
