---
description: Görev Yönetimi ve Notlar Sistemi
---

# Görev Yönetimi ve Notlar Sistemi - Planlama Dokümanı

## 📋 Genel Bakış

Sanat merkezi yönetimi için günlük görev takip ve not alma sistemi. Sistem sadece **bugün ve yarın** için görevler oluşturur, uzun vadeli hatırlatmalara gerek yoktur.

---

## 🎯 Özellikler

### 1. Otomatik Günlük Görevler

**ÖNEMLİ**: Bu sayfa **gelecek planlama** içindir. Bugünün dersleri/etkinlikleri zaten dashboard'da var.

**Görev Mantığı**:

- **Bugünü seçtiğinizde** → **Yarının** derslerini gösterir
- **Yarını seçtiğinizde** → **Öbür günün** derslerini gösterir
- **Herhangi bir günü seçtiğinizde** → **Ertesi günün** derslerini gösterir

**Amaç**: Öğrencilerin gelip gelmeyeceğini önceden öğrenmek ve planlama yapmak

#### 📚 Ders Onayları (Ertesi Gün)

- Seçilen günün **ertesi günü** olan dersler
- **Her ders için ayrı satır** (liste formatı)
- Öğrenci adı, ders adı, saat bilgisi
- Tıklanınca ders detayına gidilebilir
- Öğrencinin gelip gelmeyeceğini kontrol etmek için

**Örnek**: 17 Aralık'ı seçtiğinizde → 18 Aralık'ın dersleri görünür

```
📚 18 Aralık'ın Dersleri (Yarın)
• 09:00 - Ahmet Yılmaz - Resim Dersi
• 10:30 - Ayşe Demir - Müzik Dersi
• 14:00 - Mehmet Kaya - Dans Dersi
```

#### 🎨 Etkinlik Hazırlıkları (Ertesi Gün)

- Seçilen günün **ertesi günü** olan etkinlikler
- Malzeme kontrolü, katılımcı listesi, mekan hazırlığı

#### 👨‍🏫 Öğretmen Ödemeleri (Seçilen Gün)

- **Sadece seçilen günde planlanmış** öğretmen ödemeleri
- Bu görev tipi için ertesi gün değil, seçilen gün gösterilir

**NOT**: Öğrenci ödeme hatırlatmaları kaldırıldı - zaten "Bugünün Ödemeleri" dashboard widget'ı var

### 2. Notlar Sistemi (Yeni!)

Ayrı bir **Notlar** sayfası:

- Kullanıcılar kendi notlarını ekleyebilir
- Şifreler, hatırlatmalar, önemli bilgiler
- Not ekleme, düzenleme, silme
- Kategorilere ayırma (Şifre, Hatırlatma, Önemli, Genel)
- Renk kodlama (sarı, mavi, yeşil, kırmızı)
- Sabitleme özelliği (önemli notlar üstte)
- Arama ve filtreleme

### 3. Görev Durumları

- **Bekliyor** (pending): Henüz yapılmadı
- **Tamamlandı** (completed): Manuel olarak tamamlandı
- **İptal Edildi** (cancelled): Artık gerekli değil

### 4. Dashboard Entegrasyonu

Dashboard'da özet widget (**bugünün** aktiviteleri):

- **Bugünün** dersleri (yoklama için)
- **Bugünün** etkinlikleri
- **Bugünün** ödemeleri
- Tıklanınca Görevler sayfasına yönlendirme (yarının planlaması için)

---

## 🗄️ Veritabanı Yapısı

### `tasks` Tablosu (Basitleştirilmiş)

```sql
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,

  -- Görev Bilgileri
  title VARCHAR(255) NOT NULL,
  description TEXT,
  task_type VARCHAR(50) NOT NULL CHECK (task_type IN (
    'lesson_confirmation',   -- Ders onayı (yarın)
    'event_preparation',     -- Etkinlik hazırlığı (yarın)
    'teacher_payment'        -- Öğretmen ödemesi (bugün)
  )),

  -- Durum
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
    'pending',
    'completed',
    'cancelled'
  )),

  -- Tarihler
  task_date DATE NOT NULL,  -- Görevin ilgili olduğu tarih (yarın veya bugün)
  completed_at TIMESTAMP,

  -- İlişkiler (Opsiyonel)
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  teacher_payment_id INTEGER REFERENCES teacher_payments(id) ON DELETE CASCADE,
  schedule_id INTEGER REFERENCES course_schedules(id) ON DELETE CASCADE,

  -- Kullanıcı Bilgileri
  created_by INTEGER REFERENCES users(id),
  completed_by INTEGER REFERENCES users(id),

  -- Otomatik Görev Bilgisi
  is_auto_generated BOOLEAN DEFAULT true,

  -- Zaman Damgaları
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- İndeksler
CREATE INDEX idx_tasks_task_date ON tasks(task_date);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_task_type ON tasks(task_type);
CREATE INDEX idx_tasks_student ON tasks(student_id);
CREATE INDEX idx_tasks_event ON tasks(event_id);
CREATE INDEX idx_tasks_schedule ON tasks(schedule_id);
```

