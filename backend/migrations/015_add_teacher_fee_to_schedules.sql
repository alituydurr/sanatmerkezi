-- Migration: Add teacher_fee to course_schedules for trial lessons and appointments
-- This allows setting different teacher fees for each trial lesson/appointment

-- Add teacher_fee column
ALTER TABLE course_schedules 
ADD COLUMN IF NOT EXISTS teacher_fee DECIMAL(10, 2) DEFAULT 0;

-- Add comment
COMMENT ON COLUMN course_schedules.teacher_fee IS 
'Öğretmen ücreti (deneme dersleri, randevular ve özel etkinlikler için). Normal dersler için saat ücreti kullanılır.';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_course_schedules_teacher_fee 
ON course_schedules(teacher_fee) 
WHERE teacher_fee > 0;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'course_schedules' 
AND column_name = 'teacher_fee';
