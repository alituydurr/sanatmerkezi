import { useState, useEffect } from 'react';
import { attendanceAPI } from '../services/api';
import './LessonAttendanceModal.css';

export default function LessonAttendanceModal({ show, lesson, onClose }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show && lesson) {
      setStudents(lesson.students || []);
    }
  }, [show, lesson]);

  const handleMarkAttendance = async (studentId, status) => {
    try {
      setSaving(true);
      const today = new Date().toISOString().split('T')[0];
      
      await attendanceAPI.mark({
        schedule_id: lesson.id,
        student_id: studentId,
        attendance_date: today,
        status: status
      });

      // Update local state
      setStudents(students.map(s => 
        s.id === studentId ? { ...s, attendance_status: status } : s
      ));
    } catch (error) {
      console.error('Error marking attendance:', error);
      alert('Yoklama kaydedilemedi: ' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  if (!show || !lesson) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content lesson-attendance-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{lesson.course_name}</h2>
            <p className="lesson-modal-time">
              🕐 {lesson.start_time?.slice(0, 5)} - {lesson.end_time?.slice(0, 5)}
            </p>
            {lesson.teacher_first_name && (
              <p className="lesson-modal-teacher">
                👤 {lesson.teacher_first_name} {lesson.teacher_last_name}
              </p>
            )}
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {students.length === 0 ? (
            <div className="empty-state">
              <p>Bu derse kayıtlı öğrenci bulunmamaktadır</p>
            </div>
          ) : (
            <div className="students-attendance-list">
              {students.map((student) => (
                <div key={student.id} className="student-attendance-item">
                  <div className="student-info">
                    <span className="student-name">
                      {student.first_name} {student.last_name}
                    </span>
                    {student.attendance_status && (
                      <span className={`status-indicator status-${student.attendance_status}`}>
                        {student.attendance_status === 'present' && '✓ Geldi'}
                        {student.attendance_status === 'absent' && '✗ Gelmedi'}
                        {student.attendance_status === 'cancelled' && '🚫 İptal'}
                      </span>
                    )}
                  </div>
                  <div className="attendance-buttons">
                    <button
                      className={`btn-attendance btn-present ${student.attendance_status === 'present' ? 'active' : ''}`}
                      onClick={() => handleMarkAttendance(student.id, 'present')}
                      disabled={saving}
                    >
                      ✓ Geldi
                    </button>
                    <button
                      className={`btn-attendance btn-absent ${student.attendance_status === 'absent' ? 'active' : ''}`}
                      onClick={() => handleMarkAttendance(student.id, 'absent')}
                      disabled={saving}
                    >
                      ✗ Gelmedi
                    </button>
                    <button
                      className={`btn-attendance btn-cancelled ${student.attendance_status === 'cancelled' ? 'active' : ''}`}
                      onClick={() => handleMarkAttendance(student.id, 'cancelled')}
                      disabled={saving}
                    >
                      🚫 İptal
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="modal-actions">
            <button className="btn btn-primary" onClick={onClose}>
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
