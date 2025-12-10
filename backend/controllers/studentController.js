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
