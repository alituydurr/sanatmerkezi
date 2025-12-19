-- ============================================
-- TASKS TABLE (Görevler ve Hazırlıklar)
-- ============================================

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  task_type VARCHAR(20) NOT NULL CHECK (task_type IN ('task', 'preparation')),
  category VARCHAR(100),
  due_date DATE NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  completed_by INTEGER REFERENCES users(id),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  related_schedule_id INTEGER REFERENCES course_schedules(id) ON DELETE SET NULL,
  related_event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_is_completed ON tasks(is_completed);
CREATE INDEX idx_tasks_task_type ON tasks(task_type);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_completed ON tasks(is_completed, due_date);

-- Comments
COMMENT ON TABLE tasks IS 'Görevler ve yarının etkinlikleri için hazırlıklar';
COMMENT ON COLUMN tasks.task_type IS 'task: Günlük görevler, preparation: Yarının etkinlikleri için hazırlıklar';
COMMENT ON COLUMN tasks.category IS 'Görev kategorisi (Ders, Ödeme, Malzeme, Mekan, vb.)';
COMMENT ON COLUMN tasks.priority IS 'Görev önceliği (low, medium, high)';
COMMENT ON COLUMN tasks.related_schedule_id IS 'İlgili ders programı (hazırlıklar için)';
COMMENT ON COLUMN tasks.related_event_id IS 'İlgili etkinlik (hazırlıklar için)';

-- ============================================
-- MİGRATİON TAMAMLANDI
-- ============================================
