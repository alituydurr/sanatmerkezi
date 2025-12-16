# 🎓 Öğrenci ve Öğretmen Portal Sistemi - Kapsamlı Uygulama Rehberi

## 📋 GENEL BAKIŞ

### Sistem Özeti

Bu sistem, mevcut admin paneline ek olarak öğrenci ve öğretmen portalları ekler. Kullanıcılar telefon numarası ve şifre ile giriş yapar, rol bazlı yönlendirme ile kendi panellerine erişir.

### Temel Özellikler

- ✅ **Tek Giriş Ekranı**: Telefon + şifre ile giriş
- ✅ **Email Aktivasyonu**: 6 saatlik geçerli şifre oluşturma linki
- ✅ **Rol Bazlı Yönlendirme**: Admin/Öğrenci/Öğretmen
- ✅ **Güvenlik**: Rate limiting, güçlü şifre, token güvenliği
- ✅ **Responsive**: Mobil ve masaüstü uyumlu

### Mevcut Yapı

```
users tablosu (MEVCUT)
├─ id, email, password, role
├─ created_at, updated_at
└─ Admin kullanıcıları için kullanılıyor

students tablosu (MEVCUT)
├─ id, first_name, last_name, phone, email
└─ Öğrenci bilgileri

teachers tablosu (MEVCUT)
├─ id, first_name, last_name, phone, email
└─ Öğretmen bilgileri
```

### Yeni Yapı

```
users tablosu (GÜNCELLENMİŞ)
├─ Mevcut alanlar korunur
├─ + phone (telefon numarası - 0 olmadan)
├─ + is_active (hesap aktif mi?)
├─ + activation_token (aktivasyon token'ı)
├─ + activation_token_expires (token son kullanma)
├─ + reset_token (şifre sıfırlama token'ı)
├─ + reset_token_expires (token son kullanma)
└─ + last_login (son giriş zamanı)

students tablosu (GÜNCELLENMİŞ)
└─ + user_id (users tablosuna referans)

teachers tablosu (GÜNCELLENMİŞ)
└─ + user_id (users tablosuna referans)

login_attempts tablosu (YENİ)
├─ phone (telefon numarası)
├─ attempt_count (deneme sayısı)
├─ locked_until (kilit süresi)
└─ last_attempt (son deneme zamanı)
```

---

## 🗄️ VERİTABANI DEĞİŞİKLİKLERİ

### Migration Dosyası

`backend/migrations/add_user_portal_system.sql`

```sql
-- 1. users tablosuna yeni sütunlar ekle
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone VARCHAR(10) UNIQUE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS activation_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS activation_token_expires TIMESTAMP,
ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- 2. students tablosuna user_id ekle
ALTER TABLE students
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);

-- 3. teachers tablosuna user_id ekle
ALTER TABLE teachers
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);

-- 4. login_attempts tablosu oluştur (rate limiting için)
CREATE TABLE IF NOT EXISTS login_attempts (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(10) NOT NULL,
  attempt_count INTEGER DEFAULT 1,
  locked_until TIMESTAMP,
  last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_phone ON login_attempts(phone);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- 5. Mevcut admin kullanıcısını aktif yap
UPDATE users SET is_active = true WHERE role = 'admin';

COMMENT ON COLUMN users.phone IS 'Telefon numarası (0 olmadan, 10 haneli)';
COMMENT ON COLUMN users.is_active IS 'Hesap aktif mi? (email doğrulaması yapıldı mı?)';
COMMENT ON COLUMN users.activation_token IS 'Email aktivasyon token (6 saat geçerli)';
COMMENT ON COLUMN users.reset_token IS 'Şifre sıfırlama token (6 saat geçerli)';
COMMENT ON TABLE login_attempts IS 'Başarısız giriş denemeleri (brute force koruması)';
```

### Migration Çalıştırma

```bash
cd backend
psql -U postgres -d sanat_merkezi -f migrations/add_user_portal_system.sql
```

---

## 📦 GEREKLİ PAKETLER

### Backend

```bash
cd backend
npm install nodemailer
```

### Frontend

```bash
# Mevcut paketler yeterli
# react-router-dom zaten var
```

### .env Güncellemeleri

`backend/.env` dosyasına ekleyin:

