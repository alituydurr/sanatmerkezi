import express from 'express';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import {
  calculateTeacherHours,
  getAllTeacherPayments,
  createTeacherPayment,
  recordTeacherPayment,
  getTeacherPaymentRecords,
  cancelTeacherPayment,
  getCancelledTeacherPayments
} from '../controllers/teacherPaymentController.js';

const router = express.Router();

// All routes require admin authentication
router.use(verifyToken);
router.use(requireAdmin);

// Calculate teacher hours for a month
router.get('/calculate/:teacherId/:monthYear', calculateTeacherHours);

// Get all teacher payments (with optional month filter)
router.get('/', getAllTeacherPayments);

// Get cancelled teacher payments
router.get('/cancelled', getCancelledTeacherPayments);

// Create or update teacher payment
router.post('/', createTeacherPayment);

// Record a teacher payment
router.post('/record', recordTeacherPayment);

// Cancel a teacher payment
router.post('/:id/cancel', cancelTeacherPayment);

// Get payment records for a teacher
router.get('/records/:teacherId', getTeacherPaymentRecords);

export default router;
