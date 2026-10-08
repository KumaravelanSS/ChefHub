const express = require('express');
const router = express.Router();
const { query, withTransaction } = require('../config/mysql_db');
const { MongoAdapter } = require('../config/mongo_db');
const { authenticateToken, requireRole } = require('../middleware/auth_rbac');
const InventoryEngine = require('../services/inventory_engine');
const PayoutService = require('../services/payout_service');
const outboxRelay = require('../services/outbox_relay');
const { checkoutLimiter } = require('../middleware/rate_limiter');

function checkIsVendorOpen(mongoMenu) {
  if (!mongoMenu) return { isOpen: true };

  const todayDate = new Date().toISOString().split('T')[0];

  // Next-Day Auto Reset: If closed on a previous date, auto re-open for the new day
  if (mongoMenu.last_closed_date && mongoMenu.last_closed_date !== todayDate) {
    mongoMenu.is_open = true;
    mongoMenu.closed_reason = null;
    mongoMenu.last_closed_date = null;
    MongoAdapter.findOrSeedVendorMenus([mongoMenu]).catch(err => console.error(err));
    return { isOpen: true };
  }

  if (mongoMenu.is_open === false) {
    return {
      isOpen: false,
      reason: mongoMenu.closed_reason || 'Chef has manually closed the kitchen for today (Offline).'
    };
  }

  if (mongoMenu.open_time && mongoMenu.close_time) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [openH, openM] = (mongoMenu.open_time || '11:00').split(':').map(Number);
    const [closeH, closeM] = (mongoMenu.close_time || '22:00').split(':').map(Number);

    const openMinutes = (openH || 0) * 60 + (openM || 0);
    const closeMinutes = (closeH || 0) * 60 + (closeM || 0);

    if (closeMinutes > openMinutes) {
      if (currentMinutes < openMinutes || currentMinutes > closeMinutes) {
        return { isOpen: false, reason: `Kitchen is currently closed outside operating hours (${mongoMenu.operating_hours || '11:00 AM - 10:00 PM'}). Please come back during operating hours!` };
      }
    }
  }
  return { isOpen: true };
}

const CHEF_LOCATIONS = {
  'chef.mario@chefhub.com': { lat: 12.9784, lng: 77.6408, locality: 'Indiranagar, 100ft Road', city: 'Bengaluru' },
  'chef.priya@chefhub.com': { lat: 12.9352, lng: 77.6245, locality: 'Koramangala, 5th Block', city: 'Bengaluru' },
  'chef.kenji@chefhub.com': { lat: 12.9756, lng: 77.6066, locality: 'MG Road, Church Street', city: 'Bengaluru' },
  'chef.ramu@chefhub.com': { lat: 12.9121, lng: 77.6446, locality: 'HSR Layout, Sector 1', city: 'Bengaluru' }
};

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 3.2;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

