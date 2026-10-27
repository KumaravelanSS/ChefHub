const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/mysql_db');
const { MongoAdapter } = require('../config/mongo_db');
const { authenticateToken, requireRole, JWT_SECRET } = require('../middleware/auth_rbac');
const InventoryEngine = require('../services/inventory_engine');
const outboxRelay = require('../services/outbox_relay');
const { sendPasswordResetOtp } = require('../services/email_service');

function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  let score = 0;
  if (hasUpper) score++;
  if (hasLower) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;

  if (score < 3) {
    return {
      valid: false,
      message: 'Password must include at least 3 of: uppercase, lowercase, numbers, or special characters.'
    };
  }
  return { valid: true };
}

// Vendor Orders Queue
router.get('/orders', authenticateToken, requireRole('VENDOR'), async (req, res) => {
  try {
    const vendor_id = req.user.user_id;
    const orders = await query(`
      SELECT o.*, u.name AS customer_name, u.phone AS customer_phone
      FROM orders o
      JOIN users u ON o.customer_id = u.user_id
      WHERE o.vendor_id = ?
      ORDER BY o.timestamp DESC
    `, [vendor_id]);

    const result = [];
    for (const o of orders) {
      const items = await query(`
        SELECT oi.*, d.name AS dish_name 
        FROM order_items oi
        JOIN dishes d ON oi.dish_id = d.dish_id
        WHERE oi.order_id = ?
      `, [o.order_id]);

      result.push({ ...o, items });
    }

    return res.json({ success: true, orders: result });
  } catch (err) {
    console.error('Fetch vendor orders error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch vendor kitchen order queue.' });
  }
});

// Update Order Status (PREPARING, READY, CANCELLED)
router.patch('/orders/:id/status', authenticateToken, requireRole('VENDOR'), async (req, res) => {
  try {
    const order_id = req.params.id;
    const { status, cancel_reason } = req.body;
    const vendor_id = req.user.user_id;

    const validStatuses = ['PREPARING', 'READY', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid vendor status. Allowed: ${validStatuses.join(', ')}` });
    }

    if (status === 'CANCELLED') {
      const reasonText = cancel_reason || 'Chef could not fulfill order at this time.';

      // 1. Fetch order details & items needed for restoration
      const [orderItems, orderInfo] = await Promise.all([
        query(`SELECT dish_id, quantity FROM order_items WHERE order_id = ?`, [order_id]),
        query(`SELECT customer_id, total_amount, payment_method FROM orders WHERE order_id = ?`, [order_id])
      ]);

      const refundAmt = orderInfo[0] ? Number(orderInfo[0].total_amount) : 0;
      const custId = orderInfo[0]?.customer_id;

      // 2. Parallelize all primary relational database updates & outbox recording
      const parallelTasks = [
        query(`
          UPDATE orders 
          SET status = 'CANCELLED', escrow_status = 'REFUNDED', cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE order_id = ? AND vendor_id = ?
        `, [order_id, vendor_id]),
        outboxRelay.recordEvent(null, {
          aggregate_type: 'ORDER',
          aggregate_id: order_id,
          event_type: 'ORDER_CANCELLED',
          payload: {
            new_status: 'ORDER_CANCELLED',
            actor_role: 'VENDOR',
            note: `Chef cancelled order: ${reasonText}. 100% Escrow Refund (₹${refundAmt.toFixed(2)}) credited to customer account.`,
            cancel_reason: reasonText,
            refund_amount: refundAmt
          }
        }),
        ...orderItems.map(it => 
          query(`UPDATE dishes SET daily_stock = daily_stock + ? WHERE dish_id = ?`, [it.quantity, it.dish_id])
        )
      ];

      if (custId) {
        parallelTasks.push((async () => {
          try {
            const curBalRows = await query(`SELECT balance FROM customer_wallets WHERE customer_id = ?`, [custId]);
            if (curBalRows.length > 0) {
              await query(`UPDATE customer_wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE customer_id = ?`, [refundAmt, custId]);
            } else {
              await query(`INSERT INTO customer_wallets (customer_id, balance) VALUES (?, ?)`, [custId, 0.00 + refundAmt]);
            }
          } catch (e) {
            console.warn('[Wallet Refund Sync Warning]', e.message);
          }
        })());
      }

      await Promise.all(parallelTasks);

      // 3. Immediately unlock frontend UI with 200 OK (Zero UI freeze)
      res.json({ 
        success: true, 
        message: `Order #${order_id} cancelled by chef. Customer notified & ₹${refundAmt.toFixed(2)} payment refunded.` 
      });

      // 4. Background Message Queue / Outbox Relay processing (updates Mongo & broadcasts SSE asynchronously)
      setImmediate(async () => {
        try {
          outboxRelay.dispatchNow();
          await MongoAdapter.pushTrackingLog(order_id, {
            event: 'ORDER_CANCELLED',
            timestamp: new Date(),
            location_note: `Chef cancelled order: ${reasonText}. 100% Escrow refund of ₹${refundAmt.toFixed(2)} credited back to customer.`,
            actor_role: 'VENDOR'
          });
        } catch (bgErr) {
          console.warn('[Background Cancel Sync Warning]', bgErr.message);
        }
      });
      return;
    }

    let timeColUpdate = '';
    if (status === 'PREPARING') {
      timeColUpdate = ', prepared_at = COALESCE(prepared_at, CURRENT_TIMESTAMP)';
    } else if (status === 'READY') {
      timeColUpdate = ', ready_at = COALESCE(ready_at, CURRENT_TIMESTAMP), prepared_at = COALESCE(prepared_at, CURRENT_TIMESTAMP)';
    }

    // 1. Parallelize primary database update and outbox record
    await Promise.all([
      query(`
        UPDATE orders SET status = ? ${timeColUpdate}, updated_at = CURRENT_TIMESTAMP 
        WHERE order_id = ? AND vendor_id = ?
      `, [status, order_id, vendor_id]),
      outboxRelay.recordEvent(null, {
        aggregate_type: 'ORDER',
        aggregate_id: order_id,
        event_type: 'ORDER_STATUS_CHANGED',
        payload: {
          new_status: `KITCHEN_${status}`,
          actor_role: 'VENDOR',
          note: status === 'PREPARING' ? 'Chef started preparing your meal' : 'Meal is packed & ready for pickup'
        }
      })
    ]);

    // 2. Immediately respond 200 OK to frontend (sub-30ms response time)
    res.json({ success: true, message: `Order #${order_id} marked as ${status}.` });

    // 3. Asynchronously push to MongoDB tracking log & trigger live SSE broadcast in background
    setImmediate(async () => {
      try {
        outboxRelay.dispatchNow();
        await MongoAdapter.pushTrackingLog(order_id, {
          event: `KITCHEN_${status}`,
          timestamp: new Date(),
          location_note: status === 'PREPARING' ? 'Chef started preparing your meal' : 'Meal is packed & ready for pickup',
          actor_role: 'VENDOR'
        });
      } catch (bgErr) {
        console.warn('[Background Mongo Tracking Warning]', bgErr.message);
      }
    });
    return;
  } catch (err) {
    console.error('Update vendor order status error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update order status.' });
  }
});

