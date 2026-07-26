import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../../api';
import { toast } from 'react-hot-toast';
import { Mail, CheckCircle } from 'lucide-react';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      setSent(true);
      toast.success('Email de réinitialisation envoyé');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-split">
        <div className="auth-green-blob" />
        <div style={{ position: 'absolute', top: '40px', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
          <img src="/leoni-logo.svg" alt="LEONI" style={{ height: '52px', objectFit: 'contain' }} />
        </div>
        <div className="auth-split-card">
          <div className="auth-left">
            <h2>Qualité Control</h2>
            <p>Réinitialisez votre mot de passe en toute sécurité.</p>
            <div className="auth-illustration">
              <svg viewBox="0 0 300 240" fill="none" xmlns="http://www.w3.org/2000/svg" width="280" height="220">
                <rect x="100" y="70" width="100" height="110" rx="8" stroke="#2563eb" strokeWidth="1.5" fill="none"/>
                <circle cx="150" cy="115" r="14" stroke="#2563eb" strokeWidth="1.5" fill="none"/>
                <path d="M150 129 L150 145" stroke="#2563eb" strokeWidth="2"/>
                <circle cx="150" cy="155" r="5" fill="#2563eb" opacity="0.3"/>
                <path d="M120 55 L150 40 L180 55" stroke="#94a3b8" strokeWidth="1.2" fill="none"/>
                <circle cx="80" cy="90" r="10" stroke="#22c55e" strokeWidth="1.5" fill="none"/>
                <path d="M76 90 L79 93 L85 86" stroke="#22c55e" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                <circle cx="220" cy="160" r="8" stroke="#94a3b8" strokeWidth="1.2" fill="none"/>
              </svg>
            </div>
            <div className="auth-dots">
              <div className="auth-dot" />
              <div className="auth-dot" />
              <div className="auth-dot active" />
            </div>
          </div>
          <div className="auth-right">
            <div className="auth-5s-badge">
              <img src="front/src/assets/5s.jpeg" alt="5S" />
            </div>
            <h2>Email Sent</h2>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div className="auth-success-circle">
                <CheckCircle size={36} />
              </div>
              <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>
                Un lien de réinitialisation a été envoyé à <strong style={{ color: '#1e293b' }}>{email}</strong>.
              </p>
            </div>
            <div className="auth-info-box">
              <p>Vous n'avez pas reçu l'email ? Vérifiez vos spams ou réessayez.</p>
            </div>
            <Link to="/login" className="auth-login-btn" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              textDecoration: 'none', marginTop: '24px', background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
              boxShadow: '0 4px 20px rgba(100, 116, 139, 0.3)'
            }}>
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-split">
      <div className="auth-green-blob" />
      <div style={{ position: 'absolute', top: '40px', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
        <img src="/leoni-logo.svg" alt="LEONI" style={{ height: '52px', objectFit: 'contain' }} />
      </div>
      <div className="auth-split-card">
        <div className="auth-left">
          <h2>Qualité Control</h2>
          <p>Entrez votre email pour recevoir un lien de réinitialisation de mot de passe.</p>
          <div className="auth-illustration">
            <svg viewBox="0 0 300 240" fill="none" xmlns="http://www.w3.org/2000/svg" width="280" height="220">
              <rect x="90" y="60" width="120" height="80" rx="6" stroke="#2563eb" strokeWidth="1.5" fill="none"/>
              <path d="M90 70 L150 110 L210 70" stroke="#2563eb" strokeWidth="1.5" fill="none"/>
              <circle cx="150" cy="160" r="20" stroke="#2563eb" strokeWidth="1.5" fill="none"/>
              <path d="M150 150 L150 160 L158 165" stroke="#2563eb" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              <circle cx="80" cy="120" r="10" stroke="#22c55e" strokeWidth="1.5" fill="none"/>
              <path d="M76 120 L79 123 L85 116" stroke="#22c55e" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              <circle cx="230" cy="100" r="8" stroke="#94a3b8" strokeWidth="1.2" fill="none"/>
              <circle cx="70" cy="180" r="5" stroke="#94a3b8" strokeWidth="1" fill="none"/>
            </svg>
          </div>
          <div className="auth-dots">
            <div className="auth-dot active" />
            <div className="auth-dot" />
            <div className="auth-dot" />
          </div>
        </div>
        <div className="auth-right">
          <div className="auth-5s-badge">
            <img src="/5s.jpeg" alt="5S" />
          </div>
          <h2>Forgot Password</h2>
          <form onSubmit={handleSubmit}>
            <div className="auth-input-group">
              <div className="auth-input-icon"><Mail size={20} /></div>
              <div className="auth-input-divider" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                     placeholder="Email" required />
            </div>
            <button type="submit" className="auth-login-btn" disabled={loading}>
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </button>
          </form>
          <div className="auth-footer-text">
            <Link to="/login" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
