# Etkinlikler Özelliği - Migration Talimatları

## Veritabanı Migration'ı Çalıştırma

Etkinlikler özelliğini kullanabilmek için aşağıdaki SQL dosyasını çalıştırmanız gerekmektedir:

```bash
# PostgreSQL'e bağlanın
psql -U postgres -d sanatmerkezi

# Migration dosyasını çalıştırın
\i backend/migrations/007_create_events.sql
```

Veya doğrudan SQL içeriğini kopyalayıp pgAdmin'de çalıştırabilirsiniz.

## Yeni Özellikler

### 1. Etkinlikler Sayfası

- Duvar boyama, özel etkinlik, atölye gibi etkinlikler eklenebilir
- Başlangıç ve bitiş tarihleri
- Saat aralıkları
- Ücret bilgisi
- Öğretmen ataması

### 2. Dashboard Güncellemeleri (Yakında)

- Gelirler ve giderler
- Planlanan gelirler ve giderler
- Net kar hesaplama
- Ay bazlı filtreleme

### 3. Raporlar Sayfası (Yakında)

- Gelir/gider raporları
- Öğrenci bazlı gelir analizi
- Etkinlik bazlı gelir analizi
- PDF export

## API Endpoints

- `GET /api/events` - Tüm etkinlikleri listele
- `GET /api/events/:id` - Etkinlik detayı
- `POST /api/events` - Yeni etkinlik ekle
- `PUT /api/events/:id` - Etkinlik güncelle
- `DELETE /api/events/:id` - Etkinlik sil
- `POST /api/events/enroll` - Öğrenci kaydı
- `POST /api/events/payment` - Ödeme kaydı
