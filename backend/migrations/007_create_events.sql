-- Events (Etkinlikler) tablosu
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(100) NOT NULL, -- 'wall_painting', 'special_event', 'workshop', etc.
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'planned', -- 'planned', 'ongoing', 'completed', 'cancelled'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Event enrollments (Etkinlik kayıtları)
CREATE TABLE IF NOT EXISTS event_enrollments (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'partial'
  paid_amount DECIMAL(10, 2) DEFAULT 0,
  UNIQUE(event_id, student_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_dates ON events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_events_teacher ON events(teacher_id);
CREATE INDEX IF NOT EXISTS idx_event_enrollments_event ON event_enrollments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_enrollments_student ON event_enrollments(student_id);
