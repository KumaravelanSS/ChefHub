const express = require('express');
const router = express.Router();
const { query } = require('../config/mysql_db');
const { MongoAdapter } = require('../config/mongo_db');
const { authenticateToken, requireRole } = require('../middleware/auth_rbac');

// Get Available & Active Jobs for Rider
router.get('/jobs', authenticateToken, requireRole('RIDER'), async (req, res) => {
  try {
    const rider_id = req.user.user_id;

    const availableOrders = await query(`
      SELECT o.*, uv.name AS vendor_name, uc.name AS customer_name, uc.phone AS customer_phone
      FROM orders o
      JOIN users uv ON o.vendor_id = uv.user_id
      JOIN users uc ON o.customer_id = uc.user_id
      WHERE (o.status = 'READY' AND (o.rider_id IS NULL OR o.rider_id = ?))
         OR (o.rider_id = ? AND o.status IN ('OUT_FOR_DELIVERY'))
      ORDER BY o.timestamp DESC
    `, [rider_id, rider_id]);

    return res.json({ success: true, jobs: availableOrders });
  } catch (err) {
    console.error('Fetch rider jobs error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch rider jobs.' });
  }
});

// Accept & Pick Up Order
router.patch('/orders/:id/accept', authenticateToken, requireRole('RIDER'), async (req, res) => {
  try {
    const order_id = req.params.id;
    const rider_id = req.user.user_id;

    await query(`
      UPDATE orders 
      SET rider_id = ?, status = 'OUT_FOR_DELIVERY'
      WHERE order_id = ?
    `, [rider_id, order_id]);

    await query(`
      UPDATE payouts SET rider_id = ? WHERE order_id = ?
    `, [rider_id, order_id]);

    await MongoAdapter.upsertRider(rider_id, {
      shift_status: 'ON_DELIVERY',
      assigned_order_id: Number(order_id)
    });

    await MongoAdapter.pushTrackingLog(order_id, {
      event: 'OUT_FOR_DELIVERY',
      timestamp: new Date(),
      location_note: `Rider #${rider_id} picked up the meal and is en route!`,
      actor_role: 'RIDER'
    });

    return res.json({ success: true, message: `Order #${order_id} accepted and picked up!` });
  } catch (err) {
    console.error('Accept rider order error:', err);
    return res.status(500).json({ success: false, message: 'Failed to accept order.' });
  }
});

// Mark Order as Delivered
router.patch('/orders/:id/complete', authenticateToken, requireRole('RIDER'), async (req, res) => {
  try {
    const order_id = req.params.id;
    const rider_id = req.user.user_id;

    await query(`
      UPDATE orders 
      SET status = 'DELIVERED', escrow_status = 'DISBURSED'
      WHERE order_id = ? AND rider_id = ?
    `, [order_id, rider_id]);

    await query(`
      UPDATE payouts 
      SET payout_status = 'PROCESSED', executed_at = CURRENT_TIMESTAMP
      WHERE order_id = ?
    `, [order_id]);

    const riderProfile = await MongoAdapter.getRider(rider_id);
    const completedCount = (riderProfile?.total_deliveries_completed || 0) + 1;

    await MongoAdapter.upsertRider(rider_id, {
      shift_status: 'ONLINE',
      assigned_order_id: null,
      total_deliveries_completed: completedCount
    });

    await MongoAdapter.pushTrackingLog(order_id, {
      event: 'DELIVERED',
      timestamp: new Date(),
      location_note: 'Meal delivered safely. Escrow payouts disbursed to Vendor & Rider.',
      actor_role: 'RIDER'
    });

    return res.json({ success: true, message: `Order #${order_id} marked as DELIVERED. Escrow disbursed!` });
  } catch (err) {
    console.error('Complete delivery error:', err);
    return res.status(500).json({ success: false, message: 'Failed to complete delivery.' });
  }
});

// Update Rider Live Coordinates
router.post('/location', authenticateToken, requireRole('RIDER'), async (req, res) => {
  try {
    const rider_id = req.user.user_id;
    const { lat, lng, shift_status } = req.body;

    const updated = await MongoAdapter.upsertRider(rider_id, {
      shift_status: shift_status || 'ONLINE',
      live_coordinates: { lat: Number(lat) || 12.9716, lng: Number(lng) || 77.5946 }
    });

    return res.json({ success: true, message: 'Location updated', rider: updated });
  } catch (err) {
    console.error('Update rider location error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update location.' });
  }
});

// Fetch Rider Earnings
router.get('/earnings', authenticateToken, requireRole('RIDER'), async (req, res) => {
  try {
    const rider_id = req.user.user_id;
    const payouts = await query(`
      SELECT p.*, o.timestamp AS order_date
      FROM payouts p
      JOIN orders o ON p.order_id = o.order_id
      WHERE p.rider_id = ?
      ORDER BY p.executed_at DESC
    `, [rider_id]);

    const totalEarned = payouts.reduce((acc, curr) => acc + Number(curr.rider_amount), 0);

    return res.json({ success: true, total_earned: totalEarned.toFixed(2), payouts });
  } catch (err) {
    console.error('Fetch rider earnings error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch rider earnings.' });
  }
});

module.exports = router;
