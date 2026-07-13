import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { superAdminAPI } from '../../api';
import { User, LoginLog, SuperAdminStats } from '../../types';
import { toast } from 'react-hot-toast';
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
} from 'lucide-react';

const SuperAdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);

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
    if (tab === 'users') fetchUsers();
    if (tab === 'pending') fetchPendingUsers();
    if (tab === 'logs') fetchLogs();
  };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Super Admin</h2>
          <span className="role-badge super-admin">Administrateur</span>
        </div>
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => handleTabChange('overview')}
          >
            <BarChart3 size={18} /> Vue d'ensemble
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
            <Clock size={18} /> Logs connexion
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <span>{user?.firstName} {user?.lastName}</span>
            <small>{user?.email}</small>
          </div>
          <button className="btn-icon" onClick={logout}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <h1>
            {activeTab === 'overview' && 'Vue d\'ensemble'}
            {activeTab === 'pending' && 'Utilisateurs en attente'}
            {activeTab === 'users' && 'Gestion des utilisateurs'}
            {activeTab === 'logs' && 'Historique des connexions'}
          </h1>
        </header>

        <div className="content-body">
          {activeTab === 'overview' && stats && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon total">
                  <Users size={24} />
                </div>
                <div className="stat-info">
                  <h3>{stats.totalUsers}</h3>
                  <p>Total utilisateurs</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon vert">
                  <UserCheck size={24} />
                </div>
                <div className="stat-info">
                  <h3>{stats.totalAgents}</h3>
                  <p>Agents Qualité</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon jaune">
                  <Shield size={24} />
                </div>
                <div className="stat-info">
                  <h3>{stats.totalSuperviseurs}</h3>
                  <p>Superviseurs</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon rouge">
                  <UserX size={24} />
                </div>
                <div className="stat-info">
                  <h3>{stats.pendingUsers}</h3>
                  <p>En attente</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon time">
                  <Activity size={24} />
                </div>
                <div className="stat-info">
                  <h3>{stats.totalLogs}</h3>
                  <p>Total logs</p>
                </div>
              </div>
            </div>
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
        </div>
      </main>
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
              <td>{u.firstName} {u.lastName}</td>
              <td>{u.matricule}</td>
              <td>{u.email}</td>
              <td>
                <span className={`role-tag ${u.role}`}>
                  {u.role === 'agent_qualite' ? 'Agent' : 'Superviseur'}
                </span>
              </td>
              <td>{new Date(u.createdAt).toLocaleDateString('fr-FR')}</td>
              <td>
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
              <td>{u.firstName} {u.lastName}</td>
              <td>{u.matricule}</td>
              <td>{u.email}</td>
              <td>
                <span className={`role-tag ${u.role}`}>
                  {u.role === 'agent_qualite' ? 'Agent' : u.role === 'superviseur_qualite' ? 'Superviseur' : 'Admin'}
                </span>
              </td>
              <td>
                <span className={`badge ${u.isApproved ? 'active' : 'inactive'}`}>
                  {u.isApproved ? 'Approuvé' : 'En attente'}
                </span>
              </td>
              <td className="actions-cell">
                {u.role !== 'super_admin' && (
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
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => onDelete(u.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
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
              <td>{new Date(log.loggedAt).toLocaleString('fr-FR')}</td>
              <td>{log.user.firstName} {log.user.lastName}</td>
              <td>{log.user.matricule}</td>
              <td>
                <span className={`role-tag ${log.user.role}`}>
                  {log.user.role === 'agent_qualite' ? 'Agent' : log.user.role === 'superviseur_qualite' ? 'Superviseur' : 'Admin'}
                </span>
              </td>
              <td>
                <span className={`action-badge ${log.action}`}>
                  {log.action === 'login' ? 'Connexion' : 'Déconnexion'}
                </span>
              </td>
              <td>{log.ipAddress || '-'}</td>
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
