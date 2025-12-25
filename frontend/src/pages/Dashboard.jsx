import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { studentsAPI, schedulesAPI, financialAPI, eventsAPI } from '../services/api';
import { formatCurrencyWithSymbol } from '../utils/formatters';
import AttendanceModal from '../components/AttendanceModal';
import './Dashboard.css';


export default function Dashboard() {
  const { user, isTeacher } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents: 0,
    recentStudents: [],
    todaySchedules: [],
    todaysPayments: []
  });
  const [studentStats, setStudentStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    completed: 0
  });
  const [loading, setLoading] = useState(true);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);


  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      if (isTeacher()) {
        // Öğretmen için sadece kendi dersleri
        const [schedulesRes, eventsRes] = await Promise.all([
          schedulesAPI.getAll(),
          eventsAPI.getAll()
        ]);
        const schedules = schedulesRes.data;
        const events = eventsRes.data;
        
        // Use local date to avoid timezone issues
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        const todaySchedules = schedules.filter(s => {
          if (!s.specific_date) return false;
          const scheduleDate = s.specific_date.split('T')[0];
          return scheduleDate === today;
        });
        
        // Filter today's events
        const todayEvents = events.filter(e => {
          if (e.status === 'cancelled') return false;
          const eventStartDate = e.start_date.split('T')[0];
          const eventEndDate = e.end_date.split('T')[0];
          return today >= eventStartDate && today <= eventEndDate;
        }).map(e => ({
          ...e,
          isEvent: true,
          course_name: `🎨 ${e.name}`
        }));

        setStats({
          totalStudents: 0,
          recentStudents: [],
          todaySchedules: [...todaySchedules, ...todayEvents],
          todaysPayments: []
        });
      } else {
        // Admin için tüm veriler
        const [studentsRes, studentStatsRes, schedulesRes, eventsRes, todaysPaymentsRes] = await Promise.all([
          studentsAPI.getAll(),
          studentsAPI.getStats(),
          schedulesAPI.getAll(),
          eventsAPI.getAll(),
          financialAPI.getTodaysPayments()
        ]);

        const students = studentsRes.data;
        const studentStatsData = studentStatsRes.data;
        const schedules = schedulesRes.data;
        const events = eventsRes.data;
        const todaysPayments = todaysPaymentsRes.data;

        // Get recent students (last 5)
        const recentStudents = students
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5);

        // Use local date to avoid timezone issues
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        const todaySchedules = schedules.filter(s => {
          if (!s.specific_date) return false;
          const scheduleDate = s.specific_date.split('T')[0];
          return scheduleDate === today;
        }).slice(0, 5);
        
        // Filter today's events
        const todayEvents = events.filter(e => {
          if (e.status === 'cancelled') return false;
          const eventStartDate = e.start_date.split('T')[0];
          const eventEndDate = e.end_date.split('T')[0];
          return today >= eventStartDate && today <= eventEndDate;
        }).map(e => ({
          ...e,
          isEvent: true,
          course_name: `🎨 ${e.name}`,
          start_time: e.start_time,
          room: null
        }));

        setStats({
          totalStudents: students.length,
          recentStudents,
          todaySchedules: [...todaySchedules, ...todayEvents].slice(0, 10),
          todaysPayments
        });

        setStudentStats(studentStatsData);
      }
    } catch (error) {
      console.error('Dashboard data load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentClick = () => {
    navigate('/payments');
  };

  const handleTodayLessonsClick = () => {
    navigate('/schedule', { state: { openTodayModal: true } });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="pulse">Yükleniyor...</div>
      </div>
    );
  }

  // Öğretmen Dashboard'u
  if (isTeacher()) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">
              Öğretmen Paneline Hoş Geldiniz
            </h1>
            <p className="dashboard-subtitle">
              Merhaba, {user?.full_name} 👋
            </p>
          </div>
        </div>

        <div className="dashboard-grid">
          {/* Today's Lessons Card */}
          <div 
            className="dashboard-card card-gradient-1" 
            style={{ gridColumn: '1 / -1', cursor: 'pointer' }}
            onClick={handleTodayLessonsClick}
          >
            <div className="card-icon">📚</div>
            <div className="card-content">
              <h3 className="card-title">Bugünün Derslerim</h3>
              <p className="card-description">Bugün vereceğiniz dersler (Detaylar için tıklayın)</p>
              <div className="card-list" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                {stats.todaySchedules.length > 0 ? (
                  stats.todaySchedules.map((schedule, idx) => {
                    // Determine schedule type for color coding
                    let bgColor, borderColor;
                    
                    if (schedule.isEvent) {
                      // Events - Purple
                      bgColor = '#faf5ff';
                      borderColor = '#9333ea';
                    } else if (schedule.room && schedule.room.startsWith('RANDEVU:')) {
                      // Appointments - Orange
                      bgColor = '#fff7ed';
                      borderColor = '#f97316';
                    } else if (schedule.course_type === 'individual' || schedule.course_type === 'birebir') {
                      // Individual lessons - Green
                      bgColor = '#f0fdf4';
                      borderColor = '#10b981';
                    } else {
                      // Group lessons - Blue (default)
                      bgColor = '#eff6ff';
                      borderColor = '#3b82f6';
                    }
                    
                    return (
                      <div key={idx} className="list-item" style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                        padding: '12px',
                        backgroundColor: bgColor,
                        borderLeft: `4px solid ${borderColor}`,
                        borderRadius: '8px',
                        marginBottom: '8px'
                      }}>
                        <span className="item-time" style={{ 
                          fontSize: '1rem', 
                          fontWeight: 'bold',
                          minWidth: '60px',
                          color: borderColor
                        }}>
                          {schedule.start_time?.slice(0, 5)}
                        </span>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span className="item-name" style={{ fontWeight: '600' }}>
                            {schedule.isEvent && '🎨 '}
                            {schedule.course_name || schedule.room}
                          </span>
                          {schedule.room && !schedule.isEvent && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {schedule.room}
                            </span>
                          )}
                        </div>
                        {schedule.teacher_first_name && (
                          <span className="badge badge-info">
                            {schedule.teacher_first_name} {schedule.teacher_last_name}
                          </span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-secondary text-sm">Bugün ders yok</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="quick-actions">
          <h2 className="section-title">Hızlı İşlemler</h2>
          <div className="actions-grid">
            <a href="/schedule" className="action-card">
              <span className="action-icon">📅</span>
              <span className="action-label">Ders Programı</span>
            </a>
            <a href="/teachers" className="action-card">
              <span className="action-icon">👤</span>
              <span className="action-label">Profilim</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Admin Dashboard'u
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">
            Sanat Merkezi Yönetim Paneline Hoş Geldiniz
          </h1>
          <p className="dashboard-subtitle">
            Merhaba, ÜnzileArt 👋 Bugün keyifli geçecek gibi!
          </p>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Today's Lessons Card */}
        <div 
          className="dashboard-card card-gradient-1"
          style={{ cursor: 'pointer' }}
          onClick={handleTodayLessonsClick}
        >
          <div className="card-icon">📚</div>
          <div className="card-content">
            <h3 className="card-title">Bugünün Dersleri</h3>
            <p className="card-description">Sonraki dersleriniz (Detaylar için tıklayın)</p>
            <div className="card-list" style={{ maxHeight: '240px', overflowY: 'auto' }}>
              {stats.todaySchedules.length > 0 ? (
                stats.todaySchedules.map((schedule, idx) => {
                  // Determine schedule type for color coding
                  let bgColor, borderColor;
                  
                  if (schedule.isEvent) {
                    // Events - Purple
                    bgColor = '#faf5ff';
                    borderColor = '#9333ea';
                  } else if (schedule.room && schedule.room.startsWith('RANDEVU:')) {
                    // Appointments - Orange
                    bgColor = '#fff7ed';
                    borderColor = '#f97316';
                  } else if (schedule.course_type === 'individual' || schedule.course_type === 'birebir') {
                    // Individual lessons - Green
                    bgColor = '#f0fdf4';
                    borderColor = '#10b981';
                  } else {
                    // Group lessons - Blue (default)
                    bgColor = '#eff6ff';
                    borderColor = '#3b82f6';
                  }
                  
                  return (
                    <div key={idx} className="list-item" style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px',
                      padding: '12px',
                      backgroundColor: bgColor,
                      borderLeft: `4px solid ${borderColor}`,
                      borderRadius: '8px',
                      marginBottom: '8px'
                    }}>
                      <span className="item-time" style={{ 
                        fontSize: '1rem', 
                        fontWeight: 'bold',
                        minWidth: '60px',
                        color: borderColor
                      }}>
                        {schedule.start_time?.slice(0, 5)}
                      </span>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span className="item-name" style={{ fontWeight: '600' }}>
                          {schedule.isEvent && '🎨 '}
                          {schedule.course_name || schedule.room}
                        </span>
                        {schedule.room && !schedule.isEvent && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {schedule.room}
                          </span>
                        )}
                      </div>
                      {schedule.teacher_first_name && (
                        <span className="badge badge-info">
                          {schedule.teacher_first_name} {schedule.teacher_last_name}
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-secondary text-sm">Bugün ders yok</p>
              )}
            </div>
          </div>
        </div>

        {/* Student Statistics Card */}
        <div className="dashboard-card card-gradient-2">
          <div className="card-icon">👨‍🎓</div>
          <div className="card-content">
            <h3 className="card-title">Öğrenci Durumları</h3>
            <p className="card-description">Toplam öğrenci istatistikleri</p>
            <div className="student-stats-grid">
              <div className="stat-box stat-total">
                <div className="stat-number">{studentStats.total}</div>
                <div className="stat-label">Toplam</div>
              </div>
              <div className="stat-box stat-active">
                <div className="stat-number">{studentStats.active}</div>
                <div className="stat-label">Aktif</div>
              </div>
              <div className="stat-box stat-inactive">
                <div className="stat-number">{studentStats.inactive}</div>
                <div className="stat-label">Pasif</div>
              </div>
              <div className="stat-box stat-completed">
                <div className="stat-number">{studentStats.completed}</div>
                <div className="stat-label">Tamamlanan</div>
              </div>
            </div>
          </div>
        </div>

        {/* Student Participation Card */}
        <div 
          className="dashboard-card card-gradient-3 clickable-card"
          onClick={() => setShowAttendanceModal(true)}
          style={{ cursor: 'pointer' }}
        >
          <div className="card-icon">📊</div>
          <div className="card-content">
            <h3 className="card-title">Öğrenci Katılımı</h3>
            <p className="card-description">Bugünkü yoklama (Tıklayın)</p>
            <div className="stat-display">
              <div className="stat-number">{stats.todaySchedules.length}</div>
              <div className="stat-label">Bugünkü Ders</div>
            </div>
          </div>
        </div>

        {/* Today's Payments Card */}
        <div className="dashboard-card card-gradient-4">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <h3 className="card-title">Bugünün Ödemeleri</h3>
            <p className="card-description">Bugün alınan ve alınması gereken ödemeler</p>
            <div className="card-list" style={{ maxHeight: '240px', overflowY: 'auto' }}>
              {stats.todaysPayments.length > 0 ? (
                stats.todaysPayments.map((payment, idx) => (
                  <div 
                    key={idx} 
                    className="list-item"
                    onClick={handlePaymentClick}
                    style={{ 
                      backgroundColor: payment.paid ? '#d1fae5' : '#fee2e2',
                      borderLeft: payment.paid ? '3px solid var(--success)' : '3px solid var(--error)',
                      paddingLeft: 'calc(var(--space-2) - 3px)',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateX(4px)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateX(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span className="item-name" style={{ color: payment.paid ? 'var(--success)' : 'var(--error)' }}>
                        {payment.paid ? '✓ ' : '⚠ '}
                        {payment.type === 'student' ? payment.name : payment.name}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {payment.type === 'student' ? payment.course_name : `Etkinlik: ${payment.event_type}`}
                      </span>
                    </div>
                    <span className="item-amount" style={{ color: payment.paid ? 'var(--success)' : 'var(--error)', fontWeight: 'bold' }}>
                      {formatCurrencyWithSymbol(payment.amount)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-secondary text-sm">Bugün ödeme yok</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h2 className="section-title">Hızlı İşlemler</h2>
        <div className="actions-grid">
          <a href="/notes" className="action-card">
            <span className="action-icon">📝</span>
            <span className="action-label">Notlar</span>
          </a>
          <a href="/schedule" className="action-card">
            <span className="action-icon">📅</span>
            <span className="action-label">Ders Planla</span>
          </a>
          <a href="/payments" className="action-card">
            <span className="action-icon">💳</span>
            <span className="action-label">Ödeme Kaydet</span>
          </a>
          <a href="/students" className="action-card">
            <span className="action-icon">➕</span>
            <span className="action-label">Öğrenci Ekle</span>
          </a>
        </div>
      </div>

      <AttendanceModal
        show={showAttendanceModal}
        onClose={() => setShowAttendanceModal(false)}
        onAttendanceMarked={loadDashboardData}
      />
    </div>
  );
}
