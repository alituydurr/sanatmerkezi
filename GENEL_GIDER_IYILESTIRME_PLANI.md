# 🔄 Genel Gider Modülü İyileştirme Planı

## 📋 Genel Bakış

Bu doküman, genel gider modülünün iyileştirilmesi ve eksik özelliklerin eklenmesi için detaylı adımları içerir.

---

## 🎯 İyileştirme Hedefleri

### 1. ✅ **Acil Düzeltme: created_by Sütunu**

**Durum**: Hata alınıyor - `column "created_by" does not exist`

**Çözüm**:

```sql
-- pgAdmin'de çalıştırın:
ALTER TABLE teacher_payments
ADD COLUMN IF NOT EXISTS created_by INTEGER;

COMMENT ON COLUMN teacher_payments.created_by IS 'Kaydı oluşturan kullanıcının ID si';
```

---

### 2. 📜 **Scroll Özelliği Ekleme**

**Hedef**: Her tabloda maksimum 5 kayıt göster, fazlası scroll ile erişilebilir olsun

**Değişiklikler**:

- **Dosya**: `frontend/src/pages/TeacherPayments.jsx`
- **Değişiklik**: Tablo container'ına max-height ve overflow ekle

**CSS Eklemeleri**:

```css
/* TeacherPayments.css */
.scrollable-table-container {
  max-height: 400px; /* ~5 satır için */
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.scrollable-table-container::-webkit-scrollbar {
  width: 8px;
}

.scrollable-table-container::-webkit-scrollbar-track {
  background: var(--bg-tertiary);
  border-radius: 4px;
}

.scrollable-table-container::-webkit-scrollbar-thumb {
  background: var(--primary-400);
  border-radius: 4px;
}

.scrollable-table-container::-webkit-scrollbar-thumb:hover {
  background: var(--primary-500);
}
```

**JSX Değişikliği**:

```jsx
<div className="scrollable-table-container">
  <table>{/* Tablo içeriği */}</table>
</div>
```

---

### 3. 📅 **Ay Bazlı Filtreleme Kontrolü**

**Hedef**: Hem öğretmen ödemeleri hem de genel giderler ay filtresine göre filtrelensin

**Backend Kontrolü**:

- `getAllTeacherPayments` fonksiyonu zaten `month_year` parametresini kullanıyor ✅
- Hem `teacher_salary` hem de `general_expense` kayıtları aynı `month_year` sütununu kullanıyor ✅

**Frontend Kontrolü**:

- `selectedMonth` state'i her iki tablo için de kullanılıyor ✅
- Filter işlemi backend'de yapılıyor ✅

**Sonuç**: Filtreleme zaten çalışıyor, ek değişiklik gerekmez ✅

---

### 4. 🔘 **Ödeme Durumu Kaldırma**

**Hedef**: Genel gider modalında "Ödendi/Beklemede" seçeneğini kaldır, varsayılan "Beklemede" olsun

**Değişiklikler**:

- **Dosya**: `frontend/src/pages/TeacherPayments.jsx`

**State Değişikliği**:

```javascript
const [expenseForm, setExpenseForm] = useState({
  expense_date: new Date().toISOString().split("T")[0],
  expense_category: "",
  description: "",
  amount: "",
  invoice_number: "",
  vendor: "",
  // payment_status: 'pending', // Kaldırıldı - backend'de otomatik 'pending' olacak
  notes: "",
});
```

**Backend Değişikliği**:

```javascript
// createGeneralExpense fonksiyonunda:
const status = "pending"; // Her zaman pending başlasın
const paidAmount = 0;
const remainingAmount = parseFloat(amount);
```

**Modal'dan Kaldırılacak Kısım**:

```jsx
{
  /* Bu kısmı kaldır */
}
<div className="form-group">
  <label className="form-label">Ödeme Durumu</label>
  <div
    style={{
      display: "flex",
      gap: "var(--space-4)",
      marginTop: "var(--space-2)",
    }}
  >
    {/* Radio butonları */}
  </div>
</div>;
```

---

### 5. 💰 **Ödeme Yap ve İptal Butonları**

**Hedef**: Her iki tabloda da "Ödeme Yap" ve "İptal Et" butonları olsun

**Durum**: Zaten mevcut ✅

**Kontrol Noktaları**:

- ✅ Öğretmen ödemeleri tablosunda butonlar var
- ✅ Genel giderler tablosunda butonlar var
- ✅ `openPaymentModal` fonksiyonu her iki tip için de çalışıyor
- ✅ `openCancelModal` fonksiyonu her iki tip için de çalışıyor

---

### 6. ❌ **Kısmi İptal Özelliği**

**Hedef**: Etkinlik ödemelerindeki gibi kalan tutarı iptal edebilme

**Yeni Özellikler**:

