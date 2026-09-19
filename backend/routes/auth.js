const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/mysql_db');
const { authenticateToken, requireRole, JWT_SECRET } = require('../middleware/auth_rbac');
const { MongoAdapter } = require('../config/mongo_db');

// Unified Login Endpoint for all 4 roles
router.post('/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const identifier = (username || email || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Username/Email and Password are required.' });
    }

    // Query user by email or username
    const users = await query(`
      SELECT * FROM users 
      WHERE LOWER(email) = LOWER(?) OR LOWER(name) = LOWER(?)
    `, [identifier, identifier]);

    if (!users || users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
    }

    const user = users[0];

    if (user.status === 'BANNED') {
      return res.status(403).json({ success: false, message: 'Account has been suspended/banned by Platform Admin.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Incorrect password.' });
    }

    const tokenPayload = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

    return res.json({
      success: true,
      message: `Successfully logged in as ${user.role}`,
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
});

// Update Admin Credentials (Admin Only)
router.put('/admin/update-credentials', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { new_username, new_password } = req.body;

    if (!new_username || !new_password) {
      return res.status(400).json({ success: false, message: 'New username and new password are required.' });
    }

    const hashed = await bcrypt.hash(new_password, 10);

    await query(`
      UPDATE users 
      SET name = ?, email = ?, password_hash = ?
      WHERE role = 'ADMIN' AND user_id = ?
    `, [new_username, new_username, hashed, req.user.user_id]);

    await MongoAdapter.addAuditLog(req.user.user_id, 'ADMIN_CREDENTIALS_CHANGED', {
      new_username,
      updated_at: new Date()
    });

    return res.json({
      success: true,
      message: 'Admin credentials updated successfully! Please log in again with your new credentials.',
      new_username
    });
  } catch (err) {
    console.error('Update admin credentials error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update admin credentials.' });
  }
});

module.exports = router;
