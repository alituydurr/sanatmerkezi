import express from 'express';
import {
  getAllTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  assignTeacherToCourse,
  removeTeacherFromCourse
} from '../controllers/teacherController.js';
import { verifyToken, requireAdmin, requireTeacherOrAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', verifyToken, requireTeacherOrAdmin, getAllTeachers);
router.get('/:id', verifyToken, requireTeacherOrAdmin, getTeacherById);
router.post('/', verifyToken, requireAdmin, createTeacher);
router.put('/:id', verifyToken, requireAdmin, updateTeacher);
router.delete('/:id', verifyToken, requireAdmin, deleteTeacher);
router.post('/assign', verifyToken, requireAdmin, assignTeacherToCourse);
router.delete('/:teacherId/courses/:courseId', verifyToken, requireAdmin, removeTeacherFromCourse);

export default router;
