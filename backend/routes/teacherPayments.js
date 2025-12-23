import express from 'express';
import { verifyToken, requireAdminOrAdmin2 } from '../middleware/auth.js';
import {
  calculateTeacherHours,
  getAllTeacherPayments,
  createTeacherPayment,
  createGeneralExpense,
  recordTeacherPayment,
  getTeacherPaymentRecords,
  cancelTeacherPayment,
  partialCancelTeacherPayment,
  getCancelledTeacherPayments
} from '../controllers/teacherPaymentController.js';

const router = express.Router();

// All routes require admin or admin2 authentication
router.use(verifyToken);
router.use(requireAdminOrAdmin2);

// Calculate teacher hours for a month
router.get('/calculate/:teacherId/:monthYear', calculateTeacherHours);

// Get all teacher payments (with optional month filter)
router.get('/', getAllTeacherPayments);

// Get cancelled teacher payments
router.get('/cancelled', getCancelledTeacherPayments);

// Create or update teacher payment
router.post('/', createTeacherPayment);

// Create general expense
router.post('/general-expense', createGeneralExpense);

// Record a teacher payment
router.post('/record', recordTeacherPayment);

// Cancel a teacher payment (full cancellation)
router.post('/:id/cancel', cancelTeacherPayment);

// Partial cancel (cancel remaining amount only)
router.post('/:id/partial-cancel', partialCancelTeacherPayment);

// Get payment records for a teacher
router.get('/records/:teacherId', getTeacherPaymentRecords);

export default router;
