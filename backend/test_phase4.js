const http = require('http');
const express = require('express');
const eventBroker = require('./services/event_broker');
const realtimeRoutes = require('./routes/realtime');

async function testPhase4() {
  console.log('=== Starting Phase 4 Real-Time Logistics & SSE Stream Verification ===\n');

  const app = express();
  app.use(express.json());
  app.use('/api/realtime', realtimeRoutes);

  const testPort = 5998;
  const server = await new Promise((resolve) => {
    const s = app.listen(testPort, () => resolve(s));
  });

  try {
    console.log('1. Connecting SSE Client to /api/realtime/events?channel=global,vendor_2 ...');

    const receivedEvents = [];
    let handshakeReceived = false;

    // Connect SSE client
    const req = http.request({
      hostname: '127.0.0.1',
      port: testPort,
      path: '/api/realtime/events?channel=global,vendor_2',
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream'
      }
    }, (res) => {
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        const text = chunk.toString();
        if (text.includes('event: handshake')) {
          handshakeReceived = true;
        }
        if (text.includes('event: ORDER_CREATED')) {
          receivedEvents.push('ORDER_CREATED');
        }
        if (text.includes('event: DISH_STOCK_UPDATED')) {
          receivedEvents.push('DISH_STOCK_UPDATED');
        }
      });
    });

    req.end();

    // Give 300ms for connection handshake
    await new Promise(r => setTimeout(r, 300));
    console.log(`   - Handshake received: ${handshakeReceived}`);
    if (!handshakeReceived) {
      throw new Error('Failed to receive SSE handshake confirmation!');
    }
    console.log('   ✓ Real-Time SSE Handshake established successfully!\n');

    // 2. Publish KDS order event to vendor_2
    console.log('2. Testing KDS targeted event publishing...');
    const deliveredCount1 = eventBroker.publish('vendor_2', 'ORDER_CREATED', {
      order_id: 9901,
      dish_name: 'Truffle Tagliatelle',
      quantity: 2
    });
    console.log(`   - Published ORDER_CREATED to channel 'vendor_2'. Delivered to: ${deliveredCount1} client(s)`);

    // Give 200ms to arrive
    await new Promise(r => setTimeout(r, 200));
    if (!receivedEvents.includes('ORDER_CREATED')) {
      throw new Error('SSE client did not receive ORDER_CREATED event!');
    }
    console.log('   ✓ KDS Kitchen Display System received instantaneous push update!\n');

    // 3. Publish global stock event
    console.log('3. Testing Global Marketplace Event broadcast...');
    const deliveredCount2 = eventBroker.publish('global', 'DISH_STOCK_UPDATED', {
      dish_id: 1,
      vendor_id: 2,
      is_available: true,
      daily_stock: 18
    });
    console.log(`   - Published DISH_STOCK_UPDATED to channel 'global'. Delivered to: ${deliveredCount2} client(s)`);

    await new Promise(r => setTimeout(r, 200));
    if (!receivedEvents.includes('DISH_STOCK_UPDATED')) {
      throw new Error('SSE client did not receive DISH_STOCK_UPDATED event!');
    }
    console.log('   ✓ Marketplace consumers received real-time stock update!\n');

    // 4. Test Metrics endpoint
    console.log('4. Verifying Real-Time Observability Metrics...');
    const metricsData = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${testPort}/api/realtime/metrics`, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => resolve(JSON.parse(body)));
      }).on('error', reject);
    });

    console.log('   - Active channels:', metricsData.realtime.active_channels);
    console.log('   - Active connections:', metricsData.realtime.active_connections);
    console.log('   - Channel breakdown:', JSON.stringify(metricsData.realtime.channel_breakdown));
    console.log('   - Total messages published:', metricsData.realtime.total_messages_published);

    if (metricsData.realtime.active_connections < 1) {
      throw new Error('Metrics report 0 active connections while client is connected!');
    }
    console.log('   ✓ Metrics endpoint exposes live telemetry!\n');

    // Terminate test client
    req.destroy();
    await new Promise(r => setTimeout(r, 200));

    console.log('=== ALL PHASE 4 REAL-TIME STREAMING TESTS PASSED 100%! ===');
  } finally {
    eventBroker.destroy();
    server.close();
  }
}

testPhase4().then(() => process.exit(0)).catch((err) => {
  console.error('Phase 4 Test Failure:', err);
  process.exit(1);
});
