# Admin Kullanıcıları Güncelleme Rehberi

## 📋 Mevcut Admin Kullanıcıları

### Admin (Yönetici)

- **Email**: admin@sanatmerkezi.com
- **Telefon**: 5378934040
- **Şifre**: admin123
- **Rol**: admin
- **Erişim**: Tüm sistem

### Admin2 (Müdür)

- **Email**: mudur@sanatmerkezi.com
- **Telefon**: 5541498388
- **Şifre**: admin123
- **Rol**: admin2
- **Erişim**: Dashboard, Notlar, Görevler, Ödeme Takibi, Gider Takibi, Finansal Raporlar

---

## 🚀 Kullanıcıları Güncelleme

### Yöntem 1: Node.js Script (ÖNERİLEN)

```bash
cd backend
npm run update-admins
```

Bu script:

- ✅ Admin kullanıcısını telefon numarası ile günceller
- ✅ Admin2 kullanıcısını oluşturur/günceller
- ✅ Şifreleri otomatik hash'ler
- ✅ Tüm admin kullanıcılarını listeler

### Yöntem 2: pgAdmin4 veya psql

```sql
-- Admin kullanıcısını güncelle
UPDATE users
SET phone = '5378934040',
    is_active = true
WHERE email = 'admin@sanatmerkezi.com';

-- Admin2 kullanıcısını oluştur (şifre hash'ini değiştirin)
INSERT INTO users (email, phone, password, role, full_name, is_active)
VALUES (
  'mudur@sanatmerkezi.com',
  '5541498388',
  '$2b$10$...',  -- bcrypt hash
  'admin2',
  'Müdür',
  true
)
ON CONFLICT (email) DO UPDATE
SET phone = EXCLUDED.phone;
```

### Yöntem 3: Migration Dosyası

```bash
cd backend
psql -U postgres -d sanat_merkezi -f migrations/018_update_admin_phones.sql
```

---

## 🔐 Şifre Hash Oluşturma

Eğer şifreyi değiştirmek isterseniz:

```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('YeniSifre123', 10).then(hash => console.log(hash));"
```

---

## 📱 Giriş Yapma

### Email ile Giriş:

- Email: `admin@sanatmerkezi.com` veya `mudur@sanatmerkezi.com`
- Şifre: `admin123`

### Telefon ile Giriş:

- Telefon: `5378934040` (Admin) veya `5541498388` (Müdür)
- Şifre: `admin123`

**NOT**: Telefon numarasını **0 olmadan** girin!

---

## ⚠️ Önemli Notlar

1. **Üretim Ortamı**: Deploy etmeden önce mutlaka şifreleri değiştirin!
2. **Güvenlik**: `.env` dosyasını asla git'e commit etmeyin
3. **Telefon Formatı**: Telefon numaraları 10 haneli, 5 ile başlamalı (0 olmadan)
4. **Cleanup**: `CLEANUP_DATABASE.sql` çalıştırıldığında admin ve admin2 kullanıcıları korunur

---

## 🔄 Veritabanını Sıfırlama

Eğer veritabanını sıfırlamak isterseniz:

```bash
# 1. Veritabanını temizle (admin kullanıcıları korunur)
psql -U postgres -d sanat_merkezi -f backend/migrations/CLEANUP_DATABASE.sql

# 2. Migration'ları çalıştır
psql -U postgres -d sanat_merkezi -f backend/migrations/016_add_user_portal_system.sql
psql -U postgres -d sanat_merkezi -f backend/migrations/017_add_admin2_role.sql

# 3. Admin kullanıcılarını güncelle
cd backend
npm run update-admins
```

---

## 📞 İletişim

Herhangi bir sorun olursa sistem yöneticisi ile iletişime geçin.
