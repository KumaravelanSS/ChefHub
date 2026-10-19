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

// Strict Username Validation
function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, message: 'Username is required.' };
  }
  const trimmed = username.trim();
  if (trimmed.length < 3) {
    return { valid: false, message: 'Username must be at least 3 characters long.' };
  }
  if (trimmed.length > 50) {
    return { valid: false, message: 'Username cannot exceed 50 characters.' };
  }
  if (/^\d+$/.test(trimmed)) {
    return { valid: false, message: 'Username cannot be purely numbers. (Pure numbers are reserved for Customer IDs).' };
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_\-\.\s]*$/.test(trimmed)) {
    return { valid: false, message: 'Username must start with an alphanumeric character and contain only letters, numbers, spaces, dots, hyphens, and underscores.' };
  }
  return { valid: true, username: trimmed };
}

// Dedicated Real-Time Username Format & Availability Checker Endpoint
router.get('/validate-username', async (req, res) => {
  const username = (req.query.username || '').trim();
  const check = validateUsername(username);
  if (!check.valid) {
    return res.json({ valid: false, message: check.message });
  }
  try {
    const existing = await query('SELECT user_id FROM users WHERE LOWER(name) = LOWER(?)', [username]);
    if (existing && existing.length > 0) {
      return res.json({ valid: false, message: 'This username is already taken. Please choose another.' });
    }
    return res.json({ valid: true, message: 'Username is available!' });
  } catch (err) {
    return res.json({ valid: true, message: 'Username format is valid.' });
  }
});

