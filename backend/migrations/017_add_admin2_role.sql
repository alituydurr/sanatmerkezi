-- ============================================
-- ADMIN2 (MÜDÜR) ROLE MIGRATION
-- ============================================

-- 1. users tablosunda role enum'ına admin2 ekle
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'admin2', 'teacher', 'student'));

-- 2. Açıklama
COMMENT ON COLUMN users.role IS 'Kullanıcı rolü: admin (Yönetici), admin2 (Müdür), teacher (Öğretmen), student (Öğrenci)';
