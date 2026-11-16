const { query } = require('../config/mysql_db');

const PayoutService = {
  /**
   * Calculates and creates escrow payout entry for an order.
   * Delivery split: 85% Vendor, 10% Rider, 5% Platform Commission.
   * Takeaway split: 95% Vendor, 0% Rider (Self-Pickup), 5% Platform Commission.
   */
  async createOrderPayout(order_id, vendor_id, rider_id, total_amount, customQuery = query, order_type = 'DELIVERY') {
    const total = Number(total_amount);
    const isTakeaway = String(order_type || '').toUpperCase() === 'TAKEAWAY';
    const vendorAmount = (total * (isTakeaway ? 0.95 : 0.85)).toFixed(2);
    const riderAmount = isTakeaway ? '0.00' : (total * 0.10).toFixed(2);
    const commission = (total * 0.05).toFixed(2);

    const result = await customQuery(`
      INSERT INTO payouts (order_id, vendor_id, rider_id, vendor_amount, rider_amount, platform_commission, payout_status)
      VALUES (?, ?, ?, ?, ?, ?, 'SCHEDULED')
    `, [order_id, vendor_id, isTakeaway ? null : (rider_id || null), vendorAmount, riderAmount, commission]);

    return {
      payout_id: result.insertId,
      order_id,
      vendor_amount: Number(vendorAmount),
      rider_amount: Number(riderAmount),
      platform_commission: Number(commission),
      status: 'SCHEDULED'
    };
  }
};

module.exports = PayoutService;
