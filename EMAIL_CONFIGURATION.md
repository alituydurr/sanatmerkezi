# 📧 Email Konfigürasyon Rehberi

## Genel Bakış

Sistem, öğrenci ve öğretmenlere hesap aktivasyon ve şifre sıfırlama linkleri göndermek için email servisi kullanır.

---

## 🔧 Kurulum Adımları

### 1. Gmail Uygulama Şifresi Oluşturma

#### Adım 1: 2 Adımlı Doğrulamayı Aktifleştirin

1. Google Hesabınıza gidin: https://myaccount.google.com
2. Sol menüden **"Güvenlik ve oturum açma"** seçin
3. **"2 Adımlı Doğrulama"** bölümünü bulun
4. Aktif değilse, aktifleştirin

#### Adım 2: Uygulama Şifresi Oluşturun

1. Direkt link: https://myaccount.google.com/apppasswords
2. Veya: Güvenlik → 2 Adımlı Doğrulama → Uygulama şifreleri
3. **"Uygulama seçin"**: Mail veya "Diğer (Özel ad)"
4. **"Cihaz seçin"**: Windows Bilgisayar veya "Diğer"
5. **Özel ad**: "Sanat Merkezi" yazın
6. **"Oluştur"** butonuna tıklayın
7. 16 haneli şifreyi kopyalayın (örnek: `abcd efgh ijkl mnop`)

---

### 2. Backend .env Dosyası Ayarları

**Dosya Yolu:** `backend/.env`

Aşağıdaki satırları `.env` dosyasına ekleyin:

```env
# ==================== EMAIL CONFIGURATION ====================

# SMTP Sunucu Ayarları (Gmail için)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

# Gmail Hesap Bilgileri
SMTP_USER=sirket-email@gmail.com
SMTP_PASS=abcdefghijklmnop

# Gönderen Bilgisi (Email'lerde görünecek)
EMAIL_FROM=ÜnzileArt Sanat Merkezi <sirket-email@gmail.com>

# Frontend URL (Aktivasyon linkleri için)
FRONTEND_URL=http://localhost:5173
```

---

### 3. Ayarların Açıklaması

| Ayar           | Açıklama                                    | Örnek Değer                      |
| -------------- | ------------------------------------------- | -------------------------------- |
| `SMTP_HOST`    | Gmail SMTP sunucusu                         | `smtp.gmail.com`                 |
| `SMTP_PORT`    | SMTP port numarası                          | `587` (TLS için)                 |
| `SMTP_USER`    | Şirket Gmail adresi                         | `info@unzileart.com`             |
| `SMTP_PASS`    | **Uygulama şifresi** (Gmail şifresi DEĞİL!) | `abcdefghijklmnop`               |
| `EMAIL_FROM`   | Email'lerde görünecek gönderen adı          | `ÜnzileArt <info@unzileart.com>` |
| `FRONTEND_URL` | Frontend URL (canlıda domain olacak)        | `https://portal.unzileart.com`   |

---

### 4. Alternatif Email Sağlayıcıları

#### **Outlook/Hotmail için:**

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=sirket-email@outlook.com
SMTP_PASS=outlook-sifreniz
```

#### **Yandex için:**

```env
SMTP_HOST=smtp.yandex.com
SMTP_PORT=587
SMTP_USER=sirket-email@yandex.com
SMTP_PASS=yandex-sifreniz
```

#### **Özel Domain Email için:**

```env
SMTP_HOST=mail.sirketdomain.com
SMTP_PORT=587
SMTP_USER=info@sirketdomain.com
SMTP_PASS=email-sifreniz
```

---

### 5. Test Etme

#### Backend'i Yeniden Başlatın

```bash
cd backend
npm run dev
```

#### Test Email Gönderimi

1. Admin panelinden bir öğrenci ekleyin
2. Öğrenci detay sayfasında **"Şifre Bağlantısı Gönder"** butonuna tıklayın
3. Email'in geldiğini kontrol edin

---

### 6. Sorun Giderme

#### ❌ Hata: "connect ECONNREFUSED"

**Çözüm:** `.env` dosyasındaki ayarları kontrol edin, backend'i yeniden başlatın.

#### ❌ Hata: "Invalid login"

**Çözüm:**

- Gmail şifresi yerine **uygulama şifresi** kullandığınızdan emin olun
- 2 Adımlı Doğrulama'nın aktif olduğunu kontrol edin

#### ❌ Hata: "Recipient address rejected"

**Çözüm:** Alıcı email adresinin geçerli olduğunu kontrol edin

#### ⚠️ Email Spam'e Düşüyor

**Çözüm:**

- Profesyonel bir domain email kullanın (örn: info@unzileart.com)
- SPF, DKIM, DMARC kayıtlarını domain'e ekleyin

---

### 7. Canlı Ortam için Öneriler

#### ✅ Profesyonel Email Kullanın

Gmail yerine şirket domain'i ile email kullanın:

- ✅ `info@unzileart.com`
- ✅ `noreply@unzileart.com`
- ❌ `kisisel-gmail@gmail.com`

#### ✅ Email Servisi Kullanın

Daha güvenilir email gönderimi için:

- **SendGrid** (Ücretsiz: 100 email/gün)
- **Mailgun** (Ücretsiz: 5000 email/ay)
- **AWS SES** (Çok ucuz, güvenilir)

#### ✅ FRONTEND_URL'i Güncelleyin

```env
FRONTEND_URL=https://portal.unzileart.com
```

---

## 📝 Kontrol Listesi

Canlıya almadan önce:

- [ ] Gmail uygulama şifresi oluşturuldu
- [ ] `.env` dosyasına email ayarları eklendi
- [ ] Backend yeniden başlatıldı
- [ ] Test email gönderildi ve alındı
- [ ] Aktivasyon linki çalışıyor
- [ ] Şifre sıfırlama linki çalışıyor
- [ ] Email'ler spam'e düşmüyor
- [ ] Canlı domain için FRONTEND_URL güncellendi

---

## 🆘 Destek

Sorun yaşarsanız:

1. Backend terminal loglarını kontrol edin
2. `.env` dosyasındaki ayarları tekrar gözden geçirin
3. Gmail hesabında "Daha az güvenli uygulamalara izin ver" ayarını kontrol edin

---

**Son Güncelleme:** 23 Aralık 2025
**Hazırlayan:** AI Assistant
