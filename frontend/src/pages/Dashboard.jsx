import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { studentsAPI, schedulesAPI, paymentsAPI } from '../services/api';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    recentStudents: [],
    todaySchedules: [],
    pendingPayments: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [studentsRes, schedulesRes, paymentsRes] = await Promise.all([
        studentsAPI.getAll(),
        schedulesAPI.getAll(),
        paymentsAPI.getPending()
      ]);

      const students = studentsRes.data;
      const schedules = schedulesRes.data;
      const payments = paymentsRes.data;

      // Get recent students (last 5)
      const recentStudents = students
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

      // Get today's schedules
      const today = new Date().getDay();
      const todaySchedules = schedules.filter(s => s.day_of_week === today).slice(0, 5);

      setStats({
        totalStudents: students.length,
        recentStudents,
        todaySchedules,
        pendingPayments: payments.slice(0, 5)
      });
    } catch (error) {
      console.error('Dashboard data load error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="pulse">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">
            Sanat Merkezi Yönetim Paneline Hoş Geldiniz
          </h1>
          <p className="dashboard-subtitle">
            Merhaba, {user?.full_name} 👋
          </p>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Today's Lessons Card */}
        <div className="dashboard-card card-gradient-1">
          <div className="card-icon">📚</div>
          <div className="card-content">
            <h3 className="card-title">Bugünün Dersleri</h3>
            <p className="card-description">Sonraki dersleriniz</p>
            <div className="card-list">
              {stats.todaySchedules.length > 0 ? (
                stats.todaySchedules.map((schedule, idx) => (
                  <div key={idx} className="list-item">
                    <span className="item-time">{schedule.start_time?.slice(0, 5)}</span>
                    <span className="item-name">{schedule.course_name}</span>
                  </div>
                ))
              ) : (
                <p className="text-secondary text-sm">Bugün ders yok</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Students Card */}
        <div className="dashboard-card card-gradient-2">
          <div className="card-icon">👨‍🎓</div>
          <div className="card-content">
            <h3 className="card-title">Son Kayıtlar</h3>
            <p className="card-description">Yeni eklenen öğrenciler</p>
            <div className="card-list">
              {stats.recentStudents.length > 0 ? (
                stats.recentStudents.map((student) => (
                  <div key={student.id} className="list-item">
                    <span className="item-name">
                      {student.first_name} {student.last_name}
                    </span>
                    <span className="badge badge-success">Yeni</span>
                  </div>
                ))
              ) : (
                <p className="text-secondary text-sm">Henüz öğrenci yok</p>
              )}
            </div>
          </div>
        </div>

        {/* Student Participation Card */}
        <div className="dashboard-card card-gradient-3">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <h3 className="card-title">Öğrenci Katılımı</h3>
            <p className="card-description">Bugünkü yoklama özeti</p>
            <div className="stat-display">
              <div className="stat-number">{stats.totalStudents}</div>
              <div className="stat-label">Toplam Öğrenci</div>
            </div>
          </div>
        </div>

        {/* Pending Payments Card */}
        <div className="dashboard-card card-gradient-4">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <h3 className="card-title">Bekleyen Ödemeler</h3>
            <p className="card-description">Gecikmiş ödemeler</p>
            <div className="card-list">
              {stats.pendingPayments.length > 0 ? (
                stats.pendingPayments.map((payment, idx) => (
                  <div key={idx} className="list-item">
                    <span className="item-name">
                      {payment.student_first_name} {payment.student_last_name}
                    </span>
                    <span className="item-amount">
                      ₺{parseFloat(payment.remaining_amount).toFixed(2)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-secondary text-sm">Bekleyen ödeme yok</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h2 className="section-title">Hızlı İşlemler</h2>
        <div className="actions-grid">
          <a href="/students" className="action-card">
            <span className="action-icon">➕</span>
            <span className="action-label">Yeni Öğrenci Ekle</span>
          </a>
          <a href="/schedule" className="action-card">
            <span className="action-icon">📅</span>
            <span className="action-label">Yeni Ders Planla</span>
          </a>
          <a href="/payments" className="action-card">
            <span className="action-icon">💳</span>
            <span className="action-label">Ödeme Kaydet</span>
          </a>
          <a href="/courses" className="action-card">
            <span className="action-icon">📖</span>
            <span className="action-label">Ders Ekle</span>
          </a>
        </div>
      </div>
    </div>
  );
}
