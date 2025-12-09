import express from 'express';
import { getFinancialSummary, getFinancialReport, getTodaysPayments } from '../controllers/financialController.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/summary', verifyToken, requireAdmin, getFinancialSummary);
router.get('/report', verifyToken, requireAdmin, getFinancialReport);
router.get('/todays-payments', verifyToken, requireAdmin, getTodaysPayments);

export default router;
