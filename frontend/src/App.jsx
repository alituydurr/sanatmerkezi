import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import ActivateAccount from './pages/ActivateAccount';
import ResetPassword from './pages/ResetPassword';
import StudentPortal from './pages/StudentPortal';
import TeacherPortal from './pages/TeacherPortal';
import ManagerPortal from './pages/ManagerPortal';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import StudentDetail from './pages/StudentDetail';
import Teachers from './pages/Teachers';
import TeacherDetail from './pages/TeacherDetail';
import Courses from './pages/Courses';
import Schedule from './pages/Schedule';
import Payments from './pages/Payments';
import UpcomingPayments from './pages/UpcomingPayments';
import CancelledPayments from './pages/CancelledPayments';
import TeacherPayments from './pages/TeacherPayments';
import CancelledTeacherPayments from './pages/CancelledTeacherPayments';
import AttendanceHistory from './pages/AttendanceHistory';
import Events from './pages/Events';
import FinancialReports from './pages/FinancialReports';
import Notes from './pages/Notes';
import Tasks from './pages/Tasks';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/activate/:token" element={<ActivateAccount />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          
          {/* Student Portal (Protected) */}
          <Route path="/student-portal" element={
            <ProtectedRoute>
              <StudentPortal />
            </ProtectedRoute>
          } />
          
          {/* Teacher Portal (Protected) */}
          <Route path="/teacher-portal" element={
            <ProtectedRoute>
              <TeacherPortal />
            </ProtectedRoute>
          } />
          
          {/* Manager Portal (Protected - Admin2) */}
          <Route path="/manager-portal/*" element={
            <ProtectedRoute>
              <ManagerPortal />
            </ProtectedRoute>
          } />
          
          {/* Admin Routes (Protected with Layout) */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="students" element={<Students />} />
            <Route path="students/:id" element={<StudentDetail />} />
            <Route path="teachers" element={<Teachers />} />
            <Route path="teachers/:id" element={<TeacherDetail />} />
            <Route path="courses" element={<Courses />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="attendance/history" element={<AttendanceHistory />} />
            <Route path="events" element={<Events />} />
            <Route path="payments" element={<Payments />} />
            <Route path="payments/upcoming" element={<UpcomingPayments />} />
            <Route path="payments/cancelled" element={<CancelledPayments />} />
            <Route path="teacher-payments" element={<TeacherPayments />} />
            <Route path="teacher-payments/cancelled" element={<CancelledTeacherPayments />} />
            <Route path="financial-reports" element={<FinancialReports />} />
            <Route path="notes" element={<Notes />} />
            <Route path="tasks" element={<Tasks />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

