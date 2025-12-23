import pool from '../config/database.js';
import bcrypt from 'bcrypt';

async function updateAdminUsers() {
  try {
    console.log('🔄 Admin kullanıcıları güncelleniyor...\n');

    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Admin kullanıcısını güncelle
    const adminResult = await pool.query(`
      INSERT INTO users (email, phone, password, role, full_name, is_active)
      VALUES ($1, $2, $3, $4, $5, true)
      ON CONFLICT (email) DO UPDATE 
      SET phone = EXCLUDED.phone,
          password = EXCLUDED.password,
          is_active = true
      RETURNING id, email, phone, role
    `, ['admin@sanatmerkezi.com', '5378934040', hashedPassword, 'admin', 'Admin User']);

    console.log('✅ Admin kullanıcısı güncellendi:');
    console.log('   📧 Email: admin@sanatmerkezi.com');
    console.log('   📱 Phone: 5378934040');
    console.log('   🔑 Password: admin123');
    console.log('   👤 Role: admin\n');

    // Admin2 (Müdür) kullanıcısını oluştur/güncelle
    const admin2Result = await pool.query(`
      INSERT INTO users (email, phone, password, role, full_name, is_active)
      VALUES ($1, $2, $3, $4, $5, true)
      ON CONFLICT (email) DO UPDATE 
      SET phone = EXCLUDED.phone,
          password = EXCLUDED.password,
          is_active = true
      RETURNING id, email, phone, role
    `, ['mudur@sanatmerkezi.com', '5541498388', hashedPassword, 'admin2', 'Müdür']);

    console.log('✅ Admin2 (Müdür) kullanıcısı güncellendi:');
    console.log('   📧 Email: mudur@sanatmerkezi.com');
    console.log('   📱 Phone: 5541498388');
    console.log('   🔑 Password: admin123');
    console.log('   👤 Role: admin2\n');

    // Tüm admin kullanıcılarını listele
    const allAdmins = await pool.query(`
      SELECT id, email, phone, role, full_name, is_active
      FROM users 
      WHERE role IN ('admin', 'admin2')
      ORDER BY role
    `);

    console.log('📋 Tüm Admin Kullanıcıları:');
    console.table(allAdmins.rows);

    console.log('\n✨ İşlem tamamlandı!');
    console.log('\n🔐 Giriş Bilgileri:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Admin:');
    console.log('  Email: admin@sanatmerkezi.com  VEYA  Phone: 5378934040');
    console.log('  Şifre: admin123');
    console.log('');
    console.log('Müdür (Admin2):');
    console.log('  Email: mudur@sanatmerkezi.com  VEYA  Phone: 5541498388');
    console.log('  Şifre: admin123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

updateAdminUsers();
