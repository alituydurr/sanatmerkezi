import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { portalAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrencyWithSymbol } from '../utils/formatters';
import './Portal.css';

export default function StudentPortal() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await portalAPI.getStudentDashboard();
      setData(response.data);
    } catch (error) {
      console.error('Dashboard yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceColor = (status) => {
    if (!status) return 'transparent';
    if (status === 'present') return '#d1fae5';
    if (status === 'absent') return '#fee2e2';
    if (status === 'cancelled') return '#e5e7eb';
    return 'transparent';
  };

  const getAttendanceIcon = (status) => {
    if (!status) return '⏳';
    if (status === 'present') return '✓';
    if (status === 'absent') return '✗';
    if (status === 'cancelled') return '🚫';
    return '⏳';
  };

  const groupSchedulesByCourse = (schedules) => {
    return schedules.reduce((acc, schedule) => {
      if (!acc[schedule.course_name]) {
        acc[schedule.course_name] = [];
      }
      acc[schedule.course_name].push(schedule);
      return acc;
    }, {});
  };

  if (loading) {
    return (
      <div className="portal-container">
        <div className="portal-loading">Yükleniyor...</div>
      </div>
    );
  }

  const groupedSchedules = data?.schedules ? groupSchedulesByCourse(data.schedules) : {};
  const upcomingLessons = data?.schedules?.filter(s => new Date(s.specific_date) >= new Date()).slice(0, 5) || [];
  const pastLessons = data?.schedules?.filter(s => new Date(s.specific_date) < new Date()).slice(0, 10) || [];

  return (
    <div className="portal-container">
      {/* Header */}
      <div className="portal-header">
        <div>
          <h1 className="portal-title">Öğrenci Portalı</h1>
          <p className="portal-subtitle">Hoş geldin, {data?.student?.first_name}!</p>
        </div>
        <button onClick={logout} className="btn btn-secondary">
          Çıkış Yap
        </button>
      </div>

      {/* Stats Cards */}
      <div className="portal-stats">
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-content">
            <div className="stat-label">Toplam Ders</div>
            <div className="stat-value">{data?.schedules?.length || 0}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-label">Katıldığım</div>
            <div className="stat-value">
              {data?.schedules?.filter(s => s.attendance_status === 'present').length || 0}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-label">Ödeme Planı</div>
            <div className="stat-value">{data?.payments?.length || 0}</div>
          </div>
        </div>
      </div>

      {/* Upcoming Lessons */}
      {upcomingLessons.length > 0 && (
        <div className="portal-section">
          <h2 className="section-title">📅 Yaklaşan Dersler</h2>
          <div className="lessons-grid">
            {upcomingLessons.map((lesson) => (
              <div key={lesson.id} className="lesson-card">
                <div className="lesson-header">
                  <span className="lesson-course">{lesson.course_name}</span>
                  <span className="lesson-date">
                    {new Date(lesson.specific_date).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'short'
                    })}
                  </span>
                </div>
                <div className="lesson-details">
                  <div className="lesson-time">
                    🕐 {lesson.start_time?.slice(0, 5)} - {lesson.end_time?.slice(0, 5)}
                  </div>
                  <div className="lesson-teacher">
                    👨‍🏫 {lesson.teacher_first_name} {lesson.teacher_last_name}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Lessons */}
      {pastLessons.length > 0 && (
        <div className="portal-section">
          <h2 className="section-title">📖 Geçmiş Dersler</h2>
          <div className="lessons-list">
            {pastLessons.map((lesson) => (
              <div 
                key={lesson.id} 
                className="lesson-list-item"
                style={{ backgroundColor: getAttendanceColor(lesson.attendance_status) }}
              >
                <div className="lesson-list-left">
                  <div className="lesson-list-date">
                    {new Date(lesson.specific_date).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="lesson-list-course">{lesson.course_name}</div>
                  <div className="lesson-list-time">
                    {lesson.start_time?.slice(0, 5)}
                  </div>
                </div>
                <div className="lesson-list-status">
                  <span className="attendance-icon">
                    {getAttendanceIcon(lesson.attendance_status)}
                  </span>
                  <span className="attendance-text">
                    {!lesson.attendance_status && 'Beklemede'}
                    {lesson.attendance_status === 'present' && 'Katıldı'}
                    {lesson.attendance_status === 'absent' && 'Katılmadı'}
                    {lesson.attendance_status === 'cancelled' && 'İptal'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Information */}
      {data?.payments && data.payments.length > 0 && (
        <div className="portal-section">
          <h2 className="section-title">💳 Ödeme Bilgileri</h2>
          <div className="payment-cards">
            {data.payments.map((payment) => (
              <div key={payment.id} className="payment-card">
                <div className="payment-header">
                  <span className="payment-course">{payment.course_name}</span>
                  <span className={`payment-status ${payment.status}`}>
                    {payment.status === 'active' ? 'Aktif' : 'Tamamlandı'}
                  </span>
                </div>
                <div className="payment-details">
                  <div className="payment-row">
                    <span>Toplam Tutar:</span>
                    <strong>{formatCurrencyWithSymbol(payment.total_amount)}</strong>
                  </div>
                  <div className="payment-row">
                    <span>Ödenen:</span>
                    <strong className="text-success">{formatCurrencyWithSymbol(payment.paid_amount)}</strong>
                  </div>
                  <div className="payment-row">
                    <span>Kalan:</span>
                    <strong className="text-error">{formatCurrencyWithSymbol(payment.remaining_amount)}</strong>
                  </div>
                  <div className="payment-row">
                    <span>Taksit:</span>
                    <span>{payment.installments} taksit</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
