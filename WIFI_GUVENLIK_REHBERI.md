# 🔒 WiFi Güvenlik Rehberi (Development)

## ⚠️ Riskler ve Çözümler

### **Risk 1: Aynı WiFi'deki Kişiler Erişebilir**

**Durum:**

- Aynı WiFi'ye bağlı herkes `http://192.168.0.36:5173` adresine erişebilir
- Login sayfasını görebilir
- Şifre bilmiyorsa içeri giremez

**Çözüm:**
✅ **Zaten Korumalı:** JWT authentication aktif
✅ **Şifre Güçlü Olmalı:** Admin şifreleri güçlü olmalı
✅ **Rate Limiting:** 5 başarısız denemeden sonra hesap kilitlenir

**Ek Önlem (Opsiyonel):**

```javascript
// IP whitelist ekleyin (sadece belirli IP'ler erişebilir)
// backend/middleware/ipWhitelist.js
const allowedIPs = ["192.168.0.36", "192.168.0.50"]; // Tablet IP'si
```

---

### **Risk 2: HTTP Şifrelenmemiş (Paket Dinleme)**

**Durum:**

- Development'ta HTTP kullanılıyor (HTTPS değil)
- Aynı WiFi'de paket dinleme yapılabilir
- Şifreler ve token'lar görülebilir

**Risk Seviyesi:**

- 🟢 **Ev WiFi'si:** DÜŞÜK (güvenilir ağ)
- 🔴 **Kafe/Otel WiFi'si:** YÜKSEK (güvenilmeyen ağ)

**Çözüm 1: Sadece Güvenilir WiFi Kullanın**

```
✅ Ev WiFi'si (WPA2/WPA3 şifreli)
❌ Açık WiFi (şifresiz)
❌ Kafe/Otel WiFi'si
```

**Çözüm 2: Development'ta HTTPS Kullanın (Gelişmiş)**

```bash
# Vite'de HTTPS aktif etme
npm install -D @vitejs/plugin-basic-ssl

# vite.config.js
import basicSsl from '@vitejs/plugin-basic-ssl'

export default {
  plugins: [basicSsl()],
  server: {
    https: true,
    host: true
  }
}
```

**Çözüm 3: VPN Kullanın**

```
Bilgisayar → VPN → Internet
Tablet → VPN → Internet
```

- Tüm trafik şifrelenir
- Paket dinleme engellenır

---

### **Risk 3: Man-in-the-Middle (MITM) Saldırısı**

**Durum:**

- Hacker kendini router gibi gösterebilir
- Tüm trafiği görebilir ve değiştirebilir

**Risk Seviyesi:**

- 🟢 **Ev WiFi'si:** DÜŞÜK
- 🔴 **Açık WiFi:** ÇOK YÜKSEK

**Çözüm:**

1. **Güvenilir WiFi Kullanın**

   - WPA2/WPA3 şifreli
   - Güçlü WiFi şifresi
   - Router admin şifresi değiştirilmiş

2. **HTTPS Kullanın** (yukarıdaki çözüm)

3. **Firewall Aktif**
   - Windows Defender Firewall açık
   - Sadece gerekli portlar açık

---

## 🛡️ Güvenlik Seviyeleri

### **Seviye 1: Temel (Şu an aktif)** ✅

```
✅ JWT Authentication
✅ Database localhost only
✅ CORS koruması
✅ Rate limiting
✅ bcrypt password hashing
```

**Yeterli mi?** Ev WiFi'si için EVET ✅

---

### **Seviye 2: Orta (Önerilen)** 🔒

```
✅ Seviye 1 +
✅ Güçlü WiFi şifresi (WPA2/WPA3)
✅ Router admin şifresi değiştirilmiş
✅ Sadece bilinen cihazlar WiFi'de
✅ Guest network kullanımı
```

**Yeterli mi?** Çoğu durum için EVET ✅

---

### **Seviye 3: Yüksek (Paranoyak Mod)** 🔐

```
✅ Seviye 2 +
✅ Development'ta HTTPS
✅ VPN kullanımı
✅ IP whitelist
✅ MAC address filtering (router)
✅ Network monitoring
```

**Gerekli mi?** Hassas veriler için EVET ✅

---

## 📋 Önerilen Güvenlik Ayarları

### **1. WiFi Router Ayarları**

#### **Zorunlu:**

- [x] WPA2/WPA3 şifreleme
- [x] Güçlü WiFi şifresi (min 12 karakter)
- [x] Router admin şifresi değiştirilmiş
- [x] Firmware güncel

