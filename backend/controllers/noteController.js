import pool from '../config/database.js';

// Tüm notları getir
export const getNotes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*, u.full_name as created_by_name
       FROM notes n
       LEFT JOIN users u ON n.created_by = u.id
       ORDER BY n.is_pinned DESC, n.updated_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Notlar getirilirken hata oluştu' });
  }
};

// Tek bir notu getir
export const getNoteById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT n.*, u.full_name as created_by_name
       FROM notes n
       LEFT JOIN users u ON n.created_by = u.id
       WHERE n.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not bulunamadı' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({ error: 'Not getirilirken hata oluştu' });
  }
};

// Yeni not oluştur
export const createNote = async (req, res) => {
  try {
    const { title, content, color, category, is_pinned } = req.body;
    const created_by = req.user.id;

    if (!title || !content) {
      return res.status(400).json({ error: 'Başlık ve içerik gereklidir' });
    }

    const result = await pool.query(
      `INSERT INTO notes (title, content, color, category, is_pinned, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, content, color || '#FFE066', category, is_pinned || false, created_by]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Not oluşturulurken hata oluştu' });
  }
};

// Notu güncelle
export const updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, color, category, is_pinned } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Başlık ve içerik gereklidir' });
    }

    const result = await pool.query(
      `UPDATE notes 
       SET title = $1, content = $2, color = $3, category = $4, 
           is_pinned = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [title, content, color, category, is_pinned, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not bulunamadı' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Not güncellenirken hata oluştu' });
  }
};

// Notu sil
export const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM notes WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not bulunamadı' });
    }

    res.json({ message: 'Not başarıyla silindi' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Not silinirken hata oluştu' });
  }
};

// Not sabitleme durumunu değiştir
export const togglePinNote = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE notes 
       SET is_pinned = NOT is_pinned, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not bulunamadı' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error toggling pin:', error);
    res.status(500).json({ error: 'Not sabitleme durumu değiştirilirken hata oluştu' });
  }
};

