const { query } = require('../config/mysql_db');

const InventoryEngine = {
  /**
   * Automatically calculates & syncs real-time dish availability in MySQL and MongoDB based on ingredient stock levels.
   */
  async autoSyncDishAvailability(vendor_id = null) {
    try {
      const { MongoAdapter } = require('../config/mongo_db');
      
      let dishQuery = 'SELECT dish_id, vendor_id FROM dishes';
      const params = [];
      if (vendor_id) {
        dishQuery += ' WHERE vendor_id = ?';
        params.push(vendor_id);
      }
      
      const dishes = await query(dishQuery, params);
      
      for (const d of dishes) {
        const recipes = await query(`
          SELECT dr.ingredient_id, dr.quantity_required, i.stock_quantity
          FROM dish_recipes dr
          JOIN inventory i ON dr.ingredient_id = i.ingredient_id
          WHERE dr.dish_id = ?
        `, [d.dish_id]);

        let isAvailable = true;
        if (recipes && recipes.length > 0) {
          for (const r of recipes) {
            if (Number(r.stock_quantity) < Number(r.quantity_required)) {
              isAvailable = false;
              break;
            }
          }
        }

        const availVal = isAvailable ? 1 : 0;
        if (!isAvailable) {
          await query("UPDATE dishes SET is_available = 0, out_of_stock_reason = 'Raw ingredient shortage (Required ingredients depleted in stock)' WHERE dish_id = ?", [d.dish_id]);
        } else {
          await query("UPDATE dishes SET is_available = 1 WHERE dish_id = ?", [d.dish_id]);
        }

        // Sync MongoDB vendor menu document
        const mongoMenu = await MongoAdapter.findVendorMenu(d.vendor_id);
        if (mongoMenu && mongoMenu.categories) {
          let updated = false;
          for (const cat of mongoMenu.categories) {
            if (cat.dishes) {
              const target = cat.dishes.find(td => Number(td.dish_id) === Number(d.dish_id));
              if (target) {
                target.is_available = isAvailable;
                updated = true;
              }
            }
          }
          if (updated) {
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
