const EventEmitter = require('events');

/**
 * Enterprise Real-Time Event Broker (Server-Sent Events / SSE Stream)
 * Provides low-latency, real-time push streaming to Kitchen Display Systems (KDS),
 * live customer order tracking, rider logistics dispatch, and dynamic inventory changes.
 */
class RealtimeEventBroker extends EventEmitter {
  constructor() {
    super();
    // Map of channelName -> Set of Express response objects
    this.channels = new Map();
    this.totalMessagesSent = 0;
    this.heartbeatTimer = null;

    this.startHeartbeat(20000); // 20s keep-alive
  }

  /**
   * Subscribes an HTTP response stream to one or more channels
   * @param {string|string[]} channels
   * @param {Object} res - Express response object
   * @param {Object} [meta] - Client connection metadata (userId, role)
   */
  subscribe(channels, res, meta = {}) {
    const channelList = Array.isArray(channels) ? channels : [channels];

    for (const ch of channelList) {
      if (!this.channels.has(ch)) {
        this.channels.set(ch, new Set());
      }
      this.channels.get(ch).add(res);
    }

    // Attach metadata to response for diagnostics
    res._sseChannels = channelList;
    res._sseMeta = meta;

    // Send initial handshake confirmation
    res.write(`event: handshake\ndata: ${JSON.stringify({
      status: 'CONNECTED',
      subscribed_channels: channelList,
      timestamp: new Date().toISOString()
    })}\n\n`);

    // Clean up when client disconnects
    res.on('close', () => {
      this.unsubscribe(res);
    });
  }

  /**
   * Removes a client connection from all channels it was subscribed to
   * @param {Object} res
   */
  unsubscribe(res) {
    if (!res._sseChannels) return;

    for (const ch of res._sseChannels) {
      if (this.channels.has(ch)) {
        const set = this.channels.get(ch);
        set.delete(res);
        if (set.size === 0) {
          this.channels.delete(ch);
        }
      }
    }
  }

  /**
   * Publishes an event to all subscribers of a specific channel
   * @param {string} channel
   * @param {string} eventType
   * @param {Object} data
   */
  publish(channel, eventType, data = {}) {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify({
      ...data,
      _channel: channel,
      _timestamp: new Date().toISOString()
    })}\n\n`;

    let deliveredCount = 0;

    // Dispatch to specific channel subscribers
    if (this.channels.has(channel)) {
      const set = this.channels.get(channel);
      for (const res of set) {
        try {
          res.write(payload);
          deliveredCount++;
        } catch (err) {
          set.delete(res);
        }
      }
    }

    this.totalMessagesSent++;
    this.emit('message_sent', { channel, eventType, deliveredCount });
    return deliveredCount;
  }

  /**
   * Broadcasts an event to all connected clients across all channels
   * @param {string} eventType
   * @param {Object} data
   */
  broadcast(eventType, data = {}) {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify({
      ...data,
      _broadcast: true,
      _timestamp: new Date().toISOString()
    })}\n\n`;

    let deliveredCount = 0;
    const seenResponses = new Set();

    for (const [_, set] of this.channels) {
      for (const res of set) {
        if (!seenResponses.has(res)) {
          seenResponses.add(res);
          try {
            res.write(payload);
            deliveredCount++;
          } catch (err) {
            // Handled on close
          }
        }
      }
    }

    this.totalMessagesSent++;
    return deliveredCount;
  }

  /**
   * Starts periodic keep-alive comments to prevent cloud proxies from dropping idle connections
   * @param {number} intervalMs
   */
  startHeartbeat(intervalMs = 20000) {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

    this.heartbeatTimer = setInterval(() => {
      const ping = `: keep-alive ${Date.now()}\n\n`;
      for (const [_, set] of this.channels) {
        for (const res of set) {
          try {
            res.write(ping);
          } catch (err) {
            set.delete(res);
          }
        }
      }
    }, intervalMs);
  }

  /**
   * Returns current broker statistics for observability & diagnostics
   */
  getMetrics() {
    const channelStats = {};
    let totalConnections = 0;
    const uniqueClients = new Set();

    for (const [ch, set] of this.channels) {
      channelStats[ch] = set.size;
      for (const res of set) {
        uniqueClients.add(res);
      }
    }

    return {
      active_channels: this.channels.size,
      active_connections: uniqueClients.size,
      channel_breakdown: channelStats,
      total_messages_published: this.totalMessagesSent
    };
  }

  /**
   * Graceful shutdown of all open streams
   */
  destroy() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    for (const [_, set] of this.channels) {
      for (const res of set) {
        try {
          res.end();
        } catch (e) {}
      }
    }
    this.channels.clear();
  }
}

const eventBroker = new RealtimeEventBroker();
module.exports = eventBroker;
