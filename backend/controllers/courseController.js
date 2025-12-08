import pool from '../config/database.js';

// Get all courses
export const getAllCourses = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT c.*,
        COUNT(DISTINCT sc.student_id) as enrolled_students,
        json_agg(DISTINCT jsonb_build_object(
          'id', t.id,
          'first_name', t.first_name,
          'last_name', t.last_name,
          'specialization', t.specialization
        )) FILTER (WHERE t.id IS NOT NULL) as teachers
      FROM courses c
      LEFT JOIN student_courses sc ON c.id = sc.course_id AND sc.status = 'active'
      LEFT JOIN teacher_courses tc ON c.id = tc.course_id
      LEFT JOIN teachers t ON tc.teacher_id = t.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

// Get course by ID
export const getCourseById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM courses WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Get enrolled students
    const studentsResult = await pool.query(`
      SELECT s.*, sc.enrollment_date, sc.status as enrollment_status
      FROM students s
      INNER JOIN student_courses sc ON s.id = sc.student_id
      WHERE sc.course_id = $1
    `, [id]);

    // Get assigned teachers
    const teachersResult = await pool.query(`
      SELECT t.*, tc.assigned_date
      FROM teachers t
      INNER JOIN teacher_courses tc ON t.id = tc.teacher_id
      WHERE tc.course_id = $1
    `, [id]);

    res.json({
      ...result.rows[0],
      students: studentsResult.rows,
      teachers: teachersResult.rows
    });
  } catch (error) {
    next(error);
  }
};

// Create course
export const createCourse = async (req, res, next) => {
  try {
    const {
      name,
      description,
      course_type,
      capacity,
      duration_minutes,
      price
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Course name is required' });
    }

    const result = await pool.query(`
      INSERT INTO courses (
        name, description, course_type, capacity, duration_minutes, price
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, description, course_type, capacity, duration_minutes, price]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Update course
export const updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      course_type,
      capacity,
      duration_minutes,
      price,
      status
    } = req.body;

    const result = await pool.query(`
      UPDATE courses
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          course_type = COALESCE($3, course_type),
          capacity = COALESCE($4, capacity),
          duration_minutes = COALESCE($5, duration_minutes),
          price = COALESCE($6, price),
          status = COALESCE($7, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [name, description, course_type, capacity, duration_minutes, price, status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Delete course
export const deleteCourse = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM courses WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    next(error);
  }
};
