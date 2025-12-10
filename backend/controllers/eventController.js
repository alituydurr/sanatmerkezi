import pool from '../config/database.js';

// Get all events
export const getAllEvents = async (req, res, next) => {
  try {
    const { month_year } = req.query;
    
    let query = `
      SELECT e.*,
        t.first_name as teacher_first_name,
        t.last_name as teacher_last_name,
        COUNT(DISTINCT ee.student_id) as enrolled_students,
        COALESCE(SUM(ee.paid_amount), 0) as total_paid
      FROM events e
      LEFT JOIN teachers t ON e.teacher_id = t.id
      LEFT JOIN event_enrollments ee ON e.id = ee.event_id
    `;

    const params = [];
    
    if (month_year) {
      query += ` WHERE DATE_TRUNC('month', e.start_date) = DATE_TRUNC('month', $1::date)`;
      params.push(`${month_year}-01`);
    }

    query += `
      GROUP BY e.id, t.first_name, t.last_name
      ORDER BY e.start_date DESC
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

// Get event by ID
export const getEventById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const eventResult = await pool.query(
      `SELECT e.*,
        t.first_name as teacher_first_name,
        t.last_name as teacher_last_name
      FROM events e
      LEFT JOIN teachers t ON e.teacher_id = t.id
      WHERE e.id = $1`,
      [id]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get enrolled students
    const enrollmentsResult = await pool.query(
      `SELECT ee.*, s.first_name, s.last_name
      FROM event_enrollments ee
      INNER JOIN students s ON ee.student_id = s.id
      WHERE ee.event_id = $1`,
      [id]
    );

    res.json({
      ...eventResult.rows[0],
      enrollments: enrollmentsResult.rows
    });
  } catch (error) {
    next(error);
  }
};

// Create event
export const createEvent = async (req, res, next) => {
  try {
    const {
      name,
      description,
      event_type,
      start_date,
      end_date,
      start_time,
      end_time,
      price,
      teacher_id
    } = req.body;

    if (!name || !event_type || !start_date || !end_date || price === undefined) {
      return res.status(400).json({ error: 'Name, event type, dates, and price are required' });
    }

    const result = await pool.query(
      `INSERT INTO events (
        name, description, event_type, start_date, end_date,
        start_time, end_time, price, teacher_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [name, description, event_type, start_date, end_date, start_time, end_time, price, teacher_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Update event
export const updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      event_type,
      start_date,
      end_date,
      start_time,
      end_time,
      price,
      teacher_id,
      status
    } = req.body;

    const result = await pool.query(
      `UPDATE events
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          event_type = COALESCE($3, event_type),
          start_date = COALESCE($4, start_date),
          end_date = COALESCE($5, end_date),
          start_time = COALESCE($6, start_time),
          end_time = COALESCE($7, end_time),
          price = COALESCE($8, price),
          teacher_id = COALESCE($9, teacher_id),
          status = COALESCE($10, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *`,
      [name, description, event_type, start_date, end_date, start_time, end_time, price, teacher_id, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Delete event
export const deleteEvent = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM events WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Enroll student in event
export const enrollStudent = async (req, res, next) => {
  try {
    const { event_id, student_id } = req.body;

    if (!event_id || !student_id) {
      return res.status(400).json({ error: 'Event ID and Student ID are required' });
    }

    const result = await pool.query(
      `INSERT INTO event_enrollments (event_id, student_id)
      VALUES ($1, $2)
      RETURNING *`,
      [event_id, student_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'Student already enrolled in this event' });
    }
    next(error);
  }
};

// Record payment for event enrollment
export const recordEventPayment = async (req, res, next) => {
  try {
    const { enrollment_id, amount } = req.body;

    if (!enrollment_id || !amount) {
      return res.status(400).json({ error: 'Enrollment ID and amount are required' });
    }

    const result = await pool.query(
      `UPDATE event_enrollments
      SET paid_amount = paid_amount + $1,
          payment_status = CASE
            WHEN paid_amount + $1 >= (SELECT price FROM events WHERE id = event_id) THEN 'paid'
            WHEN paid_amount + $1 > 0 THEN 'partial'
            ELSE 'pending'
          END
      WHERE id = $2
      RETURNING *`,
      [amount, enrollment_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Record direct payment for event (without enrollment)
export const recordDirectEventPayment = async (req, res, next) => {
  try {
    const { event_id, amount, payment_date, notes } = req.body;

    if (!event_id || !amount) {
      return res.status(400).json({ error: 'Event ID and amount are required' });
    }

    // Update event's paid amount by creating a virtual enrollment or tracking separately
    // For simplicity, we'll create a generic enrollment with student_id = NULL
    const result = await pool.query(
      `INSERT INTO event_enrollments (event_id, student_id, paid_amount, payment_status, enrollment_date)
      VALUES ($1, NULL, $2, 
        CASE 
          WHEN $2 >= (SELECT price FROM events WHERE id = $1) THEN 'paid'
          WHEN $2 > 0 THEN 'partial'
          ELSE 'pending'
        END,
        $3)
      ON CONFLICT (event_id, student_id) 
      DO UPDATE SET 
        paid_amount = event_enrollments.paid_amount + $2,
        payment_status = CASE
          WHEN event_enrollments.paid_amount + $2 >= (SELECT price FROM events WHERE id = $1) THEN 'paid'
          WHEN event_enrollments.paid_amount + $2 > 0 THEN 'partial'
          ELSE 'pending'
        END
      RETURNING *`,
      [event_id, amount, payment_date || new Date()]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Cancel event
export const cancelEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cancellation_reason } = req.body;

    if (!cancellation_reason) {
      return res.status(400).json({ error: 'Cancellation reason is required' });
    }

    const result = await pool.query(
      `UPDATE events
      SET status = 'cancelled',
          cancellation_reason = $1,
          cancelled_at = CURRENT_TIMESTAMP,
          cancelled_by = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *`,
      [cancellation_reason, req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Get cancelled events
export const getCancelledEvents = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        e.id,
        e.name as item_name,
        e.event_type,
        e.price as total_amount,
        e.start_date,
        e.end_date,
        e.cancellation_reason,
        e.cancelled_at,
        COALESCE(SUM(ee.paid_amount), 0) as paid_amount,
        t.first_name,
        t.last_name
      FROM events e
      LEFT JOIN event_enrollments ee ON e.id = ee.event_id
      LEFT JOIN teachers t ON e.teacher_id = t.id
      WHERE e.status = 'cancelled'
      GROUP BY e.id, t.first_name, t.last_name
      ORDER BY e.cancelled_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};
