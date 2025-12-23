-- ============================================
-- DATABASE CLEANUP SCRIPT
-- ============================================
-- This script will DELETE ALL DATA from the database
-- while preserving the schema structure.
-- 
-- ⚠️ WARNING: This will delete ALL records!
-- ⚠️ Make sure you want to do this before running!
-- ============================================

-- Disable foreign key checks temporarily (PostgreSQL doesn't need this, but good practice)
BEGIN;

-- Delete all data in reverse dependency order
-- (Delete child tables first, then parent tables)

-- 1. Delete attendance records
DELETE FROM attendance;

-- 2. Delete payments (child of payment_plans)
DELETE FROM payments;

-- 3. Delete teacher payment records
DELETE FROM teacher_payment_records;

-- 4. Delete teacher payments
DELETE FROM teacher_payments;

-- 5. Delete payment plans
DELETE FROM payment_plans;

-- 6. Delete event enrollments
DELETE FROM event_enrollments;

-- 7. Delete events
DELETE FROM events;

-- 8. Delete course schedules
DELETE FROM course_schedules;

-- 9. Delete student-course enrollments
DELETE FROM student_courses;

-- 10. Delete teacher-course assignments
DELETE FROM teacher_courses;

-- 11. Delete students
DELETE FROM students;

-- 12. Delete teachers
DELETE FROM teachers;

-- 13. Delete courses
DELETE FROM courses;

-- 14. Delete login attempts
DELETE FROM login_attempts;

-- 15. Delete users (keep admin and admin2 users)
DELETE FROM users WHERE role NOT IN ('admin', 'admin2');

-- Reset sequences to start from 1
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE students_id_seq RESTART WITH 1;
ALTER SEQUENCE teachers_id_seq RESTART WITH 1;
ALTER SEQUENCE courses_id_seq RESTART WITH 1;
ALTER SEQUENCE course_schedules_id_seq RESTART WITH 1;
ALTER SEQUENCE student_courses_id_seq RESTART WITH 1;
ALTER SEQUENCE teacher_courses_id_seq RESTART WITH 1;
ALTER SEQUENCE events_id_seq RESTART WITH 1;
ALTER SEQUENCE event_enrollments_id_seq RESTART WITH 1;
ALTER SEQUENCE payment_plans_id_seq RESTART WITH 1;
ALTER SEQUENCE payments_id_seq RESTART WITH 1;
ALTER SEQUENCE teacher_payments_id_seq RESTART WITH 1;
ALTER SEQUENCE teacher_payment_records_id_seq RESTART WITH 1;
ALTER SEQUENCE attendance_id_seq RESTART WITH 1;

COMMIT;

-- Verify cleanup
SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'students', COUNT(*) FROM students
UNION ALL
SELECT 'teachers', COUNT(*) FROM teachers
UNION ALL
SELECT 'courses', COUNT(*) FROM courses
UNION ALL
SELECT 'course_schedules', COUNT(*) FROM course_schedules
UNION ALL
SELECT 'student_courses', COUNT(*) FROM student_courses
UNION ALL
SELECT 'teacher_courses', COUNT(*) FROM teacher_courses
UNION ALL
SELECT 'events', COUNT(*) FROM events
UNION ALL
SELECT 'event_enrollments', COUNT(*) FROM event_enrollments
UNION ALL
SELECT 'payment_plans', COUNT(*) FROM payment_plans
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'teacher_payments', COUNT(*) FROM teacher_payments
UNION ALL
SELECT 'teacher_payment_records', COUNT(*) FROM teacher_payment_records
UNION ALL
SELECT 'attendance', COUNT(*) FROM attendance;

-- ============================================
-- CLEANUP COMPLETE!
-- All data has been deleted.
-- Admin user has been preserved.
-- All ID sequences have been reset to 1.
-- ============================================
