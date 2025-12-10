import pool from '../config/database.js';

// Get all payment plans with calculated amounts (includes both courses and events)
export const getAllPaymentPlans = async (req, res, next) => {
  try {
    // Get course payment plans (excluding cancelled)
    const coursePlans = await pool.query(`
      SELECT 
        pp.id,
        pp.student_id,
        pp.course_id,
        NULL as event_id,
        'course' as payment_type,
        COALESCE(s.first_name, pp.student_name) as student_first_name,
        COALESCE(s.last_name, pp.student_surname) as student_last_name,
        c.name as item_name,
        pp.total_amount,
        pp.installments,
        pp.installment_amount,
        pp.status,
        pp.start_date,
        COALESCE(SUM(p.amount), 0) as paid_amount,
        pp.total_amount - COALESCE(SUM(p.amount), 0) as remaining_amount,
        pp.created_at
      FROM payment_plans pp
      LEFT JOIN students s ON pp.student_id = s.id
      LEFT JOIN courses c ON pp.course_id = c.id
      LEFT JOIN payments p ON pp.id = p.payment_plan_id
      WHERE pp.status != 'cancelled'
      GROUP BY pp.id, s.id, c.id
    `);

    // Get event payments (excluding cancelled)
    const eventPayments = await pool.query(`
      SELECT 
        e.id,
        NULL as student_id,
        NULL as course_id,
        e.id as event_id,
        'event' as payment_type,
        '' as student_first_name,
        '' as student_last_name,
        e.name as item_name,
        e.price as total_amount,
        1 as installments,
        e.price as installment_amount,
        e.status,
        e.start_date,
        COALESCE(SUM(ee.paid_amount), 0) as paid_amount,
        e.price - COALESCE(SUM(ee.paid_amount), 0) as remaining_amount,
        e.created_at
      FROM events e
      LEFT JOIN event_enrollments ee ON e.id = ee.event_id
      WHERE e.status != 'cancelled'
      GROUP BY e.id
    `);

    // Combine and sort by date
    const allPayments = [...coursePlans.rows, ...eventPayments.rows]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(allPayments);
  } catch (error) {
    next(error);
  }
};

