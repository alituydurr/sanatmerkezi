# Tarih Bazlı Ders Sistemi - Migration Talimatları

## Veritabanı Migration'ı Çalıştırma

Yeni tarih bazlı ders sistemini kullanabilmek için aşağıdaki SQL dosyasını çalıştırmanız gerekmektedir:

**pgAdmin'de:**

1. pgAdmin'i açın
2. `sanatmerkezi` veritabanına bağlanın
3. Query Tool'u açın
4. Aşağıdaki SQL kodunu kopyalayıp yapıştırın:

```sql
-- Update course_schedules to support specific dates instead of just day_of_week
-- Add specific_date column for date-based scheduling

ALTER TABLE course_schedules
ADD COLUMN IF NOT EXISTS specific_date DATE;

-- Add index for specific_date
CREATE INDEX IF NOT EXISTS idx_course_schedules_specific_date
ON course_schedules(specific_date);

-- Update is_recurring to be nullable (some schedules are one-time, some recurring)
ALTER TABLE course_schedules
ALTER COLUMN is_recurring DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN course_schedules.specific_date IS 'Specific date for the class. If set, day_of_week is ignored.';
COMMENT ON COLUMN course_schedules.is_recurring IS 'If true, repeats weekly on day_of_week. If false, occurs only on specific_date.';
```

5. Execute (F5) tuşuna basın

## Yeni Özellikler

### Tarih Bazlı Ders Ekleme

Artık öğrenciye ders eklerken:

- **Başlangıç Tarihi** ve **Bitiş Tarihi** seçebilirsiniz
- **Ders Günleri** checkbox ile seçebilirsiniz (Pazartesi, Çarşamba, Cuma gibi)
- Sistem otomatik olarak seçili tarih aralığındaki tüm seçili günlerde ders oluşturur

### Örnek Kullanım

- Başlangıç: 10 Aralık 2025
- Bitiş: 31 Ocak 2026
- Günler: ✓ Pazartesi, ✓ Çarşamba, ✓ Cuma
- **Sonuç:** 10 Aralık - 31 Ocak arasındaki tüm Pazartesi, Çarşamba ve Cuma günlerinde ders oluşturulur

### Avantajlar

- ✅ Aynı öğrenci farklı günlerde ders alabilir
- ✅ Tatil günleri için ders oluşturulmaz (tarih aralığı dışında bırakılır)
- ✅ Esnek ders programı
- ✅ Toplu ders oluşturma

## Değişiklikler

### Backend

- `course_schedules` tablosuna `specific_date` kolonu eklendi
- `is_recurring` kolonu nullable yapıldı

### Frontend

- `StudentDetail.jsx` - Ders ekleme formu güncellendi
  - Tarih aralığı seçimi
  - Çoklu gün seçimi (checkbox)
  - Otomatik toplu ders oluşturma

## Test

1. Öğrenci detay sayfasına gidin
2. "Ders Ekle" butonuna tıklayın
3. Başlangıç ve bitiş tarihi seçin
4. İstediğiniz günleri işaretleyin
5. Kaydet
6. Sistem kaç ders oluşturduğunu gösterecek

---

**Migration çalıştırıldıktan sonra sistem kullanıma hazır!** 🎉
