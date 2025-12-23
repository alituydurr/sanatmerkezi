import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  getStudentDashboard,
  getTeacherDashboard,
  getTeacherLessons,
  getTeacherFinance,
  markAttendance,
} from '../controllers/portalController.js';

const router = express.Router();

// Öğrenci Portal
router.get('/student/dashboard', verifyToken, getStudentDashboard);

// Öğretmen Portal
router.get('/teacher/dashboard', verifyToken, getTeacherDashboard);
router.get('/teacher/lessons', verifyToken, getTeacherLessons);
router.get('/teacher/finance', verifyToken, getTeacherFinance);
router.post('/teacher/attendance', verifyToken, markAttendance);

export default router;
