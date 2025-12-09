import { useState, useEffect } from 'react';
import { financialAPI } from '../services/api';
import { formatCurrencyWithSymbol } from '../utils/formatters';
import '../pages/Students.css';

export default function FinancialReports() {
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7) // YYYY-MM format
  );
  const [summary, setSummary] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' or 'report'

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const loadData = async () => {
    try {
      const [summaryRes, reportRes] = await Promise.all([
        financialAPI.getSummary(selectedMonth),
        financialAPI.getReport(selectedMonth)
      ]);
      setSummary(summaryRes.data);
      setReport(reportRes.data);
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  if (loading) {
    return <div className="loading-container">Yükleniyor...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Finansal Raporlar</h1>
          <p className="page-subtitle">Gelir, gider ve kar raporları</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="form-input"
            style={{ width: '200px' }}
          />
          {activeTab === 'report' && (
            <button onClick={handlePrintReport} className="btn btn-secondary">
              🖨️ Yazdır / PDF
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: 'var(--space-3)', 
        marginBottom: 'var(--space-4)'
      }}>
        <button
          onClick={() => setActiveTab('summary')}
          className={`btn ${activeTab === 'summary' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1 }}
        >
          📊 Finansal Özet
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={`btn ${activeTab === 'report' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1 }}
        >
          📄 Detaylı Rapor
        </button>
      </div>

      {/* Summary Tab */}
      {activeTab === 'summary' && summary && (
        <div>
          {/* Financial Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            {/* Actual Income */}
            <div style={{ 
              padding: 'var(--space-4)', 
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: 'var(--radius-lg)',
              color: 'white'
            }}>
              <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: 'var(--space-2)' }}>
                Gelirler
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>
                {formatCurrencyWithSymbol(summary.actual_income)}
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: 'var(--space-2)' }}>
                Gerçekleşen
              </div>
            </div>

            {/* Actual Expense */}
            <div style={{ 
              padding: 'var(--space-4)', 
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              borderRadius: 'var(--radius-lg)',
              color: 'white'
            }}>
              <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: 'var(--space-2)' }}>
                Giderler
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>
                {formatCurrencyWithSymbol(summary.actual_expense)}
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: 'var(--space-2)' }}>
                Gerçekleşen
              </div>
            </div>

            {/* Planned Income */}
            <div style={{ 
              padding: 'var(--space-4)', 
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              borderRadius: 'var(--radius-lg)',
              color: 'white',
              opacity: 0.85
            }}>
              <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: 'var(--space-2)' }}>
                Planlanan Gelirler
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>
                {formatCurrencyWithSymbol(summary.planned_income)}
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: 'var(--space-2)' }}>
                Beklenen
              </div>
            </div>

            {/* Planned Expense */}
            <div style={{ 
              padding: 'var(--space-4)', 
              background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
              borderRadius: 'var(--radius-lg)',
              color: 'white',
              opacity: 0.85
            }}>
              <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: 'var(--space-2)' }}>
                Planlanan Giderler
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>
                {formatCurrencyWithSymbol(summary.planned_expense)}
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: 'var(--space-2)' }}>
                Beklenen
              </div>
            </div>
          </div>

          {/* Net Profit */}
          <div style={{ 
            padding: 'var(--space-4)', 
            background: summary.net_profit >= 0 
              ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
              : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            borderRadius: 'var(--radius-lg)',
            color: 'white',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: 'var(--space-2)' }}>
              Net Kar
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
              {formatCurrencyWithSymbol(summary.net_profit)}
            </div>
            <div style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: 'var(--space-2)' }}>
              Tahmini Kar: {formatCurrencyWithSymbol(summary.projected_profit)}
            </div>
          </div>
        </div>
      )}

      {/* Report Tab */}
      {activeTab === 'report' && report && (
        <div className="report-container">
          <h2 style={{ marginBottom: 'var(--space-4)' }}>
            {new Date(selectedMonth + '-01').toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' })} Dönemi Raporu
          </h2>

          {/* Income Section */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <h3 style={{ 
              color: '#10b981', 
              marginBottom: 'var(--space-3)',
              paddingBottom: 'var(--space-2)',
              borderBottom: '2px solid #10b981'
            }}>
              📈 GELİRLER
            </h3>

            {/* Student Payments */}
            {report.income.student_payments.length > 0 && (
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <h4>Öğrenci Ödemeleri</h4>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Öğrenci</th>
                        <th>Ders</th>
                        <th>Tarih</th>
                        <th>Ödeme Yöntemi</th>
                        <th>Tutar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.income.student_payments.map((payment, idx) => (
                        <tr key={idx}>
                          <td>{payment.student_name}</td>
                          <td>{payment.course_name || '-'}</td>
                          <td>{new Date(payment.payment_date).toLocaleDateString('tr-TR')}</td>
                          <td>{payment.payment_method === 'cash' ? 'Nakit' : payment.payment_method === 'card' ? 'Kart' : 'Havale'}</td>
                          <td className="text-success">{formatCurrencyWithSymbol(payment.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Event Payments */}
            {report.income.event_payments.length > 0 && (
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <h4>Etkinlik Gelirleri</h4>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Etkinlik</th>
                        <th>Tür</th>
                        <th>Toplam Ücret</th>
                        <th>Ödenen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.income.event_payments.map((event, idx) => (
                        <tr key={idx}>
                          <td>{event.event_name}</td>
                          <td>{event.event_type}</td>
                          <td>{formatCurrencyWithSymbol(event.event_price)}</td>
                          <td className="text-success">{formatCurrencyWithSymbol(event.total_paid)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ 
              padding: 'var(--space-3)', 
              background: '#d1fae5', 
              borderRadius: 'var(--radius-md)',
              textAlign: 'right',
              fontWeight: 'bold',
              fontSize: '1.25rem'
            }}>
              Toplam Gelir: {formatCurrencyWithSymbol(report.income.total)}
            </div>
          </div>

          {/* Expense Section */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <h3 style={{ 
              color: '#ef4444', 
              marginBottom: 'var(--space-3)',
              paddingBottom: 'var(--space-2)',
              borderBottom: '2px solid #ef4444'
            }}>
              📉 GİDERLER
            </h3>

            {report.expenses.teacher_payments.length > 0 ? (
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <h4>Öğretmen Ödemeleri</h4>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Öğretmen</th>
                        <th>Toplam Saat</th>
                        <th>Saat Ücreti</th>
                        <th>Toplam Tutar</th>
                        <th>Ödenen</th>
                        <th>Tarih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.expenses.teacher_payments.map((payment, idx) => (
                        <tr key={idx}>
                          <td>{payment.teacher_name}</td>
                          <td>{payment.total_hours} saat</td>
                          <td>{formatCurrencyWithSymbol(payment.hourly_rate)}</td>
                          <td>{formatCurrencyWithSymbol(payment.total_amount)}</td>
                          <td className="text-error">{formatCurrencyWithSymbol(payment.paid_amount)}</td>
                          <td>{new Date(payment.payment_date).toLocaleDateString('tr-TR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p>Bu ay öğretmen ödemesi yapılmamış.</p>
            )}

            <div style={{ 
              padding: 'var(--space-3)', 
              background: '#fee2e2', 
              borderRadius: 'var(--radius-md)',
              textAlign: 'right',
              fontWeight: 'bold',
              fontSize: '1.25rem'
            }}>
              Toplam Gider: {formatCurrencyWithSymbol(report.expenses.total)}
            </div>
          </div>

          {/* Net Profit */}
          <div style={{ 
            padding: 'var(--space-4)', 
            background: report.net_profit >= 0 ? '#dbeafe' : '#fed7aa',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'center',
            border: `3px solid ${report.net_profit >= 0 ? '#3b82f6' : '#f59e0b'}`
          }}>
            <div style={{ fontSize: '1rem', marginBottom: 'var(--space-2)', fontWeight: 'bold' }}>
              NET KAR
            </div>
            <div style={{ 
              fontSize: '3rem', 
              fontWeight: 'bold',
              color: report.net_profit >= 0 ? '#3b82f6' : '#f59e0b'
            }}>
              {formatCurrencyWithSymbol(report.net_profit)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
