import pool from "../config/database.js";

// Öğrenci Dashboard Verileri
export const getStudentDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Öğrenci bilgisini bul
    const studentResult = await pool.query(
      "SELECT * FROM students WHERE user_id = $1",
      [userId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: "Öğrenci kaydı bulunamadı" });
    }

    const student = studentResult.rows[0];

    // Kayıtlı dersler ve yoklama durumu
    const schedulesResult = await pool.query(
      `
      SELECT 
        cs.id,
        cs.specific_date,
        cs.start_time,
        cs.end_time,
        c.name as course_name,
        c.course_type,
        t.first_name as teacher_first_name,
        t.last_name as teacher_last_name,
        a.status as attendance_status
      FROM course_schedules cs
      JOIN courses c ON cs.course_id = c.id
      LEFT JOIN teachers t ON cs.teacher_id = t.id
      LEFT JOIN attendance a ON a.schedule_id = cs.id AND a.student_id = $1
      WHERE cs.student_id = $1
      ORDER BY cs.specific_date DESC
    `,
      [student.id]
    );

    // Ödeme bilgileri
    const paymentResult = await pool.query(
      `
      SELECT 
        pp.id,
        pp.total_amount,
        pp.installments,
        pp.installment_amount,
        pp.installment_dates,
        pp.start_date,
        pp.status,
        c.name as course_name,
        COALESCE(SUM(p.amount), 0) as paid_amount
      FROM payment_plans pp
      LEFT JOIN courses c ON pp.course_id = c.id
      LEFT JOIN payments p ON p.payment_plan_id = pp.id
      WHERE pp.student_id = $1 AND pp.status = 'active'
      GROUP BY pp.id, c.name
    `,
      [student.id]
    );

    res.json({
      student: {
        id: student.id,
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email,
        phone: student.phone,
      },
      schedules: schedulesResult.rows,
      payments: paymentResult.rows.map(payment => ({
        ...payment,
        remaining_amount: payment.total_amount - payment.paid_amount,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// Öğretmen Dashboard Verileri
export const getTeacherDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Öğretmen bilgisini bul
    const teacherResult = await pool.query(
      "SELECT * FROM teachers WHERE user_id = $1",
      [userId]
    );

    if (teacherResult.rows.length === 0) {
      return res.status(404).json({ error: "Öğretmen kaydı bulunamadı" });
    }

    const teacher = teacherResult.rows[0];

    // Bugünkü dersler
    const today = new Date().toISOString().split('T')[0];
    const todayLessonsResult = await pool.query(
      `
      SELECT 
        cs.id,
        cs.specific_date,
        cs.start_time,
        cs.end_time,
        c.name as course_name,
        c.course_type,
        s.first_name as student_first_name,
        s.last_name as student_last_name,
        s.id as student_id,
        a.status as attendance_status,
        a.id as attendance_id
      FROM course_schedules cs
      LEFT JOIN courses c ON cs.course_id = c.id
      LEFT JOIN students s ON cs.student_id = s.id
      LEFT JOIN attendance a ON a.schedule_id = cs.id AND a.attendance_date = cs.specific_date
      WHERE cs.teacher_id = $1 AND cs.specific_date = $2
      ORDER BY cs.start_time
    `,
      [teacher.id, today]
    );

    // Bu ayki toplam ders sayısı
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const monthLessonsResult = await pool.query(
      `
      SELECT COUNT(*) as total_lessons
      FROM course_schedules cs
      WHERE cs.teacher_id = $1 
        AND TO_CHAR(cs.specific_date, 'YYYY-MM') = $2
    `,
      [teacher.id, currentMonth]
    );

    res.json({
      teacher: {
        id: teacher.id,
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        email: teacher.email,
        phone: teacher.phone,
        specialization: teacher.specialization,
      },
      today_lessons: todayLessonsResult.rows,
      month_stats: {
        total_lessons: parseInt(monthLessonsResult.rows[0].total_lessons),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Öğretmen Derslerini Getir (Ay bazlı)
export const getTeacherLessons = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { month } = req.query; // YYYY-MM formatında

    // Öğretmen bilgisini bul
    const teacherResult = await pool.query(
      "SELECT id FROM teachers WHERE user_id = $1",
      [userId]
    );

    if (teacherResult.rows.length === 0) {
      return res.status(404).json({ error: "Öğretmen kaydı bulunamadı" });
    }

    const teacherId = teacherResult.rows[0].id;
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    const lessonsResult = await pool.query(
      `
      SELECT 
        cs.id,
        cs.specific_date,
        cs.start_time,
        cs.end_time,
        c.name as course_name,
        c.course_type,
        s.first_name as student_first_name,
        s.last_name as student_last_name,
        s.id as student_id,
        a.status as attendance_status,
        a.id as attendance_id
      FROM course_schedules cs
      LEFT JOIN courses c ON cs.course_id = c.id
      LEFT JOIN students s ON cs.student_id = s.id
      LEFT JOIN attendance a ON a.schedule_id = cs.id AND a.attendance_date = cs.specific_date
      WHERE cs.teacher_id = $1 
        AND TO_CHAR(cs.specific_date, 'YYYY-MM') = $2
      ORDER BY cs.specific_date, cs.start_time
    `,
      [teacherId, targetMonth]
    );

    res.json({
      month: targetMonth,
      lessons: lessonsResult.rows,
    });
  } catch (error) {
    next(error);
  }
};

// Öğretmen Finans Bilgileri
export const getTeacherFinance = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Öğretmen bilgisini bul
    const teacherResult = await pool.query(
      "SELECT id FROM teachers WHERE user_id = $1",
      [userId]
    );

    if (teacherResult.rows.length === 0) {
      return res.status(404).json({ error: "Öğretmen kaydı bulunamadı" });
    }

    const teacherId = teacherResult.rows[0].id;

    // Ödeme planları
    const paymentsResult = await pool.query(
      `
      SELECT 
        tp.id,
        tp.month_year,
        tp.total_hours,
        tp.hourly_rate,
        tp.total_amount,
        tp.paid_amount,
        tp.remaining_amount,
        tp.status,
        tp.notes
      FROM teacher_payments tp
      WHERE tp.teacher_id = $1
      ORDER BY tp.month_year DESC
      LIMIT 12
    `,
      [teacherId]
    );

    // Bu ayki ödeme
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMonthPayment = paymentsResult.rows.find(
      p => p.month_year === currentMonth
    );

    res.json({
      current_month: currentMonthPayment || null,
      payment_history: paymentsResult.rows,
    });
  } catch (error) {
    next(error);
  }
};

// Yoklama İşaretle (Öğretmen)
export const markAttendance = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { schedule_id, status } = req.body;

    // Öğretmen bilgisini bul
    const teacherResult = await pool.query(
      "SELECT id FROM teachers WHERE user_id = $1",
      [userId]
    );

    if (teacherResult.rows.length === 0) {
      return res.status(404).json({ error: "Öğretmen kaydı bulunamadı" });
    }

    const teacherId = teacherResult.rows[0].id;

    // Schedule bilgisini kontrol et
    const scheduleResult = await pool.query(
      `
      SELECT cs.*, s.id as student_id
      FROM course_schedules cs
      LEFT JOIN students s ON cs.student_id = s.id
      WHERE cs.id = $1 AND cs.teacher_id = $2
    `,
      [schedule_id, teacherId]
    );

    if (scheduleResult.rows.length === 0) {
      return res.status(404).json({ error: "Ders bulunamadı veya yetkiniz yok" });
    }

    const schedule = scheduleResult.rows[0];
    const lessonDate = new Date(schedule.specific_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    lessonDate.setHours(0, 0, 0, 0);

    // Geçmiş ders kontrolü
    if (lessonDate < today) {
      return res.status(403).json({
        error: "Geçmiş derslerin yoklaması işaretlenemez",
      });
    }

    // Gelecek ders kontrolü
    if (lessonDate > today) {
      return res.status(403).json({
        error: "Sadece bugünkü derslerin yoklaması işaretlenebilir",
      });
    }

    // Saat kontrolü (23:59'a kadar)
    const now = new Date();
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    if (now > endOfDay) {
      return res.status(403).json({
        error: "Yoklama işaretleme süresi doldu (23:59'a kadar)",
      });
    }

    // Zaten işaretlenmiş mi kontrol et
    const existingAttendance = await pool.query(
      `
      SELECT id FROM attendance
      WHERE schedule_id = $1 AND attendance_date = $2
    `,
      [schedule_id, schedule.specific_date.split('T')[0]]
    );

    if (existingAttendance.rows.length > 0) {
      return res.status(400).json({
        error: "Bu dersin yoklaması zaten işaretlenmiş. Değiştirilemez.",
      });
    }

    // Yoklama kaydet
    await pool.query(
      `
      INSERT INTO attendance (schedule_id, student_id, attendance_date, status, marked_by)
      VALUES ($1, $2, $3, $4, $5)
    `,
      [
        schedule_id,
        schedule.student_id,
        schedule.specific_date.split('T')[0],
        status,
        userId,
      ]
    );

    res.json({
      message: "Yoklama başarıyla işaretlendi",
    });
  } catch (error) {
    next(error);
  }
};
