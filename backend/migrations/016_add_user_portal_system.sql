-- ============================================
-- USER PORTAL SYSTEM MIGRATION
-- Öğrenci ve Öğretmen Portal Sistemi
-- ============================================

-- 1. users tablosuna yeni sütunlar ekle
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone VARCHAR(10) UNIQUE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS activation_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS activation_token_expires TIMESTAMP,
ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- 2. users tablosunda role enum'ına student ekle
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'teacher', 'student'));

-- 3. students tablosuna user_id ekle
ALTER TABLE students
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);

-- 4. login_attempts tablosu oluştur (rate limiting için)
CREATE TABLE IF NOT EXISTS login_attempts (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(10) NOT NULL UNIQUE,
  attempt_count INTEGER DEFAULT 1,
  locked_until TIMESTAMP,
  last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. İndeksler
CREATE INDEX IF NOT EXISTS idx_login_attempts_phone ON login_attempts(phone);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_activation_token ON users(activation_token);
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);

-- 6. Mevcut admin kullanıcısını aktif yap
UPDATE users SET is_active = true WHERE role = 'admin';

-- 7. Açıklamalar
COMMENT ON COLUMN users.phone IS 'Telefon numarası (0 olmadan, 10 haneli, 5 ile başlamalı)';
COMMENT ON COLUMN users.is_active IS 'Hesap aktif mi? (email doğrulaması yapıldı mı?)';
COMMENT ON COLUMN users.activation_token IS 'Email aktivasyon token (6 saat geçerli)';
COMMENT ON COLUMN users.reset_token IS 'Şifre sıfırlama token (6 saat geçerli)';
COMMENT ON TABLE login_attempts IS 'Başarısız giriş denemeleri (brute force koruması)';
