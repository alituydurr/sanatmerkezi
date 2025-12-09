import express from 'express';
import {
  getAllPaymentPlans,
  getUpcomingPayments,
  createPaymentPlan,
  recordPayment,
  getPaymentsByStudent,
  getPendingPayments
} from '../controllers/paymentController.js';
import { verifyToken, requireAdmin, requireTeacherOrAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/plans', verifyToken, requireTeacherOrAdmin, getAllPaymentPlans);
router.get('/upcoming', verifyToken, requireAdmin, getUpcomingPayments);
router.post('/plans', verifyToken, requireAdmin, createPaymentPlan);
router.post('/record', verifyToken, requireAdmin, recordPayment);
router.get('/student/:studentId', verifyToken, requireTeacherOrAdmin, getPaymentsByStudent);
router.get('/pending', verifyToken, requireTeacherOrAdmin, getPendingPayments);

export default router;
