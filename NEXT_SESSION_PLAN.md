# Sanat Merkezi - Sonraki Güncellemeler İçin Implementation Plan

## 📋 Genel Bakış

Bu dokümanda, bir sonraki sohbet oturumunda tamamlanması gereken özellikler detaylı olarak açıklanmıştır.

---

## 🎯 Öncelik 1: Para Formatını Tüm Sayfalara Uygula

### Durum

- ✅ `formatters.js` hazır
- ✅ `formatCurrencyWithSymbol()` fonksiyonu çalışıyor
- ⏳ Tüm sayfalara uygulanması gerekiyor

### Yapılacaklar

#### 1. StudentDetail.jsx

```javascript
// Import ekle
import { formatCurrencyWithSymbol } from "../utils/formatters";

// Değiştirilecek satırlar (yaklaşık 153, 157, 161):
// ESKI: ₺{parseFloat(student.payment_info.total_amount || 0).toFixed(2)}
// YENİ: {formatCurrencyWithSymbol(student.payment_info.total_amount || 0)}
```

#### 2. Payments.jsx

```javascript
// Import zaten var
// Değiştirilecek satırlar (171, 173, 175, 291):
// ESKI: ₺{totalAmount.toFixed(2)}
// YENİ: {formatCurrencyWithSymbol(totalAmount)}
```

#### 3. TeacherPayments.jsx

```javascript
// Import ekle
import { formatCurrencyWithSymbol } from "../utils/formatters";

// Değiştirilecek satırlar (159, 160, 161, 163, 259):
// Tüm ₺{...toFixed(2)} kullanımlarını değiştir
```

#### 4. UpcomingPayments.jsx

```javascript
// Import ekle
import { formatCurrencyWithSymbol } from "../utils/formatters";

// Değiştirilecek satırlar (80, 100, 108):
// Tüm ₺{...toFixed(2)} kullanımlarını değiştir
```

#### 5. Dashboard.jsx

```javascript
// Import ekle
import { formatCurrencyWithSymbol } from "../utils/formatters";

// Değiştirilecek satır (147):
// ESKI: ₺{parseFloat(payment.remaining_amount).toFixed(2)}
// YENİ: {formatCurrencyWithSymbol(payment.remaining_amount)}
```

#### 6. Courses.jsx

```javascript
// Import ekle
import { formatCurrencyWithSymbol } from "../utils/formatters";

// Değiştirilecek satır (109):
// ESKI: {course.price ? `₺${course.price}` : '-'}
// YENİ: {course.price ? formatCurrencyWithSymbol(course.price) : '-'}
```

---

## 🎯 Öncelik 2: Öğretmen Detay Sayfası

### Hedef

Öğrenci detay sayfası gibi, öğretmenler için de detay sayfası oluştur.

### Yapılacaklar

#### 1. Backend - teacherController.js

```javascript
// Yeni endpoint ekle: getTeacherById
export const getTeacherById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Öğretmen bilgileri
    const teacherResult = await pool.query(
      "SELECT * FROM teachers WHERE id = $1",
      [id]
    );

    // Verdiği dersler (courses)
    const coursesResult = await pool.query(
      `
      SELECT c.*, tc.assigned_date
      FROM courses c
      INNER JOIN teacher_courses tc ON c.id = tc.course_id
      WHERE tc.teacher_id = $1
    `,
      [id]
    );

    // Ders programı (schedules)
    const schedulesResult = await pool.query(
      `
      SELECT cs.*, c.name as course_name
      FROM course_schedules cs
      INNER JOIN courses c ON cs.course_id = c.id
      WHERE cs.teacher_id = $1
      ORDER BY cs.day_of_week, cs.start_time
    `,
      [id]
    );

    // Toplam ders saati hesapla
    const hoursResult = await pool.query(
      `
      SELECT 
        SUM(EXTRACT(EPOCH FROM (cs.end_time - cs.start_time)) / 3600) as total_hours_per_week
      FROM course_schedules cs
      WHERE cs.teacher_id = $1 AND cs.is_recurring = true
    `,
      [id]
    );

    // Ödeme bilgileri
    const paymentResult = await pool.query(
      `
      SELECT 
        SUM(tp.total_amount) as total_amount,
        SUM(tp.paid_amount) as paid_amount,
        SUM(tp.remaining_amount) as remaining_amount
      FROM teacher_payments tp
      WHERE tp.teacher_id = $1
    `,
      [id]
    );

    res.json({
      ...teacherResult.rows[0],
      courses: coursesResult.rows,
      schedules: schedulesResult.rows,
      hours_per_week: hoursResult.rows[0].total_hours_per_week || 0,
      payment_info: paymentResult.rows[0],
    });
  } catch (error) {
    next(error);
  }
};
```

