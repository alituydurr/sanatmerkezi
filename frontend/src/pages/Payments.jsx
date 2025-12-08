import { useState, useEffect } from 'react';
import { paymentsAPI, studentsAPI, coursesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../pages/Students.css';

export default function Payments() {
  const { isAdmin } = useAuth();
  const [paymentPlans, setPaymentPlans] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [planFormData, setPlanFormData] = useState({
    student_id: '',
    course_id: '',
    total_amount: '',
    installments: '1'
  });
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    payment_method: 'cash',
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
        installments: '1'
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
      await paymentsAPI.recordPayment({
        payment_plan_id: selectedPlan.id,
        student_id: selectedPlan.student_id,
        ...paymentFormData
      });
      setShowPaymentModal(false);
      setSelectedPlan(null);
      setPaymentFormData({
        amount: '',
        payment_method: 'cash',
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
        {isAdmin() && (
          <button onClick={() => setShowPlanModal(true)} className="btn btn-primary">
            ➕ Yeni Ödeme Planı
          </button>
        )}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Öğrenci</th>
              <th>Ders</th>
              <th>Toplam Tutar</th>
              <th>Ödenen</th>
              <th>Kalan</th>
              <th>Durum</th>
              {isAdmin() && <th>İşlemler</th>}
            </tr>
          </thead>
          <tbody>
            {paymentPlans.map((plan) => {
              const paidAmount = parseFloat(plan.paid_amount || 0);
              const totalAmount = parseFloat(plan.total_amount);
              const remainingAmount = parseFloat(plan.remaining_amount || 0);
              const progress = (paidAmount / totalAmount) * 100;

              return (
                <tr key={plan.id}>
                  <td className="font-bold">
                    {plan.student_first_name} {plan.student_last_name}
                  </td>
                  <td>{plan.course_name}</td>
                  <td>₺{totalAmount.toFixed(2)}</td>
                  <td className="text-success">₺{paidAmount.toFixed(2)}</td>
                  <td className={remainingAmount > 0 ? 'text-error' : 'text-success'}>
                    ₺{remainingAmount.toFixed(2)}
                  </td>
                  <td>
                    <span className={`badge badge-${plan.status === 'completed' ? 'success' : 'warning'}`}>
                      {plan.status === 'completed' ? 'Tamamlandı' : 'Devam Ediyor'}
                    </span>
                  </td>
                  {isAdmin() && (
                    <td>
                      {plan.status !== 'completed' && (
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
            <h2 className="modal-title">Ödeme Kaydet</h2>
            <div className="mb-4" style={{ padding: 'var(--space-4)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              <p><strong>Öğrenci:</strong> {selectedPlan.student_first_name} {selectedPlan.student_last_name}</p>
              <p><strong>Kalan Tutar:</strong> ₺{parseFloat(selectedPlan.remaining_amount).toFixed(2)}</p>
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
