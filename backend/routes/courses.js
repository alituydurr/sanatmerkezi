import express from 'express';
import {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse
} from '../controllers/courseController.js';
import { verifyToken, requireAdmin, requireTeacherOrAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', verifyToken, requireTeacherOrAdmin, getAllCourses);
router.get('/:id', verifyToken, requireTeacherOrAdmin, getCourseById);
router.post('/', verifyToken, requireAdmin, createCourse);
router.put('/:id', verifyToken, requireAdmin, updateCourse);
router.delete('/:id', verifyToken, requireAdmin, deleteCourse);

export default router;
