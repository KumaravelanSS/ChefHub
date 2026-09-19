const { query } = require('../config/mysql_db');

const PayoutService = {
  /**
   * Calculates and creates escrow payout entry for an order.
   * Splits total amount: 85% Vendor, 10% Rider, 5% Platform Commission.
   */
  async createOrderPayout(order_id, vendor_id, rider_id, total_amount) {
    const total = Number(total_amount);
    const vendorAmount = (total * 0.85).toFixed(2);
    const riderAmount = (total * 0.10).toFixed(2);
    const commission = (total * 0.05).toFixed(2);

    const result = await query(`
      INSERT INTO payouts (order_id, vendor_id, rider_id, vendor_amount, rider_amount, platform_commission, payout_status)
      VALUES (?, ?, ?, ?, ?, ?, 'SCHEDULED')
    `, [order_id, vendor_id, rider_id || null, vendorAmount, riderAmount, commission]);

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