// Get Vendor Dishes (MySQL & MongoDB)
router.get('/dishes', authenticateToken, requireRole('VENDOR'), async (req, res) => {
  try {
    const vendor_id = req.user.user_id;
    await InventoryEngine.autoSyncDishAvailability(vendor_id);
    const dishes = await query('SELECT * FROM dishes WHERE vendor_id = ? ORDER BY dish_id DESC', [vendor_id]);

    const mongoMenu = await MongoAdapter.findVendorMenu(vendor_id);
    const mongoDishMetaMap = {};
    if (mongoMenu && mongoMenu.categories) {
      for (const cat of mongoMenu.categories) {
        for (const d of cat.dishes || []) {
          if (d.dish_id) mongoDishMetaMap[d.dish_id] = d;
          if (d.name) mongoDishMetaMap[d.name.toLowerCase()] = d;
        }
      }
    }

    const formattedDishes = dishes.map(d => {
      const meta = mongoDishMetaMap[d.dish_id] || mongoDishMetaMap[d.name?.toLowerCase()] || {};
      return {
        ...d,
        description: d.description || meta.description || 'Handcrafted fresh dish',
        image_url: d.image_url || meta.image_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80',
        dietary_tags: meta.dietary_tags || ['Fresh']
      };
    });

    return res.json({ success: true, dishes: formattedDishes });
  } catch (err) {
    console.error('Fetch dishes error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch dishes.' });
  }
});

