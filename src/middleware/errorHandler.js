// 404 handler: runs when no route matched
function notFound(req, res) {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} does not exist.`
  });
}

// Global error handler: catches any error passed to next(err)
// (Express recognises it as an error handler because it has 4 parameters)
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err);

  // Bad JSON in request body
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'Invalid JSON body.'
    });
  }

  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: 'Something went wrong on the server.'
  });
}

module.exports = { notFound, errorHandler };
