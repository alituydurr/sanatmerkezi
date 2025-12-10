import { useState, useEffect } from 'react';
import { paymentsAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { formatCurrencyWithSymbol } from '../utils/formatters';
import './Students.css';

export default function CancelledPayments() {
  const navigate = useNavigate();
  const [cancelledPayments, setCancelledPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await paymentsAPI.getCancelled();
      setCancelledPayments(res.data);
    } catch (error) {
      console.error('Error loading cancelled payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = cancelledPayments.filter(plan => {
    const searchLower = searchTerm.toLowerCase();
    return (
      plan.student_first_name?.toLowerCase().includes(searchLower) ||
      plan.student_last_name?.toLowerCase().includes(searchLower) ||
      plan.course_name?.toLowerCase().includes(searchLower) ||
      plan.cancellation_reason?.toLowerCase().includes(searchLower) ||
      plan.cancelled_by_username?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return <div className="loading-container">Yükleniyor...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <button onClick={() => navigate('/payments')} className="btn btn-secondary btn-sm">
            ← Geri
          </button>
          <h1 className="page-title" style={{ marginTop: 'var(--space-4)' }}>
            İptal Edilen Ödemeler
          </h1>
          <p className="page-subtitle">İptal edilen ödeme planlarını görüntüleyin</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <input
            type="text"
            className="form-input"
            placeholder="🔍 Öğrenci, ders, iptal nedeni ile ara..."
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
              <th>Öğrenci</th>
              <th>Ders</th>
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
                <td colSpan="8" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                  İptal edilen ödeme planı bulunmamaktadır
                </td>
              </tr>
            ) : (
              filteredPayments.map((plan) => {
                const paidAmount = parseFloat(plan.paid_amount || 0);
                const totalAmount = parseFloat(plan.total_amount);
                const remainingAmount = parseFloat(plan.remaining_amount || 0);

                return (
                  <tr key={plan.id}>
                    <td className="font-bold">
                      {plan.student_first_name} {plan.student_last_name}
                    </td>
                    <td>{plan.course_name}</td>
                    <td>{formatCurrencyWithSymbol(totalAmount)}</td>
                    <td className="text-success">{formatCurrencyWithSymbol(paidAmount)}</td>
                    <td className={remainingAmount > 0 ? 'text-error' : 'text-success'}>
                      {formatCurrencyWithSymbol(remainingAmount)}
                    </td>
                    <td>
                      {plan.cancelled_at 
                        ? new Date(plan.cancelled_at).toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : '-'}
                    </td>
                    <td>{plan.cancelled_by_username || '-'}</td>
                    <td>
                      <div style={{ 
                        maxWidth: '300px', 
                        whiteSpace: 'pre-wrap',
                        padding: 'var(--space-2)',
                        background: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.9em'
                      }}>
                        {plan.cancellation_reason || '-'}
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
