import express from 'express';
import {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  enrollStudent,
  recordEventPayment,
  recordDirectEventPayment,
  cancelEvent,
  getCancelledEvents
} from '../controllers/eventController.js';
import { verifyToken, requireAdmin, requireTeacherOrAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', verifyToken, requireTeacherOrAdmin, getAllEvents);
router.get('/cancelled', verifyToken, requireTeacherOrAdmin, getCancelledEvents);
router.get('/:id', verifyToken, requireTeacherOrAdmin, getEventById);
router.post('/', verifyToken, requireAdmin, createEvent);
router.put('/:id', verifyToken, requireAdmin, updateEvent);
router.delete('/:id', verifyToken, requireAdmin, deleteEvent);
router.post('/enroll', verifyToken, requireAdmin, enrollStudent);
router.post('/payment', verifyToken, requireAdmin, recordEventPayment);
router.post('/direct-payment', verifyToken, requireAdmin, recordDirectEventPayment);
router.post('/:id/cancel', verifyToken, requireAdmin, cancelEvent);

export default router;
