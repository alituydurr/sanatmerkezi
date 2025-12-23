import { useState, useEffect } from 'react';
import { paymentsAPI, studentsAPI } from '../../services/api';
import { formatCurrencyWithSymbol } from '../../utils/formatters';
import './ManagerPages.css';

export default function ManagerPayments() {
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [createPlanForm, setCreatePlanForm] = useState({
    student_id: '',
    total_amount: '',
    installments: '1',
    start_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [paymentsRes, studentsRes] = await Promise.all([
        paymentsAPI.getPending(),
        studentsAPI.getAll()
      ]);
      setPayments(paymentsRes.data);
      setStudents(studentsRes.data);
    } catch (error) {
      console.error('Veriler yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!selectedPayment || !paymentAmount) return;

    try {
      await paymentsAPI.recordPayment({
        payment_plan_id: selectedPayment.payment_plan_id,
        amount: parseFloat(paymentAmount),
        payment_date: new Date().toISOString().split('T')[0]
      });
      
      alert('✅ Ödeme başarıyla kaydedildi!');
      setShowPaymentModal(false);
      setSelectedPayment(null);
      setPaymentAmount('');
      loadData();
    } catch (error) {
      alert('❌ Ödeme kaydedilemedi: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!createPlanForm.student_id || !createPlanForm.total_amount) return;

    try {
      await paymentsAPI.createPlan({
        student_id: parseInt(createPlanForm.student_id),
        total_amount: parseFloat(createPlanForm.total_amount),
        installments: parseInt(createPlanForm.installments),
        start_date: createPlanForm.start_date
      });
      
      alert('✅ Ödeme planı oluşturuldu!');
      setShowCreatePlanModal(false);
      setCreatePlanForm({
        student_id: '',
        total_amount: '',
        installments: '1',
        start_date: new Date().toISOString().split('T')[0]
      });
      loadData();
    } catch (error) {
      alert('❌ Plan oluşturulamadı: ' + (error.response?.data?.error || error.message));
    }
  };

  const openPaymentModal = (payment) => {
    setSelectedPayment(payment);
    setPaymentAmount(payment.remaining_amount);
    setShowPaymentModal(true);
  };

  if (loading) {
    return <div className="loading">Yükleniyor...</div>;
  }

  const totalDebt = payments.reduce((sum, p) => sum + parseFloat(p.remaining_amount || 0), 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>💰 Ödemeler</h1>
        <button 
          onClick={() => setShowCreatePlanModal(true)} 
          className="btn btn-primary"
        >
          + Ödeme Planı Oluştur
        </button>
      </div>

      {/* Stats */}
      <div className="stats-row" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="stat-card-small">
          <div className="stat-value">{payments.length}</div>
          <div className="stat-label">Bekleyen Ödeme</div>
        </div>
        <div className="stat-card-small">
          <div className="stat-value">{formatCurrencyWithSymbol(totalDebt)}</div>
          <div className="stat-label">Toplam Borç</div>
        </div>
      </div>

      {/* Payments Grid */}
      {payments.length === 0 ? (
        <div className="empty-state">
          <p>Bekleyen ödeme bulunmuyor</p>
        </div>
      ) : (
        <div className="payment-cards-grid">
          {payments.map(payment => (
            <div key={payment.id} className="payment-info-card">
              <div className="payment-card-header">
                <h3>{payment.student_first_name} {payment.student_last_name}</h3>
              </div>
              
              <div className="payment-card-body">
                <div className="payment-row">
                  <span>Toplam:</span>
                  <strong>{formatCurrencyWithSymbol(payment.total_amount)}</strong>
                </div>
                <div className="payment-row">
                  <span>Ödenen:</span>
                  <span className="text-success">{formatCurrencyWithSymbol(payment.paid_amount || 0)}</span>
                </div>
                <div className="payment-row">
                  <span>Kalan:</span>
                  <strong className="text-error">{formatCurrencyWithSymbol(payment.remaining_amount)}</strong>
                </div>
                {payment.next_payment_date && (
                  <div className="payment-row">
                    <span>Son Tarih:</span>
                    <span>{new Date(payment.next_payment_date).toLocaleDateString('tr-TR')}</span>
                  </div>
                )}
              </div>

              <div className="payment-card-footer">
                <button 
                  onClick={() => openPaymentModal(payment)}
                  className="btn btn-primary btn-block"
                >
                  💳 Ödeme Al
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Ödeme Kaydet</h2>
              <button onClick={() => setShowPaymentModal(false)} className="close-btn">✕</button>
            </div>
            <form onSubmit={handlePayment}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Öğrenci</label>
                  <input 
                    type="text" 
                    value={`${selectedPayment?.student_first_name} ${selectedPayment?.student_last_name}`}
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label>Kalan Borç</label>
                  <input 
                    type="text" 
                    value={formatCurrencyWithSymbol(selectedPayment?.remaining_amount)}
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
                    max={selectedPayment?.remaining_amount}
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

      {/* Create Plan Modal */}
      {showCreatePlanModal && (
        <div className="modal-overlay" onClick={() => setShowCreatePlanModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Ödeme Planı Oluştur</h2>
              <button onClick={() => setShowCreatePlanModal(false)} className="close-btn">✕</button>
            </div>
            <form onSubmit={handleCreatePlan}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Öğrenci *</label>
                  <select
                    value={createPlanForm.student_id}
                    onChange={(e) => setCreatePlanForm({ ...createPlanForm, student_id: e.target.value })}
                    required
                  >
                    <option value="">Seçiniz...</option>
                    {students.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.first_name} {student.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Toplam Tutar *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={createPlanForm.total_amount}
                    onChange={(e) => setCreatePlanForm({ ...createPlanForm, total_amount: e.target.value })}
                    required
                    placeholder="Toplam tutar..."
                  />
                </div>
                <div className="form-group">
                  <label>Taksit Sayısı *</label>
                  <select
                    value={createPlanForm.installments}
                    onChange={(e) => setCreatePlanForm({ ...createPlanForm, installments: e.target.value })}
                  >
                    <option value="1">Peşin (1 Taksit)</option>
                    <option value="2">2 Taksit</option>
                    <option value="3">3 Taksit</option>
                    <option value="4">4 Taksit</option>
                    <option value="6">6 Taksit</option>
                    <option value="9">9 Taksit</option>
                    <option value="12">12 Taksit</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Başlangıç Tarihi *</label>
                  <input
                    type="date"
                    value={createPlanForm.start_date}
                    onChange={(e) => setCreatePlanForm({ ...createPlanForm, start_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowCreatePlanModal(false)} className="btn btn-secondary">
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
    </div>
  );
}
