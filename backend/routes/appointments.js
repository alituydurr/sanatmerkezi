import express from 'express';
import {
  createAppointment,
  getAllAppointments,
  deleteAppointment
} from '../controllers/appointmentController.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.post('/', verifyToken, requireAdmin, createAppointment);
router.get('/', verifyToken, getAllAppointments);
router.delete('/:id', verifyToken, requireAdmin, deleteAppointment);

export default router;
