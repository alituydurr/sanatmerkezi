import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase() {
  try {
    console.log('🚀 Initializing database...');

    // Read and execute schema
    const schemaPath = path.join(__dirname, '../models/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schema);
    console.log('✅ Database schema created successfully');

    // Create default admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await pool.query(`
      INSERT INTO users (email, phone, password, role, full_name, is_active)
      VALUES ($1, $2, $3, $4, $5, true)
      ON CONFLICT (email) DO UPDATE 
      SET phone = EXCLUDED.phone
    `, ['admin@sanatmerkezi.com', '5378934040', hashedPassword, 'admin', 'Admin User']);
    
    console.log('✅ Default admin user created/updated');
    console.log('📧 Email: admin@sanatmerkezi.com');
    console.log('📱 Phone: 5378934040');
    console.log('🔑 Password: admin123');

    // Create admin2 (Müdür) user
    await pool.query(`
      INSERT INTO users (email, phone, password, role, full_name, is_active)
      VALUES ($1, $2, $3, $4, $5, true)
      ON CONFLICT (email) DO UPDATE 
      SET phone = EXCLUDED.phone
    `, ['mudur@sanatmerkezi.com', '5541498388', hashedPassword, 'admin2', 'Müdür']);
    
    console.log('✅ Admin2 (Müdür) user created/updated');
    console.log('📧 Email: mudur@sanatmerkezi.com');
    console.log('📱 Phone: 5541498388');
    console.log('🔑 Password: admin123');

    // Create sample teacher
    const teacherPassword = await bcrypt.hash('teacher123', 10);
    const userResult = await pool.query(`
      INSERT INTO users (email, password, role, full_name, is_active)
      VALUES ($1, $2, $3, $4, true)
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `, ['teacher@sanatmerkezi.com', teacherPassword, 'teacher', 'Örnek Öğretmen']);

    if (userResult.rows.length > 0) {
      await pool.query(`
        INSERT INTO teachers (user_id, first_name, last_name, email, phone, specialization)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [userResult.rows[0].id, 'Örnek', 'Öğretmen', 'teacher@sanatmerkezi.com', '5551234567', 'Resim']);
      
      console.log('✅ Sample teacher created');
      console.log('📧 Email: teacher@sanatmerkezi.com');
      console.log('🔑 Password: teacher123');
    }

    console.log('\n✨ Database initialization completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

initDatabase();
