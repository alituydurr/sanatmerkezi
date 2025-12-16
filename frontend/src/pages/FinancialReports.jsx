import { useState, useEffect } from 'react';
import { financialAPI, paymentsAPI, teacherPaymentsAPI, eventsAPI } from '../services/api';
import { formatCurrencyWithSymbol } from '../utils/formatters';
import * as XLSX from 'xlsx';
import '../pages/Students.css';

export default function FinancialReports() {
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7) // YYYY-MM format
  );
  const [summary, setSummary] = useState(null);
  const [report, setReport] = useState(null);
  const [cancelledPayments, setCancelledPayments] = useState([]);
  const [cancelledTeacherPayments, setCancelledTeacherPayments] = useState([]);
  const [cancelledEvents, setCancelledEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' or 'report'

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
  }, [selectedMonth]);

  const loadData = async () => {
    try {
      const [summaryRes, reportRes, cancelledPaymentsRes, cancelledTeacherPaymentsRes, cancelledEventsRes] = await Promise.all([
        financialAPI.getSummary(selectedMonth),
        financialAPI.getReport(selectedMonth),
        paymentsAPI.getCancelled(),
        teacherPaymentsAPI.getCancelled(),
        eventsAPI.getCancelled()
      ]);
      setSummary(summaryRes.data);
      setReport(reportRes.data);
      
      // Filter cancelled payments by selected month
      const [year, month] = selectedMonth.split('-');
      const filtered = cancelledPaymentsRes.data.filter(p => {
        if (!p.cancelled_at) return false;
        const cancelDate = new Date(p.cancelled_at);
        return cancelDate.getFullYear() === parseInt(year) && 
               (cancelDate.getMonth() + 1) === parseInt(month);
      });
      setCancelledPayments(filtered);
      
      const filteredTeacher = cancelledTeacherPaymentsRes.data.filter(p => {
        if (!p.cancelled_at) return false;
        const cancelDate = new Date(p.cancelled_at);
        return cancelDate.getFullYear() === parseInt(year) && 
               (cancelDate.getMonth() + 1) === parseInt(month);
      });
      setCancelledTeacherPayments(filteredTeacher);
      
      const filteredEvents = cancelledEventsRes.data.filter(e => {
        if (!e.cancelled_at) return false;
        const cancelDate = new Date(e.cancelled_at);
        return cancelDate.getFullYear() === parseInt(year) && 
               (cancelDate.getMonth() + 1) === parseInt(month);
      });
      setCancelledEvents(filteredEvents);
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // Trigger print dialog which allows saving as PDF
    window.print();
  };

  const handleDownloadExcel = () => {
    if (!report) return;

    // Prepare workbook
    const wb = XLSX.utils.book_new();
    
    // Create summary sheet
    const summaryData = [
      ['SANAT MERKEZİ FİNANSAL RAPOR'],
      ['Dönem:', new Date(selectedMonth + '-01').toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' })],
      [],
      ['FİNANSAL ÖZET'],
      ['Gerçekleşen Gelir:', summary?.actual_income || 0],
      ['Gerçekleşen Gider:', summary?.actual_expense || 0],
      ['Planlanan Gelir:', summary?.planned_income || 0],
      ['Planlanan Gider:', summary?.planned_expense || 0],
      ['Net Kar:', summary?.net_profit || 0],
      ['Tahmini Kar:', summary?.projected_profit || 0],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Özet');

    // Create income sheet
    const incomeData = [
      ['GELİRLER'],
      [],
      ['ÖĞRENCİ ÖDEMELERİ'],
      ['Öğrenci', 'Ders', 'Tarih', 'Ödeme Yöntemi', 'Tutar'],
      ...report.income.student_payments.map(p => [
        p.student_name,
        p.course_name || '-',
        new Date(p.payment_date).toLocaleDateString('tr-TR'),
        p.payment_method === 'cash' ? 'Nakit' : p.payment_method === 'card' ? 'Kart' : 'Havale',
        parseFloat(p.amount)
      ]),
      [],
      ['ETKİNLİK GELİRLERİ'],
      ['Etkinlik', 'Tür', 'Toplam Ücret', 'Ödenen'],
      ...report.income.event_payments.map(e => [
        e.event_name,
        e.event_type,
        parseFloat(e.event_price),
        parseFloat(e.total_paid)
      ]),
      [],
      ['TOPLAM GELİR:', '', '', '', report.income.total]
    ];
    const incomeSheet = XLSX.utils.aoa_to_sheet(incomeData);
    XLSX.utils.book_append_sheet(wb, incomeSheet, 'Gelirler');

    // Create expense sheet
    const expenseData = [
      ['GİDERLER'],
      [],
      ['ÖĞRETMEN ÖDEMELERİ'],
      ['Öğretmen', 'Toplam Saat', 'Saat Ücreti', 'Deneme Dersi', 'Toplam Tutar', 'Ödenen', 'Tarih'],
      ...report.expenses.teacher_payments.map(p => {
        const normalFee = parseFloat(p.total_hours || 0) * parseFloat(p.hourly_rate || 0);
        const trialFee = parseFloat(p.total_amount || 0) - normalFee;
        return [
          p.teacher_name,
          parseFloat(p.total_hours || 0),
          parseFloat(p.hourly_rate || 0),
          trialFee,
          parseFloat(p.total_amount),
          parseFloat(p.paid_amount),
          new Date(p.payment_date).toLocaleDateString('tr-TR')
        ];
      }),
      [],
      ['GENEL GİDERLER'],
      ['Kategori', 'Tedarikçi', 'Fatura No', 'Toplam Tutar', 'Ödenen', 'Tarih', 'Notlar'],
      ...(report.expenses.general_expenses || []).map(e => [
        getCategoryLabel(e.expense_category),
        e.vendor || '-',
        e.invoice_number || '-',
        parseFloat(e.total_amount),
        parseFloat(e.paid_amount),
        new Date(e.payment_date).toLocaleDateString('tr-TR'),
        e.notes || '-'
      ]),
      [],
      ['TOPLAM GİDER:', '', '', '', '', report.expenses.total]
    ];
    const expenseSheet = XLSX.utils.aoa_to_sheet(expenseData);
    XLSX.utils.book_append_sheet(wb, expenseSheet, 'Giderler');

    // Create cancellations sheet
    const cancellationData = [
      ['İPTAL EDİLEN ÖDEMELER'],
      [],
      ['ÖĞRENCİ ÖDEMELERİ'],
      ['Öğrenci', 'Ders', 'Toplam Tutar', 'İptal Edilen', 'İptal Tarihi', 'Neden'],
      ...cancelledPayments.map(p => {
        const cancelled = parseFloat(p.total_amount) - parseFloat(p.paid_amount || 0);
        return [
          `${p.student_first_name} ${p.student_last_name}`,
          p.course_name || '-',
          parseFloat(p.total_amount),
          cancelled,
          new Date(p.cancelled_at).toLocaleDateString('tr-TR'),
          p.cancellation_reason
        ];
      }),
      [],
      ['ÖĞRETMEN ÖDEMELERİ'],
      ['Öğretmen/Kategori', 'Ay', 'Toplam Tutar', 'İptal Edilen', 'İptal Tarihi', 'Neden'],
      ...cancelledTeacherPayments.filter(p => p.payment_type === 'teacher_salary' || !p.payment_type).map(p => {
        const cancelled = parseFloat(p.total_amount) - parseFloat(p.paid_amount || 0);
        return [
          `${p.first_name} ${p.last_name}`,
          p.month_year,
          parseFloat(p.total_amount),
          cancelled,
          new Date(p.cancelled_at).toLocaleDateString('tr-TR'),
          p.cancellation_reason
        ];
      }),
      [],
      ['GENEL GİDERLER'],
      ['Kategori', 'Ay', 'Toplam Tutar', 'İptal Edilen', 'İptal Tarihi', 'Neden'],
      ...cancelledTeacherPayments.filter(p => p.payment_type === 'general_expense').map(p => {
        const cancelled = parseFloat(p.total_amount) - parseFloat(p.paid_amount || 0);
        return [
          getCategoryLabel(p.expense_category),
          p.month_year,
          parseFloat(p.total_amount),
          cancelled,
          new Date(p.cancelled_at).toLocaleDateString('tr-TR'),
          p.cancellation_reason
        ];
      }),
      [],
      ['ETKİNLİKLER'],
      ['Etkinlik', 'Tür', 'Toplam Tutar', 'İptal Edilen', 'İptal Tarihi', 'Neden'],
      ...cancelledEvents.map(e => {
        const cancelled = parseFloat(e.total_amount) - parseFloat(e.paid_amount || 0);
        return [
          e.item_name,
          e.event_type,
          parseFloat(e.total_amount),
          cancelled,
          new Date(e.cancelled_at).toLocaleDateString('tr-TR'),
          e.cancellation_reason
        ];
      })
    ];
    const cancellationSheet = XLSX.utils.aoa_to_sheet(cancellationData);
    XLSX.utils.book_append_sheet(wb, cancellationSheet, 'İptaller');

    // Download
    const fileName = `Finansal_Rapor_${selectedMonth}.xlsx`;
    XLSX.writeFile(wb, fileName);
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
            <>
              <button onClick={handleDownloadPDF} className="btn btn-secondary">
                📄 PDF İndir
              </button>
              <button onClick={handleDownloadExcel} className="btn btn-success">
                📊 Excel İndir
              </button>
            </>
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
                        <th>Deneme Dersi</th>
                        <th>Toplam Tutar</th>
                        <th>Ödenen</th>
                        <th>Tarih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.expenses.teacher_payments.map((payment, idx) => {
                        // Calculate trial lessons fee
                        const normalLessonsFee = parseFloat(payment.total_hours || 0) * parseFloat(payment.hourly_rate || 0);
                        const trialLessonsFee = parseFloat(payment.total_amount || 0) - normalLessonsFee;
                        
                        return (
                        <tr key={idx}>
                          <td>{payment.teacher_name}</td>
                          <td>{payment.total_hours} saat</td>
                          <td>{formatCurrencyWithSymbol(payment.hourly_rate)}</td>
                          <td>{formatCurrencyWithSymbol(trialLessonsFee)}</td>
                          <td>{formatCurrencyWithSymbol(payment.total_amount)}</td>
                          <td className="text-error">{formatCurrencyWithSymbol(payment.paid_amount)}</td>
                          <td>{new Date(payment.payment_date).toLocaleDateString('tr-TR')}</td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p>Bu ay öğretmen ödemesi yapılmamış.</p>
            )}

            {/* General Expenses */}
            {report.expenses.general_expenses && report.expenses.general_expenses.length > 0 && (
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <h4>Genel Giderler</h4>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Kategori</th>
                        <th>Tedarikçi</th>
                        <th>Fatura No</th>
                        <th>Toplam Tutar</th>
                        <th>Ödenen</th>
                        <th>Tarih</th>
                        <th>Notlar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.expenses.general_expenses.map((expense, idx) => (
                        <tr key={idx}>
                          <td>{getCategoryLabel(expense.expense_category)}</td>
                          <td>{expense.vendor || '-'}</td>
                          <td>{expense.invoice_number || '-'}</td>
                          <td>{formatCurrencyWithSymbol(expense.total_amount)}</td>
                          <td className="text-error">{formatCurrencyWithSymbol(expense.paid_amount)}</td>
                          <td>{new Date(expense.payment_date).toLocaleDateString('tr-TR')}</td>
                          <td style={{ maxWidth: '200px', fontSize: '0.85em' }}>{expense.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
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

          {/* Cancelled Payments Section */}
          {(cancelledPayments.length > 0 || cancelledTeacherPayments.length > 0 || cancelledEvents.length > 0) && (
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <h3 style={{ 
                color: '#f59e0b', 
                marginBottom: 'var(--space-3)',
                paddingBottom: 'var(--space-2)',
                borderBottom: '2px solid #f59e0b'
              }}>
                ❌ İPTAL EDİLEN ÖDEMELER
              </h3>

              {/* Cancelled Student Payments */}
              {cancelledPayments.length > 0 && (
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <h4>İptal Edilen Öğrenci Ödemeleri</h4>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Öğrenci</th>
                          <th>Ders</th>
                          <th>Toplam Tutar</th>
                          <th>İptal Edilen Tutar</th>
                          <th>İptal Tarihi</th>
                          <th>İptal Nedeni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cancelledPayments.map((payment, idx) => {
                          const cancelledAmount = parseFloat(payment.total_amount) - parseFloat(payment.paid_amount || 0);
                          return (
                            <tr key={idx}>
                              <td>{payment.student_first_name} {payment.student_last_name}</td>
                              <td>{payment.course_name || '-'}</td>
                              <td>{formatCurrencyWithSymbol(payment.total_amount)}</td>
                              <td className="text-error">{formatCurrencyWithSymbol(cancelledAmount)}</td>
                              <td>{new Date(payment.cancelled_at).toLocaleDateString('tr-TR')}</td>
                              <td style={{ maxWidth: '200px', fontSize: '0.85em' }}>{payment.cancellation_reason}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Cancelled Teacher Payments */}
              {cancelledTeacherPayments.filter(p => p.payment_type === 'teacher_salary' || !p.payment_type).length > 0 && (
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <h4>İptal Edilen Öğretmen Ödemeleri</h4>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Öğretmen</th>
                          <th>Ay</th>
                          <th>Toplam Tutar</th>
                          <th>İptal Edilen Tutar</th>
                          <th>İptal Tarihi</th>
                          <th>İptal Nedeni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cancelledTeacherPayments
                          .filter(p => p.payment_type === 'teacher_salary' || !p.payment_type)
                          .map((payment, idx) => {
                            const cancelledAmount = parseFloat(payment.total_amount) - parseFloat(payment.paid_amount || 0);
                            return (
                              <tr key={idx}>
                                <td>{payment.first_name} {payment.last_name}</td>
                                <td>{payment.month_year}</td>
                                <td>{formatCurrencyWithSymbol(payment.total_amount)}</td>
                                <td className="text-error">{formatCurrencyWithSymbol(cancelledAmount)}</td>
                                <td>{new Date(payment.cancelled_at).toLocaleDateString('tr-TR')}</td>
                                <td style={{ maxWidth: '200px', fontSize: '0.85em' }}>{payment.cancellation_reason}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Cancelled General Expenses */}
              {cancelledTeacherPayments.filter(p => p.payment_type === 'general_expense').length > 0 && (
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <h4>İptal Edilen Genel Giderler</h4>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Kategori</th>
                          <th>Ay</th>
                          <th>Toplam Tutar</th>
                          <th>İptal Edilen Tutar</th>
                          <th>İptal Tarihi</th>
                          <th>İptal Nedeni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cancelledTeacherPayments
                          .filter(p => p.payment_type === 'general_expense')
                          .map((payment, idx) => {
                            const cancelledAmount = parseFloat(payment.total_amount) - parseFloat(payment.paid_amount || 0);
                            return (
                              <tr key={idx}>
                                <td>{getCategoryLabel(payment.expense_category)}</td>
                                <td>{payment.month_year}</td>
                                <td>{formatCurrencyWithSymbol(payment.total_amount)}</td>
                                <td className="text-error">{formatCurrencyWithSymbol(cancelledAmount)}</td>
                                <td>{new Date(payment.cancelled_at).toLocaleDateString('tr-TR')}</td>
                                <td style={{ maxWidth: '200px', fontSize: '0.85em' }}>{payment.cancellation_reason}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Cancelled Events */}
              {cancelledEvents.length > 0 && (
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <h4>İptal Edilen Etkinlikler</h4>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Etkinlik</th>
                          <th>Tür</th>
                          <th>Toplam Tutar</th>
                          <th>İptal Edilen Tutar</th>
                          <th>İptal Tarihi</th>
                          <th>İptal Nedeni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cancelledEvents.map((event, idx) => {
                          const cancelledAmount = parseFloat(event.total_amount) - parseFloat(event.paid_amount || 0);
                          return (
                            <tr key={idx}>
                              <td>{event.item_name}</td>
                              <td>{event.event_type}</td>
                              <td>{formatCurrencyWithSymbol(event.total_amount)}</td>
                              <td className="text-error">{formatCurrencyWithSymbol(cancelledAmount)}</td>
                              <td>{new Date(event.cancelled_at).toLocaleDateString('tr-TR')}</td>
                              <td style={{ maxWidth: '200px', fontSize: '0.85em' }}>{event.cancellation_reason}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

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
