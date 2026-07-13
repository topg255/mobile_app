import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../../api';
import { toast } from 'react-hot-toast';
import { Mail, ArrowLeft } from 'lucide-react';

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
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo success">
              <Mail size={32} />
            </div>
            <h1>Email envoyé</h1>
            <p>Vérifiez votre boîte de réception et cliquez sur le lien pour réinitialiser votre mot de passe.</p>
          </div>
          <Link to="/login" className="btn btn-secondary btn-full">
            <ArrowLeft size={18} /> Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <Mail size={32} />
          </div>
          <h1>Mot de passe oublié</h1>
          <p>Entrez votre email pour recevoir un lien de réinitialisation</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Envoi...' : 'Envoyer le lien'}
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

export default ForgotPassword;
