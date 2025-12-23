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

    if (!student.email) {
      return res.status(400).json({
        error: "Öğrencinin email adresi bulunmuyor. Lütfen önce email ekleyin.",
      });
    }

    if (!student.phone) {
      return res.status(400).json({
        error: "Öğrencinin telefon numarası bulunmuyor. Lütfen önce telefon ekleyin.",
      });
    }

    // Zaten user kaydı var mı?
    if (student.user_id) {
      const userResult = await pool.query(
        "SELECT is_active FROM users WHERE id = $1",
        [student.user_id]
      );
      
      if (userResult.rows.length > 0 && userResult.rows[0].is_active) {
        return res.status(400).json({
          error: "Bu öğrenci zaten aktif bir hesaba sahip. Şifre sıfırlama kullanın.",
        });
      }
    }

    // Aktivasyon token oluştur
    const activationToken = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + TOKEN_EXPIRY * 60 * 60 * 1000);

    // User kaydı oluştur veya güncelle
    let userId;
    if (student.user_id) {
      // Mevcut user kaydını güncelle
      await pool.query(
        `
        UPDATE users
        SET activation_token = $1,
            activation_token_expires = $2,
            is_active = false
        WHERE id = $3
      `,
        [activationToken, expires, student.user_id]
      );
      userId = student.user_id;
    } else {
      // Yeni user kaydı oluştur
      const userResult = await pool.query(
        `
        INSERT INTO users (email, phone, role, is_active, activation_token, activation_token_expires, full_name, password)
        VALUES ($1, $2, 'student', false, $3, $4, $5, 'temp')
        RETURNING id
      `,
        [
          student.email,
          student.phone,
          activationToken,
          expires,
          `${student.first_name} ${student.last_name}`,
        ]
      );

      userId = userResult.rows[0].id;

      // Student tablosunu güncelle
      await pool.query("UPDATE students SET user_id = $1 WHERE id = $2", [
        userId,
        id,
      ]);
    }

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

    if (!teacher.email) {
      return res.status(400).json({
        error: "Öğretmenin email adresi bulunmuyor. Lütfen önce email ekleyin.",
      });
    }

    if (!teacher.phone) {
      return res.status(400).json({
        error: "Öğretmenin telefon numarası bulunmuyor. Lütfen önce telefon ekleyin.",
      });
    }

    // Zaten user kaydı var mı?
    if (teacher.user_id) {
      const userResult = await pool.query(
        "SELECT is_active FROM users WHERE id = $1",
        [teacher.user_id]
      );
      
      if (userResult.rows.length > 0 && userResult.rows[0].is_active) {
        return res.status(400).json({
          error: "Bu öğretmen zaten aktif bir hesaba sahip. Şifre sıfırlama kullanın.",
        });
      }
    }

    const activationToken = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + TOKEN_EXPIRY * 60 * 60 * 1000);

    // User kaydı oluştur veya güncelle
    let userId;
    if (teacher.user_id) {
      // Mevcut user kaydını güncelle
      await pool.query(
        `
        UPDATE users
        SET activation_token = $1,
            activation_token_expires = $2,
            is_active = false
        WHERE id = $3
      `,
        [activationToken, expires, teacher.user_id]
      );
      userId = teacher.user_id;
    } else {
      // Yeni user kaydı oluştur
      const userResult = await pool.query(
        `
        INSERT INTO users (email, phone, role, is_active, activation_token, activation_token_expires, full_name, password)
        VALUES ($1, $2, 'teacher', false, $3, $4, $5, 'temp')
        RETURNING id
      `,
        [
          teacher.email,
          teacher.phone,
          activationToken,
          expires,
          `${teacher.first_name} ${teacher.last_name}`,
        ]
      );

      userId = userResult.rows[0].id;

      // Teacher tablosunu güncelle
      await pool.query("UPDATE teachers SET user_id = $1 WHERE id = $2", [
        userId,
        id,
      ]);
    }

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

// Şifre sıfırlama linki gönder (Admin tarafından)
export const sendPasswordReset = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const userResult = await pool.query(
      "SELECT * FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Kullanıcı bulunamadı" });
    }

    const user = userResult.rows[0];

    if (!user.email) {
      return res.status(400).json({
        error: "Kullanıcının email adresi bulunmuyor.",
      });
    }

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
      [resetToken, expires, userId]
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

    res.json({ message: "Şifre sıfırlama linki başarıyla gönderildi" });
  } catch (error) {
    next(error);
  }
};