// ADD NEW DISH (MySQL + MongoDB Menu)
router.post('/dishes', authenticateToken, requireRole('VENDOR'), async (req, res) => {
  try {
    const vendor_id = req.user.user_id;
    const { name, category, base_price, daily_stock, description, image_url, is_available, dietary_tags } = req.body;

    if (!name || !category || base_price === undefined) {
      return res.status(400).json({ success: false, message: 'Name, Category, and Base Price are required.' });
    }

    const availVal = (is_available === false || is_available === 0 || is_available === '0') ? 0 : 1;
    const stockVal = daily_stock !== undefined ? Number(daily_stock) : 20;

    // 1. Insert into MySQL `dishes`
    const result = await query(`
      INSERT INTO dishes (vendor_id, name, category, base_price, daily_stock, is_available, description, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      vendor_id,
      name,
      category,
      Number(base_price),
      stockVal,
      availVal,
      description || 'Handcrafted fresh dish',
      image_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80'
    ]);

    const dish_id = result.insertId;

    // Record Outbox Event for MongoDB menu synchronization
    await outboxRelay.recordEvent(null, {
      aggregate_type: 'DISH',
      aggregate_id: dish_id,
      event_type: 'DISH_UPDATED',
      payload: { vendor_id, dish_id, name }
    });
    outboxRelay.dispatchNow();

    // 2. Add to MongoDB `vendors_menus`
    let mongoMenu = await MongoAdapter.findVendorMenu(vendor_id);
    if (!mongoMenu) {
      const vendorUser = await query('SELECT name FROM users WHERE user_id = ?', [vendor_id]);
      mongoMenu = {
        vendor_id,
        business_name: vendorUser[0]?.name || 'Chef Kitchen',
        cuisine_types: [category],
        categories: []
      };
    }

    let catObj = mongoMenu.categories?.find(c => c.category_name.toLowerCase() === category.toLowerCase());
    if (!catObj) {
      catObj = { category_name: category, dishes: [] };
      if (!mongoMenu.categories) mongoMenu.categories = [];
      mongoMenu.categories.push(catObj);
    }

    catObj.dishes.push({
      dish_id,
      name,
      description: description || 'Handcrafted fresh dish',
      price: Number(base_price),
      image_url: image_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80',
      is_available: availVal === 1,
      dietary_tags: Array.isArray(dietary_tags) ? dietary_tags : ['Fresh'],
      customizations: []
    });

    await MongoAdapter.findOrSeedVendorMenus([mongoMenu]);

    return res.json({ success: true, message: `Dish '${name}' added to menu successfully!`, dish_id });
  } catch (err) {
    console.error('Add dish error:', err);
    return res.status(500).json({ success: false, message: 'Failed to add dish.' });
  }
});

// UPDATE DISH DETAILS & STOCK (MySQL + MongoDB Menu)
router.put('/dishes/:id', authenticateToken, requireRole('VENDOR'), async (req, res) => {
  try {
    const dish_id = req.params.id;
    const vendor_id = req.user.user_id;
    const { name, category, base_price, daily_stock, description, image_url, is_available, out_of_stock_reason, dietary_tags } = req.body;

    let stockVal = null;
    if (daily_stock !== undefined && daily_stock !== null && daily_stock !== '') {
      stockVal = Math.max(0, parseInt(daily_stock, 10));
    }

    let availVal = (is_available === false || is_available === 0 || is_available === '0' || is_available === 'false') ? 0 : 1;
    if (stockVal !== null && stockVal <= 0) {
      availVal = 0;
    } else if (stockVal !== null && stockVal > 0 && is_available === undefined) {
      availVal = 1;
    }

    let defaultReason = availVal === 1 ? 'In Stock' : (out_of_stock_reason || 'Daily portions fully exhausted (0 remaining)');
    if (availVal === 0 && stockVal !== null && stockVal <= 0) {
      defaultReason = 'Daily portions fully exhausted (0 remaining)';
    }

    // 1. Update MySQL `dishes`
    await query(`
      UPDATE dishes 
      SET name = COALESCE(?, name),
          category = COALESCE(?, category),
          base_price = COALESCE(?, base_price),
          daily_stock = COALESCE(?, daily_stock),
          is_available = ?,
          out_of_stock_reason = ?,
          description = COALESCE(?, description),
          image_url = COALESCE(?, image_url)
      WHERE dish_id = ? AND vendor_id = ?
    `, [
      name || null,
      category || null,
      base_price !== undefined && base_price !== '' ? Number(base_price) : null,
      stockVal,
      availVal,
      defaultReason,
      description !== undefined ? description : null,
      image_url !== undefined && image_url !== null ? image_url : null,
      dish_id,
      vendor_id
    ]);

    // Record Outbox Event for MongoDB menu synchronization
    await outboxRelay.recordEvent(null, {
      aggregate_type: 'DISH',
      aggregate_id: dish_id,
      event_type: 'DISH_UPDATED',
      payload: { vendor_id, dish_id, daily_stock: stockVal, is_available: availVal }
    });
    outboxRelay.dispatchNow();

    // 2. Update MongoDB `vendors_menus`
    let mongoMenu = await MongoAdapter.findVendorMenu(vendor_id);
    if (!mongoMenu) {
      const vendorUser = await query('SELECT name FROM users WHERE user_id = ?', [vendor_id]);
      mongoMenu = {
        vendor_id,
        business_name: vendorUser[0]?.name || 'Chef Kitchen',
        cuisine_types: [category || 'Main Menu'],
        categories: []
      };
    }

    let targetDish = null;
    let targetCatObj = null;

    for (const cat of mongoMenu.categories || []) {
      const found = (cat.dishes || []).find(d => Number(d.dish_id) === Number(dish_id) || (name && d.name.toLowerCase() === name.toLowerCase()));
      if (found) {
        targetDish = found;
        targetCatObj = cat;
        break;
      }
    }

    if (!targetDish) {
      const targetCatName = category || 'Main Menu';
      targetCatObj = (mongoMenu.categories || []).find(c => c.category_name.toLowerCase() === targetCatName.toLowerCase());
      if (!targetCatObj) {
        targetCatObj = { category_name: targetCatName, dishes: [] };
        if (!mongoMenu.categories) mongoMenu.categories = [];
        mongoMenu.categories.push(targetCatObj);
      }
      targetDish = {
        dish_id: Number(dish_id),
        name: name || 'Dish',
        price: Number(base_price || 0),
        daily_stock: stockVal !== null ? stockVal : 20,
        is_available: availVal === 1,
        dietary_tags: Array.isArray(dietary_tags) ? dietary_tags : ['Fresh']
      };
      targetCatObj.dishes.push(targetDish);
    }

    if (name) targetDish.name = name;
    if (description !== undefined) targetDish.description = description;
    if (base_price !== undefined) targetDish.price = Number(base_price);
    if (image_url !== undefined && image_url !== null) targetDish.image_url = image_url;
    targetDish.is_available = availVal === 1;
    if (stockVal !== null) targetDish.daily_stock = stockVal;
    if (dietary_tags && Array.isArray(dietary_tags)) targetDish.dietary_tags = dietary_tags;

    await MongoAdapter.findOrSeedVendorMenus([mongoMenu]);

    return res.json({ 
      success: true, 
      message: `Dish #${dish_id} updated successfully!`, 
      dish_id: Number(dish_id),
      daily_stock: stockVal,
      is_available: availVal === 1 
    });
  } catch (err) {
    console.error('Update dish error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update dish.' });
  }
});

// QUICK ADJUST DISH STOCK (INCREMENT, DECREMENT OR SET SPECIFIC STOCK NUMBER)
router.patch('/dishes/:id/stock', authenticateToken, requireRole('VENDOR'), async (req, res) => {
  try {
    const dish_id = req.params.id;
    const vendor_id = req.user.user_id;
    const { daily_stock, delta } = req.body;

    const current = await query('SELECT is_available, daily_stock FROM dishes WHERE dish_id = ? AND vendor_id = ?', [dish_id, vendor_id]);
    if (!current || current.length === 0) {
      return res.status(404).json({ success: false, message: 'Dish not found.' });
    }

    let newStock = Number(current[0].daily_stock !== null && current[0].daily_stock !== undefined ? current[0].daily_stock : 20);
    if (daily_stock !== undefined && daily_stock !== null && daily_stock !== '') {
      newStock = Math.max(0, parseInt(daily_stock, 10));
    } else if (delta !== undefined) {
      newStock = Math.max(0, newStock + Number(delta));
    }

    const newAvail = newStock > 0 ? 1 : 0;
    const newReason = newAvail === 1 ? 'In Stock' : 'Daily portions fully exhausted (0 remaining)';

    await query('UPDATE dishes SET is_available = ?, daily_stock = ?, out_of_stock_reason = ? WHERE dish_id = ? AND vendor_id = ?', [newAvail, newStock, newReason, dish_id, vendor_id]);

    await outboxRelay.recordEvent(null, {
      aggregate_type: 'DISH',
      aggregate_id: dish_id,
      event_type: 'DISH_STOCK_UPDATED',
      payload: { vendor_id, dish_id, daily_stock: newStock, is_available: newAvail }
    });
    outboxRelay.dispatchNow();

    const mongoMenu = await MongoAdapter.findVendorMenu(vendor_id);
    if (mongoMenu && mongoMenu.categories) {
      for (const cat of mongoMenu.categories) {
        if (cat.dishes) {
          const targetDish = cat.dishes.find(d => Number(d.dish_id) === Number(dish_id));
          if (targetDish) {
            targetDish.is_available = newAvail === 1;
            targetDish.daily_stock = newStock;
          }
        }
      }
      await MongoAdapter.findOrSeedVendorMenus([mongoMenu]);
    }

    return res.json({
      success: true,
      dish_id: Number(dish_id),
      daily_stock: newStock,
      is_available: newAvail === 1,
      out_of_stock_reason: newReason,
      message: `Stock updated to ${newStock} portions (${newAvail === 1 ? 'In Stock' : 'Out of Stock'}).`
    });
  } catch (err) {
    console.error('Adjust stock error:', err);
    return res.status(500).json({ success: false, message: 'Failed to adjust stock.' });
  }
});

