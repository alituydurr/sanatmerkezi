import { useState, useEffect } from 'react';
import { teacherPaymentsAPI, teachersAPI } from '../../services/api';
import { formatCurrencyWithSymbol } from '../../utils/formatters';
import './ManagerPages.css';

export default function ManagerExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGeneralExpenseModal, setShowGeneralExpenseModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [createForm, setCreateForm] = useState({
    teacher_id: '',
    hourly_rate: ''
  });
  const [generalExpenseForm, setGeneralExpenseForm] = useState({
    description: '',
    amount: '',
    category: 'other'
  });

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const loadData = async () => {
    try {
      const [expensesRes, teachersRes] = await Promise.all([
        teacherPaymentsAPI.getAll(selectedMonth),
        teachersAPI.getAll()
      ]);
      setExpenses(expensesRes.data);
      setTeachers(teachersRes.data);
    } catch (error) {
      console.error('Veriler yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!selectedExpense || !paymentAmount) return;

    try {
      await teacherPaymentsAPI.recordPayment({
        teacher_payment_id: selectedExpense.id,
        amount: parseFloat(paymentAmount),
        payment_date: new Date().toISOString().split('T')[0]
      });
      
      alert('✅ Ödeme başarıyla kaydedildi!');
      setShowPaymentModal(false);
      setSelectedExpense(null);
      setPaymentAmount('');
      loadData();
    } catch (error) {
      alert('❌ Ödeme kaydedilemedi: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    if (!createForm.teacher_id || !createForm.hourly_rate) return;

    try {
      await teacherPaymentsAPI.create({
        teacher_id: parseInt(createForm.teacher_id),
        month_year: selectedMonth,
        hourly_rate: parseFloat(createForm.hourly_rate)
      });
      
      alert('✅ Öğretmen ödemesi oluşturuldu!');
      setShowCreateModal(false);
      setCreateForm({ teacher_id: '', hourly_rate: '' });
      loadData();
    } catch (error) {
      alert('❌ Ödeme oluşturulamadı: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleGeneralExpense = async (e) => {
    e.preventDefault();
    if (!generalExpenseForm.description || !generalExpenseForm.amount) return;

    try {
      await teacherPaymentsAPI.createGeneralExpense({
        ...generalExpenseForm,
        amount: parseFloat(generalExpenseForm.amount),
        month_year: selectedMonth
      });
      
      alert('✅ Genel gider eklendi!');
      setShowGeneralExpenseModal(false);
      setGeneralExpenseForm({ description: '', amount: '', category: 'other' });
      loadData();
    } catch (error) {
      alert('❌ Gider eklenemedi: ' + (error.response?.data?.error || error.message));
    }
  };

  const openPaymentModal = (expense) => {
    setSelectedExpense(expense);
    setPaymentAmount(expense.remaining_amount);
    setShowPaymentModal(true);
  };

  if (loading) {
    return <div className="loading">Yükleniyor...</div>;
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.total_amount || 0), 0);
  const totalPaid = expenses.reduce((sum, e) => sum + parseFloat(e.paid_amount || 0), 0);
  const totalRemaining = expenses.reduce((sum, e) => sum + parseFloat(e.remaining_amount || 0), 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>💸 Gider Takibi</h1>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="month-picker"
          />
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
            + Öğretmen Ödemesi
          </button>
          <button onClick={() => setShowGeneralExpenseModal(true)} className="btn btn-secondary">
            + Genel Gider
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="stat-card-small">
          <div className="stat-value">{formatCurrencyWithSymbol(totalExpenses)}</div>
          <div className="stat-label">Toplam Gider</div>
        </div>
        <div className="stat-card-small">
          <div className="stat-value">{formatCurrencyWithSymbol(totalPaid)}</div>
          <div className="stat-label">Ödenen</div>
        </div>
        <div className="stat-card-small">
          <div className="stat-value">{formatCurrencyWithSymbol(totalRemaining)}</div>
          <div className="stat-label">Kalan</div>
        </div>
      </div>

      {/* Expenses Grid */}
      {expenses.length === 0 ? (
        <div className="empty-state">
          <p>Bu ay için gider bulunmuyor</p>
        </div>
      ) : (
        <div className="payment-cards-grid">
          {expenses.map(expense => (
            <div key={expense.id} className="payment-info-card">
              <div className="payment-card-header">
                <h3>{expense.teacher_first_name} {expense.teacher_last_name}</h3>
                <span className={`status-badge ${expense.status}`}>
                  {expense.status === 'paid' ? 'Ödendi' : 
                   expense.status === 'partial' ? 'Kısmi' : 'Bekliyor'}
                </span>
              </div>
              
              <div className="payment-card-body">
                <div className="payment-row">
                  <span>Ders Sayısı:</span>
                  <strong>{expense.total_lessons}</strong>
                </div>
                <div className="payment-row">
                  <span>Toplam:</span>
                  <strong>{formatCurrencyWithSymbol(expense.total_amount)}</strong>
                </div>
                <div className="payment-row">
                  <span>Ödenen:</span>
                  <span className="text-success">{formatCurrencyWithSymbol(expense.paid_amount || 0)}</span>
                </div>
                {expense.remaining_amount > 0 && (
                  <div className="payment-row">
                    <span>Kalan:</span>
                    <strong className="text-error">{formatCurrencyWithSymbol(expense.remaining_amount)}</strong>
                  </div>
                )}
              </div>

              {expense.remaining_amount > 0 && (
                <div className="payment-card-footer">
                  <button 
                    onClick={() => openPaymentModal(expense)}
                    className="btn btn-primary btn-block"
                  >
                    💳 Ödeme Yap
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Öğretmen Ödemesi</h2>
              <button onClick={() => setShowPaymentModal(false)} className="close-btn">✕</button>
            </div>
            <form onSubmit={handlePayment}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Öğretmen</label>
                  <input 
                    type="text" 
                    value={`${selectedExpense?.teacher_first_name} ${selectedExpense?.teacher_last_name}`}
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label>Kalan Borç</label>
                  <input 
                    type="text" 
                    value={formatCurrencyWithSymbol(selectedExpense?.remaining_amount)}
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label>Ödeme Tutarı *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    required
                    max={selectedExpense?.remaining_amount}
                    placeholder="Ödeme tutarı..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="btn btn-secondary">
                  İptal
                </button>
                <button type="submit" className="btn btn-primary">
                  💾 Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Payment Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Öğretmen Ödemesi Oluştur</h2>
              <button onClick={() => setShowCreateModal(false)} className="close-btn">✕</button>
            </div>
            <form onSubmit={handleCreatePayment}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Öğretmen *</label>
                  <select
                    value={createForm.teacher_id}
                    onChange={(e) => setCreateForm({ ...createForm, teacher_id: e.target.value })}
                    required
                  >
                    <option value="">Seçiniz...</option>
                    {teachers.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.first_name} {teacher.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Saat Ücreti *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={createForm.hourly_rate}
                    onChange={(e) => setCreateForm({ ...createForm, hourly_rate: e.target.value })}
                    required
                    placeholder="Saat ücreti..."
                  />
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Sistem otomatik olarak bu ay verilen dersleri hesaplayacak
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  İptal
                </button>
                <button type="submit" className="btn btn-primary">
                  💾 Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* General Expense Modal */}
      {showGeneralExpenseModal && (
        <div className="modal-overlay" onClick={() => setShowGeneralExpenseModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Genel Gider Ekle</h2>
              <button onClick={() => setShowGeneralExpenseModal(false)} className="close-btn">✕</button>
            </div>
            <form onSubmit={handleGeneralExpense}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Açıklama *</label>
                  <input
                    type="text"
                    value={generalExpenseForm.description}
                    onChange={(e) => setGeneralExpenseForm({ ...generalExpenseForm, description: e.target.value })}
                    required
                    placeholder="Gider açıklaması..."
                  />
                </div>
                <div className="form-group">
                  <label>Kategori</label>
                  <select
                    value={generalExpenseForm.category}
                    onChange={(e) => setGeneralExpenseForm({ ...generalExpenseForm, category: e.target.value })}
                  >
                    <option value="rent">Kira</option>
                    <option value="utilities">Faturalar</option>
                    <option value="supplies">Malzeme</option>
                    <option value="maintenance">Bakım</option>
                    <option value="other">Diğer</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Tutar *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={generalExpenseForm.amount}
                    onChange={(e) => setGeneralExpenseForm({ ...generalExpenseForm, amount: e.target.value })}
                    required
                    placeholder="Tutar..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowGeneralExpenseModal(false)} className="btn btn-secondary">
                  İptal
                </button>
                <button type="submit" className="btn btn-primary">
                  💾 Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
