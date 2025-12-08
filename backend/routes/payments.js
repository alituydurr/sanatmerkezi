import express from 'express';
import {
  getAllPaymentPlans,
  getPaymentPlanById,
  createPaymentPlan,
  updatePaymentPlan,
  recordPayment,
  getPaymentsByStudent,
  getPendingPayments
} from '../controllers/paymentController.js';
import { verifyToken, requireAdmin, requireTeacherOrAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/plans', verifyToken, requireTeacherOrAdmin, getAllPaymentPlans);
router.get('/plans/:id', verifyToken, requireTeacherOrAdmin, getPaymentPlanById);
router.post('/plans', verifyToken, requireAdmin, createPaymentPlan);
router.put('/plans/:id', verifyToken, requireAdmin, updatePaymentPlan);
router.post('/record', verifyToken, requireAdmin, recordPayment);
router.get('/student/:studentId', verifyToken, requireTeacherOrAdmin, getPaymentsByStudent);
router.get('/pending', verifyToken, requireTeacherOrAdmin, getPendingPayments);

export default router;
