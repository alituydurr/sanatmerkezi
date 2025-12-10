import express from 'express';
import {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  enrollStudentInCourse,
  removeStudentFromCourse,
  getStudentSchedules
} from '../controllers/studentController.js';
import { verifyToken, requireAdmin, requireTeacherOrAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', verifyToken, requireTeacherOrAdmin, getAllStudents);
router.get('/:id', verifyToken, requireTeacherOrAdmin, getStudentById);
router.get('/:id/schedules', verifyToken, requireTeacherOrAdmin, getStudentSchedules);
router.post('/', verifyToken, requireAdmin, createStudent);
router.put('/:id', verifyToken, requireAdmin, updateStudent);
router.delete('/:id', verifyToken, requireAdmin, deleteStudent);
router.post('/enroll', verifyToken, requireAdmin, enrollStudentInCourse);
router.delete('/:studentId/courses/:courseId', verifyToken, requireAdmin, removeStudentFromCourse);

export default router;
