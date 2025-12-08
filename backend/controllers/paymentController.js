import pool from '../config/database.js';

// Get all payment plans
export const getAllPaymentPlans = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT pp.*,
        s.first_name as student_first_name,
        s.last_name as student_last_name,
        c.name as course_name,
        COALESCE(SUM(p.amount), 0) as paid_amount,
        pp.total_amount - COALESCE(SUM(p.amount), 0) as remaining_amount
      FROM payment_plans pp
      INNER JOIN students s ON pp.student_id = s.id
      INNER JOIN courses c ON pp.course_id = c.id
      LEFT JOIN payments p ON pp.id = p.payment_plan_id
      GROUP BY pp.id, s.id, c.id
      ORDER BY pp.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

// Get payment plan by ID
export const getPaymentPlanById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT pp.*,
        s.first_name as student_first_name,
        s.last_name as student_last_name,
        c.name as course_name,
        COALESCE(SUM(p.amount), 0) as paid_amount,
        pp.total_amount - COALESCE(SUM(p.amount), 0) as remaining_amount
      FROM payment_plans pp
      INNER JOIN students s ON pp.student_id = s.id
      INNER JOIN courses c ON pp.course_id = c.id
      LEFT JOIN payments p ON pp.id = p.payment_plan_id
      WHERE pp.id = $1
      GROUP BY pp.id, s.id, c.id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment plan not found' });
    }

    // Get payment history
    const paymentsResult = await pool.query(
      'SELECT * FROM payments WHERE payment_plan_id = $1 ORDER BY payment_date DESC',
      [id]
    );

    res.json({
      ...result.rows[0],
      payments: paymentsResult.rows
    });
  } catch (error) {
    next(error);
  }
};

// Create payment plan
export const createPaymentPlan = async (req, res, next) => {
  try {
    const {
      student_id,
      course_id,
      total_amount,
      installments,
      start_date
    } = req.body;

    if (!student_id || !course_id || !total_amount) {
      return res.status(400).json({ error: 'Student ID, Course ID, and total amount are required' });
    }

    const installment_amount = total_amount / (installments || 1);

    const result = await pool.query(`
      INSERT INTO payment_plans (
        student_id, course_id, total_amount, installments, installment_amount, start_date
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [student_id, course_id, total_amount, installments || 1, installment_amount, start_date]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Update payment plan
export const updatePaymentPlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await pool.query(`
      UPDATE payment_plans
      SET status = COALESCE($1, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment plan not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Record a payment
export const recordPayment = async (req, res, next) => {
  try {
    const {
      payment_plan_id,
      student_id,
      amount,
      payment_date,
      payment_method,
      installment_number,
      notes
    } = req.body;

    if (!payment_plan_id || !student_id || !amount) {
      return res.status(400).json({ error: 'Payment plan ID, student ID, and amount are required' });
    }

    const result = await pool.query(`
      INSERT INTO payments (
        payment_plan_id, student_id, amount, payment_date, payment_method, installment_number, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [payment_plan_id, student_id, amount, payment_date, payment_method, installment_number, notes]);

    // Check if payment plan is completed
    const planResult = await pool.query(`
      SELECT pp.total_amount, COALESCE(SUM(p.amount), 0) as paid_amount
      FROM payment_plans pp
      LEFT JOIN payments p ON pp.id = p.payment_plan_id
      WHERE pp.id = $1
      GROUP BY pp.id
    `, [payment_plan_id]);

    if (planResult.rows.length > 0) {
      const { total_amount, paid_amount } = planResult.rows[0];
      if (parseFloat(paid_amount) >= parseFloat(total_amount)) {
        await pool.query(
          'UPDATE payment_plans SET status = $1 WHERE id = $2',
          ['completed', payment_plan_id]
        );
      }
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Get payments by student
export const getPaymentsByStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const result = await pool.query(`
      SELECT p.*,
        pp.total_amount,
        pp.installments,
        c.name as course_name
      FROM payments p
      INNER JOIN payment_plans pp ON p.payment_plan_id = pp.id
      INNER JOIN courses c ON pp.course_id = c.id
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
        s.first_name as student_first_name,
        s.last_name as student_last_name,
        s.phone as student_phone,
        c.name as course_name,
        COALESCE(SUM(p.amount), 0) as paid_amount,
        pp.total_amount - COALESCE(SUM(p.amount), 0) as remaining_amount
      FROM payment_plans pp
      INNER JOIN students s ON pp.student_id = s.id
      INNER JOIN courses c ON pp.course_id = c.id
      LEFT JOIN payments p ON pp.id = p.payment_plan_id
      WHERE pp.status = 'active'
      GROUP BY pp.id, s.id, c.id
      HAVING pp.total_amount - COALESCE(SUM(p.amount), 0) > 0
      ORDER BY pp.start_date ASC
    `);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};