#### **Önerilen:**

- [ ] Guest network aktif (misafirler için ayrı ağ)
- [ ] WPS kapalı
- [ ] UPnP kapalı
- [ ] Remote management kapalı

#### **Opsiyonel:**

- [ ] MAC address filtering
- [ ] SSID gizleme
- [ ] Firewall kuralları

---

### **2. Bilgisayar Ayarları**

#### **Zorunlu:**

- [x] Windows Defender Firewall aktif
- [x] Windows güncel
- [x] Antivirus aktif

#### **Önerilen:**

- [ ] Port 5000 ve 5173 sadece local network'e açık
- [ ] Firewall kuralları özelleştirilmiş
- [ ] Automatic updates aktif

---

### **3. Uygulama Ayarları**

#### **Zaten Aktif:**

- [x] JWT authentication
- [x] Rate limiting (5 deneme)
- [x] bcrypt password hashing
- [x] CORS koruması
- [x] Input validation

#### **Eklenebilir (Opsiyonel):**

```javascript
// IP whitelist
const allowedIPs = ["192.168.0.36", "192.168.0.50"];

// 2FA (Two-Factor Authentication)
// Email/SMS ile doğrulama

// Session timeout
// 30 dakika inaktivite sonrası logout
```

---

## 🎯 Pratik Öneriler

### **Ev/Ofis WiFi'si İçin:**

```
✅ Mevcut güvenlik yeterli
✅ Güçlü şifreler kullanın
✅ WiFi şifresini düzenli değiştirin
✅ Sadece güvenilir cihazlar bağlansın
```

### **Kafe/Otel WiFi'si İçin:**

```
❌ Development çalışması yapmayın
❌ Hassas verilere erişmeyin
✅ VPN kullanın (zorunlu)
✅ HTTPS kullanın
```

### **Production İçin:**

```
✅ HTTPS zorunlu
✅ Firewall kuralları
✅ SSL sertifikası
✅ DDoS koruması
✅ Regular security audits
```

---

## 🔍 Güvenlik Testi

### **WiFi Güvenliğini Test Edin:**

1. **Router Admin Paneli:**

   ```
   http://192.168.0.1 (veya 192.168.1.1)
   ```

   - Admin şifresi "admin" değil mi? ✅
   - WPA2/WPA3 aktif mi? ✅
   - Firmware güncel mi? ✅

2. **Bağlı Cihazlar:**

   - Router admin panelinde bağlı cihazları kontrol edin
   - Tanımadığınız cihaz var mı?
   - Gerekirse MAC filtering aktif edin

3. **Port Tarama:**
   ```bash
   # Bilgisayarınızın açık portlarını kontrol edin
   netstat -an | findstr "LISTENING"
   ```
   - Sadece 5000 ve 5173 açık olmalı
   - Diğer portlar kapalı olmalı

---

## 🆘 Güvenlik İhlali Durumunda

### **Şüpheli Aktivite Görürseniz:**

1. **Hemen WiFi Şifresini Değiştirin**
2. **Router'ı Yeniden Başlatın**
3. **Tüm Admin Şifrelerini Değiştirin**
4. **Database Backup Alın**
5. **Logları Kontrol Edin:**
   ```bash
   # Backend loglarını kontrol edin
   # Şüpheli IP adresleri var mı?
   ```

---

## 📊 Risk Matrisi

| Senaryo         | Risk          | Çözüm                   | Öncelik |
| --------------- | ------------- | ----------------------- | ------- |
| Ev WiFi'si      | 🟢 Düşük      | Mevcut güvenlik yeterli | -       |
| Misafir WiFi'de | 🟡 Orta       | Guest network kullan    | Orta    |
| Kafe WiFi'si    | 🔴 Yüksek     | Kullanma veya VPN       | Yüksek  |
| Açık WiFi       | 🔴 Çok Yüksek | Asla kullanma           | Kritik  |

---

## ✅ Sonuç

**Ev/Ofis WiFi'si için mevcut güvenlik YETERLİ!**

Ama şunları yapın:

1. ✅ Güçlü WiFi şifresi kullanın
2. ✅ Router admin şifresini değiştirin
3. ✅ Sadece güvenilir cihazlar bağlansın
4. ✅ Production'da mutlaka HTTPS kullanın

**Paranoyak mısınız?** Development'ta HTTPS kullanın veya VPN aktif edin.

**Sorun mu var?** `GUVENLIK_KONTROL_LISTESI.md` dosyasına bakın.
