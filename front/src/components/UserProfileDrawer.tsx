import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, UserRole } from '../types';
import { Home, ActivityLog, UserCircle, LogOut, X, Shield, Clock } from 'lucide-react';

interface UserProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserProfileDrawer: React.FC<UserProfileDrawerProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const getRoleLabel = (role?: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN: return 'Super Admin';
      case UserRole.SUPERVISEUR_QUALITE: return 'Superviseur Qualité';
      case UserRole.AGENT_QUALITE: return 'Agent Qualité';
      default: return 'Utilisateur';
    }
  };

  const handleProfile = () => {
    onClose();
    navigate('/profile');
  };

  const handleLogout = () => {
    onClose();
    logout();
  };

  if (!user) return null;

  return (
    <>
      {isOpen && <div className="drawer-overlay" onClick={onClose} />}
      <div className={`user-drawer ${isOpen ? 'user-drawer-open' : ''}`}>
        <div className="drawer-close">
          <button className="drawer-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="drawer-profile-head">
          <div className="drawer-avatar-ring">
            {user.profileImage ? (
              <img src={`http://localhost:3000${user.profileImage}`} alt="" className="drawer-avatar-img" />
            ) : (
              <div className="drawer-avatar-text">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </div>
            )}
          </div>
          <div className="drawer-status-badge">
            <span className="drawer-status-dot" />
            EN LIGNE
          </div>
          <h3 className="drawer-user-name">{user.firstName} {user.lastName}</h3>
          <p className="drawer-user-email">{user.email}</p>
        </div>

        <div className="drawer-nav">
          <div className="drawer-nav-section">
            <span className="drawer-nav-label">ESPACE DE TRAVAIL</span>
            <button className="drawer-nav-item" onClick={() => { onClose(); navigate('/dashboard'); }}>
              <Home size={18} />
              <span>Accueil</span>
            </button>
          </div>

          <div className="drawer-nav-section">
            <span className="drawer-nav-label">JOURNAL</span>
            <button className="drawer-nav-item" onClick={() => { onClose(); navigate('/dashboard'); }}>
              <Clock size={18} />
              <span>Historique activité</span>
            </button>
          </div>

          <div className="drawer-nav-section">
            <span className="drawer-nav-label">COMPTE</span>
            <button className="drawer-nav-item" onClick={handleProfile}>
              <UserCircle size={18} />
              <span>Profil</span>
            </button>
          </div>
        </div>

        <div className="drawer-footer">
          <button className="drawer-logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default UserProfileDrawer;
