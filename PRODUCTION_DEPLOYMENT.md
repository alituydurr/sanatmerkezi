# 🚀 Production Deployment Rehberi

## ⚠️ ÖNEMLİ GÜVENLİK KONTROL LİSTESİ

### 1. Environment Variables (`.env`)

Production'a deploy etmeden önce `.env` dosyasını güncelleyin:

```bash
# MUTLAKA DEĞİŞTİRİN!
NODE_ENV=production
JWT_SECRET=<güçlü-random-secret-buraya>
DB_PASSWORD=<güçlü-veritabanı-şifresi>
FRONTEND_URL=https://yourdomain.com

# Email ayarları
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**JWT Secret Oluşturma:**

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Admin Şifrelerini Değiştirin

```bash
cd backend
npm run update-admins
```

Veya manuel olarak:

```sql
UPDATE users
SET password = '<bcrypt-hash>'
WHERE role IN ('admin', 'admin2');
```

### 3. CORS Ayarları

✅ **Otomatik**: Production'da sadece `FRONTEND_URL` kabul edilir.

`backend/config/security.js` dosyası zaten hazır:

- Development: Local network IP'leri kabul eder
- Production: Sadece `FRONTEND_URL` kabul eder

### 4. HTTPS Zorunluluğu

Production'da **mutlaka HTTPS** kullanın:

- PWA özellikleri (Service Worker, Push Notifications) HTTPS gerektirir
- Güvenli veri iletimi için şarttır

### 5. Database Backup

Deploy öncesi mutlaka backup alın:

```bash
pg_dump -U postgres sanat_merkezi > backup_$(date +%Y%m%d).sql
```

---

## 📦 Build ve Deploy Adımları

### Frontend Build

```bash
cd frontend
npm run build
```

Build dosyaları `frontend/dist/` klasöründe oluşur.

### Backend Production Start

```bash
cd backend
NODE_ENV=production npm start
```

---

## 🔒 Güvenlik Özellikleri (Zaten Aktif)

✅ **Helmet.js** - Security headers
✅ **CORS** - Cross-origin protection
✅ **Rate Limiting** - Brute force koruması
✅ **bcrypt** - Şifre hashleme
✅ **JWT** - Token-based auth
✅ **Input Validation** - express-validator
✅ **SQL Injection Protection** - Parameterized queries

---

## 🌐 Network Erişimi (Development)

### Tablet/Mobil Cihazlardan Erişim

**Otomatik Çalışır!**

1. Bilgisayar ve tablet aynı WiFi'de olmalı
2. Frontend: `npm run dev` (--host parametresi zaten ekli)
3. Backend: `npm run dev` (0.0.0.0'da dinliyor)
4. Tablet'ten: `http://192.168.0.36:5173`

**CORS ayarları development'ta local network IP'lerini otomatik kabul eder.**

---

## 📱 PWA (Progressive Web App)

### Eksik: PNG İkonları

`frontend/public/` klasörüne ekleyin:

- `icon-192.png` (192x192)
- `icon-512.png` (512x512)

Logo dosyanızı (`IMG_7425.JPG`) PNG'ye çevirip bu boyutlarda kaydedin.

### Service Worker

✅ Zaten aktif: `frontend/public/sw.js`
✅ Manifest: `frontend/public/manifest.json`

---

## 📧 Email Entegrasyonu

### Gmail Kullanıyorsanız:

1. **Google Hesabı → Güvenlik**
2. **2 Adımlı Doğrulama**'yı aktif edin
3. **Uygulama Şifreleri** → "Diğer" → "Sanat Merkezi"
4. Oluşan şifreyi `.env` dosyasına ekleyin:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx  # App Password
EMAIL_FROM=ÜnzileArt Sanat Merkezi <noreply@sanatmerkezi.com>
```

### Email Fonksiyonları

✅ **Hesap Aktivasyonu** - Öğrenci/Öğretmen portal erişimi
✅ **Şifre Sıfırlama** - Unutulan şifre
✅ **Bildirimler** - Ödeme hatırlatmaları (opsiyonel)

Backend'de `services/emailService.js` zaten hazır.

---

## 🔍 Son Kontroller

### Deploy Öncesi Checklist:

- [ ] `.env` dosyası güncellendi (JWT_SECRET, passwords)
- [ ] Admin şifreleri değiştirildi
- [ ] Database backup alındı
- [ ] HTTPS sertifikası hazır
- [ ] FRONTEND_URL production URL'e ayarlandı
- [ ] Email ayarları test edildi
- [ ] PWA ikonları eklendi
- [ ] Frontend build başarılı
- [ ] Backend production modda test edildi

---

## 🆘 Sorun Giderme

### CORS Hatası

- Production'da `FRONTEND_URL` doğru mu?
- Backend yeniden başlatıldı mı?

### Email Gönderilmiyor

- Gmail App Password doğru mu?
- 2FA aktif mi?
- SMTP ayarları doğru mu?

### PWA Çalışmıyor

- HTTPS kullanılıyor mu?
- Service Worker kayıtlı mı? (Console'da kontrol edin)
- Manifest dosyası erişilebilir mi?

### Tablet'ten Bağlanamıyor

- Aynı WiFi ağında mı?
- Firewall port 5000 ve 5173'ü engelliyor mu?
- Backend `0.0.0.0`'da dinliyor mu?

---

## 📞 Destek

Herhangi bir sorun için sistem yöneticisi ile iletişime geçin.

**Başarılar! 🎉**