#### A. Backend - Kısmi İptal Endpoint'i

**Dosya**: `backend/controllers/teacherPaymentController.js`

```javascript
// Partial cancel teacher payment
export const partialCancelTeacherPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cancellation_reason } = req.body;

    if (!cancellation_reason || cancellation_reason.trim() === "") {
      return res.status(400).json({ error: "İptal nedeni belirtilmelidir" });
    }

    // Get current payment
    const currentPayment = await pool.query(
      "SELECT * FROM teacher_payments WHERE id = $1",
      [id]
    );

    if (currentPayment.rows.length === 0) {
      return res.status(404).json({ error: "Ödeme bulunamadı" });
    }

    const payment = currentPayment.rows[0];
    const remainingAmount = parseFloat(payment.remaining_amount || 0);

    if (remainingAmount <= 0) {
      return res.status(400).json({ error: "İptal edilecek kalan tutar yok" });
    }

    // Update payment - cancel only remaining amount
    const result = await pool.query(
      `
      UPDATE teacher_payments
      SET remaining_amount = 0,
          status = 'completed',
          cancellation_reason = $1,
          cancelled_at = CURRENT_TIMESTAMP,
          cancelled_by = $2,
          updated_at = CURRENT_TIMESTAMP,
          notes = CONCAT(COALESCE(notes, ''), ' | Kalan tutar iptal edildi: ', $3::text, ' TL')
      WHERE id = $4
      RETURNING *
    `,
      [cancellation_reason, req.user?.id || null, remainingAmount, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};
```

#### B. Backend - Route Ekleme

**Dosya**: `backend/routes/teacherPayments.js`

```javascript
// Partial cancel (cancel remaining amount only)
router.post("/:id/partial-cancel", partialCancelTeacherPayment);
```

#### C. Frontend - API Servisi

**Dosya**: `frontend/src/services/api.js`

```javascript
export const teacherPaymentsAPI = {
  // ... mevcut fonksiyonlar
  partialCancel: (id, cancellation_reason) =>
    api.post(`/teacher-payments/${id}/partial-cancel`, { cancellation_reason }),
};
```

#### D. Frontend - UI Değişiklikleri

**Dosya**: `frontend/src/pages/TeacherPayments.jsx`

**State Eklemeleri**:

```javascript
const [showPartialCancelModal, setShowPartialCancelModal] = useState(false);
const [partialCancelReason, setPartialCancelReason] = useState("");
```

**Fonksiyon Eklemeleri**:

```javascript
const openPartialCancelModal = (tp) => {
  setSelectedTeacherPayment(tp);
  setPartialCancelReason("");
  setShowPartialCancelModal(true);
};

const handlePartialCancelPayment = async (e) => {
  e.preventDefault();
  if (!partialCancelReason.trim()) {
    alert("Lütfen iptal nedenini belirtin");
    return;
  }
  try {
    await teacherPaymentsAPI.partialCancel(
      selectedTeacherPayment.id,
      partialCancelReason
    );
    setShowPartialCancelModal(false);
    setSelectedTeacherPayment(null);
    setPartialCancelReason("");
    loadData();
    alert("Kalan tutar başarıyla iptal edildi");
  } catch (error) {
    console.error("Error partial cancelling payment:", error);
    alert("Kalan tutar iptal edilirken hata oluştu");
  }
};
```

**Buton Ekleme** (Her iki tabloda da):

```jsx
<td>
  <div style={{ display: "flex", gap: "var(--space-2)" }}>
    {parseFloat(tp.remaining_amount) > 0 && (
      <>
        <button
          onClick={() => openPaymentModal(tp)}
          className="btn btn-sm btn-primary"
        >
          💰 Ödeme Yap
        </button>
        <button
          onClick={() => openPartialCancelModal(tp)}
          className="btn btn-sm btn-warning"
        >
          ❌ Kalan İptal
        </button>
      </>
    )}
    <button
      onClick={() => openCancelModal(tp)}
      className="btn btn-sm btn-secondary"
      style={{ backgroundColor: "var(--error)", borderColor: "var(--error)" }}
    >
      🗑️ Tümünü İptal
    </button>
  </div>
</td>
```

**Modal Ekleme**:

