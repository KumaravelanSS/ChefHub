const rateLimit = require('express-rate-limit');

/**
 * Route-Tiered Rate Limiting Gateway
 * Enforces differentiated rate limiting policies across endpoints:
 * 1. Auth Tier: Strict brute-force protection on /api/auth
 * 2. Checkout Tier: Anti-spamming and inventory hoarding protection on /api/customer/orders
 * 3. Telemetry Tier: High-throughput bucket for live GPS location pings on /api/rider/location
 * 4. Global API Tier: Broad baseline protection for general queries
 */

// 1. Strict Limiter for Authentication Endpoints (Brute-force protection)
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 attempts per minute per IP (generous for presentation/testing, protects against bots)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login or registration attempts. Please wait 1 minute before trying again.',
    error_code: 'RATE_LIMIT_EXCEEDED'
  }
});

// 2. Checkout Limiter for Order Placements (Prevents bot scalping and inventory exhaustion attacks)
const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 orders per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Order creation rate limit exceeded. Please slow down and try again.',
    error_code: 'CHECKOUT_RATE_LIMIT_EXCEEDED'
  }
});

// 3. High-Throughput Telemetry Limiter for Rider GPS Tracking
const telemetryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // 300 pings per minute per IP (5 updates/sec)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Telemetry update rate limit exceeded.',
    error_code: 'TELEMETRY_RATE_LIMIT_EXCEEDED'
  }
});

// 4. Global API Baseline Limiter
const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 400, // 400 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'API request rate limit exceeded. Please slow down.',
    error_code: 'GLOBAL_RATE_LIMIT_EXCEEDED'
  }
});

module.exports = {
  authLimiter,
  checkoutLimiter,
  telemetryLimiter,
  globalApiLimiter
};
