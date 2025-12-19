import { useState, useEffect } from 'react';
import { coursesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrencyWithSymbol } from '../utils/formatters';
import '../pages/Students.css';

export default function Courses() {
  const { isAdmin } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    course_type: 'group',
    capacity: '',
    duration_minutes: '',

  });

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const response = await coursesAPI.getAll();
      setCourses(response.data);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await coursesAPI.create(formData);
      setShowModal(false);
      setFormData({
        name: '',
        description: '',
        course_type: 'group',
        capacity: '',
        duration_minutes: '',

      });
      loadCourses();
    } catch (error) {
      console.error('Error creating course:', error);
      alert('Ders eklenirken hata oluştu');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu dersi silmek istediğinizden emin misiniz?')) return;
    
    try {
      await coursesAPI.delete(id);
      loadCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('Ders silinirken hata oluştu');
    }
  };

  if (loading) {
    return <div className="loading-container">Yükleniyor...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ders Yönetimi</h1>
          <p className="page-subtitle">Tüm dersleri görüntüleyin ve yönetin</p>
        </div>
        {isAdmin() && (
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            ➕ Yeni Ders Ekle
          </button>
        )}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Ders Adı</th>
              <th>Tür</th>
              <th>Kapasite</th>
              <th>Süre (dk)</th>

              <th>Öğrenci Sayısı</th>
              {isAdmin() && <th>İşlemler</th>}
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course.id}>
                <td className="font-bold">{course.name}</td>
                <td>
                  <span className={`badge badge-${course.course_type === 'group' ? 'info' : 'success'}`}>
                    {course.course_type === 'group' ? 'Grup' : 'Birebir'}
                  </span>
                </td>
                <td>{course.capacity || '-'}</td>
                <td>{course.duration_minutes || '-'}</td>

                <td>{course.enrolled_students || 0}</td>
                {isAdmin() && (
                  <td>
                    <button
                      onClick={() => handleDelete(course.id)}
                      className="btn btn-sm btn-secondary"
                      style={{ color: 'var(--error)' }}
                    >
                      Sil
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Yeni Ders Ekle</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Ders Adı *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Açıklama</label>
                <textarea
                  className="form-textarea"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="3"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Ders Türü</label>
                  <select
                    className="form-select"
                    value={formData.course_type}
                    onChange={(e) => setFormData({...formData, course_type: e.target.value})}
                  >
                    <option value="group">Grup</option>
                    <option value="individual">Birebir</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Kapasite</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.capacity}
                    onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Süre (dakika)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({...formData, duration_minutes: e.target.value})}
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
