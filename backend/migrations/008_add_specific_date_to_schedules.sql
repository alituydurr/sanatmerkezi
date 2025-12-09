-- Update course_schedules to support specific dates instead of just day_of_week
-- Add specific_date column for date-based scheduling

ALTER TABLE course_schedules 
ADD COLUMN IF NOT EXISTS specific_date DATE;

-- Add index for specific_date
CREATE INDEX IF NOT EXISTS idx_course_schedules_specific_date 
ON course_schedules(specific_date);

-- Update is_recurring to be nullable (some schedules are one-time, some recurring)
ALTER TABLE course_schedules 
ALTER COLUMN is_recurring DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN course_schedules.specific_date IS 'Specific date for the class. If set, day_of_week is ignored.';
COMMENT ON COLUMN course_schedules.is_recurring IS 'If true, repeats weekly on day_of_week. If false, occurs only on specific_date.';