```env
# Email Configuration (Gmail örneği)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
EMAIL_FROM=ÜnzileArt Sanat Merkezi <noreply@sanatmerkezi.com>

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Security
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOGIN_LOCK_DURATION_MINUTES=15
TOKEN_EXPIRY_HOURS=6
```

**Gmail App Password Oluşturma:**

1. Google Hesabı → Güvenlik
2. 2 Adımlı Doğrulama'yı aç
3. Uygulama Şifreleri → "Diğer" seç
4. "Sanat Merkezi" yaz → Oluştur
5. Oluşan şifreyi `SMTP_PASS` olarak kullan

---

## 🔐 BACKEND GELİŞTİRMELERİ

### 1. Email Servisi

`backend/services/emailService.js`

```javascript
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Email transporter oluştur
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Email gönderme fonksiyonu
export const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    console.log("Email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email send error:", error);
    throw error;
  }
};

// Aktivasyon email template
export const getActivationEmailTemplate = (name, activationLink, phone) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .info-box { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎨 ÜnzileArt Sanat Merkezi</h1>
        </div>
        <div class="content">
          <h2>Merhaba ${name},</h2>
          <p>ÜnzileArt Sanat Merkezi'ne hoş geldiniz!</p>
          <p>Hesabınızı aktifleştirmek ve şifrenizi oluşturmak için aşağıdaki butona tıklayın:</p>
          
          <div style="text-align: center;">
            <a href="${activationLink}" class="button">Hesabımı Aktifleştir</a>
          </div>
          
          <div class="info-box">
            <strong>📱 Telefon Numaranız:</strong> ${phone}<br>
            <small>Giriş yaparken bu telefon numarasını kullanacaksınız (0 olmadan)</small>
          </div>
          
          <p><strong>⏰ Önemli:</strong> Bu link 6 saat geçerlidir.</p>
          
          <p>Eğer bu hesabı siz oluşturmadıysanız, bu emaili görmezden gelebilirsiniz.</p>
          
          <div class="footer">
            <p>ÜnzileArt Sanat Merkezi<br>
            Bu otomatik bir emaildir, lütfen yanıtlamayın.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Şifre sıfırlama email template
export const getResetPasswordEmailTemplate = (name, resetLink, phone) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 15px 30px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .info-box { background: white; padding: 15px; border-left: 4px solid #f5576c; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔒 Şifre Sıfırlama</h1>
        </div>
        <div class="content">
          <h2>Merhaba ${name},</h2>
          <p>Şifrenizi sıfırlamak için bir talepte bulundunuz.</p>
          <p>Yeni şifrenizi oluşturmak için aşağıdaki butona tıklayın:</p>
          
          <div style="text-align: center;">
            <a href="${resetLink}" class="button">Şifremi Sıfırla</a>
          </div>
          
          <div class="info-box">
            <strong>📱 Telefon Numaranız:</strong> ${phone}
          </div>
          
          <p><strong>⏰ Önemli:</strong> Bu link 6 saat geçerlidir.</p>
          
          <p>Eğer bu talebi siz yapmadıysanız, bu emaili görmezden gelebilirsiniz.</p>
          
          <div class="footer">
            <p>ÜnzileArt Sanat Merkezi<br>
            Bu otomatik bir emaildir, lütfen yanıtlamayın.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};
```

### 2. Auth Controller

`backend/controllers/authController.js` - Güncellenmiş

