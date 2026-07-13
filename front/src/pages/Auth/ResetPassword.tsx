import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../../api';
import { toast } from 'react-hot-toast';
import { KeyRound, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';

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
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo success">
              <CheckCircle size={32} />
            </div>
            <h1>Mot de passe réinitialisé</h1>
            <p>Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
          </div>
          <button onClick={() => navigate('/login')} className="btn btn-primary btn-full">
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <KeyRound size={32} />
          </div>
          <h1>Nouveau mot de passe</h1>
          <p>Entrez votre nouveau mot de passe</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nouveau mot de passe</label>
            <div className="password-input">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 caractères"
                minLength={8}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label>Confirmer le mot de passe</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmez votre mot de passe"
              minLength={8}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Réinitialisation...' : 'Réinitialiser'}
          </button>
        </form>
        <div className="auth-links">
          <Link to="/login">
            <ArrowLeft size={16} /> Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
