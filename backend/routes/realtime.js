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

module.exports = router;