// QUICK TOGGLE DISH STOCK (In Stock / Out of Stock)
router.patch('/dishes/:id/toggle-stock', authenticateToken, requireRole('VENDOR'), async (req, res) => {
  try {
    const dish_id = req.params.id;
    const vendor_id = req.user.user_id;
    const { out_of_stock_reason } = req.body || {};

    const current = await query('SELECT is_available, daily_stock FROM dishes WHERE dish_id = ? AND vendor_id = ?', [dish_id, vendor_id]);
    if (!current || current.length === 0) {
      return res.status(404).json({ success: false, message: 'Dish not found.' });
    }

    const newAvail = current[0].is_available === 1 ? 0 : 1;
    let newDailyStock = current[0].daily_stock;
    if (newAvail === 1 && (newDailyStock === null || Number(newDailyStock) <= 0)) {
      newDailyStock = 20; // Reset daily portion stock to 20 when toggling ON
    }

    const newReason = newAvail === 1 ? 'In Stock' : (out_of_stock_reason || 'Kitchen prep closed for today');

    await query('UPDATE dishes SET is_available = ?, daily_stock = ?, out_of_stock_reason = ? WHERE dish_id = ? AND vendor_id = ?', [newAvail, newDailyStock, newReason, dish_id, vendor_id]);

    await outboxRelay.recordEvent(null, {
      aggregate_type: 'DISH',
      aggregate_id: dish_id,
      event_type: 'DISH_STOCK_UPDATED',
      payload: { vendor_id, dish_id, daily_stock: newDailyStock, is_available: newAvail }
    });
    outboxRelay.dispatchNow();

    const mongoMenu = await MongoAdapter.findVendorMenu(vendor_id);
    if (mongoMenu && mongoMenu.categories) {
      for (const cat of mongoMenu.categories) {
        if (cat.dishes) {
          const targetDish = cat.dishes.find(d => Number(d.dish_id) === Number(dish_id));
          if (targetDish) {
            targetDish.is_available = newAvail === 1;
          }
        }
      }
      await MongoAdapter.findOrSeedVendorMenus([mongoMenu]);
    }

    return res.json({ 
      success: true, 
      dish_id: Number(dish_id), 
      is_available: newAvail === 1, 
      daily_stock: newDailyStock, 
      out_of_stock_reason: newReason, 
      message: `Stock status updated to ${newAvail === 1 ? 'In Stock' : 'Out of Stock'}.` 
    });
  } catch (err) {
    console.error('Toggle stock error:', err);
    return res.status(500).json({ success: false, message: 'Failed to toggle stock status.' });
  }
});

// DELETE DISH (MySQL + MongoDB Menu)
router.delete('/dishes/:id', authenticateToken, requireRole('VENDOR'), async (req, res) => {
  try {
    const dish_id = req.params.id;
    const vendor_id = req.user.user_id;

    await query('DELETE FROM dishes WHERE dish_id = ? AND vendor_id = ?', [dish_id, vendor_id]);

    const mongoMenu = await MongoAdapter.findVendorMenu(vendor_id);
    if (mongoMenu && mongoMenu.categories) {
      for (const cat of mongoMenu.categories) {
        cat.dishes = cat.dishes.filter(d => d.dish_id !== Number(dish_id));
      }
      await MongoAdapter.findOrSeedVendorMenus([mongoMenu]);
    }

    return res.json({ success: true, message: `Dish #${dish_id} removed successfully.` });
  } catch (err) {
    console.error('Delete dish error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete dish.' });
  }
});

// Get Vendor Inventory Stock
router.get('/inventory', authenticateToken, requireRole('VENDOR'), async (req, res) => {
  try {
    const vendor_id = req.user.user_id;
    const inventory = await query(`
      SELECT * FROM inventory WHERE vendor_id = ? ORDER BY ingredient_name ASC
    `, [vendor_id]);

    return res.json({ success: true, inventory });
  } catch (err) {
    console.error('Fetch inventory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch inventory.' });
  }
});

// ADD / RESTOCK INGREDIENT
router.post('/inventory', authenticateToken, requireRole('VENDOR'), async (req, res) => {
  try {
    const vendor_id = req.user.user_id;
    const { ingredient_name, stock_quantity, unit, reorder_level } = req.body;

    if (!ingredient_name || stock_quantity === undefined) {
      return res.status(400).json({ success: false, message: 'Ingredient name and stock quantity are required.' });
    }

    const existing = await query(`
      SELECT * FROM inventory WHERE vendor_id = ? AND LOWER(ingredient_name) = LOWER(?)
    `, [vendor_id, ingredient_name]);

    if (existing.length > 0) {
      await query(`
        UPDATE inventory 
        SET stock_quantity = ?, unit = COALESCE(?, unit), reorder_level = COALESCE(?, reorder_level), updated_at = CURRENT_TIMESTAMP
        WHERE ingredient_id = ?
      `, [Number(stock_quantity), unit || null, reorder_level !== undefined ? Number(reorder_level) : null, existing[0].ingredient_id]);
    } else {
      await query(`
        INSERT INTO inventory (vendor_id, ingredient_name, stock_quantity, unit, reorder_level)
        VALUES (?, ?, ?, ?, ?)
      `, [vendor_id, ingredient_name, Number(stock_quantity), unit || 'units', reorder_level !== undefined ? Number(reorder_level) : 10]);
    }

    // Auto sync dish availability when restocked
    await InventoryEngine.autoSyncDishAvailability(vendor_id);

    return res.json({ success: true, message: `Inventory for '${ingredient_name}' updated successfully.` });
  } catch (err) {
    console.error('Update inventory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update ingredient inventory.' });
  }
});

