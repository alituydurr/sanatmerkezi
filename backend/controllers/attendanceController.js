import pool from '../config/database.js';

// Ders onaylama
export const confirmAttendance = async (req, res, next) => {
  try {
    const { schedule_id, attendance_date } = req.body;
    const teacher_id = req.user.teacher_id; // user'dan teacher_id al

    if (!schedule_id || !attendance_date) {
      return res.status(400).json({ error: 'Schedule ID and attendance date are required' });
    }

    // Attendance kaydı oluştur veya güncelle
    const result = await pool.query(
      `
      INSERT INTO attendance (
        course_schedule_id, 
        attendance_date, 
        confirmed_by_teacher,
        confirmation_date
      )
      VALUES ($1, $2, true, CURRENT_TIMESTAMP)
      ON CONFLICT (course_schedule_id, attendance_date)
      DO UPDATE SET 
        confirmed_by_teacher = true,
        confirmation_date = CURRENT_TIMESTAMP
      RETURNING *
    `,
      [schedule_id, attendance_date]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Öğretmenin attendance kayıtlarını getir
export const getTeacherAttendance = async (req, res, next) => {
  try {
    const teacher_id = req.user.teacher_id;
    const { start_date, end_date } = req.query;

    if (!teacher_id) {
      return res.status(400).json({ error: 'Teacher ID not found in user context' });
    }

    const result = await pool.query(
      `
      SELECT 
        a.*,
        cs.day_of_week,
        cs.start_time,
        cs.end_time,
        c.name as course_name
      FROM attendance a
      INNER JOIN course_schedules cs ON a.course_schedule_id = cs.id
      INNER JOIN courses c ON cs.course_id = c.id
      WHERE cs.teacher_id = $1
        AND a.attendance_date BETWEEN $2 AND $3
      ORDER BY a.attendance_date DESC
    `,
      [teacher_id, start_date, end_date]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

// Tüm attendance kayıtlarını getir (admin için)
export const getAllAttendance = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    const result = await pool.query(
      `
      SELECT 
        a.*,
        cs.day_of_week,
        cs.start_time,
        cs.end_time,
        c.name as course_name,
        t.first_name as teacher_first_name,
        t.last_name as teacher_last_name
      FROM attendance a
      INNER JOIN course_schedules cs ON a.course_schedule_id = cs.id
      INNER JOIN courses c ON cs.course_id = c.id
      LEFT JOIN teachers t ON cs.teacher_id = t.id
      WHERE a.attendance_date BETWEEN $1 AND $2
      ORDER BY a.attendance_date DESC
    `,
      [start_date, end_date]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};