```javascript
import pool from "../config/database.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import {
  sendEmail,
  getActivationEmailTemplate,
  getResetPasswordEmailTemplate,
} from "../services/emailService.js";

const SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;
const MAX_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
const LOCK_DURATION = parseInt(process.env.LOGIN_LOCK_DURATION_MINUTES) || 15;
const TOKEN_EXPIRY = parseInt(process.env.TOKEN_EXPIRY_HOURS) || 6;

// Şifre validasyonu
const validatePassword = (password) => {
  const errors = [];

  if (password.length < 8) {
    errors.push("Şifre en az 8 karakter olmalıdır");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Şifre en az bir büyük harf içermelidir");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Şifre en az bir küçük harf içermelidir");
  }
  if (!/\d/.test(password)) {
    errors.push("Şifre en az bir rakam içermelidir");
  }

  return { isValid: errors.length === 0, errors };
};

// Telefon validasyonu
const validatePhone = (phone) => {
  return /^5\d{9}$/.test(phone);
};

// Rate limiting kontrolü
const checkRateLimit = async (phone) => {
  const result = await pool.query(
    `
    SELECT attempt_count, locked_until
    FROM login_attempts
    WHERE phone = $1
      AND last_attempt > NOW() - INTERVAL '${LOCK_DURATION} minutes'
    ORDER BY last_attempt DESC
    LIMIT 1
  `,
    [phone]
  );

  if (result.rows.length > 0) {
    const { attempt_count, locked_until } = result.rows[0];

    if (locked_until && new Date(locked_until) > new Date()) {
      const remainingMinutes = Math.ceil(
        (new Date(locked_until) - new Date()) / 60000
      );
      return {
        allowed: false,
        message: `Çok fazla başarısız deneme. ${remainingMinutes} dakika sonra tekrar deneyin.`,
      };
    }

    if (attempt_count >= MAX_ATTEMPTS) {
      await pool.query(
        `
        UPDATE login_attempts
        SET locked_until = NOW() + INTERVAL '${LOCK_DURATION} minutes',
            last_attempt = NOW()
        WHERE phone = $1
      `,
        [phone]
      );

      return {
        allowed: false,
        message: `Çok fazla başarısız deneme. ${LOCK_DURATION} dakika sonra tekrar deneyin.`,
      };
    }
  }

  return { allowed: true };
};

// Başarısız deneme kaydet
const recordFailedAttempt = async (phone) => {
  await pool.query(
    `
    INSERT INTO login_attempts (phone, attempt_count, last_attempt)
    VALUES ($1, 1, NOW())
    ON CONFLICT (phone)
    DO UPDATE SET
      attempt_count = login_attempts.attempt_count + 1,
      last_attempt = NOW()
  `,
    [phone]
  );
};

// Başarılı giriş - denemeleri temizle
const clearLoginAttempts = async (phone) => {
  await pool.query("DELETE FROM login_attempts WHERE phone = $1", [phone]);
};

// Login
export const login = async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    // Telefon validasyonu
    if (!validatePhone(phone)) {
      return res.status(400).json({
        error:
          "Geçerli bir telefon numarası giriniz (0 olmadan 10 haneli, 5 ile başlamalı)",
      });
    }

    // Rate limiting kontrolü
    const rateLimit = await checkRateLimit(phone);
    if (!rateLimit.allowed) {
      return res.status(429).json({ error: rateLimit.message });
    }

    // Kullanıcıyı bul
    const userResult = await pool.query(
      "SELECT * FROM users WHERE phone = $1",
      [phone]
    );

    if (userResult.rows.length === 0) {
      await recordFailedAttempt(phone);
      return res
        .status(401)
        .json({ error: "Telefon numarası veya şifre hatalı" });
    }

    const user = userResult.rows[0];

    // Hesap aktif mi?
    if (!user.is_active) {
      return res.status(403).json({
        error:
          "Hesabınız henüz aktif değil. Lütfen emailinizi kontrol edin ve aktivasyon linkine tıklayın.",
      });
    }

    // Şifre kontrolü
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      await recordFailedAttempt(phone);
      return res
        .status(401)
        .json({ error: "Telefon numarası veya şifre hatalı" });
    }

    // Başarılı giriş
    await clearLoginAttempts(phone);
    await pool.query("UPDATE users SET last_login = NOW() WHERE id = $1", [
      user.id,
    ]);

    // JWT token oluştur
    const token = jwt.sign(
      {
        id: user.id,
        phone: user.phone,
        role: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Aktivasyon token doğrula ve şifre oluştur
export const activateAccount = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Token'ı doğrula
    const userResult = await pool.query(
      `
      SELECT * FROM users
      WHERE activation_token = $1
        AND activation_token_expires > NOW()
        AND is_active = false
    `,
      [token]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        error: "Geçersiz veya süresi dolmuş aktivasyon linki",
      });
    }

    const user = userResult.rows[0];

    // Şifre validasyonu
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ errors: passwordValidation.errors });
    }

    // Şifreyi hash'le
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Hesabı aktifleştir
    await pool.query(
      `
      UPDATE users
      SET password = $1,
          is_active = true,
          activation_token = NULL,
          activation_token_expires = NULL
      WHERE id = $2
    `,
      [hashedPassword, user.id]
    );

    res.json({
      message: "Hesabınız başarıyla aktifleştirildi. Giriş yapabilirsiniz.",
    });
  } catch (error) {
    next(error);
  }
};

// Şifre sıfırlama token oluştur
export const requestPasswordReset = async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!validatePhone(phone)) {
      return res.status(400).json({
        error: "Geçerli bir telefon numarası giriniz",
      });
    }

    const userResult = await pool.query(
      "SELECT * FROM users WHERE phone = $1 AND is_active = true",
      [phone]
    );

    if (userResult.rows.length === 0) {
      // Güvenlik için aynı mesajı dön
      return res.json({
        message:
          "Eğer bu telefon numarası sistemde kayıtlıysa, şifre sıfırlama linki emailinize gönderildi.",
      });
    }

    const user = userResult.rows[0];

    // Reset token oluştur
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + TOKEN_EXPIRY * 60 * 60 * 1000);

    await pool.query(
      `
      UPDATE users
      SET reset_token = $1,
          reset_token_expires = $2
      WHERE id = $3
    `,
      [resetToken, expires, user.id]
    );

    // Email gönder
    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const name = user.email.split("@")[0]; // Email'den isim al

    await sendEmail({
      to: user.email,
      subject: "Şifre Sıfırlama - ÜnzileArt Sanat Merkezi",
      html: getResetPasswordEmailTemplate(name, resetLink, user.phone),
    });

    res.json({
      message: "Şifre sıfırlama linki emailinize gönderildi.",
    });
  } catch (error) {
    next(error);
  }
};

// Şifre sıfırla
export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Token'ı doğrula
    const userResult = await pool.query(
      `
      SELECT * FROM users
      WHERE reset_token = $1
        AND reset_token_expires > NOW()
    `,
      [token]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        error: "Geçersiz veya süresi dolmuş şifre sıfırlama linki",
      });
    }

    const user = userResult.rows[0];

    // Şifre validasyonu
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ errors: passwordValidation.errors });
    }

    // Şifreyi hash'le
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Şifreyi güncelle
    await pool.query(
      `
      UPDATE users
      SET password = $1,
          reset_token = NULL,
          reset_token_expires = NULL
      WHERE id = $2
    `,
      [hashedPassword, user.id]
    );

    res.json({
      message: "Şifreniz başarıyla güncellendi. Giriş yapabilirsiniz.",
    });
  } catch (error) {
    next(error);
  }
};
```