// Public Browse Vendors & Menus with Real-time Distance & 20km Radius Enforcement
router.get('/vendors', async (req, res) => {
  try {
    const userLat = req.query.lat ? parseFloat(req.query.lat) : 12.9716; // default UB City Bengaluru
    const userLng = req.query.lng ? parseFloat(req.query.lng) : 77.5946;
    const enforceRadius = req.query.enforce_radius === 'true';

    const vendors = await query(`
      SELECT user_id AS vendor_id, name AS business_name, email, phone, primary_address, latitude, longitude 
      FROM users WHERE role = 'VENDOR' AND status = 'ACTIVE'
    `);

    const result = [];
    for (const v of vendors) {
      // Determine Kitchen Coordinates
      const loc = CHEF_LOCATIONS[v.email.toLowerCase()] || {
        lat: v.latitude ? parseFloat(v.latitude) : 12.9716,
        lng: v.longitude ? parseFloat(v.longitude) : 77.6408,
        locality: v.primary_address || 'Artisanal Kitchen',
        city: 'Bengaluru'
      };

      const distance_km = calculateDistanceKm(userLat, userLng, loc.lat, loc.lng);
      const is_within_20km = distance_km <= 20.0;
      const estimated_mins = Math.max(15, Math.round(distance_km * 3.5 + 15));

      // If strict 20km radius filter requested and outside range, skip vendor
      if (enforceRadius && !is_within_20km) {
        continue;
      }

      const mongoMenu = await MongoAdapter.findVendorMenu(v.vendor_id);
      const mysqlDishes = await query('SELECT * FROM dishes WHERE vendor_id = ? ORDER BY dish_id DESC', [v.vendor_id]);

      // Flatten Mongo dish metadata (images, descriptions, tags)
      const mongoDishMetaMap = {};
      if (mongoMenu && mongoMenu.categories) {
        for (const cat of mongoMenu.categories) {
          for (const d of cat.dishes || []) {
            if (d.dish_id) mongoDishMetaMap[d.dish_id] = d;
            if (d.name) mongoDishMetaMap[d.name.toLowerCase()] = d;
          }
        }
      }

      // Group all registered MySQL dishes by category
      const categoryMap = {};
      for (const d of mysqlDishes) {
        const catName = d.category || 'Main Menu';
        if (!categoryMap[catName]) {
          categoryMap[catName] = [];
        }

        const meta = mongoDishMetaMap[d.dish_id] || mongoDishMetaMap[d.name?.toLowerCase()] || {};
        categoryMap[catName].push({
          dish_id: d.dish_id,
          name: d.name,
          category: d.category,
          price: Number(d.base_price),
          daily_stock: d.daily_stock !== undefined && d.daily_stock !== null ? Number(d.daily_stock) : 20,
          is_available: d.is_available === 1 || d.is_available === true,
          out_of_stock_reason: d.out_of_stock_reason || 'Daily portions fully exhausted (0 remaining)',
          description: d.description || meta.description || 'Handcrafted daily with fresh organic ingredients.',
          image_url: d.image_url || meta.image_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80',
          dietary_tags: meta.dietary_tags || ['Fresh']
        });
      }

      const categories = Object.keys(categoryMap).map(catName => ({
        category_name: catName,
        dishes: categoryMap[catName]
      }));

      const storeStatus = checkIsVendorOpen(mongoMenu);

      result.push({
        ...v,
        distance_km,
        is_within_20km,
        estimated_delivery_mins: estimated_mins,
        kitchen_location: loc,
        menu: {
          vendor_id: v.vendor_id,
          business_name: mongoMenu?.business_name || v.business_name,
          chef_bio: mongoMenu?.chef_bio || 'Michelin-trained artisanal independent chef.',
          hero_image_url: mongoMenu?.hero_image_url || 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80',
          operating_hours: mongoMenu?.operating_hours || '11:00 AM - 10:00 PM',
          open_time: mongoMenu?.open_time || '11:00',
          close_time: mongoMenu?.close_time || '22:00',
          is_open: mongoMenu?.is_open !== undefined ? mongoMenu.is_open : true,
          is_currently_open: storeStatus.isOpen,
          closed_reason: storeStatus.reason || null,
          categories
        }
      });
    }

    return res.json({ success: true, vendors: result });
  } catch (err) {
    console.error('Fetch vendors error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch vendor marketplace.' });
  }
});

// Available Promotional Coupons List
router.get('/coupons/available', async (req, res) => {
  try {
    const coupons = await query('SELECT coupon_id, code, description, discount_type, discount_val, min_order, max_discount FROM coupons WHERE is_active = 1 ORDER BY discount_val DESC');
    return res.json({ success: true, coupons });
  } catch (err) {
    console.error('Fetch coupons error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch available coupons.' });
  }
});

