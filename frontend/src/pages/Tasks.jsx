import React, { useState, useEffect } from 'react';
import { schedulesAPI, financialAPI, eventsAPI, tasksAPI } from '../services/api';
import { formatCurrencyWithSymbol } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import './Tasks.css';

const TASK_CATEGORIES = [
  'Ders',
  'Ödeme',
  'Malzeme',
  'Mekan',
  'İletişim',
  'Etkinlik',
  'Diğer'
];

const Tasks = () => {
  const toast = useToast();
  const [todayTasks, setTodayTasks] = useState([]);
  const [tomorrowPreparations, setTomorrowPreparations] = useState([]);
  const [dashboardTasks, setDashboardTasks] = useState({
    todayLessons: [],
    todayPayments: [],
    tomorrowEvents: []
  });
  const [completedDashboardTasks, setCompletedDashboardTasks] = useState(() => {
    // localStorage'dan tamamlanan görevleri yükle
    const saved = localStorage.getItem('completedDashboardTasks');
    return saved ? JSON.parse(saved) : {};
  });
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('task'); // 'task' or 'preparation'
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    task_type: 'task',
    category: 'Diğer',
    due_date: new Date().toISOString().split('T')[0],
    priority: 'medium'
  });

  useEffect(() => {
    fetchTasks();
    fetchDashboardData();
  }, []);

  // completedDashboardTasks değiştiğinde localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('completedDashboardTasks', JSON.stringify(completedDashboardTasks));
  }, [completedDashboardTasks]);

  const fetchDashboardData = async () => {
    try {
      const [schedulesRes, paymentsRes, eventsRes] = await Promise.all([
        schedulesAPI.getAll(),
        financialAPI.getTodaysPayments(),
        eventsAPI.getAll()
      ]);

      const schedules = schedulesRes.data;
      const payments = paymentsRes.data;
      const events = eventsRes.data;

      console.log('All events:', events);
      console.log('All schedules:', schedules);

      // Get today's date
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      // Get tomorrow's date
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

      console.log('Today:', today);
      console.log('Tomorrow:', tomorrowStr);

      // Filter today's lessons
      const todayLessons = schedules.filter(s => {
        if (!s.specific_date) return false;
        const scheduleDate = s.specific_date.split('T')[0];
        return scheduleDate === today;
      });

      // Filter today's events
      const todayEvents = events.filter(e => {
        if (e.status === 'cancelled') return false;
        const eventStartDate = e.start_date.split('T')[0];
        const eventEndDate = e.end_date.split('T')[0];
        return today >= eventStartDate && today <= eventEndDate;
      });

      // Filter tomorrow's schedules (lessons, workshops, appointments)
      const tomorrowSchedules = schedules.filter(s => {
        if (!s.specific_date) return false;
        const scheduleDate = s.specific_date.split('T')[0];
        return scheduleDate === tomorrowStr;
      });

      // Filter tomorrow's events
      const tomorrowEvents = events.filter(e => {
        if (e.status === 'cancelled') return false;
        const eventStartDate = e.start_date.split('T')[0];
        const eventEndDate = e.end_date.split('T')[0];
        console.log('Event:', e.name, 'Start:', eventStartDate, 'End:', eventEndDate, 'Tomorrow:', tomorrowStr);
        return tomorrowStr >= eventStartDate && tomorrowStr <= eventEndDate;
      });

      console.log('Tomorrow schedules:', tomorrowSchedules);
      console.log('Tomorrow events:', tomorrowEvents);

      setDashboardTasks({
        todayLessons: [...todayLessons, ...todayEvents],
        todayPayments: payments,
        tomorrowEvents: [...tomorrowSchedules, ...tomorrowEvents]
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Dashboard verileri yüklenirken hata oluştu');
    }
  };

  const fetchTasks = async () => {
    try {
      const [todayRes, tomorrowRes] = await Promise.all([
        tasksAPI.getToday(),
        tasksAPI.getTomorrowPreparations()
      ]);
      
      setTodayTasks(todayRes.data);
      setTomorrowPreparations(tomorrowRes.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Görevler yüklenirken hata oluştu');
    }
  };

  const handleOpenModal = (type, task = null) => {
    setModalType(type);
    
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title,
        description: task.description || '',
        task_type: task.task_type,
        category: task.category || 'Diğer',
        due_date: task.due_date,
        priority: task.priority
      });
    } else {
      setEditingTask(null);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      setFormData({
        title: '',
        description: '',
        task_type: type,
        category: 'Diğer',
        due_date: type === 'preparation' 
          ? tomorrow.toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        priority: 'medium'
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      task_type: 'task',
      category: 'Diğer',
      due_date: new Date().toISOString().split('T')[0],
      priority: 'medium'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.warning('Başlık gereklidir');
      return;
    }

    try {
      if (editingTask) {
        await tasksAPI.update(editingTask.id, formData);
        toast.success('✅ Görev güncellendi');
      } else {
        await tasksAPI.create(formData);
        toast.success('✅ Görev eklendi');
      }

      fetchTasks();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Görev kaydedilirken hata oluştu');
    }
  };

  const handleToggleComplete = async (taskId) => {
    try {
      await tasksAPI.toggleComplete(taskId);
      fetchTasks();
    } catch (error) {
      console.error('Error toggling task:', error);
      toast.error('Görev durumu değiştirilirken hata oluştu');
    }
  };

  const handleToggleDashboardTask = (taskKey) => {
    setCompletedDashboardTasks(prev => ({
      ...prev,
      [taskKey]: !prev[taskKey]
    }));
  };

  const isDashboardTaskCompleted = (taskKey) => {
    return completedDashboardTasks[taskKey] || false;
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Bu görevi silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await tasksAPI.delete(taskId);
      toast.success('🗑️ Görev silindi');
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Görev silinirken hata oluştu');
    }
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      high: '🔴 Yüksek',
      medium: '🟡 Orta',
      low: '🟢 Düşük'
    };
    return labels[priority] || priority;
  };

  const renderTaskItem = (task) => (
    <div
      key={task.id}
      className={`task-item ${task.is_completed ? 'completed' : ''}`}
    >
      <div className="task-content">
        <div className="task-title">{task.title}</div>
        {task.description && (
          <div className="task-description">{task.description}</div>
        )}
        <div className="task-meta">
          {task.category && (
            <span className="task-badge">{task.category}</span>
          )}
          <span className={`task-badge priority-${task.priority}`}>
            {getPriorityLabel(task.priority)}
          </span>
          {task.course_name && (
            <span className="task-badge">📚 {task.course_name}</span>
          )}
          {task.event_name && (
            <span className="task-badge">🎭 {task.event_name}</span>
          )}
          {task.start_time && (
            <span className="task-badge">
              🕐 {task.start_time.slice(0, 5)}
            </span>
          )}
        </div>
      </div>
      <div className="task-actions">
        <button
          className={`task-complete-btn ${task.is_completed ? 'completed' : ''}`}
          onClick={() => handleToggleComplete(task.id)}
          title={task.is_completed ? 'Tamamlanmadı olarak işaretle' : 'Tamamlandı olarak işaretle'}
        >
          {task.is_completed ? '✓' : '○'}
        </button>
        <button
          className="task-action-btn"
          onClick={() => handleOpenModal(task.task_type, task)}
          title="Düzenle"
        >
          ✏️
        </button>
        <button
          className="task-action-btn"
          onClick={() => handleDelete(task.id)}
          title="Sil"
        >
          🗑️
        </button>
      </div>
    </div>
  );

  const incompleteTodayTasks = todayTasks.filter(t => !t.is_completed);
  const completedTodayTasks = todayTasks.filter(t => t.is_completed);
  const incompleteTomorrowPreps = tomorrowPreparations.filter(t => !t.is_completed);
  const completedTomorrowPreps = tomorrowPreparations.filter(t => t.is_completed);

  return (
    <div className="tasks-container">
      <div className="tasks-header">
        <h1>✅ Görevler ve Hazırlıklar</h1>
        <div className="tasks-actions">
          <button
            className="btn btn-primary btn-sm"
            onClick={() => handleOpenModal('task')}
          >
            ➕ Yeni Görev
          </button>
          <button
            className="btn btn-success btn-sm"
            onClick={() => handleOpenModal('preparation')}
          >
            ➕ Yeni Hazırlık
          </button>
        </div>
      </div>

      <div className="tasks-sections">
        {/* Bugünün Görevleri */}
        <div className="task-section">
          <div className="section-header">
            <h2>
              📋 Bugünün Görevleri
              <span className="section-count">
                {[
                  ...dashboardTasks.todayLessons.map((l, idx) => isDashboardTaskCompleted(`lesson-${l.id || idx}`)),
                  ...dashboardTasks.todayPayments.map((p, idx) => isDashboardTaskCompleted(`payment-${p.id || idx}`) || p.paid),
                  ...todayTasks.map(t => t.is_completed)
                ].filter(Boolean).length} / {dashboardTasks.todayLessons.length + dashboardTasks.todayPayments.length + todayTasks.length} görev
              </span>
            </h2>
          </div>
          <div className="task-list">
            {/* Tüm Bugünün Görevlerini Birleştir ve Sırala */}
            {[
              // Dashboard Dersler
              ...dashboardTasks.todayLessons.map((lesson, idx) => ({
                type: 'lesson',
                data: lesson,
                key: `lesson-${lesson.id || idx}`,
                isCompleted: isDashboardTaskCompleted(`lesson-${lesson.id || idx}`)
              })),
              // Dashboard Ödemeler
              ...dashboardTasks.todayPayments.map((payment, idx) => ({
                type: 'payment',
                data: payment,
                key: `payment-${payment.id || idx}`,
                isCompleted: isDashboardTaskCompleted(`payment-${payment.id || idx}`) || payment.paid
              })),
              // Kullanıcı Görevleri
              ...todayTasks.map(task => ({
                type: 'userTask',
                data: task,
                key: `task-${task.id}`,
                isCompleted: task.is_completed
              }))
            ]
              .sort((a, b) => a.isCompleted - b.isCompleted) // Tamamlanmamışlar önce
              .map(({ type, data, key, isCompleted }) => {
                // Ders
                if (type === 'lesson') {
                  return (
                    <div key={key} className={`task-item ${isCompleted ? 'completed' : ''}`}>
                      <div className="task-content">
                        <div className="task-title">
                          📚 {data.course_name || data.name}
                        </div>
                        {data.room && (
                          <div className="task-description">{data.room}</div>
                        )}
                        <div className="task-meta">
                          <span className="task-badge">Ders</span>
                          {data.start_time && (
                            <span className="task-badge">
                              🕐 {data.start_time.slice(0, 5)}
                            </span>
                          )}
                          {data.teacher_first_name && (
                            <span className="task-badge">
                              👨‍🏫 {data.teacher_first_name} {data.teacher_last_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="task-actions">
                        <button
                          className={`task-complete-btn ${isCompleted ? 'completed' : ''}`}
                          onClick={() => handleToggleDashboardTask(key)}
                          title={isCompleted ? 'Tamamlanmadı olarak işaretle' : 'Tamamlandı olarak işaretle'}
                        >
                          {isCompleted ? '✓' : '○'}
                        </button>
                      </div>
                    </div>
                  );
                }
                
                // Ödeme
                if (type === 'payment') {
                  return (
                    <div key={key} className={`task-item ${isCompleted ? 'completed' : ''}`}>
                      <div className="task-content">
                        <div className="task-title">
                          💰 {data.name} - Ödeme
                        </div>
                        <div className="task-description">
                          {data.type === 'student' ? data.course_name : `Etkinlik: ${data.event_type}`}
                        </div>
                        <div className="task-meta">
                          <span className="task-badge">Ödeme</span>
                          <span className={`task-badge ${data.paid ? 'priority-low' : 'priority-high'}`}>
                            {formatCurrencyWithSymbol(data.amount)}
                          </span>
                          {data.paid && (
                            <span className="task-badge priority-low">✓ Ödendi</span>
                          )}
                        </div>
                      </div>
                      <div className="task-actions">
                        <button
                          className={`task-complete-btn ${isCompleted ? 'completed' : ''}`}
                          onClick={() => handleToggleDashboardTask(key)}
                          title={isCompleted ? 'Tamamlanmadı olarak işaretle' : 'Tamamlandı olarak işaretle'}
                          disabled={data.paid}
                        >
                          {isCompleted ? '✓' : '○'}
                        </button>
                      </div>
                    </div>
                  );
                }
                
                // Kullanıcı Görevi
                if (type === 'userTask') {
                  return renderTaskItem(data);
                }
                
                return null;
              })}

            {/* Empty State */}
            {dashboardTasks.todayLessons.length === 0 && 
             dashboardTasks.todayPayments.length === 0 && 
             todayTasks.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">📝</div>
                <p>Bugün için görev bulunmuyor</p>
              </div>
            )}
          </div>
        </div>

        {/* Yarının Hazırlıkları */}
        <div className="task-section">
          <div className="section-header">
            <h2>
              🎯 Yarının Hazırlıkları
              <span className="section-count">
                {[
                  ...dashboardTasks.tomorrowEvents.map((e, idx) => isDashboardTaskCompleted(`tomorrow-${e.id || idx}`)),
                  ...tomorrowPreparations.map(t => t.is_completed)
                ].filter(Boolean).length} / {dashboardTasks.tomorrowEvents.length + tomorrowPreparations.length} hazırlık
              </span>
            </h2>
          </div>
          <div className="task-list">
            {/* Tüm Yarının Hazırlıklarını Birleştir ve Sırala */}
            {[
              // Dashboard Etkinlikler
              ...dashboardTasks.tomorrowEvents.map((item, idx) => {
                const isEvent = item.event_type !== undefined;
                const isAppointment = item.room && item.room.startsWith('RANDEVU:');
                const isWorkshop = item.course_name && item.course_name.includes('WORKSHOP');
                return {
                  type: 'dashboardPrep',
                  data: item,
                  key: `tomorrow-${item.id || idx}`,
                  isCompleted: isDashboardTaskCompleted(`tomorrow-${item.id || idx}`),
                  isEvent,
                  isAppointment,
                  isWorkshop
                };
              }),
              // Kullanıcı Hazırlıkları
              ...tomorrowPreparations.map(task => ({
                type: 'userPrep',
                data: task,
                key: `prep-${task.id}`,
                isCompleted: task.is_completed
              }))
            ]
              .sort((a, b) => a.isCompleted - b.isCompleted) // Tamamlanmamışlar önce
              .map(({ type, data, key, isCompleted, isEvent, isAppointment, isWorkshop }) => {
                // Dashboard Hazırlık
                if (type === 'dashboardPrep') {
                  return (
                    <div key={key} className={`task-item ${isCompleted ? 'completed' : ''}`}>
                      <div className="task-content">
                        <div className="task-title">
                          {isEvent && `🎨 ${data.name} - Etkinlik Hazırlığı`}
                          {isAppointment && `📅 ${data.room} - Randevu Hazırlığı`}
                          {isWorkshop && `🎨 ${data.course_name} - Workshop Hazırlığı`}
                          {!isEvent && !isAppointment && !isWorkshop && `📚 ${data.course_name || 'Ders'} - Ders Hazırlığı`}
                        </div>
                        <div className="task-description">
                          {isEvent && 'Malzeme ve mekan kontrolü yapılması gerekiyor'}
                          {isAppointment && 'Randevu için hazırlık yapılması gerekiyor'}
                          {isWorkshop && 'Workshop malzemeleri ve mekan kontrolü'}
                          {!isEvent && !isAppointment && !isWorkshop && 'Ders için hazırlık yapılması gerekiyor'}
                        </div>
                        <div className="task-meta">
                          <span className="task-badge">
                            {isEvent && 'Etkinlik'}
                            {isAppointment && 'Randevu'}
                            {isWorkshop && 'Workshop'}
                            {!isEvent && !isAppointment && !isWorkshop && 'Ders'}
                          </span>
                          {data.event_type && (
                            <span className="task-badge">{data.event_type}</span>
                          )}
                          {data.start_time && (
                            <span className="task-badge">
                              🕐 {data.start_time.slice(0, 5)}
                            </span>
                          )}
                          {data.teacher_first_name && (
                            <span className="task-badge">
                              👨‍🏫 {data.teacher_first_name} {data.teacher_last_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="task-actions">
                        <button
                          className={`task-complete-btn ${isCompleted ? 'completed' : ''}`}
                          onClick={() => handleToggleDashboardTask(key)}
                          title={isCompleted ? 'Tamamlanmadı olarak işaretle' : 'Tamamlandı olarak işaretle'}
                        >
                          {isCompleted ? '✓' : '○'}
                        </button>
                      </div>
                    </div>
                  );
                }
                
                // Kullanıcı Hazırlığı
                if (type === 'userPrep') {
                  return renderTaskItem(data);
                }
                
                return null;
              })}

            {/* Empty State */}
            {dashboardTasks.tomorrowEvents.length === 0 && 
             tomorrowPreparations.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">🎨</div>
                <p>Yarın için hazırlık bulunmuyor</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {editingTask 
                  ? (modalType === 'task' ? 'Görevi Düzenle' : 'Hazırlığı Düzenle')
                  : (modalType === 'task' ? 'Yeni Görev Ekle' : 'Yeni Hazırlık Ekle')
                }
              </h2>
              <button className="close-btn" onClick={handleCloseModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Başlık *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={modalType === 'task' 
                    ? "Örn: Öğrenci ödemelerini kontrol et" 
                    : "Örn: Boyama etkinliği için malzeme kontrolü"
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Açıklama</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Görev hakkında detaylı bilgi..."
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Kategori</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {TASK_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Öncelik</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="low">🟢 Düşük</option>
                    <option value="medium">🟡 Orta</option>
                    <option value="high">🔴 Yüksek</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Tarih *</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  İptal
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTask ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
