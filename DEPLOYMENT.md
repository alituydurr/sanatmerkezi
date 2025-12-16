# 🚀 Sanat Merkezi Yönetim Sistemi - Deployment Rehberi

## 📋 Gereksinimler

### Sunucu Gereksinimleri

- **Node.js**: v18.x veya üzeri
- **PostgreSQL**: v14.x veya üzeri
- **npm**: v9.x veya üzeri

### Paketler

#### Backend Dependencies

```json
{
  "bcrypt": "^5.1.1",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "express": "^4.18.2",
  "express-rate-limit": "^8.2.1",
  "express-validator": "^7.3.1",
  "helmet": "^8.1.0",
  "jsonwebtoken": "^9.0.2",
  "pg": "^8.11.3",
  "winston": "^3.19.0"
}
```

#### Frontend Dependencies

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.20.0",
  "axios": "^1.6.2",
  "date-fns": "^3.0.0",
  "xlsx": "^0.18.5"
}
```

## 🔧 Kurulum Adımları

### 1. Depoyu Klonlayın

```bash
git clone <repository-url>
cd sanatmerkezi
```

### 2. Backend Kurulumu

```bash
cd backend
npm install
```

#### .env Dosyası Oluşturun

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sanat_merkezi
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_super_secret_key_here_min_32_chars

# Server
PORT=5000
NODE_ENV=production
```

#### Veritabanını Başlatın

```bash
# PostgreSQL'e bağlanın
psql -U postgres

# Veritabanını oluşturun
CREATE DATABASE sanat_merkezi;

# Çıkış yapın
\q

# Migration'ları çalıştırın
npm run migrate

# İlk admin kullanıcısını oluşturun
npm run init-db
```

### 3. Frontend Kurulumu

```bash
cd ../frontend
npm install
```

#### Production Build

```bash
npm run build
```

Build dosyaları `dist/` klasöründe oluşturulacak.

## 🌐 Production Deployment

### Backend

#### PM2 ile Çalıştırma (Önerilen)

```bash
# PM2'yi global olarak yükleyin
npm install -g pm2

# Backend'i başlatın
cd backend
pm2 start server.js --name sanat-merkezi-api

# Otomatik başlatmayı etkinleştirin
pm2 startup
pm2 save
```

#### Manuel Çalıştırma

```bash
cd backend
npm start
```

### Frontend

#### Nginx ile Serve Etme (Önerilen)

**Nginx Konfigürasyonu** (`/etc/nginx/sites-available/sanatmerkezi`):

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/sanatmerkezi/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Nginx'i yeniden başlatın:

```bash
sudo ln -s /etc/nginx/sites-available/sanatmerkezi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🔒 Güvenlik

### SSL/HTTPS Kurulumu (Certbot)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Firewall Ayarları

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5432/tcp  # Sadece local erişim için
sudo ufw enable
```

## 📊 Veritabanı Yedekleme

### Otomatik Yedekleme Script'i

```bash
#!/bin/bash
# backup.sh
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U postgres sanat_merkezi > "$BACKUP_DIR/backup_$DATE.sql"

# 30 günden eski yedekleri sil
find $BACKUP_DIR -name "backup_*.sql" -mtime +30 -delete
```

Crontab'a ekleyin (her gün saat 02:00'de):

```bash
crontab -e
# Ekleyin:
0 2 * * * /path/to/backup.sh
```

## 🔍 Monitoring

### PM2 Monitoring

```bash
pm2 monit
pm2 logs sanat-merkezi-api
```

### Nginx Logs

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 🆘 Sorun Giderme

### Backend Başlamıyor

```bash
# Logları kontrol edin
pm2 logs sanat-merkezi-api

# Port kullanımda mı?
sudo lsof -i :5000
```

### Veritabanı Bağlantı Hatası

```bash
# PostgreSQL çalışıyor mu?
sudo systemctl status postgresql

# .env dosyası doğru mu?
cat backend/.env
```

### Frontend Build Hatası

```bash
# node_modules'ü temizleyin
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📝 Önemli Notlar

1. **JWT_SECRET**: Production'da mutlaka güçlü bir secret kullanın
2. **Database Password**: Güçlü bir şifre belirleyin
3. **CORS**: Production'da sadece kendi domain'inize izin verin
4. **Rate Limiting**: API endpoint'lerine rate limit eklenmiştir
5. **Helmet**: Güvenlik header'ları otomatik eklenir

## 🔄 Güncelleme

```bash
# Kodu çekin
git pull origin main

# Backend
cd backend
npm install
pm2 restart sanat-merkezi-api

# Frontend
cd ../frontend
npm install
npm run build

# Nginx'i yeniden yükleyin
sudo systemctl reload nginx
```

## 📞 Destek

Sorun yaşarsanız:

1. Logları kontrol edin
2. .env dosyasını kontrol edin
3. Veritabanı bağlantısını test edin
4. Port'ların açık olduğundan emin olun
