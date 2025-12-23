import { useState, useEffect } from 'react';
import { financialAPI } from '../../services/api';
import { formatCurrencyWithSymbol } from '../../utils/formatters';
import './ManagerPages.css';

export default function ManagerReports() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    loadReport();
  }, [selectedMonth]);

  const loadReport = async () => {
    try {
      const response = await financialAPI.getReport(selectedMonth);
      setReport(response.data);
    } catch (error) {
      console.error('Rapor yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Yükleniyor...</div>;
  }

  if (!report) {
    return <div className="empty-state"><p>Rapor bulunamadı</p></div>;
  }

  const netProfit = (report.total_income || 0) - (report.total_expenses || 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>📈 Finansal Raporlar</h1>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="month-picker"
        />
      </div>

      {/* Summary Cards */}
      <div className="finance-summary-grid">
        <div className="finance-card income">
          <div className="finance-card-icon">💰</div>
          <div className="finance-card-content">
            <div className="finance-card-label">Toplam Gelir</div>
            <div className="finance-card-value">{formatCurrencyWithSymbol(report.total_income || 0)}</div>
          </div>
        </div>

        <div className="finance-card expense">
          <div className="finance-card-icon">💸</div>
          <div className="finance-card-content">
            <div className="finance-card-label">Toplam Gider</div>
            <div className="finance-card-value">{formatCurrencyWithSymbol(report.total_expenses || 0)}</div>
          </div>
        </div>

        <div className={`finance-card ${netProfit >= 0 ? 'profit' : 'loss'}`}>
          <div className="finance-card-icon">{netProfit >= 0 ? '📊' : '📉'}</div>
          <div className="finance-card-content">
            <div className="finance-card-label">Net {netProfit >= 0 ? 'Kar' : 'Zarar'}</div>
            <div className="finance-card-value">{formatCurrencyWithSymbol(Math.abs(netProfit))}</div>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="report-sections">
        {/* Income Section */}
        <div className="report-section">
          <h2 className="section-title">💰 Gelir Detayları</h2>
          <div className="report-table">
            <div className="report-row">
              <span>Öğrenci Ödemeleri</span>
              <strong>{formatCurrencyWithSymbol(report.student_payments || 0)}</strong>
            </div>
            <div className="report-row">
              <span>Etkinlik Ödemeleri</span>
              <strong>{formatCurrencyWithSymbol(report.event_payments || 0)}</strong>
            </div>
            <div className="report-row total">
              <span>Toplam Gelir</span>
              <strong>{formatCurrencyWithSymbol(report.total_income || 0)}</strong>
            </div>
          </div>
        </div>

        {/* Expenses Section */}
        <div className="report-section">
          <h2 className="section-title">💸 Gider Detayları</h2>
          <div className="report-table">
            <div className="report-row">
              <span>Öğretmen Ödemeleri</span>
              <strong>{formatCurrencyWithSymbol(report.teacher_payments || 0)}</strong>
            </div>
            <div className="report-row">
              <span>Genel Giderler</span>
              <strong>{formatCurrencyWithSymbol(report.general_expenses || 0)}</strong>
            </div>
            <div className="report-row total">
              <span>Toplam Gider</span>
              <strong>{formatCurrencyWithSymbol(report.total_expenses || 0)}</strong>
            </div>
          </div>
        </div>

        {/* Cancellations Section */}
        {(report.cancelled_payments > 0 || report.cancelled_events > 0) && (
          <div className="report-section">
            <h2 className="section-title">❌ İptal Edilen İşlemler</h2>
            <div className="report-table">
              <div className="report-row">
                <span>İptal Edilen Ödemeler</span>
                <strong>{formatCurrencyWithSymbol(report.cancelled_payments || 0)}</strong>
              </div>
              <div className="report-row">
                <span>İptal Edilen Etkinlikler</span>
                <strong>{formatCurrencyWithSymbol(report.cancelled_events || 0)}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="report-section summary">
          <h2 className="section-title">📊 Özet</h2>
          <div className="report-table">
            <div className="report-row">
              <span>Toplam Gelir</span>
              <strong className="text-success">{formatCurrencyWithSymbol(report.total_income || 0)}</strong>
            </div>
            <div className="report-row">
              <span>Toplam Gider</span>
              <strong className="text-error">{formatCurrencyWithSymbol(report.total_expenses || 0)}</strong>
            </div>
            <div className="report-row total">
              <span>Net {netProfit >= 0 ? 'Kar' : 'Zarar'}</span>
              <strong className={netProfit >= 0 ? 'text-success' : 'text-error'}>
                {formatCurrencyWithSymbol(Math.abs(netProfit))}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
