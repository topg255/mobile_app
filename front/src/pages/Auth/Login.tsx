import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { LogIn, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userData = await login(identifier, password);
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
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <LogIn size={32} />
          </div>
          <h1>Connexion</h1>
          <p>Accédez à votre espace qualité</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Matricule ou Email</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Entrez votre matricule ou email"
              required
            />
          </div>
          <div className="form-group">
            <label>Mot de passe</label>
            <div className="password-input">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Entrez votre mot de passe"
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
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        <div className="auth-links">
          <Link to="/forgot-password">Mot de passe oublié ?</Link>
          <Link to="/signup">Créer un compte</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
