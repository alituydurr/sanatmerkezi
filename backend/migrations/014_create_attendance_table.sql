-- Create attendance table for tracking student attendance
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER NOT NULL REFERENCES course_schedules(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'cancelled')),
  notes TEXT,
  marked_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(schedule_id, student_id, attendance_date)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_attendance_schedule_date ON attendance(schedule_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);

-- Add comment
COMMENT ON TABLE attendance IS 'Tracks student attendance for each scheduled lesson';
COMMENT ON COLUMN attendance.status IS 'present: student attended, absent: student did not attend, cancelled: lesson was cancelled';
