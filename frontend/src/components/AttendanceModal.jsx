import { useState, useEffect } from 'react';
import { attendanceAPI } from '../services/api';
import LessonAttendanceModal from './LessonAttendanceModal';
import './AttendanceModal.css';

export default function AttendanceModal({ show, onClose, onAttendanceMarked }) {
  const [todayLessons, setTodayLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [showLessonModal, setShowLessonModal] = useState(false);

  useEffect(() => {
    if (show) {
      loadTodayLessons();
    }
  }, [show]);

  const loadTodayLessons = async () => {
    try {
      setLoading(true);
      const response = await attendanceAPI.getTodayLessons();
      setTodayLessons(response.data);
    } catch (error) {
      console.error('Error loading today lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLessonClick = (lesson) => {
    setSelectedLesson(lesson);
    setShowLessonModal(true);
  };

  const handleLessonModalClose = () => {
    setShowLessonModal(false);
    setSelectedLesson(null);
    loadTodayLessons(); // Reload to get updated attendance
    if (onAttendanceMarked) {
      onAttendanceMarked();
    }
  };

  if (!show) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content attendance-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>📚 Bugünün Dersleri - Yoklama</h2>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>

          <div className="modal-body">
            {loading ? (
              <div className="loading-container">
                <div className="pulse">Yükleniyor...</div>
              </div>
            ) : todayLessons.length === 0 ? (
              <div className="empty-state">
                <p>📅 Bugün ders yok</p>
              </div>
            ) : (
              <div className="lessons-grid">
                {todayLessons.map((lesson) => {
                  const students = lesson.students || [];
                  const attendedCount = students.filter(s => s.attendance_status === 'present').length;
                  const absentCount = students.filter(s => s.attendance_status === 'absent').length;
                  const cancelledCount = students.filter(s => s.attendance_status === 'cancelled').length;
                  const unmarkedCount = students.filter(s => !s.attendance_status).length;

                  return (
                    <div 
                      key={lesson.id} 
                      className="lesson-card"
                      onClick={() => handleLessonClick(lesson)}
                    >
                      <div className="lesson-time">
                        {lesson.start_time?.slice(0, 5)} - {lesson.end_time?.slice(0, 5)}
                      </div>
                      <div className="lesson-info">
                        <h4>{lesson.course_name}</h4>
                        {lesson.teacher_first_name && (
                          <p className="lesson-teacher">
                            👤 {lesson.teacher_first_name} {lesson.teacher_last_name}
                          </p>
                        )}
                        {lesson.room && <p className="lesson-room">📍 {lesson.room}</p>}
                      </div>
                      <div className="lesson-attendance-summary">
                        {students.length > 0 ? (
                          <>
                            {attendedCount > 0 && (
                              <span className="attendance-badge present">
                                ✓ {attendedCount}
                              </span>
                            )}
                            {absentCount > 0 && (
                              <span className="attendance-badge absent">
                                ✗ {absentCount}
                              </span>
                            )}
                            {cancelledCount > 0 && (
                              <span className="attendance-badge cancelled">
                                🚫 {cancelledCount}
                              </span>
                            )}
                            {unmarkedCount > 0 && (
                              <span className="attendance-badge unmarked">
                                ? {unmarkedCount}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="no-students">Öğrenci yok</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {showLessonModal && selectedLesson && (
        <LessonAttendanceModal
          show={showLessonModal}
          lesson={selectedLesson}
          onClose={handleLessonModalClose}
        />
      )}
    </>
  );
}
