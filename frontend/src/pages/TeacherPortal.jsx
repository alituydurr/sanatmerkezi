import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { portalAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatCurrencyWithSymbol } from '../utils/formatters';
import LoadingSpinner from '../components/LoadingSpinner';
import './Portal.css';

export default function TeacherPortal() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('lessons'); // 'lessons' or 'finance'
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [lessonsData, setLessonsData] = useState(null);
  const [financeData, setFinanceData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7) // YYYY-MM
  );
  const [markingAttendance, setMarkingAttendance] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (activeTab === 'lessons') {
      loadLessons();
    } else if (activeTab === 'finance') {
      loadFinance();
    }
  }, [activeTab, selectedMonth]);

  const loadDashboard = async () => {
    try {
      const response = await portalAPI.getTeacherDashboard();
      setDashboardData(response.data);
    } catch (error) {
      console.error('Dashboard yüklenemedi:', error);
      toast.error('Dashboard yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadLessons = async () => {
    try {
      const response = await portalAPI.getTeacherLessons(selectedMonth);
      setLessonsData(response.data);
    } catch (error) {
      console.error('Dersler yüklenemedi:', error);
      toast.error('Dersler yüklenirken hata oluştu');
    }
  };

  const loadFinance = async () => {
    try {
      const response = await portalAPI.getTeacherFinance();
      setFinanceData(response.data);
    } catch (error) {
      console.error('Finans bilgileri yüklenemedi:', error);
      toast.error('Finans bilgileri yüklenirken hata oluştu');
    }
  };

  const handleMarkAttendance = async (scheduleId, status) => {
    setMarkingAttendance(true);
    try {
      await portalAPI.markAttendance({ schedule_id: scheduleId, status });
      toast.success('✅ Yoklama başarıyla işaretlendi!');
      loadLessons();
      loadDashboard();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Yoklama işaretlenirken hata oluştu');
    } finally {
      setMarkingAttendance(false);
    }
  };

  const canMarkAttendance = (lesson) => {
    const lessonDate = new Date(lesson.specific_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    lessonDate.setHours(0, 0, 0, 0);
    
    // Sadece bugünkü dersler işaretlenebilir
    return lessonDate.getTime() === today.getTime() && !lesson.attendance_id;
  };

  const getAttendanceColor = (status) => {
    if (!status) return 'transparent';
    if (status === 'present') return '#d1fae5';
    if (status === 'absent') return '#fee2e2';
    if (status === 'cancelled') return '#e5e7eb';
    return 'transparent';
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  const todayLessons = dashboardData?.today_lessons || [];
  const allLessons = lessonsData?.lessons || [];

  return (
    <div className="portal-container">
      {/* Header */}
      <div className="portal-header">
        <div>
          <h1 className="portal-title">Öğretmen Portalı</h1>
          <p className="portal-subtitle">
            Hoş geldin, {dashboardData?.teacher?.first_name}!
          </p>
        </div>
        <button onClick={logout} className="btn btn-secondary">
          Çıkış Yap
        </button>
      </div>

      {/* Stats Cards */}
      <div className="portal-stats">
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <div className="stat-label">Bugünkü Dersler</div>
            <div className="stat-value">{todayLessons.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-content">
            <div className="stat-label">Bu Ay Toplam</div>
            <div className="stat-value">{dashboardData?.month_stats?.total_lessons || 0}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-label">İşaretlenen</div>
            <div className="stat-value">
              {todayLessons.filter(l => l.attendance_id).length}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="teacher-tabs">
        <button
          className={`tab-button ${activeTab === 'lessons' ? 'active' : ''}`}
          onClick={() => setActiveTab('lessons')}
        >
          📖 Derslerim
        </button>
        <button
          className={`tab-button ${activeTab === 'finance' ? 'active' : ''}`}
          onClick={() => setActiveTab('finance')}
        >
          💰 Finans
        </button>
      </div>

      {/* Lessons Tab */}
      {activeTab === 'lessons' && (
        <>
          {/* Today's Lessons */}
          {todayLessons.length > 0 && (
            <div className="portal-section">
              <h2 className="section-title">🔔 Bugünkü Dersler</h2>
              <div className="today-lessons">
                {todayLessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className={`today-lesson-card ${lesson.attendance_id ? 'marked' : ''}`}
                    style={{ backgroundColor: getAttendanceColor(lesson.attendance_status) }}
                  >
                    <div className="lesson-info">
                      <div>
                        <div className="lesson-course">{lesson.course_name || 'Randevu/Etkinlik'}</div>
                        <div className="lesson-time">
                          🕐 {lesson.start_time?.slice(0, 5)} - {lesson.end_time?.slice(0, 5)}
                        </div>
                        <div className="lesson-teacher">
                          👤 {lesson.student_first_name} {lesson.student_last_name}
                        </div>
                      </div>
                      {lesson.attendance_status && (
                        <div style={{ fontSize: '2rem' }}>
                          {lesson.attendance_status === 'present' && '✅'}
                          {lesson.attendance_status === 'absent' && '❌'}
                          {lesson.attendance_status === 'cancelled' && '🚫'}
                        </div>
                      )}
                    </div>
                    {canMarkAttendance(lesson) && (
                      <div className="lesson-actions">
                        <button
                          onClick={() => handleMarkAttendance(lesson.id, 'present')}
                          className="btn btn-success btn-sm"
                        >
                          ✓ Geldi
                        </button>
                        <button
                          onClick={() => handleMarkAttendance(lesson.id, 'absent')}
                          className="btn btn-error btn-sm"
                        >
                          ✗ Gelmedi
                        </button>
                        <button
                          onClick={() => handleMarkAttendance(lesson.id, 'cancelled')}
                          className="btn btn-secondary btn-sm"
                        >
                          🚫 İptal
                        </button>
                      </div>
                    )}
                    {lesson.attendance_id && (
                      <div style={{ 
                        marginTop: 'var(--space-2)', 
                        fontSize: '0.875rem', 
                        color: 'var(--text-secondary)',
                        fontStyle: 'italic'
                      }}>
                        ✓ Yoklama işaretlendi (değiştirilemez)
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Lessons */}
          <div className="portal-section">
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: 'var(--space-4)',
              flexWrap: 'wrap',
              gap: 'var(--space-2)'
            }}>
              <h2 className="section-title" style={{ margin: 0 }}>📅 Tüm Dersler</h2>
              <input
                type="month"
                className="form-input"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ width: '180px' }}
              />
            </div>
            <div className="lessons-list">
              {allLessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="lesson-list-item"
                  style={{ backgroundColor: getAttendanceColor(lesson.attendance_status) }}
                >
                  <div className="lesson-list-left">
                    <div className="lesson-list-date">
                      {new Date(lesson.specific_date).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </div>
                    <div className="lesson-list-course">
                      {lesson.course_name || 'Randevu'} - {lesson.student_first_name} {lesson.student_last_name}
                    </div>
                    <div className="lesson-list-time">
                      {lesson.start_time?.slice(0, 5)}
                    </div>
                  </div>
                  <div className="lesson-list-status">
                    {lesson.attendance_status === 'present' && <span>✅ Geldi</span>}
                    {lesson.attendance_status === 'absent' && <span>❌ Gelmedi</span>}
                    {lesson.attendance_status === 'cancelled' && <span>🚫 İptal</span>}
                    {!lesson.attendance_status && <span style={{ color: 'var(--text-secondary)' }}>⏳ Beklemede</span>}
                  </div>
                </div>
              ))}
              {allLessons.length === 0 && (
                <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-secondary)' }}>
                  Bu ay için ders kaydı bulunamadı
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Finance Tab */}
      {activeTab === 'finance' && (
        <>
          {financeData?.current_month && (
            <div className="finance-summary">
              <h3>
                {new Date(financeData.current_month.month_year + '-01').toLocaleDateString('tr-TR', {
                  month: 'long',
                  year: 'numeric'
                })} Özeti
              </h3>
              <div className="finance-grid">
                <div className="finance-item">
                  <div className="finance-label">Toplam Kazanç</div>
                  <div className="finance-value">
                    {formatCurrencyWithSymbol(financeData.current_month.total_amount)}
                  </div>
                </div>
                <div className="finance-item">
                  <div className="finance-label">Ödenen</div>
                  <div className="finance-value">
                    {formatCurrencyWithSymbol(financeData.current_month.paid_amount)}
                  </div>
                </div>
                <div className="finance-item">
                  <div className="finance-label">Kalan</div>
                  <div className="finance-value">
                    {formatCurrencyWithSymbol(financeData.current_month.remaining_amount)}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="portal-section">
            <h2 className="section-title">📊 Ödeme Geçmişi</h2>
            <div className="payment-cards">
              {financeData?.payment_history?.map((payment) => (
                <div key={payment.id} className="payment-card">
                  <div className="payment-header">
                    <span className="payment-course">
                      {new Date(payment.month_year + '-01').toLocaleDateString('tr-TR', {
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                    <span className={`payment-status ${payment.status}`}>
                      {payment.status === 'completed' ? 'Ödendi' : 
                       payment.status === 'partial' ? 'Kısmi' : 
                       payment.status === 'cancelled' ? 'İptal' : 'Beklemede'}
                    </span>
                  </div>
                  <div className="payment-details">
                    <div className="payment-row">
                      <span>Toplam Saat:</span>
                      <strong>{payment.total_hours} saat</strong>
                    </div>
                    <div className="payment-row">
                      <span>Saat Ücreti:</span>
                      <span>{formatCurrencyWithSymbol(payment.hourly_rate)}</span>
                    </div>
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
                  </div>
                </div>
              ))}
              {(!financeData?.payment_history || financeData.payment_history.length === 0) && (
                <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-secondary)' }}>
                  Henüz ödeme kaydı bulunmuyor
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
