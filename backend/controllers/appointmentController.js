import pool from '../config/database.js';

// Create appointment
export const createAppointment = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      date,
      start_time,
      end_time,
      student_name,
      student_surname,
      content_type,
      course_id,
      event_id,
      teacher_id,
      price,
      is_free,
      teacher_fee,
      notes
    } = req.body;

    // Validate required fields
    if (!date || !start_time || !end_time || !student_name || !student_surname || !content_type) {
      return res.status(400).json({ error: 'Gerekli alanlar eksik' });
    }

    // If not free, price is required
    if (!is_free && (!price || parseFloat(price) <= 0)) {
      return res.status(400).json({ error: 'Ücretli randevular için ücret belirtilmelidir' });
    }

    // Calculate day_of_week correctly (avoid timezone issues)
    const dateParts = date.split('-'); // "2025-12-13" -> ["2025", "12", "13"]
    const dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    const dayOfWeek = dateObj.getDay();

    // Create a schedule entry for the appointment
    const scheduleResult = await client.query(
      `INSERT INTO course_schedules (
        course_id,
        teacher_id,
        day_of_week,
        start_time,
        end_time,
        room,
        specific_date,
        teacher_fee,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, TO_DATE($7, 'YYYY-MM-DD'), $8, $9)
      RETURNING id, course_id, teacher_id, day_of_week, start_time, end_time, room, 
                specific_date::text as specific_date, teacher_fee, notes, created_at, updated_at`,
      [
        content_type === 'course' ? course_id : null,
        teacher_id || null,
        dayOfWeek,
        start_time,
        end_time,
        `${content_type === 'appointment' ? 'RANDEVU' : content_type === 'workshop' ? 'WORKSHOP' : content_type === 'event' ? 'ETKİNLİK' : content_type.toUpperCase()}: ${student_name} ${student_surname}`,
        date,
        teacher_fee || 0,
        notes || null
      ]
    );

    const scheduleId = scheduleResult.rows[0].id;

    // If it's a paid appointment, create payment plan
    let paymentPlanId = null;
    if (!is_free && parseFloat(price) > 0) {
      // Create payment plan with student name and surname (no student record needed)
      const paymentPlan = await client.query(
        `INSERT INTO payment_plans (
          student_name,
          student_surname,
          course_id,
          total_amount,
          installments,
          installment_amount,
          start_date,
          installment_dates,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id`,
        [
          student_name,
          student_surname,
          content_type === 'course' ? course_id : null,
          price,
          1,
          price,
          date,
          JSON.stringify([date]),
          'active'
        ]
      );

      paymentPlanId = paymentPlan.rows[0].id;
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      schedule_id: scheduleId,
      payment_plan_id: paymentPlanId,
      message: is_free ? 'Ücretsiz randevu oluşturuldu' : 'Randevu oluşturuldu ve ödeme planı kaydedildi'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating appointment:', error);
    next(error);
  } finally {
    client.release();
  }
};

// Get all appointments
export const getAllAppointments = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.id,
        s.specific_date as date,
        s.start_time,
        s.end_time,
        s.room as description,
        t.first_name as teacher_first_name,
        t.last_name as teacher_last_name,
        c.name as course_name
      FROM course_schedules s
      LEFT JOIN teachers t ON s.teacher_id = t.id
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE s.specific_date IS NOT NULL
      ORDER BY s.specific_date DESC, s.start_time DESC
    `);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

// Delete appointment
export const deleteAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM course_schedules WHERE id = $1', [id]);

    res.json({ success: true, message: 'Randevu silindi' });
  } catch (error) {
    next(error);
  }
};
