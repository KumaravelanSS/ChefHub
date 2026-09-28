const { query } = require('../config/mysql_db');

const InventoryEngine = {
  /**
   * Automatically calculates & syncs real-time dish availability in MySQL and MongoDB based on ingredient stock levels.
   */
  async autoSyncDishAvailability(vendor_id = null) {
    try {
      const { MongoAdapter } = require('../config/mongo_db');
      
      let dishQuery = 'SELECT dish_id, vendor_id, daily_stock, is_available, out_of_stock_reason FROM dishes';
      const params = [];
      if (vendor_id) {
        dishQuery += ' WHERE vendor_id = ?';
        params.push(vendor_id);
      }
      
      const dishes = await query(dishQuery, params);
      if (!dishes || dishes.length === 0) return;

      const dishIds = dishes.map(d => d.dish_id);
      const recipeRows = dishIds.length > 0 ? await query(`
        SELECT dr.dish_id, dr.ingredient_id, dr.quantity_required, i.stock_quantity
        FROM dish_recipes dr
        JOIN inventory i ON dr.ingredient_id = i.ingredient_id
        WHERE dr.dish_id IN (${dishIds.map(() => '?').join(',')})
      `, dishIds) : [];

      const recipeMap = {};
      for (const r of recipeRows) {
        if (!recipeMap[r.dish_id]) recipeMap[r.dish_id] = [];
        recipeMap[r.dish_id].push(r);
      }

      let anyChanged = false;
      const vendorsToSync = new Set();

      for (const d of dishes) {
        const recipes = recipeMap[d.dish_id] || [];

        let hasIngredientShortage = false;
        if (recipes.length > 0) {
          for (const r of recipes) {
            if (Number(r.stock_quantity) < Number(r.quantity_required)) {
              hasIngredientShortage = true;
              break;
            }
          }
        }

        const isPortionDepleted = d.daily_stock !== null && d.daily_stock !== undefined && Number(d.daily_stock) <= 0;

        let isAvailable = true;
        let reason = null;

        if (isPortionDepleted) {
          isAvailable = false;
          reason = 'Daily portions fully exhausted (0 remaining)';
        } else if (hasIngredientShortage) {
          isAvailable = false;
          reason = 'Raw ingredient shortage (Required ingredients depleted in stock)';
        } else if ((d.is_available === 0 || d.is_available === false) && d.out_of_stock_reason && !d.out_of_stock_reason.includes('Daily portions') && !d.out_of_stock_reason.includes('Raw ingredient')) {
          isAvailable = false;
          reason = d.out_of_stock_reason;
        }

        const availVal = isAvailable ? 1 : 0;
        const currentAvailVal = (d.is_available === 1 || d.is_available === true) ? 1 : 0;
        const currentReason = d.out_of_stock_reason || null;

        // Only write to database if status or reason actually changed
        if (currentAvailVal !== availVal || currentReason !== (reason || null)) {
          anyChanged = true;
          vendorsToSync.add(d.vendor_id);
          await query(
            'UPDATE dishes SET is_available = ?, out_of_stock_reason = ? WHERE dish_id = ?',
            [availVal, reason, d.dish_id]
          );
        }
      }

      // Sync MongoDB vendor menus only for vendors with actual dish state changes
      if (anyChanged && vendorsToSync.size > 0) {
        for (const vId of vendorsToSync) {
          const mongoMenu = await MongoAdapter.findVendorMenu(vId);
          if (mongoMenu && mongoMenu.categories) {
            const vDishes = await query('SELECT dish_id, is_available FROM dishes WHERE vendor_id = ?', [vId]);
            const dishAvailMap = {};
            for (const vd of vDishes) {
              dishAvailMap[vd.dish_id] = vd.is_available === 1 || vd.is_available === true;
            }
            for (const cat of mongoMenu.categories) {
              for (const td of cat.dishes || []) {
                if (dishAvailMap[td.dish_id] !== undefined) {
                  td.is_available = dishAvailMap[td.dish_id];
                }
              }
            }
            await MongoAdapter.findOrSeedVendorMenus([mongoMenu]);
          }
        }
      }
    } catch (err) {
      console.error('Auto sync dish availability error:', err);
    }
  },

  /**
   * Verifies if all ingredients required for dishes in an order are in sufficient stock.
   */
  async verifyOrderStock(items) {
    // Sync before checking
    await this.autoSyncDishAvailability();

    for (const item of items) {
      const recipes = await query(`
        SELECT dr.ingredient_id, dr.quantity_required, i.ingredient_name, i.stock_quantity
        FROM dish_recipes dr
        JOIN inventory i ON dr.ingredient_id = i.ingredient_id
        WHERE dr.dish_id = ?
      `, [item.dish_id]);

      for (const recipe of recipes) {
        const requiredTotal = Number(recipe.quantity_required) * Number(item.quantity);
        if (Number(recipe.stock_quantity) < requiredTotal) {
          return {
            sufficient: false,
            message: `Insufficient stock for ingredient '${recipe.ingredient_name}'. Required: ${requiredTotal}, Available: ${recipe.stock_quantity}`
          };
        }
      }
    }
    return { sufficient: true };
  },

  /**
   * Performs atomic relational stock deduction for an accepted order and auto-syncs dish stock availability.
   */
  async deductOrderStock(items) {
    const deductions = [];
    let vendorId = null;

    for (const item of items) {
      const recipes = await query(`
        SELECT dr.ingredient_id, dr.quantity_required, i.ingredient_name, i.stock_quantity, i.reorder_level, d.vendor_id
        FROM dish_recipes dr
        JOIN inventory i ON dr.ingredient_id = i.ingredient_id
        JOIN dishes d ON dr.dish_id = d.dish_id
        WHERE dr.dish_id = ?
      `, [item.dish_id]);

      for (const recipe of recipes) {
        if (!vendorId) vendorId = recipe.vendor_id;
        const deductAmount = Number(recipe.quantity_required) * Number(item.quantity);
        await query(`
          UPDATE inventory 
          SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP
          WHERE ingredient_id = ?
        `, [deductAmount, recipe.ingredient_id]);

        const newStock = Number(recipe.stock_quantity) - deductAmount;
        deductions.push({
          ingredient_id: recipe.ingredient_id,
          ingredient_name: recipe.ingredient_name,
          deducted: deductAmount,
          new_stock: newStock,
          low_stock_warning: newStock <= Number(recipe.reorder_level)
        });
      }
    }

    // Auto sync dish availability after deduction
    await this.autoSyncDishAvailability(vendorId);

    return deductions;
  }
};

module.exports = InventoryEngine;
