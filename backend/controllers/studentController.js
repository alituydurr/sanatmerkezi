import pool from '../config/database.js';

// Get all students (admin: all, teacher: only their students)
export const getAllStudents = async (req, res, next) => {
  try {
    let query;
    let params = [];

    if (req.user.role === 'admin') {
      query = `
        SELECT s.*, 
          COUNT(DISTINCT sc.course_id) as enrolled_courses
        FROM students s
        LEFT JOIN student_courses sc ON s.id = sc.student_id AND sc.status = 'active'
        GROUP BY s.id
        ORDER BY s.created_at DESC
      `;
    } else {
      // Teacher can only see students in their courses
      query = `
        SELECT DISTINCT s.*,
          COUNT(DISTINCT sc.course_id) as enrolled_courses
        FROM students s
        INNER JOIN student_courses sc ON s.id = sc.student_id
        INNER JOIN teacher_courses tc ON sc.course_id = tc.course_id
        INNER JOIN teachers t ON tc.teacher_id = t.id
        WHERE t.user_id = $1 AND sc.status = 'active'
        GROUP BY s.id
        ORDER BY s.created_at DESC
      `;
      params = [req.user.id];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

// Get student statistics
export const getStudentStats = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive,
        COUNT(*) FILTER (WHERE status = 'completed') as completed
      FROM students
    `);

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};


// Get student by ID
export const getStudentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM students WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get enrolled courses
    const coursesResult = await pool.query(`
      SELECT c.*, sc.enrollment_date, sc.status as enrollment_status
      FROM courses c
      INNER JOIN student_courses sc ON c.id = sc.course_id
      WHERE sc.student_id = $1
    `, [id]);

    // Get payment information
    const paymentResult = await pool.query(`
      SELECT 
        SUM(pp.total_amount) as total_amount,
        COALESCE(SUM(p.amount), 0) as paid_amount,
        SUM(pp.total_amount) - COALESCE(SUM(p.amount), 0) as remaining_amount,
        MAX(pp.installments) as installments,
        MAX(p.payment_date) as last_payment_date
      FROM payment_plans pp
      LEFT JOIN payments p ON pp.id = p.payment_plan_id
      WHERE pp.student_id = $1 AND pp.status = 'active'
    `, [id]);

    // Get next payment date from installment_dates
    let nextPaymentDate = null;
    if (paymentResult.rows[0].total_amount) {
      const datesResult = await pool.query(`
        SELECT installment_dates
        FROM payment_plans
        WHERE student_id = $1 AND status = 'active'
        ORDER BY created_at DESC
        LIMIT 1
      `, [id]);

      if (datesResult.rows.length > 0 && datesResult.rows[0].installment_dates) {
        const dates = datesResult.rows[0].installment_dates;
        const futureDates = dates.filter(d => new Date(d) > new Date());
        if (futureDates.length > 0) {
          nextPaymentDate = futureDates.sort()[0];
        }
      }
    }

    const paymentInfo = paymentResult.rows[0].total_amount ? {
      ...paymentResult.rows[0],
      next_payment_date: nextPaymentDate
    } : null;

    res.json({
      ...result.rows[0],
      courses: coursesResult.rows,
      payment_info: paymentInfo
    });
  } catch (error) {
    next(error);
  }
};

// Create student (admin only)
export const createStudent = async (req, res, next) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      birth_date,
      address,
      parent_name,
      parent_phone,
      notes
    } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    // Telefon numarası kontrolü
    if (phone) {
      // Telefon formatı kontrolü (0 olmadan 10 hane, 5 ile başlamalı)
      if (!/^5\d{9}$/.test(phone)) {
        return res.status(400).json({ 
          error: 'Geçerli bir telefon numarası giriniz (0 olmadan 10 haneli, 5 ile başlamalı)' 
        });
      }

      // Bu telefon numarası başka bir öğrencide var mı?
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

      // Bu telefon numarası bir öğretmende var mı?
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
    }

    const result = await pool.query(`
      INSERT INTO students (
        first_name, last_name, email, phone, birth_date,
        address, parent_name, parent_phone, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [first_name, last_name, email, phone, birth_date, address, parent_name, parent_phone, notes]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Update student (admin only)
export const updateStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      email,
      phone,
      birth_date,
      address,
      parent_name,
      parent_phone,
      status,
      notes
    } = req.body;

    // Telefon numarası kontrolü
    if (phone) {
      // Telefon formatı kontrolü (0 olmadan 10 hane, 5 ile başlamalı)
      if (!/^5\d{9}$/.test(phone)) {
        return res.status(400).json({ 
          error: 'Geçerli bir telefon numarası giriniz (0 olmadan 10 haneli, 5 ile başlamalı)' 
        });
      }

      // Bu telefon numarası başka bir öğrencide var mı? (kendisi hariç)
      const existingStudent = await pool.query(
        'SELECT id, first_name, last_name FROM students WHERE phone = $1 AND id != $2',
        [phone, id]
      );

      if (existingStudent.rows.length > 0) {
        const existing = existingStudent.rows[0];
        return res.status(400).json({ 
          error: `Bu telefon numarası zaten kayıtlı (Öğrenci: ${existing.first_name} ${existing.last_name})` 
        });
      }

      // Bu telefon numarası bir öğretmende var mı?
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
    }

    const result = await pool.query(`
      UPDATE students
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          email = COALESCE($3, email),
          phone = COALESCE($4, phone),
          birth_date = COALESCE($5, birth_date),
          address = COALESCE($6, address),
          parent_name = COALESCE($7, parent_name),
          parent_phone = COALESCE($8, parent_phone),
          status = COALESCE($9, status),
          notes = COALESCE($10, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `, [first_name, last_name, email, phone, birth_date, address, parent_name, parent_phone, status, notes, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Delete student (admin only)
export const deleteStudent = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if student has any payment plans
    const paymentCheck = await pool.query(
      'SELECT COUNT(*) as count FROM payment_plans WHERE student_id = $1',
      [id]
    );

    if (parseInt(paymentCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Bu öğrencinin ödeme planı bulunmaktadır. Önce ödeme planlarını iptal etmelisiniz.',
        hasPaymentPlans: true
      });
    }

    const result = await pool.query(
      'DELETE FROM students WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Enroll student in course
export const enrollStudentInCourse = async (req, res, next) => {
  try {
    const { studentId, courseId } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({ error: 'Student ID and Course ID are required' });
    }

    const result = await pool.query(`
      INSERT INTO student_courses (student_id, course_id)
      VALUES ($1, $2)
      RETURNING *
    `, [studentId, courseId]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Remove student from course
export const removeStudentFromCourse = async (req, res, next) => {
  try {
    const { studentId, courseId } = req.params;

    const result = await pool.query(
      'DELETE FROM student_courses WHERE student_id = $1 AND course_id = $2 RETURNING id',
      [studentId, courseId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    res.json({ message: 'Student removed from course successfully' });
  } catch (error) {
    next(error);
  }
};

// Get student's scheduled lessons
export const getStudentSchedules = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        cs.id,
        cs.specific_date::text as specific_date,
        cs.day_of_week,
        cs.start_time,
        cs.end_time,
        cs.room,
        c.id as course_id,
        c.name as course_name,
        c.course_type,
        t.id as teacher_id,
        t.first_name as teacher_first_name,
        t.last_name as teacher_last_name
      FROM course_schedules cs
      INNER JOIN courses c ON cs.course_id = c.id
      LEFT JOIN teachers t ON cs.teacher_id = t.id
      WHERE cs.student_id = $1
        AND cs.specific_date IS NOT NULL
        AND cs.specific_date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY cs.specific_date ASC, cs.start_time ASC
    `, [id]);
    
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

// Update all students' status based on their schedules (utility endpoint)
export const updateAllStudentsStatus = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Get all students
    const students = await pool.query('SELECT id FROM students');
    
    let updated = 0;
    for (const student of students.rows) {
      const studentId = student.id;

      // Check if student has any schedules
      const allSchedules = await pool.query(
        'SELECT COUNT(*) as total FROM course_schedules WHERE student_id = $1',
        [studentId]
      );

      const totalSchedules = parseInt(allSchedules.rows[0].total);

      // Check if student has future schedules
      const futureSchedules = await pool.query(
        'SELECT COUNT(*) as total FROM course_schedules WHERE student_id = $1 AND specific_date >= $2',
        [studentId, today]
      );

      const futureLessons = parseInt(futureSchedules.rows[0].total);

      let newStatus;
      if (totalSchedules === 0) {
        newStatus = 'inactive'; // No lessons at all
      } else if (futureLessons === 0) {
        newStatus = 'completed'; // All lessons are in the past
      } else {
        newStatus = 'active'; // Has future lessons
      }

      // Update student status
      await pool.query(
        'UPDATE students SET status = $1 WHERE id = $2',
        [newStatus, studentId]
      );
      updated++;
    }

    res.json({ 
      message: `${updated} öğrencinin durumu güncellendi`,
      updated 
    });
  } catch (error) {
    next(error);
  }
};
