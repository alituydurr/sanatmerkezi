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
  login: (email, password) => api.post('/auth/login', { email, password }),
  getCurrentUser: () => api.get('/auth/me')
};

// Students API
export const studentsAPI = {
  getAll: () => api.get('/students'),
  getById: (id) => api.get(`/students/${id}`),
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
  getUpcoming: () => api.get('/payments/upcoming')
};

// Teacher Payments API
export const teacherPaymentsAPI = {
  getAll: (monthYear) => api.get('/teacher-payments', { params: { month_year: monthYear } }),
  calculateHours: (teacherId, monthYear) => api.get(`/teacher-payments/calculate/${teacherId}/${monthYear}`),
  create: (data) => api.post('/teacher-payments', data),
  recordPayment: (data) => api.post('/teacher-payments/record', data),
  getRecords: (teacherId) => api.get(`/teacher-payments/records/${teacherId}`)
};

// Attendance API
export const attendanceAPI = {
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
  recordDirectPayment: (data) => api.post('/events/direct-payment', data)
};

// Financial API
export const financialAPI = {
  getSummary: (monthYear) => api.get('/financial/summary', { params: { month_year: monthYear } }),
  getReport: (monthYear) => api.get('/financial/report', { params: { month_year: monthYear } }),
  getTodaysPayments: () => api.get('/financial/todays-payments')
};

export default api;
