-- ============================================
-- SANAT MERKEZİ YÖNETİM SİSTEMİ
-- COMPLETE DATABASE MIGRATION
-- ============================================
-- Bu dosya tüm veritabanı yapısını sıfırdan oluşturur
-- Tüm migration'ları birleştirir
-- ============================================

-- ============================================
-- USERS TABLE (Admin ve Öğretmen Kullanıcıları)
-- ============================================
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'teacher')),
  full_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STUDENTS TABLE (Öğrenciler)
-- ============================================
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  birth_date DATE,
  address TEXT,
  parent_name VARCHAR(255),
  parent_phone VARCHAR(20),
  enrollment_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated', 'completed')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TEACHERS TABLE (Öğretmenler)
-- ============================================
CREATE TABLE teachers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  specialization VARCHAR(255),
  bio TEXT,
  hire_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- COURSES TABLE (Kurslar)
-- ============================================
CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  course_type VARCHAR(50) CHECK (course_type IN ('group', 'individual')),
  capacity INTEGER,
  duration_minutes INTEGER,
  price DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- COURSE SCHEDULES TABLE (Ders Programı)
-- ============================================
CREATE TABLE course_schedules (
  id SERIAL PRIMARY KEY,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  start_date DATE,
  end_date DATE,
  specific_date DATE,
  is_recurring BOOLEAN DEFAULT true,
  room VARCHAR(100),
  teacher_fee DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN course_schedules.specific_date IS 'Specific date for the class. If set, day_of_week is ignored.';
COMMENT ON COLUMN course_schedules.is_recurring IS 'If true, repeats weekly on day_of_week. If false, occurs only on specific_date.';
COMMENT ON COLUMN course_schedules.student_id IS 'For individual lessons - links schedule to specific student';
COMMENT ON COLUMN course_schedules.teacher_fee IS 'Öğretmen ücreti (deneme dersleri, randevular ve özel etkinlikler için). Normal dersler için saat ücreti kullanılır.';

-- ============================================
-- STUDENT COURSES TABLE (Öğrenci-Kurs Kayıtları)
-- ============================================
CREATE TABLE student_courses (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, course_id)
);

-- ============================================
-- TEACHER COURSES TABLE (Öğretmen-Kurs Atamaları)
-- ============================================
CREATE TABLE teacher_courses (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  assigned_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(teacher_id, course_id)
);

-- ============================================
-- EVENTS TABLE (Etkinlikler)
-- ============================================
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'ongoing', 'completed', 'cancelled')),
  cancellation_reason TEXT,
  cancelled_at TIMESTAMP,
  cancelled_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- EVENT ENROLLMENTS TABLE (Etkinlik Kayıtları)
-- ============================================
CREATE TABLE event_enrollments (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial', 'cancelled')),
  paid_amount DECIMAL(10, 2) DEFAULT 0,
  payment_date TIMESTAMP,
  cancelled_amount DECIMAL(10, 2) DEFAULT 0,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMP,
  cancelled_by INTEGER REFERENCES users(id),
  UNIQUE(event_id, student_id)
);

-- ============================================
-- PAYMENT PLANS TABLE (Ödeme Planları)
-- ============================================
CREATE TABLE payment_plans (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  student_name VARCHAR(100),
  student_surname VARCHAR(100),
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  total_amount DECIMAL(10, 2) NOT NULL,
  installments INTEGER DEFAULT 1,
  installment_amount DECIMAL(10, 2) NOT NULL,
  installment_dates JSONB,
  start_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  cancellation_reason TEXT,
  cancelled_at TIMESTAMP,
  cancelled_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_student_info CHECK (
    student_id IS NOT NULL OR 
    (student_name IS NOT NULL AND student_surname IS NOT NULL)
  )
);

-- ============================================
-- PAYMENTS TABLE (Ödemeler)
-- ============================================
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  payment_plan_id INTEGER REFERENCES payment_plans(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'credit_card', 'bank_transfer')),
  installment_number INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TEACHER PAYMENTS TABLE (Öğretmen Ödemeleri)
-- ============================================
CREATE TABLE teacher_payments (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
  month_year VARCHAR(7) NOT NULL,
  total_hours DECIMAL(10, 2) NOT NULL DEFAULT 0,
  hourly_rate DECIMAL(10, 2),
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(10, 2) DEFAULT 0,
  remaining_amount DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'completed', 'cancelled')),
  cancellation_reason TEXT,
  cancelled_at TIMESTAMP,
  cancelled_by INTEGER REFERENCES users(id),
  notes TEXT,
  -- Genel Gider Modülü Alanları
  payment_type VARCHAR(20) DEFAULT 'teacher_salary' CHECK (payment_type IN ('teacher_salary', 'general_expense')),
  expense_category VARCHAR(100),
  invoice_number VARCHAR(50),
  vendor VARCHAR(200),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(teacher_id, month_year)
);

