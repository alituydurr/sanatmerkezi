import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentsAPI, coursesAPI, teachersAPI, schedulesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrencyWithSymbol } from '../utils/formatters';
import './StudentDetail.css';

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    course_id: '',
    teacher_id: '',
    start_date: '',
    end_date: '',
    selected_days: [], // [0, 1, 2, 3, 4, 5, 6] for selected days
    start_time: '',
    end_time: '',
    room: ''
  });

  const daysOfWeek = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [studentRes, coursesRes, teachersRes] = await Promise.all([
        studentsAPI.getById(id),
        coursesAPI.getAll(),
        teachersAPI.getAll()
      ]);
      setStudent(studentRes.data);
      setCourses(coursesRes.data);
      setTeachers(teachersRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    
    if (scheduleForm.selected_days.length === 0) {
      alert('Lütfen en az bir gün seçin!');
      return;
    }

    try {
      // Calculate all dates between start_date and end_date for selected days
      const startDate = new Date(scheduleForm.start_date);
      const endDate = new Date(scheduleForm.end_date);
      const schedulesToCreate = [];

      // Iterate through each day in the range
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dayOfWeek = date.getDay();
        
        // If this day is selected, add it to schedules
        if (scheduleForm.selected_days.includes(dayOfWeek)) {
          schedulesToCreate.push({
            course_id: scheduleForm.course_id,
            teacher_id: scheduleForm.teacher_id,
            specific_date: date.toISOString().split('T')[0],
            day_of_week: dayOfWeek,
            start_time: scheduleForm.start_time,
            end_time: scheduleForm.end_time,
            room: scheduleForm.room,
            is_recurring: false
          });
        }
      }

      // Create all schedules
      await Promise.all(schedulesToCreate.map(schedule => schedulesAPI.create(schedule)));

      // Enroll student in course if not already enrolled
      const isEnrolled = student.courses?.some(c => c.id === parseInt(scheduleForm.course_id));
      if (!isEnrolled) {
        await studentsAPI.enrollInCourse(student.id, scheduleForm.course_id);
      }

      alert(`${schedulesToCreate.length} ders başarıyla eklendi!`);
      setShowScheduleModal(false);
      setScheduleForm({
        course_id: '',
        teacher_id: '',
        start_date: '',
        end_date: '',
        selected_days: [],
        start_time: '',
        end_time: '',
        room: ''
      });
      loadData();
    } catch (error) {
      console.error('Error adding schedule:', error);
      alert(error.response?.data?.error || 'Ders eklenirken hata oluştu');
    }
  };

  const toggleDay = (dayIndex) => {
    setScheduleForm(prev => ({
      ...prev,
      selected_days: prev.selected_days.includes(dayIndex)
        ? prev.selected_days.filter(d => d !== dayIndex)
        : [...prev.selected_days, dayIndex]
    }));
  };

  if (loading) {
    return <div className="loading-container">Yükleniyor...</div>;
  }

  if (!student) {
    return <div className="loading-container">Öğrenci bulunamadı</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <button onClick={() => navigate('/students')} className="btn btn-secondary btn-sm">
            ← Geri
          </button>
          <h1 className="page-title" style={{ marginTop: 'var(--space-4)' }}>
            {student.first_name} {student.last_name}
          </h1>
          <p className="page-subtitle">Öğrenci Detayları</p>
        </div>
        {isAdmin() && (
          <button onClick={() => setShowScheduleModal(true)} className="btn btn-primary">
            ➕ Ders Ekle
          </button>
        )}
      </div>

      <div className="detail-grid">
        {/* Student Info Card */}
        <div className="detail-card">
          <h3 className="detail-card-title">Kişisel Bilgiler</h3>
          <div className="detail-row">
            <span className="detail-label">E-posta:</span>
            <span className="detail-value">{student.email || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Telefon:</span>
            <span className="detail-value">{student.phone || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Veli Adı:</span>
            <span className="detail-value">{student.parent_name || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Veli Telefon:</span>
            <span className="detail-value">{student.parent_phone || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Durum:</span>
            <span className={`badge badge-${student.status === 'active' ? 'success' : 'warning'}`}>
              {student.status === 'active' ? 'Aktif' : 'Pasif'}
            </span>
          </div>
        </div>

        {/* Enrolled Courses Card */}
        <div className="detail-card">
          <h3 className="detail-card-title">Kayıtlı Dersler</h3>
          {student.courses && student.courses.length > 0 ? (
            <div className="courses-list">
              {student.courses.map((course) => (
                <div key={course.id} className="course-item">
                  <div className="course-name">{course.name}</div>
                  <span className={`badge badge-${course.enrollment_status === 'active' ? 'success' : 'warning'}`}>
                    {course.enrollment_status === 'active' ? 'Aktif' : course.enrollment_status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-secondary">Henüz kayıtlı ders yok</p>
          )}
        </div>

        {/* Payment Information Card */}
        <div className="detail-card">
          <h3 className="detail-card-title">Ödeme Bilgileri</h3>
          {student.payment_info ? (
            <>
              <div className="detail-row">
                <span className="detail-label">Toplam Tutar:</span>
                <span className="detail-value">{formatCurrencyWithSymbol(student.payment_info.total_amount || 0)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Ödenen Tutar:</span>
                <span className="detail-value text-success">{formatCurrencyWithSymbol(student.payment_info.paid_amount || 0)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Kalan Tutar:</span>
                <span className="detail-value text-error">{formatCurrencyWithSymbol(student.payment_info.remaining_amount || 0)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Taksit Sayısı:</span>
                <span className="detail-value">{student.payment_info.installments || 0} taksit</span>
              </div>
              {student.payment_info.last_payment_date && (
                <div className="detail-row">
                  <span className="detail-label">Son Ödeme Tarihi:</span>
                  <span className="detail-value">
                    {new Date(student.payment_info.last_payment_date).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              )}
              {student.payment_info.next_payment_date && (
                <div className="detail-row">
                  <span className="detail-label">Planlanan Ödeme:</span>
                  <span className="detail-value">
                    {new Date(student.payment_info.next_payment_date).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              )}
            </>
          ) : (
            <p className="text-secondary">Ödeme planı bulunmamaktadır</p>
          )}
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Öğrenciye Ders Ekle</h2>
            <form onSubmit={handleScheduleSubmit}>
              <div className="form-group">
                <label className="form-label">Ders *</label>
                <select
                  className="form-select"
                  value={scheduleForm.course_id}
                  onChange={(e) => setScheduleForm({...scheduleForm, course_id: e.target.value})}
                  required
                >
                  <option value="">Seçiniz</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Öğretmen *</label>
                <select
                  className="form-select"
                  value={scheduleForm.teacher_id}
                  onChange={(e) => setScheduleForm({...scheduleForm, teacher_id: e.target.value})}
                  required
                >
                  <option value="">Seçiniz</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.first_name} {t.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Başlangıç Tarihi *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={scheduleForm.start_date}
                    onChange={(e) => setScheduleForm({...scheduleForm, start_date: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Bitiş Tarihi *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={scheduleForm.end_date}
                    onChange={(e) => setScheduleForm({...scheduleForm, end_date: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Ders Günleri * (En az bir gün seçin)</label>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                  gap: 'var(--space-2)',
                  marginTop: 'var(--space-2)'
                }}>
                  {daysOfWeek.map((day, idx) => (
                    <label 
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        padding: 'var(--space-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        backgroundColor: scheduleForm.selected_days.includes(idx) ? 'var(--primary-light)' : 'transparent'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={scheduleForm.selected_days.includes(idx)}
                        onChange={() => toggleDay(idx)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>{day}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Oda</label>
                  <input
                    type="text"
                    className="form-input"
                    value={scheduleForm.room}
                    onChange={(e) => setScheduleForm({...scheduleForm, room: e.target.value})}
                    placeholder="Örn: Salon 1"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Başlangıç Saati *</label>
                  <input
                    type="time"
                    className="form-input"
                    value={scheduleForm.start_time}
                    onChange={(e) => setScheduleForm({...scheduleForm, start_time: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Bitiş Saati *</label>
                  <input
                    type="time"
                    className="form-input"
                    value={scheduleForm.end_time}
                    onChange={(e) => setScheduleForm({...scheduleForm, end_time: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowScheduleModal(false)} className="btn btn-secondary">
                  İptal
                </button>
                <button type="submit" className="btn btn-primary">
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
