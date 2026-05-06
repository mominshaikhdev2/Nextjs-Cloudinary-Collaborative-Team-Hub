const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);

  // Prisma unique constraint
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field';
    return res.status(409).json({ error: `${field} already exists` });
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }

  // Prisma DB connection errors — return 503 not 500
  if (
    err.code === 'P1001' ||
    err.code === 'P1002' ||
    err.code === 'P1008' ||
    err.message?.includes("Can't reach database") ||
    err.message?.includes('connection')
  ) {
    return res.status(503).json({
      error: 'Database temporarily unavailable. Please try again.',
      code: 'DB_UNAVAILABLE',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
  }

  // Multer
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large' });
  }

  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

const createError = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

module.exports = { errorHandler, createError };