import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();

  const menuItems = [
    { path: '/', label: 'Ana Sayfa', icon: '🏠', roles: ['admin', 'teacher'] },
    { path: '/students', label: 'Öğrenci Yönetimi', icon: '👨‍🎓', roles: ['admin', 'teacher'] },
    { path: '/teachers', label: 'Öğretmen Yönetimi', icon: '👨‍🏫', roles: ['admin'] },
    { path: '/courses', label: 'Ders Yönetimi', icon: '📚', roles: ['admin', 'teacher'] },
    { path: '/schedule', label: 'Ders Program Takvimi', icon: '📅', roles: ['admin', 'teacher'] },
    { path: '/events', label: 'Etkinlikler', icon: '🎭', roles: ['admin', 'teacher'] },
    { path: '/payments', label: 'Ödeme Takibi', icon: '💰', roles: ['admin'] },
    { path: '/teacher-payments', label: 'Gider Takibi', icon: '💸', roles: ['admin'] },
    { path: '/financial-reports', label: 'Finansal Raporlar', icon: '📊', roles: ['admin'] }
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user?.role));

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <img src="/unzile-logo.png" alt="ÜnzileArt Logo" className="logo-image" />
          <h2 className="logo-text">ÜnzileArt</h2>
        </div>
      </div>

      <nav className="sidebar-nav">
        {filteredMenu.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => 
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="user-details">
            <div className="user-name">{user?.full_name}</div>
            <div className="user-role">
              {user?.role === 'admin' ? 'Yönetici' : 'Öğretmen'}
            </div>
          </div>
        </div>
        <button onClick={logout} className="btn-logout">
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