// Get upcoming payments (gelecek dönem ödemeleri)
export const getUpcomingPayments = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        pp.id,
        pp.student_id,
        COALESCE(s.first_name || ' ' || s.last_name, pp.student_name || ' ' || pp.student_surname) as student_name,
        c.name as course_name,
        pp.installment_dates,
        pp.installment_amount,
        pp.total_amount,
        COALESCE(SUM(p.amount), 0) as paid_amount,
        pp.total_amount - COALESCE(SUM(p.amount), 0) as remaining_amount
      FROM payment_plans pp
      LEFT JOIN students s ON pp.student_id = s.id
      LEFT JOIN courses c ON pp.course_id = c.id
      LEFT JOIN payments p ON pp.id = p.payment_plan_id
      WHERE pp.status = 'active'
      GROUP BY pp.id, s.id, c.id
      HAVING pp.total_amount - COALESCE(SUM(p.amount), 0) > 0
      ORDER BY pp.created_at
    `);

    // Group by due dates
    const upcomingByDate = {};
    
    result.rows.forEach(plan => {
      if (plan.installment_dates && Array.isArray(plan.installment_dates)) {
        plan.installment_dates.forEach(date => {
          if (!upcomingByDate[date]) {
            upcomingByDate[date] = {
              date,
              total_amount: 0,
              payments: []
            };
          }
          upcomingByDate[date].total_amount += parseFloat(plan.installment_amount);
          upcomingByDate[date].payments.push({
            student_name: plan.student_name,
            course_name: plan.course_name,
            amount: plan.installment_amount
          });
        });
      }
    });

    // Convert to array and sort by date
    const upcoming = Object.values(upcomingByDate).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    res.json(upcoming);
  } catch (error) {
    next(error);
  }
};

// Create payment plan with installment dates
export const createPaymentPlan = async (req, res, next) => {
  try {
    const { student_id, course_id, total_amount, installments, start_date } = req.body;

    if (!student_id || !total_amount) {
      return res.status(400).json({ error: 'Student ID and total amount are required' });
    }

    const installmentAmount = (parseFloat(total_amount) / parseInt(installments || 1)).toFixed(2);
    
    // Calculate installment dates (monthly)
    const installmentDates = [];
    const startDate = new Date(start_date || Date.now());
    
    for (let i = 0; i < parseInt(installments || 1); i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      installmentDates.push(dueDate.toISOString().split('T')[0]);
    }

    const result = await pool.query(`
      INSERT INTO payment_plans (
        student_id, course_id, total_amount, installments, 
        installment_amount, start_date, installment_dates
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [student_id, course_id, total_amount, installments, installmentAmount, start_date || new Date(), JSON.stringify(installmentDates)]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Record a payment with date
export const recordPayment = async (req, res, next) => {
  try {
    const { payment_plan_id, student_id, amount, payment_method, payment_date, notes } = req.body;

    if (!payment_plan_id || !amount) {
      return res.status(400).json({ error: 'Payment plan ID and amount are required' });
    }

    // Get payment plan
    const planResult = await pool.query(
      'SELECT * FROM payment_plans WHERE id = $1',
      [payment_plan_id]
    );

    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payment plan not found' });
    }

    const plan = planResult.rows[0];
    
    // Use student_id from payment_plan if not provided in request
    const finalStudentId = student_id || plan.student_id;

    // Calculate current paid amount
    const paidResult = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE payment_plan_id = $1',
      [payment_plan_id]
    );

    const totalPaid = parseFloat(paidResult.rows[0].total_paid) + parseFloat(amount);

    // Record payment
    const paymentResult = await pool.query(`
      INSERT INTO payments (payment_plan_id, student_id, amount, payment_date, payment_method, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [payment_plan_id, finalStudentId, amount, payment_date || new Date(), payment_method, notes]);

    // Update plan status if fully paid
    if (totalPaid >= parseFloat(plan.total_amount)) {
      await pool.query(
        'UPDATE payment_plans SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['completed', payment_plan_id]
      );
    }

    res.status(201).json(paymentResult.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Get payments by student
export const getPaymentsByStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const result = await pool.query(`
      SELECT p.*, pp.total_amount, pp.installment_amount,
        c.name as course_name
      FROM payments p
      INNER JOIN payment_plans pp ON p.payment_plan_id = pp.id
      LEFT JOIN courses c ON pp.course_id = c.id
      WHERE p.student_id = $1
      ORDER BY p.payment_date DESC
    `, [studentId]);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

// Get pending payments
export const getPendingPayments = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT pp.*,
        COALESCE(s.first_name || ' ' || s.last_name, pp.student_name || ' ' || pp.student_surname) as student_name,
        c.name as course_name,
        pp.total_amount - COALESCE(SUM(p.amount), 0) as remaining_amount
      FROM payment_plans pp
      LEFT JOIN students s ON pp.student_id = s.id
      LEFT JOIN courses c ON pp.course_id = c.id
      LEFT JOIN payments p ON pp.id = p.payment_plan_id
      WHERE pp.status = 'active'
      GROUP BY pp.id, s.id, c.id
      HAVING pp.total_amount - COALESCE(SUM(p.amount), 0) > 0
      ORDER BY pp.start_date
    `);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

// Cancel payment plan
export const cancelPaymentPlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cancellation_reason } = req.body;

    if (!cancellation_reason || cancellation_reason.trim() === '') {
      return res.status(400).json({ error: 'İptal nedeni belirtilmelidir' });
    }

    const result = await pool.query(`
      UPDATE payment_plans
      SET status = 'cancelled',
          cancellation_reason = $1,
          cancelled_at = CURRENT_TIMESTAMP,
          cancelled_by = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [cancellation_reason, req.user?.id || null, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment plan not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Get cancelled payment plans
export const getCancelledPaymentPlans = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        pp.id,
        pp.student_id,
        pp.course_id,
        COALESCE(s.first_name, pp.student_name) as student_first_name,
        COALESCE(s.last_name, pp.student_surname) as student_last_name,
        c.name as course_name,
        pp.total_amount,
        pp.installments,
        pp.installment_amount,
        pp.status,
        pp.start_date,
        pp.cancellation_reason,
        pp.cancelled_at,
        CAST(pp.cancelled_by AS TEXT) as cancelled_by_username,
        COALESCE(SUM(p.amount), 0) as paid_amount,
        pp.total_amount - COALESCE(SUM(p.amount), 0) as remaining_amount,
        pp.created_at
      FROM payment_plans pp
      LEFT JOIN students s ON pp.student_id = s.id
      LEFT JOIN courses c ON pp.course_id = c.id
      LEFT JOIN payments p ON pp.id = p.payment_plan_id
      WHERE pp.status = 'cancelled'
      GROUP BY pp.id, pp.student_id, pp.course_id, s.first_name, s.last_name, c.name, pp.total_amount, pp.installments, pp.installment_amount, pp.status, pp.start_date, pp.cancellation_reason, pp.cancelled_at, pp.cancelled_by, pp.created_at, pp.student_name, pp.student_surname
      ORDER BY pp.cancelled_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};
