import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { teachersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrencyWithSymbol } from '../utils/formatters';
import './StudentDetail.css';

export default function TeacherDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);

  const daysOfWeek = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const teacherRes = await teachersAPI.getById(id);
      setTeacher(teacherRes.data);
    } catch (error) {
      console.error('Error loading teacher data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-container">Yükleniyor...</div>;
  }

  if (!teacher) {
    return <div className="loading-container">Öğretmen bulunamadı</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <button onClick={() => navigate('/teachers')} className="btn btn-secondary btn-sm">
            ← Geri
          </button>
          <h1 className="page-title" style={{ marginTop: 'var(--space-4)' }}>
            {teacher.first_name} {teacher.last_name}
          </h1>
          <p className="page-subtitle">Öğretmen Detayları</p>
        </div>
      </div>

      <div className="detail-grid">
        {/* Teacher Info Card */}
        <div className="detail-card">
          <h3 className="detail-card-title">Kişisel Bilgiler</h3>
          <div className="detail-row">
            <span className="detail-label">E-posta:</span>
            <span className="detail-value">{teacher.email || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Telefon:</span>
            <span className="detail-value">{teacher.phone || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Uzmanlık:</span>
            <span className="detail-value">{teacher.specialization || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Haftalık Ders Saati:</span>
            <span className="detail-value">{parseFloat(teacher.hours_per_week || 0).toFixed(2)} saat</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Durum:</span>
            <span className={`badge badge-${teacher.status === 'active' ? 'success' : 'warning'}`}>
              {teacher.status === 'active' ? 'Aktif' : 'Pasif'}
            </span>
          </div>
        </div>

        {/* Courses Card */}
        <div className="detail-card">
          <h3 className="detail-card-title">Verdiği Dersler</h3>
          {teacher.courses && teacher.courses.length > 0 ? (
            <div className="courses-list">
              {teacher.courses.map((course) => (
                <div key={course.id} className="course-item">
                  <div className="course-name">{course.name}</div>
                  <span className={`badge badge-${course.course_type === 'group' ? 'info' : 'success'}`}>
                    {course.course_type === 'group' ? 'Grup' : 'Birebir'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-secondary">Henüz ders atanmamış</p>
          )}
        </div>

        {/* Schedule Card */}
        <div className="detail-card">
          <h3 className="detail-card-title">Haftalık Program</h3>
          {teacher.schedules && teacher.schedules.length > 0 ? (
            <div className="courses-list">
              {teacher.schedules.map((schedule) => (
                <div key={schedule.id} className="course-item">
                  <div>
                    <div className="course-name">{schedule.course_name}</div>
                    <div className="text-secondary text-sm">
                      {daysOfWeek[schedule.day_of_week]} • {schedule.start_time?.slice(0, 5)} - {schedule.end_time?.slice(0, 5)}
                      {schedule.room && ` • ${schedule.room}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-secondary">Henüz program oluşturulmamış</p>
          )}
        </div>

        {/* Payment Information Card */}
        <div className="detail-card">
          <h3 className="detail-card-title">Ödeme Bilgileri</h3>
          {teacher.payment_info && teacher.payment_info.total_amount ? (
            <>
              <div className="detail-row">
                <span className="detail-label">Toplam Tutar:</span>
                <span className="detail-value">{formatCurrencyWithSymbol(teacher.payment_info.total_amount || 0)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Ödenen Tutar:</span>
                <span className="detail-value text-success">{formatCurrencyWithSymbol(teacher.payment_info.paid_amount || 0)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Kalan Tutar:</span>
                <span className="detail-value text-error">{formatCurrencyWithSymbol(teacher.payment_info.remaining_amount || 0)}</span>
              </div>
            </>
          ) : (
            <p className="text-secondary">Ödeme bilgisi bulunmamaktadır</p>
          )}
        </div>
      </div>
    </div>
  );
}
