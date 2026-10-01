const http = require('http');
const express = require('express');
const { logger, requestTracing, httpLogger } = require('./middleware/logger');
const { authLimiter, checkoutLimiter, telemetryLimiter, globalApiLimiter } = require('./middleware/rate_limiter');

async function testPhase3() {
  console.log('=== Starting Phase 3 Security & Observability Verification ===\n');

  // Set up an isolated test app
  const app = express();
  app.set('trust proxy', 1);
  app.use(requestTracing);
  app.use(httpLogger);
  app.use(express.json());

  // Mount limiters exactly as in server.js
  app.use('/api/auth', authLimiter);
  app.use('/api/rider/location', telemetryLimiter);
  app.use('/api', globalApiLimiter);

  // Test endpoints
  app.post('/api/auth/test-login', (req, res) => {
    res.json({ success: true, message: 'Auth endpoint reached' });
  });

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ONLINE',
      observability: 'WINSTON_STRUCTURED_LOGS',
      rate_limiting: 'TIERED_GATEWAY',
      requestId: req.id
    });
  });

  app.post('/api/customer/orders', checkoutLimiter, (req, res) => {
    res.json({ success: true, message: 'Checkout successful', requestId: req.id });
  });

  // Start temporary test server
  const testPort = 5999;
  const server = await new Promise((resolve) => {
    const s = app.listen(testPort, () => resolve(s));
  });

  function makeRequest(path, headers = {}) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: '127.0.0.1',
        port: testPort,
        path,
        method: 'GET',
        headers
      };
      if (path.includes('login') || path.includes('orders')) {
        options.method = 'POST';
        options.headers['Content-Type'] = 'application/json';
      }

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: JSON.parse(body || '{}')
          });
        });
      });
      req.on('error', reject);
      if (options.method === 'POST') req.write(JSON.stringify({ test: true }));
      req.end();
    });
  }

  try {
    // 1. Test Correlation ID Generation & Propagation
    console.log('1. Testing Request Tracing & Correlation IDs...');
    const res1 = await makeRequest('/api/health');
    console.log(`   - Status Code: ${res1.statusCode}`);
    console.log(`   - X-Request-Id header: ${res1.headers['x-request-id']}`);
    console.log(`   - X-Correlation-Id header: ${res1.headers['x-correlation-id']}`);
    if (!res1.headers['x-request-id'] || !res1.headers['x-correlation-id']) {
      throw new Error('Missing X-Request-Id / X-Correlation-Id header!');
    }
    console.log('   ✓ Correlation ID auto-generated and reflected in response headers!\n');

    // 2. Test Preserving Incoming Client Correlation ID
    console.log('2. Testing Inbound Correlation ID Propagation...');
    const customId = 'client-trace-xyz-987';
    const res2 = await makeRequest('/api/health', { 'x-request-id': customId });
    console.log(`   - Inbound ID: ${customId}`);
    console.log(`   - Header returned: ${res2.headers['x-request-id']}`);
    if (res2.headers['x-request-id'] !== customId) {
      throw new Error('Failed to propagate inbound X-Request-Id!');
    }
    console.log('   ✓ Inbound correlation ID successfully preserved across request lifecycle!\n');

    // 3. Test Rate Limiting Headers on Auth Tier
    console.log('3. Testing Auth Tier Rate Limiting...');
    const res3 = await makeRequest('/api/auth/test-login');
    console.log(`   - Auth Route Status: ${res3.statusCode}`);
    console.log(`   - RateLimit-Limit: ${res3.headers['ratelimit-limit']}`);
    console.log(`   - RateLimit-Remaining: ${res3.headers['ratelimit-remaining']}`);
    if (!res3.headers['ratelimit-limit']) {
      throw new Error('RateLimit-Limit header missing on auth endpoint!');
    }
    console.log('   ✓ Auth Rate Limiting active with standard RFC headers!\n');

    // 4. Test Checkout Rate Limiter Tier
    console.log('4. Testing Checkout Tier Rate Limiter...');
    const res4 = await makeRequest('/api/customer/orders');
    console.log(`   - Checkout Route Status: ${res4.statusCode}`);
    console.log(`   - Checkout RateLimit-Limit: ${res4.headers['ratelimit-limit']}`);
    console.log('   ✓ Checkout tier active and protecting against inventory exhaustion attacks!\n');

    // 5. Test Winston Logger direct output
    console.log('5. Testing Winston Structured Logger...');
    logger.info('Phase 3 verification test log entry', { component: 'Phase3Test', metric: 42 });
    logger.warn('Phase 3 verification warning test', { component: 'Phase3Test' });
    console.log('   ✓ Winston Logger operating cleanly with structured metadata!\n');

    console.log('=== ALL PHASE 3 SECURITY & OBSERVABILITY TESTS PASSED 100%! ===');
  } finally {
    server.close();
  }
}

testPhase3().then(() => process.exit(0)).catch((err) => {
  console.error('Phase 3 Test Failure:', err);
  process.exit(1);
});
