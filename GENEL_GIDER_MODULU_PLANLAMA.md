# 💸 Genel Gider Modülü - Planlama ve Uygulama Kılavuzu

## 📋 Genel Bakış

Bu doküman, Sanat Merkezi Yönetim Sistemi'ne **Genel Gider Modülü** eklenmesi için detaylı planlama ve uygulama adımlarını içerir.

---

## 🎯 Amaç

Öğretmen maaşlarının yanı sıra kira, elektrik, su, malzeme gibi **genel giderleri** de sisteme ekleyerek:

- Tüm giderleri tek bir sayfada yönetmek
- Gelir-gider analizini daha doğru yapmak
- Finansal raporlamayı geliştirmek

---

## 📊 Sistem Yapısı

### Mevcut Durum

```
📁 Finansal Yönetim
├── 💰 Ödeme Takibi (Payments.jsx)
│   ├── Öğrenci Ödemeleri
│   └── Etkinlik Gelirleri
│
└── 👨‍🏫 Öğretmen Ödemeleri (TeacherPayments.jsx)
    └── Sadece öğretmen maaşları
```

### Hedef Yapı

```
📁 Finansal Yönetim
├── 💰 Gelir Takibi (Payments.jsx - isim değişikliği)
│   ├── Öğrenci Ödemeleri
│   └── Etkinlik Gelirleri
│
└── 💸 Gider Takibi (TeacherPayments.jsx - güncellenecek)
    ├── Öğretmen Ödemeleri
    └── Genel Giderler (YENİ)
```

---

## 🗄️ Veritabanı Değişiklikleri

### 1. `teacher_payments` Tablosunu Genişletme

Yeni tablo oluşturmak yerine mevcut `teacher_payments` tablosuna sütunlar ekleyeceğiz:

```sql
-- Migration dosyası: backend/migrations/add_general_expenses.sql

ALTER TABLE teacher_payments
ADD COLUMN payment_type VARCHAR(20) DEFAULT 'teacher_salary'
  CHECK (payment_type IN ('teacher_salary', 'general_expense'));

-- Genel giderler için ek sütunlar
ALTER TABLE teacher_payments
ADD COLUMN expense_category VARCHAR(100),  -- Kira, Elektrik, Su, vb.
ADD COLUMN invoice_number VARCHAR(50),     -- Fatura numarası
ADD COLUMN vendor VARCHAR(200);            -- Tedarikçi/Firma adı

-- Yorum ekle
COMMENT ON COLUMN teacher_payments.payment_type IS 'teacher_salary: Öğretmen maaşı, general_expense: Genel gider';
COMMENT ON COLUMN teacher_payments.expense_category IS 'Sadece general_expense için: Kira, Elektrik, Su, Malzeme, vb.';
COMMENT ON COLUMN teacher_payments.invoice_number IS 'Fatura numarası';
COMMENT ON COLUMN teacher_payments.vendor IS 'Tedarikçi veya firma adı';
```

### 2. Gider Kategorileri

```javascript
const EXPENSE_CATEGORIES = [
  { value: "kira", label: "🏢 Kira", icon: "🏢" },
  { value: "elektrik", label: "⚡ Elektrik", icon: "⚡" },
  { value: "su", label: "💧 Su", icon: "💧" },
  { value: "internet", label: "🌐 İnternet", icon: "🌐" },
  { value: "telefon", label: "📱 Telefon", icon: "📱" },
  { value: "malzeme", label: "🎨 Malzeme", icon: "🎨" },
  { value: "temizlik", label: "🧹 Temizlik", icon: "🧹" },
  { value: "bakim_onarim", label: "🔧 Bakım-Onarım", icon: "🔧" },
  { value: "kirtasiye", label: "📚 Kırtasiye", icon: "📚" },
  { value: "ulasim", label: "🚗 Ulaşım", icon: "🚗" },
  { value: "yemek_ikram", label: "🍽️ Yemek-İkram", icon: "🍽️" },
  { value: "reklam", label: "📢 Reklam-Pazarlama", icon: "📢" },
  { value: "diger", label: "💼 Diğer", icon: "💼" },
];
```

