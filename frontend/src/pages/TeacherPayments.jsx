import { useState, useEffect } from 'react';
import { teacherPaymentsAPI, teachersAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { formatCurrencyWithSymbol } from '../utils/formatters';
import '../pages/Students.css';
import './TeacherPayments.css';

export default function TeacherPayments() {
  const navigate = useNavigate();
  const [teacherPayments, setTeacherPayments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [showCalculateModal, setShowCalculateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showPartialCancelModal, setShowPartialCancelModal] = useState(false);
  const [selectedTeacherPayment, setSelectedTeacherPayment] = useState(null);
  const [partialCancelReason, setPartialCancelReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [calculateForm, setCalculateForm] = useState({
    teacher_id: '',
    month_year: '',
    hourly_rate: ''
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    notes: ''
  });
  const [expenseForm, setExpenseForm] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    expense_category: '',
    description: '',
    amount: '',
    invoice_number: '',
    vendor: '',
    notes: ''
  });

  // Gider Kategorileri
  const EXPENSE_CATEGORIES = [
    { value: 'kira', label: '🏢 Kira', icon: '🏢' },
    { value: 'elektrik', label: '⚡ Elektrik', icon: '⚡' },
    { value: 'su', label: '💧 Su', icon: '💧' },
    { value: 'internet', label: '🌐 İnternet', icon: '🌐' },
    { value: 'telefon', label: '📱 Telefon', icon: '📱' },
    { value: 'malzeme', label: '🎨 Malzeme', icon: '🎨' },
    { value: 'temizlik', label: '🧹 Temizlik', icon: '🧹' },
    { value: 'bakim_onarim', label: '🔧 Bakım-Onarım', icon: '🔧' },
    { value: 'kirtasiye', label: '📚 Kırtasiye', icon: '📚' },
    { value: 'ulasim', label: '🚗 Ulaşım', icon: '🚗' },
    { value: 'yemek_ikram', label: '🍽️ Yemek-İkram', icon: '🍽️' },
    { value: 'reklam', label: '📢 Reklam-Pazarlama', icon: '📢' },
    { value: 'diger', label: '💼 Diğer', icon: '💼' }
  ];

  const getCategoryLabel = (value) => {
    const category = EXPENSE_CATEGORIES.find(cat => cat.value === value);
    return category ? category.label : value;
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const loadData = async () => {
    try {
      const [paymentsRes, teachersRes] = await Promise.all([
        teacherPaymentsAPI.getAll(selectedMonth),
        teachersAPI.getAll()
      ]);
      setTeacherPayments(paymentsRes.data);
      setTeachers(teachersRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async (e) => {
    e.preventDefault();
    try {
      // Calculate hours
      const hoursRes = await teacherPaymentsAPI.calculateHours(
        calculateForm.teacher_id,
        calculateForm.month_year
      );
      
      const normalHours = parseFloat(hoursRes.data.total_hours || 0);
      const trialFee = parseFloat(hoursRes.data.trial_lessons_fee || 0);
      
      // Check if teacher has any completed classes or trial lessons
      if (normalHours === 0 && trialFee === 0) {
        alert('Bu öğretmenin seçilen ay içerisinde tamamlanmış dersi bulunmamaktadır. Lütfen önce dersleri "Geldi" olarak işaretleyin.');
        return;
      }
      
      // Create teacher payment (backend will calculate the total including trial lessons)
      await teacherPaymentsAPI.create({
        teacher_id: calculateForm.teacher_id,
        month_year: calculateForm.month_year,
        total_hours: hoursRes.data.total_hours,
        hourly_rate: calculateForm.hourly_rate,
        trial_lessons_fee: trialFee
      });

      setShowCalculateModal(false);
      setCalculateForm({
        teacher_id: '',
        month_year: '',
        hourly_rate: ''
      });
      loadData();
      
      alert('Öğretmen ödemesi başarıyla oluşturuldu!');
    } catch (error) {
      console.error('Error calculating payment:', error);
      alert('Ödeme hesaplanırken hata oluştu');
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      await teacherPaymentsAPI.recordPayment({
        teacher_payment_id: selectedTeacherPayment.id,
        teacher_id: selectedTeacherPayment.teacher_id,
        ...paymentForm
      });

      setShowPaymentModal(false);
      setSelectedTeacherPayment(null);
      setPaymentForm({
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash',
        notes: ''
      });
      loadData();
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Ödeme kaydedilirken hata oluştu');
    }
  };

  const openPaymentModal = (tp) => {
    setSelectedTeacherPayment(tp);
    setPaymentForm({
      ...paymentForm,
      amount: tp.remaining_amount
    });
    setShowPaymentModal(true);
  };


  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    try {
      await teacherPaymentsAPI.createGeneralExpense(expenseForm);
      setShowExpenseModal(false);
      setExpenseForm({
        expense_date: new Date().toISOString().split('T')[0],
        expense_category: '',
        description: '',
        amount: '',
        invoice_number: '',
        vendor: '',
        notes: ''
      });
      loadData();
    } catch (error) {
      console.error('Error creating expense:', error);
      alert('Gider eklenirken hata oluştu');
    }
  };

  const openPartialCancelModal = (tp) => {
    setSelectedTeacherPayment(tp);
    setPartialCancelReason('');
    setShowPaymentModal(false); // Close payment modal if open
    setShowPartialCancelModal(true);
  };

  const handlePartialCancelPayment = async (e) => {
    e.preventDefault();
    if (!partialCancelReason.trim()) {
      alert('Lütfen iptal nedenini belirtin');
      return;
    }
    try {
      await teacherPaymentsAPI.partialCancel(selectedTeacherPayment.id, partialCancelReason);
      setShowPartialCancelModal(false);
      setSelectedTeacherPayment(null);
      setPartialCancelReason('');
      loadData();
    } catch (error) {
      console.error('Error partial cancelling payment:', error);
      alert('Kalan tutar iptal edilirken hata oluştu');
    }
  };

  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  // Filter teacher payments and general expenses
  const filteredTeacherPayments = teacherPayments.filter(payment => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const isTeacherPayment = payment.payment_type === 'teacher_salary' || !payment.payment_type;
    
    if (isTeacherPayment) {
      return (
        payment.first_name?.toLowerCase().includes(searchLower) ||
        payment.last_name?.toLowerCase().includes(searchLower) ||
        payment.month_year?.toLowerCase().includes(searchLower)
      );
    } else {
      // General expense
      return (
        getCategoryLabel(payment.expense_category)?.toLowerCase().includes(searchLower) ||
        payment.expense_category?.toLowerCase().includes(searchLower) ||
        payment.vendor?.toLowerCase().includes(searchLower) ||
        payment.invoice_number?.toLowerCase().includes(searchLower) ||
        payment.notes?.toLowerCase().includes(searchLower) ||
        payment.month_year?.toLowerCase().includes(searchLower)
      );
    }
  });

  if (loading) {
    return <div className="loading-container">Yükleniyor...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0, fontSize: '1.75rem' }}>💸 Gider Takibi</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <input
            type="month"
            className="form-input"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ width: '160px', padding: '0.6rem' }}
          />
          <input
            type="text"
            className="form-input"
            placeholder="🔍 Öğretmen, kategori, fatura..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '220px', padding: '0.6rem' }}
          />
          <button onClick={() => navigate('/teacher-payments/cancelled')} className="btn btn-secondary btn-sm">
            ❌ İptal Edilen Ödemeler
          </button>
          <button onClick={() => setShowCalculateModal(true)} className="btn btn-primary btn-sm">
            ➕ Ödeme Hesapla
          </button>
          <button onClick={() => setShowExpenseModal(true)} className="btn btn-success btn-sm">
            ➕ Genel Gider Ekle
          </button>
        </div>
      </div>

      {/* Öğretmen Ödemeleri Tablosu */}
      <div className="section">
        <h2>👨‍🏫 Öğretmen Ödemeleri</h2>
        <div className="scrollable-table-container">
          <table>
            <thead>
              <tr>
                <th>Öğretmen</th>
                <th>Ay</th>
                <th>Toplam Saat</th>
                <th>Saat Ücreti</th>
                <th>Deneme Dersi</th>
                <th>Toplam Tutar</th>
                <th>Ödenen</th>
                <th>Kalan</th>
                <th>Durum</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeacherPayments.filter(tp => tp.payment_type === 'teacher_salary' || !tp.payment_type).map((tp) => {
                // Calculate trial lessons fee from total_amount - (total_hours × hourly_rate)
                const normalLessonsFee = parseFloat(tp.total_hours || 0) * parseFloat(tp.hourly_rate || 0);
                const trialLessonsFee = parseFloat(tp.total_amount || 0) - normalLessonsFee;
                
                return (
                <tr key={tp.id}>
                  <td className="font-bold">{tp.first_name} {tp.last_name}</td>
                  <td>{tp.month_year}</td>
                  <td>{parseFloat(tp.total_hours).toFixed(2)} saat</td>
                  <td>{formatCurrencyWithSymbol(tp.hourly_rate || 0)}</td>
                  <td>{formatCurrencyWithSymbol(trialLessonsFee)}</td>
                  <td>{formatCurrencyWithSymbol(tp.total_amount)}</td>
                  <td className="text-success">{formatCurrencyWithSymbol(tp.paid_amount || 0)}</td>
                  <td className={parseFloat(tp.remaining_amount) > 0 ? 'text-error' : 'text-success'}>
                    {formatCurrencyWithSymbol(tp.remaining_amount || 0)}
                  </td>
                  <td>
                    <span className={`badge badge-${
                      tp.status === 'completed' ? 'success' : 
                      tp.status === 'partial' ? 'warning' : 'info'
                    }`}>
                      {tp.status === 'completed' ? 'Tamamlandı' : 
                       tp.status === 'partial' ? 'Kısmi' : 'Bekliyor'}
                    </span>
                  </td>
                  <td>
                    {parseFloat(tp.remaining_amount) > 0 && (
                      <button
                        onClick={() => openPaymentModal(tp)}
                        className="btn btn-sm btn-primary"
                      >
                        Ödeme Yap
                      </button>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Genel Giderler Tablosu */}
      <div className="section" style={{ marginTop: 'var(--space-8)' }}>
        <h2>🏢 Genel Giderler</h2>
        <div className="scrollable-table-container">
          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Kategori</th>
                <th>Açıklama</th>
                <th>Fatura No</th>
                <th>Tedarikçi</th>
                <th>Tutar</th>
                <th>Ödenen</th>
                <th>Kalan</th>
                <th>Durum</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeacherPayments.filter(tp => tp.payment_type === 'general_expense').map((expense) => (
                <tr key={expense.id}>
                  <td>{expense.month_year}</td>
                  <td>
                    <span className="category-badge">
                      {getCategoryLabel(expense.expense_category)}
                    </span>
                  </td>
                  <td>{expense.notes || '-'}</td>
                  <td>{expense.invoice_number || '-'}</td>
                  <td>{expense.vendor || '-'}</td>
                  <td>{formatCurrencyWithSymbol(expense.total_amount)}</td>
                  <td className="text-success">{formatCurrencyWithSymbol(expense.paid_amount || 0)}</td>
                  <td className={parseFloat(expense.remaining_amount) > 0 ? 'text-error' : 'text-success'}>
                    {formatCurrencyWithSymbol(expense.remaining_amount || 0)}
                  </td>
                  <td>
                    <span className={`badge badge-${
                      expense.status === 'completed' ? 'success' : 
                      expense.status === 'partial' ? 'warning' : 'info'
                    }`}>
                      {expense.status === 'completed' ? 'Tamamlandı' : 
                       expense.status === 'partial' ? 'Kısmi' : 'Bekliyor'}
                    </span>
                  </td>
                  <td>
                    {parseFloat(expense.remaining_amount) > 0 && (
                      <button
                        onClick={() => openPaymentModal(expense)}
                        className="btn btn-sm btn-primary"
                      >
                        Ödeme Yap
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


      {/* Calculate Modal */}
      {showCalculateModal && (
        <div className="modal-overlay" onClick={() => setShowCalculateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Öğretmen Ödemesi Hesapla</h2>
            <form onSubmit={handleCalculate}>
              <div className="form-group">
                <label className="form-label">Öğretmen *</label>
                <select
                  className="form-select"
                  value={calculateForm.teacher_id}
                  onChange={(e) => setCalculateForm({...calculateForm, teacher_id: e.target.value})}
                  required
                >
                  <option value="">Seçiniz</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.first_name} {t.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Ay *</label>
                  <input
                    type="month"
                    className="form-input"
                    value={calculateForm.month_year}
                    onChange={(e) => setCalculateForm({...calculateForm, month_year: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Saat Ücreti (₺) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={calculateForm.hourly_rate}
                    onChange={(e) => setCalculateForm({...calculateForm, hourly_rate: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="info-box">
                <p>💡 Sistem, seçilen öğretmenin takvimde atandığı dersleri baz alarak toplam saat hesaplayacaktır.</p>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCalculateModal(false)} className="btn btn-secondary">
                  İptal
                </button>
                <button type="submit" className="btn btn-primary">
                  Hesapla ve Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedTeacherPayment && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Öğretmen Ödemesi Kaydet</h2>
            <div className="mb-4" style={{ padding: 'var(--space-4)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              <p><strong>Öğretmen:</strong> {selectedTeacherPayment.first_name} {selectedTeacherPayment.last_name}</p>
              <p><strong>Ay:</strong> {selectedTeacherPayment.month_year}</p>
              <p><strong>Kalan Tutar:</strong> {formatCurrencyWithSymbol(selectedTeacherPayment.remaining_amount)}</p>
            </div>
            <form onSubmit={handlePaymentSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tutar (₺) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Ödeme Tarihi *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm({...paymentForm, payment_date: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Ödeme Yöntemi *</label>
                <select
                  className="form-select"
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({...paymentForm, payment_method: e.target.value})}
                  required
                >
                  <option value="cash">Nakit</option>
                  <option value="credit_card">Kredi Kartı</option>
                  <option value="bank_transfer">Havale</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Not</label>
                <textarea
                  className="form-textarea"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                  rows="2"
                />
              </div>
              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button 
                  type="button" 
                  onClick={() => openPartialCancelModal(selectedTeacherPayment)} 
                  className="btn btn-sm"
                  style={{ 
                    backgroundColor: 'var(--error)', 
                    borderColor: 'var(--error)',
                    color: 'white'
                  }}
                >
                  ❌ Kalan Tutarı İptal Et
                </button>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button type="button" onClick={() => setShowPaymentModal(false)} className="btn btn-secondary">
                    İptal
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Ödemeyi Kaydet
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="modal-overlay" onClick={() => setShowExpenseModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">➕ Genel Gider Ekle</h2>
            <form onSubmit={handleExpenseSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tarih *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={expenseForm.expense_date}
                    onChange={(e) => setExpenseForm({...expenseForm, expense_date: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Kategori *</label>
                  <select
                    className="form-select"
                    value={expenseForm.expense_category}
                    onChange={(e) => setExpenseForm({...expenseForm, expense_category: e.target.value})}
                    required
                  >
                    <option value="">Seçiniz</option>
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tutar (₺) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Fatura No</label>
                  <input
                    type="text"
                    className="form-input"
                    value={expenseForm.invoice_number}
                    onChange={(e) => setExpenseForm({...expenseForm, invoice_number: e.target.value})}
                    placeholder="F-2025-12"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Tedarikçi/Firma</label>
                <input
                  type="text"
                  className="form-input"
                  value={expenseForm.vendor}
                  onChange={(e) => setExpenseForm({...expenseForm, vendor: e.target.value})}
                  placeholder="Örn: Ev Sahibi, BEDAŞ"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notlar</label>
                <textarea
                  className="form-textarea"
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({...expenseForm, notes: e.target.value})}
                  rows="3"
                  placeholder="Gider hakkında ek bilgiler..."
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowExpenseModal(false)} className="btn btn-secondary">
                  İptal
                </button>
                <button type="submit" className="btn btn-primary">
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Partial Cancel Modal */}
      {showPartialCancelModal && selectedTeacherPayment && (
        <div className="modal-overlay" onClick={() => setShowPartialCancelModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">❌ Kalan Tutarı İptal Et</h2>
            <div className="mb-4" style={{ padding: 'var(--space-4)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              {selectedTeacherPayment.payment_type === 'teacher_salary' || !selectedTeacherPayment.payment_type ? (
                <>
                  <p><strong>Öğretmen:</strong> {selectedTeacherPayment.first_name} {selectedTeacherPayment.last_name}</p>
                  <p><strong>Ay:</strong> {selectedTeacherPayment.month_year}</p>
                </>
              ) : (
                <>
                  <p><strong>Kategori:</strong> {getCategoryLabel(selectedTeacherPayment.expense_category)}</p>
                  <p><strong>Tarih:</strong> {selectedTeacherPayment.month_year}</p>
                  {selectedTeacherPayment.vendor && <p><strong>Tedarikçi:</strong> {selectedTeacherPayment.vendor}</p>}
                </>
              )}
              <p><strong>Toplam Tutar:</strong> {formatCurrencyWithSymbol(selectedTeacherPayment.total_amount)}</p>
              <p><strong>Ödenen:</strong> <span className="text-success">{formatCurrencyWithSymbol(selectedTeacherPayment.paid_amount || 0)}</span></p>
              <p className="text-error"><strong>İptal Edilecek Kalan:</strong> {formatCurrencyWithSymbol(selectedTeacherPayment.remaining_amount)}</p>
            </div>
            <div className="info-box" style={{ background: '#fef3c7', borderColor: '#f59e0b' }}>
              <p>⚠️ Bu işlem sadece kalan tutarı iptal edecektir. Ödenen tutar değişmeyecektir.</p>
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
                <button type="button" onClick={() => setShowPartialCancelModal(false)} className="btn btn-secondary">
                  Vazgeç
                </button>
                <button type="submit" className="btn btn-warning">
                  Kalan Tutarı İptal Et
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
