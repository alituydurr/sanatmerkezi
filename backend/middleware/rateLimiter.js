import rateLimit from 'express-rate-limit';

// Rate limiter for login endpoint - prevents brute force attacks
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Increased from 5 to 10 for better UX
  message: {
    error: 'Çok fazla giriş denemesi yaptınız. Lütfen 15 dakika sonra tekrar deneyin.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  skipFailedRequests: false
});

// General API rate limiter - prevents API abuse
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased from 100 to 1000 for admin usage
  message: {
    error: 'Çok fazla istek gönderdiniz. Lütfen daha sonra tekrar deneyin.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for authenticated admin/teacher users
  skip: (req) => {
    // If user is authenticated and is admin or teacher, skip rate limiting
    if (req.user && (req.user.role === 'admin' || req.user.role === 'teacher')) {
      return true;
    }
    return false;
  }
});
