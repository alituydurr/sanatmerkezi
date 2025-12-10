-- Migration: Make student_id nullable in payments table
-- This allows payments for appointment-based payment plans without student records

ALTER TABLE payments 
ALTER COLUMN student_id DROP NOT NULL;
