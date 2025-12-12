# Dashboard Yoklama ve İstatistik Güncellemesi

## 📋 Genel Bakış

Dashboard'da iki ana kart güncellenecek:

1. **Son Kayıtlar Kartı** → Öğrenci durum istatistikleri
2. **Öğrenci Katılımı Kartı** → Bugünün dersleri ve yoklama sistemi

## 🗄️ Veritabanı Değişiklikleri

### 1. Attendance (Yoklama) Tablosu Oluşturma

```sql
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER NOT NULL REFERENCES course_schedules(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'cancelled')),
  notes TEXT,
  marked_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(schedule_id, student_id, attendance_date)
);
```

**Status Açıklamaları:**

- `present` (Geldi) → Yeşil
- `absent` (Gelmedi) → Kırmızı
- `cancelled` (İptal) → Siyah

## 🔧 Backend API Endpoints

### 1. Öğrenci İstatistikleri

```
GET /api/students/stats
Response: {
  total: 30,
  active: 10,
  inactive: 8,
  completed: 12
}
```

### 2. Bugünün Dersleri (Detaylı)

```
GET /api/schedules/today
Response: [{
  id, course_name, start_time, end_time,
  teacher_name, room, students: [],
  attendance_status: 'present' | 'absent' | 'cancelled' | null
}]
```

### 3. Yoklama İşlemleri

```
POST /api/attendance/mark
Body: {
  schedule_id, student_id, date, status, notes
}

GET /api/attendance/schedule/:scheduleId/:date
Response: [{ student_id, status, ... }]
```

### 4. Öğretmen İstatistikleri Güncelleme

```
GET /api/teachers/:id/lesson-stats
Response: {
  planned: 120,
  completed: 100,
  cancelled: 20
}
```

## 🎨 Frontend Değişiklikleri

### 1. Dashboard.jsx Güncellemeleri

#### A. Son Kayıtlar Kartı

```jsx
<div className="dashboard-card">
  <h3>Son Kayıtlar</h3>
  <div className="student-stats">
    <div className="stat-item">
      <span className="stat-number">{stats.totalStudents}</span>
      <span className="stat-label">Toplam</span>
    </div>
    <div className="stat-item active">
      <span className="stat-number">{stats.activeStudents}</span>
      <span className="stat-label">Aktif</span>
    </div>
    <div className="stat-item inactive">
      <span className="stat-number">{stats.inactiveStudents}</span>
      <span className="stat-label">Pasif</span>
    </div>
    <div className="stat-item completed">
      <span className="stat-number">{stats.completedStudents}</span>
      <span className="stat-label">Tamamlanan</span>
    </div>
  </div>
</div>
```

#### B. Öğrenci Katılımı Kartı (Tıklanabilir)

```jsx
<div
  className="dashboard-card clickable"
  onClick={() => setShowAttendanceModal(true)}
>
  <h3>Öğrenci Katılımı</h3>
  <p>Bugünkü yoklama özeti</p>
  <div className="stat-number">{stats.todaySchedules.length}</div>
  <div className="stat-label">Bugünkü Ders</div>
</div>
```

### 2. AttendanceModal Component

```jsx
<Modal show={showAttendanceModal} onClose={...}>
  <h2>Bugünün Dersleri - Yoklama</h2>
  <div className="lessons-grid">
    {todayLessons.map(lesson => (
      <LessonCard
        lesson={lesson}
        onClick={() => handleLessonClick(lesson)}
      />
    ))}
  </div>
</Modal>
```

### 3. LessonAttendanceModal Component

```jsx
<Modal show={showLessonModal} onClose={...}>
  <h2>{selectedLesson.course_name}</h2>
  <p>{selectedLesson.start_time} - {selectedLesson.end_time}</p>

  <div className="attendance-actions">
    {selectedLesson.students.map(student => (
      <div className="student-attendance">
        <span>{student.first_name} {student.last_name}</span>
        <div className="attendance-buttons">
          <button
            className={status === 'present' ? 'active' : ''}
            onClick={() => markAttendance(student.id, 'present')}
          >
            ✓ Geldi
          </button>
          <button
            className={status === 'absent' ? 'active' : ''}
            onClick={() => markAttendance(student.id, 'absent')}
          >
            ✗ Gelmedi
          </button>
        </div>
      </div>
    ))}

    <button
      className="cancel-lesson-btn"
      onClick={() => cancelLesson()}
    >
      🚫 Dersi İptal Et
    </button>
  </div>
</Modal>
```

### 4. StudentDetail.jsx Güncellemeleri

Öğrenci detay sayfasında ders programı görünümü:

