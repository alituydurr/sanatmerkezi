-- Events tablosuna iptal özellikleri ekle
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS cancelled_by INTEGER REFERENCES users(id);

-- İndeks ekle
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
