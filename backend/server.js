import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import studentRoutes from './routes/students.js';
import teacherRoutes from './routes/teachers.js';
import courseRoutes from './routes/courses.js';
import scheduleRoutes from './routes/schedules.js';
import paymentRoutes from './routes/payments.js';
import teacherPaymentRoutes from './routes/teacherPayments.js';
import attendanceRoutes from './routes/attendance.js';
import eventRoutes from './routes/events.js';
import financialRoutes from './routes/financial.js';
import appointmentRoutes from './routes/appointments.js';
import noteRoutes from './routes/notes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { httpsRedirect, helmetConfig, getCorsConfig, sanitizeForLogging } from './config/security.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// HTTPS redirect (production only)
app.use(httpsRedirect);

// Security Middleware
app.use(helmet(helmetConfig));

// CORS Middleware with strict configuration
app.use(cors(getCorsConfig()));

// Body parsers with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging with sanitization
app.use((req, res, next) => {
  const sanitizedBody = sanitizeForLogging(req.body);
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`, 
    Object.keys(sanitizedBody).length > 0 ? { body: sanitizedBody } : '');
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Sanat Merkezi API is running' });
});

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/teacher-payments', teacherPaymentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/notes', noteRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   Sanat Merkezi Yönetim Sistemi API       ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API URL: http://localhost:${PORT}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  POST   /api/auth/login');
  console.log('  GET    /api/auth/me');
  console.log('  GET    /api/students');
  console.log('  GET    /api/teachers');
  console.log('  GET    /api/courses');
  console.log('  GET    /api/schedules');
  console.log('  GET    /api/payments/plans');
  console.log('');
});

export default app;
