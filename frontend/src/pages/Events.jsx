import { useState, useEffect } from 'react';
import { eventsAPI, teachersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrencyWithSymbol } from '../utils/formatters';
import '../pages/Students.css';

export default function Events() {
  const { isAdmin } = useAuth();
  const [events, setEvents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    event_type: 'wall_painting',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    price: '',
    teacher_id: ''
  });

  const eventTypes = [
    { value: 'wall_painting', label: 'Duvar Boyama' },
    { value: 'special_event', label: 'Özel Etkinlik' },
    { value: 'workshop', label: 'Atölye' },
    { value: 'exhibition', label: 'Sergi' },
    { value: 'performance', label: 'Gösteri' },
    { value: 'other', label: 'Diğer' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [eventsRes, teachersRes] = await Promise.all([
        eventsAPI.getAll(),
        teachersAPI.getAll()
      ]);
      setEvents(eventsRes.data);
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
      await eventsAPI.create(formData);
      setShowModal(false);
      setFormData({
        name: '',
        description: '',
        event_type: 'wall_painting',
        start_date: '',
        end_date: '',
        start_time: '',
        end_time: '',
        price: '',
        teacher_id: ''
      });
      loadData();
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Etkinlik eklenirken hata oluştu');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu etkinliği silmek istediğinizden emin misiniz?')) return;
    
    try {
      await eventsAPI.delete(id);
      loadData();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Etkinlik silinirken hata oluştu');
    }
  };

  const getEventTypeLabel = (type) => {
    const eventType = eventTypes.find(t => t.value === type);
    return eventType ? eventType.label : type;
  };

  const filteredEvents = events.filter(event => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      event.name?.toLowerCase().includes(searchLower) ||
      event.event_type?.toLowerCase().includes(searchLower) ||
      event.teacher_first_name?.toLowerCase().includes(searchLower) ||
      event.teacher_last_name?.toLowerCase().includes(searchLower)
    );

    // Month filter
    if (selectedMonth) {
      const [year, month] = selectedMonth.split('-');
      const eventStartDate = new Date(event.start_date);
      const eventEndDate = new Date(event.end_date);
      const filterMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
      const filterMonthEnd = new Date(parseInt(year), parseInt(month), 0);
      
      // Event is in the selected month if it starts or ends in that month, or spans across it
      const matchesMonth = (
        (eventStartDate >= filterMonth && eventStartDate <= filterMonthEnd) ||
        (eventEndDate >= filterMonth && eventEndDate <= filterMonthEnd) ||
        (eventStartDate <= filterMonth && eventEndDate >= filterMonthEnd)
      );
      
      return matchesSearch && matchesMonth;
    }

    return matchesSearch;
  });

  if (loading) {
    return <div className="loading-container">Yükleniyor...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Etkinlik Yönetimi</h1>
          <p className="page-subtitle">Tüm etkinlikleri görüntüleyin ve yönetin</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', justifyContent: 'flex-end', flex: 1 }}>
          <input
            type="month"
            className="form-input"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ width: '200px' }}
          />
          <input
            type="text"
            className="form-input"
            placeholder="🔍 Etkinlik adı, tür, öğretmen ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '300px' }}
          />
          {isAdmin() && (
            <button onClick={() => setShowModal(true)} className="btn btn-primary">
              ➕ Yeni Etkinlik Ekle
            </button>
          )}
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Etkinlik Adı</th>
              <th>Tür</th>
              <th>Tarih</th>
              <th>Saat</th>
              <th>Öğretmen</th>
              <th>Ücret</th>
              <th>Durum</th>
              {isAdmin() && <th>İşlemler</th>}
            </tr>
          </thead>
          <tbody>
            {filteredEvents.map((event) => (
              <tr key={event.id}>
                <td className="font-bold">{event.name}</td>
                <td>
                  <span className="badge badge-info">
                    {getEventTypeLabel(event.event_type)}
                  </span>
                </td>
                <td>
                  {new Date(event.start_date).toLocaleDateString('tr-TR')} - {new Date(event.end_date).toLocaleDateString('tr-TR')}
                </td>
                <td>
                  {event.start_time?.slice(0, 5)} - {event.end_time?.slice(0, 5)}
                </td>
                <td>
                  {event.teacher_first_name && event.teacher_last_name
                    ? `${event.teacher_first_name} ${event.teacher_last_name}`
                    : '-'}
                </td>
                <td>{formatCurrencyWithSymbol(event.price)}</td>
                <td>
                  <span className={`badge badge-${
                    event.status === 'completed' ? 'success' : 
                    event.status === 'ongoing' ? 'warning' : 
                    event.status === 'cancelled' ? 'error' : 'info'
                  }`}>
                    {event.status === 'completed' ? 'Tamamlandı' :
                     event.status === 'ongoing' ? 'Devam Ediyor' :
                     event.status === 'cancelled' ? 'İptal' : 'Planlandı'}
                  </span>
                </td>
                {isAdmin() && (
                  <td>
                    <button
                      onClick={() => handleDelete(event.id)}
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
            <h2 className="modal-title">Yeni Etkinlik Ekle</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Etkinlik Adı *</label>
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
                  <label className="form-label">Etkinlik Türü *</label>
                  <select
                    className="form-select"
                    value={formData.event_type}
                    onChange={(e) => setFormData({...formData, event_type: e.target.value})}
                    required
                  >
                    {eventTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Öğretmen</label>
                  <select
                    className="form-select"
                    value={formData.teacher_id}
                    onChange={(e) => setFormData({...formData, teacher_id: e.target.value})}
                  >
                    <option value="">Seçiniz</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.first_name} {t.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Başlangıç Tarihi *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Bitiş Tarihi *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Başlangıç Saati</label>
                  <input
                    type="time"
                    className="form-input"
                    value={formData.start_time}
                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Bitiş Saati</label>
                  <input
                    type="time"
                    className="form-input"
                    value={formData.end_time}
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Ücret (₺) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  required
                />
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