### `notes` Tablosu (Yeni!)

```sql
CREATE TABLE notes (
  id SERIAL PRIMARY KEY,

  -- Not Bilgileri
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100),  -- 'password', 'reminder', 'important', 'general'

  -- Renk/Etiket (UI için)
  color VARCHAR(20) DEFAULT 'yellow',  -- 'yellow', 'blue', 'green', 'red'
  is_pinned BOOLEAN DEFAULT false,      -- Üstte sabitle

  -- Kullanıcı Bilgileri
  created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,

  -- Zaman Damgaları
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- İndeksler
CREATE INDEX idx_notes_created_by ON notes(created_by);
CREATE INDEX idx_notes_category ON notes(category);
CREATE INDEX idx_notes_is_pinned ON notes(is_pinned);
CREATE INDEX idx_notes_created_at ON notes(created_at DESC);
```

---

## 🤖 Otomatik Görev Oluşturma Kuralları

### 1. Ders Onayları (Yarın)

**Tetikleyici**: Her gün akşam veya manuel tetikleme

**SQL Sorgusu**:

```sql
-- Yarın olan tüm dersler (her ders ayrı görev)
SELECT
  cs.id as schedule_id,
  cs.specific_date,
  cs.start_time,
  cs.end_time,
  s.id as student_id,
  s.first_name,
  s.last_name,
  c.name as course_name
FROM course_schedules cs
LEFT JOIN students s ON cs.student_id = s.id
LEFT JOIN courses c ON cs.course_id = c.id
WHERE cs.specific_date::date = CURRENT_DATE + INTERVAL '1 day'
ORDER BY cs.start_time;
```

**Görev Oluşturma**:

- **Başlık**: "Ders Onayı: [Öğrenci Adı] - [Ders Adı]"
- **Açıklama**: "Yarın saat [Saat] - Öğrencinin gelip gelmeyeceğini kontrol edin"
- **Tip**: `lesson_confirmation`
- **Tarih**: Yarın

### 2. Etkinlik Hazırlıkları (Yarın)

**Tetikleyici**: Her gün akşam veya manuel tetikleme

**SQL Sorgusu**:

```sql
-- Yarın başlayan etkinlikler
SELECT
  e.id,
  e.name,
  e.start_date,
  e.start_time,
  e.end_time,
  t.first_name as teacher_first_name,
  t.last_name as teacher_last_name
FROM events e
LEFT JOIN teachers t ON e.teacher_id = t.id
WHERE e.start_date = CURRENT_DATE + INTERVAL '1 day'
  AND e.status IN ('planned', 'ongoing');
```

**Görev Oluşturma**:

- **Başlık**: "Etkinlik Hazırlığı: [Etkinlik Adı]"
- **Açıklama**: "Yarın başlayan etkinlik için:\n- Malzeme kontrolü\n- Katılımcı listesi\n- Mekan hazırlığı"
- **Tip**: `event_preparation`
- **Tarih**: Yarın

### 3. Öğretmen Ödemeleri (Bugün)

**Tetikleyici**: Her gün sabah veya manuel tetikleme

**SQL Sorgusu**:

```sql
-- Bugün planlanmış öğretmen ödemeleri
-- (Bu özellik için ayrı bir "planned_payment_date" alanı eklenebilir)
SELECT
  tp.id,
  tp.teacher_id,
  tp.month_year,
  tp.remaining_amount,
  t.first_name,
  t.last_name
FROM teacher_payments tp
JOIN teachers t ON tp.teacher_id = t.id
WHERE tp.status IN ('pending', 'partial')
  AND tp.remaining_amount > 0
  AND tp.planned_payment_date = CURRENT_DATE;  -- Yeni alan
```

**Görev Oluşturma**:

- **Başlık**: "Öğretmen Ödemesi: [Öğretmen Adı]"
- **Açıklama**: "[Ay] ayı ödemesi - Kalan: [Tutar] TL"
- **Tip**: `teacher_payment`
- **Tarih**: Bugün

---

## 🎨 UI/UX Tasarımı

### Dashboard Widget (Bugünün Aktiviteleri)

**NOT**: Dashboard **bugünün** aktivitelerini gösterir, Görevler sayfası **gelecek planlama** içindir.