```jsx
<div
  className="lesson-card"
  style={{
    backgroundColor: getStatusColor(attendance.status),
  }}
>
  <div className="lesson-info">
    <span>{lesson.date}</span>
    <span>{lesson.course_name}</span>
  </div>
  <div className="lesson-status">
    {attendance.status === "present" && "✓ Geldi"}
    {attendance.status === "absent" && "✗ Gelmedi"}
    {attendance.status === "cancelled" && "🚫 İptal"}
  </div>
</div>
```

**Renk Kodları:**

- Yeşil (#10b981): present
- Kırmızı (#ef4444): absent
- Siyah (#1f2937): cancelled
- Gri (#6b7280): Henüz işaretlenmemiş

### 5. TeacherDetail.jsx Güncellemeleri

Öğretmen detay sayfasında ders istatistikleri:

```jsx
<div className="teacher-stats">
  <div className="stat-card">
    <h4>Planlanan Dersler</h4>
    <span className="stat-number">{stats.planned}</span>
  </div>
  <div className="stat-card success">
    <h4>Gerçekleşen Dersler</h4>
    <span className="stat-number">{stats.completed}</span>
  </div>
  <div className="stat-card danger">
    <h4>İptal Olan Dersler</h4>
    <span className="stat-number">{stats.cancelled}</span>
  </div>
</div>

<div className="payment-calculation">
  <p>Ders Ücreti: {teacherRate} ₺</p>
  <p>Gerçekleşen Ders: {stats.completed}</p>
  <p className="total">Toplam: {stats.completed * teacherRate} ₺</p>
</div>
```

## 🔄 İş Akışı

### 1. Dashboard'da Yoklama Alma

1. Admin dashboard'a girer
2. "Öğrenci Katılımı" kartına tıklar
3. Modal açılır, bugünün tüm dersleri görünür
4. Bir derse tıklar
5. O dersteki öğrenciler listelenir
6. Her öğrenci için "Geldi/Gelmedi" butonları
7. Veya tüm ders için "Dersi İptal Et" butonu

### 2. Öğrenci Detayında Görüntüleme

1. Öğrenci detay sayfasına gir
2. Ders programı bölümünde her ders renk kodlu
3. Yeşil: Geldi, Kırmızı: Gelmedi, Siyah: İptal
4. Gerekirse dersi başka güne taşıyabilir

### 3. Öğretmen Ödemesi Hesaplama

1. Öğretmen detay sayfasında
2. Sadece "present" (geldi) olan dersler sayılır
3. İptal ve gelmedi olan dersler hesaba katılmaz
4. Gerçekleşen ders sayısı × Ders ücreti = Toplam

## 📁 Dosya Yapısı

```
backend/
├── migrations/
│   └── 014_create_attendance_table.sql
├── controllers/
│   ├── attendanceController.js (YENİ)
│   ├── studentController.js (GÜNCELLE)
│   ├── scheduleController.js (GÜNCELLE)
│   └── teacherController.js (GÜNCELLE)
├── routes/
│   └── attendance.js (YENİ)

frontend/
├── src/
│   ├── pages/
│   │   ├── Dashboard.jsx (GÜNCELLE)
│   │   ├── StudentDetail.jsx (GÜNCELLE)
│   │   └── TeacherDetail.jsx (GÜNCELLE)
│   ├── components/
│   │   ├── AttendanceModal.jsx (YENİ)
│   │   └── LessonAttendanceModal.jsx (YENİ)
│   └── services/
│       └── api.js (GÜNCELLE - attendance endpoints)
```

## ✅ Implementation Checklist

### Backend

- [ ] Migration: attendance tablosu oluştur
- [ ] attendanceController.js oluştur
- [ ] attendance routes oluştur
- [ ] studentController'a stats endpoint ekle
- [ ] scheduleController'a today endpoint ekle
- [ ] teacherController'a lesson-stats endpoint ekle
- [ ] server.js'e attendance routes ekle

### Frontend

- [ ] AttendanceModal component oluştur
- [ ] LessonAttendanceModal component oluştur
- [ ] Dashboard.jsx güncelle (Son Kayıtlar kartı)
- [ ] Dashboard.jsx güncelle (Öğrenci Katılımı kartı)
- [ ] StudentDetail.jsx'e renk kodlu ders görünümü ekle
- [ ] TeacherDetail.jsx'e ders istatistikleri ekle
- [ ] api.js'e attendance endpoints ekle
- [ ] CSS stilleri ekle

## 🎯 Beklenen Sonuç

1. ✅ Dashboard'da öğrenci durumları (aktif/pasif/tamamlanan) görünür
2. ✅ Dashboard'dan hızlıca yoklama alınabilir
3. ✅ Öğrenci detayında dersler renk kodlu görünür
4. ✅ Öğretmen ödemeleri sadece gerçekleşen derslere göre hesaplanır
5. ✅ Tüm sistem birbiriyle senkronize çalışır
