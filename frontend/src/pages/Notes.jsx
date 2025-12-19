import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Notes.css';

const API_URL = 'http://localhost:5000/api';

// Renk seçenekleri
const COLOR_OPTIONS = [
  { name: 'Sarı', value: '#FFE066' },
  { name: 'Turuncu', value: '#FFB84D' },
  { name: 'Pembe', value: '#FF9ECD' },
  { name: 'Mor', value: '#D4A5FF' },
  { name: 'Mavi', value: '#A5D8FF' },
  { name: 'Yeşil', value: '#B2F2BB' },
  { name: 'Kırmızı', value: '#FFA8A8' },
  { name: 'Gri', value: '#DEE2E6' }
];

// Kategori seçenekleri
const CATEGORIES = [
  'Şifreler',
  'Önemli Bilgiler',
  'Kişisel',
  'İş',
  'Genel',
  'Diğer'
];

const Notes = () => {
  const [notes, setNotes] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    color: '#FFE066',
    category: 'Genel',
    is_pinned: false
  });

  useEffect(() => {
    fetchNotes();
  }, []);

  useEffect(() => {
    filterNotes();
  }, [notes, searchTerm, selectedCategory]);

  const fetchNotes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/notes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotes(response.data);
    } catch (error) {
      console.error('Error fetching notes:', error);
      alert('Notlar yüklenirken hata oluştu');
    }
  };

  const filterNotes = () => {
    let filtered = [...notes];

    // Arama filtresi
    if (searchTerm) {
      filtered = filtered.filter(note =>
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Kategori filtresi
    if (selectedCategory !== 'Tümü') {
      if (selectedCategory === 'Sabitlenmiş') {
        filtered = filtered.filter(note => note.is_pinned);
      } else {
        filtered = filtered.filter(note => note.category === selectedCategory);
      }
    }

    setFilteredNotes(filtered);
  };

  const handleOpenModal = (note = null) => {
    if (note) {
      setEditingNote(note);
      setFormData({
        title: note.title,
        content: note.content,
        color: note.color,
        category: note.category || 'Genel',
        is_pinned: note.is_pinned
      });
    } else {
      setEditingNote(null);
      setFormData({
        title: '',
        content: '',
        color: '#FFE066',
        category: 'Genel',
        is_pinned: false
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingNote(null);
    setFormData({
      title: '',
      content: '',
      color: '#FFE066',
      category: 'Genel',
      is_pinned: false
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Başlık ve içerik gereklidir');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      if (editingNote) {
        await axios.put(`${API_URL}/notes/${editingNote.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_URL}/notes`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      fetchNotes();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Not kaydedilirken hata oluştu');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu notu silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/notes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Not silinirken hata oluştu');
    }
  };

  const handleTogglePin = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/notes/${id}/pin`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotes();
    } catch (error) {
      console.error('Error toggling pin:', error);
      alert('Not sabitleme durumu değiştirilirken hata oluştu');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="notes-container">
      <div className="notes-header">
        <h1>📝 Notlarım</h1>
        <div className="notes-actions">
          <div className="search-box">
            <input
              type="text"
              placeholder="Not ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${selectedCategory === 'Tümü' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('Tümü')}
            >
              Tümü
            </button>
            <button
              className={`filter-btn ${selectedCategory === 'Sabitlenmiş' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('Sabitlenmiş')}
            >
              📌 Sabitlenmiş
            </button>
            {CATEGORIES.map(category => (
              <button
                key={category}
                className={`filter-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
          <button className="add-note-btn" onClick={() => handleOpenModal()}>
            <span>➕</span>
            Yeni Not
          </button>
        </div>
      </div>

      {filteredNotes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <h3>Henüz not bulunmuyor</h3>
          <p>Yeni bir not eklemek için "Yeni Not" butonuna tıklayın</p>
        </div>
      ) : (
        <div className="notes-grid">
          {filteredNotes.map(note => (
            <div
              key={note.id}
              className={`note-card ${note.is_pinned ? 'pinned' : ''}`}
              style={{ borderLeftColor: note.color, backgroundColor: `${note.color}20` }}
            >
              <div className="note-header">
                <h3 className="note-title">{note.title}</h3>
                <div className="note-actions">
                  <button
                    className="note-action-btn"
                    onClick={() => handleTogglePin(note.id)}
                    title={note.is_pinned ? 'Sabitlemeyi kaldır' : 'Sabitle'}
                  >
                    {note.is_pinned ? '📌' : '📍'}
                  </button>
                  <button
                    className="note-action-btn"
                    onClick={() => handleOpenModal(note)}
                    title="Düzenle"
                  >
                    ✏️
                  </button>
                  <button
                    className="note-action-btn"
                    onClick={() => handleDelete(note.id)}
                    title="Sil"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <div className="note-content">{note.content}</div>
              <div className="note-footer">
                {note.category && (
                  <span className="note-category">{note.category}</span>
                )}
                <span className="note-date">{formatDate(note.updated_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingNote ? 'Notu Düzenle' : 'Yeni Not Ekle'}</h2>
              <button className="close-btn" onClick={handleCloseModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Başlık *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Not başlığı..."
                  required
                />
              </div>

              <div className="form-group">
                <label>İçerik *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Not içeriği..."
                  required
                />
              </div>

              <div className="form-group">
                <label>Kategori</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '0.95rem'
                  }}
                >
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Renk</label>
                <div className="color-picker-group">
                  {COLOR_OPTIONS.map(color => (
                    <div
                      key={color.value}
                      className={`color-option ${formData.color === color.value ? 'selected' : ''}`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id="is_pinned"
                    checked={formData.is_pinned}
                    onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                  />
                  <label htmlFor="is_pinned">📌 Bu notu sabitle</label>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  İptal
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingNote ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notes;
