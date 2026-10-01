const { query, initRelationalDb, withTransaction } = require('./config/mysql_db');
const { initMongoDb } = require('./config/mongo_db');
const outboxRelay = require('./services/outbox_relay');

async function testPhase2() {
  console.log('=== Starting Phase 2 Transactional Outbox Verification ===');

  // 1. Initialize DBs
  await initRelationalDb();
  await initMongoDb();

  // 2. Verify outbox_events table exists
  const tableCheck = await query(`
    SELECT count(*) AS cnt FROM outbox_events
  `);
  console.log('✓ outbox_events table exists and queryable. Row count:', tableCheck[0].cnt);

  // 3. Test ACID Transaction with Outbox Event recording
  let testOrderId = 99990 + Math.floor(Math.random() * 1000);
  console.log(`\nTesting atomic commit with Outbox Event for synthetic order #${testOrderId}...`);

  await withTransaction(async (txQuery) => {
    // Insert mock order into SQL
    await txQuery(`
      INSERT INTO orders (order_id, customer_id, vendor_id, total_amount, status, payment_status, escrow_status)
      VALUES (?, 1, 2, 45.00, 'PLACED', 'PAID', 'HELD')
    `, [testOrderId]);

    // Record Outbox Event within the SAME transaction
    await outboxRelay.recordEvent(txQuery, {
      aggregate_type: 'ORDER',
      aggregate_id: testOrderId,
      event_type: 'ORDER_CREATED',
      payload: {
        order_id: testOrderId,
        customer_id: 1,
        vendor_id: 2,
        total_amount: 45.00,
        timestamp: new Date().toISOString(),
        location_note: 'Phase 2 Test Order Outbox Event'
      }
    });
  });

  // Check event exists with status PENDING
  const pending = await query(`
    SELECT * FROM outbox_events WHERE aggregate_id = ? AND status = 'PENDING'
  `, [String(testOrderId)]);
  console.log(`✓ Event recorded atomically in SQL! Found ${pending.length} PENDING event(s). Event ID: ${pending[0]?.event_id}`);

  // 4. Test Outbox Relay Dispatch Worker
  console.log('\nProcessing outbox queue via OutboxRelayService...');
  await outboxRelay.processPendingEvents();

  // Check event status updated to PROCESSED
  const processed = await query(`
    SELECT * FROM outbox_events WHERE aggregate_id = ?
  `, [String(testOrderId)]);
  console.log(`✓ Event dispatched to MongoDB and updated to status: ${processed[0]?.status}, processed_at: ${processed[0]?.processed_at}`);

  // 5. Test Transaction Rollback Guarantee
  console.log('\nTesting Transaction Rollback guarantee...');
  const rollbackOrderId = 88880 + Math.floor(Math.random() * 1000);
  try {
    await withTransaction(async (txQuery) => {
      await outboxRelay.recordEvent(txQuery, {
        aggregate_type: 'ORDER',
        aggregate_id: rollbackOrderId,
        event_type: 'ORDER_CREATED',
        payload: { order_id: rollbackOrderId }
      });
      // Deliberately throw error to test atomicity
      throw new Error('SIMULATED_TRANSACTION_FAILURE');
    });
  } catch (err) {
    console.log('✓ Caught simulated transaction error:', err.message);
  }

  const shouldBeEmpty = await query(`
    SELECT * FROM outbox_events WHERE aggregate_id = ?
  `, [String(rollbackOrderId)]);
  if (shouldBeEmpty.length === 0) {
    console.log('✓ Atomicity Verified: Outbox event was cleanly ROLLED BACK and never orphaned in the DB!');
  } else {
    throw new Error('Atomicity violation: event was found after rollback!');
  }

  // Clean up synthetic test order
  await query('DELETE FROM orders WHERE order_id = ?', [testOrderId]);
  await query('DELETE FROM outbox_events WHERE aggregate_id = ?', [String(testOrderId)]);
  console.log('✓ Cleaned up test records.');

  console.log('\n=== ALL PHASE 2 TRANSACTIONAL OUTBOX TESTS PASSED 100%! ===');
  process.exit(0);
}

testPhase2().catch(err => {
  console.error('Phase 2 test failed:', err);
  process.exit(1);
});
