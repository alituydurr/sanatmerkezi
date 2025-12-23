import express from 'express';
import {
  getAllPaymentPlans,
  getUpcomingPayments,
  createPaymentPlan,
  recordPayment,
  getPaymentsByStudent,
  getPendingPayments,
  cancelPaymentPlan,
  getCancelledPaymentPlans
} from '../controllers/paymentController.js';
import { verifyToken, requireAdminOrAdmin2, requireTeacherOrAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/plans', verifyToken, requireTeacherOrAdmin, getAllPaymentPlans);
router.get('/upcoming', verifyToken, requireAdminOrAdmin2, getUpcomingPayments);
router.get('/cancelled', verifyToken, requireAdminOrAdmin2, getCancelledPaymentPlans);
router.post('/plans', verifyToken, requireAdminOrAdmin2, createPaymentPlan);
router.post('/record', verifyToken, requireAdminOrAdmin2, recordPayment);
router.post('/plans/:id/cancel', verifyToken, requireAdminOrAdmin2, cancelPaymentPlan);
router.get('/student/:studentId', verifyToken, requireTeacherOrAdmin, getPaymentsByStudent);
router.get('/pending', verifyToken, requireTeacherOrAdmin, getPendingPayments);

export default router;