// EDIT INGREDIENT STOCK DETAILS
router.put('/inventory/:id', authenticateToken, requireRole('VENDOR'), async (req, res) => {
  try {
    const ingredient_id = req.params.id;
    const vendor_id = req.user.user_id;
    const { ingredient_name, stock_quantity, unit, reorder_level } = req.body;

    const nameVal = ingredient_name !== undefined && ingredient_name !== '' ? ingredient_name : null;
    const stockVal = stock_quantity !== undefined && stock_quantity !== '' ? Number(stock_quantity) : 0;
    const unitVal = unit !== undefined && unit !== '' ? unit : null;
    const reorderVal = reorder_level !== undefined && reorder_level !== '' ? Number(reorder_level) : 10;

    await query(`
      UPDATE inventory 
      SET ingredient_name = COALESCE(?, ingredient_name),
          stock_quantity = ?,
          unit = COALESCE(?, unit),
          reorder_level = ?
      WHERE ingredient_id = ? AND vendor_id = ?
    `, [nameVal, stockVal, unitVal, reorderVal, ingredient_id, vendor_id]);

    await InventoryEngine.autoSyncDishAvailability(vendor_id);

    return res.json({ success: true, message: `Ingredient #${ingredient_id} updated successfully.` });
  } catch (err) {
    console.error('Edit ingredient error:', err);
    return res.status(500).json({ success: false, message: 'Failed to edit ingredient.' });
  }
});

// DELETE INGREDIENT STOCK
router.delete('/inventory/:id', authenticateToken, requireRole('VENDOR'), async (req, res) => {
  try {
    const ingredient_id = req.params.id;
    const vendor_id = req.user.user_id;

    await query('DELETE FROM inventory WHERE ingredient_id = ? AND vendor_id = ?', [ingredient_id, vendor_id]);
    return res.json({ success: true, message: `Ingredient #${ingredient_id} deleted successfully.` });
  } catch (err) {
    console.error('Delete ingredient error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete ingredient.' });
  }
});

// Get Dish Recipes
router.get('/recipes', authenticateToken, requireRole('VENDOR'), async (req, res) => {
  try {
    const vendor_id = req.user.user_id;
    const recipes = await query(`
      SELECT dr.*, d.name AS dish_name, i.ingredient_name, i.unit
      FROM dish_recipes dr
      JOIN dishes d ON dr.dish_id = d.dish_id
      JOIN inventory i ON dr.ingredient_id = i.ingredient_id
      WHERE d.vendor_id = ?
    `, [vendor_id]);

    return res.json({ success: true, recipes });
  } catch (err) {
    console.error('Fetch recipes error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch dish recipes.' });
  }
});

// ADD DISH RECIPE LINK (`dish_recipes`)
router.post('/recipes', authenticateToken, requireRole('VENDOR'), async (req, res) => {
  try {
    const { dish_id, ingredient_id, quantity_required } = req.body;

    if (!dish_id || !ingredient_id || !quantity_required) {
      return res.status(400).json({ success: false, message: 'Dish ID, Ingredient ID, and Quantity Required are required.' });
    }

    const existing = await query('SELECT recipe_id FROM dish_recipes WHERE dish_id = ? AND ingredient_id = ?', [dish_id, ingredient_id]);
    if (existing.length > 0) {
      await query('UPDATE dish_recipes SET quantity_required = ? WHERE recipe_id = ?', [quantity_required, existing[0].recipe_id]);
    } else {
      await query('INSERT INTO dish_recipes (dish_id, ingredient_id, quantity_required) VALUES (?, ?, ?)', [dish_id, ingredient_id, quantity_required]);
    }

    return res.json({ success: true, message: 'Recipe mapping saved successfully!' });
  } catch (err) {
    console.error('Add recipe error:', err);
    return res.status(500).json({ success: false, message: 'Failed to save recipe mapping.' });
  }
});

// EDIT RECIPE QUANTITY
router.put('/recipes/:id', authenticateToken, requireRole('VENDOR'), async (req, res) => {
  try {
    const recipe_id = req.params.id;
    const { quantity_required } = req.body;

    if (!quantity_required) {
      return res.status(400).json({ success: false, message: 'Quantity required is required.' });
    }

    await query('UPDATE dish_recipes SET quantity_required = ? WHERE recipe_id = ?', [quantity_required, recipe_id]);
    return res.json({ success: true, message: `Recipe link #${recipe_id} updated successfully.` });
  } catch (err) {
    console.error('Edit recipe error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update recipe link.' });
  }
});

// DELETE DISH RECIPE LINK
router.delete('/recipes/:id', authenticateToken, requireRole('VENDOR'), async (req, res) => {
  try {
    const recipe_id = req.params.id;
    await query('DELETE FROM dish_recipes WHERE recipe_id = ?', [recipe_id]);
    return res.json({ success: true, message: `Recipe mapping #${recipe_id} deleted.` });
  } catch (err) {
    console.error('Delete recipe error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete recipe link.' });
  }
});

