import { useState, useEffect } from 'react';
import { paymentsAPI, studentsAPI, coursesAPI, eventsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatCurrencyWithSymbol } from '../utils/formatters';
import '../pages/Students.css';

export default function Payments() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [paymentPlans, setPaymentPlans] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [planFormData, setPlanFormData] = useState({
    student_id: '',
    course_id: '',
    total_amount: '',
    installments: '1',
    start_date: new Date().toISOString().split('T')[0]
  });
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    payment_method: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [plansRes, studentsRes, coursesRes] = await Promise.all([
        paymentsAPI.getAllPlans(),
        studentsAPI.getAll(),
        coursesAPI.getAll()
      ]);
      setPaymentPlans(plansRes.data);
      setStudents(studentsRes.data);
      setCourses(coursesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    try {
      await paymentsAPI.createPlan(planFormData);
      setShowPlanModal(false);
      setPlanFormData({
        student_id: '',
        course_id: '',
        total_amount: '',
        installments: '1',
        start_date: new Date().toISOString().split('T')[0]
      });
      loadData();
    } catch (error) {
      console.error('Error creating plan:', error);
      alert('Ödeme planı oluşturulurken hata oluştu');
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      // Check if this is an event or course payment
      if (selectedPlan.payment_type === 'event') {
        // Event payment
        await eventsAPI.recordDirectPayment({
          event_id: selectedPlan.event_id,
          amount: paymentFormData.amount,
          payment_date: paymentFormData.payment_date,
          notes: paymentFormData.notes
        });
      } else {
        // Course payment
        await paymentsAPI.recordPayment({
          payment_plan_id: selectedPlan.id,
          student_id: selectedPlan.student_id,
          ...paymentFormData
        });
      }
      
      setShowPaymentModal(false);
      setSelectedPlan(null);
      setPaymentFormData({
        amount: '',
        payment_method: 'cash',
        payment_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      loadData();
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Ödeme kaydedilirken hata oluştu');
    }
  };

  const openPaymentModal = (plan) => {
    setSelectedPlan(plan);
    setPaymentFormData({
      ...paymentFormData,
      amount: plan.installment_amount
    });
    setShowPaymentModal(true);
  };

  const filteredPaymentPlans = paymentPlans.filter(plan => {
    const searchLower = searchTerm.toLowerCase();
    return (
      plan.student_first_name?.toLowerCase().includes(searchLower) ||
      plan.student_last_name?.toLowerCase().includes(searchLower) ||
      plan.course_name?.toLowerCase().includes(searchLower) ||
      plan.item_name?.toLowerCase().includes(searchLower) ||
      plan.payment_type?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return <div className="loading-container">Yükleniyor...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ödeme Takibi</h1>
          <p className="page-subtitle">Ödeme planlarını ve ödemeleri yönetin</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <input
            type="text"
            className="form-input"
            placeholder="🔍 Öğrenci, ders ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '250px' }}
          />
          <button onClick={() => navigate('/payments/upcoming')} className="btn btn-secondary">
            📅 Gelecek Dönem Ödemeleri
          </button>
          {isAdmin() && (
            <button onClick={() => setShowPlanModal(true)} className="btn btn-primary">
              ➕ Yeni Ödeme Planı
            </button>
          )}
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Tür</th>
              <th>Öğrenci/Etkinlik</th>
              <th>Ders/Etkinlik Adı</th>
              <th>Toplam Tutar</th>
              <th>Taksit</th>
              <th>Ödenen</th>
              <th>Kalan</th>
              <th>Durum</th>
              {isAdmin() && <th>İşlemler</th>}
            </tr>
          </thead>
          <tbody>
            {filteredPaymentPlans.map((plan) => {
              const paidAmount = parseFloat(plan.paid_amount || 0);
              const totalAmount = parseFloat(plan.total_amount);
              const remainingAmount = parseFloat(plan.remaining_amount || 0);
              const isEvent = plan.payment_type === 'event';

              return (
                <tr key={`${plan.payment_type}-${plan.id}`}>
                  <td>
                    <span className={`badge badge-${isEvent ? 'info' : 'success'}`}>
                      {isEvent ? 'Etkinlik' : 'Ders'}
                    </span>
                  </td>
                  <td className="font-bold">
                    {isEvent ? '-' : `${plan.student_first_name} ${plan.student_last_name}`}
                  </td>
                  <td>{plan.item_name || plan.course_name}</td>
                  <td>{formatCurrencyWithSymbol(totalAmount)}</td>
                  <td>{plan.installments} taksit</td>
                  <td className="text-success">{formatCurrencyWithSymbol(paidAmount)}</td>
                  <td className={remainingAmount > 0 ? 'text-error' : 'text-success'}>
                    {formatCurrencyWithSymbol(remainingAmount)}
                  </td>
                  <td>
                    <span className={`badge badge-${
                      remainingAmount <= 0 ? 'success' : 
                      paidAmount > 0 ? 'warning' : 'info'
                    }`}>
                      {remainingAmount <= 0 ? 'Tamamlandı' : 
                       paidAmount > 0 ? 'Kısmi' : 'Bekliyor'}
                    </span>
                  </td>
                  {isAdmin() && (
                    <td>
                      {remainingAmount > 0 && (
                        <button
                          onClick={() => openPaymentModal(plan)}
                          className="btn btn-sm btn-primary"
                        >
                          Ödeme Kaydet
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Plan Modal */}
      {showPlanModal && (
        <div className="modal-overlay" onClick={() => setShowPlanModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Yeni Ödeme Planı</h2>
            <form onSubmit={handlePlanSubmit}>
              <div className="form-group">
                <label className="form-label">Öğrenci *</label>
                <select
                  className="form-select"
                  value={planFormData.student_id}
                  onChange={(e) => setPlanFormData({...planFormData, student_id: e.target.value})}
                  required
                >
                  <option value="">Seçiniz</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Ders *</label>
                <select
                  className="form-select"
                  value={planFormData.course_id}
                  onChange={(e) => setPlanFormData({...planFormData, course_id: e.target.value})}
                  required
                >
                  <option value="">Seçiniz</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Toplam Tutar (₺) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={planFormData.total_amount}
                    onChange={(e) => setPlanFormData({...planFormData, total_amount: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Taksit Sayısı *</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={planFormData.installments}
                    onChange={(e) => setPlanFormData({...planFormData, installments: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Başlangıç Tarihi *</label>
                <input
                  type="date"
                  className="form-input"
                  value={planFormData.start_date}
                  onChange={(e) => setPlanFormData({...planFormData, start_date: e.target.value})}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowPlanModal(false)} className="btn btn-secondary">
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

      {/* Payment Modal */}
      {showPaymentModal && selectedPlan && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">
              {selectedPlan.payment_type === 'event' ? 'Etkinlik Ödemesi Kaydet' : 'Ödeme Kaydet'}
            </h2>
            <div className="mb-4" style={{ padding: 'var(--space-4)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              {selectedPlan.payment_type === 'event' ? (
                <>
                  <p><strong>Etkinlik:</strong> {selectedPlan.item_name}</p>
                  <p><strong>Toplam Tutar:</strong> {formatCurrencyWithSymbol(selectedPlan.total_amount)}</p>
                  <p><strong>Kalan Tutar:</strong> {formatCurrencyWithSymbol(selectedPlan.remaining_amount)}</p>
                </>
              ) : (
                <>
                  <p><strong>Öğrenci:</strong> {selectedPlan.student_first_name} {selectedPlan.student_last_name}</p>
                  <p><strong>Kalan Tutar:</strong> {formatCurrencyWithSymbol(selectedPlan.remaining_amount)}</p>
                </>
              )}
            </div>
            <form onSubmit={handlePaymentSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tutar (₺) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={paymentFormData.amount}
                    onChange={(e) => setPaymentFormData({...paymentFormData, amount: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Ödeme Tarihi *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={paymentFormData.payment_date}
                    onChange={(e) => setPaymentFormData({...paymentFormData, payment_date: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Ödeme Yöntemi *</label>
                <select
                  className="form-select"
                  value={paymentFormData.payment_method}
                  onChange={(e) => setPaymentFormData({...paymentFormData, payment_method: e.target.value})}
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
                  value={paymentFormData.notes}
                  onChange={(e) => setPaymentFormData({...paymentFormData, notes: e.target.value})}
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
    </div>
  );
}