### 3. User Management (Admin)

`backend/controllers/userManagementController.js` - YENİ

```javascript
import pool from "../config/database.js";
import crypto from "crypto";
import {
  sendEmail,
  getActivationEmailTemplate,
  getResetPasswordEmailTemplate,
} from "../services/emailService.js";

const TOKEN_EXPIRY = parseInt(process.env.TOKEN_EXPIRY_HOURS) || 6;

// Öğrenci için aktivasyon maili gönder
export const sendStudentActivation = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Öğrenciyi bul
    const studentResult = await pool.query(
      "SELECT * FROM students WHERE id = $1",
      [id]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: "Öğrenci bulunamadı" });
    }

    const student = studentResult.rows[0];

    // Zaten user kaydı var mı?
    if (student.user_id) {
      return res.status(400).json({
        error:
          "Bu öğrenci zaten aktif bir hesaba sahip. Şifre sıfırlama kullanın.",
      });
    }

    // User kaydı oluştur
    const activationToken = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + TOKEN_EXPIRY * 60 * 60 * 1000);

    const userResult = await pool.query(
      `
      INSERT INTO users (email, phone, role, is_active, activation_token, activation_token_expires)
      VALUES ($1, $2, 'student', false, $3, $4)
      RETURNING id
    `,
      [student.email, student.phone, activationToken, expires]
    );

    const userId = userResult.rows[0].id;

    // Student tablosunu güncelle
    await pool.query("UPDATE students SET user_id = $1 WHERE id = $2", [
      userId,
      id,
    ]);

    // Email gönder
    const activationLink = `${process.env.FRONTEND_URL}/activate/${activationToken}`;
    const name = `${student.first_name} ${student.last_name}`;
    const formattedPhone = `${student.phone.slice(0, 3)} ${student.phone.slice(
      3,
      6
    )} ${student.phone.slice(6)}`;

    await sendEmail({
      to: student.email,
      subject: "Hesap Aktivasyonu - ÜnzileArt Sanat Merkezi",
      html: getActivationEmailTemplate(name, activationLink, formattedPhone),
    });

    res.json({ message: "Aktivasyon maili başarıyla gönderildi" });
  } catch (error) {
    next(error);
  }
};

// Öğretmen için aktivasyon maili gönder
export const sendTeacherActivation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const teacherResult = await pool.query(
      "SELECT * FROM teachers WHERE id = $1",
      [id]
    );

    if (teacherResult.rows.length === 0) {
      return res.status(404).json({ error: "Öğretmen bulunamadı" });
    }

    const teacher = teacherResult.rows[0];

    if (teacher.user_id) {
      return res.status(400).json({
        error:
          "Bu öğretmen zaten aktif bir hesaba sahip. Şifre sıfırlama kullanın.",
      });
    }

    const activationToken = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + TOKEN_EXPIRY * 60 * 60 * 1000);

    const userResult = await pool.query(
      `
      INSERT INTO users (email, phone, role, is_active, activation_token, activation_token_expires)
      VALUES ($1, $2, 'teacher', false, $3, $4)
      RETURNING id
    `,
      [teacher.email, teacher.phone, activationToken, expires]
    );

    const userId = userResult.rows[0].id;

    await pool.query("UPDATE teachers SET user_id = $1 WHERE id = $2", [
      userId,
      id,
    ]);

    const activationLink = `${process.env.FRONTEND_URL}/activate/${activationToken}`;
    const name = `${teacher.first_name} ${teacher.last_name}`;
    const formattedPhone = `${teacher.phone.slice(0, 3)} ${teacher.phone.slice(
      3,
      6
    )} ${teacher.phone.slice(6)}`;

    await sendEmail({
      to: teacher.email,
      subject: "Hesap Aktivasyonu - ÜnzileArt Sanat Merkezi",
      html: getActivationEmailTemplate(name, activationLink, formattedPhone),
    });

    res.json({ message: "Aktivasyon maili başarıyla gönderildi" });
  } catch (error) {
    next(error);
  }
};

// Şifre sıfırlama maili gönder (hem öğrenci hem öğretmen)
export const sendPasswordResetEmail = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [
      userId,
    ]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Kullanıcı bulunamadı" });
    }

    const user = userResult.rows[0];

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + TOKEN_EXPIRY * 60 * 60 * 1000);

    await pool.query(
      `
      UPDATE users
      SET reset_token = $1,
          reset_token_expires = $2
      WHERE id = $3
    `,
      [resetToken, expires, userId]
    );

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const name = user.email.split("@")[0];
    const formattedPhone = `${user.phone.slice(0, 3)} ${user.phone.slice(
      3,
      6
    )} ${user.phone.slice(6)}`;

    await sendEmail({
      to: user.email,
      subject: "Şifre Sıfırlama - ÜnzileArt Sanat Merkezi",
      html: getResetPasswordEmailTemplate(name, resetLink, formattedPhone),
    });

    res.json({ message: "Şifre sıfırlama maili başarıyla gönderildi" });
  } catch (error) {
    next(error);
  }
};
```