---

## 🔧 Backend Değişiklikleri

### 1. Controller Güncellemeleri (`teacherPaymentController.js`)

#### Yeni Endpoint: Genel Gider Ekleme

```javascript
// POST /api/teacher-payments/general-expense
export const createGeneralExpense = async (req, res, next) => {
  try {
    const {
      expense_date,
      expense_category,
      description,
      amount,
      invoice_number,
      vendor,
      payment_method,
      payment_status,
      paid_date,
      notes,
    } = req.body;

    // Validasyon
    if (!expense_date || !expense_category || !amount) {
      return res.status(400).json({
        error: "Tarih, kategori ve tutar zorunludur",
      });
    }

    // Ay-yıl formatı (YYYY-MM)
    const monthYear = expense_date.substring(0, 7);

    // Ödeme durumuna göre paid_amount ve remaining_amount hesapla
    const paidAmount = payment_status === "paid" ? parseFloat(amount) : 0;
    const remainingAmount = parseFloat(amount) - paidAmount;
    const status = payment_status === "paid" ? "completed" : "pending";

    const result = await pool.query(
      `
      INSERT INTO teacher_payments (
        payment_type,
        month_year,
        expense_category,
        invoice_number,
        vendor,
        total_amount,
        paid_amount,
        remaining_amount,
        status,
        notes,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `,
      [
        "general_expense",
        monthYear,
        expense_category,
        invoice_number,
        vendor,
        amount,
        paidAmount,
        remainingAmount,
        status,
        notes,
        req.user.id,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};
```

#### Mevcut `getAllTeacherPayments` Güncelleme

```javascript
export const getAllTeacherPayments = async (req, res, next) => {
  try {
    const { month_year } = req.query;

    let query = `
      SELECT 
        tp.*,
        t.first_name,
        t.last_name,
        COALESCE(SUM(tpr.amount), 0) as total_paid_records
      FROM teacher_payments tp
      LEFT JOIN teachers t ON tp.teacher_id = t.id AND tp.payment_type = 'teacher_salary'
      LEFT JOIN teacher_payment_records tpr ON tp.id = tpr.teacher_payment_id
      WHERE tp.status != 'cancelled'
    `;

    const params = [];
    if (month_year) {
      query += " AND tp.month_year = $1";
      params.push(month_year);
    }

    query +=
      " GROUP BY tp.id, t.id ORDER BY tp.payment_type, tp.month_year DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};
```

### 2. Routes Güncelleme (`routes/teacherPayments.js`)

```javascript
import express from "express";
import {
  getAllTeacherPayments,
  createTeacherPayment,
  createGeneralExpense, // YENİ
  recordPayment,
  cancelPayment,
  getCancelledPayments,
} from "../controllers/teacherPaymentController.js";
import { verifyToken, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

router.get("/", verifyToken, requireAdmin, getAllTeacherPayments);
router.post("/", verifyToken, requireAdmin, createTeacherPayment);
router.post(
  "/general-expense",
  verifyToken,
  requireAdmin,
  createGeneralExpense
); // YENİ
router.post("/record", verifyToken, requireAdmin, recordPayment);
router.post("/:id/cancel", verifyToken, requireAdmin, cancelPayment);
router.get("/cancelled", verifyToken, requireAdmin, getCancelledPayments);

export default router;
```

---

## 🎨 Frontend Değişiklikleri

### 1. Sidebar Menü Güncellemesi (`App.jsx`)

```javascript
// Mevcut:
{ path: '/payments', name: 'Ödeme Takibi', icon: '💰' }
{ path: '/teacher-payments', name: 'Öğretmen Ödemeleri', icon: '👨‍🏫' }

// Yeni:
{ path: '/payments', name: 'Gelir Takibi', icon: '💰' }
{ path: '/teacher-payments', name: 'Gider Takibi', icon: '💸' }
```

### 2. `TeacherPayments.jsx` Güncellemeleri

#### State Eklemeleri

```javascript
const [showExpenseModal, setShowExpenseModal] = useState(false);
const [expenseForm, setExpenseForm] = useState({
  expense_date: new Date().toISOString().split("T")[0],
  expense_category: "",
  description: "",
  amount: "",
  invoice_number: "",
  vendor: "",
  payment_status: "pending",
  notes: "",
});
```

#### UI Yapısı

```jsx
<div className="page-header">
  <div>
    <h1 className="page-title">💸 Gider Takibi</h1>
    <p className="page-subtitle">Öğretmen ödemeleri ve genel giderler</p>
  </div>
  <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
    <input type="month" ... />
    <button onClick={() => setShowCalculateModal(true)}>
      ➕ Ödeme Planla
    </button>
    <button onClick={() => setShowExpenseModal(true)} className="btn btn-success">
      ➕ Genel Gider Ekle
    </button>
  </div>
</div>

{/* Özet Kartları */}
<div className="summary-cards">
  <div className="summary-card">
    <h3>Toplam Gider</h3>
    <p className="amount">{formatCurrency(totalExpenses)}</p>
  </div>
  <div className="summary-card">
    <h3>Öğretmen Maaşları</h3>
    <p className="amount">{formatCurrency(teacherSalaries)}</p>
  </div>
  <div className="summary-card">
    <h3>Genel Giderler</h3>
    <p className="amount">{formatCurrency(generalExpenses)}</p>
  </div>
</div>

{/* Öğretmen Ödemeleri Tablosu */}
<div className="section">
  <h2>👨‍🏫 Öğretmen Ödemeleri</h2>
  <table>...</table>
</div>

{/* Genel Giderler Tablosu */}
<div className="section">
  <h2>🏢 Genel Giderler</h2>
  <table>
    <thead>
      <tr>
        <th>Tarih</th>
        <th>Kategori</th>
        <th>Açıklama</th>
        <th>Fatura No</th>
        <th>Tedarikçi</th>
        <th>Tutar</th>
        <th>Durum</th>
        <th>İşlemler</th>
      </tr>
    </thead>
    <tbody>
      {generalExpenses.map(expense => (
        <tr key={expense.id}>
          <td>{formatDate(expense.month_year)}</td>
          <td>
            <span className="category-badge">
              {getCategoryIcon(expense.expense_category)}
              {getCategoryLabel(expense.expense_category)}
            </span>
          </td>
          <td>{expense.notes}</td>
          <td>{expense.invoice_number || '-'}</td>
          <td>{expense.vendor || '-'}</td>
          <td>{formatCurrency(expense.total_amount)}</td>
          <td>
            <span className={`badge badge-${expense.status === 'completed' ? 'success' : 'warning'}`}>
              {expense.status === 'completed' ? 'Ödendi' : 'Bekliyor'}
            </span>
          </td>
          <td>
            <button onClick={() => handleEditExpense(expense)}>Düzenle</button>
            <button onClick={() => handleDeleteExpense(expense.id)}>Sil</button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

#### Genel Gider Modal

```jsx
{
  showExpenseModal && (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="modal-title">Genel Gider Ekle</h2>
        <form onSubmit={handleExpenseSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Tarih *</label>
              <input
                type="date"
                value={expenseForm.expense_date}
                onChange={(e) =>
                  setExpenseForm({
                    ...expenseForm,
                    expense_date: e.target.value,
                  })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>Kategori *</label>
              <select
                value={expenseForm.expense_category}
                onChange={(e) =>
                  setExpenseForm({
                    ...expenseForm,
                    expense_category: e.target.value,
                  })
                }
                required
              >
                <option value="">Seçiniz</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Açıklama</label>
            <input
              type="text"
              value={expenseForm.description}
              onChange={(e) =>
                setExpenseForm({ ...expenseForm, description: e.target.value })
              }
              placeholder="Örn: Aralık ayı kira ödemesi"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Tutar (₺) *</label>
              <input
                type="number"
                step="0.01"
                value={expenseForm.amount}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, amount: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>Fatura No</label>
              <input
                type="text"
                value={expenseForm.invoice_number}
                onChange={(e) =>
                  setExpenseForm({
                    ...expenseForm,
                    invoice_number: e.target.value,
                  })
                }
                placeholder="F-2025-12"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Tedarikçi/Firma</label>
            <input
              type="text"
              value={expenseForm.vendor}
              onChange={(e) =>
                setExpenseForm({ ...expenseForm, vendor: e.target.value })
              }
              placeholder="Örn: Ev Sahibi, BEDAŞ"
            />
          </div>

          <div className="form-group">
            <label>Ödeme Durumu</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  value="paid"
                  checked={expenseForm.payment_status === "paid"}
                  onChange={(e) =>
                    setExpenseForm({
                      ...expenseForm,
                      payment_status: e.target.value,
                    })
                  }
                />
                Ödendi
              </label>
              <label>
                <input
                  type="radio"
                  value="pending"
                  checked={expenseForm.payment_status === "pending"}
                  onChange={(e) =>
                    setExpenseForm({
                      ...expenseForm,
                      payment_status: e.target.value,
                    })
                  }
                />
                Beklemede
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>Notlar</label>
            <textarea
              value={expenseForm.notes}
              onChange={(e) =>
                setExpenseForm({ ...expenseForm, notes: e.target.value })
              }
              rows="3"
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={() => setShowExpenseModal(false)}>
              İptal
            </button>
            <button type="submit" className="btn btn-primary">
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 3. API Servisi (`services/api.js`)

```javascript
export const teacherPaymentsAPI = {
  getAll: (monthYear) =>
    api.get("/teacher-payments", { params: { month_year: monthYear } }),
  calculateHours: (teacherId, monthYear) =>
    api.get(`/teacher-payments/calculate/${teacherId}/${monthYear}`),
  create: (data) => api.post("/teacher-payments", data),
  createGeneralExpense: (data) =>
    api.post("/teacher-payments/general-expense", data), // YENİ
  recordPayment: (data) => api.post("/teacher-payments/record", data),
  cancel: (id, cancellation_reason) =>
    api.post(`/teacher-payments/${id}/cancel`, { cancellation_reason }),
  getCancelled: () => api.get("/teacher-payments/cancelled"),
};
```

---

## 📊 Finansal Raporlara Entegrasyon

### `FinancialReports.jsx` Güncellemesi

```javascript
const fetchMonthlyReport = async () => {
  try {
    const [paymentsRes, teacherPaymentsRes, eventsRes] = await Promise.all([
      paymentsAPI.getAll(),
      teacherPaymentsAPI.getAll(selectedMonth),
      eventsAPI.getAll(selectedMonth),
    ]);

    // Gelirler
    const studentPayments = paymentsRes.data
      .filter((p) => p.payment_date.startsWith(selectedMonth))
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    const eventIncome = eventsRes.data
      .filter((e) => e.status !== "cancelled")
      .reduce((sum, e) => sum + parseFloat(e.paid_amount || 0), 0);

    const totalIncome = studentPayments + eventIncome;

    // Giderler
    const teacherSalaries = teacherPaymentsRes.data
      .filter((tp) => tp.payment_type === "teacher_salary")
      .reduce((sum, tp) => sum + parseFloat(tp.paid_amount || 0), 0);

    const generalExpenses = teacherPaymentsRes.data
      .filter((tp) => tp.payment_type === "general_expense")
      .reduce((sum, tp) => sum + parseFloat(tp.paid_amount || 0), 0);

    const totalExpenses = teacherSalaries + generalExpenses;

    // Net Kar/Zarar
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

---

## 🎨 CSS Stilleri

### `TeacherPayments.css` Eklemeleri

```css
/* Section Headers */
.section {
  margin-top: var(--space-8);
  margin-bottom: var(--space-6);
}

.section h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-3);
  border-bottom: 2px solid var(--primary-400);
}

/* Summary Cards */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.summary-card {
  background: white;
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  border-left: 4px solid var(--primary-500);
}

.summary-card h3 {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.summary-card .amount {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--primary-600);
  margin: 0;
}

/* Category Badge */
.category-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--primary-50);
  color: var(--primary-700);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 600;
}

/* Radio Group */
.radio-group {
  display: flex;
  gap: var(--space-4);
}

.radio-group label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
}

