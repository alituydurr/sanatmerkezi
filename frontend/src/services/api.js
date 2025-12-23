import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  getCurrentUser: () => api.get('/auth/me'),
  activateAccount: (token, password) => api.post(`/auth/activate/${token}`, { password }),
  requestPasswordReset: (data) => api.post('/auth/request-reset', data),
  resetPassword: (token, password) => api.post(`/auth/reset/${token}`, { password })
};

// Portal API
export const portalAPI = {
  // Student Portal
  getStudentDashboard: () => api.get('/portal/student/dashboard'),
  
  // Teacher Portal
  getTeacherDashboard: () => api.get('/portal/teacher/dashboard'),
  getTeacherLessons: (month) => api.get('/portal/teacher/lessons', { params: { month } }),
  getTeacherFinance: () => api.get('/portal/teacher/finance'),
  markAttendance: (data) => api.post('/portal/teacher/attendance', data)
};

// User Management API (Admin only)
export const userManagementAPI = {
  sendStudentActivation: (studentId) => api.post(`/user-management/students/${studentId}/send-activation`),
  sendTeacherActivation: (teacherId) => api.post(`/user-management/teachers/${teacherId}/send-activation`),
  sendPasswordReset: (userId) => api.post(`/user-management/users/${userId}/send-reset`)
};

// Students API
export const studentsAPI = {
  getAll: () => api.get('/students'),
  getStats: () => api.get('/students/stats/summary'),
  getById: (id) => api.get(`/students/${id}`),
  getSchedules: (id) => api.get(`/students/${id}/schedules`),
  create: (data) => api.post('/students', data),
  update: (id, data) => api.put(`/students/${id}`, data),
  delete: (id) => api.delete(`/students/${id}`),
  enrollInCourse: (studentId, courseId) => api.post('/students/enroll', { studentId, courseId }),
  removeFromCourse: (studentId, courseId) => api.delete(`/students/${studentId}/courses/${courseId}`)
};


// Teachers API
export const teachersAPI = {
  getAll: () => api.get('/teachers'),
  getById: (id) => api.get(`/teachers/${id}`),
  getSchedules: (id) => api.get(`/teachers/${id}/schedules`),
  getAttendance: (id) => api.get(`/teachers/${id}/attendance`),
  create: (data) => api.post('/teachers', data),
  update: (id, data) => api.put(`/teachers/${id}`, data),
  delete: (id) => api.delete(`/teachers/${id}`),
  assignToCourse: (teacherId, courseId) => api.post('/teachers/assign', { teacherId, courseId }),
  removeFromCourse: (teacherId, courseId) => api.delete(`/teachers/${teacherId}/courses/${courseId}`)
};

// Courses API
export const coursesAPI = {
  getAll: () => api.get('/courses'),
  getById: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post('/courses', data),
  update: (id, data) => api.put(`/courses/${id}`, data),
  delete: (id) => api.delete(`/courses/${id}`)
};

// Schedules API
export const schedulesAPI = {
  getAll: () => api.get('/schedules'),
  getById: (id) => api.get(`/schedules/${id}`),
  create: (data) => api.post('/schedules', data),
  update: (id, data) => api.put(`/schedules/${id}`, data),
  delete: (id) => api.delete(`/schedules/${id}`)
};

// Payments API
export const paymentsAPI = {
  getAllPlans: () => api.get('/payments/plans'),
  getPlanById: (id) => api.get(`/payments/plans/${id}`),
  createPlan: (data) => api.post('/payments/plans', data),
  updatePlan: (id, data) => api.put(`/payments/plans/${id}`, data),
  recordPayment: (data) => api.post('/payments/record', data),
  getByStudent: (studentId) => api.get(`/payments/student/${studentId}`),
  getPending: () => api.get('/payments/pending'),
  getUpcoming: () => api.get('/payments/upcoming'),
  cancelPlan: (id, cancellation_reason) => api.post(`/payments/plans/${id}/cancel`, { cancellation_reason }),
  getCancelled: () => api.get('/payments/cancelled')
};

