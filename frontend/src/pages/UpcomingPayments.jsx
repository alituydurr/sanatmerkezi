import { useState, useEffect } from 'react';
import { paymentsAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { formatCurrencyWithSymbol } from '../utils/formatters';
import '../pages/Students.css';
import './UpcomingPayments.css';

export default function UpcomingPayments() {
  const navigate = useNavigate();
  const [upcomingPayments, setUpcomingPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await paymentsAPI.getUpcoming();
      setUpcomingPayments(response.data);
    } catch (error) {
      console.error('Error loading upcoming payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const getMonthYear = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  // Group by month
  const monthlySummary = upcomingPayments.reduce((acc, item) => {
    const monthYear = getMonthYear(item.date);
    if (!acc[monthYear]) {
      acc[monthYear] = 0;
    }
    acc[monthYear] += item.total_amount;
    return acc;
  }, {});

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
            Gelecek Dönem Ödemeleri
          </h1>
          <p className="page-subtitle">Tarih bazlı ödeme planları</p>
        </div>
      </div>

      {/* Monthly Summary */}
      {Object.keys(monthlySummary).length > 0 && (
        <div className="monthly-summary">
          <h3 className="summary-title">Aylık Özet</h3>
          <div className="summary-grid">
            {Object.entries(monthlySummary).map(([month, total]) => (
              <div key={month} className="summary-card">
                <div className="summary-month">{month}</div>
                <div className="summary-amount">{formatCurrencyWithSymbol(total)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {upcomingPayments.length === 0 ? (
        <div className="empty-state">
          <p>Gelecek dönem ödemesi bulunmamaktadır.</p>
        </div>
      ) : (
        <div className="upcoming-grid">
          {upcomingPayments.map((item, idx) => (
            <div key={idx} className="upcoming-card">
              <div className="upcoming-date">
                📅 {formatDate(item.date)}
              </div>
              <div className="upcoming-total">
                <span className="upcoming-label">Toplam Ödeme:</span>
                <span className="upcoming-amount">{formatCurrencyWithSymbol(item.total_amount)}</span>
              </div>
              <div className="upcoming-details">
                <h4 className="upcoming-subtitle">Ödemeler ({item.payments.length})</h4>
                {item.payments.map((payment, pidx) => (
                  <div key={pidx} className="upcoming-payment-item">
                    <div className="upcoming-student">{payment.student_name}</div>
                    <div className="upcoming-course">{payment.course_name}</div>
                    <div className="upcoming-payment-amount">{formatCurrencyWithSymbol(payment.amount)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
