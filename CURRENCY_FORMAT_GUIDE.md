# Para Formatı Güncelleme Kılavuzu

Tüm para gösterimlerini Türk formatına çevirmek için:

## Değiştirilecek Format:

```javascript
// ESKI:
₺{amount.toFixed(2)}

// YENİ:
{formatCurrencyWithSymbol(amount)}
```

## Import Ekle:

```javascript
import { formatCurrencyWithSymbol } from "../utils/formatters";
```

## Güncellenecek Dosyalar:

1. ✅ **Payments.jsx** - Import eklendi
2. ⏳ **StudentDetail.jsx**
3. ⏳ **TeacherPayments.jsx**
4. ⏳ **UpcomingPayments.jsx**
5. ⏳ **Dashboard.jsx**
6. ⏳ **Courses.jsx**

## Örnek Kullanım:

```javascript
// Önceki:
<td>₺{totalAmount.toFixed(2)}</td>

// Sonrası:
<td>{formatCurrencyWithSymbol(totalAmount)}</td>

// Sonuç: ₺12.856,00
```

## Manuel Güncelleme Gerekli

Karakter limiti dolduğu için tüm dosyaları otomatik güncelleyemedik.
Lütfen yukarıdaki dosyalarda tüm `₺{...toFixed(2)}` kullanımlarını
`{formatCurrencyWithSymbol(...)}` ile değiştirin.

**Not:** Import'u unutmayın!