// Get Vendor Escrow Payout Earnings
router.get('/payouts', authenticateToken, requireRole('VENDOR'), async (req, res) => {
  try {
    const vendor_id = req.user.user_id;
    const payouts = await query(`
      SELECT p.*, o.timestamp AS order_date, o.status AS order_status
      FROM payouts p
      JOIN orders o ON p.order_id = o.order_id
      WHERE p.vendor_id = ?
      ORDER BY p.executed_at DESC
    `, [vendor_id]);

    const totalEarned = payouts.reduce((acc, curr) => acc + Number(curr.vendor_amount), 0);

    return res.json({ success: true, total_earned: totalEarned.toFixed(2), payouts });
  } catch (err) {
    console.error('Fetch vendor payouts error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch payouts.' });
  }
});

// Get Vendor Reviews
router.get('/reviews', authenticateToken, requireRole('VENDOR'), async (req, res) => {
  try {
    const vendor_id = req.user.user_id;
    const reviews = await MongoAdapter.getReviews({ vendor_id: Number(vendor_id) });
    const formatted = [];
    for (const r of reviews) {
      const raw = r.toObject ? r.toObject() : r;
      const cust = await query('SELECT name FROM users WHERE user_id = ?', [raw.customer_id]);
      formatted.push({
        ...raw,
        customer_name: cust.length > 0 ? cust[0].name : 'Customer'
      });
    }
    return res.json({ success: true, reviews: formatted });
  } catch (err) {
    console.error('Fetch vendor reviews error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch vendor reviews.' });
  }
});

// In-memory OTP storage fallback
const inMemoryOtps = new Map();

// Get Vendor Store Profile & Status & Rating Metrics
router.get('/profile', authenticateToken, requireRole('VENDOR'), async (req, res) => {
  try {
    const vendor_id = req.user.user_id;

    // Fetch user details from MySQL
    const userRows = await query(`
      SELECT user_id, name, email, phone, primary_address, latitude, longitude, avatar_url, role,
             business_name, chef_bio, operating_hours, open_time, close_time, is_open, closed_reason
      FROM users WHERE user_id = ?
    `, [vendor_id]);
    const u = userRows[0] || {};

    const mongoMenu = await MongoAdapter.findVendorMenu(vendor_id) || { vendor_id, categories: [] };

    const todayDate = new Date().toISOString().split('T')[0];
    let autoReopened = false;

    // Next-Day Auto Reset: If closed on a previous date, auto re-open when chef logs in on the new day
    if (mongoMenu.last_closed_date && mongoMenu.last_closed_date !== todayDate) {
      mongoMenu.is_open = true;
      mongoMenu.closed_reason = null;
      mongoMenu.last_closed_date = null;
      autoReopened = true;
      await MongoAdapter.findOrSeedVendorMenus([mongoMenu]);
      try {
        await query('UPDATE users SET is_open = 1, closed_reason = NULL WHERE user_id = ?', [vendor_id]);
      } catch (e) {}
    }

    // Dynamic accurate ratings calculation from real customer reviews
    const reviews = await MongoAdapter.getReviews({ vendor_id: Number(vendor_id) });
    const review_count = reviews.length;
    const totalStars = reviews.reduce((acc, r) => acc + (Number(r.vendor_rating) || 5), 0);
    const avgRating = review_count > 0 ? Number((totalStars / review_count).toFixed(1)) : 0;
    const MIN_REVIEWS_THRESHOLD = 3;
    const is_new_arrival = review_count < MIN_REVIEWS_THRESHOLD;

    const profile = {
      vendor_id,
      name: u.name || req.user.name,
      email: u.email || req.user.email,
      phone: u.phone || null,
      primary_address: u.primary_address || '',
      latitude: u.latitude ? Number(u.latitude) : 12.9716,
      longitude: u.longitude ? Number(u.longitude) : 77.5946,
      avatar_url: u.avatar_url || mongoMenu?.hero_image_url || null,
      business_name: u.business_name || mongoMenu?.business_name || u.name || req.user.name,
      is_open: u.is_open !== undefined && u.is_open !== null ? Boolean(u.is_open) : (mongoMenu?.is_open !== undefined ? mongoMenu.is_open : true),
      closed_reason: u.closed_reason || mongoMenu?.closed_reason || null,
      operating_hours: u.operating_hours || mongoMenu?.operating_hours || '11:00 AM - 10:00 PM',
      open_time: u.open_time || mongoMenu?.open_time || '11:00',
      close_time: u.close_time || mongoMenu?.close_time || '22:00',
      chef_bio: u.chef_bio || mongoMenu?.chef_bio || 'Heritage recipes and artisanal independent cloud kitchen.',
      rating: avgRating,
      review_count,
      min_reviews_needed: MIN_REVIEWS_THRESHOLD,
      is_new_arrival,
      auto_reopened: autoReopened
    };
    return res.json({ success: true, profile });
  } catch (err) {
    console.error('Fetch profile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch store profile.' });
  }
});