```
┌─────────────────────────────────────────┐
│ 📋 Bugünün Aktiviteleri        [Detay] │
├─────────────────────────────────────────┤
│                                         │
│ 📚 Bugünün Dersleri (5)                 │
│ • 09:00 - Ahmet Yılmaz - Resim         │
│ • 10:30 - Ayşe Demir - Müzik           │
│ • 14:00 - Mehmet Kaya - Dans           │
│ • 15:30 - Zeynep Ak - Resim            │
│ • 16:00 - Can Yıldız - Müzik           │
│                                         │
│ 🎨 Bugünün Etkinlikleri (1)             │
│ • Resim Workshop - 10:00               │
│                                         │
│ 💰 Bugünün Ödemeleri (3)                │
│ • Ahmet Yılmaz - 1,500 TL              │
│ • Ayşe Demir - 2,000 TL                │
│ • Mehmet Kaya - 1,200 TL               │
│                                         │
│ [Görevler] → Yarının planlaması için   │
└─────────────────────────────────────────┘
```

### Görevler Sayfası

**Görünüm Seçenekleri**:

- 📋 Liste Görünümü
- 📅 Takvim Görünümü

#### Takvim Görünümü (Yeni!)

```
┌─────────────────────────────────────────────────────────────┐
│ 📅 Görevler - Takvim Görünümü              [Liste] [Takvim] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              Aralık 2025                    [◀] [▶]        │
│                                                             │
│  Pzt   Sal   Çar   Per   Cum   Cmt   Paz                   │
│   1     2     3     4     5     6     7                     │
│   8     9    10    11    12    13    14                    │
│  15   [16]   17    18    19    20    21    ← Bugün         │
│  22    23    24    25    26    27    28                    │
│  29    30    31                                             │
│                                                             │
│  • Mavi nokta: Ders onayı var                              │
│  • Mor nokta: Etkinlik var                                 │
│  • Turuncu nokta: Öğretmen ödemesi var                     │
│  • Yeşil: Tamamlandı                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Seçili Gün: 17 Aralık 2025 (Yarın)
┌─────────────────────────────────────────────────────┐
│ 📚 Ders Onayları (5)                                │
│ • 09:00 - Ahmet Yılmaz - Resim              [✓] [✕]│
│ • 10:30 - Ayşe Demir - Müzik                [✓] [✕]│
│ • 14:00 - Mehmet Kaya - Dans                [✓] [✕]│
│ • 15:30 - Zeynep Ak - Resim                 [✓] [✕]│
│ • 16:00 - Can Yıldız - Müzik                [✓] [✕]│
│                                                     │
│ 🎨 Etkinlikler (1)                                  │
│ • 10:00 - Resim Workshop                    [✓] [✕]│
└─────────────────────────────────────────────────────┘
```

**Takvim Özellikleri**:

- Herhangi bir güne tıklanabilir
- Geçmiş günlere dönüp görevler tamamlanabilir
- Her günde kaç görev olduğu renkli noktalarla gösterilir
- Seçili günün görevleri altında liste halinde görünür
- Ay değiştirme ok tuşları

#### Liste Görünümü

**Filtreler**:

- Tarih Seçici: [Takvim icon] 17 Aralık 2025
- Tip: Tümü / Dersler / Etkinlikler / Öğretmen Ödemeleri
- Durum: Bekliyor / Tamamlandı / İptal

**Liste Görünümü**:

```
┌─────────────────────────────────────────────────────┐
│ 📚 Ders Onayı: Ahmet Yılmaz - Resim        [✓] [✕] │
│ Yarın 09:00 - Öğrencinin gelip gelmeyeceğini sor   │
│ [Ders Detayı] [Öğrenci Detayı]                     │
├─────────────────────────────────────────────────────┤
│ 📚 Ders Onayı: Ayşe Demir - Müzik          [✓] [✕] │
│ Yarın 10:30 - Öğrencinin gelip gelmeyeceğini sor   │
│ [Ders Detayı] [Öğrenci Detayı]                     │
├─────────────────────────────────────────────────────┤
│ 🎨 Etkinlik Hazırlığı: Resim Workshop      [✓] [✕] │
│ Yarın 10:00 - Malzeme, katılımcı, mekan kontrolü  │
│ [Etkinlik Detayı]                                  │
├─────────────────────────────────────────────────────┤
│ 👨‍🏫 Öğretmen Ödemesi: Mehmet Bey           [✓] [✕] │
│ Bugün - Aralık ayı - Kalan: 8,500 TL               │
│ [Ödeme Yap] [Ödeme Detayı]                         │
└─────────────────────────────────────────────────────┘
```

### Notlar Sayfası

**Kategoriler**:

