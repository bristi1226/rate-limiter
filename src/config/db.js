const mongoose = require('mongoose');

// Connects to MongoDB. If it fails, we stop the app because
// the rate limiter cannot work without its database.
async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI is missing. Check your .env file.');
  }

  await mongoose.connect(uri);
  console.log('MongoDB connected');
}

module.exports = connectDB;
