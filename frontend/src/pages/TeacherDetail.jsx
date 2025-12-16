import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { teachersAPI, attendanceAPI, coursesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrencyWithSymbol } from '../utils/formatters';
import './StudentDetail.css';

export default function TeacherDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [teacher, setTeacher] = useState(null);
  const [teacherSchedules, setTeacherSchedules] = useState([]);
  const [filteredSchedules, setFilteredSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleDetailModal, setShowScheduleDetailModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [attendanceData, setAttendanceData] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7) // YYYY-MM format (current month)
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    specializations: [''] // Array for dynamic rows
  });
  const [courses, setCourses] = useState([]);

  const daysOfWeek = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    // Filter schedules when month changes
    if (teacherSchedules.length > 0) {
      filterSchedulesByMonth();
    }
  }, [selectedMonth, teacherSchedules]);

  const loadData = async () => {
    try {
      const [teacherRes, schedulesRes, attendanceRes, coursesRes] = await Promise.all([
        teachersAPI.getById(id),
        teachersAPI.getSchedules(id),
        teachersAPI.getAttendance(id),
        coursesAPI.getAll()
      ]);
      
      setTeacher(teacherRes.data);
      setTeacherSchedules(schedulesRes.data);
      setCourses(coursesRes.data);
      
      // Map attendance data by schedule_id and date for easy lookup
      const attendanceMap = {};
      attendanceRes.data.forEach(att => {
        // Normalize date format
        const normalizedDate = att.attendance_date.split('T')[0];
        const key = `${att.schedule_id}_${normalizedDate}`;
        attendanceMap[key] = att.status;
      });
      setAttendanceData(attendanceMap);
    } catch (error) {
      console.error('Error loading teacher data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSchedulesByMonth = () => {
    const [year, month] = selectedMonth.split('-');
    const filtered = teacherSchedules.filter(schedule => {
      if (!schedule.specific_date) return false;
      const scheduleDate = schedule.specific_date.split('T')[0];
      const [scheduleYear, scheduleMonth] = scheduleDate.split('-');
      return scheduleYear === year && scheduleMonth === month;
    });
    setFilteredSchedules(filtered);
  };

  const openScheduleDetail = (schedule) => {
    setSelectedSchedule(schedule);
    setShowScheduleDetailModal(true);
  };

  const handleMarkScheduleAttendance = async (status) => {
    try {
      const normalizedDate = selectedSchedule.specific_date.split('T')[0];
      
      await attendanceAPI.mark({
        schedule_id: selectedSchedule.id,
        student_id: selectedSchedule.student_id, // May be null for appointments
        attendance_date: normalizedDate,
        status: status
      });

      // Close modal immediately
      setShowScheduleDetailModal(false);
      
      // ✅ Reload attendance data to sync with student detail page
      const attendanceRes = await teachersAPI.getAttendance(id);
      const attendanceMap = {};
      attendanceRes.data.forEach(att => {
        const normalizedDate = att.attendance_date.split('T')[0];
        const key = `${att.schedule_id}_${normalizedDate}`;
        attendanceMap[key] = att.status;
      });
      setAttendanceData(attendanceMap);
    } catch (error) {
      console.error('Error marking attendance:', error);
      alert('Yoklama işaretlenirken hata oluştu');
    }
  };

  const openEditModal = () => {
    // Parse specialization string into array (comma-separated)
    const specs = teacher.specialization ? teacher.specialization.split(',').map(s => s.trim()).filter(s => s) : [];
    setEditForm({
      first_name: teacher.first_name || '',
      last_name: teacher.last_name || '',
      email: teacher.email || '',
      phone: teacher.phone || '',
      specializations: specs.length > 0 ? [...specs, ''] : [''] // Add empty row for new entry
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      // Filter out empty specializations and join with comma
      const filteredSpecs = editForm.specializations.filter(s => s.trim());
      const specializationString = filteredSpecs.join(', ');
      
      await teachersAPI.update(id, {
        ...editForm,
        specialization: specializationString,
        specializations: undefined // Remove array field
      });
      setShowEditModal(false);
      loadData();
      alert('Öğretmen bilgileri başarıyla güncellendi!');
    } catch (error) {
      console.error('Error updating teacher:', error);
      alert('Bilgiler güncellenirken hata oluştu');
    }
  };

  const handleSpecializationChange = (index, value) => {
    const newSpecs = [...editForm.specializations];
    newSpecs[index] = value;
    
    // If last row is filled, add a new empty row
    if (index === newSpecs.length - 1 && value.trim()) {
      newSpecs.push('');
    }
    
    setEditForm({...editForm, specializations: newSpecs});
  };

  const removeSpecialization = (index) => {
    const newSpecs = editForm.specializations.filter((_, i) => i !== index);
    // Ensure at least one empty row
    if (newSpecs.length === 0 || !newSpecs.some(s => !s.trim())) {
      newSpecs.push('');
    }
    setEditForm({...editForm, specializations: newSpecs});
  };

  // Helper function to get attendance color
  const getAttendanceColor = (scheduleId, date) => {
    // Normalize date format (remove time part if exists)
    const normalizedDate = date.split('T')[0];
    const key = `${scheduleId}_${normalizedDate}`;
    const status = attendanceData[key];
    
    if (!status) return 'transparent'; // Not marked yet
    if (status === 'present') return '#d1fae5'; // Green
    if (status === 'absent') return '#fee2e2'; // Red
    if (status === 'cancelled') return '#e5e7eb'; // Gray
    return 'transparent';
  };

  // Get student display name (from student record or appointment room field)
  const getStudentName = (schedule) => {
    if (schedule.student_first_name && schedule.student_last_name) {
      return `${schedule.student_first_name} ${schedule.student_last_name}`;
    }
    // For appointments, extract name from room field
    if (schedule.room) {
      // Room format: "RANDEVU: Name Surname - notes" or "ETKİNLİK: Name Surname"
      const match = schedule.room.match(/:\s*([^-]+)/);
      if (match) {
        return match[1].trim();
      }
    }
    return 'Bilinmeyen';
  };

  // Group schedules by course
  const groupedSchedules = filteredSchedules.reduce((acc, schedule) => {
    const courseKey = schedule.course_id || 'appointments';
    const courseName = schedule.course_name || 'Randevular ve Etkinlikler';
    
    if (!acc[courseKey]) {
      acc[courseKey] = {
        course_name: courseName,
        course_type: schedule.course_type,
        schedules: []
      };
    }
    acc[courseKey].schedules.push(schedule);
    return acc;
  }, {});

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
        {isAdmin() && (
          <button onClick={openEditModal} className="btn btn-secondary">
            ✏️ Bilgileri Düzenle
          </button>
        )}
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
          {teacher.specialization ? (
            <div className="courses-list">
              <div className="course-item">
                <div className="course-name">{teacher.specialization}</div>
              </div>
            </div>
          ) : (
            <p className="text-secondary">Henüz ders atanmamış</p>
          )}
        </div>

        {/* All Lessons Card */}
        <div className="detail-card" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <h3 className="detail-card-title" style={{ margin: 0 }}>Tüm Dersler ve Randevular</h3>
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Toplam: <strong>{filteredSchedules.length}</strong> ders
              </span>
              <input
                type="month"
                className="form-input"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ width: '180px' }}
              />
            </div>
          </div>
          {Object.keys(groupedSchedules).length > 0 ? (
            <div className="courses-list">
              {Object.entries(groupedSchedules).map(([courseId, courseData]) => (
                <div key={courseId} className="course-item-with-dates">
                  <div className="course-header">
                    <div className="course-name">{courseData.course_name}</div>
                    <span className="badge badge-info">
                      {courseData.schedules.length} ders
                    </span>
                  </div>
                  
                  {/* Lesson Dates Grid */}
                  <div className="lesson-dates-grid">
                    {courseData.schedules.map((schedule) => {
                      const attendanceColor = getAttendanceColor(schedule.id, schedule.specific_date);
                      const studentName = getStudentName(schedule);
                      
                      return (
                        <div
                          key={schedule.id}
                          className="lesson-date-card"
                          style={{
                            backgroundColor: attendanceColor,
                            cursor: 'pointer'
                          }}
                          onClick={() => openScheduleDetail(schedule)}
                          title="Detaylar için tıklayın"
                        >
                          <div className="lesson-date">
                            {schedule.specific_date ? (() => {
                              // ✅ FIX: Use string manipulation to avoid timezone issues
                              const [year, month, day] = schedule.specific_date.split('T')[0].split('-');
                              const monthNames = ['OCA', 'ŞUB', 'MAR', 'NİS', 'MAY', 'HAZ', 'TEM', 'AĞU', 'EYL', 'EKİ', 'KAS', 'ARA'];
                              return `${day} ${monthNames[parseInt(month) - 1]}`;
                            })() : '-'}
                          </div>
                          <div className="lesson-time">
                            {schedule.start_time?.slice(0, 5)}
                          </div>
                          <div className="lesson-teacher" style={{ fontSize: '0.75rem' }}>
                            {studentName.length > 15 ? studentName.substring(0, 15) + '...' : studentName}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-secondary">
              {new Date(selectedMonth + '-01').toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' })} ayında ders kaydı yok
            </p>
          )}
        </div>

        {/* Weekly Schedule Card */}
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

      {/* Schedule Detail Modal */}
      {showScheduleDetailModal && selectedSchedule && (
        <div className="modal-overlay" onClick={() => setShowScheduleDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Ders Detayı</h2>
            
            <div className="schedule-detail-info">
              <div className="detail-row">
                <span className="detail-label">Ders:</span>
                <span className="detail-value">{selectedSchedule.course_name || 'Randevu/Etkinlik'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Öğrenci:</span>
                <span className="detail-value">{getStudentName(selectedSchedule)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Tarih:</span>
                <span className="detail-value">
                  {(() => {
                    // ✅ FIX: Parse date string directly to avoid timezone issues
                    const [year, month, day] = selectedSchedule.specific_date.split('T')[0].split('-');
                    // Create date in UTC to get correct day of week
                    const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
                    const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
                    const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
                    return `${parseInt(day)} ${monthNames[parseInt(month) - 1]} ${year} ${dayNames[date.getUTCDay()]}`;
                  })()}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Saat:</span>
                <span className="detail-value">
                  {selectedSchedule.start_time?.slice(0, 5)} - {selectedSchedule.end_time?.slice(0, 5)}
                </span>
              </div>
            </div>
            
            {/* Attendance Marking Section */}
            <div className="form-group" style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-light)' }}>
              <label className="form-label">Yoklama Durumu</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-2)' }}>
                <button
                  type="button"
                  className={`btn ${attendanceData[`${selectedSchedule.id}_${selectedSchedule.specific_date.split('T')[0]}`] === 'present' ? 'btn-success' : 'btn-secondary'}`}
                  onClick={() => handleMarkScheduleAttendance('present')}
                >
                  ✓ Geldi
                </button>
                <button
                  type="button"
                  className={`btn ${attendanceData[`${selectedSchedule.id}_${selectedSchedule.specific_date.split('T')[0]}`] === 'absent' ? 'btn-error' : 'btn-secondary'}`}
                  onClick={() => handleMarkScheduleAttendance('absent')}
                >
                  ✗ Gelmedi
                </button>
                <button
                  type="button"
                  className={`btn ${attendanceData[`${selectedSchedule.id}_${selectedSchedule.specific_date.split('T')[0]}`] === 'cancelled' ? 'btn-secondary' : 'btn-secondary'}`}
                  onClick={() => handleMarkScheduleAttendance('cancelled')}
                  style={{
                    backgroundColor: attendanceData[`${selectedSchedule.id}_${selectedSchedule.specific_date.split('T')[0]}`] === 'cancelled' ? '#6b7280' : undefined,
                    color: attendanceData[`${selectedSchedule.id}_${selectedSchedule.specific_date.split('T')[0]}`] === 'cancelled' ? 'white' : undefined
                  }}
                >
                  🚫 İptal
                </button>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: 'var(--space-4)' }}>
              <button type="button" onClick={() => setShowScheduleDetailModal(false)} className="btn btn-secondary">
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Teacher Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Öğretmen Bilgilerini Düzenle</h2>
            <form onSubmit={handleEditSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">İsim *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({...editForm, first_name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Soyisim *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({...editForm, last_name: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">E-posta</label>
                <input
                  type="email"
                  className="form-input"
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Telefon</label>
                <input
                  type="tel"
                  className="form-input"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Verdiği Dersler</label>
                {editForm.specializations.map((spec, index) => (
                  <div key={index} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                    <select
                      className="form-select"
                      value={spec}
                      onChange={(e) => handleSpecializationChange(index, e.target.value)}
                      style={{ flex: 1 }}
                    >
                      <option value="">Ders Seçiniz</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    {editForm.specializations.length > 1 && spec.trim() && (
                      <button
                        type="button"
                        onClick={() => removeSpecialization(index)}
                        className="btn btn-secondary"
                        style={{ 
                          padding: '0 var(--space-3)',
                          backgroundColor: 'var(--error)',
                          borderColor: 'var(--error)',
                          color: 'white'
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <small style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                  ℹ️ Ders eklemek için son satırdan seçim yapın, otomatik yeni satır açılır
                </small>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary">
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