#### 2. Backend - routes/teachers.js

```javascript
// Route ekle
router.get("/:id", verifyToken, requireTeacherOrAdmin, getTeacherById);
```

#### 3. Frontend - TeacherDetail.jsx (YENİ DOSYA)

```javascript
// Öğrenci detay sayfasına benzer yapı
// Kartlar:
// 1. Kişisel Bilgiler
// 2. Verdiği Dersler
// 3. Haftalık Program
// 4. Ödeme Bilgileri
```

#### 4. Frontend - Teachers.jsx

```javascript
// Detay butonu ekle (Students.jsx gibi)
<button onClick={() => navigate(`/teachers/${teacher.id}`)}>Detay</button>
```

#### 5. Frontend - App.jsx

```javascript
// Route ekle
<Route path="teachers/:id" element={<TeacherDetail />} />
```

---

## 🎯 Öncelik 3: Öğretmen Dashboard'u (Sadece Takvim)

### Hedef

Öğretmen giriş yaptığında sadece kendi derslerini görsün.

### Yapılacaklar

#### 1. Backend - scheduleController.js

```javascript
// getAllSchedules zaten öğretmen filtrelemesi yapıyor
// Kontrol et ve gerekirse düzelt
```

#### 2. Frontend - Dashboard.jsx

```javascript
// Öğretmen için farklı dashboard
const { user, isTeacher } = useAuth();

if (isTeacher()) {
  return <TeacherDashboard />;
}

return <AdminDashboard />;
```

#### 3. Frontend - TeacherDashboard.jsx (YENİ DOSYA)

```javascript
// Sadece takvim göster
// Öğretmenin kendi derslerini listele
// Günlük, haftalık görünüm
```

---

## 🎯 Öncelik 4: Ders Onaylama Sistemi (Attendance)

### Hedef

Öğretmenler takvimden derse girdiklerini onaylasın.

### Yapılacaklar

#### 1. Backend - Veritabanı

```sql
-- attendance tablosu zaten var, kontrol et
-- Gerekirse yeni alanlar ekle:
ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS confirmed_by_teacher BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS confirmation_date TIMESTAMP;
```

#### 2. Backend - attendanceController.js (YENİ DOSYA)

```javascript
// Ders onaylama endpoint'leri
export const confirmAttendance = async (req, res, next) => {
  try {
    const { schedule_id, attendance_date } = req.body;
    const teacher_id = req.user.teacher_id; // user'dan teacher_id al

    // Attendance kaydı oluştur veya güncelle
    const result = await pool.query(
      `
      INSERT INTO attendance (
        course_schedule_id, 
        attendance_date, 
        confirmed_by_teacher,
        confirmation_date
      )
      VALUES ($1, $2, true, CURRENT_TIMESTAMP)
      ON CONFLICT (course_schedule_id, attendance_date)
      DO UPDATE SET 
        confirmed_by_teacher = true,
        confirmation_date = CURRENT_TIMESTAMP
      RETURNING *
    `,
      [schedule_id, attendance_date]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const getTeacherAttendance = async (req, res, next) => {
  try {
    const teacher_id = req.user.teacher_id;
    const { start_date, end_date } = req.query;

    const result = await pool.query(
      `
      SELECT 
        a.*,
        cs.day_of_week,
        cs.start_time,
        cs.end_time,
        c.name as course_name
      FROM attendance a
      INNER JOIN course_schedules cs ON a.course_schedule_id = cs.id
      INNER JOIN courses c ON cs.course_id = c.id
      WHERE cs.teacher_id = $1
        AND a.attendance_date BETWEEN $2 AND $3
      ORDER BY a.attendance_date DESC
    `,
      [teacher_id, start_date, end_date]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};
```

