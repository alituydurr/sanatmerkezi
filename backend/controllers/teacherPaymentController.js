import pool from '../config/database.js';

// Calculate teacher hours for a month
export const calculateTeacherHours = async (req, res, next) => {
  try {
    const { teacherId, monthYear } = req.params; // Format: 2025-10

    const [year, month] = monthYear.split('-');
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    
    // Get last day of month: Create date for 1st day of NEXT month, then subtract 1 day
    // For January (month=01), we want the last day of January
    // new Date(2026, 1, 0) gives us Dec 31, 2025 (wrong!)
    // We need: new Date(2026, 2, 0) which gives us Jan 31, 2026 (correct!)
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${year}-${month.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Calculate total hours from schedules with specific_date in this month
    const result = await pool.query(`
      SELECT 
        cs.teacher_id,
        t.first_name,
        t.last_name,
        COUNT(cs.id) as total_classes,
        SUM(
          EXTRACT(EPOCH FROM (cs.end_time - cs.start_time)) / 3600
        ) as total_hours
      FROM course_schedules cs
      INNER JOIN teachers t ON cs.teacher_id = t.id
      WHERE cs.teacher_id = $1
        AND cs.specific_date::date >= $2::date
        AND cs.specific_date::date <= $3::date
      GROUP BY cs.teacher_id, t.first_name, t.last_name
    `, [teacherId, startDate, endDate]);

    if (result.rows.length === 0) {
      return res.json({
        teacher_id: teacherId,
        month_year: monthYear,
        total_hours: 0,
        total_classes: 0
      });
    }

    const data = result.rows[0];
    const totalHours = parseFloat(data.total_hours || 0);

    res.json({
      teacher_id: teacherId,
      teacher_name: `${data.first_name} ${data.last_name}`,
      month_year: monthYear,
      total_hours: totalHours.toFixed(2),
      total_classes: parseInt(data.total_classes)
    });
  } catch (error) {
    next(error);
  }
};

// Get all teacher payments (excluding cancelled)
export const getAllTeacherPayments = async (req, res, next) => {
  try {
    const { month_year } = req.query;

    let query = `
      SELECT tp.*,
        t.first_name,
        t.last_name,
        COALESCE(SUM(tpr.amount), 0) as paid_amount_calculated
      FROM teacher_payments tp
      INNER JOIN teachers t ON tp.teacher_id = t.id
      LEFT JOIN teacher_payment_records tpr ON tp.id = tpr.teacher_payment_id
      WHERE tp.status != 'cancelled'
    `;

    const params = [];
    if (month_year) {
      query += ' AND tp.month_year = $1';
      params.push(month_year);
    }

    query += ' GROUP BY tp.id, t.id ORDER BY tp.month_year DESC, t.last_name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

// Create or update teacher payment
export const createTeacherPayment = async (req, res, next) => {
  try {
    const { teacher_id, month_year, total_hours, hourly_rate, notes } = req.body;

    if (!teacher_id || !month_year || !total_hours || !hourly_rate) {
      return res.status(400).json({ 
        error: 'Teacher ID, month/year, total hours, and hourly rate are required' 
      });
    }

    const totalAmount = parseFloat(total_hours) * parseFloat(hourly_rate);

    // Check if already exists (including cancelled)
    const existing = await pool.query(
      `SELECT * FROM teacher_payments 
       WHERE teacher_id = $1 
         AND month_year = $2`,
      [teacher_id, month_year]
    );

    let result;
    if (existing.rows.length > 0) {
      const existingPayment = existing.rows[0];
      
      // If cancelled, reactivate it with new values
      if (existingPayment.status === 'cancelled') {
        result = await pool.query(`
          UPDATE teacher_payments
          SET total_hours = $1,
              hourly_rate = $2,
              total_amount = $3,
              remaining_amount = $3,
              paid_amount = 0,
              status = 'pending',
              notes = $4,
              updated_at = CURRENT_TIMESTAMP
          WHERE teacher_id = $5 AND month_year = $6
          RETURNING *
        `, [total_hours, hourly_rate, totalAmount, notes, teacher_id, month_year]);
      } else {
        // Update existing active payment
        result = await pool.query(`
          UPDATE teacher_payments
          SET total_hours = $1,
              hourly_rate = $2,
              total_amount = $3,
              remaining_amount = $3 - paid_amount,
              notes = $4,
              updated_at = CURRENT_TIMESTAMP
          WHERE teacher_id = $5 AND month_year = $6
          RETURNING *
        `, [total_hours, hourly_rate, totalAmount, notes, teacher_id, month_year]);
      }
    } else {
      // Create new
      result = await pool.query(`
        INSERT INTO teacher_payments (
          teacher_id, month_year, total_hours, hourly_rate, 
          total_amount, remaining_amount, notes
        )
        VALUES ($1, $2, $3, $4, $5, $5, $6)
        RETURNING *
      `, [teacher_id, month_year, total_hours, hourly_rate, totalAmount, notes]);
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Record teacher payment
export const recordTeacherPayment = async (req, res, next) => {
  try {
    const { teacher_payment_id, teacher_id, amount, payment_date, payment_method, notes } = req.body;

    if (!teacher_payment_id || !teacher_id || !amount) {
      return res.status(400).json({ 
        error: 'Teacher payment ID, teacher ID, and amount are required' 
      });
    }

    // Get teacher payment
    const tpResult = await pool.query(
      'SELECT * FROM teacher_payments WHERE id = $1',
      [teacher_payment_id]
    );

    if (tpResult.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher payment record not found' });
    }

    const teacherPayment = tpResult.rows[0];

    // Record payment
    const paymentResult = await pool.query(`
      INSERT INTO teacher_payment_records (
        teacher_payment_id, teacher_id, amount, payment_date, payment_method, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [teacher_payment_id, teacher_id, amount, payment_date || new Date(), payment_method, notes]);

    // Update teacher_payments
    const newPaidAmount = parseFloat(teacherPayment.paid_amount || 0) + parseFloat(amount);
    const newRemainingAmount = parseFloat(teacherPayment.total_amount) - newPaidAmount;
    
    let newStatus = 'pending';
    if (newRemainingAmount <= 0) {
      newStatus = 'completed';
    } else if (newPaidAmount > 0) {
      newStatus = 'partial';
    }

    await pool.query(`
      UPDATE teacher_payments
      SET paid_amount = $1,
          remaining_amount = $2,
          status = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [newPaidAmount, newRemainingAmount, newStatus, teacher_payment_id]);

    res.status(201).json(paymentResult.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Get teacher payment records
export const getTeacherPaymentRecords = async (req, res, next) => {
  try {
    const { teacherId } = req.params;

    const result = await pool.query(`
      SELECT tpr.*, tp.month_year, tp.total_amount, tp.hourly_rate
      FROM teacher_payment_records tpr
      INNER JOIN teacher_payments tp ON tpr.teacher_payment_id = tp.id
      WHERE tpr.teacher_id = $1
      ORDER BY tpr.payment_date DESC
    `, [teacherId]);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

// Cancel teacher payment
export const cancelTeacherPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cancellation_reason } = req.body;

    if (!cancellation_reason || cancellation_reason.trim() === '') {
      return res.status(400).json({ error: 'İptal nedeni belirtilmelidir' });
    }

    const result = await pool.query(`
      UPDATE teacher_payments
      SET status = 'cancelled',
          cancellation_reason = $1,
          cancelled_at = CURRENT_TIMESTAMP,
          cancelled_by = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [cancellation_reason, req.user?.id || null, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher payment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Get cancelled teacher payments
export const getCancelledTeacherPayments = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        tp.id,
        tp.teacher_id,
        t.first_name,
        t.last_name,
        tp.month_year,
        tp.total_hours,
        tp.hourly_rate,
        tp.total_amount,
        tp.paid_amount,
        tp.remaining_amount,
        tp.status,
        tp.cancellation_reason,
        tp.cancelled_at,
        CAST(tp.cancelled_by AS TEXT) as cancelled_by_username,
        tp.created_at
      FROM teacher_payments tp
      INNER JOIN teachers t ON tp.teacher_id = t.id
      WHERE tp.status = 'cancelled'
      ORDER BY tp.cancelled_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};
