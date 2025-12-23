import express from 'express';
import { getFinancialSummary, getFinancialReport, getTodaysPayments } from '../controllers/financialController.js';
import { verifyToken, requireAdminOrAdmin2 } from '../middleware/auth.js';

const router = express.Router();

router.get('/summary', verifyToken, requireAdminOrAdmin2, getFinancialSummary);
router.get('/report', verifyToken, requireAdminOrAdmin2, getFinancialReport);
router.get('/todays-payments', verifyToken, requireAdminOrAdmin2, getTodaysPayments);

export default router;

