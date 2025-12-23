import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const formatPhoneInput = (value) => {
    // Sadece rakamları al
    const numbers = value.replace(/\D/g, '');
    // 10 haneyle sınırla
    const limited = numbers.slice(0, 10);
    
    // Format: 5XX-XXX-XXXX
    if (limited.length <= 3) {
      return limited;
    } else if (limited.length <= 6) {
      return `${limited.slice(0, 3)}-${limited.slice(3)}`;
    } else {
      return `${limited.slice(0, 3)}-${limited.slice(3, 6)}-${limited.slice(6)}`;
    }
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneInput(e.target.value);
    setPhone(formatted);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Telefon numarasındaki tire işaretlerini temizle
      const cleanPhone = phone.replace(/\D/g, '');
      const credentials = { phone: cleanPhone, password };

      const result = await login(credentials);
      
      if (result.success) {
        // Rol bazlı yönlendirme
        const role = result.user?.role;
        if (role === 'student') {
          navigate('/student-portal');
        } else if (role === 'teacher') {
          navigate('/teacher-portal');
        } else if (role === 'admin2') {
          navigate('/manager-portal');
        } else {
          navigate('/');
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Giriş yapılırken bir hata oluştu');
    }
    
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <img src="/unzile-logo.png" alt="ÜnzileArt Logo" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
          </div>
          <h1 className="login-title">ÜnzileArt Sanat Merkezi</h1>
          <p className="login-subtitle">Yönetim Paneline Hoş Geldiniz</p>
        </div>

      <form onSubmit={handleSubmit} className="login-form">
        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="phone" className="form-label">
            📱 Telefon Numarası
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="phone"
              type="tel"
              className="form-input"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="5XX-XXX-XXXX"
              required
              autoFocus
              style={{ paddingLeft: '45px' }}
            />
            <span style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-secondary)',
              fontSize: '14px',
              fontWeight: '500',
            }}>
              +90
            </span>
          </div>
          <small style={{ 
            display: 'block', 
            marginTop: '4px', 
            color: 'var(--text-secondary)', 
            fontSize: '12px' 
          }}>
            0 olmadan 10 haneli telefon numaranızı girin
          </small>
        </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Şifre
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        <div className="login-footer">
          <p className="text-sm text-secondary">
            Şifrenizi mi unuttunuz? Yöneticinizle iletişime geçin.
          </p>
        </div>
      </div>
    </div>
  );
}

