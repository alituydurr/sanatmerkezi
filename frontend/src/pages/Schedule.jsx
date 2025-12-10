import { useState, useEffect } from 'react';
import { schedulesAPI, coursesAPI, teachersAPI, attendanceAPI, eventsAPI, appointmentsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import '../pages/Students.css';
import './Schedule.css';

export default function Schedule() {
  const { isAdmin, isTeacher } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [schedules, setSchedules] = useState([]);
  const [events, setEvents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDayDetailModal, setShowDayDetailModal] = useState(false);
  const [selectedDayData, setSelectedDayData] = useState(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentData, setAppointmentData] = useState({
    date: '',
    start_time: '',
    end_time: '',
    student_name: '',
    student_surname: '',
    content_type: 'appointment', // 'appointment', 'workshop', 'course', 'event'
    course_id: '',
    event_id: '',
    teacher_id: '',
    price: '',
    is_free: false,
    notes: ''
  });
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

  // Auto-open today's modal when coming from Dashboard (only once)
  useEffect(() => {
    // Only run if we have the flag AND we haven't processed it yet
    if (location.state?.openTodayModal && !loading && schedules.length > 0) {
      // Get today's date
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dayOfWeek = today.getDay();
      const dayName = daysOfWeek[dayOfWeek];
      
      // Use local date string to avoid timezone issues
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      // Filter today's schedules and events
      const daySchedules = schedules.filter(s => {
        if (!s.specific_date) return false;
        const scheduleDate = s.specific_date.split('T')[0];
        return scheduleDate === dateString;
      });
      
      const dayEvents = events.filter(e => {
        if (e.status === 'cancelled') return false;
        const eventStartDate = e.start_date.split('T')[0];
        const eventEndDate = e.end_date.split('T')[0];
        return dateString >= eventStartDate && dateString <= eventEndDate;
      });
      
      // Open the modal
      setSelectedDayData({
        date: today,
        dayName,
        schedules: daySchedules,
        events: dayEvents
      });
      setShowDayDetailModal(true);
      
      // Clear the state to prevent reopening
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [loading, schedules.length, events.length]); // Only depend on data loading, not location.state


  const loadData = async () => {
    try {
      const [schedulesRes, eventsRes, coursesRes, teachersRes] = await Promise.all([
        schedulesAPI.getAll(),
        eventsAPI.getAll(),
        coursesAPI.getAll(),
        teachersAPI.getAll()
      ]);
      console.log('📅 Schedules loaded:', schedulesRes.data);
      console.log('📅 Events loaded:', eventsRes.data);
      setSchedules(schedulesRes.data);
      setEvents(eventsRes.data);
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

  const openDayDetail = (date, dayName, daySchedules, dayEvents) => {
    setSelectedDayData({
      date,
      dayName,
      schedules: daySchedules,
      events: dayEvents
    });
    setShowDayDetailModal(true);
  };

  const openAppointmentModal = (date, startHour) => {
    // Use local date to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    const startTime = `${startHour.toString().padStart(2, '0')}:00`;
    const endTime = `${(startHour + 1).toString().padStart(2, '0')}:00`;
    
    setAppointmentData({
      date: dateString,
      start_time: startTime,
      end_time: endTime,
      student_name: '',
      student_surname: '',
      content_type: 'appointment',
      course_id: '',
      event_id: '',
      teacher_id: '',
      price: '',
      is_free: false,
      notes: ''
    });
    setShowDayDetailModal(false);
    setShowAppointmentModal(true);
  };

  const handleAppointmentSubmit = async (e) => {
    e.preventDefault();
    try {
      await appointmentsAPI.create(appointmentData);
      
      setShowAppointmentModal(false);
      setAppointmentData({
        date: '',
        start_time: '',
        end_time: '',
        student_name: '',
        student_surname: '',
        content_type: 'appointment',
        course_id: '',
        event_id: '',
        teacher_id: '',
        price: '',
        is_free: false,
        notes: ''
      });
      
      // Reload data to show new appointment
      loadData();
      
      alert(appointmentData.is_free 
        ? 'Ücretsiz randevu başarıyla oluşturuldu!' 
        : 'Randevu oluşturuldu ve ödeme planı kaydedildi!');
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert(error.response?.data?.error || 'Randevu oluşturulurken hata oluştu');
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
          // Use local date string to avoid timezone issues
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const dateString = `${year}-${month}-${day}`;
          const dayName = daysOfWeek[dayOfWeek];
          
          // Filter lessons for this day
          const daySchedules = schedules.filter(s => {
            if (!s.specific_date) return false;
            const scheduleDate = s.specific_date.split('T')[0];
            return scheduleDate === dateString;
          });
          
          // Filter events for this day
          const dayEvents = events.filter(e => {
            if (e.status === 'cancelled') return false; // Don't show cancelled events
            const eventStartDate = e.start_date.split('T')[0];
            const eventEndDate = e.end_date.split('T')[0];
            // Show event if current date is between start and end date
            return dateString >= eventStartDate && dateString <= eventEndDate;
          });

          const isToday = dateString === new Date().toISOString().split('T')[0];

          return (
            <div key={idx} className="schedule-day-card" style={{
              border: isToday ? '2px solid var(--primary)' : undefined
            }}>
              <h3 
                className="schedule-day-title" 
                onClick={() => openDayDetail(date, dayName, daySchedules, dayEvents)}
                style={{ cursor: 'pointer' }}
                title="Detaylı görünüm için tıklayın"
              >
                {dayName}
                <div style={{ fontSize: '0.875rem', fontWeight: 'normal', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {date.getDate()} {date.toLocaleDateString('tr-TR', { month: 'long' })}
                  {isToday && <span style={{ marginLeft: '8px', color: 'var(--primary)', fontWeight: 'bold' }}>• Bugün</span>}
                </div>
              </h3>
              <div className="schedule-list">
                {/* Lessons */}
                {daySchedules.length > 0 && daySchedules.map((schedule) => {
                  // Determine schedule type for color coding
                  let scheduleType = 'group'; // default
                  if (schedule.room && schedule.room.startsWith('RANDEVU:')) {
                    scheduleType = 'appointment';
                  } else if (schedule.course_type === 'individual' || schedule.course_type === 'birebir') {
                    scheduleType = 'individual';
                  }
                  
                  return (
                  <div key={schedule.id} className={`schedule-item-wrapper ${scheduleType}`}>
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
                            <span className="text-secondary text-sm">
                              {schedule.room && schedule.room.startsWith('RANDEVU:') 
                                ? schedule.room.replace('RANDEVU: ', '📅 ') 
                                : 'Öğrenci yok'}
                            </span>
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
                          <span className="expanded-value">{schedule.course_name || 'Randevu'}</span>
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
                        {schedule.course_type && (
                          <div className="expanded-row">
                            <span className="expanded-label">Ders Türü:</span>
                            <span className={`badge badge-${schedule.course_type === 'group' ? 'info' : 'success'}`}>
                              {schedule.course_type === 'group' ? 'Grup' : 'Birebir'}
                            </span>
                          </div>
                        )}
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
                  );
                })}
                
                {/* Events */}
                {dayEvents.length > 0 && dayEvents.map((event) => (
                  <div key={`event-${event.id}`} className="schedule-item-wrapper event">
                    <div className="schedule-item-compact">
                      <div className="schedule-compact-left">
                        <div className="schedule-time" style={{ color: '#9333ea' }}>
                          {event.start_time?.slice(0, 5)} - {event.end_time?.slice(0, 5)}
                        </div>
                        <div className="schedule-students">
                          <span style={{ fontWeight: '600', color: '#9333ea' }}>🎨 Etkinlik</span>
                          <span style={{ marginLeft: '8px' }}>{event.name}</span>
                        </div>
                      </div>
                      <div className="schedule-compact-right">
                        <button
                          onClick={() => toggleExpand(`event-${event.id}`)}
                          className="expand-btn"
                          style={{ background: '#9333ea' }}
                          title="Detayları göster"
                        >
                          {expandedSchedule === `event-${event.id}` ? '▼' : '▶'}
                        </button>
                      </div>
                    </div>
                    
                    {expandedSchedule === `event-${event.id}` && (
                      <div className="schedule-item-expanded">
                        {event.description && (
                          <div className="expanded-row">
                            <span className="expanded-label">Açıklama:</span>
                            <span className="expanded-value">{event.description}</span>
                          </div>
                        )}
                        {event.teacher_first_name && (
                          <div className="expanded-row">
                            <span className="expanded-label">Öğretmen:</span>
                            <span className="expanded-value">
                              {event.teacher_first_name} {event.teacher_last_name}
                            </span>
                          </div>
                        )}
                        <div className="expanded-row">
                          <span className="expanded-label">Ücret:</span>
                          <span className="expanded-value">{event.price}₺</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {daySchedules.length === 0 && dayEvents.length === 0 && (
                  <p className="text-secondary text-sm">Ders veya etkinlik yok</p>
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

      {/* Day Detail Modal */}
      {showDayDetailModal && selectedDayData && (
        <div className="modal-overlay" onClick={() => setShowDayDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 className="modal-title">
              {selectedDayData.dayName} - {selectedDayData.date.getDate()} {selectedDayData.date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
            </h2>
            
            {/* Hourly Timeline */}
            <div style={{ marginTop: 'var(--space-4)' }}>
              {Array.from({ length: 14 }, (_, i) => {
                const hour = 8 + i; // 08:00 - 21:00
                const hourString = `${hour.toString().padStart(2, '0')}:00`;
                const nextHourString = `${(hour + 1).toString().padStart(2, '0')}:00`;
                
                // Find lessons and events in this hour
                const hourItems = [
                  ...selectedDayData.schedules.filter(s => {
                    const start = s.start_time?.slice(0, 5);
                    const end = s.end_time?.slice(0, 5);
                    // Show if the event overlaps with this hour slot
                    // Event overlaps if: start < nextHour AND end > currentHour
                    return start < nextHourString && end > hourString;
                  }).map(s => ({ ...s, type: 'lesson' })),
                  ...selectedDayData.events.filter(e => {
                    const start = e.start_time?.slice(0, 5);
                    const end = e.end_time?.slice(0, 5);
                    // Show if the event overlaps with this hour slot
                    // Event overlaps if: start < nextHour AND end > currentHour
                    return start < nextHourString && end > hourString;
                  }).map(e => ({ ...e, type: 'event' }))
                ].sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
                
                return (
                  <div key={hour} style={{ 
                    display: 'flex', 
                    borderBottom: '1px solid var(--border-light)',
                    minHeight: '60px'
                  }}>
                    {/* Hour Label */}
                    <div style={{ 
                      width: '80px', 
                      padding: 'var(--space-3)', 
                      fontWeight: 'bold',
                      color: 'var(--text-secondary)',
                      borderRight: '2px solid var(--border-medium)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-1)',
                      alignItems: 'flex-start'
                    }}>
                      <div>{hourString}</div>
                      {isAdmin() && (
                        <button
                          onClick={() => openAppointmentModal(selectedDayData.date, hour)}
                          style={{
                            width: '24px',
                            height: '24px',
                            border: 'none',
                            background: 'var(--primary-400)',
                            color: 'white',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all var(--transition-fast)',
                            padding: 0
                          }}
                          onMouseEnter={(e) => e.target.style.background = 'var(--primary-500)'}
                          onMouseLeave={(e) => e.target.style.background = 'var(--primary-400)'}
                          title="Randevu ekle"
                        >
                          +
                        </button>
                      )}
                    </div>
                    
                    {/* Hour Content */}
                    <div style={{ 
                      flex: 1, 
                      padding: 'var(--space-3)',
                      display: 'grid',
                      gridTemplateColumns: hourItems.length > 1 ? 'repeat(auto-fit, minmax(200px, 1fr))' : '1fr',
                      gap: 'var(--space-2)',
                      alignContent: 'start'
                    }}>
                      {hourItems.length > 0 ? (
                        hourItems.map((item, idx) => {
                          // Determine item color based on type
                          let bgColor, borderColor, textColor;
                          
                          if (item.type === 'event') {
                            // Events - Purple
                            bgColor = '#f3e8ff';
                            borderColor = '#9333ea';
                            textColor = '#9333ea';
                          } else if (item.room && item.room.startsWith('RANDEVU:')) {
                            // Appointments - Orange
                            bgColor = '#fff7ed';
                            borderColor = '#f97316';
                            textColor = '#f97316';
                          } else if (item.course_type === 'individual' || item.course_type === 'birebir') {
                            // Individual lessons - Green
                            bgColor = '#f0fdf4';
                            borderColor = '#10b981';
                            textColor = '#10b981';
                          } else {
                            // Group lessons - Blue (default)
                            bgColor = '#e0f2fe';
                            borderColor = '#0ea5e9';
                            textColor = '#0ea5e9';
                          }
                          
                          return (
                          <div 
                            key={idx}
                            style={{
                              padding: 'var(--space-2)',
                              borderRadius: 'var(--radius-md)',
                              background: bgColor,
                              borderLeft: `4px solid ${borderColor}`,
                              fontSize: '0.8125rem',
                              minHeight: '80px'
                            }}
                          >
                            <div style={{ fontWeight: 'bold', marginBottom: 'var(--space-1)', color: textColor, fontSize: '0.75rem' }}>
                              {item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)}
                            </div>
                            {item.type === 'lesson' ? (
                              <>
                                <div style={{ fontWeight: '600', fontSize: '0.8125rem' }}>{item.course_name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  {item.teacher_first_name} {item.teacher_last_name}
                                </div>
                                {item.students && item.students.length > 0 && (
                                  <div style={{ marginTop: 'var(--space-1)', fontSize: '0.75rem' }}>
                                    👥 {item.students.map(s => `${s.first_name} ${s.last_name}`).join(', ')}
                                  </div>
                                )}
                                {item.room && (
                                  <div style={{ marginTop: 'var(--space-1)', fontSize: '0.75rem' }}>
                                    📍 {item.room}
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                <div style={{ fontWeight: '600', fontSize: '0.8125rem' }}>🎨 {item.name}</div>
                                {item.description && (
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                                    {item.description}
                                  </div>
                                )}
                                {item.teacher_first_name && (
                                  <div style={{ fontSize: '0.75rem', marginTop: 'var(--space-1)' }}>
                                    👤 {item.teacher_first_name} {item.teacher_last_name}
                                  </div>
                                )}
                                <div style={{ fontSize: '0.75rem', marginTop: 'var(--space-1)' }}>
                                  💰 {item.price}₺
                                </div>
                              </>
                            )}
                          </div>
                          );
                        })
                      ) : (
                        <div style={{ 
                          color: 'var(--text-tertiary)', 
                          fontSize: '0.8125rem', 
                          fontStyle: 'italic',
                          padding: 'var(--space-2)'
                        }}>
                          Boş
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="modal-actions" style={{ marginTop: 'var(--space-4)' }}>
              <button onClick={() => setShowDayDetailModal(false)} className="btn btn-secondary">
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Modal */}
      {showAppointmentModal && (
        <div className="modal-overlay" onClick={() => setShowAppointmentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h2 className="modal-title">Yeni Randevu Oluştur</h2>
            <form onSubmit={handleAppointmentSubmit}>
              {/* Date and Time */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tarih *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={appointmentData.date}
                    onChange={(e) => setAppointmentData({...appointmentData, date: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Başlangıç *</label>
                  <input
                    type="time"
                    className="form-input"
                    value={appointmentData.start_time}
                    onChange={(e) => setAppointmentData({...appointmentData, start_time: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Bitiş *</label>
                  <input
                    type="time"
                    className="form-input"
                    value={appointmentData.end_time}
                    onChange={(e) => setAppointmentData({...appointmentData, end_time: e.target.value})}
                    required
                  />
                </div>
              </div>

              {/* Student Info */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">İsim *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={appointmentData.student_name}
                    onChange={(e) => setAppointmentData({...appointmentData, student_name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Soyisim *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={appointmentData.student_surname}
                    onChange={(e) => setAppointmentData({...appointmentData, student_surname: e.target.value})}
                    required
                  />
                </div>
              </div>

              {/* Content Type */}
              <div className="form-group">
                <label className="form-label">İçerik Türü *</label>
                <select
                  className="form-select"
                  value={appointmentData.content_type}
                  onChange={(e) => setAppointmentData({...appointmentData, content_type: e.target.value, course_id: '', event_id: ''})}
                  required
                >
                  <option value="appointment">Randevu</option>
                  <option value="workshop">Workshop</option>
                  <option value="course">Kayıtlı Ders</option>
                  <option value="event">Etkinlik</option>
                </select>
              </div>

              {/* Course Selection (if course type) */}
              {appointmentData.content_type === 'course' && (
                <div className="form-group">
                  <label className="form-label">Ders *</label>
                  <select
                    className="form-select"
                    value={appointmentData.course_id}
                    onChange={(e) => setAppointmentData({...appointmentData, course_id: e.target.value})}
                    required
                  >
                    <option value="">Seçiniz</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name} - {c.price}₺</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Event Selection (if event type) */}
              {appointmentData.content_type === 'event' && (
                <div className="form-group">
                  <label className="form-label">Etkinlik *</label>
                  <select
                    className="form-select"
                    value={appointmentData.event_id}
                    onChange={(e) => setAppointmentData({...appointmentData, event_id: e.target.value})}
                    required
                  >
                    <option value="">Seçiniz</option>
                    {events.map(e => (
                      <option key={e.id} value={e.id}>{e.name} - {e.price}₺</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Teacher */}
              <div className="form-group">
                <label className="form-label">Öğretmen</label>
                <select
                  className="form-select"
                  value={appointmentData.teacher_id}
                  onChange={(e) => setAppointmentData({...appointmentData, teacher_id: e.target.value})}
                >
                  <option value="">Seçiniz</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                  ))}
                </select>
              </div>

              {/* Price */}
              <div className="form-group">
                <label className="form-label">Ücret (₺) *</label>
                <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    value={appointmentData.is_free ? '0' : appointmentData.price}
                    onChange={(e) => setAppointmentData({...appointmentData, price: e.target.value})}
                    disabled={appointmentData.is_free}
                    required={!appointmentData.is_free}
                    style={{ flex: 1 }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <input
                      type="checkbox"
                      checked={appointmentData.is_free}
                      onChange={(e) => setAppointmentData({...appointmentData, is_free: e.target.checked, price: e.target.checked ? '0' : ''})}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>Ücretsiz</span>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div className="form-group">
                <label className="form-label">Notlar</label>
                <textarea
                  className="form-textarea"
                  value={appointmentData.notes}
                  onChange={(e) => setAppointmentData({...appointmentData, notes: e.target.value})}
                  rows="3"
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowAppointmentModal(false)} className="btn btn-secondary">
                  İptal
                </button>
                <button type="submit" className="btn btn-primary">
                  Randevu Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
