import pool from '../config/database.js';

// Tüm görevleri getir
export const getTasks = async (req, res) => {
  try {
    const { date, type } = req.query;
    
    let query = `
      SELECT t.*, 
             u.full_name as created_by_name,
             uc.full_name as completed_by_name,
             cs.start_time, cs.end_time,
             c.name as course_name,
             e.name as event_name
      FROM tasks t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN users uc ON t.completed_by = uc.id
      LEFT JOIN course_schedules cs ON t.related_schedule_id = cs.id
      LEFT JOIN courses c ON cs.course_id = c.id
      LEFT JOIN events e ON t.related_event_id = e.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (date) {
      params.push(date);
      query += ` AND t.due_date = $${params.length}`;
    }
    
    if (type) {
      params.push(type);
      query += ` AND t.task_type = $${params.length}`;
    }
    
    query += ` ORDER BY t.is_completed ASC, t.priority DESC, t.due_date ASC, t.created_at DESC`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Görevler getirilirken hata oluştu' });
  }
};

// Bugünün görevlerini getir
export const getTodayTasks = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const result = await pool.query(
      `SELECT t.*, 
              u.full_name as created_by_name,
              uc.full_name as completed_by_name
       FROM tasks t
       LEFT JOIN users u ON t.created_by = u.id
       LEFT JOIN users uc ON t.completed_by = uc.id
       WHERE t.due_date = $1 AND t.task_type = 'task'
       ORDER BY t.is_completed ASC, t.priority DESC, t.created_at DESC`,
      [today]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching today tasks:', error);
    res.status(500).json({ error: 'Bugünün görevleri getirilirken hata oluştu' });
  }
};

// Yarının hazırlıklarını getir
export const getTomorrowPreparations = async (req, res) => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const result = await pool.query(
      `SELECT t.*, 
              u.full_name as created_by_name,
              uc.full_name as completed_by_name,
              cs.start_time, cs.end_time,
              c.name as course_name,
              e.name as event_name
       FROM tasks t
       LEFT JOIN users u ON t.created_by = u.id
       LEFT JOIN users uc ON t.completed_by = uc.id
       LEFT JOIN course_schedules cs ON t.related_schedule_id = cs.id
       LEFT JOIN courses c ON cs.course_id = c.id
       LEFT JOIN events e ON t.related_event_id = e.id
       WHERE t.due_date = $1 AND t.task_type = 'preparation'
       ORDER BY t.is_completed ASC, t.priority DESC, t.created_at DESC`,
      [tomorrowStr]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tomorrow preparations:', error);
    res.status(500).json({ error: 'Yarının hazırlıkları getirilirken hata oluştu' });
  }
};

// Yeni görev oluştur
export const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      task_type,
      category,
      due_date,
      priority,
      related_schedule_id,
      related_event_id
    } = req.body;
    
    const created_by = req.user.id;

    if (!title || !task_type || !due_date) {
      return res.status(400).json({ error: 'Başlık, tür ve tarih gereklidir' });
    }

    const result = await pool.query(
      `INSERT INTO tasks (
        title, description, task_type, category, due_date, priority,
        related_schedule_id, related_event_id, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        title,
        description,
        task_type,
        category,
        due_date,
        priority || 'medium',
        related_schedule_id,
        related_event_id,
        created_by
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Görev oluşturulurken hata oluştu' });
  }
};

// Görevi güncelle
export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      task_type,
      category,
      due_date,
      priority
    } = req.body;

    const result = await pool.query(
      `UPDATE tasks 
       SET title = $1, description = $2, task_type = $3, category = $4,
           due_date = $5, priority = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [title, description, task_type, category, due_date, priority, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Görev bulunamadı' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Görev güncellenirken hata oluştu' });
  }
};

// Görevi tamamla/tamamlanmadı olarak işaretle
export const toggleTaskCompletion = async (req, res) => {
  try {
    const { id } = req.params;
    const completed_by = req.user.id;

    // Önce mevcut durumu kontrol et
    const checkResult = await pool.query(
      'SELECT is_completed FROM tasks WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Görev bulunamadı' });
    }

    const isCurrentlyCompleted = checkResult.rows[0].is_completed;
    const newCompletedState = !isCurrentlyCompleted;

    const result = await pool.query(
      `UPDATE tasks 
       SET is_completed = $1,
           completed_at = $2,
           completed_by = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [
        newCompletedState,
        newCompletedState ? new Date() : null,
        newCompletedState ? completed_by : null,
        id
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error toggling task completion:', error);
    res.status(500).json({ error: 'Görev durumu değiştirilirken hata oluştu' });
  }
};

// Görevi sil
export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Görev bulunamadı' });
    }

    res.json({ message: 'Görev başarıyla silindi' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Görev silinirken hata oluştu' });
  }
};
