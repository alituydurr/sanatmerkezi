# Sanat Merkezi Yönetim Sistemi

Sanat merkezi için kapsamlı bir yönetim sistemi. Öğrenci/öğretmen kayıtları, ders atamaları, ödeme takibi ve takvim yönetimi özellikleri içerir.

## 🎯 Özellikler

### Yönetim Modülleri

- ✅ **Öğrenci Yönetimi**: Öğrenci kayıtları, bilgi güncelleme, derse atama
- ✅ **Öğretmen Yönetimi**: Öğretmen kayıtları, kullanıcı hesapları, ders atamaları
- ✅ **Ders Yönetimi**: Grup ve birebir dersler, kapasite yönetimi
- ✅ **Ders Program Takvimi**: Haftalık program, çakışma kontrolü
- ✅ **Ödeme Takibi**: Taksitli ödeme planları, ödeme kayıtları

### Güvenlik

- 🔐 JWT tabanlı kimlik doğrulama
- 🛡️ Rol bazlı yetkilendirme (Admin / Öğretmen)
- 🔒 Backend ve frontend tamamen ayrı
- ✅ Şifreler bcrypt ile hash'leniyor

### Kullanıcı Deneyimi

- 🎨 Modern ve premium tasarım
- 📱 Responsive (mobil uyumlu)
- ⚡ Hızlı ve akıcı animasyonlar
- 🌈 Gradient'ler ve glassmorphism efektleri

## 📁 Proje Yapısı

```
sanatm/
├── backend/              # Node.js + Express API
│   ├── config/          # Veritabanı yapılandırması
│   ├── controllers/     # İş mantığı
│   ├── middleware/      # Auth, error handling
│   ├── models/          # Database schema
│   ├── routes/          # API endpoints
│   ├── scripts/         # DB initialization
│   └── server.js        # Ana sunucu
│
└── frontend/            # React + Vite
    ├── public/
    └── src/
        ├── components/  # Layout, Sidebar, etc.
        ├── context/     # Auth context
        ├── pages/       # Dashboard, Students, etc.
        ├── services/    # API calls
        └── App.jsx
```

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler

- Node.js 18+
- PostgreSQL 14+

### 1. Backend Kurulumu

```bash
cd backend
npm install
```

`.env` dosyası oluşturun:

```bash
copy .env.example .env
```

`.env` dosyasını düzenleyin ve PostgreSQL bilgilerinizi girin:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sanat_merkezi
DB_USER=postgres
DB_PASSWORD=your_password
```

Veritabanını başlatın:

```bash
npm run init-db
```

Backend'i çalıştırın:

```bash
npm run dev
```

Backend http://localhost:5000 adresinde çalışacak.

### 2. Frontend Kurulumu

```bash
cd frontend
npm install
```

Frontend'i çalıştırın:

```bash
npm run dev
```

Frontend http://localhost:5173 adresinde çalışacak.

## 👤 Demo Hesaplar

Veritabanı başlatıldıktan sonra kullanabileceğiniz hesaplar:

**Admin:**

- Email: `admin@sanatmerkezi.com`
- Şifre: `admin123`

**Öğretmen:**

- Email: `teacher@sanatmerkezi.com`
- Şifre: `teacher123`

## 🛠️ Teknoloji Stack

### Backend

- **Node.js** - Runtime environment
- **Express** - Web framework
- **PostgreSQL** - Veritabanı
- **JWT** - Kimlik doğrulama
- **bcrypt** - Şifre hashleme

### Frontend

- **React 18** - UI library
- **Vite** - Build tool
- **React Router** - Routing
- **Axios** - HTTP client
- **Vanilla CSS** - Styling (premium design system)

## 📚 API Endpoints

### Authentication

- `POST /api/auth/login` - Giriş yap
- `GET /api/auth/me` - Kullanıcı bilgisi

### Students

- `GET /api/students` - Tüm öğrenciler
- `POST /api/students` - Yeni öğrenci (admin)
- `PUT /api/students/:id` - Güncelle (admin)
- `DELETE /api/students/:id` - Sil (admin)

### Teachers

- `GET /api/teachers` - Tüm öğretmenler
- `POST /api/teachers` - Yeni öğretmen (admin)
- `PUT /api/teachers/:id` - Güncelle (admin)
- `DELETE /api/teachers/:id` - Sil (admin)

### Courses

- `GET /api/courses` - Tüm dersler
- `POST /api/courses` - Yeni ders (admin)
- `PUT /api/courses/:id` - Güncelle (admin)
- `DELETE /api/courses/:id` - Sil (admin)

### Schedules

- `GET /api/schedules` - Tüm programlar (rol bazlı)
- `POST /api/schedules` - Yeni program (admin)
- `PUT /api/schedules/:id` - Güncelle (admin)
- `DELETE /api/schedules/:id` - Sil (admin)

### Payments

- `GET /api/payments/plans` - Ödeme planları
- `POST /api/payments/plans` - Yeni plan (admin)
- `POST /api/payments/record` - Ödeme kaydet (admin)
- `GET /api/payments/pending` - Bekleyen ödemeler

## 🎨 Tasarım Özellikleri

- **Modern Color Palette**: HSL tabanlı, uyumlu renkler
- **Premium Gradients**: Çoklu gradient kombinasyonları
- **Smooth Animations**: Fade-in, slide-in, pulse efektleri
- **Glassmorphism**: Blur ve transparency efektleri
- **Responsive Grid**: Otomatik responsive layout
- **Custom Scrollbar**: Özelleştirilmiş scrollbar tasarımı

## 📝 Lisans

Bu proje özel kullanım içindir.

## 🤝 Katkıda Bulunma

Önerileriniz için issue açabilirsiniz.

---

**Geliştirici Notu**: Proje tamamen TypeScript'siz, vanilla CSS ile geliştirilmiştir. Maksimum performans ve minimum bağımlılık hedeflenmiştir.
