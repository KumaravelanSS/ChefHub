const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/mysql_db');
const { authenticateToken, requireRole, JWT_SECRET } = require('../middleware/auth_rbac');
const { MongoAdapter } = require('../config/mongo_db');

function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, score: 0, message: 'Password is required' };
  }
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  let score = 0;
  if (hasMinLength) score++;
  if (hasUpper) score++;
  if (hasLower) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;

  // Must achieve at least "Good" (score >= 4 with length >= 8)
  if (score < 4 || !hasMinLength) {
    return {
      valid: false,
      score,
      message: 'Password security too low. Must be at least 8 characters with uppercase, lowercase, numbers, and special characters.'
    };
  }
  return { valid: true, score };
}

// Unified Login Endpoint for all 4 roles (Accepts username, email, or phone)
router.post('/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const identifier = (username || email || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Username/Email/Phone and Password are required.' });
    }

    // Query user by email, username, or phone
    const users = await query(`
      SELECT * FROM users 
      WHERE LOWER(email) = LOWER(?) OR LOWER(name) = LOWER(?) OR phone = ?
    `, [identifier, identifier, identifier]);

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
        phone: user.phone || null,
        status: user.status,
        primary_address: user.primary_address || '124 Gourmet Boulevard, Suite 4B, Foodie City',
        latitude: user.latitude ? Number(user.latitude) : 12.9716,
        longitude: user.longitude ? Number(user.longitude) : 77.5946
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
});

// Self-Service Registration Endpoint with Strict Password Security Enforcement
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'CUSTOMER', phone, primary_address, latitude, longitude } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, Email/Username, and Password are required.' });
    }

    const targetRole = ['CUSTOMER', 'VENDOR', 'RIDER'].includes(role) ? role : 'CUSTOMER';

    // Strict Password Validation Check
    const pwdCheck = validatePasswordStrength(password);
    if (!pwdCheck.valid) {
      return res.status(400).json({
        success: false,
        message: pwdCheck.message,
        strength_score: pwdCheck.score
      });
    }

    // Check existing email or username
    const existing = await query('SELECT user_id FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(name) = LOWER(?)', [email, name]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'An account with this email or username already exists.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const defaultAddress = primary_address || '124 Gourmet Boulevard, Suite 4B, Foodie City';
    const defaultLat = latitude ? Number(latitude) : 12.9716;
    const defaultLng = longitude ? Number(longitude) : 77.5946;

    const result = await query(`
      INSERT INTO users (name, email, password_hash, plain_password, role, phone, primary_address, latitude, longitude, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
    `, [name.trim(), email.trim(), hashed, password, targetRole, phone || null, defaultAddress, defaultLat, defaultLng]);

    const newUserId = result.insertId;

    const tokenPayload = {
      user_id: newUserId,
      name: name.trim(),
      email: email.trim(),
      role: targetRole
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

    return res.json({
      success: true,
      message: `Account created successfully! Welcome to ChefHub, ${name}!`,
      token,
      user: {
        user_id: newUserId,
        name: name.trim(),
        email: email.trim(),
        role: targetRole,
        phone: phone || null,
        status: 'ACTIVE',
        primary_address: defaultAddress,
        latitude: defaultLat,
        longitude: defaultLng
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during account creation.' });
  }
});

// Get Current User Profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const users = await query('SELECT user_id, name, email, role, phone, status, primary_address, latitude, longitude FROM users WHERE user_id = ?', [req.user.user_id]);
    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const u = users[0];
    return res.json({
      success: true,
      user: {
        ...u,
        latitude: u.latitude ? Number(u.latitude) : 12.9716,
        longitude: u.longitude ? Number(u.longitude) : 77.5946,
        primary_address: u.primary_address || '124 Gourmet Boulevard, Suite 4B, Foodie City'
      }
    });
  } catch (err) {
    console.error('Fetch profile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch user profile.' });
  }
});

// Update Primary Address in User Profile
router.put('/profile/address', authenticateToken, async (req, res) => {
  try {
    const { primary_address, latitude, longitude } = req.body;
    if (!primary_address || !primary_address.trim()) {
      return res.status(400).json({ success: false, message: 'Primary address text is required.' });
    }

    const lat = latitude !== undefined && latitude !== null ? Number(latitude) : 12.9716;
    const lng = longitude !== undefined && longitude !== null ? Number(longitude) : 77.5946;

    await query(`
      UPDATE users 
      SET primary_address = ?, latitude = ?, longitude = ?
      WHERE user_id = ?
    `, [primary_address.trim(), lat, lng, req.user.user_id]);

    return res.json({
      success: true,
      message: 'Primary delivery address successfully saved to profile!',
      primary_address: primary_address.trim(),
      latitude: lat,
      longitude: lng
    });
  } catch (err) {
    console.error('Update profile address error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update primary address.' });
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