// Strict Coupon Code Validation
router.post('/coupons/validate', async (req, res) => {
  try {
    const { coupon_code, order_subtotal = 0 } = req.body;
    if (!coupon_code || !coupon_code.trim()) {
      return res.status(400).json({ success: false, valid: false, message: 'Coupon code is required.' });
    }

    const subtotal = Number(order_subtotal);
    const code = coupon_code.trim().toUpperCase();

    const rows = await query('SELECT * FROM coupons WHERE UPPER(code) = ?', [code]);
    if (!rows || rows.length === 0) {
      return res.status(400).json({ success: false, valid: false, message: `Coupon '${code}' is invalid or does not exist.` });
    }

    const c = rows[0];
    if (c.is_active === 0) {
      return res.status(400).json({ success: false, valid: false, message: `Coupon '${code}' has expired or is currently deactivated.` });
    }

    const minOrder = Number(c.min_order || 0);
    if (subtotal < minOrder) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: `Coupon '${code}' requires a minimum order subtotal of ₹${minOrder}. (Current: ₹${subtotal.toFixed(2)})`
      });
    }

    let discount = 0;
    if (c.discount_type === 'PERCENT') {
      discount = (subtotal * Number(c.discount_val)) / 100;
      if (c.max_discount && discount > Number(c.max_discount)) {
        discount = Number(c.max_discount);
      }
    } else {
      // FLAT
      discount = Math.min(Number(c.discount_val), subtotal);
    }
    discount = Math.round(discount * 100) / 100;

    return res.json({
      success: true,
      valid: true,
      message: `Coupon '${code}' applied successfully! ₹${discount.toFixed(2)} discount applied.`,
      coupon: {
        code: c.code,
        description: c.description,
        discount_amount: discount,
        discount_type: c.discount_type,
        discount_val: Number(c.discount_val),
        final_subtotal: Math.max(0, subtotal - discount)
      }
    });
  } catch (err) {
    console.error('Validate coupon error:', err);
    return res.status(500).json({ success: false, valid: false, message: 'Server error validating coupon.' });
  }
});

// Customer Escrow Wallet Balance
router.get('/wallet', authenticateToken, requireRole('CUSTOMER'), async (req, res) => {
  try {
    const customer_id = req.user.user_id;
    let rows = await query('SELECT balance, updated_at FROM customer_wallets WHERE customer_id = ?', [customer_id]);
    if (rows.length === 0) {
      // Initialize with ₹1,250.00 platform escrow starter balance
      await query('INSERT INTO customer_wallets (customer_id, balance) VALUES (?, 1250.00)', [customer_id]);
      rows = [{ balance: 1250.00, updated_at: new Date() }];
    }
    return res.json({
      success: true,
      balance: Number(rows[0].balance),
      updated_at: rows[0].updated_at
    });
  } catch (err) {
    console.error('Fetch wallet error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve wallet balance.' });
  }
});

// Top-up Escrow Wallet via Simulated Gateway
router.post('/wallet/topup', authenticateToken, requireRole('CUSTOMER'), async (req, res) => {
  try {
    const customer_id = req.user.user_id;
    const { amount, payment_method } = req.body;
    const topupAmount = parseFloat(amount);

    if (isNaN(topupAmount) || topupAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid top-up amount greater than 0.' });
    }

    let rows = await query('SELECT balance FROM customer_wallets WHERE customer_id = ?', [customer_id]);
    let newBalance = topupAmount;
    if (rows.length === 0) {
      newBalance += 1250.00;
      await query('INSERT INTO customer_wallets (customer_id, balance) VALUES (?, ?)', [customer_id, newBalance]);
    } else {
      newBalance += Number(rows[0].balance);
      await query('UPDATE customer_wallets SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE customer_id = ?', [newBalance, customer_id]);
    }

    const txId = 'WTXN-' + Math.floor(10000000 + Math.random() * 90000000);
    return res.json({
      success: true,
      balance: newBalance,
      transaction_id: txId,
      message: `₹${topupAmount.toFixed(2)} added successfully to ChefHub Escrow Wallet via ${payment_method || 'Payment Gateway'}!`
    });
  } catch (err) {
    console.error('Wallet topup error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process wallet top-up.' });
  }
});

