import { useState, useEffect } from 'react';
import { tasksAPI } from '../../services/api';
import './ManagerPages.css';

export default function ManagerTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, completed
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium'
  });

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await tasksAPI.getAll();
      setTasks(response.data);
    } catch (error) {
      console.error('Görevler yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await tasksAPI.create(formData);
      setFormData({ title: '', description: '', due_date: '', priority: 'medium' });
      setShowForm(false);
      loadTasks();
    } catch (error) {
      alert('Görev eklenemedi: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleToggleComplete = async (id) => {
    try {
      await tasksAPI.toggleComplete(id);
      loadTasks();
    } catch (error) {
      console.error('Görev güncellenemedi:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu görevi silmek istediğinizden emin misiniz?')) return;
    try {
      await tasksAPI.delete(id);
      loadTasks();
    } catch (error) {
      alert('Görev silinemedi');
    }
  };

  if (loading) {
    return <div className="loading">Yükleniyor...</div>;
  }

  const filteredTasks = tasks.filter(task => {
    if (filter === 'pending') return !task.is_completed;
    if (filter === 'completed') return task.is_completed;
    return true;
  });

  const pendingCount = tasks.filter(t => !t.is_completed).length;
  const completedCount = tasks.filter(t => t.is_completed).length;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>✅ Görevler</h1>
        <button 
          onClick={() => setShowForm(!showForm)} 
          className="btn btn-primary"
        >
          {showForm ? '✕ İptal' : '+ Yeni Görev'}
        </button>
      </div>

      {/* Stats */}
      <div className="stats-row" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="stat-card-small">
          <div className="stat-value">{pendingCount}</div>
          <div className="stat-label">Bekleyen</div>
        </div>
        <div className="stat-card-small">
          <div className="stat-value">{completedCount}</div>
          <div className="stat-label">Tamamlanan</div>
        </div>
        <div className="stat-card-small">
          <div className="stat-value">{tasks.length}</div>
          <div className="stat-label">Toplam</div>
        </div>
      </div>

      {/* Filter */}
      <div className="filter-tabs" style={{ marginBottom: 'var(--space-4)' }}>
        <button 
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Tümü ({tasks.length})
        </button>
        <button 
          className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          Bekleyen ({pendingCount})
        </button>
        <button 
          className={`filter-tab ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          Tamamlanan ({completedCount})
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Görev Başlığı</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="Görev başlığı..."
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Son Tarih</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Öncelik</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="low">Düşük</option>
                  <option value="medium">Orta</option>
                  <option value="high">Yüksek</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Açıklama</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="3"
                placeholder="Görev açıklaması..."
              />
            </div>
            <button type="submit" className="btn btn-primary">
              💾 Kaydet
            </button>
          </form>
        </div>
      )}

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="empty-state">
          <p>Görev bulunamadı</p>
        </div>
      ) : (
        <div className="tasks-list">
          {filteredTasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onToggleComplete={handleToggleComplete}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, onToggleComplete, onDelete }) {
  const priorityColors = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444'
  };

  const priorityLabels = {
    low: 'Düşük',
    medium: 'Orta',
    high: 'Yüksek'
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !task.is_completed;

  return (
    <div className={`task-card ${task.is_completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}`}>
      <div className="task-checkbox">
        <input
          type="checkbox"
          checked={task.is_completed}
          onChange={() => onToggleComplete(task.id)}
        />
      </div>
      <div className="task-content">
        <h3 className="task-title">{task.title}</h3>
        {task.description && <p className="task-description">{task.description}</p>}
        <div className="task-meta">
          <span 
            className="task-priority"
            style={{ backgroundColor: priorityColors[task.priority] }}
          >
            {priorityLabels[task.priority]}
          </span>
          {task.due_date && (
            <span className="task-date">
              📅 {new Date(task.due_date).toLocaleDateString('tr-TR')}
            </span>
          )}
        </div>
      </div>
      <button 
        onClick={() => onDelete(task.id)}
        className="icon-btn"
        title="Sil"
      >
        🗑️
      </button>
    </div>
  );
}
