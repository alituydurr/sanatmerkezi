import express from 'express';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import {
  sendStudentActivation,
  sendTeacherActivation,
  sendPasswordReset,
} from '../controllers/userManagementController.js';

const router = express.Router();

// Admin only routes
router.post('/students/:id/send-activation', verifyToken, requireAdmin, sendStudentActivation);
router.post('/teachers/:id/send-activation', verifyToken, requireAdmin, sendTeacherActivation);
router.post('/users/:userId/send-reset', verifyToken, requireAdmin, sendPasswordReset);

export default router;
