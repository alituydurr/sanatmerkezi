-- Migration: Add student name fields to payment_plans and make student_id nullable
-- This allows creating payment plans for appointments without creating student records

-- Add student name and surname columns
ALTER TABLE payment_plans 
ADD COLUMN IF NOT EXISTS student_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS student_surname VARCHAR(100);

-- Make student_id nullable (drop NOT NULL constraint if exists)
ALTER TABLE payment_plans 
ALTER COLUMN student_id DROP NOT NULL;

-- Add a check constraint to ensure either student_id OR (student_name AND student_surname) is provided
ALTER TABLE payment_plans
ADD CONSTRAINT check_student_info 
CHECK (
  student_id IS NOT NULL OR 
  (student_name IS NOT NULL AND student_surname IS NOT NULL)
);