### 4. Routes Güncellemeleri

`backend/routes/auth.js` - YENİ

```javascript
import express from "express";
import {
  login,
  activateAccount,
  requestPasswordReset,
  resetPassword,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/login", login);
router.post("/activate/:token", activateAccount);
router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password/:token", resetPassword);

export default router;
```

`backend/routes/userManagement.js` - YENİ

```javascript
import express from "express";
import { verifyToken, requireAdmin } from "../middleware/auth.js";
import {
  sendStudentActivation,
  sendTeacherActivation,
  sendPasswordResetEmail,
} from "../controllers/userManagementController.js";

const router = express.Router();

// Admin only routes
router.post(
  "/students/:id/send-activation",
  verifyToken,
  requireAdmin,
  sendStudentActivation
);
router.post(
  "/teachers/:id/send-activation",
  verifyToken,
  requireAdmin,
  sendTeacherActivation
);
router.post(
  "/users/:userId/send-reset",
  verifyToken,
  requireAdmin,
  sendPasswordResetEmail
);

export default router;
```

`backend/server.js` - Güncellenmiş

```javascript
import authRoutes from "./routes/auth.js";
import userManagementRoutes from "./routes/userManagement.js";

// ... mevcut kodlar

app.use("/api/auth", authRoutes);
app.use("/api/admin", userManagementRoutes);

// ... mevcut kodlar
```

