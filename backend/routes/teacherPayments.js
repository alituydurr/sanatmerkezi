import express from 'express';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import {
  calculateTeacherHours,
  getAllTeacherPayments,
  createTeacherPayment,
  recordTeacherPayment,
  getTeacherPaymentRecords
} from '../controllers/teacherPaymentController.js';

const router = express.Router();

// All routes require admin authentication
router.use(verifyToken);
router.use(requireAdmin);

// Calculate teacher hours for a month
router.get('/calculate/:teacherId/:monthYear', calculateTeacherHours);

// Get all teacher payments (with optional month filter)
router.get('/', getAllTeacherPayments);

// Create or update teacher payment
router.post('/', createTeacherPayment);

// Record a teacher payment
router.post('/record', recordTeacherPayment);

// Get payment records for a teacher
router.get('/records/:teacherId', getTeacherPaymentRecords);

export default router;
