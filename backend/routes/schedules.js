import express from 'express';
import {
  getAllSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule
} from '../controllers/scheduleController.js';
import { verifyToken, requireAdmin, requireTeacherOrAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', verifyToken, requireTeacherOrAdmin, getAllSchedules);
router.get('/:id', verifyToken, requireTeacherOrAdmin, getScheduleById);
router.post('/', verifyToken, requireAdmin, createSchedule);
router.put('/:id', verifyToken, requireAdmin, updateSchedule);
router.delete('/:id', verifyToken, requireAdmin, deleteSchedule);

export default router;
