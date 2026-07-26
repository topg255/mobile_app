import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../../api';
import { toast } from 'react-hot-toast';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    setLoading(true);
    try {
      await authAPI.resetPassword({ token, newPassword });
      setSuccess(true);
      toast.success('Mot de passe réinitialisé');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-split">
        <div className="auth-green-blob" />
        <div style={{ position: 'absolute', top: '40px', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
          <img src="/leoni-logo.svg" alt="LEONI" style={{ height: '52px', objectFit: 'contain' }} />
        </div>
        <div className="auth-split-card">
          <div className="auth-left">
            <h2>Qualité Control</h2>
            <p>Votre mot de passe a été modifié avec succès.</p>
            <div className="auth-illustration">
              <svg viewBox="0 0 300 240" fill="none" xmlns="http://www.w3.org/2000/svg" width="280" height="220">
                <circle cx="150" cy="110" r="40" stroke="#22c55e" strokeWidth="2" fill="none"/>
                <path d="M132 110 L145 123 L170 95" stroke="#22c55e" strokeWidth="3" fill="none" strokeLinecap="round"/>
                <circle cx="150" cy="110" r="50" stroke="#22c55e" strokeWidth="1" fill="none" opacity="0.2" strokeDasharray="4 4"/>
                <circle cx="80" cy="70" r="8" stroke="#2563eb" strokeWidth="1.2" fill="none"/>
                <circle cx="220" cy="150" r="6" stroke="#94a3b8" strokeWidth="1" fill="none"/>
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
              <img src="/5s.jpeg" alt="5S" />
            </div>
            <h2>Password Reset</h2>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div className="auth-success-circle">
                <CheckCircle size={36} />
              </div>
              <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.7' }}>
                Votre mot de passe a été réinitialisé avec succès.
              </p>
            </div>
            <button onClick={() => navigate('/login')} className="auth-login-btn">
              Se connecter
            </button>
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
          <p>Choisissez un nouveau mot de passe sécurisé pour votre compte.</p>
          <div className="auth-illustration">
            <svg viewBox="0 0 300 240" fill="none" xmlns="http://www.w3.org/2000/svg" width="280" height="220">
              <rect x="110" y="70" width="80" height="100" rx="8" stroke="#2563eb" strokeWidth="1.5" fill="none"/>
              <circle cx="150" cy="110" r="14" stroke="#2563eb" strokeWidth="1.5" fill="none"/>
              <path d="M150 124 L150 145" stroke="#2563eb" strokeWidth="2"/>
              <circle cx="150" cy="155" r="4" fill="#2563eb" opacity="0.4"/>
              <circle cx="80" cy="100" r="12" stroke="#22c55e" strokeWidth="1.5" fill="none"/>
              <path d="M76 100 L79 103 L85 96" stroke="#22c55e" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              <circle cx="220" cy="130" r="8" stroke="#94a3b8" strokeWidth="1.2" fill="none"/>
              <rect x="200" y="60" width="40" height="30" rx="4" stroke="#94a3b8" strokeWidth="1" fill="none"/>
              <line x1="208" y1="70" x2="232" y2="70" stroke="#94a3b8" strokeWidth="0.8"/>
              <line x1="208" y1="76" x2="228" y2="76" stroke="#94a3b8" strokeWidth="0.8"/>
              <line x1="208" y1="82" x2="224" y2="82" stroke="#94a3b8" strokeWidth="0.8"/>
            </svg>
          </div>
          <div className="auth-dots">
            <div className="auth-dot" />
            <div className="auth-dot active" />
            <div className="auth-dot" />
          </div>
        </div>
        <div className="auth-right">
          <div className="auth-5s-badge">
            <img src="/5s.jpeg" alt="5S" />
          </div>
          <h2>New Password</h2>
          <form onSubmit={handleSubmit}>
            <div className="auth-input-group auth-pwd-wrapper">
              <div className="auth-input-icon"><Lock size={20} /></div>
              <div className="auth-input-divider" />
              <input type={showPassword ? 'text' : 'password'} value={newPassword}
                     onChange={(e) => setNewPassword(e.target.value)} placeholder="Nouveau mot de passe"
                     minLength={8} required />
              <button type="button" className="auth-pwd-toggle" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="auth-input-group">
              <div className="auth-input-icon"><Lock size={20} /></div>
              <div className="auth-input-divider" />
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                     placeholder="Confirmer le mot de passe" minLength={8} required />
            </div>

            <button type="submit" className="auth-login-btn" disabled={loading}>
              {loading ? 'Réinitialisation...' : 'Réinitialiser'}
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

export default ResetPassword;