// Create New Order
router.post('/orders', checkoutLimiter, authenticateToken, requireRole('CUSTOMER'), async (req, res) => {
  try {
    const { vendor_id, items, coupon_code, delivery_address, payment_method } = req.body;
    const customer_id = req.user.user_id;

    if (!vendor_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Vendor ID and non-empty items array are required.' });
    }

    // Retrieve user profile primary address if none provided in payload
    let resolvedAddress = delivery_address;
    if (!resolvedAddress) {
      const userProfile = await query('SELECT primary_address FROM users WHERE user_id = ?', [customer_id]);
      resolvedAddress = userProfile[0]?.primary_address || '124 Gourmet Boulevard, Suite 4B, Foodie City';
    }

    // Check store open status before placing order
    const mongoMenu = await MongoAdapter.findVendorMenu(vendor_id);
    if (mongoMenu) {
      const storeStatus = checkIsVendorOpen(mongoMenu);
      if (!storeStatus.isOpen) {
        return res.status(400).json({
          success: false,
          message: `Order Blocked: ${storeStatus.reason} Chef is not accepting orders right now. Please come back later!`
        });
      }
    }

    // Enforce max quantity limit of 5 per item
    for (const item of items) {
      if (item.quantity > 5) {
        return res.status(400).json({ success: false, message: 'Maximum order limit per dish is 5 items.' });
      }
    }

    // Optional Coupon Validation
    let discountAmount = 0;
    let appliedCouponCode = null;
    if (coupon_code && coupon_code.trim()) {
      const cleanCode = coupon_code.trim().toUpperCase();
      const couponRows = await query('SELECT * FROM coupons WHERE UPPER(code) = ? AND is_active = 1', [cleanCode]);
      if (couponRows.length > 0) {
        const c = couponRows[0];
        appliedCouponCode = c.code;
        // Calculation happens below after subtotal computed
      }
    }

    // =========================================================================
    // ACID TRANSACTION WITH EXCLUSIVE ROW-LEVEL LOCKING (SELECT ... FOR UPDATE)
    // Guarantees zero race conditions, prevents negative inventory, and ensures
    // absolute isolation when concurrent customers purchase dishes simultaneously.
    // =========================================================================
    const transactionResult = await withTransaction(async (txQuery) => {
      const dishIds = items.map(i => i.dish_id);
      const placeholders = dishIds.map(() => '?').join(',');

      // 1. Lock and retrieve dish records with FOR UPDATE
      const lockedDishes = await txQuery(
        `SELECT dish_id, name, base_price, daily_stock, is_available 
         FROM dishes 
         WHERE dish_id IN (${placeholders}) 
         FOR UPDATE`,
        dishIds
      );

      const dishMap = new Map();
      for (const d of lockedDishes) {
        dishMap.set(Number(d.dish_id), d);
      }

      let subtotalAmount = 0;
      const itemsProcessed = [];

      for (const item of items) {
        const dish = dishMap.get(Number(item.dish_id));
        if (!dish) {
          const err = new Error(`Dish ID #${item.dish_id} not found.`);
          err.statusCode = 404;
          throw err;
        }

        if (dish.is_available === 0 || (dish.daily_stock !== null && Number(dish.daily_stock) < Number(item.quantity))) {
          const err = new Error(`'${dish.name}' is out of stock or does not have enough portions left today (${dish.daily_stock || 0} remaining).`);
          err.statusCode = 400;
          throw err;
        }

        const subtotal = Number(dish.base_price) * Number(item.quantity);
        subtotalAmount += subtotal;
        itemsProcessed.push({
          dish_id: dish.dish_id,
          dish_name: dish.name,
          quantity: item.quantity,
          price_at_purchase: dish.base_price,
          subtotal
        });
      }

      // Calculate final coupon discount with computed subtotal
      if (appliedCouponCode) {
        const couponRows = await txQuery('SELECT * FROM coupons WHERE UPPER(code) = ? AND is_active = 1', [appliedCouponCode]);
        if (couponRows.length > 0) {
          const c = couponRows[0];
          if (subtotalAmount >= Number(c.min_order || 0)) {
            if (c.discount_type === 'PERCENT') {
              discountAmount = (subtotalAmount * Number(c.discount_val)) / 100;
              if (c.max_discount && discountAmount > Number(c.max_discount)) {
                discountAmount = Number(c.max_discount);
              }
            } else {
              discountAmount = Math.min(Number(c.discount_val), subtotalAmount);
            }
            discountAmount = Math.round(discountAmount * 100) / 100;
          }
        }
      }

      const totalAmount = Math.max(0, subtotalAmount - discountAmount);

      // 2. Lock and verify raw ingredients from inventory via dish_recipes junction table
      const recipeRows = await txQuery(
        `SELECT dr.dish_id, dr.ingredient_id, dr.quantity_required, i.ingredient_name, i.stock_quantity, i.reorder_level
         FROM dish_recipes dr
         JOIN inventory i ON dr.ingredient_id = i.ingredient_id
         WHERE dr.dish_id IN (${placeholders})
         FOR UPDATE`,
        dishIds
      );

      const ingredientNeeds = new Map();
      for (const r of recipeRows) {
        const item = items.find(i => Number(i.dish_id) === Number(r.dish_id));
        const itemQty = item ? Number(item.quantity) : 1;
        const requiredAmount = Number(r.quantity_required) * itemQty;

        if (!ingredientNeeds.has(r.ingredient_id)) {
          ingredientNeeds.set(r.ingredient_id, {
            ingredient_id: r.ingredient_id,
            ingredient_name: r.ingredient_name,
            current_stock: Number(r.stock_quantity),
            reorder_level: Number(r.reorder_level),
            total_required: 0
          });
        }
        ingredientNeeds.get(r.ingredient_id).total_required += requiredAmount;
      }

      for (const [ingId, req] of ingredientNeeds) {
        if (req.current_stock < req.total_required) {
          const err = new Error(`Insufficient stock for ingredient '${req.ingredient_name}'. Required: ${req.total_required}, Available: ${req.current_stock}`);
          err.statusCode = 400;
          throw err;
        }
      }

      // If customer chooses to pay via Escrow Wallet, verify and deduct balance atomically
      const methodLabel = payment_method || 'Credit Card';
      if (payment_method && payment_method.toUpperCase().includes('WALLET')) {
        const walletRows = await txQuery('SELECT balance FROM customer_wallets WHERE customer_id = ? FOR UPDATE', [customer_id]);
        const curBalance = walletRows.length > 0 ? Number(walletRows[0].balance) : 1250.00;
        if (curBalance < totalAmount) {
          const err = new Error(`Insufficient Escrow Wallet balance. Current balance: ₹${curBalance.toFixed(2)}, Order Total: ₹${totalAmount.toFixed(2)}. Please add money to your wallet.`);
          err.statusCode = 400;
          throw err;
        }
        if (walletRows.length > 0) {
          await txQuery('UPDATE customer_wallets SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE customer_id = ?', [totalAmount, customer_id]);
        } else {
          await txQuery('INSERT INTO customer_wallets (customer_id, balance) VALUES (?, ?)', [customer_id, 1250.00 - totalAmount]);
        }
      }

      // 3. Insert Master Order record into `orders` (with delivery_address, coupon_code, discount_amount, payment_method)
      const orderRes = await txQuery(
        `INSERT INTO orders (customer_id, vendor_id, total_amount, escrow_status, payment_status, status, delivery_address, coupon_code, discount_amount, payment_method)
         VALUES (?, ?, ?, 'HOLDING', 'PAID', 'PLACED', ?, ?, ?, ?)`,
        [customer_id, vendor_id, totalAmount, resolvedAddress, appliedCouponCode, discountAmount, methodLabel]
      );
      const order_id = orderRes.insertId;

      // 4. Insert `order_items` & deduct dish portion stock
      for (const item of itemsProcessed) {
        await txQuery(
          `INSERT INTO order_items (order_id, dish_id, quantity, price_at_purchase, subtotal)
           VALUES (?, ?, ?, ?, ?)`,
          [order_id, item.dish_id, item.quantity, item.price_at_purchase, item.subtotal]
        );

        await txQuery(
          `UPDATE dishes SET daily_stock = CASE WHEN daily_stock - ? < 0 THEN 0 ELSE daily_stock - ? END WHERE dish_id = ?`,
          [item.quantity, item.quantity, item.dish_id]
        );

        // Auto mark out-of-stock if daily portions hit 0
        const checkStock = await txQuery(`SELECT daily_stock FROM dishes WHERE dish_id = ?`, [item.dish_id]);
        if (checkStock.length > 0 && Number(checkStock[0].daily_stock) <= 0) {
          await txQuery(
            `UPDATE dishes SET is_available = 0, out_of_stock_reason = 'Daily portions fully exhausted (0 remaining)' WHERE dish_id = ?`,
            [item.dish_id]
          );
        }
      }

      // 5. Deduct raw ingredient stock from `inventory`
      const stockDeductions = [];
      for (const [ingId, req] of ingredientNeeds) {
        await txQuery(
          `UPDATE inventory 
           SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP 
           WHERE ingredient_id = ?`,
          [req.total_required, ingId]
        );

        const newStock = req.current_stock - req.total_required;
        stockDeductions.push({
          ingredient_id: ingId,
          ingredient_name: req.ingredient_name,
          deducted: req.total_required,
          new_stock: newStock,
          low_stock_warning: newStock <= req.reorder_level
        });
      }

      // 6. Create Escrow Payout ledger entry inside the same atomic transaction
      const payout = await PayoutService.createOrderPayout(order_id, vendor_id, null, totalAmount, txQuery);

      // 7. Record Outbox Event in SQL inside the exact same atomic transaction
      // Guarantees that the event is durably recorded in SQL if and only if the order commits
      await outboxRelay.recordEvent(txQuery, {
        aggregate_type: 'ORDER',
        aggregate_id: order_id,
        event_type: 'ORDER_CREATED',
        payload: {
          order_id,
          customer_id,
          vendor_id,
          total_amount: totalAmount,
          timestamp: new Date().toISOString(),
          location_note: 'Order submitted and escrow payment secured'
        }
      });

      return {
        order_id,
        totalAmount,
        payout,
        stockDeductions
      };
    });

    const { order_id, totalAmount, payout, stockDeductions } = transactionResult;

    // Trigger immediate Outbox Relay processing (pushes mutations to MongoDB with 0ms latency)
    outboxRelay.dispatchNow();

    // Post-Transaction Asynchronous Document Sync (Immediate local fallback)
    InventoryEngine.autoSyncDishAvailability(vendor_id).catch(err => console.error('Menu sync error:', err));

    await MongoAdapter.pushTrackingLog(order_id, {
      event: 'ORDER_PLACED',
      timestamp: new Date(),
      location_note: 'Order submitted and escrow payment secured',
      actor_role: 'CUSTOMER'
    });

    return res.json({
      success: true,
      message: 'Order placed successfully! Inventory updated and escrow secured.',
      order: {
        order_id,
        customer_id,
        vendor_id,
        total_amount: totalAmount,
        status: 'PLACED',
        payout,
        stock_deductions: stockDeductions
      }
    });
  } catch (err) {
    console.error('Create order error:', err);
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: err.message || 'Failed to place order.' });
  }
});

