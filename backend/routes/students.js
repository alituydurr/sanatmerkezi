import express from 'express';
import {
  getAllStudents,
  getStudentStats,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  enrollStudentInCourse,
  removeStudentFromCourse,
  getStudentSchedules,
  updateAllStudentsStatus
} from '../controllers/studentController.js';
import { verifyToken, requireAdmin, requireTeacherOrAdmin, requireAdminOrAdmin2 } from '../middleware/auth.js';

const router = express.Router();

// Admin2 can view students (for payment purposes)
router.get('/', verifyToken, requireTeacherOrAdmin, getAllStudents);
router.get('/stats/summary', verifyToken, requireTeacherOrAdmin, getStudentStats);
router.get('/:id', verifyToken, requireTeacherOrAdmin, getStudentById);
router.get('/:id/schedules', verifyToken, requireTeacherOrAdmin, getStudentSchedules);
router.post('/', verifyToken, requireAdmin, createStudent);
router.post('/update-all-status', verifyToken, requireAdmin, updateAllStudentsStatus);
router.put('/:id', verifyToken, requireAdmin, updateStudent);
router.delete('/:id', verifyToken, requireAdmin, deleteStudent);
router.post('/enroll', verifyToken, requireAdmin, enrollStudentInCourse);
router.delete('/:studentId/courses/:courseId', verifyToken, requireAdmin, removeStudentFromCourse);

export default router;
