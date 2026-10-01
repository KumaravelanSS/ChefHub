const winston = require('winston');

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';

// Custom console format for local evaluation & presentations (sleek & readable)
const consoleFormat = winston.format.printf(({ level, message, timestamp, requestId, ...meta }) => {
  const reqStr = requestId ? ` [${requestId}]` : '';
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}]${reqStr}: ${message}${metaStr}`;
});

// Configure Winston Logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    isProduction ? winston.format.json() : winston.format.combine(winston.format.colorize(), consoleFormat)
  ),
  defaultMeta: { service: 'chefhub-api' },
  transports: [
    new winston.transports.Console()
  ]
});

/**
 * Request Tracing Middleware
 * Generates or propagates distributed correlation IDs (X-Request-Id)
 * to trace requests end-to-end across databases and services.
 */
function requestTracing(req, res, next) {
  const incomingId = req.headers['x-request-id'] || req.headers['x-correlation-id'];
  const requestId = incomingId || `req-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;

  req.id = requestId;
  req.correlationId = requestId;
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Correlation-Id', requestId);

  next();
}

/**
 * HTTP Observability Middleware
 * Logs incoming requests and response outcomes with timing and status codes.
 */
function httpLogger(req, res, next) {
  // Ignore static assets or health checks from verbose logging
  if (req.url.startsWith('/assets') || req.url === '/favicon.ico' || req.url === '/health') {
    return next();
  }

  const startHrTime = process.hrtime();

  res.on('finish', () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const durationMs = (elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6).toFixed(2);
    const statusCode = res.statusCode;

    const logMeta = {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode,
      durationMs: Number(durationMs),
      ip: req.ip || req.socket.remoteAddress,
      userId: req.user ? req.user.user_id : undefined,
      userRole: req.user ? req.user.role : undefined
    };

    const message = `${req.method} ${req.originalUrl || req.url} ${statusCode} - ${durationMs}ms`;

    if (statusCode >= 500) {
      logger.error(message, logMeta);
    } else if (statusCode >= 400) {
      logger.warn(message, logMeta);
    } else {
      logger.info(message, logMeta);
    }
  });

  next();
}

module.exports = {
  logger,
  requestTracing,
  httpLogger
};
