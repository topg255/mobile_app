import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../../api';
import { toast } from 'react-hot-toast';
import { UserPlus, Eye, EyeOff } from 'lucide-react';

const Signup: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    matricule: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [role, setRole] = useState<'agent' | 'superviseur'>('agent');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    setLoading(true);
    try {
      const { confirmPassword, ...submitData } = formData;
      if (role === 'agent') {
        await authAPI.signupAgent(submitData);
      } else {
        await authAPI.signupSuperviseur(submitData);
      }
      toast.success('Inscription réussie');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur d\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <UserPlus size={32} />
          </div>
          <h1>Inscription</h1>
          <p>Créez votre compte qualité</p>
        </div>
        <div className="role-selector">
          <button
            type="button"
            className={`role-btn ${role === 'agent' ? 'active' : ''}`}
            onClick={() => setRole('agent')}
          >
            Agent Qualité
          </button>
          <button
            type="button"
            className={`role-btn ${role === 'superviseur' ? 'active' : ''}`}
            onClick={() => setRole('superviseur')}
          >
            Superviseur Qualité
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Prénom</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Prénom"
                required
              />
            </div>
            <div className="form-group">
              <label>Nom</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Nom"
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label>Matricule</label>
            <input
              type="text"
              name="matricule"
              value={formData.matricule}
              onChange={handleChange}
              placeholder="Ex: AGT-2024-001"
              required
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="votre@email.com"
              required
            />
          </div>
          <div className="form-group">
            <label>Mot de passe</label>
            <div className="password-input">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
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
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirmez votre mot de passe"
              minLength={8}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Inscription...' : `S'inscrire en tant que ${role === 'agent' ? 'Agent' : 'Superviseur'}`}
          </button>
        </form>
        <div className="auth-links">
          <Link to="/login">Déjà un compte ? Se connecter</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