// Update Comprehensive Vendor Profile (Username/Chef Name, Phone, Address, Coordinates, Avatar, Bio, Hours)
router.put('/profile', authenticateToken, requireRole('VENDOR'), async (req, res) => {
  try {
    const vendor_id = req.user.user_id;
    const {
      name,
      phone,
      primary_address,
      latitude,
      longitude,
      avatar_url,
      business_name,
      chef_bio,
      operating_hours,
      open_time,
      close_time
    } = req.body;

    const lat = latitude !== undefined && latitude !== null && latitude !== '' ? Number(latitude) : null;
    const lng = longitude !== undefined && longitude !== null && longitude !== '' ? Number(longitude) : null;

    // Update MySQL users table with all details
    await query(`
      UPDATE users 
      SET name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          primary_address = COALESCE(?, primary_address),
          latitude = COALESCE(?, latitude),
          longitude = COALESCE(?, longitude),
          avatar_url = COALESCE(?, avatar_url),
          business_name = COALESCE(?, business_name),
          chef_bio = COALESCE(?, chef_bio),
          operating_hours = COALESCE(?, operating_hours),
          open_time = COALESCE(?, open_time),
          close_time = COALESCE(?, close_time)
      WHERE user_id = ?
    `, [
      name ? name.trim() : null,
      phone ? phone.trim() : null,
      primary_address ? primary_address.trim() : null,
      lat,
      lng,
      avatar_url ? avatar_url.trim() : null,
      business_name ? business_name.trim() : null,
      chef_bio !== undefined ? chef_bio : null,
      operating_hours ? operating_hours.trim() : null,
      open_time ? open_time.trim() : null,
      close_time ? close_time.trim() : null,
      vendor_id
    ]);

    // Update Mongo VendorMenu document
    const mongoMenu = await MongoAdapter.findVendorMenu(vendor_id) || { vendor_id, categories: [] };
    if (business_name) mongoMenu.business_name = business_name.trim();
    else if (name) mongoMenu.business_name = name.trim();

    if (chef_bio !== undefined) mongoMenu.chef_bio = chef_bio;
    if (avatar_url) mongoMenu.hero_image_url = avatar_url.trim();
    if (operating_hours) mongoMenu.operating_hours = operating_hours;
    if (open_time) mongoMenu.open_time = open_time;
    if (close_time) mongoMenu.close_time = close_time;
    if (primary_address) mongoMenu.primary_address = primary_address;
    if (lat) mongoMenu.latitude = lat;
    if (lng) mongoMenu.longitude = lng;

    await MongoAdapter.findOrSeedVendorMenus([mongoMenu]);

    // Query refreshed user record
    const userRows = await query(`
      SELECT user_id, name, email, phone, role, primary_address, latitude, longitude, avatar_url, status,
             business_name, chef_bio, operating_hours, open_time, close_time, is_open, closed_reason
      FROM users WHERE user_id = ?
    `, [vendor_id]);
    const updatedUser = userRows[0];

    // Generate refreshed token
    const tokenPayload = {
      user_id: updatedUser.user_id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

    const completeProfile = {
      vendor_id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      primary_address: updatedUser.primary_address,
      latitude: updatedUser.latitude ? Number(updatedUser.latitude) : 12.9716,
      longitude: updatedUser.longitude ? Number(updatedUser.longitude) : 77.5946,
      avatar_url: updatedUser.avatar_url || mongoMenu?.hero_image_url,
      business_name: updatedUser.business_name || mongoMenu?.business_name || updatedUser.name,
      chef_bio: updatedUser.chef_bio || mongoMenu?.chef_bio,
      operating_hours: updatedUser.operating_hours || mongoMenu?.operating_hours,
      open_time: updatedUser.open_time || mongoMenu?.open_time,
      close_time: updatedUser.close_time || mongoMenu?.close_time,
      is_open: updatedUser.is_open !== undefined && updatedUser.is_open !== null ? Boolean(updatedUser.is_open) : (mongoMenu?.is_open !== undefined ? mongoMenu.is_open : true),
      closed_reason: updatedUser.closed_reason || mongoMenu?.closed_reason || null
    };

    return res.json({
      success: true,
      message: 'Chef profile, location and avatar updated successfully!',
      user: {
        ...updatedUser,
        latitude: updatedUser.latitude ? Number(updatedUser.latitude) : 12.9716,
        longitude: updatedUser.longitude ? Number(updatedUser.longitude) : 77.5946
      },
      token,
      profile: completeProfile
    });
  } catch (err) {
    console.error('Update vendor profile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update chef profile.' });
  }
});

// Request Password Reset OTP (SMS or Email)
router.post('/password/request-otp', authenticateToken, requireRole('VENDOR'), async (req, res) => {
  try {
    const vendor_id = req.user.user_id;
    const { target = 'EMAIL' } = req.body; // 'EMAIL' or 'PHONE'

    const userRows = await query('SELECT user_id, name, email, phone FROM users WHERE user_id = ?', [vendor_id]);
    if (!userRows || userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const user = userRows[0];

    let recipient = '';
    let maskedRecipient = '';

    if (target === 'PHONE') {
      if (!user.phone || !user.phone.trim()) {
        return res.status(400).json({
          success: false,
          message: 'No registered phone number found on your profile. Please add your mobile number in the Chef Profile section first, or choose OTP via Email.'
        });
      }
      recipient = user.phone.trim();
      maskedRecipient = recipient.replace(/.(?=.{4})/g, '*');
    } else {
      recipient = user.email.trim();
      const parts = recipient.split('@');
      maskedRecipient = (parts[0].length > 2 ? parts[0].slice(0, 2) + '***' : '***') + '@' + (parts[1] || 'chefhub.com');
    }

    // Generate 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Save in DB
    try {
      await query(`
        INSERT INTO password_otps (user_id, identifier, otp_code, expires_at, used)
        VALUES (?, ?, ?, ?, 0)
      `, [vendor_id, recipient, otpCode, expiresAt.toISOString().replace('T', ' ').substring(0, 19)]);
    } catch (e) {
      console.warn('[OTP DB Insert Note]', e.message);
    }

    // Save in memory fallback
    inMemoryOtps.set(`${vendor_id}_${otpCode}`, {
      otpCode,
      recipient,
      expiresAt: Date.now() + 5 * 60 * 1000,
      used: false
    });

    console.log(`[CHEF OTP DISPATCH] Generated OTP [${otpCode}] for Chef ${user.name} (${recipient})`);

    // Dispatch real email via Nodemailer (Real SMTP if configured, or automated Ethereal webmail preview)
    let emailResult = null;
    if (target === 'EMAIL' || !target) {
      try {
        emailResult = await sendPasswordResetOtp({
          toEmail: user.email.trim(),
          chefName: user.name,
          otpCode,
          expiresMinutes: 5
        });
      } catch (mailErr) {
        console.error('[Email Dispatch Error]', mailErr.message);
      }
    }

    const messageText = emailResult?.mode === 'REAL_SMTP'
      ? `Real verification email with OTP sent to ${maskedRecipient}!`
      : emailResult?.previewUrl
      ? `Verification email dispatched! Live preview available in webmail.`
      : `OTP sent successfully to your registered ${target === 'PHONE' ? 'mobile number' : 'email ID'} (${maskedRecipient})`;

    return res.json({
      success: true,
      message: messageText,
      target,
      recipient: maskedRecipient,
      expires_in_seconds: 300,
      debug_otp: otpCode,
      email_preview_url: emailResult?.previewUrl || null,
      email_mode: emailResult?.mode || 'LOCAL'
    });
  } catch (err) {
    console.error('Request OTP error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate verification OTP.' });
  }
});

