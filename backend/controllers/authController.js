import bcrypt from 'bcrypt';
import pool from '../config/database.js';
import { generateToken } from '../middleware/auth.js';

// Login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = generateToken(user);

    // Get additional info if teacher
    let teacherInfo = null;
    if (user.role === 'teacher') {
      const teacherResult = await pool.query(
        'SELECT id, first_name, last_name, specialization FROM teachers WHERE user_id = $1',
        [user.id]
      );
      if (teacherResult.rows.length > 0) {
        teacherInfo = teacherResult.rows[0];
      }
    }

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        teacher_info: teacherInfo
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get current user info
export const getCurrentUser = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, email, role, full_name, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};
