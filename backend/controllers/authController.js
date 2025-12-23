import bcrypt from 'bcrypt';
import { validationResult } from 'express-validator';
import pool from '../config/database.js';
import { generateToken } from '../middleware/auth.js';
import crypto from 'crypto';
import {
  sendEmail,
  getActivationEmailTemplate,
  getResetPasswordEmailTemplate,
} from '../services/emailService.js';

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
const checkRateLimit = async (identifier) => {
  const result = await pool.query(
    `
    SELECT attempt_count, locked_until
    FROM login_attempts
    WHERE phone = $1
      AND last_attempt > NOW() - INTERVAL '${LOCK_DURATION} minutes'
    ORDER BY last_attempt DESC
    LIMIT 1
  `,
    [identifier]
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
        [identifier]
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
const recordFailedAttempt = async (identifier) => {
  await pool.query(
    `
    INSERT INTO login_attempts (phone, attempt_count, last_attempt)
    VALUES ($1, 1, NOW())
    ON CONFLICT (phone)
    DO UPDATE SET
      attempt_count = login_attempts.attempt_count + 1,
      last_attempt = NOW()
  `,
    [identifier]
  );
};

// Başarılı giriş - denemeleri temizle
const clearLoginAttempts = async (identifier) => {
  await pool.query("DELETE FROM login_attempts WHERE phone = $1", [identifier]);
};

// Login (Email veya Telefon ile)
export const login = async (req, res, next) => {
  try {
    const { email, phone, password } = req.body;
    const identifier = phone || email;

    if (!identifier || !password) {
      return res.status(400).json({
        error: "Email/Telefon ve şifre gereklidir",
      });
    }

    // Telefon ile giriş yapılıyorsa validasyon
    if (phone && !validatePhone(phone)) {
      return res.status(400).json({
        error:
          "Geçerli bir telefon numarası giriniz (0 olmadan 10 haneli, 5 ile başlamalı)",
      });
    }

    // Rate limiting kontrolü (telefon için)
    if (phone) {
      const rateLimit = await checkRateLimit(phone);
      if (!rateLimit.allowed) {
        return res.status(429).json({ error: rateLimit.message });
      }
    }

    // Kullanıcıyı bul (email veya telefon ile)
    const userResult = await pool.query(
      phone
        ? "SELECT * FROM users WHERE phone = $1"
        : "SELECT * FROM users WHERE email = $1",
      [identifier]
    );

    if (userResult.rows.length === 0) {
      if (phone) await recordFailedAttempt(phone);
      return res
        .status(401)
        .json({ error: "Telefon numarası/Email veya şifre hatalı" });
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
      if (phone) await recordFailedAttempt(phone);
      return res
        .status(401)
        .json({ error: "Telefon numarası/Email veya şifre hatalı" });
    }

    // Başarılı giriş
    if (phone) await clearLoginAttempts(phone);
    await pool.query("UPDATE users SET last_login = NOW() WHERE id = $1", [
      user.id,
    ]);

    // Generate token
    const token = generateToken(user);

    // Get additional info based on role
    let additionalInfo = null;
    if (user.role === 'teacher') {
      const teacherResult = await pool.query(
        'SELECT id, first_name, last_name, specialization FROM teachers WHERE user_id = $1',
        [user.id]
      );
      if (teacherResult.rows.length > 0) {
        additionalInfo = { teacher_info: teacherResult.rows[0] };
      }
    } else if (user.role === 'student') {
      const studentResult = await pool.query(
        'SELECT id, first_name, last_name FROM students WHERE user_id = $1',
        [user.id]
      );
      if (studentResult.rows.length > 0) {
        additionalInfo = { student_info: studentResult.rows[0] };
      }
    }

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        full_name: user.full_name,
        ...additionalInfo
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
    const { phone, email } = req.body;
    const identifier = phone || email;

    if (!identifier) {
      return res.status(400).json({
        error: "Telefon numarası veya email gereklidir",
      });
    }

    if (phone && !validatePhone(phone)) {
      return res.status(400).json({
        error: "Geçerli bir telefon numarası giriniz",
      });
    }

    const userResult = await pool.query(
      phone
        ? "SELECT * FROM users WHERE phone = $1 AND is_active = true"
        : "SELECT * FROM users WHERE email = $1 AND is_active = true",
      [identifier]
    );

    if (userResult.rows.length === 0) {
      // Güvenlik için aynı mesajı dön
      return res.json({
        message:
          "Eğer bu bilgi sistemde kayıtlıysa, şifre sıfırlama linki emailinize gönderildi.",
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
    const name = user.full_name || user.email.split("@")[0];
    const formattedPhone = user.phone ? `${user.phone.slice(0, 3)} ${user.phone.slice(3, 6)} ${user.phone.slice(6)}` : '';

    await sendEmail({
      to: user.email,
      subject: "Şifre Sıfırlama - ÜnzileArt Sanat Merkezi",
      html: getResetPasswordEmailTemplate(name, resetLink, formattedPhone),
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

// Get current user info
export const getCurrentUser = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, email, phone, role, full_name, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};
