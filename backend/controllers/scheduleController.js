import pool from '../config/database.js';

// Get all schedules (role-based)
export const getAllSchedules = async (req, res, next) => {
  try {
    let query;
    let params = [];

    if (req.user.role === 'admin') {
      query = `
        SELECT cs.id, cs.course_id, cs.teacher_id, cs.day_of_week, 
               cs.start_time, cs.end_time, cs.start_date, cs.end_date,
               cs.is_recurring, cs.room, cs.notes, cs.created_at, cs.updated_at,
               cs.specific_date::text as specific_date,
               cs.student_id,
          c.name as course_name,
          c.course_type,
          t.first_name as teacher_first_name,
          t.last_name as teacher_last_name,
          CASE 
            WHEN cs.student_id IS NOT NULL THEN
              json_agg(DISTINCT jsonb_build_object(
                'id', s_individual.id,
                'first_name', s_individual.first_name,
                'last_name', s_individual.last_name
              )) FILTER (WHERE s_individual.id IS NOT NULL)
            ELSE
              json_agg(DISTINCT jsonb_build_object(
                'id', s.id,
                'first_name', s.first_name,
                'last_name', s.last_name
              )) FILTER (WHERE s.id IS NOT NULL)
          END as students
        FROM course_schedules cs
        LEFT JOIN courses c ON cs.course_id = c.id
        LEFT JOIN teachers t ON cs.teacher_id = t.id
        LEFT JOIN students s_individual ON cs.student_id = s_individual.id
        LEFT JOIN student_courses sc ON c.id = sc.course_id AND sc.status = 'active' AND cs.student_id IS NULL
        LEFT JOIN students s ON sc.student_id = s.id
        GROUP BY cs.id, c.id, t.id
        ORDER BY cs.day_of_week, cs.start_time
      `;
    } else {
      // Teacher can only see their own schedules
      query = `
        SELECT cs.id, cs.course_id, cs.teacher_id, cs.day_of_week, 
               cs.start_time, cs.end_time, cs.start_date, cs.end_date,
               cs.is_recurring, cs.room, cs.notes, cs.created_at, cs.updated_at,
               cs.specific_date::text as specific_date,
               cs.student_id,
          c.name as course_name,
          c.course_type,
          t.first_name as teacher_first_name,
          t.last_name as teacher_last_name,
          CASE 
            WHEN cs.student_id IS NOT NULL THEN
              json_agg(DISTINCT jsonb_build_object(
                'id', s_individual.id,
                'first_name', s_individual.first_name,
                'last_name', s_individual.last_name
              )) FILTER (WHERE s_individual.id IS NOT NULL)
            ELSE
              json_agg(DISTINCT jsonb_build_object(
                'id', s.id,
                'first_name', s.first_name,
                'last_name', s.last_name
              )) FILTER (WHERE s.id IS NOT NULL)
          END as students
        FROM course_schedules cs
        INNER JOIN courses c ON cs.course_id = c.id
        INNER JOIN teachers t ON cs.teacher_id = t.id
        LEFT JOIN students s_individual ON cs.student_id = s_individual.id
        LEFT JOIN student_courses sc ON c.id = sc.course_id AND sc.status = 'active' AND cs.student_id IS NULL
        LEFT JOIN students s ON sc.student_id = s.id
        WHERE t.user_id = $1
        GROUP BY cs.id, c.id, t.id
        ORDER BY cs.day_of_week, cs.start_time
      `;
      params = [req.user.id];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

// Get schedule by ID
export const getScheduleById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT cs.*,
        c.name as course_name,
        c.description as course_description,
        t.first_name as teacher_first_name,
        t.last_name as teacher_last_name
      FROM course_schedules cs
      INNER JOIN courses c ON cs.course_id = c.id
      LEFT JOIN teachers t ON cs.teacher_id = t.id
      WHERE cs.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Create schedule
export const createSchedule = async (req, res, next) => {
  try {
    const {
      course_id,
      teacher_id,
      student_id,
      day_of_week,
      start_time,
      end_time,
      start_date,
      end_date,
      specific_date,
      is_recurring,
      room,
      notes
    } = req.body;

    if (!course_id || !start_time || !end_time) {
      return res.status(400).json({ error: 'Course ID, start time, and end time are required' });
    }

    // Check for schedule conflicts (skip for now, can be added later)
    
    const result = await pool.query(`
      INSERT INTO course_schedules (
        course_id, teacher_id, student_id, day_of_week, start_time, end_time,
        start_date, end_date, specific_date, is_recurring, room, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [course_id, teacher_id, student_id, day_of_week, start_time, end_time, start_date, end_date, specific_date, is_recurring, room, notes]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Update schedule
export const updateSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      course_id,
      teacher_id,
      day_of_week,
      start_time,
      end_time,
      start_date,
      end_date,
      specific_date,
      is_recurring,
      room,
      notes
    } = req.body;

    const result = await pool.query(`
      UPDATE course_schedules
      SET course_id = COALESCE($1, course_id),
          teacher_id = COALESCE($2, teacher_id),
          day_of_week = COALESCE($3, day_of_week),
          start_time = COALESCE($4, start_time),
          end_time = COALESCE($5, end_time),
          start_date = COALESCE($6, start_date),
          end_date = COALESCE($7, end_date),
          specific_date = COALESCE($8, specific_date),
          is_recurring = COALESCE($9, is_recurring),
          room = COALESCE($10, room),
          notes = COALESCE($11, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *
    `, [course_id, teacher_id, day_of_week, start_time, end_time, start_date, end_date, specific_date, is_recurring, room, notes, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Delete schedule
export const deleteSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get student_id before deleting
    const scheduleInfo = await pool.query(
      'SELECT student_id FROM course_schedules WHERE id = $1',
      [id]
    );

    if (scheduleInfo.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const studentId = scheduleInfo.rows[0].student_id;

    // Delete the schedule
    await pool.query(
      'DELETE FROM course_schedules WHERE id = $1',
      [id]
    );

    // Update student status if student_id exists
    if (studentId) {
      await updateStudentStatus(studentId);
    }

    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Helper function to update student status based on schedules
async function updateStudentStatus(studentId) {
  try {
    const today = new Date().toISOString().split('T')[0];

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
  } catch (error) {
    console.error('Error updating student status:', error);
    // Don't throw error, just log it
  }
}
