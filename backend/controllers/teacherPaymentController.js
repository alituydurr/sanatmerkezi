import pool from '../config/database.js';

// Calculate teacher hours for a month
export const calculateTeacherHours = async (req, res, next) => {
  try {
    const { teacherId, monthYear } = req.params; // Format: 2025-10

    const [year, month] = monthYear.split('-');
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    
    // Get last day of month
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${year}-${month.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Get teacher info
    const teacherInfo = await pool.query(
      'SELECT first_name, last_name FROM teachers WHERE id = $1',
      [teacherId]
    );

    if (teacherInfo.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Calculate total hours from NORMAL lessons (teacher_fee = 0) where attendance is 'present'
    const normalLessonsResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT cs.id) as total_classes,
        SUM(
          EXTRACT(EPOCH FROM (cs.end_time - cs.start_time)) / 3600
        ) as total_hours
      FROM course_schedules cs
      LEFT JOIN attendance a ON cs.id = a.schedule_id 
        AND a.attendance_date = cs.specific_date::date
        AND a.status = 'present'
      WHERE cs.teacher_id = $1
        AND cs.specific_date::date >= $2::date
        AND cs.specific_date::date <= $3::date
        AND (cs.teacher_fee IS NULL OR cs.teacher_fee = 0)
        AND a.id IS NOT NULL
    `, [teacherId, startDate, endDate]);

    // Calculate total fee from EVENTS/APPOINTMENTS (teacher_fee > 0)
    // Note: We don't require attendance for these because they might be events/workshops
    // that don't have individual student attendance tracking
    const eventLessonsResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT cs.id) as event_count,
        SUM(cs.teacher_fee) as event_total_fee,
        json_agg(
          json_build_object(
            'date', cs.specific_date::text,
            'fee', cs.teacher_fee,
            'description', cs.room
          ) ORDER BY cs.specific_date
        ) as event_lessons
      FROM course_schedules cs
      WHERE cs.teacher_id = $1
        AND cs.specific_date::date >= $2::date
        AND cs.specific_date::date <= $3::date
        AND cs.teacher_fee > 0
    `, [teacherId, startDate, endDate]);

    const normalData = normalLessonsResult.rows[0];
    const eventData = eventLessonsResult.rows[0];
    
    const totalHours = parseFloat(normalData.total_hours || 0);
    const totalClasses = parseInt(normalData.total_classes || 0);
    const eventCount = parseInt(eventData.event_count || 0);
    const eventTotalFee = parseFloat(eventData.event_total_fee || 0);

    res.json({
      teacher_id: teacherId,
      teacher_name: `${teacherInfo.rows[0].first_name} ${teacherInfo.rows[0].last_name}`,
      month_year: monthYear,
      total_hours: totalHours.toFixed(2),
      total_classes: totalClasses,
      trial_lessons_count: eventCount,
      trial_lessons_fee: eventTotalFee.toFixed(2),
      trial_lessons: eventData.event_lessons || []
    });
  } catch (error) {
    next(error);
  }
};

// Get all teacher payments and general expenses (excluding cancelled)
export const getAllTeacherPayments = async (req, res, next) => {
  try {
    const { month_year } = req.query;

    let query = `
      SELECT tp.*,
        t.first_name,
        t.last_name,
        COALESCE(SUM(tpr.amount), 0) as paid_amount_calculated
      FROM teacher_payments tp
      LEFT JOIN teachers t ON tp.teacher_id = t.id
      LEFT JOIN teacher_payment_records tpr ON tp.id = tpr.teacher_payment_id
      WHERE tp.status != 'cancelled'
    `;

    const params = [];
    if (month_year) {
      query += ' AND tp.month_year = $1';
      params.push(month_year);
    }

    query += ' GROUP BY tp.id, t.id ORDER BY tp.payment_type, tp.month_year DESC, t.last_name';

    const result = await pool.query(query, params);
    
    // Use calculated paid_amount to ensure accuracy
    const processedRows = result.rows.map(row => ({
      ...row,
      paid_amount: row.paid_amount_calculated,
      remaining_amount: parseFloat(row.total_amount) - parseFloat(row.paid_amount_calculated)
    }));
    
    res.json(processedRows);
  } catch (error) {
    next(error);
  }
};

