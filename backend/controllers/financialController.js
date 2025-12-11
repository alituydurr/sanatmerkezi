import pool from '../config/database.js';

// Get financial summary for a specific month
export const getFinancialSummary = async (req, res, next) => {
  try {
    const { month_year } = req.query; // Format: YYYY-MM
    
    if (!month_year) {
      return res.status(400).json({ error: 'month_year parameter is required (format: YYYY-MM)' });
    }

    const startDate = `${month_year}-01`;
    const endDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0)
      .toISOString().split('T')[0];

    // Get student payments (income) for the month
    // Note: We count all payments, even from cancelled plans, because paid money is real income
    const studentPayments = await pool.query(`
      SELECT COALESCE(SUM(p.amount), 0) as total
      FROM payments p
      WHERE DATE(p.payment_date) BETWEEN $1 AND $2
    `, [startDate, endDate]);

    // Get event payments (income) for the month
    // Include paid amounts from ALL events, even cancelled ones (paid money is real income)
    const eventPayments = await pool.query(`
      SELECT COALESCE(SUM(ee.paid_amount), 0) as total
      FROM event_enrollments ee
      WHERE ee.payment_date IS NOT NULL
        AND DATE(ee.payment_date) BETWEEN $1 AND $2
    `, [startDate, endDate]);

    // Get teacher payments (expense) for the month - exclude cancelled
    const teacherPayments = await pool.query(`
      SELECT COALESCE(SUM(tpr.amount), 0) as total
      FROM teacher_payment_records tpr
      INNER JOIN teacher_payments tp ON tpr.teacher_payment_id = tp.id
      WHERE DATE(tpr.payment_date) BETWEEN $1 AND $2
        AND tp.status != 'cancelled'
    `, [startDate, endDate]);

    // Get planned income (upcoming student payments)
    const plannedStudentIncome = await pool.query(`
      SELECT COALESCE(SUM(pp.installment_amount), 0) as total
      FROM payment_plans pp
      WHERE pp.status = 'active'
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(pp.installment_dates::jsonb) AS date
          WHERE date::date BETWEEN $1 AND $2
        )
    `, [startDate, endDate]);

    // Get planned income (events in this month) - only unpaid, uncancelled portions
    const plannedEventIncome = await pool.query(`
      SELECT COALESCE(SUM(e.price - COALESCE(ee_sum.paid, 0)), 0) as total
      FROM events e
      LEFT JOIN (
        SELECT event_id, SUM(paid_amount) as paid
        FROM event_enrollments
        GROUP BY event_id
      ) ee_sum ON e.id = ee_sum.event_id
      WHERE DATE(e.start_date) BETWEEN $1 AND $2
        AND e.status NOT IN ('cancelled', 'completed')
    `, [startDate, endDate]);

    // Get planned expenses (teacher payments for the month)
    const plannedTeacherExpense = await pool.query(`
      SELECT COALESCE(SUM(tp.total_amount - tp.paid_amount), 0) as total
      FROM teacher_payments tp
      WHERE tp.month_year = $1
        AND tp.status = 'pending'
    `, [month_year]);

    const actualIncome = parseFloat(studentPayments.rows[0].total) + parseFloat(eventPayments.rows[0].total);
    const actualExpense = parseFloat(teacherPayments.rows[0].total);
    const plannedIncome = parseFloat(plannedStudentIncome.rows[0].total) + parseFloat(plannedEventIncome.rows[0].total);
    const plannedExpense = parseFloat(plannedTeacherExpense.rows[0].total);

    res.json({
      month_year,
      actual_income: actualIncome,
      actual_expense: actualExpense,
      planned_income: plannedIncome,
      planned_expense: plannedExpense,
      net_profit: actualIncome - actualExpense,
      projected_profit: (actualIncome + plannedIncome) - (actualExpense + plannedExpense)
    });
  } catch (error) {
    next(error);
  }
};