-- ============================================
-- TEACHER PAYMENT RECORDS TABLE (Öğretmen Ödeme Kayıtları)
-- ============================================
CREATE TABLE teacher_payment_records (
  id SERIAL PRIMARY KEY,
  teacher_payment_id INTEGER REFERENCES teacher_payments(id) ON DELETE CASCADE,
  teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'credit_card', 'bank_transfer')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ATTENDANCE TABLE (Yoklama)
-- ============================================
CREATE TABLE attendance (
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

COMMENT ON TABLE attendance IS 'Tracks student attendance for each scheduled lesson';
COMMENT ON COLUMN attendance.status IS 'present: student attended, absent: student did not attend, cancelled: lesson was cancelled';
COMMENT ON COLUMN teacher_payments.payment_type IS 'teacher_salary: Öğretmen maaşı, general_expense: Genel gider';
COMMENT ON COLUMN teacher_payments.expense_category IS 'Sadece general_expense için: Kira, Elektrik, Su, Malzeme, vb.';
COMMENT ON COLUMN teacher_payments.invoice_number IS 'Fatura numarası';
COMMENT ON COLUMN teacher_payments.vendor IS 'Tedarikçi veya firma adı';
COMMENT ON COLUMN teacher_payments.created_by IS 'Kaydı oluşturan kullanıcının ID si';


-- ============================================
-- INDEXES (Performans için)
-- ============================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_phone ON users(phone);

-- Students indexes
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_phone ON students(phone);

-- Teachers indexes
CREATE INDEX idx_teachers_user_id ON teachers(user_id);
CREATE INDEX idx_teachers_status ON teachers(status);
CREATE INDEX idx_teachers_email ON teachers(email);

-- Courses indexes
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_type ON courses(course_type);

-- Course schedules indexes
CREATE INDEX idx_course_schedules_course_id ON course_schedules(course_id);
CREATE INDEX idx_course_schedules_teacher_id ON course_schedules(teacher_id);
CREATE INDEX idx_course_schedules_student_id ON course_schedules(student_id);
CREATE INDEX idx_course_schedules_specific_date ON course_schedules(specific_date);
CREATE INDEX idx_course_schedules_day_of_week ON course_schedules(day_of_week);
CREATE INDEX idx_course_schedules_teacher_fee ON course_schedules(teacher_fee) WHERE teacher_fee > 0;

-- Student courses indexes
CREATE INDEX idx_student_courses_student_id ON student_courses(student_id);
CREATE INDEX idx_student_courses_course_id ON student_courses(course_id);
CREATE INDEX idx_student_courses_status ON student_courses(status);

-- Teacher courses indexes
CREATE INDEX idx_teacher_courses_teacher_id ON teacher_courses(teacher_id);
CREATE INDEX idx_teacher_courses_course_id ON teacher_courses(course_id);

-- Events indexes
CREATE INDEX idx_events_dates ON events(start_date, end_date);
CREATE INDEX idx_events_teacher ON events(teacher_id);
CREATE INDEX idx_events_status ON events(status);

-- Event enrollments indexes
CREATE INDEX idx_event_enrollments_event ON event_enrollments(event_id);
CREATE INDEX idx_event_enrollments_student ON event_enrollments(student_id);
CREATE INDEX idx_event_enrollments_payment_date ON event_enrollments(payment_date);
CREATE INDEX idx_event_enrollments_cancelled ON event_enrollments(cancelled_at);

-- Payment plans indexes
CREATE INDEX idx_payment_plans_student_id ON payment_plans(student_id);
CREATE INDEX idx_payment_plans_course_id ON payment_plans(course_id);
CREATE INDEX idx_payment_plans_status ON payment_plans(status);

-- Payments indexes
CREATE INDEX idx_payments_student_id ON payments(student_id);
CREATE INDEX idx_payments_payment_plan_id ON payments(payment_plan_id);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);

-- Teacher payments indexes
CREATE INDEX idx_teacher_payments_teacher_id ON teacher_payments(teacher_id);
CREATE INDEX idx_teacher_payments_month_year ON teacher_payments(month_year);
CREATE INDEX idx_teacher_payments_status ON teacher_payments(status);

-- Teacher payment records indexes
CREATE INDEX idx_teacher_payment_records_teacher_payment_id ON teacher_payment_records(teacher_payment_id);
CREATE INDEX idx_teacher_payment_records_teacher_id ON teacher_payment_records(teacher_id);

-- Attendance indexes
CREATE INDEX idx_attendance_schedule_date ON attendance(schedule_id, attendance_date);
CREATE INDEX idx_attendance_student_date ON attendance(student_id, attendance_date);
CREATE INDEX idx_attendance_status ON attendance(status);

-- ============================================
-- MİGRATİON TAMAMLANDI
-- ============================================
-- ✅ Tüm tablolar oluşturuldu
-- ✅ Tüm indexler eklendi
-- ✅ Tüm ilişkiler kuruldu
-- 
-- SONRAKİ ADIM: Admin kullanıcı oluşturmak için:
-- npm run init-db
-- 
-- Bu komut şunları oluşturacak:
-- - Admin kullanıcı (admin@sanatmerkezi.com / admin123)
-- - Örnek öğretmen (teacher@sanatmerkezi.com / teacher123)
-- ============================================
