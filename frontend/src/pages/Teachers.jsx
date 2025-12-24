import { useState, useEffect } from 'react';
import { teachersAPI, coursesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatPhoneNumber, unformatPhoneNumber } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import '../pages/Students.css';

export default function Teachers() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    specialization: '',

  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [teachersRes, coursesRes] = await Promise.all([
        teachersAPI.getAll(),
        coursesAPI.getAll()
      ]);
      setTeachers(teachersRes.data);
      setCourses(coursesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await teachersAPI.create(formData);
      toast.success('✅ Öğretmen başarıyla eklendi!');
      setShowModal(false);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        specialization: '',

      });
      loadData();
    } catch (error) {
      console.error('Error creating teacher:', error);
      toast.error(error.response?.data?.error || 'Öğretmen eklenirken hata oluştu');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu öğretmeni silmek istediğinizden emin misiniz?')) return;
    
    try {
      await teachersAPI.delete(id);
      toast.success('🗑️ Öğretmen silindi');
      loadData();
    } catch (error) {
      console.error('Error deleting teacher:', error);
      toast.error(error.response?.data?.error || 'Öğretmen silinirken hata oluştu');
    }
  };

  const filteredTeachers = teachers.filter(teacher => {
    const searchLower = searchTerm.toLowerCase();
    return (
      teacher.first_name?.toLowerCase().includes(searchLower) ||
      teacher.last_name?.toLowerCase().includes(searchLower) ||
      teacher.email?.toLowerCase().includes(searchLower) ||
      teacher.phone?.includes(searchTerm) ||
      teacher.specialization?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Öğretmen Yönetimi</h1>
          <p className="page-subtitle">Tüm öğretmenleri görüntüleyin ve yönetin</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <input
            type="text"
            className="form-input"
            placeholder="🔍 İsim, telefon, e-posta, uzmanlık ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '350px' }}
          />
          {isAdmin() && (
            <button onClick={() => setShowModal(true)} className="btn btn-primary">
              ➕ Yeni Öğretmen Ekle
            </button>
          )}
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Ad Soyad</th>
              <th>E-posta</th>
              <th>Telefon</th>
              <th>Uzmanlık</th>
              <th>Durum</th>
              {isAdmin() && <th>İşlemler</th>}
            </tr>
          </thead>
          <tbody>
            {filteredTeachers.map((teacher) => (
              <tr key={teacher.id}>
                <td className="font-bold">{teacher.first_name} {teacher.last_name}</td>
                <td>{teacher.email || '-'}</td>
                <td>{teacher.phone || '-'}</td>
                <td>{teacher.specialization || '-'}</td>
                <td>
                  <span className={`badge badge-${teacher.status === 'active' ? 'success' : 'warning'}`}>
                    {teacher.status === 'active' ? 'Aktif' : 'Pasif'}
                  </span>
                </td>
                {isAdmin() && (
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <button
                        onClick={() => navigate(`/teachers/${teacher.id}`)}
                        className="btn btn-sm btn-primary"
                      >
                        Detay
                      </button>
                      <button
                        onClick={() => handleDelete(teacher.id)}
                        className="btn btn-sm btn-secondary"
                        style={{ color: 'var(--error)' }}
                      >
                        Sil
                      </button>
                    </div>
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
            <h2 className="modal-title">Yeni Öğretmen Ekle</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Ad *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Soyad *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Uzmanlık</label>
                  <select
                    className="form-select"
                    value={formData.specialization}
                    onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                  >
                    <option value="">Seçiniz</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Telefon</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="(555)-419-2222"
                    value={formatPhoneNumber(formData.phone)}
                    onChange={(e) => setFormData({...formData, phone: unformatPhoneNumber(e.target.value)})}
                    maxLength="14"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">E-posta *</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="ornek@email.com"
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