---

## 🎨 FRONTEND GELİŞTİRMELERİ

### 1. Login Sayfası

`frontend/src/pages/Login.jsx` - YENİ

```javascript
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import "../pages/Students.css";

export default function Login() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const [formData, setFormData] = useState({
    phone: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Telefon numarasını temizle (0 varsa kaldır)
      const cleanPhone = formData.phone.replace(/\D/g, "").replace(/^0/, "");

      if (cleanPhone.length !== 10) {
        setError("Telefon numarası 10 haneli olmalıdır");
        setLoading(false);
        return;
      }

      if (!cleanPhone.startsWith("5")) {
        setError("Geçerli bir mobil numara giriniz (5XX)");
        setLoading(false);
        return;
      }

      const response = await authAPI.login({
        phone: cleanPhone,
        password: formData.password,
      });

      // Token'ı kaydet
      localStorage.setItem("auth_token", response.data.token);
      authLogin(response.data.user);

      // Role göre yönlendir
      switch (response.data.user.role) {
        case "admin":
          navigate("/dashboard");
          break;
        case "student":
          navigate("/student/dashboard");
          break;
        case "teacher":
          navigate("/teacher/dashboard");
          break;
        default:
          navigate("/");
      }
    } catch (error) {
      setError(error.response?.data?.error || "Giriş başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "40px",
          borderRadius: "20px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          width: "100%",
          maxWidth: "400px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h1 style={{ fontSize: "32px", marginBottom: "10px" }}>
            🎨 ÜnzileArt
          </h1>
          <p style={{ color: "#666" }}>Sanat Merkezi Yönetim Sistemi</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Telefon Numarası</label>
            <input
              type="tel"
              className="form-input"
              placeholder="5551234567"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              maxLength="11"
              required
            />
            <small style={{ color: "#666", fontSize: "12px" }}>
              0 olmadan 10 haneli telefon numaranızı girin
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Şifre</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
            />
          </div>

          {error && (
            <div
              style={{
                padding: "12px",
                background: "#fee",
                color: "#c33",
                borderRadius: "8px",
                marginBottom: "20px",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", padding: "15px" }}
            disabled={loading}
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>

          <div style={{ textAlign: "center", marginTop: "20px" }}>
            <a
              href="/forgot-password"
              style={{
                color: "#667eea",
                textDecoration: "none",
                fontSize: "14px",
              }}
            >
              Şifremi Unuttum
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 2. Aktivasyon Sayfası

`frontend/src/pages/Activate.jsx` - YENİ

```javascript
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";