#### 3. Backend - routes/attendance.js (YENİ DOSYA)

```javascript
import express from "express";
import { verifyToken, requireTeacherOrAdmin } from "../middleware/auth.js";
import {
  confirmAttendance,
  getTeacherAttendance,
} from "../controllers/attendanceController.js";

const router = express.Router();

router.post("/confirm", verifyToken, requireTeacherOrAdmin, confirmAttendance);
router.get(
  "/teacher",
  verifyToken,
  requireTeacherOrAdmin,
  getTeacherAttendance
);

export default router;
```

#### 4. Backend - server.js

```javascript
import attendanceRoutes from "./routes/attendance.js";
app.use("/api/attendance", attendanceRoutes);
```

#### 5. Frontend - TeacherDashboard.jsx

```javascript
// Takvimde her ders için checkbox veya onay butonu
// Onaylandığında yeşil, onaylanmadığında kırmızı göster

const handleConfirmClass = async (scheduleId, date) => {
  try {
    await attendanceAPI.confirm({
      schedule_id: scheduleId,
      attendance_date: date,
    });
    // Takvimi yenile
    loadSchedules();
  } catch (error) {
    alert("Ders onaylanırken hata oluştu");
  }
};
```

#### 6. Frontend - services/api.js

```javascript
export const attendanceAPI = {
  confirm: (data) => api.post("/attendance/confirm", data),
  getTeacherAttendance: (startDate, endDate) =>
    api.get("/attendance/teacher", {
      params: { start_date: startDate, end_date: endDate },
    }),
};
```

---

## 🎯 Öncelik 5: Öğretmen E-posta Zorunluluğu

### Yapılacaklar

#### 1. Frontend - Teachers.jsx

```javascript
// E-posta alanını required yap
<input
  type="email"
  required  // Ekle
  ...
/>
```

#### 2. Backend - teacherController.js

```javascript
// createTeacher fonksiyonunda kontrol ekle
if (!email) {
  return res.status(400).json({ error: "Email is required" });
}
```

---

## 📝 Uygulama Sırası

1. **Para formatı** (En kolay, 30 dk)
2. **Öğretmen detay sayfası** (Orta, 1-2 saat)
3. **E-posta zorunluluğu** (Çok kolay, 10 dk)
4. **Öğretmen dashboard'u** (Orta, 1 saat)
5. **Ders onaylama sistemi** (Zor, 2-3 saat)

---

## 🔧 Hazır Dosyalar

- ✅ `utils/formatters.js` - Telefon ve para formatı
- ✅ `CURRENCY_FORMAT_GUIDE.md` - Para formatı kılavuzu
- ✅ Tüm backend ve frontend yapısı hazır

---

## 💡 Notlar

- Öğretmen için `teacher_id`'yi `req.user`'dan almak için middleware güncellemesi gerekebilir
- Attendance tablosu unique constraint'i kontrol et
- Öğretmen dashboard'u için yeni component'ler gerekecek
- Test kullanıcıları: admin@sanatmerkezi.com, teacher@sanatmerkezi.com

---

**Hazırlayan:** Antigravity AI  
**Tarih:** 2025-12-09  
**Proje:** Sanat Merkezi Yönetim Sistemi
