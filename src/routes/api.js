const express = require('express');
const router = express.Router();

// These routes are protected by the rate limiter (applied in app.js)

router.get('/hello', (req, res) => {
  res.json({ success: true, message: 'Hello! Your request was allowed.' });
});

router.get('/data', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, name: 'Item One' },
      { id: 2, name: 'Item Two' },
      { id: 3, name: 'Item Three' }
    ]
  });
});

module.exports = router;
