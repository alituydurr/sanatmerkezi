import pool from '../config/database.js';
import bcrypt from 'bcrypt';

// Get all teachers
export const getAllTeachers = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT t.*,
        COUNT(DISTINCT tc.course_id) as assigned_courses
      FROM teachers t
      LEFT JOIN teacher_courses tc ON t.id = tc.teacher_id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

// Get teacher by ID
export const getTeacherById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Öğretmen bilgileri
    const teacherResult = await pool.query(
      'SELECT * FROM teachers WHERE id = $1',
      [id]
    );

    if (teacherResult.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Verdiği dersler (courses)
    const coursesResult = await pool.query(`
      SELECT c.*, tc.assigned_date
      FROM courses c
      INNER JOIN teacher_courses tc ON c.id = tc.course_id
      WHERE tc.teacher_id = $1
    `, [id]);

    // Ders programı (schedules) - Sadece recurring dersler
    const schedulesResult = await pool.query(`
      SELECT cs.*, c.name as course_name
      FROM course_schedules cs
      INNER JOIN courses c ON cs.course_id = c.id
      WHERE cs.teacher_id = $1 AND cs.is_recurring = true
      ORDER BY cs.day_of_week, cs.start_time
    `, [id]);

    // Toplam ders saati hesapla
    const hoursResult = await pool.query(`
      SELECT 
        SUM(EXTRACT(EPOCH FROM (cs.end_time - cs.start_time)) / 3600) as total_hours_per_week
      FROM course_schedules cs
      WHERE cs.teacher_id = $1 AND cs.is_recurring = true
    `, [id]);

    // Ödeme bilgileri
    const paymentResult = await pool.query(`
      SELECT 
        SUM(tp.total_amount) as total_amount,
        SUM(tp.paid_amount) as paid_amount,
        SUM(tp.remaining_amount) as remaining_amount
      FROM teacher_payments tp
      WHERE tp.teacher_id = $1
    `, [id]);

    res.json({
      ...teacherResult.rows[0],
      courses: coursesResult.rows,
      schedules: schedulesResult.rows,
      hours_per_week: hoursResult.rows[0].total_hours_per_week || 0,
      payment_info: paymentResult.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// Create teacher (admin only)
export const createTeacher = async (req, res, next) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      specialization,
      bio,
      password
    } = req.body;

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ error: 'First name, last name, email, and password are required' });
    }

    // Telefon numarası kontrolü
    if (phone) {
      // Telefon formatı kontrolü (0 olmadan 10 hane, 5 ile başlamalı)
      if (!/^5\d{9}$/.test(phone)) {
        return res.status(400).json({ 
          error: 'Geçerli bir telefon numarası giriniz (0 olmadan 10 haneli, 5 ile başlamalı)' 
        });
      }

      // Bu telefon numarası başka bir öğretmende var mı?
      const existingTeacher = await pool.query(
        'SELECT id, first_name, last_name FROM teachers WHERE phone = $1',
        [phone]
      );

      if (existingTeacher.rows.length > 0) {
        const existing = existingTeacher.rows[0];
        return res.status(400).json({ 
          error: `Bu telefon numarası zaten kayıtlı (Öğretmen: ${existing.first_name} ${existing.last_name})` 
        });
      }

      // Bu telefon numarası bir öğrencide var mı?
      const existingStudent = await pool.query(
        'SELECT id, first_name, last_name FROM students WHERE phone = $1',
        [phone]
      );

      if (existingStudent.rows.length > 0) {
        const existing = existingStudent.rows[0];
        return res.status(400).json({ 
          error: `Bu telefon numarası zaten kayıtlı (Öğrenci: ${existing.first_name} ${existing.last_name})` 
        });
      }
    }

    // Create user account first
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const userResult = await pool.query(`
      INSERT INTO users (email, password, role, full_name)
      VALUES ($1, $2, 'teacher', $3)
      RETURNING id
    `, [email, hashedPassword, `${first_name} ${last_name}`]);

    const userId = userResult.rows[0].id;

    // Create teacher record
    const teacherResult = await pool.query(`
      INSERT INTO teachers (
        user_id, first_name, last_name, email, phone, specialization, bio
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [userId, first_name, last_name, email, phone, specialization, bio]);

    res.status(201).json(teacherResult.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Update teacher (admin only)
export const updateTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      email,
      phone,
      specialization,
      bio,
      status
    } = req.body;

    // Telefon numarası kontrolü
    if (phone) {
      // Telefon formatı kontrolü (0 olmadan 10 hane, 5 ile başlamalı)
      if (!/^5\d{9}$/.test(phone)) {
        return res.status(400).json({ 
          error: 'Geçerli bir telefon numarası giriniz (0 olmadan 10 haneli, 5 ile başlamalı)' 
        });
      }

      // Bu telefon numarası başka bir öğretmende var mı? (kendisi hariç)
      const existingTeacher = await pool.query(
        'SELECT id, first_name, last_name FROM teachers WHERE phone = $1 AND id != $2',
        [phone, id]
      );

      if (existingTeacher.rows.length > 0) {
        const existing = existingTeacher.rows[0];
        return res.status(400).json({ 
          error: `Bu telefon numarası zaten kayıtlı (Öğretmen: ${existing.first_name} ${existing.last_name})` 
        });
      }

      // Bu telefon numarası bir öğrencide var mı?
      const existingStudent = await pool.query(
        'SELECT id, first_name, last_name FROM students WHERE phone = $1',
        [phone]
      );

      if (existingStudent.rows.length > 0) {
        const existing = existingStudent.rows[0];
        return res.status(400).json({ 
          error: `Bu telefon numarası zaten kayıtlı (Öğrenci: ${existing.first_name} ${existing.last_name})` 
        });
      }
    }

    const result = await pool.query(`
      UPDATE teachers
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          email = COALESCE($3, email),
          phone = COALESCE($4, phone),
          specialization = COALESCE($5, specialization),
          bio = COALESCE($6, bio),
          status = COALESCE($7, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [first_name, last_name, email, phone, specialization, bio, status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Delete teacher (admin only)
export const deleteTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get user_id before deleting
    const teacherResult = await pool.query(
      'SELECT user_id FROM teachers WHERE id = $1',
      [id]
    );

    if (teacherResult.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const userId = teacherResult.rows[0].user_id;

    // Delete teacher (will cascade to user due to foreign key)
    await pool.query('DELETE FROM teachers WHERE id = $1', [id]);
    
    // Delete user account
    if (userId) {
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    }

    res.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Assign teacher to course
export const assignTeacherToCourse = async (req, res, next) => {
  try {
    const { teacherId, courseId } = req.body;

    if (!teacherId || !courseId) {
      return res.status(400).json({ error: 'Teacher ID and Course ID are required' });
    }

    const result = await pool.query(`
      INSERT INTO teacher_courses (teacher_id, course_id)
      VALUES ($1, $2)
      RETURNING *
    `, [teacherId, courseId]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Remove teacher from course
export const removeTeacherFromCourse = async (req, res, next) => {
  try {
    const { teacherId, courseId } = req.params;

    const result = await pool.query(
      'DELETE FROM teacher_courses WHERE teacher_id = $1 AND course_id = $2 RETURNING id',
      [teacherId, courseId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json({ message: 'Teacher removed from course successfully' });
  } catch (error) {
    next(error);
  }
};

// Get teacher schedules (all lessons including student-based and daily appointments)
export const getTeacherSchedules = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Fetch all schedules for this teacher
    // Include student name from students table OR from room field (for appointments)
    const result = await pool.query(`
      SELECT 
        cs.id,
        cs.course_id,
        cs.teacher_id,
        cs.student_id,
        cs.day_of_week,
        cs.start_time,
        cs.end_time,
        cs.room,
        cs.specific_date::text as specific_date,
        cs.is_recurring,
        c.name as course_name,
        c.course_type,
        s.first_name as student_first_name,
        s.last_name as student_last_name,
        t.first_name as teacher_first_name,
        t.last_name as teacher_last_name
      FROM course_schedules cs
      LEFT JOIN courses c ON cs.course_id = c.id
      LEFT JOIN students s ON cs.student_id = s.id
      LEFT JOIN teachers t ON cs.teacher_id = t.id
      WHERE cs.teacher_id = $1
        AND cs.specific_date IS NOT NULL
      ORDER BY cs.specific_date DESC, cs.start_time
    `, [id]);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

// Get teacher attendance data
export const getTeacherAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Fetch all attendance records for schedules taught by this teacher
    const result = await pool.query(`
      SELECT 
        a.id,
        a.schedule_id,
        a.student_id,
        a.attendance_date::text as attendance_date,
        a.status,
        a.notes,
        a.created_at,
        cs.specific_date::text as schedule_date
      FROM attendance a
      INNER JOIN course_schedules cs ON a.schedule_id = cs.id
      WHERE cs.teacher_id = $1
      ORDER BY a.attendance_date DESC
    `, [id]);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};