// CANCEL ORDER (Customer Order Cancellation CRUD - Supports both POST /:id/cancel and DELETE /:id)
const handleCustomerCancelOrder = async (req, res) => {
  try {
    const order_id = req.params.id;
    const customer_id = req.user.user_id;

    const targetOrder = await query('SELECT * FROM orders WHERE order_id = ? AND customer_id = ?', [order_id, customer_id]);
    if (targetOrder.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (targetOrder[0].status !== 'PLACED') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot cancel order once the chef has accepted and started cooking.' 
      });
    }

    await query("UPDATE orders SET status = 'CANCELLED', escrow_status = 'REFUNDED' WHERE order_id = ?", [order_id]);

    // Restore dish stock
    const orderItems = await query('SELECT dish_id, quantity FROM order_items WHERE order_id = ?', [order_id]);
    for (const it of orderItems) {
      await query('UPDATE dishes SET daily_stock = daily_stock + ? WHERE dish_id = ?', [it.quantity, it.dish_id]);
    }

    // Refund escrow amount to customer wallet
    const refundAmt = Number(targetOrder[0].total_amount);
    try {
      const curBalRows = await query('SELECT balance FROM customer_wallets WHERE customer_id = ?', [customer_id]);
      if (curBalRows.length > 0) {
        await query('UPDATE customer_wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE customer_id = ?', [refundAmt, customer_id]);
      } else {
        await query('INSERT INTO customer_wallets (customer_id, balance) VALUES (?, ?)', [customer_id, 1250.00 + refundAmt]);
      }
    } catch (e) {
      console.warn('[Wallet Refund Sync Warning]', e.message);
    }

    await outboxRelay.recordEvent(null, {
      aggregate_type: 'ORDER',
      aggregate_id: order_id,
      event_type: 'ORDER_CANCELLED',
      payload: {
        new_status: 'ORDER_CANCELLED',
        actor_role: 'CUSTOMER',
        note: `Order cancelled by customer. 100% Escrow refund of ₹${refundAmt.toFixed(2)} credited to account.`,
        refund_amount: refundAmt
      }
    });
    outboxRelay.dispatchNow();

    await MongoAdapter.pushTrackingLog(order_id, {
      event: 'ORDER_CANCELLED',
      timestamp: new Date(),
      location_note: `Order cancelled by customer. 100% Escrow refund of ₹${refundAmt.toFixed(2)} credited back to customer wallet.`,
      actor_role: 'CUSTOMER'
    });

    return res.json({ 
      success: true, 
      message: `Order #${order_id} cancelled. ₹${refundAmt.toFixed(2)} 100% Escrow refund credited to your wallet.` 
    });
  } catch (err) {
    console.error('Cancel order error:', err);
    return res.status(500).json({ success: false, message: 'Failed to cancel order.' });
  }
};