.radio-group input[type="radio"] {
  cursor: pointer;
}
```

---

## ✅ Uygulama Adımları

### Adım 1: Veritabanı Migration

```bash
# Backend klasöründe
cd backend
psql -U postgres -d sanat_merkezi -f migrations/add_general_expenses.sql
```

### Adım 2: Backend Güncellemeleri

1. `teacherPaymentController.js` - `createGeneralExpense` fonksiyonu ekle
2. `teacherPaymentController.js` - `getAllTeacherPayments` güncelle
3. `routes/teacherPayments.js` - Yeni route ekle

### Adım 3: Frontend Güncellemeleri

1. `App.jsx` - Sidebar menü isimlerini güncelle
2. `TeacherPayments.jsx` - Genel gider modülü ekle
3. `services/api.js` - API fonksiyonu ekle
4. `TeacherPayments.css` - Yeni stiller ekle

### Adım 4: Finansal Raporlar Entegrasyonu

1. `FinancialReports.jsx` - Genel giderleri dahil et

### Adım 5: Test

1. Backend'i başlat: `npm start`
2. Frontend'i başlat: `npm run dev`
3. Genel gider ekle
4. Finansal raporu kontrol et

---

## 🧪 Test Senaryoları

### Test 1: Genel Gider Ekleme

1. "Gider Takibi" sayfasına git
2. "Genel Gider Ekle" butonuna tıkla
3. Form doldur:
   - Tarih: 15.12.2025
   - Kategori: Kira
   - Tutar: 20000
   - Fatura No: F-2025-12
   - Tedarikçi: Ev Sahibi
   - Durum: Ödendi
4. Kaydet
5. Listelerde görünmeli ✅

### Test 2: Ödeme Durumu Güncelleme

1. Beklemede olan bir gider ekle
2. "Ödeme Yap" butonuna tıkla
3. Ödeme kaydet
4. Durum "Ödendi" olmalı ✅

### Test 3: Finansal Rapor

1. Finansal Raporlar sayfasına git
2. Aralık 2025 seç
3. Genel giderler görünmeli
4. Toplam gider = Öğretmen maaşları + Genel giderler ✅

---

## 📝 Notlar

- **Yeni tablo yok:** Mevcut `teacher_payments` tablosu kullanılıyor
- **payment_type** sütunu ile ayırt ediliyor:
  - `'teacher_salary'` → Öğretmen maaşı
  - `'general_expense'` → Genel gider
- **Kolay raporlama:** Tek tablodan hem öğretmen hem genel giderler çekiliyor
- **Tutarlı yapı:** Aynı ödeme takip sistemi her iki tip için de geçerli

---

## 🚀 Sonraki Adımlar

1. Migration dosyasını çalıştır
2. Backend kodlarını uygula
3. Frontend güncellemelerini yap
4. Test et
5. Production'a deploy et

---

**Hazırlayan:** AI Assistant  
**Tarih:** 16 Aralık 2025  
**Versiyon:** 1.0
