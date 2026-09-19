const express = require('express');
const router = express.Router();
const { query } = require('../config/mysql_db');
const { MongoAdapter } = require('../config/mongo_db');
const { authenticateToken, requireRole } = require('../middleware/auth_rbac');
const InventoryEngine = require('../services/inventory_engine');
const PayoutService = require('../services/payout_service');

// Public Browse Vendors & Menus
router.get('/vendors', async (req, res) => {
  try {
    const vendors = await query(`
      SELECT user_id AS vendor_id, name AS business_name, email, phone 
      FROM users WHERE role = 'VENDOR' AND status = 'ACTIVE'
    `);

    const result = [];
    for (const v of vendors) {
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

        const meta = mongoDishMetaMap[d.dish_id] || mongoDishMetaMap[d.name.toLowerCase()] || {};
        categoryMap[catName].push({
          dish_id: d.dish_id,
          name: d.name,
          category: d.category,
          price: Number(d.base_price),
          daily_stock: d.daily_stock !== undefined && d.daily_stock !== null ? Number(d.daily_stock) : 20,
          is_available: d.is_available === 1 || d.is_available === true,
          out_of_stock_reason: d.out_of_stock_reason || 'Daily portions fully exhausted (0 remaining)',
          description: meta.description || 'Handcrafted daily with fresh organic ingredients.',
          image_url: meta.image_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80',
          dietary_tags: meta.dietary_tags || ['Fresh']
        });
      }

      const categories = Object.keys(categoryMap).map(catName => ({
        category_name: catName,
        dishes: categoryMap[catName]
      }));

      result.push({
        ...v,
        menu: {
          vendor_id: v.vendor_id,
          business_name: mongoMenu?.business_name || v.business_name,
          chef_bio: mongoMenu?.chef_bio || 'Michelin-trained artisanal independent chef.',
          hero_image_url: mongoMenu?.hero_image_url || 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80',
          operating_hours: mongoMenu?.operating_hours || '11:00 AM - 10:00 PM',
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

// Create New Order
router.post('/orders', authenticateToken, requireRole('CUSTOMER'), async (req, res) => {
  try {
    const { vendor_id, items } = req.body;
    const customer_id = req.user.user_id;

    if (!vendor_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Vendor ID and non-empty items array are required.' });
    }

    // Enforce max quantity limit of 5 per item
    for (const item of items) {
      if (item.quantity > 5) {
        return res.status(400).json({ success: false, message: 'Maximum order limit per dish is 5 items.' });
      }
    }

    // 1. Relational Inventory Stock Check
    const stockCheck = await InventoryEngine.verifyOrderStock(items);
    if (!stockCheck.sufficient) {
      return res.status(400).json({ success: false, message: stockCheck.message });
    }

    // Calculate Total & Verify Daily Dish Stock
    let totalAmount = 0;
    const itemsProcessed = [];
    for (const item of items) {
      const dishes = await query('SELECT * FROM dishes WHERE dish_id = ?', [item.dish_id]);
      if (!dishes || dishes.length === 0) {
        return res.status(404).json({ success: false, message: `Dish ID ${item.dish_id} not found.` });
      }
      const dish = dishes[0];

      if (dish.is_available === 0 || (dish.daily_stock !== null && dish.daily_stock < item.quantity)) {
        return res.status(400).json({ success: false, message: `'${dish.name}' is out of stock or does not have enough portions left today (${dish.daily_stock || 0} remaining).` });
      }

      const subtotal = Number(dish.base_price) * Number(item.quantity);
      totalAmount += subtotal;
      itemsProcessed.push({
        dish_id: dish.dish_id,
        dish_name: dish.name,
        quantity: item.quantity,
        price_at_purchase: dish.base_price,
        subtotal
      });
    }

    // 2. Insert into MySQL `orders`
    const orderRes = await query(`
      INSERT INTO orders (customer_id, vendor_id, total_amount, escrow_status, payment_status, status)
      VALUES (?, ?, ?, 'HOLDING', 'PAID', 'PLACED')
    `, [customer_id, vendor_id, totalAmount]);

    const order_id = orderRes.insertId;

    // 3. Insert into MySQL `order_items` & Deduct Daily Dish Stock
    for (const item of itemsProcessed) {
      await query(`
        INSERT INTO order_items (order_id, dish_id, quantity, price_at_purchase, subtotal)
        VALUES (?, ?, ?, ?, ?)
      `, [order_id, item.dish_id, item.quantity, item.price_at_purchase, item.subtotal]);

      // Deduct daily portion stock
      await query('UPDATE dishes SET daily_stock = GREATEST(0, daily_stock - ?) WHERE dish_id = ?', [item.quantity, item.dish_id]);

      // Auto mark out of stock if portion stock hits 0
      const checkStock = await query('SELECT daily_stock FROM dishes WHERE dish_id = ?', [item.dish_id]);
      if (checkStock.length > 0 && checkStock[0].daily_stock <= 0) {
        await query("UPDATE dishes SET is_available = 0, out_of_stock_reason = 'Daily portions fully exhausted (0 remaining)' WHERE dish_id = ?", [item.dish_id]);

        const mongoMenu = await MongoAdapter.findVendorMenu(vendor_id);
        if (mongoMenu && mongoMenu.categories) {
          for (const cat of mongoMenu.categories) {
            if (cat.dishes) {
              const d = cat.dishes.find(x => Number(x.dish_id) === Number(item.dish_id));
              if (d) d.is_available = false;
            }
          }
          await MongoAdapter.findOrSeedVendorMenus([mongoMenu]);
        }
      }
    }

    // 4. Perform Atomic Relational Inventory Auto-Deduction in MySQL
    const stockDeductions = await InventoryEngine.deductOrderStock(items);

    // 5. Create Escrow Payout Record in MySQL
    const payout = await PayoutService.createOrderPayout(order_id, vendor_id, null, totalAmount);

    // 6. Push Tracking Log to MongoDB
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
    return res.status(500).json({ success: false, message: err.message || 'Failed to place order.' });
  }
});

// CANCEL ORDER (Customer Order Cancellation CRUD)
router.delete('/orders/:id', authenticateToken, requireRole('CUSTOMER'), async (req, res) => {
  try {
    const order_id = req.params.id;
    const customer_id = req.user.user_id;

    const targetOrder = await query('SELECT * FROM orders WHERE order_id = ? AND customer_id = ?', [order_id, customer_id]);
    if (targetOrder.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (['OUT_FOR_DELIVERY', 'DELIVERED'].includes(targetOrder[0].status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel an order that is out for delivery or delivered.' });
    }

    await query("UPDATE orders SET status = 'CANCELLED', escrow_status = 'REFUNDED' WHERE order_id = ?", [order_id]);

    await MongoAdapter.pushTrackingLog(order_id, {
      event: 'ORDER_CANCELLED',
      timestamp: new Date(),
      location_note: 'Order cancelled by customer. Escrow refunded.',
      actor_role: 'CUSTOMER'
    });

    return res.json({ success: true, message: `Order #${order_id} has been cancelled and refunded.` });
  } catch (err) {
    console.error('Cancel order error:', err);
    return res.status(500).json({ success: false, message: 'Failed to cancel order.' });
  }
});

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

      const tracking = await MongoAdapter.getTrackingLog(o.order_id);
      result.push({
        ...o,
        items,
        tracking: tracking ? tracking.timeline : []
      });
    }

    return res.json({ success: true, orders: result });
  } catch (err) {
    console.error('Fetch customer orders error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch customer order history.' });
  }
});

// Submit Customer Review
router.post('/reviews', authenticateToken, requireRole('CUSTOMER'), async (req, res) => {
  try {
    const { order_id, vendor_id, rider_id, vendor_rating, rider_rating, comment } = req.body;
    
    const avgRating = ((Number(vendor_rating) || 5) + (Number(rider_rating) || 5)) / 2;
    const sentiment_label = avgRating >= 4 ? 'POSITIVE' : avgRating >= 2.5 ? 'NEUTRAL' : 'NEGATIVE';

    const review = await MongoAdapter.createReview({
      review_id: Date.now(),
      order_id: Number(order_id),
      customer_id: req.user.user_id,
      vendor_id: Number(vendor_id),
      rider_id: rider_id ? Number(rider_id) : null,
      vendor_rating: Number(vendor_rating),
      rider_rating: Number(rider_rating),
      comment,
      sentiment_label,
      created_at: new Date()
    });

    return res.json({ success: true, message: 'Review submitted successfully!', review });
  } catch (err) {
    console.error('Submit review error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit review.' });
  }
});

module.exports = router;
