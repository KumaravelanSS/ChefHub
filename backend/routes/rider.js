const express = require('express');
const router = express.Router();
const { query } = require('../config/mysql_db');
const { MongoAdapter } = require('../config/mongo_db');
const { authenticateToken, requireRole } = require('../middleware/auth_rbac');
const outboxRelay = require('../services/outbox_relay');

// Get Available & Active Jobs for Rider
router.get('/jobs', authenticateToken, requireRole('RIDER'), async (req, res) => {
  try {
    const rider_id = req.user.user_id;

    const availableOrders = await query(`
      SELECT o.*, 
             uv.name AS vendor_name, uv.latitude AS vendor_lat, uv.longitude AS vendor_lng, uv.primary_address AS vendor_address,
             uc.name AS customer_name, uc.phone AS customer_phone, uc.latitude AS customer_lat, uc.longitude AS customer_lng
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

    // 1. Rider Shift Status Validation: If rider is OFFLINE, reject order acceptance
    const riderProfile = await MongoAdapter.getRider(rider_id);
    if (riderProfile && riderProfile.shift_status === 'OFFLINE') {
      return res.status(400).json({
        success: false,
        message: 'You are currently OFFLINE. Please toggle your shift status to ONLINE before accepting delivery orders.'
      });
    }

    // 2. Active Orders Capacity & Same-Chef Batching Constraint
    // A rider can have a maximum of 1 or 2 orders simultaneously, and ONLY from the same chef!
    const activeOrders = await query(`
      SELECT order_id, vendor_id, status 
      FROM orders 
      WHERE rider_id = ? AND status = 'OUT_FOR_DELIVERY'
    `, [rider_id]);

    if (activeOrders.length >= 2) {
      return res.status(400).json({
        success: false,
        message: 'Maximum active order capacity reached (Max 2 orders at a time). Deliver your current orders before picking up more.'
      });
    }

    const targetOrderRows = await query(`
      SELECT o.order_id, o.vendor_id, o.status, uv.name AS vendor_name 
      FROM orders o
      JOIN users uv ON o.vendor_id = uv.user_id
      WHERE o.order_id = ?
    `, [order_id]);

    if (targetOrderRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    const targetOrder = targetOrderRows[0];

    if (activeOrders.length === 1 && Number(activeOrders[0].vendor_id) !== Number(targetOrder.vendor_id)) {
      return res.status(400).json({
        success: false,
        message: `Batching Restriction: You already have an active pickup from Chef #${activeOrders[0].vendor_id}. You can only batch up to 2 orders from the SAME chef, not from different chefs!`
      });
    }

    // 3. Parallelize primary relational updates & outbox recording
    await Promise.all([
      query(`
        UPDATE orders 
        SET rider_id = ?, status = 'OUT_FOR_DELIVERY', dispatched_at = COALESCE(dispatched_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
        WHERE order_id = ?
      `, [rider_id, order_id]),
      query(`UPDATE payouts SET rider_id = ? WHERE order_id = ?`, [rider_id, order_id]),
      outboxRelay.recordEvent(null, {
        aggregate_type: 'ORDER',
        aggregate_id: order_id,
        event_type: 'ORDER_STATUS_CHANGED',
        payload: {
          new_status: 'OUT_FOR_DELIVERY',
          actor_role: 'RIDER',
          note: `Rider #${rider_id} picked up the meal and is en route!`
        }
      })
    ]);

    // 2. Respond immediately to unlock Rider UI in milliseconds
    res.json({ success: true, message: `Order #${order_id} accepted and picked up!` });

    // 3. Asynchronously sync MongoDB & dispatch outbox in background
    setImmediate(async () => {
      try {
        await MongoAdapter.upsertRider(rider_id, {
          shift_status: 'ON_DELIVERY',
          assigned_order_id: Number(order_id)
        });
        outboxRelay.dispatchNow();
        await MongoAdapter.pushTrackingLog(order_id, {
          event: 'OUT_FOR_DELIVERY',
          timestamp: new Date(),
          location_note: `Rider #${rider_id} picked up the meal and is en route!`,
          actor_role: 'RIDER'
        });
      } catch (bgErr) {
        console.warn('[Background Rider Accept Sync Warning]', bgErr.message);
      }
    });
    return;
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

    // 1. Parallelize primary SQL updates and outbox record
    await Promise.all([
      query(`
        UPDATE orders 
        SET status = 'DELIVERED', escrow_status = 'DISBURSED', delivered_at = COALESCE(delivered_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
        WHERE order_id = ? AND rider_id = ?
      `, [order_id, rider_id]),
      query(`
        UPDATE payouts 
        SET payout_status = 'PROCESSED', executed_at = CURRENT_TIMESTAMP
        WHERE order_id = ?
      `, [order_id]),
      outboxRelay.recordEvent(null, {
        aggregate_type: 'ORDER',
        aggregate_id: order_id,
        event_type: 'ORDER_STATUS_CHANGED',
        payload: {
          new_status: 'DELIVERED',
          actor_role: 'RIDER',
          note: 'Meal delivered safely. Escrow payouts disbursed to Vendor & Rider.'
        }
      })
    ]);

    // 2. Respond immediately to unlock Rider UI
    res.json({ success: true, message: `Order #${order_id} marked as DELIVERED. Escrow disbursed!` });

    // 3. Asynchronously sync MongoDB profile & tracking log in background
    setImmediate(async () => {
      try {
        const riderProfile = await MongoAdapter.getRider(rider_id);
        const completedCount = (riderProfile?.total_deliveries_completed || 0) + 1;
        await MongoAdapter.upsertRider(rider_id, {
          shift_status: 'ONLINE',
          assigned_order_id: null,
          total_deliveries_completed: completedCount
        });
        outboxRelay.dispatchNow();
        await MongoAdapter.pushTrackingLog(order_id, {
          event: 'DELIVERED',
          timestamp: new Date(),
          location_note: 'Meal delivered safely. Escrow payouts disbursed to Vendor & Rider.',
          actor_role: 'RIDER'
        });
      } catch (bgErr) {
        console.warn('[Background Delivery Sync Warning]', bgErr.message);
      }
    });
    return;
  } catch (err) {
    console.error('Complete delivery error:', err);
    return res.status(500).json({ success: false, message: 'Failed to complete delivery.' });
  }
});