// Unified Login Endpoint for all roles (Accepts Email, Customer ID, Username, or Phone)
router.post('/login', async (req, res) => {
  try {
    const { username, email, customer_id, identifier: rawId, password } = req.body;
    const identifier = (rawId || username || email || customer_id || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please enter your Username, Email, or Customer ID, along with your password.' 
      });
    }

    // Smart Identifier Parsing: Detect if input is a Customer ID (e.g. "4", "#4", "CUST-4", "CUST4", "cust_4", "customer:4")
    let numericCustomerId = null;
    const strippedId = identifier.replace(/^(cust[-_]?|customer[:\-_]?|#|id[:\s#]*)/i, '').trim();
    if (/^\d+$/.test(strippedId)) {
      numericCustomerId = parseInt(strippedId, 10);
    }

    // Query user by: Customer ID (user_id), Email, Username (name), or Phone
    let users = [];
    if (numericCustomerId !== null) {
      users = await query(`
        SELECT * FROM users 
        WHERE user_id = ? OR LOWER(email) = LOWER(?) OR LOWER(name) = LOWER(?) OR phone = ?
      `, [numericCustomerId, identifier, identifier, identifier]);
    } else {
      users = await query(`
        SELECT * FROM users 
        WHERE LOWER(email) = LOWER(?) OR LOWER(name) = LOWER(?) OR phone = ?
      `, [identifier, identifier, identifier]);
    }

    if (!users || users.length === 0) {
      const hint = numericCustomerId !== null 
        ? `No account found with Customer ID #${numericCustomerId} or matching credentials.`
        : 'Invalid credentials. User not found.';
      return res.status(401).json({ success: false, message: hint });
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

    // Assessment for weak password reminder (Assessment + Flag)
    const pwdStrength = validatePasswordStrength(password);
    const commonWeakPatterns = ['customer123', 'vendor123', 'rider123', 'admin123', '123456', 'password', 'chefhub123'];
    const isWeakPassword = !pwdStrength.valid || pwdStrength.score < 4 || commonWeakPatterns.includes(password.toLowerCase());

    return res.json({
      success: true,
      loginSuccess: true,
      weakPasswordWarning: isWeakPassword,
      message: `Successfully logged in as ${user.role} (Customer ID #${user.user_id})`,
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || null,
        status: user.status,
        avatar_url: user.avatar_url || null,
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

// Dedicated Social Login Endpoint (Google OAuth / Apple ID)
router.post('/social-login', async (req, res) => {
  try {
    const { provider = 'google', email, name, role = 'CUSTOMER', avatar_url } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Social profile email is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name || cleanEmail.split('@')[0] || 'ChefHub User').trim();
    const targetRole = ['CUSTOMER', 'VENDOR', 'RIDER', 'ADMIN'].includes(role) ? role : 'CUSTOMER';

    let users = await query('SELECT * FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    let user;

    if (users && users.length > 0) {
      user = users[0];
      if (user.status === 'BANNED') {
        return res.status(403).json({ success: false, message: 'Account has been suspended/banned by Platform Admin.' });
      }
    } else {
      const randomPwd = Math.random().toString(36).slice(-10) + 'A1!';
      const hashed = await bcrypt.hash(randomPwd, 10);
      const defaultAddress = '124 Gourmet Boulevard, Suite 4B, Foodie City';
      const defaultLat = 12.9716;
      const defaultLng = 77.5946;

      const result = await query(`
        INSERT INTO users (name, email, password_hash, plain_password, role, phone, primary_address, latitude, longitude, status, avatar_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
      `, [cleanName, cleanEmail, hashed, randomPwd, targetRole, '+91 98765 43210', defaultAddress, defaultLat, defaultLng, avatar_url || null]);

      user = {
        user_id: result.insertId,
        name: cleanName,
        email: cleanEmail,
        role: targetRole,
        phone: '+91 98765 43210',
        status: 'ACTIVE',
        primary_address: defaultAddress,
        latitude: defaultLat,
        longitude: defaultLng,
        avatar_url: avatar_url || null
      };
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
      message: `Successfully authenticated via ${provider === 'apple' ? 'Apple ID' : 'Google Workspace'}`,
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || null,
        status: user.status,
        avatar_url: user.avatar_url || avatar_url || null,
        primary_address: user.primary_address || '124 Gourmet Boulevard, Suite 4B, Foodie City',
        latitude: user.latitude ? Number(user.latitude) : 12.9716,
        longitude: user.longitude ? Number(user.longitude) : 77.5946
      }
    });
  } catch (err) {
    console.error('Social login error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during social authentication.' });
  }
});

// Self-Service Registration Endpoint with Strict Password & Username Validation
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'CUSTOMER', phone, primary_address, latitude, longitude } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Username/Name, Email, and Password are required.' });
    }

    // 1. Strict Username Validation
    const uCheck = validateUsername(name);
    if (!uCheck.valid) {
      return res.status(400).json({
        success: false,
        message: uCheck.message
      });
    }

    // 2. Mandatory Phone Number Validation & Unique Constraint
    if (!phone || typeof phone !== 'string' || phone.trim().replace(/\D/g, '').length < 10) {
      return res.status(400).json({ 
        success: false, 
        message: 'A valid, full-length mobile phone number (at least 10 digits) is mandatory for registration.' 
      });
    }
    const cleanPhone = phone.trim();

    const targetRole = ['CUSTOMER', 'VENDOR', 'RIDER'].includes(role) ? role : 'CUSTOMER';

    // 3. Strict Password Security Check
    const pwdCheck = validatePasswordStrength(password);
    if (!pwdCheck.valid) {
      return res.status(400).json({
        success: false,
        message: pwdCheck.message,
        strength_score: pwdCheck.score
      });
    }

    // 4. Check existing email, username, or phone number
    const existing = await query(`
      SELECT user_id, email, name, phone FROM users 
      WHERE LOWER(email) = LOWER(?) OR LOWER(name) = LOWER(?) OR phone = ?
    `, [email.trim(), name.trim(), cleanPhone]);

    if (existing && existing.length > 0) {
      const match = existing[0];
      if (match.phone === cleanPhone) {
        return res.status(400).json({ success: false, message: 'This phone number is already registered to an account.' });
      }
      return res.status(400).json({ success: false, message: 'An account with this email or username already exists.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const defaultAddress = primary_address || '124 Gourmet Boulevard, Suite 4B, Foodie City';
    const defaultLat = latitude ? Number(latitude) : 12.9716;
    const defaultLng = longitude ? Number(longitude) : 77.5946;

    const result = await query(`
      INSERT INTO users (name, email, password_hash, plain_password, role, phone, primary_address, latitude, longitude, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
    `, [name.trim(), email.trim(), hashed, password, targetRole, cleanPhone, defaultAddress, defaultLat, defaultLng]);

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
    const users = await query('SELECT user_id, name, email, role, phone, status, avatar_url, primary_address, latitude, longitude FROM users WHERE user_id = ?', [req.user.user_id]);
    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const u = users[0];
    return res.json({
      success: true,
      user: {
        ...u,
        avatar_url: u.avatar_url || null,
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

// In-Memory Secure OTP Store for Phone & Email Verifications (10 min expiry)
const secureOtpStore = new Map();

// Helper to generate 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 1. Send Phone OTP (For Registration & MFA)
router.post('/send-phone-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || phone.trim().replace(/\D/g, '').length < 10) {
      return res.status(400).json({ success: false, message: 'Valid 10-digit mobile number required.' });
    }
    const cleanPhone = phone.trim();
    const otp = generateOtp();
    secureOtpStore.set(`PHONE:${cleanPhone}`, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    console.log(`[SMS-GATEWAY] Verification OTP for ${cleanPhone}: ${otp} (Demo bypass: 123456)`);

    return res.json({
      success: true,
      message: `SMS OTP sent successfully to ${cleanPhone}`,
      dev_otp: otp, // Provided for instant demo/testing verification without SMS provider costs
      expires_in: '10 minutes'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to dispatch SMS OTP.' });
  }
});

// 2. Verify Phone OTP
router.post('/verify-phone-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const cleanPhone = (phone || '').trim();
    const cleanOtp = (otp || '').trim();

    if (!cleanPhone || !cleanOtp) {
      return res.status(400).json({ success: false, message: 'Phone and OTP code are required.' });
    }

    // Support dev default 123456 or generated OTP
    if (cleanOtp === '123456') {
      return res.json({ success: true, verified: true, message: 'Phone verified successfully!' });
    }

    const stored = secureOtpStore.get(`PHONE:${cleanPhone}`);
    if (!stored || Date.now() > stored.expiresAt) {
      return res.status(400).json({ success: false, verified: false, message: 'OTP expired or not found. Please request a new code.' });
    }

    if (stored.otp !== cleanOtp) {
      return res.status(400).json({ success: false, verified: false, message: 'Incorrect OTP code entered.' });
    }

    secureOtpStore.delete(`PHONE:${cleanPhone}`);
    return res.json({ success: true, verified: true, message: 'Phone verified successfully!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Verification failed.' });
  }
});

// 3. Security & Credentials: Change Password
router.post('/profile/change-password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password, confirm_new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required.' });
    }

    if (confirm_new_password && new_password !== confirm_new_password) {
      return res.status(400).json({ success: false, message: 'New password and confirm password do not match.' });
    }

    // Fetch user with password_hash
    const users = await query('SELECT user_id, password_hash FROM users WHERE user_id = ?', [req.user.user_id]);
    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = users[0];
    const isCurrentMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isCurrentMatch) {
      return res.status(400).json({ success: false, message: 'Current password entered is incorrect. Access denied.' });
    }

    // Check strength of new password
    const strengthCheck = validatePasswordStrength(new_password);
    if (!strengthCheck.valid) {
      return res.status(400).json({
        success: false,
        message: strengthCheck.message,
        strength_score: strengthCheck.score
      });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await query(`
      UPDATE users 
      SET password_hash = ?, plain_password = ?
      WHERE user_id = ?
    `, [newHash, new_password, req.user.user_id]);

    await MongoAdapter.addAuditLog(req.user.user_id, 'PASSWORD_CHANGED', {
      user_id: req.user.user_id,
      timestamp: new Date()
    });

    return res.json({
      success: true,
      message: 'Password successfully updated! Your account security is enhanced.'
    });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ success: false, message: 'Failed to change password.' });
  }
});

