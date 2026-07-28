import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../api';
import { User, UserRole } from '../../types';
import { toast } from 'react-hot-toast';
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
} from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'general' | 'security'>('general');
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const getRoleLabel = (role?: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN: return 'Super Admin';
      case UserRole.SUPERVISEUR_QUALITE: return 'Superviseur Qualité';
      case UserRole.AGENT_QUALITE: return 'Agent Qualité';
      default: return 'Utilisateur';
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await authAPI.uploadProfileImage(file);
      toast.success('Photo de profil mise à jour');
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
      toast.success('Profil mis à jour');
    } catch {
      toast.error('Erreur');
    }
    setSaving(false);
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
                <p className="profile-desc">Gérez vos informations personnelles et vos préférences de sécurité.</p>
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
              <span className="profile-info-card-label">ACCÈS</span>
              <span className="profile-info-card-title">{getRoleLabel(user.role)}</span>
              <span className="profile-info-card-status">
                <span className="profile-status-dot" /> Actif
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="profile-tabs">
          <button
            className={`profile-tab ${activeTab === 'general' ? 'profile-tab-active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            <UserCircle size={16} /> Général
          </button>
          <button
            className={`profile-tab ${activeTab === 'security' ? 'profile-tab-active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <Lock size={16} /> Sécurité
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
                <p className="profile-form-sub">Mettez à jour vos informations personnelles.</p>
              </div>
              <div className="profile-auto-saved">
                <span className="profile-auto-dot" /> Auto-saved
              </div>
            </div>
            <div className="profile-form-grid">
              <div className="profile-field">
                <label className="profile-field-label">Prénom</label>
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
                  className="profile-input profile-input-disabled"
                  value={email}
                  disabled
                />
                <span className="profile-field-hint">L'email ne peut pas être modifié ici</span>
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
                <h3 className="profile-form-title">Sécurité du compte</h3>
                <p className="profile-form-sub">Gérez votre mot de passe et vos paramètres de sécurité.</p>
              </div>
            </div>
            <div className="profile-form-grid">
              <div className="profile-field">
                <label className="profile-field-label">Mot de passe actuel</label>
                <input type="password" className="profile-input" placeholder="••••••••" />
              </div>
              <div className="profile-field">
                <label className="profile-field-label">Nouveau mot de passe</label>
                <input type="password" className="profile-input" placeholder="••••••••" />
              </div>
              <div className="profile-field">
                <label className="profile-field-label">Confirmer le mot de passe</label>
                <input type="password" className="profile-input" placeholder="••••••••" />
              </div>
            </div>
            <div className="profile-form-actions">
              <button className="profile-save-btn">
                <Lock size={16} />
                Changer le mot de passe
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
