const RateLimit = require('../models/RateLimit');

// Atomically adds 1 to the counter for this client + window.
// If no document exists yet, MongoDB creates it (upsert).
// "Atomic" means two simultaneous requests can never read the same old
// number and overwrite each other, so counting stays correct.
async function incrementCounter(key, windowStart, windowEnd) {
  const query = { key, windowStart };
  const update = {
    $inc: { count: 1 },
    $setOnInsert: { expiresAt: windowEnd }
  };
  const options = { upsert: true, new: true };

  try {
    return await RateLimit.findOneAndUpdate(query, update, options);
  } catch (err) {
    // Rare case: two first requests arrive at the exact same moment and both
    // try to create the document. The unique index rejects one (error 11000).
    // Retrying once simply increments the document that now exists.
    if (err.code === 11000) {
      return await RateLimit.findOneAndUpdate(query, update, options);
    }
    throw err;
  }
}

// Factory function: createRateLimiter({ limit: 5, windowSeconds: 60 })
// returns an Express middleware.
function createRateLimiter({ limit, windowSeconds }) {
  const windowMs = windowSeconds * 1000;

  return async function rateLimiter(req, res, next) {
    try {
      const key = req.ip; // identify the client by IP address
      const now = Date.now();

      // Fixed window: split time into equal blocks (e.g. every 60 seconds)
      const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
      const windowEnd = new Date(windowStart.getTime() + windowMs);

      const record = await incrementCounter(key, windowStart, windowEnd);

      const remaining = Math.max(0, limit - record.count);
      const secondsUntilReset = Math.ceil((windowEnd.getTime() - now) / 1000);

      // Standard-style headers so clients can see their usage
      res.set({
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset': String(secondsUntilReset)
      });

      if (record.count > limit) {
        res.set('Retry-After', String(secondsUntilReset));
        return res.status(429).json({
          success: false,
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${secondsUntilReset} seconds.`
        });
      }

      next(); // allowed
    } catch (err) {
      // "Fail open": if the database has a problem, we log it and let the
      // request through instead of blocking every user.
      console.error('Rate limiter error:', err.message);
      next();
    }
  };
}

module.exports = createRateLimiter;
