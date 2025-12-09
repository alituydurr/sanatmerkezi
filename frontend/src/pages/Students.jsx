import { useState, useEffect } from 'react';
import { studentsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Students.css';

export default function Students() {
  const { isAdmin } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    parent_name: '',
    parent_phone: ''
  });

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const response = await studentsAPI.getAll();
      setStudents(response.data);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await studentsAPI.create(formData);
      setShowModal(false);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        parent_name: '',
        parent_phone: ''
      });
      loadStudents();
    } catch (error) {
      console.error('Error creating student:', error);
      alert('Öğrenci eklenirken hata oluştu');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu öğrenciyi silmek istediğinizden emin misiniz?')) return;
    
    try {
      await studentsAPI.delete(id);
      loadStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Öğrenci silinirken hata oluştu');
    }
  };

  const filteredStudents = students.filter(student => {
    const searchLower = searchTerm.toLowerCase();
    return (
      student.first_name?.toLowerCase().includes(searchLower) ||
      student.last_name?.toLowerCase().includes(searchLower) ||
      student.email?.toLowerCase().includes(searchLower) ||
      student.phone?.includes(searchTerm) ||
      student.parent_name?.toLowerCase().includes(searchLower) ||
      student.parent_phone?.includes(searchTerm)
    );
  });

  if (loading) {
    return <div className="loading-container">Yükleniyor...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Öğrenci Yönetimi</h1>
          <p className="page-subtitle">Tüm öğrencileri görüntüleyin ve yönetin</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <input
            type="text"
            className="form-input"
            placeholder="🔍 İsim, telefon, e-posta ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '300px' }}
          />
          {isAdmin() && (
            <button onClick={() => setShowModal(true)} className="btn btn-primary">
              ➕ Yeni Öğrenci Ekle
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
              <th>Veli</th>
              <th>Durum</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => (
              <tr key={student.id}>
                <td className="font-bold">{student.first_name} {student.last_name}</td>
                <td>{student.email || '-'}</td>
                <td>{student.phone || '-'}</td>
                <td>{student.parent_name || '-'}</td>
                <td>
                  <span className={`badge badge-${student.status === 'active' ? 'success' : 'warning'}`}>
                    {student.status === 'active' ? 'Aktif' : 'Pasif'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button
                      onClick={() => window.location.href = `/students/${student.id}`}
                      className="btn btn-sm btn-primary"
                    >
                      Detay
                    </button>
                    {isAdmin() && (
                      <button
                        onClick={() => handleDelete(student.id)}
                        className="btn btn-sm btn-secondary"
                        style={{ color: 'var(--error)' }}
                      >
                        Sil
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Yeni Öğrenci Ekle</h2>
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
                  <label className="form-label">E-posta</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Telefon</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Veli Adı</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.parent_name}
                    onChange={(e) => setFormData({...formData, parent_name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Veli Telefon</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={formData.parent_phone}
                    onChange={(e) => setFormData({...formData, parent_phone: e.target.value})}
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
