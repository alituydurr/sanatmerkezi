-- ============================================
-- UPDATE ADMIN USERS WITH PHONE NUMBERS
-- ============================================
-- Bu script mevcut admin ve admin2 kullanıcılarını
-- telefon numaraları ile günceller

-- Admin kullanıcısını güncelle
UPDATE users 
SET phone = '5378934040',
    is_active = true
WHERE email = 'admin@sanatmerkezi.com';

-- Admin2 (Müdür) kullanıcısını oluştur veya güncelle
INSERT INTO users (email, phone, password, role, full_name, is_active)
VALUES (
  'mudur@sanatmerkezi.com', 
  '5541498388', 
  '$2b$10$YourHashedPasswordHere', -- Bu şifreyi bcrypt ile hash'lemeniz gerekiyor
  'admin2', 
  'Müdür',
  true
)
ON CONFLICT (email) DO UPDATE 
SET phone = EXCLUDED.phone,
    is_active = true;

-- Sonuçları kontrol et
SELECT 
  id,
  email,
  phone,
  role,
  full_name,
  is_active
FROM users 
WHERE role IN ('admin', 'admin2')
ORDER BY role;

-- ============================================
-- NOT: Şifre hash'i için aşağıdaki komutu kullanın:
-- node -e "const bcrypt = require('bcrypt'); bcrypt.hash('admin123', 10).then(hash => console.log(hash));"
-- ============================================
