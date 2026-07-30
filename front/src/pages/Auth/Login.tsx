import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

const REMEMBER_KEY = 'qualite_remember_identifier';

const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState(() => localStorage.getItem(REMEMBER_KEY) || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem(REMEMBER_KEY));
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(identifier, password);
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, identifier);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      toast.success('Connexion réussie');
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Erreur de connexion';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split">
      <div className="auth-green-blob" />

      {/* Logo above card */}
      <div className="auth-logo-wrap" style={{
        position: 'absolute',
        top: '40px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
      }}>
        <img src="/leoni-logo.svg" alt="LEONI" style={{ height: '52px', objectFit: 'contain' }} />
      </div>

      <div className="auth-split-card">
        {/* Left panel */}
        <div className="auth-left">
          <div className="auth-5s-badge">
            <img src="/5s.jpeg" alt="5S" />
          </div>
          <h2>Contrôle Qualité</h2>
          <p>
            Suivez et améliorez la qualité de vos lignes de production
            avec notre système de contrôle intelligent.
          </p>

          <div className="auth-illustration">
            <svg viewBox="0 0 300 240" fill="none" xmlns="http://www.w3.org/2000/svg" width="280" height="220">
              <path d="M150 40 L200 65 L200 120 C200 155 175 185 150 195 C125 185 100 155 100 120 L100 65 Z"
                    stroke="#2563eb" strokeWidth="2" fill="none" opacity="0.3"/>
              <path d="M150 55 L185 73 L185 115 C185 142 168 165 150 173 C132 165 115 142 115 115 L115 73 Z"
                    stroke="#2563eb" strokeWidth="1.5" fill="none" opacity="0.2"/>
              <circle cx="150" cy="100" r="18" stroke="#64748b" strokeWidth="1.5" fill="none"/>
              <path d="M130 135 C130 120 170 120 170 135" stroke="#64748b" strokeWidth="1.5" fill="none"/>
              <rect x="85" y="140" width="16" height="20" rx="3" stroke="#2563eb" strokeWidth="1.2" fill="none"/>
              <path d="M89 140 L89 135 C89 131 93 128 97 131 L97 135" stroke="#2563eb" strokeWidth="1.2" fill="none"/>
              <rect x="199" y="140" width="16" height="20" rx="3" stroke="#2563eb" strokeWidth="1.2" fill="none"/>
              <path d="M203 140 L203 135 C203 131 207 128 211 131 L211 135" stroke="#2563eb" strokeWidth="1.2" fill="none"/>
              <circle cx="75" cy="90" r="12" stroke="#94a3b8" strokeWidth="1.2" fill="none"/>
              <circle cx="75" cy="90" r="5" stroke="#94a3b8" strokeWidth="1" fill="none"/>
              <circle cx="225" cy="95" r="14" stroke="#22c55e" strokeWidth="1.5" fill="none"/>
              <path d="M218 95 L223 100 L232 90" stroke="#22c55e" strokeWidth="2" fill="none" strokeLinecap="round"/>
              <circle cx="105" cy="70" r="8" stroke="#2563eb" strokeWidth="1.2" fill="none"/>
              <line x1="113" y1="70" x2="130" y2="70" stroke="#2563eb" strokeWidth="1.2"/>
              <line x1="125" y1="70" x2="125" y2="76" stroke="#2563eb" strokeWidth="1.2"/>
              <line x1="120" y1="70" x2="120" y2="74" stroke="#2563eb" strokeWidth="1.2"/>
              <circle cx="195" cy="70" r="10" stroke="#94a3b8" strokeWidth="1.2" fill="none"/>
              <ellipse cx="195" cy="70" rx="5" ry="10" stroke="#94a3b8" strokeWidth="0.8" fill="none"/>
              <line x1="185" y1="70" x2="205" y2="70" stroke="#94a3b8" strokeWidth="0.8"/>
              <circle cx="130" cy="55" r="2" fill="#2563eb" opacity="0.4"/>
              <circle cx="170" cy="50" r="2" fill="#2563eb" opacity="0.4"/>
              <circle cx="215" cy="120" r="2" fill="#2563eb" opacity="0.3"/>
              <circle cx="85" cy="125" r="2" fill="#2563eb" opacity="0.3"/>
              <circle cx="150" cy="185" r="2" fill="#2563eb" opacity="0.3"/>
              <line x1="95" y1="55" x2="100" y2="60" stroke="#2563eb" strokeWidth="1" opacity="0.3"/>
              <line x1="100" y1="55" x2="95" y2="60" stroke="#2563eb" strokeWidth="1" opacity="0.3"/>
              <line x1="200" y1="165" x2="205" y2="170" stroke="#2563eb" strokeWidth="1" opacity="0.3"/>
              <line x1="205" y1="165" x2="200" y2="170" stroke="#2563eb" strokeWidth="1" opacity="0.3"/>
            </svg>
          </div>

          <div className="auth-dots">
            <div className="auth-dot" />
            <div className="auth-dot active" />
            <div className="auth-dot" />
          </div>
        </div>

        {/* Right panel — form */}
        <div className="auth-right">
          <h2>Connexion</h2>

          <form onSubmit={handleSubmit}>
            <div className="auth-input-group">
              <div className="auth-input-icon">
                <Mail size={20} />
              </div>
              <div className="auth-input-divider" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Email ou matricule"
                required
              />
            </div>

            <div className="auth-input-group auth-pwd-wrapper">
              <div className="auth-input-icon">
                <Lock size={20} />
              </div>
              <div className="auth-input-divider" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                required
              />
              <button type="button" className="auth-pwd-toggle" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="auth-checkbox-row">
              <label className="auth-checkbox-label">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} /> Se souvenir de moi
              </label>
              <Link to="/forgot-password" className="auth-forgot-link">
                Mot de passe oublié ?
              </Link>
            </div>

            <button type="submit" className="auth-login-btn" disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <div className="auth-footer-text">
            Pas encore de compte ? <Link to="/signup">Créer un compte</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
