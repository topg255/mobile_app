import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { superAdminAPI } from '../../api';
import { User, LoginLog, SuperAdminStats } from '../../types';
import { toast } from 'react-hot-toast';
import NotificationBell from '../../components/NotificationBell';
import UserProfileDrawer from '../../components/UserProfileDrawer';
import CopilotButton from '../../components/Copilot/CopilotButton';
import QualityObjectivesTab from '../QualityObjectives/QualityObjectivesTab';
import PushSettings from '../../components/PushSettings';
import {
  Shield,
  Users,
  UserCheck,
  UserX,
  Clock,
  BarChart3,
  LogOut,
  Check,
  X,
  Trash2,
  Eye,
  Activity,
  LayoutDashboard,
  UserPlus,
  FileText,
  History,
  Menu,
  TrendingUp,
  TrendingDown,
  Zap,
  Layers,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  BarChart2,
  Target,
  Bell,
  Calendar,
} from 'lucide-react';

const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await superAdminAPI.getStats();
      setStats(response.data);
    } catch (err) {
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await superAdminAPI.getAllUsers();
      setUsers(response.data);
    } catch (err) {
      toast.error('Erreur');
    }
  };

  const fetchPendingUsers = async () => {
    try {
      const response = await superAdminAPI.getPendingUsers();
      setPendingUsers(response.data);
    } catch (err) {
      toast.error('Erreur');
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await superAdminAPI.getAllLoginLogs();
      setLogs(response.data.logs);
    } catch (err) {
      toast.error('Erreur');
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      await superAdminAPI.approveUser(userId);
      toast.success('Utilisateur approuvé');
      fetchPendingUsers();
      fetchUsers();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const handleDisapprove = async (userId: string) => {
    try {
      await superAdminAPI.disapproveUser(userId);
      toast.success('Utilisateur désapprouvé');
      fetchUsers();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
    try {
      await superAdminAPI.deleteUser(userId);
      toast.success('Utilisateur supprimé');
      fetchUsers();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setMobileOpen(false);
    if (tab === 'users') fetchUsers();
    if (tab === 'pending') fetchPendingUsers();
    if (tab === 'logs') fetchLogs();
  };

  const closeSidebar = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="dashboard-layout">
      <div className={`sidebar-overlay ${mobileOpen ? 'active' : ''}`} onClick={closeSidebar} />
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <img src="/leoni-logo.svg" alt="LEONI" />
        </div>
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => handleTabChange('overview')}
          >
            <LayoutDashboard size={18} /> Vue d'ensemble
          </button>
          <button
            className={`nav-item ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => handleTabChange('pending')}
          >
            <UserCheck size={18} /> En attente
            {pendingUsers.length > 0 && (
              <span className="badge-count">{pendingUsers.length}</span>
            )}
          </button>
          <button
            className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => handleTabChange('users')}
          >
            <Users size={18} /> Utilisateurs
          </button>
          <button
            className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => handleTabChange('logs')}
          >
            <History size={18} /> Logs connexion
          </button>
          <button
            className={`nav-item ${activeTab === 'quality-objectives' ? 'active' : ''}`}
            onClick={() => handleTabChange('quality-objectives')}
          >
            <Target size={18} /> Objectifs Qualité
          </button>
          <button
            className={`nav-item ${activeTab === 'push-settings' ? 'active' : ''}`}
            onClick={() => handleTabChange('push-settings')}
          >
            <Bell size={18} /> Notifications
          </button>
          <button
            className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => navigate('/calendar')}
          >
            <Calendar size={18} /> Calendrier
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <span>{user?.firstName} {user?.lastName}</span>
            <small>{user?.email}</small>
          </div>
          <button className="btn-icon" onClick={logout} title="Déconnexion">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="top-bar">
          <div className="top-bar-left">
            <button className="hamburger-btn" onClick={() => setMobileOpen(true)}>
              <Menu size={20} />
            </button>
            <div className="top-bar-brand">
              <div className="top-bar-brand-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div className="top-bar-brand-text">
                <span className="top-bar-brand-label">SUPER ADMIN</span>
                <span className="top-bar-brand-name">{user?.firstName} {user?.lastName}</span>
              </div>
            </div>
          </div>
          <div className="top-bar-right">
            <NotificationBell token={token} />
            <button className="top-bar-avatar-btn" onClick={() => setDrawerOpen(true)}>
              <div className="top-bar-avatar-wrap">
                {user?.profileImage ? (
                  <img src={`http://localhost:3000${user.profileImage}`} alt="" className="top-bar-avatar-img" />
                ) : (
                  <div className="top-bar-avatar-text">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </div>
                )}
                <span className="top-bar-online-dot" />
              </div>
            </button>
          </div>
        </div>
        <div className="content-body">
          {activeTab === 'overview' && stats && (
            <>
              {/* Premium Welcome Banner */}
              <div className="wb-banner sa-banner">
                <div className="wb-bg-shapes">
                  <div className="wb-shape wb-shape-1" />
                  <div className="wb-shape wb-shape-2" />
                  <div className="wb-shape wb-shape-3" />
                </div>
                <div className="wb-content">
                  <div className="wb-greeting">
                    <span className="wb-wave">👋</span>
                    <h2>Bonjour, <span>{user?.firstName}</span></h2>
                  </div>
                  <p className="wb-subtitle">Voici un aperçu de votre système qualité — gestion des utilisateurs et supervision</p>
                  <div className="wb-quick-stats">
                    <div className="wb-qs-item">
                      <div className="wb-qs-icon wb-qs-total"><Layers size={16} /></div>
                      <div><span className="wb-qs-val">{stats.totalUsers}</span><span className="wb-qs-lbl">Utilisateurs</span></div>
                    </div>
                    <div className="wb-qs-divider" />
                    <div className="wb-qs-item">
                      <div className="wb-qs-icon wb-qs-vert"><CheckCircle2 size={16} /></div>
                      <div><span className="wb-qs-val">{stats.approvedUsers}</span><span className="wb-qs-lbl">Approuvés</span></div>
                    </div>
                    <div className="wb-qs-divider" />
                    <div className="wb-qs-item">
                      <div className="wb-qs-icon wb-qs-jaune"><AlertCircle size={16} /></div>
                      <div><span className="wb-qs-val">{stats.pendingUsers}</span><span className="wb-qs-lbl">En attente</span></div>
                    </div>
                    <div className="wb-qs-divider" />
                    <div className="wb-qs-item">
                      <div className="wb-qs-icon" style={{background:'rgba(139,92,246,0.2)',color:'#a78bfa'}}><ShieldCheck size={16} /></div>
                      <div><span className="wb-qs-val">{stats.totalSuperviseurs}</span><span className="wb-qs-lbl">Superviseurs</span></div>
                    </div>
                  </div>
                </div>
                {/* Mini donut */}
                <div className="wb-donut-wrap">
                  <svg viewBox="0 0 100 100" className="wb-donut">
                    {(() => {
                      const r = 35;
                      const c = 2 * Math.PI * r;
                      const total = stats.totalUsers || 1;
                      const data = [
                        { pct: stats.totalAgents / total, color: '#4ade80' },
                        { pct: stats.totalSuperviseurs / total, color: '#facc15' },
                        { pct: stats.pendingUsers / total, color: '#f87171' },
                      ];
                      let offset = 0;
                      return data.map((d, i) => {
                        const len = d.pct * c;
                        const gap = c - len;
                        const el = (
                          <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={d.color} strokeWidth="10"
                            strokeDasharray={`${len} ${gap}`} strokeDashoffset={-offset} strokeLinecap="round"
                            className="wb-donut-seg" style={{ animationDelay: `${i * 200 + 400}ms` }} />
                        );
                        offset += len;
                        return el;
                      });
                    })()}
                  </svg>
                  <div className="wb-donut-center">
                    <span>{stats.totalUsers}</span>
                    <small>Total</small>
                  </div>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="sa-kpi-grid">
                <div className="ov-kpi ov-kpi-blue" style={{ animationDelay: '0ms' }}>
                  <div className="ov-kpi-head">
                    <div className="ov-kpi-icon"><Users size={20} /></div>
                    <span className="ov-kpi-trend ov-kpi-trend-up"><TrendingUp size={14} /> {stats.totalUsers}</span>
                  </div>
                  <div className="ov-kpi-body">
                    <span className="ov-kpi-val">{stats.totalUsers}</span>
                    <span className="ov-kpi-lbl">Total utilisateurs</span>
                  </div>
                  <div className="ov-kpi-bar">
                    <div className="ov-kpi-bar-fill" style={{ width: '100%', background: '#2563eb' }} />
                  </div>
                </div>

                <div className="ov-kpi ov-kpi-green" style={{ animationDelay: '60ms' }}>
                  <div className="ov-kpi-head">
                    <div className="ov-kpi-icon"><UserCheck size={20} /></div>
                    <span className="ov-kpi-trend ov-kpi-trend-up"><TrendingUp size={14} /> Agents</span>
                  </div>
                  <div className="ov-kpi-body">
                    <span className="ov-kpi-val">{stats.totalAgents}</span>
                    <span className="ov-kpi-lbl">Agents Qualité</span>
                  </div>
                  <div className="ov-kpi-bar">
                    <div className="ov-kpi-bar-fill" style={{ width: `${stats.totalUsers > 0 ? (stats.totalAgents / stats.totalUsers) * 100 : 0}%`, background: '#22c55e' }} />
                  </div>
                </div>

                <div className="ov-kpi ov-kpi-yellow" style={{ animationDelay: '120ms' }}>
                  <div className="ov-kpi-head">
                    <div className="ov-kpi-icon"><Shield size={20} /></div>
                    <span className="ov-kpi-trend ov-kpi-trend-warn"><BarChart2 size={14} /> Superviseurs</span>
                  </div>
                  <div className="ov-kpi-body">
                    <span className="ov-kpi-val">{stats.totalSuperviseurs}</span>
                    <span className="ov-kpi-lbl">Superviseurs Qualité</span>
                  </div>
                  <div className="ov-kpi-bar">
                    <div className="ov-kpi-bar-fill" style={{ width: `${stats.totalUsers > 0 ? (stats.totalSuperviseurs / stats.totalUsers) * 100 : 0}%`, background: '#eab308' }} />
                  </div>
                </div>

                <div className="ov-kpi ov-kpi-red" style={{ animationDelay: '180ms' }}>
                  <div className="ov-kpi-head">
                    <div className="ov-kpi-icon"><UserX size={20} /></div>
                    <span className="ov-kpi-trend ov-kpi-trend-down"><TrendingDown size={14} /> {stats.pendingUsers}</span>
                  </div>
                  <div className="ov-kpi-body">
                    <span className="ov-kpi-val">{stats.pendingUsers}</span>
                    <span className="ov-kpi-lbl">En attente</span>
                  </div>
                  <div className="ov-kpi-bar">
                    <div className="ov-kpi-bar-fill" style={{ width: `${stats.totalUsers > 0 ? (stats.pendingUsers / stats.totalUsers) * 100 : 0}%`, background: '#ef4444' }} />
                  </div>
                </div>

                <div className="ov-kpi ov-kpi-cyan sa-kpi-full" style={{ animationDelay: '240ms' }}>
                  <div className="ov-kpi-head">
                    <div className="ov-kpi-icon"><Activity size={20} /></div>
                    <span className="ov-kpi-trend"><Zap size={14} /> Activité</span>
                  </div>
                  <div className="ov-kpi-body">
                    <span className="ov-kpi-val">{stats.totalLogs}</span>
                    <span className="ov-kpi-lbl">Total logs connexion</span>
                  </div>
                  <div className="ov-kpi-bar">
                    <div className="ov-kpi-bar-fill" style={{ width: `${Math.min((stats.totalLogs / (stats.totalUsers * 10 || 1)) * 100, 100)}%`, background: '#06b6d4' }} />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'pending' && (
            <PendingUsersTab
              users={pendingUsers}
              loading={loading}
              onApprove={handleApprove}
              onRefresh={fetchPendingUsers}
            />
          )}

          {activeTab === 'users' && (
            <UsersTab
              users={users}
              loading={loading}
              onApprove={handleApprove}
              onDisapprove={handleDisapprove}
              onDelete={handleDelete}
              onRefresh={fetchUsers}
            />
          )}

          {activeTab === 'logs' && (
            <LogsTab logs={logs} loading={loading} />
          )}

          {activeTab === 'quality-objectives' && (
            <QualityObjectivesTab userRole="super_admin" />
          )}

          {activeTab === 'push-settings' && (
            <PushSettings isSuperAdmin={true} />
          )}
        </div>
      </main>
      <UserProfileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <CopilotButton />
    </div>
  );
};

const PendingUsersTab: React.FC<{
  users: User[];
  loading: boolean;
  onApprove: (id: string) => void;
  onRefresh: () => void;
}> = ({ users, loading, onApprove, onRefresh }) => {
  useEffect(() => {
    onRefresh();
  }, []);

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Matricule</th>
            <th>Email</th>
            <th>Rôle</th>
            <th>Date d'inscription</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td data-label="Nom">{u.firstName} {u.lastName}</td>
              <td data-label="Matricule">{u.matricule}</td>
              <td data-label="Email">{u.email}</td>
              <td data-label="Rôle">
                <span className={`role-tag ${u.role}`}>
                  {u.role === 'agent_qualite' ? 'Agent' : 'Superviseur'}
                </span>
              </td>
              <td data-label="Inscription">{new Date(u.createdAt).toLocaleDateString('fr-FR')}</td>
              <td data-label="Actions">
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => onApprove(u.id)}
                >
                  <Check size={14} /> Approuver
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 && (
        <div className="empty-state">Aucun utilisateur en attente</div>
      )}
    </div>
  );
};

