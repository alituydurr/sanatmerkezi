import { useState, useEffect } from 'react';
import { attendanceAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../pages/Students.css';

export default function AttendanceHistory() {
  const { isTeacher, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  const daysOfWeek = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    try {
      const response = isTeacher() 
        ? await attendanceAPI.getTeacherAttendance(dateRange.start_date, dateRange.end_date)
        : await attendanceAPI.getAllAttendance(dateRange.start_date, dateRange.end_date);
      
      // Sort: pending/absent first, then present/cancelled
      const sorted = response.data.sort((a, b) => {
        const statusOrder = { 'absent': 0, 'pending': 1, 'present': 2, 'cancelled': 3 };
        return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
      });
      
      setAttendanceRecords(sorted);
    } catch (error) {
      console.error('Error loading attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-container">Yükleniyor...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <button onClick={() => navigate('/schedule')} className="btn btn-secondary btn-sm">
            ← Geri
          </button>
          <h1 className="page-title" style={{ marginTop: 'var(--space-4)' }}>
            Ders Onay Geçmişi
          </h1>
          <p className="page-subtitle">Onaylanan dersler</p>
        </div>
      </div>

      <div style={{ marginBottom: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)' }}>
        <div className="form-group">
          <label className="form-label">Başlangıç Tarihi</label>
          <input
            type="date"
            className="form-input"
            value={dateRange.start_date}
            onChange={(e) => setDateRange({...dateRange, start_date: e.target.value})}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Bitiş Tarihi</label>
          <input
            type="date"
            className="form-input"
            value={dateRange.end_date}
            onChange={(e) => setDateRange({...dateRange, end_date: e.target.value})}
          />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Gün</th>
              <th>Ders</th>
              {isAdmin() && <th>Öğretmen</th>}
              <th>Saat</th>
              <th>İşaretlenme Tarihi</th>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>
            {attendanceRecords.length > 0 ? (
              attendanceRecords.map((record, idx) => (
                <tr key={idx}>
                  <td>{new Date(record.attendance_date).toLocaleDateString('tr-TR')}</td>
                  <td>{daysOfWeek[record.day_of_week]}</td>
                  <td className="font-bold">{record.course_name}</td>
                  {isAdmin() && (
                    <td>{record.teacher_first_name} {record.teacher_last_name}</td>
                  )}
                  <td>{record.start_time?.slice(0, 5)} - {record.end_time?.slice(0, 5)}</td>
                  <td>
                    {record.created_at 
                      ? new Date(record.created_at).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '-'}
                  </td>
                  <td>
                    <span className={`badge badge-${
                      record.status === 'present' ? 'success' : 
                      record.status === 'absent' ? 'error' : 
                      record.status === 'cancelled' ? 'secondary' : 
                      'warning'
                    }`}>
                      {record.status === 'present' ? 'Geldi' : 
                       record.status === 'absent' ? 'Gelmedi' : 
                       record.status === 'cancelled' ? 'İptal' : 
                       'Bekliyor'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={isAdmin() ? "7" : "6"} style={{ textAlign: 'center' }}>
                  Bu tarih aralığında onaylanmış ders bulunamadı
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
