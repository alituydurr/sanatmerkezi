import { useState, useEffect } from 'react';
import { schedulesAPI, coursesAPI, teachersAPI, attendanceAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../pages/Students.css';
import './Schedule.css';

export default function Schedule() {
  const { isAdmin, isTeacher } = useAuth();
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [expandedSchedule, setExpandedSchedule] = useState(null);
  
  // Get current week's Monday
  const getMonday = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const [currentWeekStart, setCurrentWeekStart] = useState(getMonday(new Date()));
  
  const [formData, setFormData] = useState({
    course_id: '',
    teacher_id: '',
    day_of_week: '1',
    start_time: '',
    end_time: '',
    room: '',
    is_recurring: true
  });

  const daysOfWeek = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

  // Get week dates (Monday to Sunday)
  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates();

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(getMonday(new Date()));
  };

  useEffect(() => {
    loadData();
  }, [currentWeekStart]);

  const loadData = async () => {
    try {
      const [schedulesRes, coursesRes, teachersRes] = await Promise.all([
        schedulesAPI.getAll(),
        coursesAPI.getAll(),
        teachersAPI.getAll()
      ]);
      console.log('📅 Schedules loaded:', schedulesRes.data);
      console.log('📅 Sample schedule:', schedulesRes.data[0]);
      setSchedules(schedulesRes.data);
      setCourses(coursesRes.data);
      setTeachers(teachersRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await schedulesAPI.create(formData);
      setShowModal(false);
      setFormData({
        course_id: '',
        teacher_id: '',
        day_of_week: '1',
        start_time: '',
        end_time: '',
        room: '',
        is_recurring: true
      });
      loadData();
    } catch (error) {
      console.error('Error creating schedule:', error);
      alert(error.response?.data?.error || 'Program eklenirken hata oluştu');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu programı silmek istediğinizden emin misiniz?')) return;
    
    try {
      await schedulesAPI.delete(id);
      loadData();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Program silinirken hata oluştu');
    }
  };

  const groupByDay = () => {
    const grouped = {};
    daysOfWeek.forEach((_, idx) => {
      grouped[idx] = schedules.filter(s => s.day_of_week === idx);
    });
    return grouped;
  };

  const toggleExpand = (scheduleId) => {
    setExpandedSchedule(expandedSchedule === scheduleId ? null : scheduleId);
  };

  const handleConfirmAttendance = async (scheduleId) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await attendanceAPI.confirm({
        schedule_id: scheduleId,
        attendance_date: today
      });
      alert('Ders başarıyla onaylandı!');
      loadData();
    } catch (error) {
      console.error('Error confirming attendance:', error);
      alert('Ders onaylanırken hata oluştu');
    }
  };

  if (loading) {
    return <div className="loading-container">Yükleniyor...</div>;
  }

  const groupedSchedules = groupByDay();

  // Format week range
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];
  const weekRange = `${weekStart.getDate()} ${weekStart.toLocaleDateString('tr-TR', { month: 'short' })} - ${weekEnd.getDate()} ${weekEnd.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' })}`;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ders Program Takvimi</h1>
          <p className="page-subtitle">Haftalık ders programını görüntüleyin</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <button onClick={() => navigate('/attendance/history')} className="btn btn-secondary">
            📋 Geçmiş Kayıtlar
          </button>
          {isAdmin() && (
            <button onClick={() => setShowModal(true)} className="btn btn-primary">
              ➕ Yeni Program Ekle
            </button>
          )}
        </div>
      </div>

      {/* Week Navigation */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: 'var(--space-4)',
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: 'var(--space-4)'
      }}>
        <button onClick={goToPreviousWeek} className="btn btn-secondary">
          ← Önceki Hafta
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: 'var(--space-1)' }}>
            {weekRange}
          </div>
          <button onClick={goToCurrentWeek} className="btn btn-sm btn-primary">
            Bu Hafta
          </button>
        </div>
        <button onClick={goToNextWeek} className="btn btn-secondary">
          Sonraki Hafta →
        </button>
      </div>

      <div className="schedule-grid">
        {weekDates.map((date, idx) => {
          const dayOfWeek = date.getDay();
          const dateString = date.toISOString().split('T')[0];
          const dayName = daysOfWeek[dayOfWeek];
          
          // KALICI ÇÖZÜM: Sadece specific_date olan dersleri göster
          // Normalize dates for comparison (remove time part)
          const daySchedules = schedules.filter(s => {
            if (!s.specific_date) return false;
            const scheduleDate = s.specific_date.split('T')[0]; // Handle both "2024-12-09" and "2024-12-09T00:00:00"
            return scheduleDate === dateString;
          });
          
          // Debug log
          if (idx === 0) {
            console.log(`📅 Filtering for ${dateString}:`, daySchedules);
            console.log('📅 All schedules:', schedules.map(s => ({ 
              id: s.id, 
              specific_date: s.specific_date, 
              normalized: s.specific_date?.split('T')[0],
              course: s.course_name 
            })));
          }

          const isToday = dateString === new Date().toISOString().split('T')[0];

          return (
            <div key={idx} className="schedule-day-card" style={{
              border: isToday ? '2px solid var(--primary)' : undefined
            }}>
              <h3 className="schedule-day-title">
                {dayName}
                <div style={{ fontSize: '0.875rem', fontWeight: 'normal', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {date.getDate()} {date.toLocaleDateString('tr-TR', { month: 'long' })}
                  {isToday && <span style={{ marginLeft: '8px', color: 'var(--primary)', fontWeight: 'bold' }}>• Bugün</span>}
                </div>
              </h3>
              <div className="schedule-list">
                {daySchedules.length > 0 ? (
                  daySchedules.map((schedule) => (
                  <div key={schedule.id} className="schedule-item-wrapper">
                    <div className="schedule-item-compact">
                      <div className="schedule-compact-left">
                        <div className="schedule-time">
                          {schedule.start_time?.slice(0, 5)} - {schedule.end_time?.slice(0, 5)}
                        </div>
                        <div className="schedule-students">
                          {schedule.students && schedule.students.length > 0 ? (
                            schedule.students.map((student, idx) => (
                              <span key={student.id} className="student-tag">
                                {student.first_name} {student.last_name}
                                {idx < schedule.students.length - 1 && ', '}
                              </span>
                            ))
                          ) : (
                            <span className="text-secondary text-sm">Öğrenci yok</span>
                          )}
                        </div>
                      </div>
                      <div className="schedule-compact-right">
                        <button
                          onClick={() => toggleExpand(schedule.id)}
                          className="expand-btn"
                          title="Detayları göster"
                        >
                          {expandedSchedule === schedule.id ? '▼' : '▶'}
                        </button>
                      </div>
                    </div>
                    
                    {expandedSchedule === schedule.id && (
                      <div className="schedule-item-expanded">
                        <div className="expanded-row">
                          <span className="expanded-label">Ders:</span>
                          <span className="expanded-value">{schedule.course_name}</span>
                        </div>
                        <div className="expanded-row">
                          <span className="expanded-label">Öğretmen:</span>
                          <span className="expanded-value">
                            {schedule.teacher_first_name} {schedule.teacher_last_name}
                          </span>
                        </div>
                        {schedule.room && (
                          <div className="expanded-row">
                            <span className="expanded-label">Oda:</span>
                            <span className="expanded-value">{schedule.room}</span>
                          </div>
                        )}
                        <div className="expanded-row">
                          <span className="expanded-label">Ders Türü:</span>
                          <span className={`badge badge-${schedule.course_type === 'group' ? 'info' : 'success'}`}>
                            {schedule.course_type === 'group' ? 'Grup' : 'Birebir'}
                          </span>
                        </div>
                        {isTeacher() && idx === new Date().getDay() && (
                          <div className="expanded-row" style={{ marginTop: 'var(--space-3)' }}>
                            <button
                              onClick={() => handleConfirmAttendance(schedule.id)}
                              className="btn btn-sm btn-success"
                              style={{ width: '100%' }}
                            >
                              ✓ Dersi Onayla
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-secondary text-sm">Ders yok</p>
              )}
            </div>
          </div>
          );
        })}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Yeni Program Ekle</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Ders *</label>
                <select
                  className="form-select"
                  value={formData.course_id}
                  onChange={(e) => setFormData({...formData, course_id: e.target.value})}
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
                  value={formData.teacher_id}
                  onChange={(e) => setFormData({...formData, teacher_id: e.target.value})}
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
                  <label className="form-label">Gün *</label>
                  <select
                    className="form-select"
                    value={formData.day_of_week}
                    onChange={(e) => setFormData({...formData, day_of_week: e.target.value})}
                    required
                  >
                    {daysOfWeek.map((day, idx) => (
                      <option key={idx} value={idx}>{day}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Oda</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.room}
                    onChange={(e) => setFormData({...formData, room: e.target.value})}
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
                    value={formData.start_time}
                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Bitiş Saati *</label>
                  <input
                    type="time"
                    className="form-input"
                    value={formData.end_time}
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
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