// Create or update teacher payment
export const createTeacherPayment = async (req, res, next) => {
  try {
    const { teacher_id, month_year, total_hours, hourly_rate, trial_lessons_fee, notes } = req.body;

    if (!teacher_id || !month_year || !hourly_rate) {
      return res.status(400).json({ 
        error: 'Teacher ID, month/year, and hourly rate are required' 
      });
    }

    // Calculate total amount: (hours × hourly_rate) + trial_lessons_fee
    const normalLessonsFee = parseFloat(total_hours || 0) * parseFloat(hourly_rate);
    const trialFee = parseFloat(trial_lessons_fee || 0);
    const totalAmount = normalLessonsFee + trialFee;

    // Validate that there's at least some payment
    if (totalAmount <= 0) {
      return res.status(400).json({ 
        error: 'Bu öğretmenin seçilen ay içerisinde tamamlanmış dersi bulunmamaktadır.' 
      });
    }

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
        `, [total_hours || 0, hourly_rate, totalAmount, notes, teacher_id, month_year]);
      } else {
        // Update existing active payment
        // Calculate new remaining amount
        const newRemainingAmount = totalAmount - parseFloat(existingPayment.paid_amount || 0);
        
        // Determine new status based on remaining amount
        let newStatus;
        if (newRemainingAmount <= 0) {
          newStatus = 'completed';
        } else if (parseFloat(existingPayment.paid_amount || 0) > 0) {
          newStatus = 'partial';
        } else {
          newStatus = 'pending';
        }
        
        result = await pool.query(`
          UPDATE teacher_payments
          SET total_hours = $1,
              hourly_rate = $2,
              total_amount = $3,
              remaining_amount = $4,
              status = $5,
              notes = $6,
              updated_at = CURRENT_TIMESTAMP
          WHERE teacher_id = $7 AND month_year = $8
          RETURNING *
        `, [total_hours || 0, hourly_rate, totalAmount, newRemainingAmount, newStatus, notes, teacher_id, month_year]);
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
      `, [teacher_id, month_year, total_hours || 0, hourly_rate, totalAmount, notes]);
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Create general expense
export const createGeneralExpense = async (req, res, next) => {
  try {
    const {
      expense_date,
      expense_category,
      description,
      amount,
      invoice_number,
      vendor,
      notes,
    } = req.body;

    // Validation
    if (!expense_date || !expense_category || !amount) {
      return res.status(400).json({
        error: 'Tarih, kategori ve tutar zorunludur',
      });
    }

    // Ay-yıl formatı (YYYY-MM)
    const monthYear = expense_date.substring(0, 7);

    // Her zaman pending olarak başla
    const paidAmount = 0;
    const remainingAmount = parseFloat(amount);
    const status = 'pending';

    const result = await pool.query(
      `
      INSERT INTO teacher_payments (
        payment_type,
        month_year,
        expense_category,
        invoice_number,
        vendor,
        total_amount,
        paid_amount,
        remaining_amount,
        status,
        notes,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `,
      [
        'general_expense',
        monthYear,
        expense_category,
        invoice_number,
        vendor,
        amount,
        paidAmount,
        remainingAmount,
        status,
        notes,
        req.user?.id || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};


// Record teacher payment
export const recordTeacherPayment = async (req, res, next) => {
  try {
    const { teacher_payment_id, teacher_id, amount, payment_date, payment_method, notes } = req.body;

    if (!teacher_payment_id || !amount) {
      return res.status(400).json({ 
        error: 'Teacher payment ID and amount are required' 
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

    // For general expenses, teacher_id might be null, so get it from the payment record
    const actualTeacherId = teacher_id || teacherPayment.teacher_id;

    // Record payment
    const paymentResult = await pool.query(`
      INSERT INTO teacher_payment_records (
        teacher_payment_id, teacher_id, amount, payment_date, payment_method, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [teacher_payment_id, actualTeacherId, amount, payment_date || new Date(), payment_method, notes]);

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

// Partial cancel teacher payment (cancel only remaining amount)
export const partialCancelTeacherPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cancellation_reason } = req.body;

    if (!cancellation_reason || cancellation_reason.trim() === '') {
      return res.status(400).json({ error: 'İptal nedeni belirtilmelidir' });
    }

    // Get current payment
    const currentPayment = await pool.query(
      'SELECT * FROM teacher_payments WHERE id = $1',
      [id]
    );

    if (currentPayment.rows.length === 0) {
      return res.status(404).json({ error: 'Ödeme bulunamadı' });
    }

    const payment = currentPayment.rows[0];
    const remainingAmount = parseFloat(payment.remaining_amount || 0);

    if (remainingAmount <= 0) {
      return res.status(400).json({ error: 'İptal edilecek kalan tutar yok' });
    }

    // Update payment - cancel only remaining amount
    const result = await pool.query(`
      UPDATE teacher_payments
      SET remaining_amount = 0,
          status = 'cancelled',
          cancellation_reason = $1,
          cancelled_at = CURRENT_TIMESTAMP,
          cancelled_by = $2,
          updated_at = CURRENT_TIMESTAMP,
          notes = CONCAT(COALESCE(notes, ''), ' | Kalan tutar iptal edildi: ₺', $3::text)
      WHERE id = $4
      RETURNING *
    `, [cancellation_reason, req.user?.id || null, remainingAmount.toFixed(2), id]);

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};


// Get cancelled teacher payments and general expenses
export const getCancelledTeacherPayments = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        tp.id,
        tp.teacher_id,
        tp.payment_type,
        tp.expense_category,
        tp.vendor,
        tp.invoice_number,
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
        COALESCE(u.email, CAST(tp.cancelled_by AS TEXT)) as cancelled_by_username,
        tp.created_at
      FROM teacher_payments tp
      LEFT JOIN teachers t ON tp.teacher_id = t.id
      LEFT JOIN users u ON tp.cancelled_by = u.id
      WHERE tp.status = 'cancelled'
      ORDER BY tp.cancelled_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};
