import { useState, useEffect } from 'react';
import { teacherPaymentsAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { formatCurrencyWithSymbol } from '../utils/formatters';
import '../pages/Students.css';

export default function CancelledTeacherPayments() {
  const navigate = useNavigate();
  const [cancelledPayments, setCancelledPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const EXPENSE_CATEGORIES = [
    { value: 'kira', label: '🏢 Kira' },
    { value: 'elektrik', label: '⚡ Elektrik' },
    { value: 'su', label: '💧 Su' },
    { value: 'internet', label: '🌐 İnternet' },
    { value: 'telefon', label: '📱 Telefon' },
    { value: 'malzeme', label: '🎨 Malzeme' },
    { value: 'temizlik', label: '🧹 Temizlik' },
    { value: 'bakim_onarim', label: '🔧 Bakım-Onarım' },
    { value: 'kirtasiye', label: '📚 Kırtasiye' },
    { value: 'ulasim', label: '🚗 Ulaşım' },
    { value: 'yemek_ikram', label: '🍽️ Yemek-İkram' },
    { value: 'reklam', label: '📢 Reklam-Pazarlama' },
    { value: 'diger', label: '💼 Diğer' }
  ];

  const getCategoryLabel = (value) => {
    const category = EXPENSE_CATEGORIES.find(cat => cat.value === value);
    return category ? category.label : value;
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await teacherPaymentsAPI.getCancelled();
      setCancelledPayments(res.data);
    } catch (error) {
      console.error('Error loading cancelled teacher payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = cancelledPayments.filter(payment => {
    const searchLower = searchTerm.toLowerCase();
    const isTeacherPayment = payment.payment_type === 'teacher_salary' || !payment.payment_type;
    const isGeneralExpense = payment.payment_type === 'general_expense';
    
    if (isTeacherPayment) {
      return (
        payment.first_name?.toLowerCase().includes(searchLower) ||
        payment.last_name?.toLowerCase().includes(searchLower) ||
        payment.month_year?.toLowerCase().includes(searchLower) ||
        payment.cancellation_reason?.toLowerCase().includes(searchLower) ||
        payment.cancelled_by_username?.toLowerCase().includes(searchLower)
      );
    } else if (isGeneralExpense) {
      return (
        payment.expense_category?.toLowerCase().includes(searchLower) ||
        payment.vendor?.toLowerCase().includes(searchLower) ||
        payment.month_year?.toLowerCase().includes(searchLower) ||
        payment.cancellation_reason?.toLowerCase().includes(searchLower) ||
        payment.cancelled_by_username?.toLowerCase().includes(searchLower)
      );
    }
    return false;
  });

  if (loading) {
    return <div className="loading-container">Yükleniyor...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <button onClick={() => navigate('/teacher-payments')} className="btn btn-secondary btn-sm">
            ← Geri
          </button>
          <h1 className="page-title" style={{ marginTop: 'var(--space-4)' }}>
            İptal Edilen Ödemeler
          </h1>
          <p className="page-subtitle">İptal edilen öğretmen ödemeleri ve genel giderleri görüntüleyin</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <input
            type="text"
            className="form-input"
            placeholder="🔍 Öğretmen, kategori, ay, iptal nedeni ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '300px' }}
          />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Tür</th>
              <th>Öğretmen/Kategori</th>
              <th>Ay</th>
              <th>Toplam Tutar</th>
              <th>Ödenen</th>
              <th>Kalan</th>
              <th>İptal Tarihi</th>
              <th>İptal Eden</th>
              <th>İptal Nedeni</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                  İptal edilen ödeme bulunmamaktadır
                </td>
              </tr>
            ) : (
              filteredPayments.map((payment) => {
                const paidAmount = parseFloat(payment.paid_amount || 0);
                const totalAmount = parseFloat(payment.total_amount);
                const remainingAmount = parseFloat(payment.remaining_amount || 0);
                const isTeacherPayment = payment.payment_type === 'teacher_salary' || !payment.payment_type;

                return (
                  <tr key={payment.id}>
                    <td>
                      <span className={`badge badge-${isTeacherPayment ? 'info' : 'warning'}`}>
                        {isTeacherPayment ? '👨‍🏫 Öğretmen' : '🏢 Genel Gider'}
                      </span>
                    </td>
                    <td className="font-bold">
                      {isTeacherPayment 
                        ? `${payment.first_name} ${payment.last_name}`
                        : getCategoryLabel(payment.expense_category)
                      }
                    </td>
                    <td>{payment.month_year}</td>
                    <td>{formatCurrencyWithSymbol(totalAmount)}</td>
                    <td className="text-success">{formatCurrencyWithSymbol(paidAmount)}</td>
                    <td className={remainingAmount > 0 ? 'text-error' : 'text-success'}>
                      {formatCurrencyWithSymbol(remainingAmount)}
                    </td>
                    <td>
                      {payment.cancelled_at 
                        ? new Date(payment.cancelled_at).toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : '-'}
                    </td>
                    <td>{payment.cancelled_by_username || '-'}</td>
                    <td>
                      <div style={{ 
                        maxWidth: '300px', 
                        whiteSpace: 'pre-wrap',
                        padding: 'var(--space-2)',
                        background: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.9em'
                      }}>
                        {payment.cancellation_reason || '-'}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
