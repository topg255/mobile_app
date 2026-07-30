import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../../api';
import { toast } from 'react-hot-toast';
import { Mail, Lock, Eye, EyeOff, User, Hash, Briefcase, Camera, X, CheckCircle2, XCircle, Key } from 'lucide-react';

const Signup: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    matricule: '',
    email: '',
    password: '',
    confirmPassword: '',
    superviseurCode: '',
  });
  const [role, setRole] = useState<'agent' | 'superviseur'>('agent');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const navigate = useNavigate();

  const passwordRules = [
    { id: 'length', label: 'Au moins 6 caracteres', test: (p: string) => p.length >= 6 },
    { id: 'upper', label: 'Une lettre majuscule', test: (p: string) => /[A-Z]/.test(p) },
    { id: 'lower', label: 'Une lettre minuscule', test: (p: string) => /[a-z]/.test(p) },
    { id: 'number', label: 'Un chiffre', test: (p: string) => /[0-9]/.test(p) },
    { id: 'symbol', label: 'Un symbole (!@#$%^&*...)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  ];

  const passwordValid = passwordRules.every((r) => r.test(formData.password));
  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword.length > 0;
  const codeValid = role === 'superviseur' || /^SUPERV-QLT-[A-Z0-9]{5}$/.test(formData.superviseurCode);
  const canSubmit = passwordValid && passwordsMatch && codeValid && formData.firstName && formData.lastName && formData.matricule && formData.email;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      const { confirmPassword, ...submitData } = formData;
      const payload = { ...submitData, image: profileImage || undefined };
      if (role === 'agent') {
        const res = await authAPI.signupAgent(payload as any);
        toast.success(res.data.message, { duration: 6000 });
      } else {
        const res = await authAPI.signupSuperviseur(payload as any);
        toast.success(res.data.message, { duration: 8000 });
      }
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
          <div className="auth-5s-badge">
            <img src="/5s.jpeg" alt="5S" />
          </div>
          <h2>Rejoignez notre equipe</h2>
          <p>
            Creez votre compte et commencez a contribuer
            a l'amelioration continue de la qualite.
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
        <div className="auth-right">
          <h2>Creer un compte</h2>

          <div className="auth-role-pills">
            <button type="button" className={`auth-role-pill ${role === 'agent' ? 'active' : ''}`}
                    onClick={() => setRole('agent')}>
              <User size={15} /> Agent Qualite
            </button>
            <button type="button" className={`auth-role-pill ${role === 'superviseur' ? 'active' : ''}`}
                    onClick={() => setRole('superviseur')}>
              <Briefcase size={15} /> Superviseur
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="auth-signup-grid">
              {inputGroup(<User size={20} />,
                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange}
                       placeholder="Prenom" required />
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

            {/* Superviseur Code — Agent only */}
            {role === 'agent' && (
              <div className="auth-input-group">
                <div className="auth-input-icon"><Key size={20} /></div>
                <div className="auth-input-divider" />
                <input
                  type="text"
                  name="superviseurCode"
                  value={formData.superviseurCode}
                  onChange={handleChange}
                  placeholder="Code superviseur (SUPERV-QLT-XXXXX)"
                  required
                  style={{ textTransform: 'uppercase' }}
                  maxLength={16}
                />
                {formData.superviseurCode.length > 0 && (
                  <span className={codeValid ? 'pwd-match' : 'pwd-no-match'}>
                    {codeValid ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  </span>
                )}
              </div>
            )}
            {role === 'agent' && formData.superviseurCode.length > 0 && !codeValid && (
              <span className="pwd-match-text">Format requis : SUPERV-QLT-XXXXX (5 caracteres alphanumeriques)</span>
            )}

            <div className="auth-input-group auth-pwd-wrapper">
              <div className="auth-input-icon"><Lock size={20} /></div>
              <div className="auth-input-divider" />
              <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password}
                     onChange={handleChange} placeholder="Mot de passe" required />
              <button type="button" className="auth-pwd-toggle" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Password Rules */}
            {formData.password.length > 0 && (
              <div className="pwd-rules">
                {passwordRules.map((rule) => {
                  const passed = rule.test(formData.password);
                  return (
                    <div key={rule.id} className={`pwd-rule ${passed ? 'pwd-pass' : ''}`}>
                      <CheckCircle2 size={13} />
                      <span>{rule.label}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="auth-input-group">
              <div className="auth-input-icon"><Lock size={20} /></div>
              <div className="auth-input-divider" />
              <input type="password" name="confirmPassword" value={formData.confirmPassword}
                     onChange={handleChange} placeholder="Confirmer le mot de passe" required />
              {formData.confirmPassword.length > 0 && (
                <span className={passwordsMatch ? 'pwd-match' : 'pwd-no-match'}>
                  {passwordsMatch ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                </span>
              )}
            </div>
            {formData.confirmPassword.length > 0 && !passwordsMatch && (
              <span className="pwd-match-text">Les mots de passe ne correspondent pas</span>
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
                    <img src={imagePreview} alt="Apercu" />
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

            <button type="submit" className="auth-login-btn" disabled={loading || !canSubmit}
                    style={{ marginTop: '8px', opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
              {loading ? 'Inscription...' : `S'inscrire en tant que ${role === 'agent' ? 'Agent' : 'Superviseur'}`}
            </button>
          </form>

          <div className="auth-footer-text">
            Deja un compte? <Link to="/login">Se connecter</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
