import { useState, useEffect } from 'react';
import { notesAPI } from '../../services/api';
import './ManagerPages.css';

export default function ManagerNotes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general'
  });

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const response = await notesAPI.getAll();
      setNotes(response.data);
    } catch (error) {
      console.error('Notlar yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await notesAPI.create(formData);
      setFormData({ title: '', content: '', category: 'general' });
      setShowForm(false);
      loadNotes();
    } catch (error) {
      alert('Not eklenemedi: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleTogglePin = async (id) => {
    try {
      await notesAPI.togglePin(id);
      loadNotes();
    } catch (error) {
      console.error('Not sabitlenemedi:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu notu silmek istediğinizden emin misiniz?')) return;
    try {
      await notesAPI.delete(id);
      loadNotes();
    } catch (error) {
      alert('Not silinemedi');
    }
  };

  if (loading) {
    return <div className="loading">Yükleniyor...</div>;
  }

  const pinnedNotes = notes.filter(n => n.is_pinned);
  const regularNotes = notes.filter(n => !n.is_pinned);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>📝 Notlar</h1>
        <button 
          onClick={() => setShowForm(!showForm)} 
          className="btn btn-primary"
        >
          {showForm ? '✕ İptal' : '+ Yeni Not'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Başlık</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="Not başlığı..."
              />
            </div>
            <div className="form-group">
              <label>Kategori</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="general">Genel</option>
                <option value="important">Önemli</option>
                <option value="reminder">Hatırlatma</option>
                <option value="meeting">Toplantı</option>
              </select>
            </div>
            <div className="form-group">
              <label>İçerik</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
                rows="4"
                placeholder="Not içeriği..."
              />
            </div>
            <button type="submit" className="btn btn-primary">
              💾 Kaydet
            </button>
          </form>
        </div>
      )}

      {pinnedNotes.length > 0 && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <h3 style={{ marginBottom: 'var(--space-3)', color: 'var(--text-secondary)' }}>
            📌 Sabitlenmiş Notlar
          </h3>
          <div className="notes-grid">
            {pinnedNotes.map(note => (
              <NoteCard 
                key={note.id} 
                note={note} 
                onTogglePin={handleTogglePin}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 style={{ marginBottom: 'var(--space-3)', color: 'var(--text-secondary)' }}>
          📄 Tüm Notlar
        </h3>
        {regularNotes.length === 0 ? (
          <div className="empty-state">
            <p>Henüz not eklenmemiş</p>
          </div>
        ) : (
          <div className="notes-grid">
            {regularNotes.map(note => (
              <NoteCard 
                key={note.id} 
                note={note} 
                onTogglePin={handleTogglePin}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NoteCard({ note, onTogglePin, onDelete }) {
  const categoryColors = {
    general: '#3b82f6',
    important: '#ef4444',
    reminder: '#f59e0b',
    meeting: '#8b5cf6'
  };

  const categoryLabels = {
    general: 'Genel',
    important: 'Önemli',
    reminder: 'Hatırlatma',
    meeting: 'Toplantı'
  };

  return (
    <div className="note-card">
      <div className="note-header">
        <span 
          className="note-category"
          style={{ backgroundColor: categoryColors[note.category] }}
        >
          {categoryLabels[note.category]}
        </span>
        <div className="note-actions">
          <button 
            onClick={() => onTogglePin(note.id)}
            className="icon-btn"
            title={note.is_pinned ? 'Sabitlemeyi kaldır' : 'Sabitle'}
          >
            {note.is_pinned ? '📌' : '📍'}
          </button>
          <button 
            onClick={() => onDelete(note.id)}
            className="icon-btn"
            title="Sil"
          >
            🗑️
          </button>
        </div>
      </div>
      <h3 className="note-title">{note.title}</h3>
      <p className="note-content">{note.content}</p>
      <div className="note-footer">
        <small>{new Date(note.created_at).toLocaleDateString('tr-TR')}</small>
      </div>
    </div>
  );
}
