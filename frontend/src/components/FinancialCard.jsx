import { useState, useEffect } from 'react';
import { financialAPI } from '../services/api';
import { formatCurrencyWithSymbol } from '../utils/formatters';

export default function FinancialCard() {
  const [financial, setFinancial] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7) // YYYY-MM format
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFinancialData();
  }, [selectedMonth]);

  const loadFinancialData = async () => {
    try {
      const response = await financialAPI.getSummary(selectedMonth);
      setFinancial(response.data);
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-container">Yükleniyor...</div>;
  }

  if (!financial) {
    return null;
  }

  return (
    <div className="dashboard-card" style={{ gridColumn: '1 / -1' }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <div>
          <div className="card-icon" style={{ display: 'inline-block', marginRight: 'var(--space-2)' }}>💰</div>
          <h3 className="card-title" style={{ display: 'inline-block' }}>Finansal Özet</h3>
        </div>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="form-input"
          style={{ width: '200px' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-4)' }}>
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
            {formatCurrencyWithSymbol(financial.actual_income)}
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
            {formatCurrencyWithSymbol(financial.actual_expense)}
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
            {formatCurrencyWithSymbol(financial.planned_income)}
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
            {formatCurrencyWithSymbol(financial.planned_expense)}
          </div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: 'var(--space-2)' }}>
            Beklenen
          </div>
        </div>
      </div>

      {/* Net Profit */}
      <div style={{ 
        marginTop: 'var(--space-4)', 
        padding: 'var(--space-4)', 
        background: financial.net_profit >= 0 
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
          {formatCurrencyWithSymbol(financial.net_profit)}
        </div>
        <div style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: 'var(--space-2)' }}>
          Tahmini Kar: {formatCurrencyWithSymbol(financial.projected_profit)}
        </div>
      </div>
    </div>
  );
}
