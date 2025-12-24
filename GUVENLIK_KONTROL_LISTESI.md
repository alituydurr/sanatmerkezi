# 🔒 Production Güvenlik Kontrol Listesi

## ✅ Deploy Öncesi Zorunlu Kontroller

### 1. Environment Variables

```bash
# backend/.env
NODE_ENV=production
JWT_SECRET=<güçlü-random-64-karakter>
FRONTEND_URL=https://yourdomain.com
DB_PASSWORD=<güçlü-veritabanı-şifresi>
```

**Kontrol:**

- [ ] `NODE_ENV=production` ayarlandı mı?
- [ ] `JWT_SECRET` değiştirildi mi? (development'takini kullanmayın!)
- [ ] `FRONTEND_URL` production domain'e ayarlandı mı?
- [ ] Tüm şifreler güçlü mü?

---

### 2. Frontend Build Configuration

```bash
# frontend/.env.production
VITE_API_URL=https://api.yourdomain.com
```

**Kontrol:**

- [ ] `.env.production` dosyası oluşturuldu mu?
- [ ] `VITE_API_URL` production API URL'e ayarlandı mı?
- [ ] Build komutu çalıştırıldı mı? (`npm run build`)

---

### 3. CORS Ayarları

**Otomatik:** `NODE_ENV=production` olduğunda:

- ✅ Sadece `FRONTEND_URL` kabul edilir
- ✅ Local network erişimi kapanır
- ✅ Development regex'leri devre dışı kalır

**Kontrol:**

- [ ] `backend/config/security.js` dosyası değiştirilmedi mi?
- [ ] CORS ayarları default haliyle mi?

---

### 4. HTTPS Zorunluluğu

**Otomatik:** `NODE_ENV=production` olduğunda:

- ✅ HTTP istekleri HTTPS'e yönlendirilir
- ✅ Helmet security headers aktif
- ✅ HSTS (HTTP Strict Transport Security) aktif

**Kontrol:**

- [ ] SSL sertifikası yüklendi mi?
- [ ] Domain HTTPS ile erişilebiliyor mu?

---

### 5. Database Güvenliği

```sql
-- Admin şifrelerini değiştirin
UPDATE users
SET password = '<yeni-bcrypt-hash>'
WHERE role IN ('admin', 'admin2');
```

**Kontrol:**

- [ ] Admin şifreleri değiştirildi mi?
- [ ] Database backup alındı mı?
- [ ] Database sadece localhost'tan erişilebilir mi?

---

### 6. Firewall Ayarları

**Production Server:**

- ✅ Port 80 (HTTP) → 443'e yönlendir
- ✅ Port 443 (HTTPS) → Açık
- ✅ Port 5000 (Backend API) → Sadece localhost
- ✅ Port 5432 (PostgreSQL) → Sadece localhost

**Kontrol:**

- [ ] Firewall kuralları ayarlandı mı?
- [ ] Sadece gerekli portlar açık mı?
- [ ] Database dışarıdan erişilebilir değil mi?

---

### 7. Git Güvenliği

```bash
# .gitignore kontrol
.env
.env.local
.env.production
node_modules/
```

**Kontrol:**

- [ ] `.env` dosyası git'te yok mu?
- [ ] Hassas bilgiler commit edilmedi mi?
- [ ] `.gitignore` dosyası doğru mu?

---

## 🚨 Güvenlik Açıkları (Yapılmaması Gerekenler)

### ❌ ASLA YAPMAYIN:

1. **`.env` dosyasını git'e commit etmeyin**

   ```bash
   # Yanlış!
   git add .env
   ```

2. **Development JWT_SECRET'ı production'da kullanmayın**

   ```bash
   # Yanlış!
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
   ```

3. **Database'i internet'e açmayın**

   ```bash
   # Yanlış!
   # PostgreSQL 0.0.0.0'da dinlememeli
   ```

4. **HTTPS olmadan deploy etmeyin**

   ```bash
   # Yanlış!
   # HTTP ile production'a çıkmayın
   ```

5. **CORS'u tamamen kapatmayın**
   ```javascript
   // Yanlış!
   app.use(cors({ origin: "*" }));
   ```

---

## ✅ Güvenlik Özellikleri (Zaten Aktif)

### Backend:

- ✅ Helmet.js (Security headers)
- ✅ CORS (Cross-origin protection)
- ✅ Rate Limiting (Brute force koruması)
- ✅ bcrypt (Şifre hashleme)
- ✅ JWT (Token-based auth)
- ✅ express-validator (Input validation)
- ✅ Parameterized queries (SQL injection koruması)
- ✅ HTTPS redirect (Production'da)

### Frontend:

- ✅ Environment-based API URL
- ✅ JWT token localStorage'da
- ✅ XSS koruması (React default)
- ✅ CSRF token (gerekirse eklenebilir)

---

## 📊 Güvenlik Seviyeleri

### Development (Şu an):

```
Güvenlik Seviyesi: ORTA
- Local network erişimi: ✅ Açık
- CORS: Esnek (local IP'ler)
- HTTPS: Opsiyonel
- Tablet erişimi: ✅ Aktif
```

### Production (Deploy sonrası):

```
Güvenlik Seviyesi: YÜKSEK
- Local network erişimi: ❌ Kapalı
- CORS: Katı (sadece FRONTEND_URL)
- HTTPS: ✅ Zorunlu
- Tablet erişimi: ❌ Devre dışı
```

---

## 🔍 Güvenlik Testi

### Production'da Test Edin:

1. **CORS Testi:**

   ```bash
   # Farklı bir domain'den istek atın
   curl -H "Origin: https://evil.com" https://api.yourdomain.com/api/students
   # Sonuç: CORS hatası almalısınız ✅
   ```

2. **HTTPS Testi:**

   ```bash
   # HTTP ile erişmeyi deneyin
   curl http://yourdomain.com
   # Sonuç: HTTPS'e yönlendirilmeli ✅
   ```

3. **JWT Testi:**
   ```bash
   # Token olmadan API'ye istek atın
   curl https://api.yourdomain.com/api/students
   # Sonuç: 401 Unauthorized ✅
   ```

---

## 📞 Güvenlik Sorunları

Herhangi bir güvenlik endişeniz varsa:

1. `PRODUCTION_DEPLOYMENT.md` dosyasını okuyun
2. Güvenlik kontrol listesini takip edin
3. Deploy öncesi test edin

**Önemli:** Bu ayarlar production-ready ve güvenlidir! 🔒
