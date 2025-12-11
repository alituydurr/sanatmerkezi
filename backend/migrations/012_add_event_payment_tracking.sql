-- Event enrollments tablosuna ödeme takibi için alanlar ekle
ALTER TABLE event_enrollments 
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS cancelled_amount DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS cancelled_by INTEGER REFERENCES users(id);

-- İndeks ekle
CREATE INDEX IF NOT EXISTS idx_event_enrollments_payment_date ON event_enrollments(payment_date);
CREATE INDEX IF NOT EXISTS idx_event_enrollments_cancelled ON event_enrollments(cancelled_at);
