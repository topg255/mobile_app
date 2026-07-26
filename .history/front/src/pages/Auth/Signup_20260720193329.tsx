import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../../api';
import { toast } from 'react-hot-toast';
import { Mail, Lock, Eye, EyeOff, User, Hash, Briefcase, Camera, X } from 'lucide-react';

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
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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
      const payload = { ...submitData, image: profileImage || undefined };
      if (role === 'agent') {
        await authAPI.signupAgent(payload);
      } else {
        await authAPI.signupSuperviseur(payload);
      }
      toast.success('Inscription réussie');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erreur d'inscription");
    } finally {
      setLoading(false);
    }
  };

  const inputGroup = (icon: React.ReactNode, children: React.ReactNode) => (
    <div className="auth-input-group">
      <div className="auth-input-icon">{icon}</div>
      <div className="auth-input-divider" />
      {children}
    </div>
  );

  return (
    <div className="auth-split">
      <div className="auth-green-blob" />

      {/* Logo above card */}
      <div style={{
        position: 'absolute',
        top: '40px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
      }}>
        <img src="/leoni-logo.svg" alt="LEONI" style={{ height: '52px', objectFit: 'contain' }} />
      </div>

      <div className="auth-split-card" style={{ maxWidth: '1060px' }}>
        {/* Left panel */}
        <div className="auth-left">
          <h2>Join Our Team</h2>
          <p>
            Créez votre compte et commencez à contribuer
            à l'amélioration continue de la qualité.
          </p>

          <div className="auth-illustration">
            <svg viewBox="0 0 300 240" fill="none" xmlns="http://www.w3.org/2000/svg" width="280" height="220">
              <circle cx="150" cy="90" r="22" stroke="#2563eb" strokeWidth="1.5" fill="none"/>
              <path d="M120 140 C120 118 180 118 180 140" stroke="#2563eb" strokeWidth="1.5" fill="none"/>
              <circle cx="150" cy="90" r="30" stroke="#2563eb" strokeWidth="1" fill="none" opacity="0.2" strokeDasharray="4 4"/>
              <rect x="200" y="60" width="50" height="40" rx="6" stroke="#64748b" strokeWidth="1.2" fill="none"/>
              <line x1="210" y1="72" x2="240" y2="72" stroke="#64748b" strokeWidth="1"/>
              <line x1="210" y1="80" x2="235" y2="80" stroke="#64748b" strokeWidth="1"/>
              <line x1="210" y1="88" x2="230" y2="88" stroke="#64748b" strokeWidth="1"/>
              <rect x="50" y="60" width="50" height="40" rx="6" stroke="#64748b" strokeWidth="1.2" fill="none"/>
              <line x1="60" y1="72" x2="90" y2="72" stroke="#64748b" strokeWidth="1"/>
              <line x1="60" y1="80" x2="85" y2="80" stroke="#64748b" strokeWidth="1"/>
              <line x1="60" y1="88" x2="80" y2="88" stroke="#64748b" strokeWidth="1"/>
              <circle cx="80" cy="170" r="16" stroke="#22c55e" strokeWidth="1.5" fill="none"/>
              <path d="M73 170 L78 175 L88 163" stroke="#22c55e" strokeWidth="2" fill="none" strokeLinecap="round"/>
              <circle cx="220" cy="170" r="16" stroke="#2563eb" strokeWidth="1.5" fill="none"/>
              <path d="M220 162 L220 178 M212 170 L228 170" stroke="#2563eb" strokeWidth="2" fill="none" strokeLinecap="round"/>
              <path d="M130 180 L150 195 L170 180" stroke="#94a3b8" strokeWidth="1.2" fill="none"/>
              <circle cx="110" cy="55" r="2.5" fill="#2563eb" opacity="0.4"/>
              <circle cx="190" cy="50" r="2.5" fill="#2563eb" opacity="0.4"/>
              <circle cx="250" cy="130" r="2" fill="#2563eb" opacity="0.3"/>
              <circle cx="60" cy="130" r="2" fill="#2563eb" opacity="0.3"/>
            </svg>
          </div>

          <div className="auth-dots">
            <div className="auth-dot active" />
            <div className="auth-dot" />
            <div className="auth-dot" />
          </div>
        </div>

        {/* Right panel — form */}
        <div className="auth-right" style={{ width: '460px' }}>
          <div className="auth-5s-badge">
            <img src="/5s-circle.png" alt="5S" />
          </div>
          <h2>Create Account</h2>

          <div className="auth-role-pills">
            <button type="button" className={`auth-role-pill ${role === 'agent' ? 'active' : ''}`}
                    onClick={() => setRole('agent')}>
              <User size={15} /> Agent Qualité
            </button>
            <button type="button" className={`auth-role-pill ${role === 'superviseur' ? 'active' : ''}`}
                    onClick={() => setRole('superviseur')}>
              <Briefcase size={15} /> Superviseur
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              {inputGroup(<User size={20} />,
                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange}
                       placeholder="Prénom" required />
              )}
              {inputGroup(<User size={20} />,
                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange}
                       placeholder="Nom" required />
              )}
            </div>

            {inputGroup(<Hash size={20} />,
              <input type="text" name="matricule" value={formData.matricule} onChange={handleChange}
                     placeholder="Matricule" required />
            )}

            {inputGroup(<Mail size={20} />,
              <input type="email" name="email" value={formData.email} onChange={handleChange}
                     placeholder="Email" required />
            )}

            <div className="auth-input-group auth-pwd-wrapper">
              <div className="auth-input-icon"><Lock size={20} /></div>
              <div className="auth-input-divider" />
              <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password}
                     onChange={handleChange} placeholder="Mot de passe" minLength={8} required />
              <button type="button" className="auth-pwd-toggle" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {inputGroup(<Lock size={20} />,
              <input type="password" name="confirmPassword" value={formData.confirmPassword}
                     onChange={handleChange} placeholder="Confirmer le mot de passe" minLength={8} required />
            )}

            <div className="auth-profile-photo-section">
              <label className="auth-profile-photo-label">Photo de profil</label>
              <div className="auth-profile-photo-wrapper">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setProfileImage(file);
                      setImagePreview(URL.createObjectURL(file));
                    }
                  }}
                  id="profile-image"
                  style={{ display: 'none' }}
                />
                <label htmlFor="profile-image" className="auth-profile-photo-circle">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Aperçu" />
                  ) : (
                    <Camera size={24} />
                  )}
                  <div className="auth-profile-photo-overlay">
                    <Camera size={14} />
                    <span>Modifier</span>
                  </div>
                </label>
                {profileImage && (
                  <button type="button" className="auth-profile-photo-remove" onClick={() => { setProfileImage(null); setImagePreview(null); }}>
                    <X size={14} />
                  </button>
                )}
                <span className="auth-profile-photo-hint">JPG, PNG — Max 5 Mo</span>
              </div>
            </div>

            <button type="submit" className="auth-login-btn" disabled={loading}
                    style={{ marginTop: '8px' }}>
              {loading ? 'Inscription...' : `S'inscrire en tant que ${role === 'agent' ? 'Agent' : 'Superviseur'}`}
            </button>
          </form>

          <div className="auth-footer-text">
            Déjà un compte? <Link to="/login">Se connecter</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