// Teacher Payments API
export const teacherPaymentsAPI = {
  getAll: (monthYear) => api.get('/teacher-payments', { params: { month_year: monthYear } }),
  calculateHours: (teacherId, monthYear) => api.get(`/teacher-payments/calculate/${teacherId}/${monthYear}`),
  create: (data) => api.post('/teacher-payments', data),
  createGeneralExpense: (data) => api.post('/teacher-payments/general-expense', data),
  recordPayment: (data) => api.post('/teacher-payments/record', data),
  getRecords: (teacherId) => api.get(`/teacher-payments/records/${teacherId}`),
  cancel: (id, cancellation_reason) => api.post(`/teacher-payments/${id}/cancel`, { cancellation_reason }),
  partialCancel: (id, cancellation_reason) => api.post(`/teacher-payments/${id}/partial-cancel`, { cancellation_reason }),
  getCancelled: () => api.get('/teacher-payments/cancelled')
};

// Attendance API
export const attendanceAPI = {
  mark: (data) => api.post('/attendance/mark', data),
  cancelLesson: (data) => api.post('/attendance/cancel-lesson', data),
  getBySchedule: (scheduleId, date) => api.get(`/attendance/schedule/${scheduleId}/${date}`),
  getByStudent: (studentId, startDate, endDate) => 
    api.get(`/attendance/student/${studentId}`, { 
      params: { startDate, endDate } 
    }),
  getStudentStats: (studentId, startDate, endDate) =>
    api.get(`/attendance/student/${studentId}/stats`, {
      params: { startDate, endDate }
    }),
  getTodayLessons: () => api.get('/attendance/today'),
  // Legacy endpoints (keep for compatibility)
  confirm: (data) => api.post('/attendance/confirm', data),
  getTeacherAttendance: (startDate, endDate) =>
    api.get('/attendance/teacher', {
      params: { start_date: startDate, end_date: endDate }
    }),
  getAllAttendance: (startDate, endDate) =>
    api.get('/attendance/all', {
      params: { start_date: startDate, end_date: endDate }
    })
};


// Events API
export const eventsAPI = {
  getAll: (monthYear) => api.get('/events', { params: { month_year: monthYear } }),
  getById: (id) => api.get(`/events/${id}`),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
  enrollStudent: (data) => api.post('/events/enroll', data),
  recordPayment: (data) => api.post('/events/payment', data),
  recordDirectPayment: (data) => api.post('/events/direct-payment', data),
  cancel: (id, cancellation_reason) => api.post(`/events/${id}/cancel`, { cancellation_reason }),
  getCancelled: () => api.get('/events/cancelled')
};

// Financial API
export const financialAPI = {
  getSummary: (monthYear) => api.get('/financial/summary', { params: { month_year: monthYear } }),
  getReport: (monthYear) => api.get('/financial/report', { params: { month_year: monthYear } }),
  getTodaysPayments: () => api.get('/financial/todays-payments')
};

// Appointments API
export const appointmentsAPI = {
  create: (data) => api.post('/appointments', data),
  getAll: () => api.get('/appointments'),
  delete: (id) => api.delete(`/appointments/${id}`)
};

// Notes API
export const notesAPI = {
  getAll: () => api.get('/notes'),
  getById: (id) => api.get(`/notes/${id}`),
  create: (data) => api.post('/notes', data),
  update: (id, data) => api.put(`/notes/${id}`, data),
  delete: (id) => api.delete(`/notes/${id}`),
  togglePin: (id) => api.patch(`/notes/${id}/pin`)
};

// Tasks API
export const tasksAPI = {
  getAll: () => api.get('/tasks'),
  getToday: () => api.get('/tasks/today'),
  getTomorrowPreparations: () => api.get('/tasks/tomorrow-preparations'),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  toggleComplete: (id) => api.patch(`/tasks/${id}/toggle`),
  delete: (id) => api.delete(`/tasks/${id}`)
};

export default api;

