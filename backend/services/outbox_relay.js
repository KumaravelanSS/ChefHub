const { query } = require('../config/mysql_db');
const { MongoAdapter } = require('../config/mongo_db');
const eventBroker = require('./event_broker');

/**
 * Transactional Outbox Relay Service
 * Solves the Relational -> NoSQL "Dual-Write" Problem by ensuring all cross-database
 * mutations are first committed to the relational database within the same atomic ACID
 * transaction, and then asynchronously streamed to MongoDB with At-Least-Once Delivery guarantees.
 */
class OutboxRelayService {
  constructor() {
    this.isProcessing = false;
    this.intervalHandle = null;
  }

  /**
   * Records an outbox event inside an ongoing SQL transaction.
   * If the transaction rolls back, this event is rolled back too.
   * If the transaction commits, this event is guaranteed to persist and be processed.
   * 
   * @param {Function} sqlQueryFn - The query function (txQuery from withTransaction or default query)
   * @param {Object} eventData
   */
  async recordEvent(sqlQueryFn, { aggregate_type, aggregate_id, event_type, payload }) {
    try {
      const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const q = sqlQueryFn || query;

      const res = await q(`
        INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload, status)
        VALUES (?, ?, ?, ?, 'PENDING')
      `, [aggregate_type, String(aggregate_id), event_type, payloadStr]);

      return res.insertId;
    } catch (err) {
      console.error('[Outbox Relay] Failed to record outbox event:', err);
      throw err;
    }
  }

  /**
   * Processes all pending outbox events and pushes them downstream to MongoDB.
   * Uses exponential retry count tracking and handles network interruptions safely.
   */
  async processPendingEvents() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // 1. Fetch pending outbox events ordered by sequence
      const events = await query(`
        SELECT event_id, aggregate_type, aggregate_id, event_type, payload, retry_count
        FROM outbox_events
        WHERE status = 'PENDING' AND retry_count < 5
        ORDER BY event_id ASC
        LIMIT 25
      `);

      if (!events || events.length === 0) {
        this.isProcessing = false;
        return;
      }

      for (const event of events) {
        try {
          const payload = JSON.parse(event.payload || '{}');

          // 2. Dispatch event to MongoDB collections based on aggregate & event type
          await this.dispatchToMongo(event.event_type, event.aggregate_type, event.aggregate_id, payload);

          // 3. Mark event as successfully PROCESSED in SQL
          await query(`
            UPDATE outbox_events
            SET status = 'PROCESSED', processed_at = CURRENT_TIMESTAMP
            WHERE event_id = ?
          `, [event.event_id]);

        } catch (dispatchErr) {
          console.warn(`[Outbox Relay] Temporary dispatch failure for event #${event.event_id}:`, dispatchErr.message);

          // 4. Update retry count and log error message for auditing
          const nextRetry = (event.retry_count || 0) + 1;
          const newStatus = nextRetry >= 5 ? 'FAILED' : 'PENDING';
          await query(`
            UPDATE outbox_events
            SET retry_count = ?, error_message = ?, status = ?
            WHERE event_id = ?
          `, [nextRetry, dispatchErr.message.substring(0, 500), newStatus, event.event_id]);
        }
      }
    } catch (err) {
      console.error('[Outbox Relay] Queue processing loop error:', err);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Routes events downstream to the respective MongoDB document stores.
   */
  async dispatchToMongo(eventType, aggregateType, aggregateId, payload) {
    switch (eventType) {
      case 'ORDER_CREATED': {
        const orderId = Number(aggregateId);
        // Sync Order Tracking Timeline in MongoDB
        await MongoAdapter.pushTrackingLog(orderId, {
          event: 'ORDER_PLACED',
          timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
          location_note: payload.location_note || 'Order submitted and escrow payment secured',
          actor_role: 'CUSTOMER'
        });

        // Sync MongoDB Vendor Menu availability if portions depleted
        if (payload.vendor_id) {
          const InventoryEngine = require('./inventory_engine');
          await InventoryEngine.autoSyncDishAvailability(payload.vendor_id);

          // Publish real-time events to Kitchen Display System (KDS) & Customer tracking
          eventBroker.publish(`vendor_${payload.vendor_id}`, 'ORDER_CREATED', { order_id: orderId, ...payload });
          eventBroker.publish('global', 'ORDER_CREATED', { order_id: orderId, vendor_id: payload.vendor_id });
        }
        break;
      }

      case 'DISH_STOCK_UPDATED':
      case 'DISH_UPDATED': {
        const vendorId = payload.vendor_id;
        if (vendorId) {
          const InventoryEngine = require('./inventory_engine');
          await InventoryEngine.autoSyncDishAvailability(vendorId);

          // Publish real-time stock updates to marketplace consumers
          eventBroker.publish('global', 'DISH_STOCK_UPDATED', { vendor_id: vendorId, ...payload });
          eventBroker.publish(`vendor_${vendorId}`, 'DISH_STOCK_UPDATED', payload);
        }
        break;
      }

      case 'ORDER_STATUS_CHANGED': {
        const orderId = Number(aggregateId);
        await MongoAdapter.pushTrackingLog(orderId, {
          event: payload.new_status || 'STATUS_UPDATE',
          timestamp: new Date(),
          location_note: payload.note || `Order status updated to ${payload.new_status}`,
          actor_role: payload.actor_role || 'SYSTEM'
        });

        // Broadcast to customer order tracking stream
        eventBroker.publish(`order_${orderId}`, 'ORDER_STATUS_CHANGED', { order_id: orderId, ...payload });
        eventBroker.publish('global', 'ORDER_STATUS_CHANGED', { order_id: orderId, ...payload });

        // If meal is ready, alert delivery rider pool
        if (payload.new_status === 'KITCHEN_READY' || payload.new_status === 'READY') {
          eventBroker.publish('rider', 'JOB_AVAILABLE', { order_id: orderId, status: 'READY', ...payload });
        }
        break;
      }

      case 'AUDIT_LOG': {
        await MongoAdapter.addAuditLog(
          payload.admin_user_id || 1,
          payload.action_type || 'SYSTEM_ACTION',
          payload.details_json || payload
        );
        eventBroker.publish('admin', 'AUDIT_LOG', payload);
        break;
      }

      default:
        console.log(`[Outbox Relay] Unhandled event type: ${eventType}, marked processed.`);
    }
  }

  /**
   * Starts the background outbox polling worker.
   */
  startWorker(intervalMs = 2500) {
    if (this.intervalHandle) return;
    this.intervalHandle = setInterval(() => {
      this.processPendingEvents().catch(err => console.error('[Outbox Relay Error]', err));
    }, intervalMs);
    console.log(`[Outbox Relay] Transactional Outbox Worker started (polling every ${intervalMs}ms).`);
  }

  /**
   * Immediately processes the pending queue without waiting for the next timer tick.
   */
  dispatchNow() {
    setImmediate(() => {
      this.processPendingEvents().catch(err => console.error('[Outbox Relay Trigger Error]', err));
    });
  }

  /**
   * Stops the background worker gracefully.
   */
  stopWorker() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }
}

const outboxRelay = new OutboxRelayService();
module.exports = outboxRelay;
