import express from 'express';
import {
  markAttendance,
  cancelLesson,
  getAttendanceBySchedule,
  getAttendanceByStudent,
  getStudentAttendanceStats,
  getTodayLessonsWithAttendance,
  getAllAttendance,
  getTeacherAttendance
} from '../controllers/attendanceController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Mark attendance for a student
router.post('/mark', markAttendance);

// Cancel entire lesson
router.post('/cancel-lesson', cancelLesson);

// Get attendance for a specific schedule and date
router.get('/schedule/:scheduleId/:date', getAttendanceBySchedule);

// Get attendance for a specific student
router.get('/student/:studentId', getAttendanceByStudent);

// Get attendance statistics for a student
router.get('/student/:studentId/stats', getStudentAttendanceStats);

// Get today's lessons with attendance status
router.get('/today', getTodayLessonsWithAttendance);

// Get all attendance records (Admin only)
router.get('/all', getAllAttendance);

// Get teacher's attendance records (Teacher only)
router.get('/teacher', getTeacherAttendance);

export default router;