```jsx
{
  /* Partial Cancel Modal */
}
{
  showPartialCancelModal && selectedTeacherPayment && (
    <div
      className="modal-overlay"
      onClick={() => setShowPartialCancelModal(false)}
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">❌ Kalan Tutarı İptal Et</h2>
        <div
          className="mb-4"
          style={{
            padding: "var(--space-4)",
            background: "var(--bg-tertiary)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <p>
            <strong>Ödeme Türü:</strong>{" "}
            {selectedTeacherPayment.payment_type === "teacher_salary"
              ? "Öğretmen Maaşı"
              : "Genel Gider"}
          </p>
          {selectedTeacherPayment.payment_type === "teacher_salary" ? (
            <p>
              <strong>Öğretmen:</strong> {selectedTeacherPayment.first_name}{" "}
              {selectedTeacherPayment.last_name}
            </p>
          ) : (
            <p>
              <strong>Kategori:</strong>{" "}
              {getCategoryLabel(selectedTeacherPayment.expense_category)}
            </p>
          )}
          <p>
            <strong>Toplam Tutar:</strong>{" "}
            {formatCurrencyWithSymbol(selectedTeacherPayment.total_amount)}
          </p>
          <p>
            <strong>Ödenen:</strong>{" "}
            {formatCurrencyWithSymbol(selectedTeacherPayment.paid_amount || 0)}
          </p>
          <p className="text-error">
            <strong>İptal Edilecek Kalan:</strong>{" "}
            {formatCurrencyWithSymbol(selectedTeacherPayment.remaining_amount)}
          </p>
        </div>
        <div
          className="info-box"
          style={{
            background: "var(--warning-50)",
            borderColor: "var(--warning)",
          }}
        >
          <p>
            ⚠️ Bu işlem sadece kalan tutarı iptal edecektir. Ödenen tutar
            değişmeyecektir.
          </p>
        </div>
        <form onSubmit={handlePartialCancelPayment}>
          <div className="form-group">
            <label className="form-label">İptal Nedeni *</label>
            <textarea
              className="form-textarea"
              value={partialCancelReason}
              onChange={(e) => setPartialCancelReason(e.target.value)}
              rows="4"
              placeholder="Lütfen kalan tutarın neden iptal edildiğini açıklayın..."
              required
            />
          </div>
          <div className="modal-actions">
            <button
              type="button"
              onClick={() => setShowPartialCancelModal(false)}
              className="btn btn-secondary"
            >
              Vazgeç
            </button>
            <button type="submit" className="btn btn-warning">
              Kalan Tutarı İptal Et
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

### 7. 📊 **Finansal Raporlara Entegrasyon**

**Hedef**: Genel giderleri finansal raporlara dahil et

**Değişiklikler**:

- **Dosya**: `frontend/src/pages/FinancialReports.jsx`

#### A. Veri Çekme Güncelleme

```javascript
const fetchMonthlyReport = async () => {
  try {
    const [paymentsRes, teacherPaymentsRes, eventsRes] = await Promise.all([
      paymentsAPI.getAllPlans(),
      teacherPaymentsAPI.getAll(selectedMonth),
      eventsAPI.getAll(selectedMonth),
    ]);

    // GELİRLER
    const studentPayments = paymentsRes.data
      .filter((p) => p.payment_date && p.payment_date.startsWith(selectedMonth))
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    const eventIncome = eventsRes.data
      .filter((e) => e.status !== "cancelled")
      .reduce((sum, e) => sum + parseFloat(e.paid_amount || 0), 0);

    const totalIncome = studentPayments + eventIncome;

    // GİDERLER
    // Öğretmen maaşları
    const teacherSalaries = teacherPaymentsRes.data
      .filter((tp) => tp.payment_type === "teacher_salary" || !tp.payment_type)
      .reduce((sum, tp) => sum + parseFloat(tp.paid_amount || 0), 0);

    // Genel giderler
    const generalExpenses = teacherPaymentsRes.data
      .filter((tp) => tp.payment_type === "general_expense")
      .reduce((sum, tp) => sum + parseFloat(tp.paid_amount || 0), 0);

    const totalExpenses = teacherSalaries + generalExpenses;

    // NET KAR/ZARAR
    const netProfit = totalIncome - totalExpenses;

    setReport({
      income: {
        studentPayments,
        eventIncome,
        total: totalIncome,
      },
      expenses: {
        teacherSalaries,
        generalExpenses,
        total: totalExpenses,
      },
      netProfit,
    });
  } catch (error) {
    console.error("Error fetching report:", error);
  }
};
```

#### B. UI Güncelleme - Gider Kartı

```jsx
{
  /* GİDERLER Kartı */
}
<div className="summary-card expense-card">
  <h3>💸 Giderler</h3>
  <div className="expense-breakdown">
    <div className="expense-item">
      <span>👨‍🏫 Öğretmen Maaşları:</span>
      <span>{formatCurrencyWithSymbol(report.expenses.teacherSalaries)}</span>
    </div>
    <div className="expense-item">
      <span>🏢 Genel Giderler:</span>
      <span>{formatCurrencyWithSymbol(report.expenses.generalExpenses)}</span>
    </div>
    <div className="expense-total">
      <strong>Toplam Gider:</strong>
      <strong className="amount">
        {formatCurrencyWithSymbol(report.expenses.total)}
      </strong>
    </div>
  </div>
