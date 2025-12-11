// Global error handler middleware
export const errorHandler = (err, req, res, next) => {
  // Log full error details server-side for debugging
  console.error('Error:', {
    message: err.message,
    code: err.code,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });

  const isDevelopment = process.env.NODE_ENV === 'development';

  // Database errors - hide details in production
  if (err.code === '23505') {
    return res.status(409).json({ 
      error: 'Bu kayıt zaten mevcut. Lütfen farklı bilgiler kullanın.' 
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({ 
      error: 'İlişkili kayıt bulunamadı. Lütfen geçerli bilgiler girin.' 
    });
  }

  // PostgreSQL errors - hide SQL details in production
  if (err.code && err.code.startsWith('22')) { // Data exception
    return res.status(400).json({ 
      error: isDevelopment ? err.message : 'Geçersiz veri formatı.' 
    });
  }

  if (err.code && err.code.startsWith('42')) { // Syntax error or access rule violation
    return res.status(500).json({ 
      error: isDevelopment ? err.message : 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.' 
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Geçersiz token.' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token süresi dolmuş. Lütfen tekrar giriş yapın.' });
  }

  // Default error - hide details in production
  const statusCode = err.status || err.statusCode || 500;
  const message = isDevelopment 
    ? (err.message || 'Internal server error')
    : (statusCode === 500 
        ? 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.' 
        : err.message);

  res.status(statusCode).json({
    error: message,
    ...(isDevelopment && { stack: err.stack, code: err.code })
  });
};

// 404 handler
export const notFoundHandler = (req, res) => {
  res.status(404).json({ error: 'Route not found' });
};