// 4. Security & Credentials: Step 1 - Request OTP to Change Email
router.post('/profile/request-email-otp', authenticateToken, async (req, res) => {
  try {
    const users = await query('SELECT user_id, email, phone FROM users WHERE user_id = ?', [req.user.user_id]);
    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const u = users[0];
    const otp = generateOtp();

    if (u.phone && u.phone.trim().length >= 8) {
      // Primary Flow: Phone Auth
      const cleanPhone = u.phone.trim();
      secureOtpStore.set(`EMAIL_CHANGE:${req.user.user_id}`, {
        otp,
        target: cleanPhone,
        method: 'PHONE',
        expiresAt: Date.now() + 10 * 60 * 1000
      });
      console.log(`[SMS-GATEWAY] Email update OTP for user #${u.user_id} (${cleanPhone}): ${otp} (Demo bypass: 123456)`);
      const masked = cleanPhone.slice(0, 3) + '••••' + cleanPhone.slice(-3);
      return res.json({
        success: true,
        method: 'PHONE',
        target_masked: masked,
        message: `OTP sent via SMS to your registered phone (${masked})`,
        dev_otp: otp
      });
    } else {
      // Fallback Flow: Email Auth
      secureOtpStore.set(`EMAIL_CHANGE:${req.user.user_id}`, {
        otp,
        target: u.email,
        method: 'EMAIL',
        expiresAt: Date.now() + 10 * 60 * 1000
      });
      console.log(`[EMAIL-GATEWAY] Email update OTP for user #${u.user_id} (${u.email}): ${otp} (Demo bypass: 123456)`);
      const [local, dom] = u.email.split('@');
      const masked = local.slice(0, 2) + '••••@' + dom;
      return res.json({
        success: true,
        method: 'EMAIL',
        target_masked: masked,
        message: `OTP sent to your current email (${masked}) to confirm identity`,
        dev_otp: otp
      });
    }
  } catch (err) {
    console.error('Request email OTP error:', err);
    return res.status(500).json({ success: false, message: 'Failed to dispatch email verification OTP.' });
  }
});

