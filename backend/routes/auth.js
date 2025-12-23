import express from 'express';
import { body } from 'express-validator';
import { 
  login, 
  getCurrentUser, 
  activateAccount, 
  requestPasswordReset, 
  resetPassword 
} from '../controllers/authController.js';
import { verifyToken } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Login with phone or email
router.post('/login', loginLimiter, login);

// Get current user info
router.get('/me', verifyToken, getCurrentUser);

// Account activation
router.post('/activate/:token', [
  body('password')
    .isLength({ min: 8 })
    .withMessage('Şifre en az 8 karakter olmalıdır'),
], activateAccount);

// Request password reset
router.post('/request-reset', requestPasswordReset);

// Reset password
router.post('/reset/:token', [
  body('password')
    .isLength({ min: 8 })
    .withMessage('Şifre en az 8 karakter olmalıdır'),
], resetPassword);

export default router;

