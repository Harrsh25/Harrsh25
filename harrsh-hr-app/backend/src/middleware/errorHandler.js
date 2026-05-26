const errorHandler = (err, req, res, next) => {
  console.error('Unhandled error:', err);

  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'A record with this value already exists', errors: null });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Record not found', errors: null });
    }
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token', errors: null });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired', errors: null });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({ success: false, message, errors: null });
};

module.exports = errorHandler;