const telemetryBuffer = require('../services/telemetry_buffer');

// Update Rider Live Coordinates
router.post('/location', authenticateToken, requireRole('RIDER'), async (req, res) => {
  try {
    const rider_id = req.user.user_id;
    const { lat, lng, shift_status } = req.body;

    const updated = await MongoAdapter.upsertRider(rider_id, {
      shift_status: shift_status || 'ONLINE',
      live_coordinates: { lat: Number(lat) || 12.9716, lng: Number(lng) || 77.5946 }
    });

    telemetryBuffer.enqueueBatch(rider_id, [{
      lat: Number(lat) || 12.9716,
      lng: Number(lng) || 77.5946,
      timestamp: new Date()
    }]);

    return res.json({ success: true, message: 'Location updated', rider: updated });
  } catch (err) {
    console.error('Update rider location error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update location.' });
  }
});

// Batched Geolocation Telemetry Stream (5-second locked throttle buffer)
router.post('/gps', authenticateToken, requireRole('RIDER'), async (req, res) => {
  try {
    const rider_id = req.user.user_id;
    const { batch, coordinates, order_id } = req.body;
    const points = Array.isArray(batch) ? batch : (Array.isArray(coordinates) ? coordinates : (req.body.lat ? [req.body] : []));

    if (points.length === 0) {
      return res.status(400).json({ success: false, message: 'No coordinate points in telemetry batch.' });
    }

    const result = telemetryBuffer.enqueueBatch(rider_id, points.map(p => ({
      ...p,
      order_id: p.order_id || order_id
    })));

    return res.json({
      success: true,
      message: 'Telemetry batch queued',
      points_buffered: result.accepted,
      latest: result.latest,
      sync_timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Batched GPS telemetry error:', err);
    return res.status(500).json({ success: false, message: 'Failed to buffer rider GPS telemetry.' });
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

// Fetch Rider Reviews
router.get('/reviews', authenticateToken, requireRole('RIDER'), async (req, res) => {
  try {
    const rider_id = req.user.user_id;
    const reviews = await MongoAdapter.getReviews({ rider_id: Number(rider_id) });
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
    console.error('Fetch rider reviews error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch rider reviews.' });
  }
});

module.exports = router;
