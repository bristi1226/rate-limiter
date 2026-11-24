const mongoose = require('mongoose');

// One document = "how many requests this client made in this time window".
//
// Example document:
// {
//   key: "::1",
//   windowStart: 2026-11-24T10:00:00Z,
//   count: 3,
//   expiresAt: 2026-11-24T10:01:00Z
// }
const rateLimitSchema = new mongoose.Schema({
  key: { type: String, required: true },          // who is making requests (client IP)
  windowStart: { type: Date, required: true },    // when the current time window began
  count: { type: Number, default: 0 },            // requests made in this window
  expiresAt: { type: Date, required: true }       // when MongoDB may delete this document
});

// Only one document may exist per client per window.
// This also makes the lookup fast.
rateLimitSchema.index({ key: 1, windowStart: 1 }, { unique: true });

// TTL index: MongoDB automatically deletes the document once expiresAt has passed,
// so old counters never pile up. (MongoDB checks about once per minute.)
rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RateLimit', rateLimitSchema);
