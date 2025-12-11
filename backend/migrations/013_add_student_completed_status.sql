-- Add 'completed' status option for students
-- This status is used when a student has finished all their scheduled lessons

-- No schema change needed if status is VARCHAR/TEXT
-- Just documenting the new status value

-- Status values:
-- 'active' - Student has upcoming lessons
-- 'inactive' - Student has no lessons scheduled
-- 'completed' - Student has finished all scheduled lessons (all lessons are in the past)

-- Update any existing students with no future lessons to 'completed'
UPDATE students s
SET status = 'completed'
WHERE status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM course_schedules cs
    WHERE cs.student_id = s.id
      AND cs.specific_date >= CURRENT_DATE
  )
  AND EXISTS (
    SELECT 1 FROM course_schedules cs
    WHERE cs.student_id = s.id
  );

-- Update students with no lessons at all to 'inactive'
UPDATE students s
SET status = 'inactive'
WHERE NOT EXISTS (
  SELECT 1 FROM course_schedules cs
  WHERE cs.student_id = s.id
);