- 🔑 Şifreler
- ⏰ Hatırlatmalar
- ⭐ Önemli
- 📝 Genel

**Not Kartı**:

```
┌─────────────────────────────────────────────────────┐
│ 📌 🔑 Email Şifresi                    [Düzenle] [Sil]│
├─────────────────────────────────────────────────────┤
│ Email: admin@sanatmerkezi.com                       │
│ Şifre: ********                                     │
│                                                     │
│ 📅 15 Aralık 2025, 14:30                           │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ ⏰ Kira Ödeme Günü                     [Düzenle] [Sil]│
├─────────────────────────────────────────────────────┤
│ Her ayın 5'i kira ödemesi yapılacak                │
│ Ev sahibi: Ahmet Bey - 0555 123 4567               │
│                                                     │
│ 📅 10 Aralık 2025, 09:15                           │
└─────────────────────────────────────────────────────┘
```

---

## 📱 API Endpoints

### Görevler

```javascript
// Görevleri listele (tarih bazlı)
GET /api/tasks
Query: ?date=2025-12-17&type=lesson_confirmation&status=pending

// Belirli bir ay için görev özeti (takvim için)
GET /api/tasks/calendar-summary
Query: ?month=2025-12
Response: {
  "2025-12-16": { total: 0, completed: 0, types: [] },
  "2025-12-17": {
    total: 6,
    completed: 0,
    types: ['lesson_confirmation', 'event_preparation']
  },
  "2025-12-18": {
    total: 3,
    completed: 1,
    types: ['lesson_confirmation', 'teacher_payment']
  }
  // ... her gün için
}

// Görev detayı
GET /api/tasks/:id

// Görevi tamamla
POST /api/tasks/:id/complete
Body: { notes }

// Görevi iptal et
POST /api/tasks/:id/cancel
Body: { reason }

// Otomatik görevleri oluştur (manuel tetikleme)
POST /api/tasks/generate
Body: { date: '2025-12-17' }  // İstenen tarih için görevler oluştur

// Dashboard özeti
GET /api/tasks/summary
Response: {
  tomorrow_lessons: [...],
  tomorrow_events: [...],
  today_teacher_payments: [...]
}
```

### Notlar

```javascript
// Notları listele
GET /api/notes
Query: ?category=password&pinned=true

// Not detayı
GET /api/notes/:id

// Yeni not oluştur
POST /api/notes
Body: { title, content, category, color, is_pinned }

// Notu güncelle
PUT /api/notes/:id
Body: { title, content, category, color, is_pinned }

// Notu sil
DELETE /api/notes/:id

// Notu sabitle/çöz
POST /api/notes/:id/toggle-pin
```

---

## 🚀 Uygulama Adımları

### Faz 1: Veritabanı ve Backend (1-2 Gün)

1. Migration dosyaları oluştur (`tasks` ve `notes` tabloları)
2. Backend API endpoints (tasks ve notes)
3. Otomatik görev oluşturma fonksiyonları

### Faz 2: Frontend - Görevler (1 Gün)

1. Dashboard widget (özet görünüm)
2. Görevler sayfası (liste formatı)
3. Görev tamamlama/iptal işlemleri

### Faz 3: Frontend - Notlar (1 Gün)

1. Notlar sayfası
2. Not ekleme/düzenleme/silme
3. Kategori ve renk yönetimi
4. Sabitleme özelliği

### Faz 4: Entegrasyonlar (1 Gün)

1. Sidebar menü ekleme
2. Dashboard entegrasyonu
3. İlgili sayfalara yönlendirmeler
4. Test ve hata düzeltme

---

## 💡 Önemli Notlar

- Görevler her gün otomatik oluşturulur (cron job veya manuel tetikleme)
- Sadece bugün ve yarın için görevler gösterilir
- Eski görevler otomatik silinir veya arşivlenir
- Her ders için ayrı görev satırı oluşturulur
- Notlar kullanıcıya özeldir (her kullanıcı kendi notlarını görür)
- Sabitlenmiş notlar her zaman en üstte görünür

---

## 🎨 Renk Kodları

### Görevler

- **Ders Onayı**: 🔵 Mavi (#3B82F6)
- **Etkinlik**: 🟣 Mor (#8B5CF6)
- **Öğretmen Ödemesi**: 🟡 Turuncu (#F59E0B)
- **Tamamlandı**: ✅ Yeşil (#22C55E)
- **İptal**: ❌ Gri (#6B7280)

### Notlar

- **Şifre**: 🔴 Kırmızı (#EF4444)
- **Hatırlatma**: 🟡 Sarı (#F59E0B)
- **Önemli**: 🟠 Turuncu (#F97316)
- **Genel**: 🔵 Mavi (#3B82F6)
