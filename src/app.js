const express = require('express');
const createRateLimiter = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const apiRoutes = require('./routes/api');

const app = express();

app.use(express.json());

// Not rate limited, so monitoring tools can always check the server
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Read the limits from .env (with safe defaults)
const limiter = createRateLimiter({
  limit: Number(process.env.RATE_LIMIT_MAX) || 5,
  windowSeconds: Number(process.env.RATE_LIMIT_WINDOW_SECONDS) || 60
});

// Everything under /api goes through the rate limiter first
app.use('/api', limiter, apiRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
