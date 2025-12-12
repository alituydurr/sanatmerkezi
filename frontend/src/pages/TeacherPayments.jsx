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
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedTeacherPayment, setSelectedTeacherPayment] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
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

  const openCancelModal = (tp) => {
    setSelectedTeacherPayment(tp);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const handleCancelPayment = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      alert('Lütfen iptal nedenini belirtin');
      return;
    }
    try {
      await teacherPaymentsAPI.cancel(selectedTeacherPayment.id, cancelReason);
      setShowCancelModal(false);
      setSelectedTeacherPayment(null);
      setCancelReason('');
      loadData();
    } catch (error) {
      console.error('Error cancelling payment:', error);
      alert('Ödeme iptal edilirken hata oluştu');
    }
  };

  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="loading-container">Yükleniyor...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Öğretmen Ödemeleri</h1>
          <p className="page-subtitle">Öğretmen ders saatleri ve ödeme takibi</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <input
            type="month"
            className="form-input"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ width: '200px' }}
          />
          <button onClick={() => navigate('/teacher-payments/cancelled')} className="btn btn-secondary">
            ❌ İptal Edilen Ödemeler
          </button>
          <button onClick={() => setShowCalculateModal(true)} className="btn btn-primary">
            ➕ Ödeme Hesapla
          </button>
        </div>
      </div>

      <div className="table-container">
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
            {teacherPayments.map((tp) => {
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
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    {tp.status !== 'completed' && (
                      <button
                        onClick={() => openPaymentModal(tp)}
                        className="btn btn-sm btn-primary"
                      >
                        Ödeme Yap
                      </button>
                    )}
                    <button
                      onClick={() => openCancelModal(tp)}
                      className="btn btn-sm btn-secondary"
                      style={{ backgroundColor: 'var(--error)', borderColor: 'var(--error)' }}
                    >
                      İptal Et
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
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
              <div className="modal-actions">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="btn btn-secondary">
                  İptal
                </button>
                <button type="submit" className="btn btn-primary">
                  Ödemeyi Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Cancel Modal */}
      {showCancelModal && selectedTeacherPayment && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Öğretmen Ödemesini İptal Et</h2>
            <div className="mb-4" style={{ padding: 'var(--space-4)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              <p><strong>Öğretmen:</strong> {selectedTeacherPayment.first_name} {selectedTeacherPayment.last_name}</p>
              <p><strong>Ay:</strong> {selectedTeacherPayment.month_year}</p>
              <p><strong>Toplam Tutar:</strong> {formatCurrencyWithSymbol(selectedTeacherPayment.total_amount)}</p>
              <p><strong>Ödenen:</strong> {formatCurrencyWithSymbol(selectedTeacherPayment.paid_amount || 0)}</p>
            </div>
            <form onSubmit={handleCancelPayment}>
              <div className="form-group">
                <label className="form-label">İptal Nedeni *</label>
                <textarea
                  className="form-textarea"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows="4"
                  placeholder="Lütfen ödemenin neden iptal edildiğini açıklayın..."
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCancelModal(false)} className="btn btn-secondary">
                  Vazgeç
                </button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--error)', borderColor: 'var(--error)' }}>
                  İptal Et
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
