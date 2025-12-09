-- Ödeme planı güncellemeleri için migration
-- Bu dosyayı çalıştırarak mevcut veritabanını güncelleyin

-- Payment plans tablosuna taksit tarihleri ekle
ALTER TABLE payment_plans 
ADD COLUMN IF NOT EXISTS installment_dates JSONB;

-- Payments tablosuna ödeme tarihi ekle (zaten var ama emin olmak için)
-- payment_date zaten var

-- Öğretmen ödemeleri için yeni tablo
CREATE TABLE IF NOT EXISTS teacher_payments (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
  month_year VARCHAR(7) NOT NULL,
  total_hours DECIMAL(10, 2) NOT NULL DEFAULT 0,
  hourly_rate DECIMAL(10, 2),
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(10, 2) DEFAULT 0,
  remaining_amount DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'completed')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(teacher_id, month_year)
);

-- Öğretmen ödeme kayıtları
CREATE TABLE IF NOT EXISTS teacher_payment_records (
  id SERIAL PRIMARY KEY,
  teacher_payment_id INTEGER REFERENCES teacher_payments(id) ON DELETE CASCADE,
  teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'credit_card', 'bank_transfer')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_teacher_payments_teacher_id ON teacher_payments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_payments_month_year ON teacher_payments(month_year);
CREATE INDEX IF NOT EXISTS idx_teacher_payment_records_teacher_payment_id ON teacher_payment_records(teacher_payment_id);
