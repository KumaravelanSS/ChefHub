const express = require('express');
const router = express.Router();
const { query } = require('../config/mysql_db');
const { MongoAdapter } = require('../config/mongo_db');
const { authenticateToken, requireRole } = require('../middleware/auth_rbac');
const InventoryEngine = require('../services/inventory_engine');

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

// Update Order Status (PREPARING, READY)
router.patch('/orders/:id/status', authenticateToken, requireRole('VENDOR'), async (req, res) => {
  try {
    const order_id = req.params.id;
    const { status } = req.body;
    const vendor_id = req.user.user_id;

    const validStatuses = ['PREPARING', 'READY'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid vendor status. Allowed: ${validStatuses.join(', ')}` });
    }

    await query(`
      UPDATE orders SET status = ? 
      WHERE order_id = ? AND vendor_id = ?
    `, [status, order_id, vendor_id]);

    await MongoAdapter.pushTrackingLog(order_id, {
      event: `KITCHEN_${status}`,
      timestamp: new Date(),
      location_note: status === 'PREPARING' ? 'Chef started preparing your meal' : 'Meal is packed & ready for pickup',
      actor_role: 'VENDOR'
    });

    return res.json({ success: true, message: `Order #${order_id} marked as ${status}.` });
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
    return res.json({ success: true, dishes });
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
      INSERT INTO dishes (vendor_id, name, category, base_price, daily_stock, is_available)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [vendor_id, name, category, Number(base_price), stockVal, availVal]);

    const dish_id = result.insertId;

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

    const availVal = (is_available === false || is_available === 0 || is_available === '0' || is_available === 'false') ? 0 : 1;
    const defaultReason = availVal === 1 ? 'In Stock' : (out_of_stock_reason || 'Daily portions fully exhausted (0 remaining)');

    // 1. Update MySQL `dishes`
    await query(`
      UPDATE dishes 
      SET name = COALESCE(?, name),
          category = COALESCE(?, category),
          base_price = COALESCE(?, base_price),
          daily_stock = COALESCE(?, daily_stock),
          is_available = ?,
          out_of_stock_reason = ?
      WHERE dish_id = ? AND vendor_id = ?
    `, [name, category, base_price !== undefined ? Number(base_price) : null, daily_stock !== undefined ? Number(daily_stock) : null, availVal, defaultReason, dish_id, vendor_id]);

    // 2. Update MongoDB `vendors_menus`
    const mongoMenu = await MongoAdapter.findVendorMenu(vendor_id);
    if (mongoMenu && mongoMenu.categories) {
      for (const cat of mongoMenu.categories) {
        if (cat.dishes) {
          const targetDish = cat.dishes.find(d => Number(d.dish_id) === Number(dish_id));
          if (targetDish) {
            if (name) targetDish.name = name;
            if (description !== undefined) targetDish.description = description;
            if (base_price !== undefined) targetDish.price = Number(base_price);
            if (image_url !== undefined) targetDish.image_url = image_url;
            targetDish.is_available = availVal === 1;
            if (dietary_tags && Array.isArray(dietary_tags)) targetDish.dietary_tags = dietary_tags;
          }
        }
      }
      await MongoAdapter.findOrSeedVendorMenus([mongoMenu]);
    }

    return res.json({ success: true, message: `Dish #${dish_id} updated successfully!`, is_available: availVal === 1 });
  } catch (err) {
    console.error('Update dish error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update dish.' });
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

    return res.json({ success: true, is_available: newAvail === 1, daily_stock: newDailyStock, message: `Stock status updated to ${newAvail === 1 ? 'In Stock' : 'Out of Stock'}.` });
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
      const cust = await query('SELECT name FROM users WHERE user_id = ?', [r.customer_id]);
      formatted.push({
        ...r,
        customer_name: cust.length > 0 ? cust[0].name : 'Customer'
      });
    }
    return res.json({ success: true, reviews: formatted });
  } catch (err) {
    console.error('Fetch vendor reviews error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch vendor reviews.' });
  }
});

// Get Vendor Store Profile & Status
router.get('/profile', authenticateToken, requireRole('VENDOR'), async (req, res) => {
  try {
    const vendor_id = req.user.user_id;
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
    }

    const profile = {
      vendor_id,
      business_name: mongoMenu?.business_name || req.user.name,
      is_open: mongoMenu?.is_open !== undefined ? mongoMenu.is_open : true,
      closed_reason: mongoMenu?.closed_reason || null,
      operating_hours: mongoMenu?.operating_hours || '11:00 AM - 10:00 PM',
      open_time: mongoMenu?.open_time || '11:00',
      close_time: mongoMenu?.close_time || '22:00',
      chef_bio: mongoMenu?.chef_bio || 'Michelin-trained artisanal independent chef.',
      auto_reopened: autoReopened
    };
    return res.json({ success: true, profile });
  } catch (err) {
    console.error('Fetch profile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch store profile.' });
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
