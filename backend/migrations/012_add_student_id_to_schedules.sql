-- Migration: Add student_id to course_schedules for individual lesson tracking
-- This allows us to track which schedules belong to which students

ALTER TABLE course_schedules 
ADD COLUMN IF NOT EXISTS student_id INTEGER REFERENCES students(id) ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_course_schedules_student_id ON course_schedules(student_id);

COMMENT ON COLUMN course_schedules.student_id IS 'For individual lessons - links schedule to specific student';