const UsersTab: React.FC<{
  users: User[];
  loading: boolean;
  onApprove: (id: string) => void;
  onDisapprove: (id: string) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}> = ({ users, loading, onApprove, onDisapprove, onDelete, onRefresh }) => {
  useEffect(() => {
    onRefresh();
  }, []);

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Matricule</th>
            <th>Email</th>
            <th>Rôle</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td data-label="Nom">{u.firstName} {u.lastName}</td>
              <td data-label="Matricule">{u.matricule}</td>
              <td data-label="Email">{u.email}</td>
              <td data-label="Rôle">
                <span className={`role-tag ${u.role}`}>
                  {u.role === 'agent_qualite' ? 'Agent' : u.role === 'superviseur_qualite' ? 'Superviseur' : 'Admin'}
                </span>
              </td>
              <td data-label="Statut">
                <span className={`badge ${u.isApproved ? 'active' : 'inactive'}`}>
                  {u.isApproved ? 'Approuvé' : 'En attente'}
                </span>
              </td>
              <td data-label="Actions" className="actions-cell">
                {u.role === 'superviseur_qualite' && (
                  <>
                    {u.isApproved ? (
                      <button
                        className="btn btn-warning btn-sm"
                        onClick={() => onDisapprove(u.id)}
                      >
                        <X size={14} />
                      </button>
                    ) : (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => onApprove(u.id)}
                      >
                        <Check size={14} />
                      </button>
                    )}
                  </>
                )}
                {u.role !== 'super_admin' && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => onDelete(u.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const LogsTab: React.FC<{
  logs: LoginLog[];
  loading: boolean;
}> = ({ logs, loading }) => {
  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Date/Heure</th>
            <th>Utilisateur</th>
            <th>Matricule</th>
            <th>Rôle</th>
            <th>Action</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td data-label="Date">{new Date(log.loggedAt).toLocaleString('fr-FR')}</td>
              <td data-label="Utilisateur">{log.user.firstName} {log.user.lastName}</td>
              <td data-label="Matricule">{log.user.matricule}</td>
              <td data-label="Rôle">
                <span className={`role-tag ${log.user.role}`}>
                  {log.user.role === 'agent_qualite' ? 'Agent' : log.user.role === 'superviseur_qualite' ? 'Superviseur' : 'Admin'}
                </span>
              </td>
              <td data-label="Action">
                <span className={`action-badge ${log.action}`}>
                  {log.action === 'login' ? 'Connexion' : 'Déconnexion'}
                </span>
              </td>
              <td data-label="IP">{log.ipAddress || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {logs.length === 0 && (
        <div className="empty-state">Aucun log trouvé</div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
