import pool from '../config/database.js';

// Mark attendance for a student
export const markAttendance = async (req, res, next) => {
  try {
    const { schedule_id, student_id, attendance_date, status, notes } = req.body;

    if (!schedule_id || !attendance_date || !status) {
      return res.status(400).json({ 
        error: 'Schedule ID, attendance date, and status are required' 
      });
    }

    // Validate status
    const validStatuses = ['present', 'absent', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be: present, absent, or cancelled' 
      });
    }

    // Use UPSERT (INSERT ... ON CONFLICT) to insert or update
    const result = await pool.query(
      `INSERT INTO attendance (schedule_id, student_id, attendance_date, status, notes, marked_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (schedule_id, student_id, attendance_date)
       DO UPDATE SET 
         status = EXCLUDED.status,
         notes = EXCLUDED.notes,
         marked_by = EXCLUDED.marked_by,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [schedule_id, student_id, attendance_date, status, notes, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Mark entire lesson as cancelled
export const cancelLesson = async (req, res, next) => {
  try {
    const { schedule_id, attendance_date, notes } = req.body;

    if (!schedule_id || !attendance_date) {
      return res.status(400).json({ 
        error: 'Schedule ID and attendance date are required' 
      });
    }

    // Get all students for this schedule
    const scheduleResult = await pool.query(
      `SELECT cs.*, c.course_type,
              json_agg(DISTINCT jsonb_build_object(
                'id', s.id,
                'first_name', s.first_name,
                'last_name', s.last_name
              )) FILTER (WHERE s.id IS NOT NULL) as students
       FROM course_schedules cs
       LEFT JOIN courses c ON cs.course_id = c.id
       LEFT JOIN student_courses sc ON c.id = sc.course_id AND sc.status = 'active'
       LEFT JOIN students s ON sc.student_id = s.id
       WHERE cs.id = $1
       GROUP BY cs.id, c.id`,
      [schedule_id]
    );

    if (scheduleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const schedule = scheduleResult.rows[0];
    const students = schedule.students || [];

    // Mark attendance as cancelled for all students
    const attendancePromises = students.map(student => {
      return pool.query(
        `INSERT INTO attendance (schedule_id, student_id, attendance_date, status, notes, marked_by)
         VALUES ($1, $2, $3, 'cancelled', $4, $5)
         ON CONFLICT (schedule_id, student_id, attendance_date)
         DO UPDATE SET status = 'cancelled', notes = $4, marked_by = $5, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [schedule_id, student.id, attendance_date, notes, req.user.id]
      );
    });

    // If it's an individual lesson with student_id, also mark that
    if (schedule.student_id) {
      attendancePromises.push(
        pool.query(
          `INSERT INTO attendance (schedule_id, student_id, attendance_date, status, notes, marked_by)
           VALUES ($1, $2, $3, 'cancelled', $4, $5)
           ON CONFLICT (schedule_id, student_id, attendance_date)
           DO UPDATE SET status = 'cancelled', notes = $4, marked_by = $5, updated_at = CURRENT_TIMESTAMP
           RETURNING *`,
          [schedule_id, schedule.student_id, attendance_date, notes, req.user.id]
        )
      );
    }

    await Promise.all(attendancePromises);

    res.json({ 
      message: 'Lesson cancelled successfully',
      affected_students: students.length + (schedule.student_id ? 1 : 0)
    });
  } catch (error) {
    next(error);
  }
};