// Change Password (via Old Password OR via OTP)
router.post('/password/change', authenticateToken, requireRole('VENDOR'), async (req, res) => {
  try {
    const vendor_id = req.user.user_id;
    const { method, old_password, otp, new_password } = req.body;

    if (!new_password) {
      return res.status(400).json({ success: false, message: 'New password is required.' });
    }

    const strength = validatePasswordStrength(new_password);
    if (!strength.valid) {
      return res.status(400).json({ success: false, message: strength.message });
    }

    const userRows = await query('SELECT user_id, password_hash, plain_password, email FROM users WHERE user_id = ?', [vendor_id]);
    if (!userRows || userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const user = userRows[0];

    if (method === 'OLD_PASSWORD') {
      if (!old_password) {
        return res.status(400).json({ success: false, message: 'Current password is required.' });
      }

      const isMatch = await bcrypt.compare(old_password, user.password_hash);
      if (!isMatch && old_password !== user.plain_password) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect. Please check and try again.' });
      }
    } else if (method === 'OTP') {
      if (!otp || !otp.trim()) {
        return res.status(400).json({ success: false, message: 'OTP verification code is required.' });
      }

      const cleanOtp = otp.trim();
      let otpValid = false;

      // Check DB
      try {
        const rows = await query(`
          SELECT * FROM password_otps 
          WHERE user_id = ? AND otp_code = ? AND used = 0
          ORDER BY otp_id DESC LIMIT 1
        `, [vendor_id, cleanOtp]);

        if (rows && rows.length > 0) {
          const otpRow = rows[0];
          const expTime = new Date(otpRow.expires_at).getTime();
          if (expTime > Date.now()) {
            otpValid = true;
            await query('UPDATE password_otps SET used = 1 WHERE otp_id = ?', [otpRow.otp_id]);
          }
        }
      } catch (e) {
        console.warn('[OTP DB Check Note]', e.message);
      }

      // Check memory fallback if DB check was not matched
      if (!otpValid) {
        const memEntry = inMemoryOtps.get(`${vendor_id}_${cleanOtp}`);
        if (memEntry && !memEntry.used && memEntry.expiresAt > Date.now()) {
          otpValid = true;
          memEntry.used = true;
        }
      }

      if (!otpValid) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP code. Please request a new OTP.' });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Invalid verification method. Allowed: OLD_PASSWORD or OTP.' });
    }

    // Hash and update new password
    const hashed = await bcrypt.hash(new_password, 10);
    await query(`
      UPDATE users 
      SET password_hash = ?, plain_password = ?
      WHERE user_id = ?
    `, [hashed, new_password, vendor_id]);

    await MongoAdapter.addAuditLog(vendor_id, 'CHEF_PASSWORD_CHANGED', {
      method,
      updated_at: new Date()
    });

    return res.json({
      success: true,
      message: 'Password changed successfully! You can now use your new password.'
    });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update password.' });
  }
});

// Toggle Vendor Kitchen Open/Closed Status with Custom Reason
router.patch('/toggle-status', authenticateToken, requireRole('VENDOR'), async (req, res) => {
  try {
    const vendor_id = req.user.user_id;
    const { is_open, closed_reason } = req.body;
    const mongoMenu = await MongoAdapter.findVendorMenu(vendor_id) || { vendor_id, categories: [] };
    
    const targetState = is_open !== undefined ? Boolean(is_open) : !(mongoMenu.is_open !== undefined ? mongoMenu.is_open : true);
    mongoMenu.is_open = targetState;

    if (!targetState) {
      mongoMenu.closed_reason = closed_reason || 'Chef has manually closed the kitchen for today (Offline).';
      mongoMenu.last_closed_date = new Date().toISOString().split('T')[0];
    } else {
      mongoMenu.closed_reason = null;
      mongoMenu.last_closed_date = null;
    }

    await MongoAdapter.findOrSeedVendorMenus([mongoMenu]);
    return res.json({
      success: true,
      is_open: mongoMenu.is_open,
      closed_reason: mongoMenu.closed_reason,
      profile: mongoMenu,
      message: `Kitchen is now ${mongoMenu.is_open ? 'OPEN (Accepting Orders)' : 'CLOSED (Offline)'}.`
    });
  } catch (err) {
    console.error('Toggle kitchen status error:', err);
    return res.status(500).json({ success: false, message: 'Failed to toggle kitchen status.' });
  }
});

// Update Vendor Operating Hours, Closed Reason & Bio
router.put('/hours', authenticateToken, requireRole('VENDOR'), async (req, res) => {
  try {
    const vendor_id = req.user.user_id;
    const { operating_hours, open_time, close_time, chef_bio, closed_reason } = req.body;
    const mongoMenu = await MongoAdapter.findVendorMenu(vendor_id) || { vendor_id, categories: [] };

    if (operating_hours !== undefined) mongoMenu.operating_hours = operating_hours;
    if (open_time !== undefined) mongoMenu.open_time = open_time;
    if (close_time !== undefined) mongoMenu.close_time = close_time;
    if (chef_bio !== undefined) mongoMenu.chef_bio = chef_bio;
    if (closed_reason !== undefined) mongoMenu.closed_reason = closed_reason;

    await MongoAdapter.findOrSeedVendorMenus([mongoMenu]);
    return res.json({ success: true, message: 'Store timings and profile updated successfully!', profile: mongoMenu });
  } catch (err) {
    console.error('Update hours error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update operating hours.' });
  }
});

module.exports = router;