export default function Activate() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
  });

  useEffect(() => {
    const { password } = formData;
    setPasswordStrength({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
    });
  }, [formData.password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Şifreler eşleşmiyor");
      return;
    }

    if (!Object.values(passwordStrength).every((v) => v)) {
      setError("Lütfen tüm şifre gereksinimlerini karşılayın");
      return;
    }

    setLoading(true);

    try {
      await authAPI.activate(token, { password: formData.password });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (error) {
      setError(error.response?.data?.error || "Aktivasyon başarısız");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
        <div
          style={{
            background: "white",
            padding: "40px",
            borderRadius: "20px",
            textAlign: "center",
            maxWidth: "400px",
          }}
        >
          <div style={{ fontSize: "64px", marginBottom: "20px" }}>✅</div>
          <h2>Hesabınız Aktifleştirildi!</h2>
          <p style={{ color: "#666", marginTop: "10px" }}>
            Giriş sayfasına yönlendiriliyorsunuz...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "40px",
          borderRadius: "20px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          width: "100%",
          maxWidth: "500px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h1 style={{ fontSize: "28px", marginBottom: "10px" }}>
            Hesap Aktivasyonu
          </h1>
          <p style={{ color: "#666" }}>Şifrenizi oluşturun</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Yeni Şifre</label>
            <input
              type="password"
              className="form-input"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Şifre Tekrar</label>
            <input
              type="password"
              className="form-input"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              required
            />
          </div>

          {/* Şifre Gereksinimleri */}
          <div
            style={{
              background: "#f9f9f9",
              padding: "15px",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            <p
              style={{
                fontWeight: "bold",
                marginBottom: "10px",
                fontSize: "14px",
              }}
            >
              Şifre Gereksinimleri:
            </p>
            <div style={{ fontSize: "13px" }}>
              <div
                style={{ color: passwordStrength.length ? "green" : "#666" }}
              >
                {passwordStrength.length ? "✅" : "⭕"} En az 8 karakter
              </div>
              <div
                style={{ color: passwordStrength.uppercase ? "green" : "#666" }}
              >
                {passwordStrength.uppercase ? "✅" : "⭕"} En az 1 büyük harf
              </div>
              <div
                style={{ color: passwordStrength.lowercase ? "green" : "#666" }}
              >
                {passwordStrength.lowercase ? "✅" : "⭕"} En az 1 küçük harf
              </div>
              <div
                style={{ color: passwordStrength.number ? "green" : "#666" }}
              >
                {passwordStrength.number ? "✅" : "⭕"} En az 1 rakam
              </div>
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: "12px",
                background: "#fee",
                color: "#c33",
                borderRadius: "8px",
                marginBottom: "20px",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", padding: "15px" }}
            disabled={loading}
          >
            {loading ? "Aktifleştiriliyor..." : "Hesabı Aktifleştir"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

### 3. API Servisi Güncellemeleri

`frontend/src/services/api.js` - Eklemeler

```javascript
// Mevcut kodlara ekle

export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials),
  activate: (token, data) => api.post(`/auth/activate/${token}`, data),
  forgotPassword: (data) => api.post("/auth/forgot-password", data),
  resetPassword: (token, data) =>
    api.post(`/auth/reset-password/${token}`, data),
  me: () => api.get("/auth/me"),
};

export const adminAPI = {
  // ... mevcut kodlar

  sendStudentActivation: (studentId) =>
    api.post(`/admin/students/${studentId}/send-activation`),
  sendTeacherActivation: (teacherId) =>
    api.post(`/admin/teachers/${teacherId}/send-activation`),
  sendPasswordReset: (userId) => api.post(`/admin/users/${userId}/send-reset`),
};
```

### 4. Admin Panel - Öğrenci Detay Güncellemesi

`frontend/src/pages/StudentDetail.jsx` - Eklemeler

```javascript
// Import ekle
import { adminAPI } from "../services/api";

// Component içine ekle
const [sendingEmail, setSendingEmail] = useState(false);

const handleSendActivation = async () => {
  if (!window.confirm("Aktivasyon maili göndermek istediğinize emin misiniz?"))
    return;

  setSendingEmail(true);
  try {
    await adminAPI.sendStudentActivation(id);
    alert("Aktivasyon maili başarıyla gönderildi");
  } catch (error) {
    alert(
      "Email gönderilirken hata oluştu: " +
        (error.response?.data?.error || error.message)
    );
  } finally {
    setSendingEmail(false);
  }
};

const handleSendPasswordReset = async () => {
  if (!student.user_id) {
    alert("Önce aktivasyon maili gönderin");
    return;
  }

  if (
    !window.confirm(
      "Şifre sıfırlama maili göndermek istediğinize emin misiniz?"
    )
  )
    return;

  setSendingEmail(true);
  try {
    await adminAPI.sendPasswordReset(student.user_id);
    alert("Şifre sıfırlama maili başarıyla gönderildi");
  } catch (error) {
    alert(
      "Email gönderilirken hata oluştu: " +
        (error.response?.data?.error || error.message)
    );
  } finally {
    setSendingEmail(false);
  }
};

// Render kısmına ekle (öğrenci bilgileri bölümünde)
<div className="section">
  <h2>Hesap Yönetimi</h2>
  <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
    {!student.user_id ? (
      <button
        onClick={handleSendActivation}
        className="btn btn-primary"
        disabled={sendingEmail}
      >
        📧 Aktivasyon Maili Gönder
      </button>
    ) : (
      <button
        onClick={handleSendPasswordReset}
        className="btn btn-secondary"
        disabled={sendingEmail}
      >
        🔄 Şifre Sıfırlama Maili Gönder
      </button>
    )}
  </div>
  {student.user_id && (
    <div
      style={{
        marginTop: "10px",
        padding: "10px",
        background: "#e8f5e9",
        borderRadius: "5px",
        fontSize: "14px",
      }}
    >
      ✅ Hesap aktif
    </div>
  )}
</div>;
```

### 5. Admin Panel - Öğretmen Detay Güncellemesi

Aynı şekilde `TeacherDetail.jsx`'e de ekleyin.

### 6. Routes Güncellemesi

`frontend/src/App.jsx`

```javascript
import Login from './pages/Login';
import Activate from './pages/Activate';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Routes içine ekle
<Route path="/login" element={<Login />} />
<Route path="/activate/:token" element={<Activate />} />
<Route path="/forgot-password" element={<ForgotPassword />} />
<Route path="/reset-password/:token" element={<ResetPassword />} />
```

---

## 🧪 TEST SENARYOLARI

### 1. Aktivasyon Testi

```
1. Admin → Öğrenci Ekle
   - İsim: Test Öğrenci
   - Email: test@example.com
   - Telefon: 5551234567

2. Admin → Öğrenci Detay → "Aktivasyon Maili Gönder"
   - ✅ Email gönderildi mesajı

3. Email kutusunu kontrol et
   - ✅ Aktivasyon emaili geldi
   - ✅ Link var

4. Link'e tıkla
   - ✅ Aktivasyon sayfası açıldı
   - ✅ Telefon numarası gösteriliyor

5. Şifre oluştur: "Test1234"
   - ✅ Tüm gereksinimler yeşil

6. Hesabı Aktifleştir
   - ✅ Başarılı mesajı
   - ✅ Login sayfasına yönlendi

7. Giriş yap
   - Telefon: 5551234567
   - Şifre: Test1234
   - ✅ Giriş başarılı
```

### 2. Rate Limiting Testi

```
1. Login sayfasına git
2. Yanlış şifre ile 5 kez dene
   - 1. deneme: ❌ Hata
   - 2. deneme: ❌ Hata
   - 3. deneme: ❌ Hata
   - 4. deneme: ❌ Hata
   - 5. deneme: ❌ Hata
   - ✅ "15 dakika sonra tekrar deneyin" mesajı

3. 15 dakika bekle
4. Doğru şifre ile dene
   - ✅ Giriş başarılı
```

### 3. Şifre Sıfırlama Testi

```
1. Login → "Şifremi Unuttum"
2. Telefon numarası gir: 5551234567
3. Email kontrol et
   - ✅ Şifre sıfırlama emaili geldi

4. Link'e tıkla
5. Yeni şifre oluştur: "NewPass123"
6. Şifreyi Sıfırla
   - ✅ Başarılı mesajı

7. Login sayfasından giriş yap
   - ✅ Yeni şifre ile giriş başarılı
```

---

## 📱 RESPONSIVE TASARIM

### Breakpoint'ler

```css
/* Mobile: 320px - 767px */
/* Tablet: 768px - 1023px */
/* Desktop: 1024px+ */

@media (max-width: 767px) {
  .login-container {
    padding: 20px;
    max-width: 100%;
  }

  .form-input {
    font-size: 16px; /* iOS zoom engellemek için */
  }
}
```

---

## 🚀 UYGULAMA SIRASI

### Faz 1: Backend Altyapısı (1 gün)

1. ✅ Migration'ı çalıştır
2. ✅ nodemailer kur ve test et
3. ✅ Email servisi oluştur
4. ✅ Auth controller oluştur
5. ✅ User management controller oluştur
6. ✅ Routes ekle

### Faz 2: Frontend Auth (1 gün)

1. ✅ Login sayfası
2. ✅ Activate sayfası
3. ✅ Forgot password sayfası
4. ✅ Reset password sayfası
5. ✅ API servisleri

### Faz 3: Admin Entegrasyonu (0.5 gün)

1. ✅ Öğrenci detayda butonlar
2. ✅ Öğretmen detayda butonlar
3. ✅ Öğrenci/Öğretmen ekleme formundan "Şifre" alanını kaldır

### Faz 4: Test (0.5 gün)

1. ✅ Aktivasyon testi
2. ✅ Rate limiting testi
3. ✅ Şifre sıfırlama testi

---

## 📝 ÖNEMLİ NOTLAR

1. **Gmail App Password**: Mutlaka app-specific password kullanın
2. **JWT_SECRET**: Production'da güçlü bir secret kullanın
3. **FRONTEND_URL**: Production'da gerçek domain'i kullanın
4. **Rate Limiting**: 24 saat sonra eski kayıtları temizleyin (cron job)
5. **Email Templates**: Kendi tasarımınıza göre özelleştirin

---

Yeni sohbette bu dokümanla adım adım uygulayabiliriz! 🚀
