import { useState, useEffect } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { financialAPI, paymentsAPI, teacherPaymentsAPI } from '../services/api';
import { formatCurrencyWithSymbol } from '../utils/formatters';
import LoadingSpinner from '../components/LoadingSpinner';
import ManagerNotes from './manager/ManagerNotes';
import ManagerTasks from './manager/ManagerTasks';
import ManagerPayments from './manager/ManagerPayments';
import ManagerExpenses from './manager/ManagerExpenses';
import ManagerReports from './manager/ManagerReports';
import './Portal.css';
import './ManagerPortal.css';

export default function ManagerPortal() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Ünzile Hanım için özel selamlamalar
  const getGreeting = () => {
    const hour = new Date().getHours();
    const compliments = [
      "Bugün ne kadar zarif görünüyorsun",
      "Gülüşün güneş gibi aydınlatıyor",
      "Enerjin herkese ilham veriyor",
      "Bugün de harikasın",
      "Tebessümün gün ışığından parlak"
    ];
    
    const randomCompliment = compliments[Math.floor(Math.random() * compliments.length)];
    
    if (hour < 12) return { greeting: "Günaydın", compliment: randomCompliment };
    if (hour < 18) return { greeting: "İyi günler", compliment: randomCompliment };
    return { greeting: "İyi akşamlar", compliment: randomCompliment };
  };

  const { greeting, compliment } = getGreeting();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      const [financialRes, paymentsRes, teacherPaymentsRes] = await Promise.all([
        financialAPI.getSummary(currentMonth),
        paymentsAPI.getPending(),
        teacherPaymentsAPI.getAll(currentMonth)
      ]);

      setDashboardData({
        financial: financialRes.data,
        pendingPayments: paymentsRes.data,
        teacherPayments: teacherPaymentsRes.data
      });
    } catch (error) {
      console.error('Dashboard yüklenemedi:', error);
      toast.error('Dashboard yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { icon: '📊', label: 'Dashboard', path: '/manager-portal' },
    { icon: '📝', label: 'Notlar', path: '/manager-portal/notes' },
    { icon: '✅', label: 'Görevler', path: '/manager-portal/tasks' },
    { icon: '💰', label: 'Ödemeler', path: '/manager-portal/payments' },
    { icon: '💸', label: 'Giderler', path: '/manager-portal/expenses' },
    { icon: '📈', label: 'Raporlar', path: '/manager-portal/reports' }
  ];

  const handleMenuClick = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="portal-container">
        <div className="portal-loading">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="manager-portal-wrapper">
      {/* Mobile Header with Hamburger */}
      <div className="manager-header">
        <button 
          className="hamburger-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menü"
        >
          <div className={`hamburger ${menuOpen ? 'open' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>
        <div className="manager-header-title">
          <h1>{greeting} {user?.full_name} 💜</h1>
          <p className="compliment">{compliment} ✨</p>
        </div>
        <button onClick={logout} className="logout-btn">
          Çıkış
        </button>
      </div>

      {/* Sidebar Menu */}
      <div className={`manager-sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="manager-sidebar-header">
          <h2>Menü</h2>
          <button onClick={() => setMenuOpen(false)} className="close-btn">✕</button>
        </div>
        <nav className="manager-sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleMenuClick(item.path)}
              className={`manager-sidebar-item ${window.location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="manager-sidebar-icon">{item.icon}</span>
              <span className="manager-sidebar-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="manager-sidebar-footer">
          <button onClick={logout} className="manager-sidebar-logout">
            🚪 Çıkış Yap
          </button>
        </div>
      </div>

      {/* Overlay */}
      {menuOpen && (
        <div 
          className="manager-overlay" 
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="manager-content">
        <Routes>
          <Route index element={<ManagerDashboard data={dashboardData} />} />
          <Route path="notes" element={<ManagerNotes />} />
          <Route path="tasks" element={<ManagerTasks />} />
          <Route path="payments" element={<ManagerPayments />} />
          <Route path="expenses" element={<ManagerExpenses />} />
          <Route path="reports" element={<ManagerReports />} />
        </Routes>
      </div>
    </div>
  );
}

// Dashboard Component
function ManagerDashboard({ data }) {
  const navigate = useNavigate();

  return (
    <div className="portal-container" style={{ padding: 'var(--space-3)' }}>
      {/* Financial Summary */}
      <div className="finance-summary" style={{ marginBottom: 'var(--space-4)' }}>
        <h3>💰 Bu Ay Finansal Özet</h3>
        <div className="finance-grid">
          <div className="finance-item">
            <div className="finance-label">Toplam Gelir</div>
            <div className="finance-value">
              {formatCurrencyWithSymbol(data?.financial?.total_income || 0)}
            </div>
          </div>
          <div className="finance-item">
            <div className="finance-label">Toplam Gider</div>
            <div className="finance-value">
              {formatCurrencyWithSymbol(data?.financial?.total_expenses || 0)}
            </div>
          </div>
          <div className="finance-item">
            <div className="finance-label">Net Kar</div>
            <div className="finance-value">
              {formatCurrencyWithSymbol(
                (data?.financial?.total_income || 0) - 
                (data?.financial?.total_expenses || 0)
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="portal-stats">
        <div className="stat-card">
          <div className="stat-icon">💳</div>
          <div className="stat-content">
            <div className="stat-label">Bekleyen Ödemeler</div>
            <div className="stat-value">{data?.pendingPayments?.length || 0}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👨‍🏫</div>
          <div className="stat-content">
            <div className="stat-label">Öğretmen Ödemeleri</div>
            <div className="stat-value">{data?.teacherPayments?.length || 0}</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="portal-section">
        <h2 className="section-title">⚡ Hızlı Erişim</h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
          gap: 'var(--space-2)'
        }}>
          {[
            { icon: '📝', label: 'Notlar', path: '/manager-portal/notes' },
            { icon: '✅', label: 'Görevler', path: '/manager-portal/tasks' },
            { icon: '💰', label: 'Ödemeler', path: '/manager-portal/payments' },
            { icon: '💸', label: 'Giderler', path: '/manager-portal/expenses' },
            { icon: '📈', label: 'Raporlar', path: '/manager-portal/reports' }
          ].map((item) => (
            <button 
              key={item.path}
              onClick={() => navigate(item.path)}
              className="btn btn-secondary"
              style={{ 
                padding: 'var(--space-2)', 
                height: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--space-1)',
                fontSize: '0.75rem'
              }}
            >
              <div style={{ fontSize: '1.5rem' }}>{item.icon}</div>
              <div>{item.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
