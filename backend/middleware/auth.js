import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

// Critical security check: JWT_SECRET must be defined
if (!JWT_SECRET) {
  console.error('❌ FATAL ERROR: JWT_SECRET is not defined in environment variables.');
  console.error('   Please set JWT_SECRET in your .env file.');
  console.error('   Example: JWT_SECRET=your_super_secret_random_string_here');
  process.exit(1);
}

// Generate JWT token
export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
      // full_name removed - fetch user details via /auth/me endpoint
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
  );
};

// Verify JWT token middleware
export const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

// Require admin role (strict - only admin)
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  next();
};

// Require admin or admin2 role (for manager access)
export const requireAdminOrAdmin2 = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'admin2') {
    return res.status(403).json({ error: 'Access denied. Admin or Manager privileges required.' });
  }
  next();
};

// Require teacher, admin, or admin2 role
export const requireTeacherOrAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'admin2' && req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Access denied. Teacher, admin, or manager privileges required.' });
  }
  next();
};