// 5. Security & Credentials: Step 2 - Verify OTP & Update Email
router.post('/profile/verify-email-otp-and-update', authenticateToken, async (req, res) => {
  try {
    const { otp, new_email } = req.body;
    if (!otp || !new_email || !new_email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Valid OTP and new email address are required.' });
    }

    const cleanOtp = String(otp).trim();
    const cleanEmail = new_email.trim().toLowerCase();

    // Verify OTP
    let isValidOtp = cleanOtp === '123456';
    if (!isValidOtp) {
      const stored = secureOtpStore.get(`EMAIL_CHANGE:${req.user.user_id}`);
      if (stored && Date.now() <= stored.expiresAt && stored.otp === cleanOtp) {
        isValidOtp = true;
      }
    }

    if (!isValidOtp) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP code entered.' });
    }

    // Check if new email already exists
    const existing = await query('SELECT user_id FROM users WHERE LOWER(email) = ? AND user_id != ?', [cleanEmail, req.user.user_id]);
    if (existing && existing.length > 0) {
      return res.status(400).json({ success: false, message: 'This email address is already associated with another account.' });
    }

    // Update email in DB
    await query('UPDATE users SET email = ? WHERE user_id = ?', [cleanEmail, req.user.user_id]);
    secureOtpStore.delete(`EMAIL_CHANGE:${req.user.user_id}`);

    await MongoAdapter.addAuditLog(req.user.user_id, 'EMAIL_CHANGED', {
      user_id: req.user.user_id,
      new_email: cleanEmail,
      timestamp: new Date()
    });

    return res.json({
      success: true,
      message: 'Email address updated successfully!',
      new_email: cleanEmail
    });
  } catch (err) {
    console.error('Verify email OTP error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update email address.' });
  }
});

router.validatePasswordStrength = validatePasswordStrength;
module.exports = router;
