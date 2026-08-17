import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI, signaturePadAPI } from '../../api';
import { User, UserRole, SuperviseurSignature } from '../../types';
import { toast } from 'react-hot-toast';
import { copyToClipboard } from '../../utils/clipboard';
import {
  ArrowLeft,
  Mail,
  Shield,
  Calendar,
  Hash,
  Camera,
  Save,
  Trash2,
  UserCircle,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Key,
  Copy,
  PenLine,
  ChevronRight,
} from 'lucide-react';

const ProfileSignatureCard: React.FC = () => {
  const navigate = useNavigate();
  const [signature, setSignature] = useState<SuperviseurSignature | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    signaturePadAPI
      .getMine()
      .then(({ data }) => {
        if (!cancelled) setSignature(data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!checked) {
    return null;
  }

  return (
    <div
      className="profile-info-card"
      style={{
        gridColumn: 'span 3',
        cursor: 'pointer',
        alignItems: 'center',
      }}
      onClick={() => navigate('/signature')}
      role="button"
    >
      <div className="profile-info-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
        <PenLine size={18} />
      </div>
      <div className="profile-info-card-body" style={{ flex: 1 }}>
        <span className="profile-info-card-label">SIGNATURE NUMERIQUE</span>
        <span className="profile-info-card-title" style={{ fontSize: 15 }}>
          {signature ? 'Signature enregistree' : 'Aucune signature'}
        </span>
        <span className="profile-info-card-sub">
          {signature
            ? 'Apposee automatiquement sur vos rapports PDF et e-mails'
            : "Signaturez pour apposer votre signature sur vos rapports qualite"}
        </span>
      </div>
      {signature ? (
        <img
          src={`data:image/png;base64,${signature.enhancedImageBase64 ?? signature.originalImageBase64}`}
          alt="Signature"
          style={{
            height: 44,
            maxWidth: 110,
            objectFit: 'contain',
            background: '#ffffff',
            borderRadius: 6,
            padding: 4,
            border: '1px solid #e2e8f0',
          }}
        />
      ) : (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#2563eb' }}>
          Creer <ChevronRight size={16} />
        </span>
      )}
    </div>
  );
};

const ProfilePage: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'general' | 'security'>('general');
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshUser();
  }, []);

  const getRoleLabel = (role?: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN: return 'Super Admin';
      case UserRole.SUPERVISEUR_QUALITE: return 'Superviseur Qualite';
      case UserRole.AGENT_QUALITE: return 'Agent Qualite';
      default: return 'Utilisateur';
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await authAPI.uploadProfileImage(file);
      toast.success('Photo de profil mise a jour');
      const res = await authAPI.getProfile();
      localStorage.setItem('user', JSON.stringify(res.data));
      window.location.reload();
    } catch {
      toast.error('Erreur lors de l\'upload');
    }
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await authAPI.updateProfile({ firstName, lastName, email });
      toast.success('Profil mis a jour avec succes');
      await refreshUser();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erreur lors de la mise a jour');
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Le nouveau mot de passe doit contenir au moins 6 caracteres');
      return;
    }
    setChangingPassword(true);
    try {
      await authAPI.changePassword({ currentPassword, newPassword });
      toast.success('Mot de passe change avec succes');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erreur lors du changement de mot de passe');
    }
    setChangingPassword(false);
  };

  const copyCode = async () => {
    if (user?.superviseurCode) {
      const ok = await copyToClipboard(user.superviseurCode);
      toast.success(ok ? 'Code copie dans le presse-papier' : 'Erreur de copie');
    }
  };

  if (!user) return null;

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Header */}
        <div className="profile-header">
          <button className="profile-back-btn" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} />
          </button>
          <div className="profile-header-content">
            <div className="profile-avatar-section">
              <div className="profile-avatar-large">
                {user.profileImage ? (
                  <img src={`http://localhost:3000${user.profileImage}`} alt="" />
                ) : (
                  <span>{user.firstName?.[0]}{user.lastName?.[0]}</span>
                )}
                <button className="profile-avatar-edit" onClick={() => fileRef.current?.click()}>
                  <Camera size={16} />
                </button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleUploadPhoto} />
              </div>
              <div className="profile-header-info">
                <span className="profile-role-badge">
                  <Shield size={12} /> {getRoleLabel(user.role)}
                </span>
                <h1 className="profile-name">{user.firstName} {user.lastName}</h1>
                <p className="profile-desc">Gerez vos informations personnelles et vos preferences de securite.</p>
                <div className="profile-email-row">
                  <Mail size={14} />
                  <span>{user.email}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="profile-info-cards">
          <div className="profile-info-card">
            <div className="profile-info-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
              <Shield size={18} />
            </div>
            <div className="profile-info-card-body">
              <span className="profile-info-card-label">ORGANISATION</span>
              <span className="profile-info-card-title">LEONI</span>
              <span className="profile-info-card-sub">Votre entreprise actuelle</span>
            </div>
          </div>
          <div className="profile-info-card">
            <div className="profile-info-card-icon" style={{ background: '#fefce8', color: '#ca8a04' }}>
              <Hash size={18} />
            </div>
            <div className="profile-info-card-body">
              <span className="profile-info-card-label">MATRICULE</span>
              <span className="profile-info-card-title">{user.matricule}</span>
              <span className="profile-info-card-sub">Identifiant unique</span>
            </div>
          </div>
          <div className="profile-info-card">
            <div className="profile-info-card-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
              <CheckCircle2 size={18} />
            </div>
            <div className="profile-info-card-body">
              <span className="profile-info-card-label">ACCES</span>
              <span className="profile-info-card-title">{getRoleLabel(user.role)}</span>
              <span className="profile-info-card-status">
                <span className="profile-status-dot" /> Actif
              </span>
            </div>
          </div>

          {(user.role === UserRole.SUPERVISEUR_QUALITE ||
            user.role === UserRole.SUPER_ADMIN) && <ProfileSignatureCard />}

          {/* Superviseur Code Card */}
          {user.role === UserRole.SUPERVISEUR_QUALITE && user.superviseurCode && (
            <div className="profile-info-card" style={{ gridColumn: 'span 3' }}>
              <div className="profile-info-card-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                <Key size={18} />
              </div>
              <div className="profile-info-card-body" style={{ flex: 1 }}>
                <span className="profile-info-card-label">CODE SUPERVISEUR</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                  <span className="profile-info-card-title" style={{ fontFamily: 'monospace', fontSize: 20, letterSpacing: 2 }}>
                    {user.superviseurCode}
                  </span>
                  <button
                    onClick={copyCode}
                    style={{
                      background: '#f5f3ff',
                      border: '1px solid #ddd6fe',
                      borderRadius: 8,
                      padding: '6px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      color: '#7c3aed',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <Copy size={14} /> Copier
                  </button>
                </div>
                <span className="profile-info-card-sub">Partagez ce code avec vos agents pour qu'ils puissent s'inscrire dans votre equipe</span>
              </div>
            </div>
          )}

          {/* Agent Superviseur Info */}
          {user.role === UserRole.AGENT_QUALITE && user.superviseur && (
            <div className="profile-info-card" style={{ gridColumn: 'span 3' }}>
              <div className="profile-info-card-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                <Key size={18} />
              </div>
              <div className="profile-info-card-body">
                <span className="profile-info-card-label">SUPERVISEUR</span>
                <span className="profile-info-card-title">{user.superviseur.firstName} {user.superviseur.lastName}</span>
                <span className="profile-info-card-sub">
                  {user.isApprovedBySuperviseur ? 'Approuve par votre superviseur' : 'En attente d\'approbation par votre superviseur'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="profile-tabs">
          <button
            className={`profile-tab ${activeTab === 'general' ? 'profile-tab-active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            <UserCircle size={16} /> General
          </button>
          <button
            className={`profile-tab ${activeTab === 'security' ? 'profile-tab-active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <Lock size={16} /> Securite
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'general' && (
          <div className="profile-form-card">
            <div className="profile-form-header">
              <div className="profile-form-icon">
                <UserCircle size={20} />
              </div>
              <div>
                <h3 className="profile-form-title">Modifier le profil</h3>
                <p className="profile-form-sub">Mettez a jour vos informations personnelles.</p>
              </div>
              <div className="profile-auto-saved">
                <span className="profile-auto-dot" /> Auto-saved
              </div>
            </div>
            <div className="profile-form-grid">
              <div className="profile-field">
                <label className="profile-field-label">Prenom</label>
                <input
                  type="text"
                  className="profile-input"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="profile-field">
                <label className="profile-field-label">Nom</label>
                <input
                  type="text"
                  className="profile-input"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <div className="profile-field">
                <label className="profile-field-label">Email</label>
                <input
                  type="email"
                  className="profile-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="profile-field">
                <label className="profile-field-label">Matricule</label>
                <input
                  type="text"
                  className="profile-input profile-input-disabled"
                  value={user.matricule}
                  disabled
                />
              </div>
            </div>
            <div className="profile-form-actions">
              <button className="profile-save-btn" onClick={handleSave} disabled={saving}>
                <Save size={16} />
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="profile-form-card">
            <div className="profile-form-header">
              <div className="profile-form-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>
                <Lock size={20} />
              </div>
              <div>
                <h3 className="profile-form-title">Securite du compte</h3>
                <p className="profile-form-sub">Gerez votre mot de passe et vos parametres de securite.</p>
              </div>
            </div>
            <div className="profile-form-grid">
              <div className="profile-field">
                <label className="profile-field-label">Mot de passe actuel</label>
                <input
                  type="password"
                  className="profile-input"
                  placeholder="********"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="profile-field">
                <label className="profile-field-label">Nouveau mot de passe</label>
                <input
                  type="password"
                  className="profile-input"
                  placeholder="********"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="profile-field">
                <label className="profile-field-label">Confirmer le mot de passe</label>
                <input
                  type="password"
                  className="profile-input"
                  placeholder="********"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
            <div className="profile-form-actions">
              <button className="profile-save-btn" onClick={handleChangePassword} disabled={changingPassword}>
                <Lock size={16} />
                {changingPassword ? 'Changement en cours...' : 'Changer le mot de passe'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
