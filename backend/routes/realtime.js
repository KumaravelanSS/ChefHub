const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const eventBroker = require('../services/event_broker');

const JWT_SECRET = process.env.JWT_SECRET || 'chefhub_super_secret_jwt_key_2024';

/**
 * Real-Time Event Stream Endpoint (Server-Sent Events)
 * Clients (React frontend, Kitchen KDS screens, Live Rider Maps) connect here
 * to receive instant push notifications with zero-latency.
 */
router.get('/events', (req, res) => {
  // Set SSE HTTP response headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Essential for NGINX/Render reverse proxy streaming
  });

  // Extract channels from query
  let requestedChannels = [];
  if (req.query.channel) {
    requestedChannels = req.query.channel.split(',').map(c => c.trim()).filter(Boolean);
  }

  // Always include 'global' channel for general broadcast
  const channelSet = new Set(requestedChannels);
  channelSet.add('global');

  // Inspect optional token for smart channel routing
  let userMeta = {};
  const token = req.query.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userMeta = { userId: decoded.user_id, role: decoded.role };

      // Auto-subscribe to role-specific private channels
      if (decoded.role === 'VENDOR') {
        channelSet.add(`vendor_${decoded.user_id}`);
      } else if (decoded.role === 'RIDER') {
        channelSet.add('rider');
        channelSet.add(`rider_${decoded.user_id}`);
      } else if (decoded.role === 'CUSTOMER') {
        channelSet.add(`customer_${decoded.user_id}`);
      } else if (decoded.role === 'ADMIN') {
        channelSet.add('admin');
      }
    } catch (err) {
      // Invalid/expired token: continues as guest with public requested channels
    }
  }

  const finalChannels = Array.from(channelSet);
  eventBroker.subscribe(finalChannels, res, userMeta);
});

/**
 * Diagnostics & Observability Metrics for the Real-Time Stream
 */
router.get('/metrics', (req, res) => {
  res.json({
    success: true,
    realtime: eventBroker.getMetrics(),
    timestamp: new Date().toISOString()
  });
});

/**
 * HTTP Long-Polling Telemetry Fallback Endpoint
 * Triggered automatically by LiveDeliveryMap.jsx if SSE connection drops or is blocked.
 */
const telemetryBuffer = require('../services/telemetry_buffer');
const { query } = require('../config/mysql_db');

router.get('/telemetry/:orderId', async (req, res) => {
  try {
    const orderId = Number(req.params.orderId);
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Invalid order ID.' });
    }

    // 1. Check in-memory telemetry buffer first
    const buffered = telemetryBuffer.getLatestForOrder(orderId);
    if (buffered) {
      return res.json({
        success: true,
        source: 'BUFFER_MEMORY',
        order_id: orderId,
        rider_id: buffered.rider_id,
        live_coordinates: { lat: buffered.lat, lng: buffered.lng },
        speed_kmh: buffered.speed,
        heading_deg: buffered.heading,
        last_updated: buffered.timestamp,
        connection_mode: 'HTTP_LONG_POLLING_FALLBACK'
      });
    }

    // 2. Fall back to orders and rider state in DB
    const order = await query('SELECT order_id, rider_id, status FROM orders WHERE order_id = ?', [orderId]);
    if (!order || order.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const riderId = order[0].rider_id;
    let riderCoords = { lat: 12.9716, lng: 77.5946 };
    if (riderId) {
      const riderLatest = telemetryBuffer.getLatestForRider(riderId);
      if (riderLatest) {
        riderCoords = { lat: riderLatest.lat, lng: riderLatest.lng };
      }
    }

    return res.json({
      success: true,
      source: 'DATABASE_SNAPSHOT',
      order_id: orderId,
      rider_id: riderId || null,
      order_status: order[0].status,
      live_coordinates: riderCoords,
      speed_kmh: order[0].status === 'OUT_FOR_DELIVERY' ? 26.5 : 0,
      heading_deg: 45,
      last_updated: new Date().toISOString(),
      connection_mode: 'HTTP_LONG_POLLING_FALLBACK'
    });
  } catch (err) {
    console.error('HTTP telemetry polling error:', err);
    return res.status(500).json({ success: false, message: 'Failed to poll telemetry.' });
  }
});

module.exports = router;
