import { useState, useEffect } from 'react';
import { schedulesAPI, coursesAPI, teachersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../pages/Students.css';
import './Schedule.css';

export default function Schedule() {
  const { isAdmin } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [schedulesRes, coursesRes, teachersRes] = await Promise.all([
        schedulesAPI.getAll(),
        coursesAPI.getAll(),
        teachersAPI.getAll()
      ]);
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

  if (loading) {
    return <div className="loading-container">Yükleniyor...</div>;
  }

  const groupedSchedules = groupByDay();

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ders Program Takvimi</h1>
          <p className="page-subtitle">Haftalık ders programını görüntüleyin</p>
        </div>
        {isAdmin() && (
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            ➕ Yeni Program Ekle
          </button>
        )}
      </div>

      <div className="schedule-grid">
        {daysOfWeek.map((day, idx) => (
          <div key={idx} className="schedule-day-card">
            <h3 className="schedule-day-title">{day}</h3>
            <div className="schedule-list">
              {groupedSchedules[idx]?.length > 0 ? (
                groupedSchedules[idx].map((schedule) => (
                  <div key={schedule.id} className="schedule-item">
                    <div className="schedule-time">
                      {schedule.start_time?.slice(0, 5)} - {schedule.end_time?.slice(0, 5)}
                    </div>
                    <div className="schedule-course">{schedule.course_name}</div>
                    <div className="schedule-teacher">
                      👨‍🏫 {schedule.teacher_first_name} {schedule.teacher_last_name}
                    </div>
                    {schedule.room && (
                      <div className="schedule-room">📍 {schedule.room}</div>
                    )}
                    {isAdmin() && (
                      <button
                        onClick={() => handleDelete(schedule.id)}
                        className="schedule-delete"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-secondary text-sm">Ders yok</p>
              )}
            </div>
          </div>
        ))}
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