</div>;
```

#### C. Detaylı Rapor - Genel Giderler Tablosu

```jsx
{
  /* GENEL GİDERLER Bölümü */
}
<div className="report-section">
  <h4>🏢 Genel Giderler</h4>
  <table>
    <thead>
      <tr>
        <th>Kategori</th>
        <th>Tarih</th>
        <th>Fatura No</th>
        <th>Tedarikçi</th>
        <th>Tutar</th>
        <th>Ödenen</th>
        <th>Kalan</th>
      </tr>
    </thead>
    <tbody>
      {teacherPaymentsRes.data
        .filter((tp) => tp.payment_type === "general_expense")
        .map((expense) => (
          <tr key={expense.id}>
            <td>{getCategoryLabel(expense.expense_category)}</td>
            <td>{expense.month_year}</td>
            <td>{expense.invoice_number || "-"}</td>
            <td>{expense.vendor || "-"}</td>
            <td>{formatCurrencyWithSymbol(expense.total_amount)}</td>
            <td className="text-success">
              {formatCurrencyWithSymbol(expense.paid_amount || 0)}
            </td>
            <td
              className={
                parseFloat(expense.remaining_amount) > 0
                  ? "text-error"
                  : "text-success"
              }
            >
              {formatCurrencyWithSymbol(expense.remaining_amount || 0)}
            </td>
          </tr>
        ))}
    </tbody>
  </table>
</div>;
```

---

### 8. 🔄 **Sıralama: En Yeni Üstte**

**Hedef**: Hem öğretmen ödemeleri hem de genel giderler en yeni kayıt üstte olacak şekilde sıralansın

**Backend Değişikliği**:
**Dosya**: `backend/controllers/teacherPaymentController.js`

```javascript
// getAllTeacherPayments fonksiyonunda ORDER BY değiştir:
query +=
  " GROUP BY tp.id, t.id ORDER BY tp.created_at DESC, tp.month_year DESC";
```

**Alternatif** (ID'ye göre):

```javascript
query += " GROUP BY tp.id, t.id ORDER BY tp.id DESC";
```

---

## 📝 Uygulama Sırası

### Adım 1: Acil Düzeltme (ŞİMDİ)

1. ✅ pgAdmin'de `created_by` sütununu ekle
2. ✅ Backend'i yeniden başlat
3. ✅ Genel gider eklemeyi test et

### Adım 2: UI İyileştirmeleri (15 dk)

1. Scroll özelliği ekle
2. Ödeme durumu radio butonlarını kaldır
3. Sıralamayı en yeni üstte olacak şekilde ayarla

### Adım 3: Kısmi İptal Özelliği (30 dk)

1. Backend endpoint ekle
2. Frontend modal ve butonları ekle
3. Test et

### Adım 4: Finansal Raporlar (20 dk)

1. Veri çekme güncelle
2. UI kartlarını güncelle
3. Detaylı rapor tablosu ekle

---

## ✅ Test Senaryoları

### Test 1: Genel Gider Ekleme

- [ ] Modal açılıyor
- [ ] Tüm alanlar doldurulabiliyor
- [ ] Kayıt başarılı
- [ ] Tabloda görünüyor
- [ ] En üstte görünüyor

### Test 2: Scroll

- [ ] 5'ten fazla kayıt varsa scroll çalışıyor
- [ ] Scroll bar güzel görünüyor

### Test 3: Kısmi İptal

- [ ] "Kalan İptal" butonu görünüyor
- [ ] Modal açılıyor
- [ ] Kalan tutar doğru gösteriliyor
- [ ] İptal işlemi başarılı
- [ ] Durum "Tamamlandı" oluyor

### Test 4: Finansal Rapor

- [ ] Genel giderler toplam gidere dahil
- [ ] Detaylı raporda genel giderler görünüyor
- [ ] Net kar/zarar doğru hesaplanıyor

---

## 🎨 CSS Eklemeleri

```css
/* Warning renkleri için */
.btn-warning {
  background-color: var(--warning);
  border-color: var(--warning);
  color: white;
}

.btn-warning:hover {
  background-color: var(--warning-dark);
  border-color: var(--warning-dark);
}

.text-warning {
  color: var(--warning);
}

/* Expense breakdown */
.expense-breakdown {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.expense-item {
  display: flex;
  justify-content: space-between;
  padding: var(--space-2);
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}

.expense-total {
  display: flex;
  justify-content: space-between;
  padding: var(--space-3);
  background: var(--primary-50);
  border-radius: var(--radius-md);
  margin-top: var(--space-2);
  border-top: 2px solid var(--primary-400);
}
```

---

**Hazırlayan:** AI Assistant  
**Tarih:** 16 Aralık 2025  
**Versiyon:** 1.0
