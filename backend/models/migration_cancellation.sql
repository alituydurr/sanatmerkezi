-- İptal işlemleri için migration
-- Bu dosyayı çalıştırarak veritabanına iptal özellikleri ekleyin

-- Payment plans tablosuna iptal nedeni ekle
ALTER TABLE payment_plans 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS cancelled_by INTEGER REFERENCES users(id);

-- Teacher payments tablosuna iptal nedeni ekle
ALTER TABLE teacher_payments 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS cancelled_by INTEGER REFERENCES users(id);

-- Status değerlerini güncelle (cancelled ekle)
ALTER TABLE payment_plans 
DROP CONSTRAINT IF EXISTS payment_plans_status_check;

ALTER TABLE payment_plans 
ADD CONSTRAINT payment_plans_status_check 
CHECK (status IN ('active', 'completed', 'cancelled'));

ALTER TABLE teacher_payments 
DROP CONSTRAINT IF EXISTS teacher_payments_status_check;

ALTER TABLE teacher_payments 
ADD CONSTRAINT teacher_payments_status_check 
CHECK (status IN ('pending', 'partial', 'completed', 'cancelled'));

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_payment_plans_status ON payment_plans(status);
CREATE INDEX IF NOT EXISTS idx_teacher_payments_status ON teacher_payments(status);
