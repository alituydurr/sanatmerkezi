import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import './Login.css';

export default function ActivateAccount() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validatePassword = (pwd) => {
    const validationErrors = [];
    
    if (pwd.length < 8) {
      validationErrors.push('Şifre en az 8 karakter olmalıdır');
    }
    if (!/[A-Z]/.test(pwd)) {
      validationErrors.push('Şifre en az bir büyük harf içermelidir');
    }
    if (!/[a-z]/.test(pwd)) {
      validationErrors.push('Şifre en az bir küçük harf içermelidir');
    }
    if (!/\d/.test(pwd)) {
      validationErrors.push('Şifre en az bir rakam içermelidir');
    }
    
    return validationErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrors([]);

    // Şifre eşleşme kontrolü
    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor');
      return;
    }

    // Şifre validasyonu
    const validationErrors = validatePassword(password);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      await authAPI.activateAccount(token, password);
      setSuccess(true);
      
      // 2 saniye sonra login sayfasına yönlendir
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Hesap aktifleştirilemedi. Link geçersiz veya süresi dolmuş olabilir.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
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
              <div style={{ fontSize: '64px' }}>✅</div>
            </div>
            <h1 className="login-title">Hesap Aktifleştirildi!</h1>
            <p className="login-subtitle">Şifreniz başarıyla oluşturuldu. Giriş sayfasına yönlendiriliyorsunuz...</p>
          </div>
        </div>
      </div>
    );
  }

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
          <h1 className="login-title">Hesap Aktivasyonu</h1>
          <p className="login-subtitle">Şifrenizi oluşturun</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          {errors.length > 0 && (
            <div className="alert alert-error">
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Yeni Şifre
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoFocus
            />
            <small style={{ 
              display: 'block', 
              marginTop: '4px', 
              color: 'var(--text-secondary)', 
              fontSize: '12px' 
            }}>
              En az 8 karakter, büyük/küçük harf ve rakam içermelidir
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Şifre Tekrar
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? 'Hesap aktifleştiriliyor...' : 'Hesabı Aktifleştir'}
          </button>
        </form>

        <div className="login-footer">
          <p className="text-sm text-secondary">
            Zaten hesabınız var mı? <a href="/login" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Giriş Yap</a>
          </p>
        </div>
      </div>
    </div>
  );
}