router.post('/orders/:id/cancel', authenticateToken, requireRole('CUSTOMER'), handleCustomerCancelOrder);
router.delete('/orders/:id', authenticateToken, requireRole('CUSTOMER'), handleCustomerCancelOrder);

// Fetch Orders for Authenticated Customer
router.get('/my-orders', authenticateToken, requireRole('CUSTOMER'), async (req, res) => {
  try {
    const orders = await query(`
      SELECT o.*, u.name AS vendor_name 
      FROM orders o
      JOIN users u ON o.vendor_id = u.user_id
      WHERE o.customer_id = ?
      ORDER BY o.timestamp DESC
    `, [req.user.user_id]);

    const result = [];
    for (const o of orders) {
      const items = await query(`
        SELECT oi.*, d.name AS dish_name 
        FROM order_items oi
        JOIN dishes d ON oi.dish_id = d.dish_id
        WHERE oi.order_id = ?
      `, [o.order_id]);

      const trackingObj = await MongoAdapter.getTrackingLog(o.order_id);
      let timeline = trackingObj && trackingObj.timeline && trackingObj.timeline.length > 0 ? trackingObj.timeline : [];

      if (timeline.length === 0) {
        timeline = [
          { event: 'ORDER_PLACED', location_note: 'Order submitted and escrow payment secured', timestamp: o.timestamp || new Date(), actor_role: 'CUSTOMER' }
        ];
        if (o.status === 'CANCELLED') {
          timeline.push({ event: 'ORDER_CANCELLED', location_note: 'Order cancelled. 100% Escrow refund credited back to customer account.', timestamp: o.timestamp || new Date(), actor_role: 'VENDOR' });
        } else {
          if (['PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status)) {
            timeline.push({ event: 'KITCHEN_PREPARING', location_note: 'Chef started preparing your meal', timestamp: new Date(new Date(o.timestamp).getTime() + 2 * 60000), actor_role: 'VENDOR' });
          }
          if (['READY', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status)) {
            timeline.push({ event: 'KITCHEN_READY', location_note: 'Meal packed & waiting for delivery pickup', timestamp: new Date(new Date(o.timestamp).getTime() + 10 * 60000), actor_role: 'VENDOR' });
          }
          if (['OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status)) {
            timeline.push({ event: 'RIDER_ACCEPTED', location_note: 'Courier picked up order and is en route', timestamp: new Date(new Date(o.timestamp).getTime() + 15 * 60000), actor_role: 'RIDER' });
          }
          if (o.status === 'DELIVERED') {
            timeline.push({ event: 'DELIVERED', location_note: 'Order delivered successfully to your doorstep', timestamp: new Date(new Date(o.timestamp).getTime() + 25 * 60000), actor_role: 'RIDER' });
          }
        }
      }

      const review = await MongoAdapter.getReviewForOrder(o.order_id);

      const vendUser = await query('SELECT email, primary_address, latitude, longitude FROM users WHERE user_id = ?', [o.vendor_id]);
      const vEmail = vendUser[0]?.email?.toLowerCase() || '';
      const chefLoc = CHEF_LOCATIONS[vEmail] || {
        lat: vendUser[0]?.latitude ? parseFloat(vendUser[0].latitude) : 12.9784,
        lng: vendUser[0]?.longitude ? parseFloat(vendUser[0].longitude) : 77.6408,
        locality: vendUser[0]?.primary_address || 'Indiranagar Kitchen',
        city: 'Bengaluru'
      };

      let riderLive = { lat: 12.9740, lng: 77.6200 };
      if (o.rider_id) {
        const rLogistics = await MongoAdapter.findRider(o.rider_id);
        if (rLogistics && rLogistics.live_coordinates) {
          riderLive = rLogistics.live_coordinates;
        }
      }

      result.push({
        ...o,
        items,
        tracking: timeline,
        review: review || null,
        chef_location: chefLoc,
        rider_live_coords: riderLive,
        coupon_code: o.coupon_code || null,
        discount_amount: Number(o.discount_amount || 0),
        delivery_address: o.delivery_address || '124 Gourmet Boulevard, Suite 4B, Foodie City'
      });
    }

    return res.json({ success: true, orders: result });
  } catch (err) {
    console.error('Fetch customer orders error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch customer order history.' });
  }
});

// Submit/Upsert Customer Review (One Review Per Order)
router.post('/reviews', authenticateToken, requireRole('CUSTOMER'), async (req, res) => {
  try {
    const { order_id, vendor_id, rider_id, vendor_rating, rider_rating, comment } = req.body;
    
    const avgRating = ((Number(vendor_rating) || 5) + (Number(rider_rating) || 5)) / 2;
    const sentiment_label = avgRating >= 4 ? 'POSITIVE' : avgRating >= 2.5 ? 'NEUTRAL' : 'NEGATIVE';

    const review = await MongoAdapter.upsertReview({
      review_id: Date.now(),
      order_id: Number(order_id),
      customer_id: req.user.user_id,
      vendor_id: Number(vendor_id),
      rider_id: rider_id ? Number(rider_id) : null,
      vendor_rating: Number(vendor_rating),
      rider_rating: Number(rider_rating),
      comment: comment || '',
      sentiment_label,
      updated_at: new Date()
    });

    try {
      const { broadcastToChannel } = require('../services/realtime_engine');
      if (broadcastToChannel) {
        broadcastToChannel(`vendor_${vendor_id}`, 'REVIEW_POSTED', { order_id, vendor_id, sentiment_label });
      }
    } catch (e) {}

    return res.json({ success: true, message: 'Review saved successfully!', review });
  } catch (err) {
    console.error('Submit review error:', err);
    return res.status(500).json({ success: false, message: 'Failed to save review.' });
  }
});

module.exports = router;