// Get detailed financial report
export const getFinancialReport = async (req, res, next) => {
  try {
    const { month_year } = req.query;
    
    if (!month_year) {
      return res.status(400).json({ error: 'month_year parameter is required (format: YYYY-MM)' });
    }

    const startDate = `${month_year}-01`;
    const endDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0)
      .toISOString().split('T')[0];


    // Student payments breakdown
    // Note: All actual payments are income, regardless of plan status
    const studentPaymentsDetail = await pool.query(`
      SELECT 
        COALESCE(s.first_name || ' ' || s.last_name, pp.student_name || ' ' || pp.student_surname) as student_name,
        c.name as course_name,
        p.amount,
        p.payment_date,
        p.payment_method
      FROM payments p
      INNER JOIN payment_plans pp ON p.payment_plan_id = pp.id
      LEFT JOIN students s ON p.student_id = s.id
      LEFT JOIN courses c ON pp.course_id = c.id
      WHERE DATE(p.payment_date) BETWEEN $1 AND $2
      ORDER BY p.payment_date DESC
    `, [startDate, endDate]);

    // Event payments breakdown - include paid amounts from all events
    const eventPaymentsDetail = await pool.query(`
      SELECT 
        e.name as event_name,
        e.event_type,
        COALESCE(SUM(ee.paid_amount), 0) as total_paid,
        e.price as event_price,
        e.status
      FROM events e
      LEFT JOIN event_enrollments ee ON e.id = ee.event_id
      WHERE ee.payment_date IS NOT NULL
        AND DATE(ee.payment_date) BETWEEN $1 AND $2
      GROUP BY e.id
      ORDER BY e.start_date DESC
    `, [startDate, endDate]);

    // Teacher payments breakdown - exclude cancelled
    const teacherPaymentsDetail = await pool.query(`
      SELECT 
        t.first_name || ' ' || t.last_name as teacher_name,
        tp.total_hours,
        tp.hourly_rate,
        tp.total_amount,
        tpr.amount as paid_amount,
        tpr.payment_date
      FROM teacher_payment_records tpr
      INNER JOIN teacher_payments tp ON tpr.teacher_payment_id = tp.id
      INNER JOIN teachers t ON tp.teacher_id = t.id
      WHERE DATE(tpr.payment_date) BETWEEN $1 AND $2
        AND tp.status != 'cancelled'
      ORDER BY tpr.payment_date DESC
    `, [startDate, endDate]);

    res.json({
      month_year,
      income: {
        student_payments: studentPaymentsDetail.rows,
        event_payments: eventPaymentsDetail.rows,
        total: studentPaymentsDetail.rows.reduce((sum, p) => sum + parseFloat(p.amount), 0) +
               eventPaymentsDetail.rows.reduce((sum, e) => sum + parseFloat(e.total_paid), 0)
      },
      expenses: {
        teacher_payments: teacherPaymentsDetail.rows,
        total: teacherPaymentsDetail.rows.reduce((sum, p) => sum + parseFloat(p.paid_amount || 0), 0)
      },
      net_profit: (
        studentPaymentsDetail.rows.reduce((sum, p) => sum + parseFloat(p.amount), 0) +
        eventPaymentsDetail.rows.reduce((sum, e) => sum + parseFloat(e.total_paid), 0)
      ) - teacherPaymentsDetail.rows.reduce((sum, p) => sum + parseFloat(p.paid_amount || 0), 0)
    });
  } catch (error) {
    next(error);
  }
};

// Get today's expected and received payments
export const getTodaysPayments = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Get student payments due today (expected)
    // Exclude payment plans that have received a payment today
    const studentPaymentsDue = await pool.query(`
      SELECT 
        pp.id,
        COALESCE(s.first_name || ' ' || s.last_name, pp.student_name || ' ' || pp.student_surname) as name,
        'student' as type,
        c.name as course_name,
        pp.installment_amount as amount,
        pp.total_amount - COALESCE(SUM(p.amount), 0) as remaining_amount,
        false as paid
      FROM payment_plans pp
      LEFT JOIN students s ON pp.student_id = s.id
      LEFT JOIN courses c ON pp.course_id = c.id
      LEFT JOIN payments p ON pp.id = p.payment_plan_id
      WHERE pp.status = 'active'
        AND pp.installment_dates::jsonb ? $1
        AND NOT EXISTS (
          SELECT 1 FROM payments p2 
          WHERE p2.payment_plan_id = pp.id 
          AND DATE(p2.payment_date) = $1::date
        )
      GROUP BY pp.id, s.id, c.id
      HAVING pp.total_amount - COALESCE(SUM(p.amount), 0) > 0
    `, [today]);

    // Get student payments received today
    const studentPaymentsReceived = await pool.query(`
      SELECT 
        p.id,
        COALESCE(s.first_name || ' ' || s.last_name, pp.student_name || ' ' || pp.student_surname) as name,
        'student' as type,
        c.name as course_name,
        p.amount,
        0 as remaining_amount,
        true as paid
      FROM payments p
      INNER JOIN payment_plans pp ON p.payment_plan_id = pp.id
      LEFT JOIN students s ON p.student_id = s.id
      LEFT JOIN courses c ON pp.course_id = c.id
      WHERE DATE(p.payment_date) = $1
      ORDER BY p.payment_date DESC
    `, [today]);

    // Get events happening today (expected)
    const eventPaymentsDue = await pool.query(`
      SELECT 
        e.id,
        e.name,
        'event' as type,
        e.event_type,
        e.price as amount,
        e.price - COALESCE(SUM(ee.paid_amount), 0) as remaining_amount,
        false as paid
      FROM events e
      LEFT JOIN event_enrollments ee ON e.id = ee.event_id
      WHERE DATE(e.start_date) = $1
        AND e.status != 'cancelled'
      GROUP BY e.id
      HAVING e.price - COALESCE(SUM(ee.paid_amount), 0) > 0
    `, [today]);

    // Combine all payments - show pending first (urgent), then received
    const allPayments = [
      ...studentPaymentsDue.rows,       // Pending student payments (urgent)
      ...eventPaymentsDue.rows,         // Pending event payments (urgent)
      ...studentPaymentsReceived.rows   // Received payments (completed)
    ];

    res.json(allPayments);
  } catch (error) {
    next(error);
  }
};
