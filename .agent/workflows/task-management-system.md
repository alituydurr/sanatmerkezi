---
description: Görev Yönetimi ve Notlar Sistemi
---

# Notlar Sistemi - Görev Yönetimi

## Genel Bakış

Sanat Merkezi yönetim sistemine eklenen notlar modülü, şifreler ve önemli bilgileri güvenli bir şekilde saklamak için kullanılır.

## Özellikler

### 📝 Not Yönetimi

- **Yeni Not Oluşturma**: Başlık, içerik, kategori ve renk seçimi
- **Not Düzenleme**: Mevcut notları güncelleme
- **Not Silme**: İstenmeyen notları kaldırma
- **Not Sabitleme**: Önemli notları en üstte tutma (📌)

### 🎨 Renklendirme

8 farklı renk seçeneği:

- Sarı (#FFE066) - Varsayılan
- Turuncu (#FFB84D)
- Pembe (#FF9ECD)
- Mor (#D4A5FF)
- Mavi (#A5D8FF)
- Yeşil (#B2F2BB)
- Kırmızı (#FFA8A8)
- Gri (#DEE2E6)

### 📂 Kategoriler

- Şifreler
- Önemli Bilgiler
- Kişisel
- İş
- Genel
- Diğer

### 🔍 Arama ve Filtreleme

- Başlık ve içerikte arama
- Kategoriye göre filtreleme
- Sabitlenmiş notları görüntüleme
- "Tümü" filtresi

## Teknik Detaylar

### Veritabanı

**Tablo**: `notes`

```sql
- id (SERIAL PRIMARY KEY)
- title (VARCHAR 255)
- content (TEXT)
- color (VARCHAR 20)
- category (VARCHAR 100)
- is_pinned (BOOLEAN)
- is_encrypted (BOOLEAN) - Gelecek özellik için
- created_by (INTEGER) - users tablosuna referans
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Backend API Endpoints

- `GET /api/notes` - Tüm notları getir
- `GET /api/notes/:id` - Tek bir notu getir
- `POST /api/notes` - Yeni not oluştur
- `PUT /api/notes/:id` - Notu güncelle
- `DELETE /api/notes/:id` - Notu sil
- `PATCH /api/notes/:id/pin` - Sabitleme durumunu değiştir

### Frontend

- **Sayfa**: `/notes`
- **Menü**: Sidebar'da "📝 Notlarım"
- **Erişim**: Admin ve öğretmenler

## Dosya Yapısı

```
backend/
├── controllers/
│   └── noteController.js
├── routes/
│   └── notes.js
└── migrations/
    └── 001_notes_table.sql

frontend/
└── src/
    └── pages/
        ├── Notes.jsx
        └── Notes.css
```

## Kullanım

1. **Yeni Not Ekle**: "➕ Yeni Not" butonuna tıklayın
2. **Not Düzenle**: Not kartındaki ✏️ ikonuna tıklayın
3. **Not Sabitle**: Not kartındaki 📍 ikonuna tıklayın
4. **Not Sil**: Not kartındaki 🗑️ ikonuna tıklayın
5. **Arama**: Üst kısımdaki arama kutusunu kullanın
6. **Filtreleme**: Kategori butonlarına tıklayın

## Güvenlik

- Tüm endpoint'ler authentication gerektirir
- Her not, oluşturan kullanıcıya bağlıdır
- Sadece giriş yapmış kullanıcılar erişebilir

## Gelecek Geliştirmeler

- [ ] Not şifreleme (is_encrypted alanı kullanılacak)
- [ ] Notları paylaşma
- [ ] Etiketleme sistemi
- [ ] Dosya ekleme
- [ ] Rich text editor
- [ ] Not arşivleme
