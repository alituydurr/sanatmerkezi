-- Ünzile Hanım için admin2 kullanıcısını güncelle
UPDATE users 
SET full_name = 'Ünzile'
WHERE email = 'mudur@sanatmerkezi.com';

-- Kontrol et
SELECT id, email, phone, role, full_name, is_active 
FROM users 
WHERE role = 'admin2';
