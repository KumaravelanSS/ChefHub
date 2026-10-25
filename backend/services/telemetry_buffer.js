/**
 * ChefHub Telemetry Buffer Service
 * Collects, buffers, and batch-writes high-frequency rider GPS telemetry.
 * Dispatches real-time broadcast to SSE channels and provides an HTTP long-polling fallback store.
 */

const eventBroker = require('./event_broker');
const { MongoAdapter } = require('../config/mongo_db');

class TelemetryBuffer {
  constructor() {
    this.buffer = [];
    this.latestRiderLocations = new Map(); // rider_id -> { lat, lng, speed, heading, timestamp, order_id }
    this.latestOrderLocations = new Map(); // order_id -> { rider_id, lat, lng, speed, heading, timestamp }
    this.batchIntervalMs = 5000;
    this.maxBatchSize = 100;
    this.timer = null;

    this.startWorker();
  }

  startWorker() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.flushBatch();
    }, this.batchIntervalMs);
  }

  /**
   * Enqueue a batch of rider GPS coordinates
   * @param {number|string} riderId
   * @param {Array<{ lat: number, lng: number, speed?: number, heading?: number, timestamp?: string, order_id?: number }>} points
   */
  enqueueBatch(riderId, points) {
    if (!Array.isArray(points) || points.length === 0) return { accepted: 0 };

    const now = new Date();
    const normalizedPoints = points.map(pt => ({
      rider_id: Number(riderId),
      order_id: pt.order_id ? Number(pt.order_id) : null,
      lat: Number(pt.lat),
      lng: Number(pt.lng),
      speed: Number(pt.speed || 0),
      heading: Number(pt.heading || 0),
      timestamp: pt.timestamp ? new Date(pt.timestamp) : now
    }));

    this.buffer.push(...normalizedPoints);

    // Update latest known coordinates for immediate read/polling
    const latest = normalizedPoints[normalizedPoints.length - 1];
    this.latestRiderLocations.set(Number(riderId), latest);

    if (latest.order_id) {
      this.latestOrderLocations.set(Number(latest.order_id), latest);
    }

    // Broadcast instant SSE telemetry update to live tracking subscribers
    const payload = {
      rider_id: latest.rider_id,
      order_id: latest.order_id,
      lat: latest.lat,
      lng: latest.lng,
      speed: latest.speed,
      heading: latest.heading,
      timestamp: latest.timestamp.toISOString()
    };

    eventBroker.broadcast('rider', 'RIDER_LOCATION_UPDATE', payload);
    eventBroker.broadcast(`rider_${riderId}`, 'RIDER_LOCATION_UPDATE', payload);
    if (latest.order_id) {
      eventBroker.broadcast(`order_${latest.order_id}`, 'RIDER_LOCATION_UPDATE', payload);
    }

    if (this.buffer.length >= this.maxBatchSize) {
      this.flushBatch();
    }

    return { accepted: normalizedPoints.length, latest };
  }

  /**
   * Flush buffered coordinates to persistent storage
   */
  async flushBatch() {
    if (this.buffer.length === 0) return;

    const toFlush = this.buffer.splice(0, this.maxBatchSize);
    try {
      // Group by rider to update current status in MongoDB
      const riderLastMap = new Map();
      for (const item of toFlush) {
        riderLastMap.set(item.rider_id, item);
      }

      for (const [rId, lastPt] of riderLastMap.entries()) {
        await MongoAdapter.upsertRider(rId, {
          live_coordinates: { lat: lastPt.lat, lng: lastPt.lng },
          last_gps_heartbeat: lastPt.timestamp
        });
      }
    } catch (err) {
      console.warn('[TelemetryBuffer Flush Warning]', err.message);
    }
  }

  /**
   * HTTP Polling Fallback lookup
   */
  getLatestForOrder(orderId) {
    const oId = Number(orderId);
    if (this.latestOrderLocations.has(oId)) {
      return this.latestOrderLocations.get(oId);
    }
    return null;
  }

  getLatestForRider(riderId) {
    const rId = Number(riderId);
    if (this.latestRiderLocations.has(rId)) {
      return this.latestRiderLocations.get(rId);
    }
    return null;
  }
}

module.exports = new TelemetryBuffer();
