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
      from: process.env.EMAIL_FROM || 'ÜnzileArt Sanat Merkezi <noreply@sanatmerkezi.com>',
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
