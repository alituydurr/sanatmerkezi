import express from 'express';
import { verifyToken, requireTeacherOrAdmin } from '../middleware/auth.js';
import {
  confirmAttendance,
  getTeacherAttendance,
  getAllAttendance
} from '../controllers/attendanceController.js';

const router = express.Router();

// Ders onaylama (öğretmen veya admin)
router.post('/confirm', verifyToken, requireTeacherOrAdmin, confirmAttendance);

// Öğretmenin kendi attendance kayıtları
router.get('/teacher', verifyToken, requireTeacherOrAdmin, getTeacherAttendance);

// Tüm attendance kayıtları (admin için)
router.get('/all', verifyToken, requireTeacherOrAdmin, getAllAttendance);

export default router;