// Get attendance for a specific schedule and date
export const getAttendanceBySchedule = async (req, res, next) => {
  try {
    const { scheduleId, date } = req.params;

    const result = await pool.query(
      `SELECT a.*, 
              s.first_name, s.last_name,
              u.full_name as marked_by_name
       FROM attendance a
       LEFT JOIN students s ON a.student_id = s.id
       LEFT JOIN users u ON a.marked_by = u.id
       WHERE a.schedule_id = $1 AND a.attendance_date = $2
       ORDER BY s.first_name, s.last_name`,
      [scheduleId, date]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

// Get attendance for a specific student
export const getAttendanceByStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;

    let query = `
      SELECT a.id, a.schedule_id, a.student_id, a.status, a.notes, a.marked_by, a.created_at,
             a.attendance_date::text as attendance_date,
             cs.start_time, cs.end_time,
             c.name as course_name,
             t.first_name as teacher_first_name,
             t.last_name as teacher_last_name,
             u.full_name as marked_by_name
      FROM attendance a
      INNER JOIN course_schedules cs ON a.schedule_id = cs.id
      LEFT JOIN courses c ON cs.course_id = c.id
      LEFT JOIN teachers t ON cs.teacher_id = t.id
      LEFT JOIN users u ON a.marked_by = u.id
      WHERE a.student_id = $1
    `;

    const params = [studentId];

    if (startDate && endDate) {
      query += ` AND a.attendance_date BETWEEN $2 AND $3`;
      params.push(startDate, endDate);
    }

    query += ` ORDER BY a.attendance_date DESC, cs.start_time`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

// Get attendance statistics for a student
export const getStudentAttendanceStats = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;

    let query = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'present') as present_count,
        COUNT(*) FILTER (WHERE status = 'absent') as absent_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
        COUNT(*) as total_count
      FROM attendance
      WHERE student_id = $1
    `;

    const params = [studentId];

    if (startDate && endDate) {
      query += ` AND attendance_date BETWEEN $2 AND $3`;
      params.push(startDate, endDate);
    }

    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Get today's lessons with attendance status
export const getTodayLessonsWithAttendance = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Get group courses
    const groupLessons = await pool.query(
      `SELECT cs.id, cs.start_time, cs.end_time, cs.room, cs.specific_date::text as specific_date,
              c.name as course_name, c.course_type,
              t.first_name as teacher_first_name,
              t.last_name as teacher_last_name,
              json_agg(DISTINCT jsonb_build_object(
                'id', s.id,
                'first_name', s.first_name,
                'last_name', s.last_name,
                'attendance_status', a.status
              )) FILTER (WHERE s.id IS NOT NULL) as students
       FROM course_schedules cs
       LEFT JOIN courses c ON cs.course_id = c.id
       LEFT JOIN teachers t ON cs.teacher_id = t.id
       LEFT JOIN student_courses sc ON c.id = sc.course_id AND sc.status = 'active'
       LEFT JOIN students s ON sc.student_id = s.id
       LEFT JOIN attendance a ON cs.id = a.schedule_id AND s.id = a.student_id AND a.attendance_date = $1
       WHERE DATE(cs.specific_date) = DATE($1) AND cs.student_id IS NULL
       GROUP BY cs.id, c.id, t.id
       ORDER BY cs.start_time`,
      [today]
    );

    // Get individual lessons
    const individualLessons = await pool.query(
      `SELECT cs.id, cs.start_time, cs.end_time, cs.room, cs.specific_date::text as specific_date,
              c.name as course_name, c.course_type,
              t.first_name as teacher_first_name,
              t.last_name as teacher_last_name,
              json_agg(jsonb_build_object(
                'id', s.id,
                'first_name', s.first_name,
                'last_name', s.last_name,
                'attendance_status', a.status
              )) as students
       FROM course_schedules cs
       LEFT JOIN courses c ON cs.course_id = c.id
       LEFT JOIN teachers t ON cs.teacher_id = t.id
       LEFT JOIN students s ON cs.student_id = s.id
       LEFT JOIN attendance a ON cs.id = a.schedule_id AND s.id = a.student_id AND a.attendance_date = $1
       WHERE DATE(cs.specific_date) = DATE($1) AND cs.student_id IS NOT NULL
       GROUP BY cs.id, c.id, t.id, s.id
       ORDER BY cs.start_time`,
      [today]
    );

    // Combine both results
    const allLessons = [...groupLessons.rows, ...individualLessons.rows]
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

    res.json(allLessons);
  } catch (error) {
    next(error);
  }
};

// Get all attendance records (Admin only)
export const getAllAttendance = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ 
        error: 'Start date and end date are required' 
      });
    }

    const result = await pool.query(
      `SELECT 
        a.id,
        a.schedule_id,
        a.student_id,
        a.attendance_date::text as attendance_date,
        a.status,
        a.notes,
        a.created_at,
        cs.day_of_week,
        cs.start_time,
        cs.end_time,
        cs.specific_date::text as specific_date,
        c.name as course_name,
        c.course_type,
        t.id as teacher_id,
        t.first_name as teacher_first_name,
        t.last_name as teacher_last_name,
        s.first_name as student_first_name,
        s.last_name as student_last_name,
        u.full_name as marked_by_name
      FROM attendance a
      INNER JOIN course_schedules cs ON a.schedule_id = cs.id
      LEFT JOIN courses c ON cs.course_id = c.id
      LEFT JOIN teachers t ON cs.teacher_id = t.id
      LEFT JOIN students s ON a.student_id = s.id
      LEFT JOIN users u ON a.marked_by = u.id
      WHERE a.attendance_date BETWEEN $1 AND $2
      ORDER BY a.attendance_date DESC, cs.start_time`,
      [start_date, end_date]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

// Get teacher's attendance records (Teacher only)
export const getTeacherAttendance = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const teacherId = req.user.teacher_id; // Assuming teacher_id is stored in user token

    if (!start_date || !end_date) {
      return res.status(400).json({ 
        error: 'Start date and end date are required' 
      });
    }

    if (!teacherId) {
      return res.status(403).json({ 
        error: 'Only teachers can access this endpoint' 
      });
    }

    const result = await pool.query(
      `SELECT 
        a.id,
        a.schedule_id,
        a.student_id,
        a.attendance_date::text as attendance_date,
        a.status,
        a.notes,
        a.created_at,
        cs.day_of_week,
        cs.start_time,
        cs.end_time,
        cs.specific_date::text as specific_date,
        c.name as course_name,
        c.course_type,
        s.first_name as student_first_name,
        s.last_name as student_last_name
      FROM attendance a
      INNER JOIN course_schedules cs ON a.schedule_id = cs.id
      LEFT JOIN courses c ON cs.course_id = c.id
      LEFT JOIN students s ON a.student_id = s.id
      WHERE cs.teacher_id = $1 
        AND a.attendance_date BETWEEN $2 AND $3
      ORDER BY a.attendance_date DESC, cs.start_time`,
      [teacherId, start_date, end_date]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

