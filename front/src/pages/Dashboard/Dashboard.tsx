import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { qualityAPI, authAPI } from '../../api';
import { reportAPI } from '../../api';
import { LigneControle, NoteQualite, User } from '../../types';
import RapportLibraries from '../../components/RapportLibraries';
import { toast } from 'react-hot-toast';
import { copyToClipboard } from '../../utils/clipboard';
import Chat from '../../components/Chat';
import NotificationBell from '../../components/NotificationBell';
import UserProfileDrawer from '../../components/UserProfileDrawer';
import ImageLibrary from '../../components/ImageLibrary';
import { chatAPI } from '../../api';
import {
  LayoutDashboard,
  Plus,
  List,
  BarChart3,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Download,
  Shield,
  ClipboardList,
  FileSpreadsheet,
  History,
  UserCircle,
  Eye,
  X,
  Camera,
  MessageSquare,
  Menu,
  TrendingUp,
  Target,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  AlertCircle,
  CheckCircle2,
  Timer,
  ArrowRight,
  Search,
  TrendingDown,
  Zap,
  BarChart2,
  ChevronRight,
  CalendarClock,
  Users,
  ImageIcon,
  Trash2,
  UserCheck,
  UserX,
  Copy,
  Key,
  Folder,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Dashboard: React.FC = () => {
  const { user, token, logout, isSuperviseur, isAgent } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [lignes, setLignes] = useState<LigneControle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [editingLigne, setEditingLigne] = useState<LigneControle | null>(null);
  const [lignesSubTab, setLignesSubTab] = useState<'mes-lignes' | 'agent-lignes'>('mes-lignes');
  const [unreadCount, setUnreadCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isAgentBlocked = isAgent && user?.isApprovedBySuperviseur === false;

  useEffect(() => {
    if (!isAgentBlocked) {
      fetchLignes();
      fetchUnreadCount();
    }
  }, [isAgentBlocked]);

  const fetchUnreadCount = async () => {
    try {
      const res = await chatAPI.getUnreadCount();
      setUnreadCount(res.data.unreadCount);
    } catch {
      // silent
    }
  };

  const fetchLignes = async () => {
    try {
      const response = isAgent
        ? await qualityAPI.getMesLignes()
        : await qualityAPI.getAllLignes();
      setLignes(response.data);
    } catch (err) {
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const getStats = () => {
    const total = lignes.length;
    const vert = lignes.filter((l) => l.note === NoteQualite.VERT).length;
    const jaune = lignes.filter((l) => l.note === NoteQualite.JAUNE).length;
    const rouge = lignes.filter((l) => l.note === NoteQualite.ROUGE).length;
    const totalMinutes = lignes.reduce((acc, l) => {
      const min = parseInt(l.delais, 10);
      return acc + (isNaN(min) ? 0 : min);
    }, 0);
    return { total, vert, jaune, rouge, totalMinutes };
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const searchResults = searchQuery.trim()
    ? lignes.filter(l =>
        l.nomLigne.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.responsable.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.delais.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 10)
    : [];

  const stats = getStats();

  const closeSidebar = useCallback(() => setMobileOpen(false), []);

  const handleTab = (tab: string) => {
    if (isAgentBlocked) return;
    setActiveTab(tab);
    setMobileOpen(false);
  };

  return (
    <div className="dashboard-layout">
      <div className={`sidebar-overlay ${mobileOpen ? 'active' : ''}`} onClick={closeSidebar} />
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <img src="/leoni-logo.svg" alt="LEONI" />
          <button
            className="sidebar-collapse-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? '>' : '<'}
          </button>
        </div>
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => handleTab('overview')}
          >
            <LayoutDashboard size={18} /> <span>Vue d'ensemble</span>
          </button>
          {isSuperviseur && (
            <>
              <button
                className={`nav-item ${activeTab === 'controle-dates' ? 'active' : ''}`}
                onClick={() => handleTab('controle-dates')}
              >
                <Calendar size={18} /> <span>Dates de contrôle</span>
              </button>
              <button
                className={`nav-item ${activeTab === 'lignes' ? 'active' : ''}`}
                onClick={() => handleTab('lignes')}
              >
                <ClipboardList size={18} /> <span>Lignes</span>
              </button>
              <button
                className={`nav-item ${activeTab === 'historique' ? 'active' : ''}`}
                onClick={() => handleTab('historique')}
              >
                <History size={18} /> <span>Historique agents</span>
              </button>
              <button
                className={`nav-item ${activeTab === 'mes-agents' ? 'active' : ''}`}
                onClick={() => handleTab('mes-agents')}
              >
                <UserCheck size={18} /> <span>Mes Agents</span>
              </button>
            </>
          )}
          {isAgent && (
            <button
              className={`nav-item ${activeTab === 'mes-lignes' ? 'active' : ''}`}
              onClick={() => handleTab('mes-lignes')}
            >
              <FileSpreadsheet size={18} /> <span>Mes lignes</span>
            </button>
          )}
          <button
            className={`nav-item ${activeTab === 'add-ligne' ? 'active' : ''}`}
            onClick={() => handleTab('add-ligne')}
          >
            <Plus size={18} /> <span>Ajouter une ligne</span>
          </button>
          {isAgent && editingLigne && (
            <button
              className={`nav-item ${activeTab === 'edit-ligne' ? 'active' : ''}`}
              onClick={() => handleTab('edit-ligne')}
            >
              <FileSpreadsheet size={18} /> <span>Modifier ligne</span>
            </button>
          )}
          {isSuperviseur && (
            <button
              className={`nav-item ${activeTab === 'rapport' ? 'active' : ''}`}
              onClick={() => handleTab('rapport')}
            >
              <BarChart3 size={18} /> <span>Rapport</span>
            </button>
          )}
          {isSuperviseur && (
            <button
              className={`nav-item ${activeTab === 'ai-reports' ? 'active' : ''}`}
              onClick={() => handleTab('ai-reports')}
            >
              <Zap size={18} /> <span>Rapports IA</span>
            </button>
          )}
          {isSuperviseur && (
            <button
              className={`nav-item ${activeTab === 'rapport-libraries' ? 'active' : ''}`}
              onClick={() => handleTab('rapport-libraries')}
            >
              <Folder size={18} /> <span>Rapport Libraries</span>
            </button>
          )}
          <button
            className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => handleTab('messages')}
          >
            <MessageSquare size={18} /> <span>Messages</span>
            {unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
          </button>
          <button
            className={`nav-item ${activeTab === 'images' ? 'active' : ''}`}
            onClick={() => handleTab('images')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <span>Images & Dossiers</span>
          </button>
        </nav>
      </aside>

      <main className="main-content">
        <div className="top-bar">
          <div className="top-bar-left">
            <button className="hamburger-btn" onClick={() => setMobileOpen(true)}>
              <Menu size={20} />
            </button>
            <div className="top-bar-brand">
              <div className="top-bar-brand-icon">
                {user?.profileImage ? (
                  <img src={`http://localhost:3000${user.profileImage}`} alt="" className="top-bar-brand-img" />
                ) : (
                  <div className="top-bar-brand-fallback">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </div>
                )}
              </div>
              <div className="top-bar-brand-text">
                <span className="top-bar-brand-label">{isSuperviseur ? 'SUPERVISEUR QUALITE' : 'AGENT QUALITE'}</span>
                <span className="top-bar-brand-name">
                  {user?.firstName} {user?.lastName}
                  {isAgent && user?.superviseur && (
                    <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 400, marginLeft: 8 }}>
                      ({user.superviseur.firstName} {user.superviseur.lastName} - Superviseur)
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
          <div className="top-bar-right">
            <button className="top-bar-icon-btn" title="Messages" onClick={() => handleTab('messages')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            </button>
            <button className="top-bar-icon-btn" title="Rechercher" onClick={() => setSearchOpen(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            <div className="top-bar-shortcut">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"/><line x1="6" y1="8" x2="6.01" y2="8"/><line x1="10" y1="8" x2="10.01" y2="8"/><line x1="14" y1="8" x2="14.01" y2="8"/><line x1="18" y1="8" x2="18.01" y2="8"/><line x1="8" y1="12" x2="8.01" y2="12"/><line x1="12" y1="12" x2="12.01" y2="12"/><line x1="16" y1="12" x2="16.01" y2="12"/><line x1="7" y1="16" x2="17" y2="16"/></svg>
              <span>⌘K</span>
            </div>
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
          {/* Agent Pending Approval Overlay */}
          {isAgentBlocked && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(8px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}>
              <div style={{
                background: '#fff',
                borderRadius: 20,
                padding: '48px 40px',
                maxWidth: 440,
                width: '100%',
                textAlign: 'center',
                boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
              }}>
                <div style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: '#fffbeb',
                  border: '3px solid #f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                }}>
                  <Clock size={36} color="#f59e0b" />
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
                  En attente d'approbation
                </h2>
                <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 8 }}>
                  Votre compte a ete lie a un superviseur qualite. Vous devez etre approuve par votre superviseur pour acceder aux fonctionnalites.
                </p>
                {user?.superviseur && (
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: '14px 18px',
                    marginBottom: 24,
                  }}>
                    <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.8, marginBottom: 4 }}>
                      Votre superviseur
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
                      {user.superviseur.firstName} {user.superviseur.lastName}
                    </div>
                  </div>
                )}
                <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 24 }}>
                  Veuillez patienter jusqu'a ce que votre superviseur valide votre inscription.
                </p>
                <button
                  onClick={() => logout()}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '12px 24px',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    width: '100%',
                  }}
                >
                  Se deconnecter
                </button>
              </div>
            </div>
          )}

          {/* Welcome Banner */}
          <div className="wb-banner">
            <div className="wb-bg-shapes">
              <div className="wb-shape wb-shape-1" />
              <div className="wb-shape wb-shape-2" />
              <div className="wb-shape wb-shape-3" />
            </div>
            <div className="wb-content">
              <div className="wb-greeting">
                <h2>Bonjour, <span>{user?.firstName}</span></h2>
              </div>
              <p className="wb-subtitle">
                {isSuperviseur
                  ? "Voici un aperçu de l'activité qualité de vos équipes"
                  : "Voici un aperçu de votre activité qualité aujourd'hui"}
              </p>
              <div className="wb-quick-stats">
                <div className="wb-qs-item">
                  <div className="wb-qs-icon wb-qs-total"><Layers size={16} /></div>
                  <div><span className="wb-qs-val">{stats.total}</span><span className="wb-qs-lbl">Lignes</span></div>
                </div>
                <div className="wb-qs-divider" />
                <div className="wb-qs-item">
                  <div className="wb-qs-icon wb-qs-vert"><CheckCircle2 size={16} /></div>
                  <div><span className="wb-qs-val">{stats.vert}</span><span className="wb-qs-lbl">Conformes</span></div>
                </div>
                <div className="wb-qs-divider" />
                <div className="wb-qs-item">
                  <div className="wb-qs-icon wb-qs-jaune"><AlertCircle size={16} /></div>
                  <div><span className="wb-qs-val">{stats.jaune}</span><span className="wb-qs-lbl">À surveiller</span></div>
                </div>
                <div className="wb-qs-divider" />
                <div className="wb-qs-item">
                  <div className="wb-qs-icon wb-qs-rouge"><XCircle size={16} /></div>
                  <div><span className="wb-qs-val">{stats.rouge}</span><span className="wb-qs-lbl">Critiques</span></div>
                </div>
              </div>
            </div>
            {/* Quick Actions */}
            <div className="wb-quick-actions">
              <span className="wb-qa-title">Actions rapides</span>
              <div className="wb-qa-grid">
                <button className="wb-qa-btn" onClick={() => handleTab('add-ligne')}>
                  <div className="wb-qa-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><ClipboardList size={18} /></div>
                  <span>Ajouter Ligne</span>
                </button>
                {isSuperviseur ? (
                  <button className="wb-qa-btn" onClick={() => handleTab('rapport')}>
                    <div className="wb-qa-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><BarChart3 size={18} /></div>
                    <span>Voir Rapport</span>
                  </button>
                ) : (
                  <button className="wb-qa-btn" onClick={() => handleTab('mes-lignes')}>
                    <div className="wb-qa-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><List size={18} /></div>
                    <span>Voir Lignes</span>
                  </button>
                )}
                <button className="wb-qa-btn" onClick={() => handleTab('messages')}>
                  <div className="wb-qa-icon" style={{ background: '#eff6ff', color: '#6366f1' }}><MessageSquare size={18} /></div>
                  <span>Messages</span>
                </button>
                <button className="wb-qa-btn" onClick={() => handleTab('images')}>
                  <div className="wb-qa-icon" style={{ background: '#f0f9ff', color: '#0284c7' }}><ImageIcon size={18} /></div>
                  <span>Bibliothèque</span>
                </button>
              </div>
            </div>
          </div>

        {activeTab === 'overview' && (
            <div className="ov-grid">
              {/* KPI Cards */}
              <div className="ov-kpi ov-kpi-blue">
                <div className="ov-kpi-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
                  <Layers size={20} />
                </div>
                <div className="ov-kpi-body">
                  <span className="ov-kpi-lbl">Total Lignes</span>
                  <span className="ov-kpi-val">{stats.total}</span>
                  <span className="ov-kpi-sub">Toutes les lignes contrôle</span>
                </div>
                <div className="ov-kpi-bottom">
                  <span className="ov-kpi-trend ov-kpi-trend-up">
                    <TrendingUp size={13} /> {stats.total > 0 ? Math.round((stats.vert / stats.total) * 100) : 0}% conforme
                  </span>
                </div>
                <svg className="ov-kpi-spark" viewBox="0 0 80 30" preserveAspectRatio="none">
                  <polyline points="0,25 15,20 30,22 45,15 60,10 80,5" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>

              <div className="ov-kpi ov-kpi-green">
                <div className="ov-kpi-icon-wrap" style={{ background: '#f0fdf4', color: '#22c55e' }}>
                  <CheckCircle size={20} />
                </div>
                <div className="ov-kpi-body">
                  <span className="ov-kpi-lbl">Conformes</span>
                  <span className="ov-kpi-val">{stats.vert}</span>
                  <span className="ov-kpi-sub">Lignes en conformité</span>
                </div>
                <div className="ov-kpi-bottom">
                  <span className="ov-kpi-trend ov-kpi-trend-up">
                    <TrendingUp size={13} /> +{stats.total > 0 ? Math.round((stats.vert / stats.total) * 100) : 0}%
                  </span>
                </div>
                <svg className="ov-kpi-spark" viewBox="0 0 80 30" preserveAspectRatio="none">
                  <polyline points="0,28 15,25 30,20 45,18 60,12 80,5" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>

              <div className="ov-kpi ov-kpi-yellow">
                <div className="ov-kpi-icon-wrap" style={{ background: '#fefce8', color: '#eab308' }}>
                  <AlertTriangle size={20} />
                </div>
                <div className="ov-kpi-body">
                  <span className="ov-kpi-lbl">À Surveiller</span>
                  <span className="ov-kpi-val">{stats.jaune}</span>
                  <span className="ov-kpi-sub">Lignes en alerte</span>
                </div>
                <div className="ov-kpi-bottom">
                  <span className="ov-kpi-trend ov-kpi-trend-warn">
                    <BarChart2 size={13} /> {stats.total > 0 ? Math.round((stats.jaune / stats.total) * 100) : 0}%
                  </span>
                </div>
                <svg className="ov-kpi-spark" viewBox="0 0 80 30" preserveAspectRatio="none">
                  <polyline points="0,20 15,22 30,18 45,24 60,20 80,15" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>

              <div className="ov-kpi ov-kpi-red">
                <div className="ov-kpi-icon-wrap" style={{ background: '#fef2f2', color: '#ef4444' }}>
                  <XCircle size={20} />
                </div>
                <div className="ov-kpi-body">
                  <span className="ov-kpi-lbl">Critiques</span>
                  <span className="ov-kpi-val">{stats.rouge}</span>
                  <span className="ov-kpi-sub">Lignes non conformes</span>
                </div>
                <div className="ov-kpi-bottom">
                  <span className="ov-kpi-trend ov-kpi-trend-down">
                    <TrendingDown size={13} /> -{stats.total > 0 ? Math.round((stats.rouge / stats.total) * 100) : 0}%
                  </span>
                </div>
                <svg className="ov-kpi-spark" viewBox="0 0 80 30" preserveAspectRatio="none">
                  <polyline points="0,10 15,12 30,18 45,15 60,22 80,28" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>

              <div className="ov-time-panel">
                <div className="ov-time-head">
                  <div className="ov-time-icon-wrap">
                    <Timer size={22} />
                  </div>
                  <div className="ov-time-head-text">
                    <span className="ov-panel-label">TEMPS PERDU</span>
                    <h4 className="ov-panel-title">Suivi des arrêts production</h4>
                  </div>
                </div>
                <div className="ov-time-body">
                  <div className="ov-time-main">
                    <div className="ov-time-ring">
                      <svg viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="52" fill="none" stroke="#e0f2fe" strokeWidth="8" />
                        <circle cx="60" cy="60" r="52" fill="none" stroke="#06b6d4" strokeWidth="8"
                          strokeDasharray={`${2 * Math.PI * 52}`}
                          strokeDashoffset={`${2 * Math.PI * 52 * (1 - Math.min(stats.totalMinutes / (stats.total * 30 || 60), 1))}`}
                          strokeLinecap="round" transform="rotate(-90 60 60)"
                          className="ov-time-ring-fill" />
                      </svg>
                      <div className="ov-time-ring-center">
                        <span className="ov-time-ring-val">{stats.totalMinutes}</span>
                        <span className="ov-time-ring-unit">min</span>
                      </div>
                    </div>
                    <div className="ov-time-details">
                      <div className="ov-time-detail-row">
                        <div className="ov-time-detail-left">
                          <div className="ov-time-detail-icon" style={{ background: '#f0f9ff', color: '#0ea5e9' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                          </div>
                          <span className="ov-time-detail-label">Total lignes</span>
                        </div>
                        <span className="ov-time-detail-val">{stats.total}</span>
                      </div>
                      <div className="ov-time-detail-row">
                        <div className="ov-time-detail-left">
                          <div className="ov-time-detail-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          </div>
                          <span className="ov-time-detail-label">Moy. / ligne</span>
                        </div>
                        <span className="ov-time-detail-val">{stats.total > 0 ? Math.round(stats.totalMinutes / stats.total) : 0} min</span>
                      </div>
                      <div className="ov-time-detail-row">
                        <div className="ov-time-detail-left">
                          <div className="ov-time-detail-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                          </div>
                          <span className="ov-time-detail-label">Heures perdues</span>
                        </div>
                        <span className="ov-time-detail-val">{Math.floor(stats.totalMinutes / 60)}h {stats.totalMinutes % 60}m</span>
                      </div>
                    </div>
                  </div>
                  <div className="ov-time-bar-section">
                    <div className="ov-time-bar-header">
                      <span>Répartition temps par note</span>
                    </div>
                    <div className="ov-time-bar-row">
                      <div className="ov-time-bar-item">
                        <span className="ov-time-bar-dot" style={{ background: '#22c55e' }} />
                        <span>Vert</span>
                        <div className="ov-time-bar-track">
                          <div className="ov-time-bar-fill" style={{ width: `${stats.total > 0 ? (stats.vert / stats.total) * 100 : 0}%`, background: '#22c55e' }} />
                        </div>
                      </div>
                      <div className="ov-time-bar-item">
                        <span className="ov-time-bar-dot" style={{ background: '#eab308' }} />
                        <span>Jaune</span>
                        <div className="ov-time-bar-track">
                          <div className="ov-time-bar-fill" style={{ width: `${stats.total > 0 ? (stats.jaune / stats.total) * 100 : 0}%`, background: '#eab308' }} />
                        </div>
                      </div>
                      <div className="ov-time-bar-item">
                        <span className="ov-time-bar-dot" style={{ background: '#ef4444' }} />
                        <span>Rouge</span>
                        <div className="ov-time-bar-track">
                          <div className="ov-time-bar-fill" style={{ width: `${stats.total > 0 ? (stats.rouge / stats.total) * 100 : 0}%`, background: '#ef4444' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quality Distribution Panel */}
              <div className="ov-dist-panel">
                <div className="ov-panel-head">
                  <div className="ov-panel-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
                  </div>
                  <div>
                    <span className="ov-panel-label">DISTRIBUTION QUALITÉ</span>
                    <h4 className="ov-panel-title">Aperçu par catégorie</h4>
                  </div>
                </div>
                <div className="ov-dist-chart">
                  <svg viewBox="0 0 140 140" className="ov-dist-donut">
                    {(() => {
                      const r = 52;
                      const c = 2 * Math.PI * r;
                      const data = [
                        { pct: stats.total > 0 ? stats.vert / stats.total : 0, color: '#34d399', label: 'Vert' },
                        { pct: stats.total > 0 ? stats.jaune / stats.total : 0, color: '#fbbf24', label: 'Jaune' },
                        { pct: stats.total > 0 ? stats.rouge / stats.total : 0, color: '#f87171', label: 'Rouge' },
                      ];
                      let offset = 0;
                      return data.map((d, i) => {
                        const len = d.pct * c;
                        const gap = c - len;
                        const el = (
                          <circle key={i} cx="70" cy="70" r={r} fill="none" stroke={d.color} strokeWidth="14"
                            strokeDasharray={`${len} ${gap}`} strokeDashoffset={-offset} strokeLinecap="round"
                            className="ov-dist-seg" style={{ animationDelay: `${i * 200 + 300}ms` }} />
                        );
                        offset += len;
                        return el;
                      });
                    })()}
                  </svg>
                  <div className="ov-dist-center">
                    <span className="ov-dist-total">{stats.total}</span>
                    <small>TOTAL</small>
                  </div>
                </div>
                <div className="ov-dist-legend">
                  {[
                    { label: 'Conforme', sub: 'Vert', count: stats.vert, color: '#34d399', bg: '#f0fdf4', pct: stats.total > 0 ? Math.round((stats.vert / stats.total) * 100) : 0 },
                    { label: 'À surveiller', sub: 'Jaune', count: stats.jaune, color: '#fbbf24', bg: '#fffbeb', pct: stats.total > 0 ? Math.round((stats.jaune / stats.total) * 100) : 0 },
                    { label: 'Non conforme', sub: 'Rouge', count: stats.rouge, color: '#f87171', bg: '#fef2f2', pct: stats.total > 0 ? Math.round((stats.rouge / stats.total) * 100) : 0 },
                  ].map((item) => (
                    <div key={item.label} className="ov-dist-row">
                      <div className="ov-dist-row-left">
                        <span className="ov-dist-dot" style={{ background: item.color }} />
                        <div className="ov-dist-text">
                          <span className="ov-dist-label">{item.label}</span>
                          <span className="ov-dist-sub">{item.sub}</span>
                        </div>
                      </div>
                      <div className="ov-dist-row-right">
                        <span className="ov-dist-val">{item.count}</span>
                        <span className="ov-dist-pct">{item.pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="ov-activity-panel">
                <div className="ov-panel-head">
                  <div className="ov-panel-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <div>
                    <span className="ov-panel-label">ACTIVITÉ RÉCENTE</span>
                    <h4 className="ov-panel-title">Dernières inspections</h4>
                  </div>
                </div>
                <div className="ov-activity-list">
                  {lignes.slice(0, 6).map((l, i) => (
                    <div key={l.id} className="ov-activity-item" style={{ animationDelay: `${i * 50}ms` }}>
                      <div className={`ov-act-avatar ${l.note}`}>
                        {l.agent?.firstName?.[0]}{l.agent?.lastName?.[0]}
                      </div>
                      <div className="ov-act-info">
                        <span className="ov-act-name">{l.nomLigne}</span>
                        <span className="ov-act-meta">
                          {l.agent?.firstName} {l.agent?.lastName}
                          <span className="ov-act-sep">·</span>
                          <span className="ov-act-time"><Clock size={11} /> {l.delais} min</span>
                        </span>
                      </div>
                      <div className="ov-act-right">
                        <span className={`rapport-note-chip ${l.note}`}>{l.note}</span>
                        <span className="ov-act-date">{new Date(l.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
                      </div>
                    </div>
                  ))}
                  {lignes.length === 0 && (
                    <div className="ov-empty">
                      <ClipboardList size={32} />
                      <p>Aucune activité pour le moment</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'controle-dates' && isSuperviseur && <ControleDatesTab />}
          {activeTab === 'lignes' && isSuperviseur && (
            <LignesSuperviseurTab
              lignes={lignes}
              loading={loading}
              subTab={lignesSubTab}
              onSubTabChange={setLignesSubTab}
              user={user}
              onDelete={fetchLignes}
            />
          )}
          {activeTab === 'mes-lignes' && isAgent && (
            <LignesTab lignes={lignes} loading={loading} onEdit={(ligne) => { setEditingLigne(ligne); setActiveTab('edit-ligne'); }} onDelete={fetchLignes} />
          )}
          {activeTab === 'historique' && isSuperviseur && <HistoriqueTab />}
          {activeTab === 'mes-agents' && isSuperviseur && <AgentsTab />}
          {activeTab === 'add-ligne' && <AddLigneTab onSuccess={fetchLignes} onEdit={(ligne) => { setEditingLigne(ligne); setActiveTab('edit-ligne'); }} />}
          {activeTab === 'edit-ligne' && editingLigne && (
            <EditLigneTab ligne={editingLigne} onSuccess={() => { fetchLignes(); setActiveTab('mes-lignes'); }} onCancel={() => setActiveTab('mes-lignes')} />
          )}
          {activeTab === 'rapport' && <RapportTab />}
          {activeTab === 'ai-reports' && <AiReportsTab />}
          {activeTab === 'rapport-libraries' && <RapportLibraries />}
          {activeTab === 'messages' && <Chat onUnreadCountChange={setUnreadCount} />}
          {activeTab === 'images' && <ImageLibrary userRole={user?.role || ''} />}
        </div>
      </main>
      <UserProfileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* SEARCH MODAL */}
      {searchOpen && (
        <div className="search-overlay" onClick={() => { setSearchOpen(false); setSearchQuery(''); }}>
          <div className="search-modal" onClick={e => e.stopPropagation()}>
            <div className="search-input-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Rechercher une ligne, responsable, détails..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <kbd className="search-kbd">ESC</kbd>
            </div>
            {searchQuery.trim() && (
              <div className="search-results">
                {searchResults.length === 0 ? (
                  <div className="search-empty">Aucun résultat pour "{searchQuery}"</div>
                ) : (
                  searchResults.map(l => (
                    <div key={l.id} className="search-result-item" onClick={() => { setSearchOpen(false); setSearchQuery(''); handleTab('rapport'); }}>
                      <div className={`search-result-dot note-${l.note}`} />
                      <div className="search-result-info">
                        <span className="search-result-name">{l.nomLigne}</span>
                        <span className="search-result-meta">{l.responsable} · {l.delais} · {l.controleDate?.dateControle}</span>
                      </div>
                      <span className={`search-result-badge note-${l.note}`}>{l.note}</span>
                    </div>
                  ))
                )}
              </div>
            )}
            {!searchQuery.trim() && (
              <div className="search-hint">
                <span>Recherchez par nom de ligne, responsable ou détails...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ControleDatesTab: React.FC = () => {
  const [dates, setDates] = useState<any[]>([]);
  const [newDate, setNewDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDates();
  }, []);

  const fetchDates = async () => {
    try {
      const response = await qualityAPI.getAllControleDates();
      setDates(response.data);
    } catch (err) {
      toast.error('Erreur');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await qualityAPI.createControleDate({ dateControle: newDate });
      toast.success('Date créée avec succès');
      setNewDate('');
      fetchDates();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDate = async (id: string) => {
    if (!window.confirm('Supprimer cette date et toutes ses lignes ?')) return;
    try {
      await qualityAPI.deleteControleDate(id);
      toast.success('Date supprimée');
      fetchDates();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const activeDates = dates.filter((d) => d.isActive).length;
  const inactiveDates = dates.length - activeDates;

  return (
    <div className="tab-content">
      {/* Stats Row */}
      <div className="cd-stats-row">
        <div className="cd-stat">
          <div className="cd-stat-icon cd-stat-total"><Calendar size={18} /></div>
          <div className="cd-stat-info">
            <span className="cd-stat-val">{dates.length}</span>
            <span className="cd-stat-lbl">Total dates</span>
          </div>
        </div>
        <div className="cd-stat">
          <div className="cd-stat-icon cd-stat-active"><CheckCircle size={18} /></div>
          <div className="cd-stat-info">
            <span className="cd-stat-val">{activeDates}</span>
            <span className="cd-stat-lbl">Actives</span>
          </div>
        </div>
        <div className="cd-stat">
          <div className="cd-stat-icon cd-stat-inactive"><XCircle size={18} /></div>
          <div className="cd-stat-info">
            <span className="cd-stat-val">{inactiveDates}</span>
            <span className="cd-stat-lbl">Inactives</span>
          </div>
        </div>
      </div>

      {/* Create Date Form */}
      <div className="cd-create-card">
        <div className="cd-create-header">
          <CalendarClock size={20} />
          <h4>Nouvelle date de contrôle</h4>
        </div>
        <form onSubmit={handleCreate} className="cd-create-form">
          <div className="cd-create-field">
            <label>Date</label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>
          <button type="submit" className="cd-create-btn" disabled={loading}>
            {loading ? <span className="rapport-btn-loading" /> : <><Plus size={16} /> Créer</>}
          </button>
        </form>
      </div>

      {/* Dates Grid */}
      <div className="cd-grid">
        {dates.map((d, i) => {
          const dateObj = new Date(d.dateControle);
          const day = dateObj.toLocaleDateString('fr-FR', { day: 'numeric' });
          const month = dateObj.toLocaleDateString('fr-FR', { month: 'short' });
          const weekday = dateObj.toLocaleDateString('fr-FR', { weekday: 'long' });

          return (
            <div key={d.id} className={`cd-card ${d.isActive ? 'cd-active' : 'cd-inactive'}`} style={{ animationDelay: `${i * 60}ms` }}>
              <div className="cd-card-cal">
                <span className="cd-cal-day">{day}</span>
                <span className="cd-cal-month">{month}</span>
                <span className="cd-cal-weekday">{weekday}</span>
              </div>
              <div className="cd-card-info">
                <div className="cd-card-status">
                  <span className={`cd-status-pill ${d.isActive ? 'cd-status-on' : 'cd-status-off'}`}>
                    {d.isActive ? <><CheckCircle size={12} /> Active</> : <><XCircle size={12} /> Inactive</>}
                  </span>
                </div>
                <div className="cd-card-meta">
                  <span>Créé par</span>
                  <strong>{d.createdBy?.firstName} {d.createdBy?.lastName}</strong>
                </div>
                <button className="cd-card-delete" onClick={() => handleDeleteDate(d.id)} title="Supprimer cette date">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {dates.length === 0 && (
        <div className="ov-empty">
          <Calendar size={32} />
          <p>Aucune date de contrôle créée</p>
        </div>
      )}
    </div>
  );
};

const LignesSuperviseurTab: React.FC<{
  lignes: LigneControle[];
  loading: boolean;
  subTab: 'mes-lignes' | 'agent-lignes';
  onSubTabChange: (tab: 'mes-lignes' | 'agent-lignes') => void;
  user: any;
  onDelete: () => void;
}> = ({ lignes, loading, subTab, onSubTabChange, user, onDelete }) => {
  const [viewLigne, setViewLigne] = useState<LigneControle | null>(null);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const mesLignes = lignes.filter((l) => l.agent?.id === user?.id);
  const agentLignes = lignes.filter((l) => l.agent?.id !== user?.id);
  const base = subTab === 'mes-lignes' ? mesLignes : agentLignes;
  const displayed = base.filter(
    (l) =>
      l.nomLigne?.toLowerCase().includes(search.toLowerCase()) ||
      l.responsable?.toLowerCase().includes(search.toLowerCase()) ||
      l.details?.toLowerCase().includes(search.toLowerCase())
  );

  const exportExcel = () => {
    const data = displayed.map((l) => ({
      Date: new Date(l.controleDate?.dateControle).toLocaleDateString('fr-FR'),
      'Nom ligne': l.nomLigne,
      Heure: l.heure || '-',
      Note: l.note,
      Délai: l.delais + ' min',
      Responsable: l.responsable,
      Agent: `${l.agent?.firstName} ${l.agent?.lastName}`,
      Détails: l.details,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lignes');
    XLSX.writeFile(wb, 'lignes_controle.xlsx');
    toast.success('Fichier Excel téléchargé');
  };

  const exportPDF = () => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text('Lignes de contrôle', 14, 15);
    if (search) {
      doc.setFontSize(10);
      doc.text(`Filtre: "${search}" — ${displayed.length} résultat(s)`, 14, 22);
    }
    autoTable(doc, {
      startY: search ? 28 : 20,
      head: [['Date', 'Nom ligne', 'Heure', 'Note', 'Délai', 'Responsable', 'Agent', 'Détails']],
      body: displayed.map((l) => [
        new Date(l.controleDate?.dateControle).toLocaleDateString('fr-FR'),
        l.nomLigne,
        l.heure || '-',
        l.note,
        l.delais + ' min',
        l.responsable,
        `${l.agent?.firstName} ${l.agent?.lastName}`,
        l.details,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
    });
    doc.save('lignes_controle.pdf');
    toast.success('Fichier PDF téléchargé');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cette ligne ?')) return;
    setDeletingId(id);
    try {
      await qualityAPI.deleteLigneControle(id);
      toast.success('Ligne supprimée');
      onDelete();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="sub-tabs">
        <button
          className={`sub-tab ${subTab === 'mes-lignes' ? 'active' : ''}`}
          onClick={() => onSubTabChange('mes-lignes')}
        >
          <UserCircle size={16} /> Mes lignes
          <span className="sub-tab-count">{mesLignes.length}</span>
        </button>
        <button
          className={`sub-tab ${subTab === 'agent-lignes' ? 'active' : ''}`}
          onClick={() => onSubTabChange('agent-lignes')}
        >
          <ClipboardList size={16} /> Lignes des agents
          <span className="sub-tab-count">{agentLignes.length}</span>
        </button>
      </div>
      {loading ? (
        <div className="loading">Chargement...</div>
      ) : (
        <div className="table-container">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Rechercher par nom, responsable ou détails..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {displayed.length > 0 && (
              <div className="export-buttons">
                <button className="btn btn-secondary btn-sm" onClick={exportExcel}>
                  <Download size={14} /> Excel
                </button>
                <button className="btn btn-secondary btn-sm" onClick={exportPDF}>
                  <Download size={14} /> PDF
                </button>
              </div>
            )}
          </div>
          <table>
            <thead>
              <tr>
                <th>Image</th>
                <th>Date</th>
                <th>Nom ligne</th>
                <th>Heure</th>
                <th>Note</th>
                <th>Délai</th>
                <th>Responsable</th>
                {subTab === 'agent-lignes' && <th>Agent</th>}
                <th>Détails</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((l) => (
                <tr key={l.id}>
                  <td data-label="Image">
                    {l.image ? (
                      <img src={`http://localhost:3000${l.image}`} alt="" className="ligne-image" />
                    ) : (
                      <span className="no-image">-</span>
                    )}
                  </td>
                  <td data-label="Date">{new Date(l.controleDate?.dateControle).toLocaleDateString('fr-FR')}</td>
                  <td data-label="Ligne">{l.nomLigne}</td>
                  <td data-label="Heure">{l.heure || '-'}</td>
                  <td data-label="Note"><span className={`note-badge ${l.note}`}>{l.note}</span></td>
                  <td data-label="Délai">{l.delais} min</td>
                  <td data-label="Responsable">{l.responsable}</td>
                  {subTab === 'agent-lignes' && <td data-label="Agent">{l.agent?.firstName} {l.agent?.lastName}</td>}
                  <td data-label="Détails" className="details-cell">{l.details}</td>
                  <td data-label="Actions">
                    <div className="actions-cell">
                      <button className="btn-icon-sm" onClick={() => setViewLigne(l)} title="Voir les détails">
                        <Eye size={16} />
                      </button>
                      <button
                        className="btn-icon-sm btn-icon-danger"
                        onClick={() => handleDelete(l.id)}
                        title="Supprimer"
                        disabled={deletingId === l.id}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {displayed.length === 0 && (
            <div className="empty-state">
              {search ? 'Aucune ligne ne correspond à votre recherche' : subTab === 'mes-lignes' ? "Vous n'avez pas encore de lignes" : "Aucune ligne trouvée pour les agents"}
            </div>
          )}
        </div>
      )}
      {viewLigne && <LigneDetailModal ligne={viewLigne} onClose={() => setViewLigne(null)} />}
    </div>
  );
};

const LignesTab: React.FC<{ lignes: LigneControle[]; loading: boolean; onEdit?: (ligne: LigneControle) => void; onDelete?: () => void }> = ({
  lignes,
  loading,
  onEdit,
  onDelete,
}) => {
  const [search, setSearch] = useState('');
  const [viewLigne, setViewLigne] = useState<LigneControle | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const filtered = lignes.filter(
    (l) => l.nomLigne?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cette ligne ?')) return;
    setDeletingId(id);
    try {
      await qualityAPI.deleteLigneControle(id);
      toast.success('Ligne supprimée');
      onDelete?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="table-container">
      <div className="search-bar">
        <input
          type="text"
          placeholder="Rechercher par nom de ligne..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <table>
        <thead>
          <tr>
            <th>Image</th>
            <th>Date</th>
            <th>Nom ligne</th>
            <th>Heure</th>
            <th>Note</th>
            <th>Délai</th>
            <th>Responsable</th>
            <th>Agent</th>
            <th>Détails</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((l) => (
            <tr key={l.id}>
              <td data-label="Image">
                {l.image ? (
                  <img src={`http://localhost:3000${l.image}`} alt="" className="ligne-image" />
                ) : (
                  <span className="no-image">-</span>
                )}
              </td>
              <td data-label="Date">{new Date(l.controleDate?.dateControle).toLocaleDateString('fr-FR')}</td>
              <td data-label="Ligne">{l.nomLigne}</td>
              <td data-label="Heure">{l.heure || '-'}</td>
              <td data-label="Note">
                <span className={`note-badge ${l.note}`}>{l.note}</span>
              </td>
              <td data-label="Délai">{l.delais} min</td>
              <td data-label="Responsable">{l.responsable}</td>
              <td data-label="Agent">{l.agent?.firstName} {l.agent?.lastName}</td>
              <td data-label="Détails" className="details-cell">{l.details}</td>
              <td data-label="Actions">
                <div className="actions-cell">
                  <button className="btn-icon-sm" onClick={() => setViewLigne(l)} title="Voir les détails">
                    <Eye size={16} />
                  </button>
                  {onEdit && (
                    <button className="btn btn-secondary btn-sm" onClick={() => onEdit(l)}>
                      Modifier
                    </button>
                  )}
                  <button
                    className="btn-icon-sm btn-icon-danger"
                    onClick={() => handleDelete(l.id)}
                    title="Supprimer"
                    disabled={deletingId === l.id}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && (
        <div className="empty-state">Aucune ligne trouvée</div>
      )}
      {viewLigne && <LigneDetailModal ligne={viewLigne} onClose={() => setViewLigne(null)} />}
    </div>
  );
};

const HistoriqueTab: React.FC = () => {
  const [historique, setHistorique] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await qualityAPI.getHistoriqueAgents();
        setHistorique(response.data);
      } catch (err) {
        toast.error('Erreur');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="tab-content">
      {/* Summary bar */}
      <div className="hist-summary-bar">
        <div className="hist-summary-item">
          <Users size={16} />
          <span><strong>{historique.length}</strong> agents</span>
        </div>
        <div className="hist-summary-item">
          <ClipboardList size={16} />
          <span><strong>{historique.reduce((a, h) => a + h.totalLignes, 0)}</strong> lignes au total</span>
        </div>
      </div>

      <div className="hist-grid">
        {historique.map((h, i) => {
          const vert = h.lignes.filter((l: LigneControle) => l.note === 'vert').length;
          const jaune = h.lignes.filter((l: LigneControle) => l.note === 'jaune').length;
          const rouge = h.lignes.filter((l: LigneControle) => l.note === 'rouge').length;
          const total = h.totalLignes || 1;
          const isExpanded = expanded === h.agent.id;

          return (
            <div key={h.agent.id} className={`hist-card ${isExpanded ? 'hist-expanded' : ''}`} style={{ animationDelay: `${i * 80}ms` }}>
              {/* Header */}
              <div className="hist-card-header" onClick={() => setExpanded(isExpanded ? null : h.agent.id)}>
                <div className="hist-avatar">
                  {h.agent.profileImage ? (
                    <img src={`http://localhost:3000${h.agent.profileImage}`} alt="" />
                  ) : (
                    <span>{h.agent.firstName[0]}{h.agent.lastName[0]}</span>
                  )}
                </div>
                <div className="hist-agent-info">
                  <h3>{h.agent.firstName} {h.agent.lastName}</h3>
                  <span className="hist-matricule">{h.agent.matricule}</span>
                </div>
                <div className="hist-card-right">
                  <div className="hist-total-badge">
                    <span className="hist-total-val">{h.totalLignes}</span>
                    <span className="hist-total-lbl">lignes</span>
                  </div>
                  <ChevronRight size={18} className={`hist-chevron ${isExpanded ? 'rotated' : ''}`} />
                </div>
              </div>

              {/* Quality progress bar */}
              <div className="hist-progress-track">
                <div className="hist-progress-seg hist-prog-vert" style={{ width: `${(vert / total) * 100}%` }} />
                <div className="hist-progress-seg hist-prog-jaune" style={{ width: `${(jaune / total) * 100}%` }} />
                <div className="hist-progress-seg hist-prog-rouge" style={{ width: `${(rouge / total) * 100}%` }} />
              </div>
              <div className="hist-progress-legend">
                <span><span className="hist-dot vert" /> {vert} vert</span>
                <span><span className="hist-dot jaune" /> {jaune} jaune</span>
                <span><span className="hist-dot rouge" /> {rouge} rouge</span>
              </div>

              {/* Expandable lignes list */}
              {isExpanded && (
                <div className="hist-lignes-list">
                  <div className="hist-lignes-header">
                    <span>Ligne</span>
                    <span>Date</span>
                    <span>Note</span>
                    <span>Durée</span>
                  </div>
                  {h.lignes.map((l: LigneControle) => (
                    <div key={l.id} className="hist-ligne-row">
                      <span className="hist-ligne-name">{l.nomLigne}</span>
                      <span className="hist-ligne-date">{new Date(l.controleDate?.dateControle).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
                      <span className={`rapport-note-chip ${l.note}`} style={{ fontSize: '11px', padding: '2px 8px' }}>{l.note}</span>
                      <span className="hist-ligne-durée">{l.delais} min</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {historique.length === 0 && (
        <div className="ov-empty">
          <Users size={32} />
          <p>Aucun agent trouvé</p>
        </div>
      )}
    </div>
  );
};

const AgentsTab: React.FC = () => {
  const [agents, setAgents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => { loadAgents(); }, []);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const res = await authAPI.getMyAgents();
      setAgents(res.data);
    } catch { toast.error('Erreur chargement agents'); }
    setLoading(false);
  };

  const handleApprove = async (agentId: string) => {
    try {
      await authAPI.approveAgent(agentId);
      toast.success('Agent approuve');
      loadAgents();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const handleReject = async (agentId: string) => {
    try {
      await authAPI.rejectAgent(agentId);
      toast.success('Agent rejete');
      loadAgents();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const pendingAgents = agents.filter(a => !a.isApprovedBySuperviseur);
  const approvedAgents = agents.filter(a => a.isApprovedBySuperviseur);

  if (loading) return <div className="ag-loading"><div className="ag-spinner" /><p>Chargement...</p></div>;

  const AgentCard = ({ agent, isPending }: { agent: User; isPending: boolean }) => {
    const colors = isPending
      ? { bg: '#fffbeb', border: '#fde68a', accent: '#f59e0b', badge: '#fef3c7', badgeText: '#92400e', ring: '#fcd34d' }
      : { bg: '#f0fdf4', border: '#bbf7d0', accent: '#22c55e', badge: '#dcfce7', badgeText: '#166534', ring: '#86efac' };

    return (
      <div className="ag-card" style={{ background: colors.bg, borderColor: colors.border }}>
        {/* Top accent line */}
        <div className="ag-card-accent" style={{ background: colors.accent }} />

        <div className="ag-card-body">
          {/* Avatar + Name + Status */}
          <div className="ag-card-top">
            <div className="ag-avatar" style={{ background: colors.badge, color: colors.accent, borderColor: colors.ring }}>
              {agent.profileImage ? (
                <img src={`http://localhost:3000${agent.profileImage}`} alt="" />
              ) : (
                <span>{agent.firstName?.[0]}{agent.lastName?.[0]}</span>
              )}
            </div>
            <div className="ag-card-name">
              <h4>{agent.firstName} {agent.lastName}</h4>
              <span className="ag-badge" style={{ background: colors.badge, color: colors.badgeText, borderColor: colors.accent }}>
                {isPending ? 'En attente' : 'Actif'}
              </span>
            </div>
          </div>

          {/* Info Grid */}
          <div className="ag-info-grid">
            <div className="ag-info-item">
              <span className="ag-info-label">Matricule</span>
              <span className="ag-info-value">{agent.matricule}</span>
            </div>
            <div className="ag-info-item">
              <span className="ag-info-label">Email</span>
              <span className="ag-info-value">{agent.email}</span>
            </div>
            <div className="ag-info-item">
              <span className="ag-info-label">Role</span>
              <span className="ag-info-value">Agent Qualite</span>
            </div>
            <div className="ag-info-item">
              <span className="ag-info-label">Inscription</span>
              <span className="ag-info-value">{new Date(agent.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>

          {/* Actions */}
          {isPending && (
            <div className="ag-card-actions">
              <button className="ag-btn ag-btn-approve" onClick={() => handleApprove(agent.id)}>
                <UserCheck size={14} /> Approuver
              </button>
              <button className="ag-btn ag-btn-reject" onClick={() => handleReject(agent.id)}>
                <UserX size={14} /> Rejeter
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="tab-content ag-tab">
      {/* Header */}
      <div className="ag-header">
        <div>
          <h2 className="ag-title">Mes Agents</h2>
          <p className="ag-subtitle">Gerez les agents de votre equipe qualite</p>
        </div>
      </div>

      {/* Superviseur Code Banner */}
      {user?.superviseurCode && (
        <div className="ag-code-banner">
          <div className="ag-code-icon"><Key size={20} /></div>
          <div className="ag-code-info">
            <span className="ag-code-label">Votre code superviseur</span>
            <span className="ag-code-value">{user.superviseurCode}</span>
            <span className="ag-code-hint">Partagez ce code avec vos agents pour qu'ils puissent s'inscrire</span>
          </div>
          <button className="ag-code-copy" onClick={async () => { const ok = await copyToClipboard(user.superviseurCode!); toast.success(ok ? 'Code copie' : 'Erreur de copie'); }}>
            <Copy size={14} /> Copier
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="ag-stats">
        <div className="ag-stat-card ag-stat-total">
          <Users size={20} />
          <div><span className="ag-stat-val">{agents.length}</span><span className="ag-stat-lbl">Total</span></div>
        </div>
        <div className="ag-stat-card ag-stat-active">
          <UserCheck size={20} />
          <div><span className="ag-stat-val">{approvedAgents.length}</span><span className="ag-stat-lbl">Approuves</span></div>
        </div>
        <div className="ag-stat-card ag-stat-pending">
          <UserX size={20} />
          <div><span className="ag-stat-val">{pendingAgents.length}</span><span className="ag-stat-lbl">En attente</span></div>
        </div>
      </div>

      {/* Pending */}
      {pendingAgents.length > 0 && (
        <div className="ag-section">
          <h3 className="ag-section-title ag-section-pending">
            <Clock size={16} /> En attente d'approbation ({pendingAgents.length})
          </h3>
          <div className="ag-cards-grid">
            {pendingAgents.map(agent => <AgentCard key={agent.id} agent={agent} isPending={true} />)}
          </div>
        </div>
      )}

      {/* Approved */}
      <div className="ag-section">
        <h3 className="ag-section-title ag-section-approved">
          <CheckCircle size={16} /> Agents approuves ({approvedAgents.length})
        </h3>
        {approvedAgents.length > 0 ? (
          <div className="ag-cards-grid">
            {approvedAgents.map(agent => <AgentCard key={agent.id} agent={agent} isPending={false} />)}
          </div>
        ) : (
          <div className="ag-empty">
            <Users size={40} />
            <p>Aucun agent approuve</p>
          </div>
        )}
      </div>

      {agents.length === 0 && (
        <div className="ag-empty-full">
          <Users size={48} />
          <h3>Aucun agent dans votre equipe</h3>
          <p>Partagez votre code superviseur pour que les agents puissent s'inscrire.</p>
        </div>
      )}
    </div>
  );
};

const AddLigneTab: React.FC<{ onSuccess: () => void; onEdit: (ligne: LigneControle) => void }> = ({ onSuccess, onEdit }) => {
  const [formData, setFormData] = useState({
    nomLigne: '',
    heure: '',
    note: 'vert',
    delais: '',
    responsable: '',
    details: '',
    controleDateId: '',
  });
  const [selectedDate, setSelectedDate] = useState('');
  const [dates, setDates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    qualityAPI.getAllControleDates().then((r) => setDates(r.data));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    setSelectedDate(dateValue);

    if (!dateValue) {
      setFormData({ ...formData, controleDateId: '' });
      return;
    }

    const existing = dates.find((d) => d.dateControle === dateValue);
    if (existing) {
      setFormData({ ...formData, controleDateId: existing.id });
    } else {
      try {
        const response = await qualityAPI.createControleDate({ dateControle: dateValue });
        const newDate = response.data.controleDate;
        setDates((prev) => [...prev, newDate]);
        setFormData({ ...formData, controleDateId: newDate.id });
        toast.success('Date de contrôle créée automatiquement');
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Erreur lors de la création de la date');
        setFormData({ ...formData, controleDateId: '' });
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.controleDateId) {
      toast.error('Veuillez sélectionner une date de contrôle');
      return;
    }
    setLoading(true);
    try {
      const response = await qualityAPI.createLigneControle(formData);
      const newLigne = response.data.ligne;

      if (imageFile) {
        try {
          await qualityAPI.uploadLigneImage(newLigne.id, imageFile);
        } catch {}
      }

      toast.success('Ligne ajoutée');
      setFormData({ nomLigne: '', heure: '', note: 'vert', delais: '', responsable: '', details: '', controleDateId: '' });
      setSelectedDate('');
      setImageFile(null);
      setImagePreview(null);
      onSuccess();
      onEdit({ ...newLigne, image: imageFile ? `/uploads/${imageFile.name}` : undefined });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="form-card">
      <div className="form-row">
        <div className="form-group">
          <label>Nom de la ligne</label>
          <input
            type="text"
            name="nomLigne"
            value={formData.nomLigne}
            onChange={handleChange}
            placeholder="Ex: Ligne A1"
            required
          />
        </div>
        <div className="form-group">
          <label>Heure</label>
          <input
            type="time"
            name="heure"
            value={formData.heure}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>Note</label>
          <select name="note" value={formData.note} onChange={handleChange}>
            <option value="vert">Vert</option>
            <option value="jaune">Jaune</option>
            <option value="rouge">Rouge</option>
          </select>
        </div>
        <div className="form-group">
          <label>Date de contrôle</label>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            min={today}
            required
          />
          {formData.controleDateId && (
            <small className="date-hint">Date sélectionnée</small>
          )}
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Délai (minutes)</label>
          <input
            type="text"
            name="delais"
            value={formData.delais}
            onChange={handleChange}
            placeholder="Ex: 30"
            required
          />
        </div>
        <div className="form-group">
          <label>Responsable</label>
          <input
            type="text"
            name="responsable"
            value={formData.responsable}
            onChange={handleChange}
            placeholder="Nom du responsable"
            required
          />
        </div>
      </div>
      <div className="form-group">
        <label>Détails</label>
        <textarea
          name="details"
          value={formData.details}
          onChange={handleChange}
          placeholder="Description de la ligne de contrôle"
          rows={3}
          required
        />
      </div>
      <div className="form-group">
        <label>Image (optionnel)</label>
        <div className="image-upload-area">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            ref={uploadInputRef}
            style={{ display: 'none' }}
          />
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageChange}
            ref={cameraInputRef}
            style={{ display: 'none' }}
          />
          {imagePreview ? (
            <div className="image-preview-wrap">
              <img src={imagePreview} alt="Aperçu" className="image-preview" />
              <button type="button" className="image-remove-btn" onClick={() => { setImageFile(null); setImagePreview(null); }}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <button type="button" className="image-add-btn" onClick={() => setShowImagePicker(true)}>
              <Camera size={18} />
              <span>Ajouter une image</span>
            </button>
          )}
        </div>
      </div>

      {showImagePicker && (
        <div className="modal-overlay" onClick={() => setShowImagePicker(false)}>
          <div className="modal-content image-picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Ajouter une image</h3>
              <button className="modal-close" onClick={() => setShowImagePicker(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="image-picker-options">
              <button className="image-picker-option" onClick={() => { setShowImagePicker(false); uploadInputRef.current?.click(); }}>
                <div className="image-picker-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                  </svg>
                </div>
                <div className="image-picker-text">
                  <span className="image-picker-title">Choisir depuis la galerie</span>
                  <span className="image-picker-desc">Sélectionner une photo existante</span>
                </div>
              </button>
              <button className="image-picker-option" onClick={() => { setShowImagePicker(false); cameraInputRef.current?.click(); }}>
                <div className="image-picker-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                  <Camera size={24} />
                </div>
                <div className="image-picker-text">
                  <span className="image-picker-title">Prendre une photo</span>
                  <span className="image-picker-desc">Utiliser l'appareil photo</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
      <button type="submit" className="btn btn-primary" disabled={loading}>
        <Plus size={16} /> Ajouter la ligne
      </button>
    </form>
  );
};

const EditLigneTab: React.FC<{ ligne: LigneControle; onSuccess: () => void; onCancel: () => void }> = ({ ligne, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    nomLigne: ligne.nomLigne,
    heure: ligne.heure || '',
    note: ligne.note,
    delais: ligne.delais,
    responsable: ligne.responsable,
    details: ligne.details,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    ligne.image ? `http://localhost:3000${ligne.image}` : null
  );
  const [loading, setLoading] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const editUploadRef = useRef<HTMLInputElement>(null);
  const editCameraRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await qualityAPI.updateLigneControle(ligne.id, formData);
      if (imageFile) {
        await qualityAPI.uploadLigneImage(ligne.id, imageFile);
      }
      toast.success('Ligne modifiée avec succès');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-card">
      <div className="form-row">
        <div className="form-group">
          <label>Nom de la ligne</label>
          <input type="text" name="nomLigne" value={formData.nomLigne} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Heure</label>
          <input type="time" name="heure" value={formData.heure} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Note</label>
          <select name="note" value={formData.note} onChange={handleChange}>
            <option value="vert">Vert</option>
            <option value="jaune">Jaune</option>
            <option value="rouge">Rouge</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Délai (minutes)</label>
          <input type="text" name="delais" value={formData.delais} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Responsable</label>
          <input type="text" name="responsable" value={formData.responsable} onChange={handleChange} required />
        </div>
      </div>
      <div className="form-group">
        <label>Détails</label>
        <textarea name="details" value={formData.details} onChange={handleChange} rows={3} required />
      </div>
      <div className="form-group">
        <label>Image (optionnel)</label>
        <div className="image-upload-area">
          <input type="file" accept="image/*" onChange={handleImageChange} ref={editUploadRef} style={{ display: 'none' }} />
          <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} ref={editCameraRef} style={{ display: 'none' }} />
          {imagePreview ? (
            <div className="image-preview-wrap">
              <img src={imagePreview} alt="Aperçu" className="image-preview" />
              <button type="button" className="image-remove-btn" onClick={() => { setImageFile(null); setImagePreview(null); }}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <button type="button" className="image-add-btn" onClick={() => setShowImagePicker(true)}>
              <Camera size={18} />
              <span>Ajouter une image</span>
            </button>
          )}
        </div>
      </div>

      {showImagePicker && (
        <div className="modal-overlay" onClick={() => setShowImagePicker(false)}>
          <div className="modal-content image-picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Ajouter une image</h3>
              <button className="modal-close" onClick={() => setShowImagePicker(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="image-picker-options">
              <button className="image-picker-option" onClick={() => { setShowImagePicker(false); editUploadRef.current?.click(); }}>
                <div className="image-picker-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                  </svg>
                </div>
                <div className="image-picker-text">
                  <span className="image-picker-title">Choisir depuis la galerie</span>
                  <span className="image-picker-desc">Sélectionner une photo existante</span>
                </div>
              </button>
              <button className="image-picker-option" onClick={() => { setShowImagePicker(false); editCameraRef.current?.click(); }}>
                <div className="image-picker-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                  <Camera size={24} />
                </div>
                <div className="image-picker-text">
                  <span className="image-picker-title">Prendre une photo</span>
                  <span className="image-picker-desc">Utiliser l'appareil photo</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          <Plus size={16} /> Enregistrer
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </form>
  );
};

const LigneDetailModal: React.FC<{ ligne: LigneControle; onClose: () => void }> = ({ ligne, onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Détails de la ligne</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          {ligne.image && (
            <div className="modal-image">
              <img src={`http://localhost:3000${ligne.image}`} alt={ligne.nomLigne} />
            </div>
          )}
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Nom de la ligne</span>
              <span className="detail-value">{ligne.nomLigne}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Heure</span>
              <span className="detail-value">{ligne.heure || '-'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Note</span>
              <span className={`note-badge ${ligne.note}`}>{ligne.note}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Délai</span>
              <span className="detail-value">{ligne.delais} min</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Responsable</span>
              <span className="detail-value">{ligne.responsable}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Agent</span>
              <span className="detail-value">{ligne.agent?.firstName} {ligne.agent?.lastName}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Date de contrôle</span>
              <span className="detail-value">{new Date(ligne.controleDate?.dateControle).toLocaleDateString('fr-FR')}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Créé le</span>
              <span className="detail-value">{new Date(ligne.createdAt).toLocaleString('fr-FR')}</span>
            </div>
          </div>
          <div className="detail-item full-width">
            <span className="detail-label">Détails</span>
            <span className="detail-value">{ligne.details}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const RapportTab: React.FC = () => {
  const [debutDate, setDebutDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rapport, setRapport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [animatedIn, setAnimatedIn] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await qualityAPI.getRapport({ debutDate, endDate });
      setRapport(response.data);
      setSearch('');
      setAnimatedIn(false);
      setTimeout(() => setAnimatedIn(true), 100);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const filteredDetails = rapport?.details?.filter((d: any) =>
    search
      ? d.nomLigne?.toLowerCase().includes(search.toLowerCase()) ||
        d.responsable?.toLowerCase().includes(search.toLowerCase()) ||
        d.agent?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
        d.agent?.lastName?.toLowerCase().includes(search.toLowerCase())
      : true
  ) || [];

  const stats = (() => {
    const total = filteredDetails.length;
    if (total === 0) return { total: 0, vert: 0, jaune: 0, rouge: 0, minutes: 0, pctVert: 0, pctJaune: 0, pctRouge: 0, agents: 0, lignes: 0 };
    const vert = filteredDetails.filter((d: any) => d.note === 'vert').length;
    const jaune = filteredDetails.filter((d: any) => d.note === 'jaune').length;
    const rouge = filteredDetails.filter((d: any) => d.note === 'rouge').length;
    const minutes = filteredDetails.reduce((acc: number, d: any) => {
      const min = parseInt(d.delais, 10);
      return acc + (isNaN(min) ? 0 : min);
    }, 0);
    const agentSet = new Set(filteredDetails.map((d: any) => d.agent?.id));
    const ligneSet = new Set(filteredDetails.map((d: any) => d.nomLigne));
    return {
      total,
      vert, jaune, rouge, minutes,
      pctVert: total > 0 ? Math.round((vert / total) * 100) : 0,
      pctJaune: total > 0 ? Math.round((jaune / total) * 100) : 0,
      pctRouge: total > 0 ? Math.round((rouge / total) * 100) : 0,
      agents: agentSet.size,
      lignes: ligneSet.size,
    };
  })();

  const donutData = [
    { label: 'Conforme', value: stats.pctVert, color: '#22c55e', count: stats.vert },
    { label: 'À surveiller', value: stats.pctJaune, color: '#f59e0b', count: stats.jaune },
    { label: 'Non conforme', value: stats.pctRouge, color: '#ef4444', count: stats.rouge },
  ];

  const minutesByLine = (() => {
    const map: Record<string, number> = {};
    filteredDetails.forEach((d: any) => {
      const min = parseInt(d.delais, 10);
      if (!isNaN(min)) {
        map[d.nomLigne] = (map[d.nomLigne] || 0) + min;
      }
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  })();
  const maxMinutes = minutesByLine.length > 0 ? Math.max(...minutesByLine.map((m) => m[1])) : 1;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const exportRapportPDF = () => {
    if (!rapport) return;
    const doc = new jsPDF('landscape');

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 297, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Rapport Qualité', 14, 12);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${formatDate(rapport.periode.debut)} — ${formatDate(rapport.periode.fin)}`, 14, 20);

    // KPIs
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: ${stats.total}`, 14, 38);
    doc.text(`Vert: ${stats.vert} (${stats.pctVert}%)`, 70, 38);
    doc.text(`Jaune: ${stats.jaune} (${stats.pctJaune}%)`, 140, 38);
    doc.text(`Rouge: ${stats.rouge} (${stats.pctRouge}%)`, 210, 38);
    doc.text(`Minutes: ${stats.minutes} min`, 14, 46);

    // Table header
    const startY = 56;
    doc.setFillColor(241, 245, 249);
    doc.rect(14, startY, 269, 8, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('Note', 16, startY + 5.5);
    doc.text('Ligne', 40, startY + 5.5);
    doc.text('Agent', 90, startY + 5.5);
    doc.text('Responsable', 135, startY + 5.5);
    doc.text('Durée', 185, startY + 5.5);
    doc.text('Date', 210, startY + 5.5);
    doc.text('Détails', 240, startY + 5.5);

    // Table rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    let y = startY + 12;
    const pageHeight = 200;

    filteredDetails.forEach((d: any, i: number) => {
      if (y > pageHeight) {
        doc.addPage();
        y = 20;
      }

      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 4, 269, 8, 'F');
      }

      doc.setTextColor(30, 41, 59);
      doc.text(d.note?.toUpperCase() || '-', 16, y + 1);
      doc.text(d.nomLigne || '-', 40, y + 1);
      doc.text(`${d.agent?.firstName || ''} ${d.agent?.lastName || ''}`.trim() || '-', 90, y + 1);
      doc.text(d.responsable || '-', 135, y + 1);

      // Duration pill
      doc.setFillColor(240, 249, 255);
      doc.roundedRect(183, y - 3, 20, 6, 2, 2, 'F');
      doc.setTextColor(37, 99, 235);
      doc.text(`${d.delais} min`, 186, y + 1);

      doc.setTextColor(100, 116, 139);
      doc.text(formatDate(d.createdAt), 210, y + 1);
      doc.text((d.details || '-').substring(0, 30), 240, y + 1);

      y += 8;
    });

    doc.save('rapport_qualite.pdf');
    toast.success('Fichier PDF téléchargé');
  };

  const kpis = [
    { label: 'Total lignes', value: stats.total, icon: Layers, color: '#2563eb', bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)' },
    { label: "Minutes d'arrêt", value: `${stats.minutes} min`, icon: Timer, color: '#f59e0b', bg: 'linear-gradient(135deg, #fffbeb, #fef3c7)' },
    { label: 'Agents concernés', value: stats.agents, icon: Activity, color: '#8b5cf6', bg: 'linear-gradient(135deg, #f5f3ff, #ede9fe)' },
    { label: 'Lignes inspectées', value: stats.lignes, icon: Target, color: '#06b6d4', bg: 'linear-gradient(135deg, #ecfeff, #cffafe)' },
  ];

  return (
    <div className="tab-content">
      <form onSubmit={handleGenerate} className="rapport-form">
        <div className="rapport-form-inner">
          <div className="rapport-form-icon">
            <BarChart3 size={20} />
          </div>
          <div className="rapport-form-fields">
            <div className="rapport-field">
              <label>Date début</label>
              <input
                type="date"
                value={debutDate}
                onChange={(e) => setDebutDate(e.target.value)}
                required
              />
            </div>
            <div className="rapport-field-separator">
              <ArrowRight size={16} />
            </div>
            <div className="rapport-field">
              <label>Date fin</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>
          <button type="submit" className="rapport-generate-btn" disabled={loading}>
            {loading ? (
              <span className="rapport-btn-loading" />
            ) : (
              <>
                <BarChart3 size={16} />
                Générer le rapport
              </>
            )}
          </button>
        </div>
      </form>

      {rapport && (
        <div className={`rapport-results ${animatedIn ? 'animate-in' : ''}`}>
          {/* Period badge + Export */}
          <div className="rapport-top-row">
            <div className="rapport-period-badge">
              <Calendar size={14} />
              <span>{formatDate(rapport.periode.debut)} — {formatDate(rapport.periode.fin)}</span>
              {search && <span className="rapport-filter-badge">Filtre actif: "{search}"</span>}
            </div>
            <button className="rapport-export-btn" onClick={exportRapportPDF}>
              <Download size={14} /> Exporter PDF
            </button>
          </div>

          {/* Search */}
          <div className="rapport-search">
            <div className="rapport-search-icon">
              <Search size={16} />
            </div>
            <input
              type="text"
              placeholder="Rechercher par ligne, responsable ou agent..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="rapport-search-clear" onClick={() => setSearch('')}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* KPI Cards */}
          <div className="rapport-kpis">
            {kpis.map((kpi, i) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={kpi.label}
                  className="rapport-kpi-card"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="rapport-kpi-icon" style={{ background: kpi.bg, color: kpi.color }}>
                    <Icon size={22} />
                  </div>
                  <div className="rapport-kpi-content">
                    <span className="rapport-kpi-value">{kpi.value}</span>
                    <span className="rapport-kpi-label">{kpi.label}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Charts row */}
          <div className="rapport-charts-grid">
            {/* Donut Chart */}
            <div className="rapport-chart-card">
              <div className="rapport-chart-header">
                <h4>Répartition Qualité</h4>
                <span className="rapport-chart-subtitle">{stats.total} lignes analysées</span>
              </div>
              <div className="rapport-donut-wrapper">
                <svg viewBox="0 0 120 120" className="rapport-donut">
                  {(() => {
                    const radius = 40;
                    const circumference = 2 * Math.PI * radius;
                    let offset = 0;
                    return donutData.map((d, i) => {
                      const dashLen = (d.value / 100) * circumference;
                      const dashGap = circumference - dashLen;
                      const el = (
                        <circle
                          key={i}
                          cx="60"
                          cy="60"
                          r={radius}
                          fill="none"
                          stroke={d.color}
                          strokeWidth="16"
                          strokeDasharray={`${dashLen} ${dashGap}`}
                          strokeDashoffset={-offset}
                          strokeLinecap="round"
                          className="rapport-donut-segment"
                          style={{ animationDelay: `${i * 200 + 300}ms` }}
                        />
                      );
                      offset += dashLen;
                      return el;
                    });
                  })()}
                </svg>
                <div className="rapport-donut-center">
                  <span className="rapport-donut-total">{stats.total}</span>
                  <span className="rapport-donut-label">Total</span>
                </div>
              </div>
              <div className="rapport-donut-legend">
                {donutData.map((d, i) => (
                  <div key={i} className="rapport-legend-item">
                    <span className="rapport-legend-dot" style={{ background: d.color }} />
                    <span className="rapport-legend-label">{d.label}</span>
                    <span className="rapport-legend-value">{d.value}%</span>
                    <span className="rapport-legend-count">({d.count})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bar Chart */}
            <div className="rapport-chart-card">
              <div className="rapport-chart-header">
                <h4>Minutes d'arrêt par ligne</h4>
                <span className="rapport-chart-subtitle">Top {minutesByLine.length} lignes</span>
              </div>
              {minutesByLine.length > 0 ? (
                <div className="rapport-bars">
                  {minutesByLine.map(([name, min], i) => (
                    <div key={name} className="rapport-bar-row" style={{ animationDelay: `${i * 60 + 200}ms` }}>
                      <div className="rapport-bar-label" title={name}>
                        <span className="rapport-bar-name">{name}</span>
                        <span className="rapport-bar-minutes">{min} min</span>
                      </div>
                      <div className="rapport-bar-track">
                        <div
                          className="rapport-bar-fill"
                          style={{
                            width: `${(min / maxMinutes) * 100}%`,
                            background: min > maxMinutes * 0.7 ? '#ef4444' : min > maxMinutes * 0.4 ? '#f59e0b' : '#22c55e',
                            animationDelay: `${i * 60 + 400}ms`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rapport-chart-empty">Aucune donnée de temps disponible</div>
              )}
            </div>
          </div>

          {/* Detail Table */}
          <div className="rapport-chart-card rapport-detail-card">
            <div className="rapport-chart-header">
              <h4>Détails des contrôles</h4>
              <span className="rapport-chart-subtitle">{filteredDetails.length} résultat(s)</span>
            </div>
            {filteredDetails.length > 0 ? (
              <div className="rapport-detail-table">
                <div className="rapport-detail-header-row">
                  <span className="rd-col rd-note">Note</span>
                  <span className="rd-col rd-ligne">Ligne</span>
                  <span className="rd-col rd-agent">Agent</span>
                  <span className="rd-col rd-resp">Responsable</span>
                  <span className="rd-col rd-delais">Durée</span>
                  <span className="rd-col rd-date">Date</span>
                </div>
                {filteredDetails.map((d: any, i: number) => (
                  <div
                    key={d.id}
                    className="rapport-detail-row"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <span className="rd-col rd-note">
                      <span className={`rapport-note-chip ${d.note}`}>
                        {d.note === 'vert' && <CheckCircle2 size={12} />}
                        {d.note === 'jaune' && <AlertCircle size={12} />}
                        {d.note === 'rouge' && <XCircle size={12} />}
                        {d.note}
                      </span>
                    </span>
                    <span className="rd-col rd-ligne">{d.nomLigne}</span>
                    <span className="rd-col rd-agent">
                      <div className="rapport-agent-cell">
                        <div className="rapport-agent-avatar">{d.agent?.firstName?.[0]}{d.agent?.lastName?.[0]}</div>
                        <span>{d.agent?.firstName} {d.agent?.lastName}</span>
                      </div>
                    </span>
                    <span className="rd-col rd-resp">{d.responsable}</span>
                    <span className="rd-col rd-delais">
                      <span className="rapport-duration-badge">{d.delais} min</span>
                    </span>
                    <span className="rd-col rd-date">{formatDate(d.createdAt)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rapport-chart-empty">
                <Search size={32} />
                <p>Aucune ligne ne correspond à votre recherche</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const AiReportsTab: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0 });
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { loadReports(); loadStats(); }, [page]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await reportAPI.getReports(page, 10);
      setReports(res.data.items);
    } catch { toast.error('Erreur chargement rapports'); }
    setLoading(false);
  };

  const loadStats = async () => {
    try {
      const res = await reportAPI.getStats();
      setStats(res.data);
    } catch {}
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await reportAPI.generate();
      toast.success(res.data.message);
      loadReports(); loadStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur de generation');
    } finally { setGenerating(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce rapport ?')) return;
    setDeletingId(id);
    try {
      await reportAPI.deleteReport(id);
      toast.success('Rapport supprime');
      if (selectedReport?.id === id) setSelectedReport(null);
      loadReports(); loadStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur de suppression');
    } finally { setDeletingId(null); }
  };

  const handleDownloadPdf = async (id: string) => {
    try {
      const blob = await reportAPI.downloadPdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-qualite-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch { toast.error('Erreur lors du telechargement du PDF'); }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  const formatTime = (d: string) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="tab-content">
      <div className="cd-stats-row">
        <div className="cd-stat">
          <div className="cd-stat-icon cd-stat-total"><Zap size={18} /></div>
          <div className="cd-stat-info">
            <span className="cd-stat-val">{stats.total}</span>
            <span className="cd-stat-lbl">Total rapports</span>
          </div>
        </div>
        <div className="cd-stat">
          <div className="cd-stat-icon cd-stat-active"><CheckCircle size={18} /></div>
          <div className="cd-stat-info">
            <span className="cd-stat-val">{stats.sent}</span>
            <span className="cd-stat-lbl">Envoyes</span>
          </div>
        </div>
        <div className="cd-stat">
          <div className="cd-stat-icon cd-stat-inactive"><XCircle size={18} /></div>
          <div className="cd-stat-info">
            <span className="cd-stat-val">{stats.failed}</span>
            <span className="cd-stat-lbl">Echoues</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Rapports IA Quotidiens</h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Generes automatiquement chaque minute (mode test)</p>
        </div>
        <button className="cd-create-btn" onClick={handleGenerate} disabled={generating}>
          {generating ? <span className="rapport-btn-loading" /> : <><Zap size={16} /> Generer maintenant</>}
        </button>
      </div>

      {selectedReport && (
        <div className="rapport-results animate-in" style={{ marginBottom: 24 }}>
          <div className="rapport-top-row">
            <div className="rapport-period-badge">
              <Calendar size={14} />
              <span>Rapport du {formatDate(selectedReport.reportDate)}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="rapport-export-btn" onClick={() => handleDownloadPdf(selectedReport.id)}>
                <Download size={14} /> PDF
              </button>
              <button className="rapport-export-btn" style={{ background: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }} onClick={() => handleDelete(selectedReport.id)}>
                <Trash2 size={14} /> Supprimer
              </button>
              <button className="rapport-export-btn" onClick={() => setSelectedReport(null)}>
                <X size={14} /> Fermer
              </button>
            </div>
          </div>
          <div style={{ padding: 20 }}>
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
              <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 14, textAlign: 'center', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>{selectedReport.kpis.vertCount}</div>
                <div style={{ fontSize: 11, color: '#16a34a', textTransform: 'uppercase', fontWeight: 600 }}>Conformes</div>
                <div style={{ fontSize: 12, color: '#86efac', marginTop: 2 }}>{selectedReport.kpis.vertPercent}%</div>
              </div>
              <div style={{ background: '#fefce8', borderRadius: 10, padding: 14, textAlign: 'center', border: '1px solid #fde68a' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#ca8a04' }}>{selectedReport.kpis.jauneCount}</div>
                <div style={{ fontSize: 11, color: '#ca8a04', textTransform: 'uppercase', fontWeight: 600 }}>A surveiller</div>
                <div style={{ fontSize: 12, color: '#fde047', marginTop: 2 }}>{selectedReport.kpis.jaunePercent}%</div>
              </div>
              <div style={{ background: '#fef2f2', borderRadius: 10, padding: 14, textAlign: 'center', border: '1px solid #fecaca' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#dc2626' }}>{selectedReport.kpis.rougeCount}</div>
                <div style={{ fontSize: 11, color: '#dc2626', textTransform: 'uppercase', fontWeight: 600 }}>Critiques</div>
                <div style={{ fontSize: 12, color: '#fca5a5', marginTop: 2 }}>{selectedReport.kpis.rougePercent}%</div>
              </div>
              <div style={{ background: '#eff6ff', borderRadius: 10, padding: 14, textAlign: 'center', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#2563eb' }}>{selectedReport.kpis.totalMinutes}</div>
                <div style={{ fontSize: 11, color: '#2563eb', textTransform: 'uppercase', fontWeight: 600 }}>Minutes arret</div>
                <div style={{ fontSize: 12, color: '#93c5fd', marginTop: 2 }}>{selectedReport.kpis.totalLignes} lignes</div>
              </div>
            </div>
            {/* Summary */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, fontSize: 13, lineHeight: 1.7, color: '#475569' }}>
                {selectedReport.summary}
              </div>
            </div>
            {/* AI Analysis */}
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#1e293b' }}>Analyse IA</h4>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-line', color: '#334155' }}>
                {selectedReport.aiAnalysis}
              </div>
            </div>
            {/* Recommendations */}
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#1e293b' }}>Recommandations</h4>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 16, fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-line', color: '#1e40af' }}>
                {selectedReport.recommendations}
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="loading">Chargement...</div> : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Statut</th>
                <th>Lignes</th>
                <th>Vert</th>
                <th>Jaune</th>
                <th>Rouge</th>
                <th>Minutes</th>
                <th>Envoye a</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td data-label="Date">{formatDate(r.reportDate)}</td>
                  <td data-label="Statut">
                    <span className={`note-badge ${r.status === 'sent' ? 'vert' : r.status === 'failed' ? 'rouge' : 'jaune'}`}>
                      {r.status === 'sent' ? 'Envoye' : r.status === 'failed' ? 'Echoue' : 'Genere'}
                    </span>
                  </td>
                  <td data-label="Lignes">{r.kpis.totalLignes}</td>
                  <td data-label="Vert">{r.kpis.vertCount} ({r.kpis.vertPercent}%)</td>
                  <td data-label="Jaune">{r.kpis.jauneCount} ({r.kpis.jaunePercent}%)</td>
                  <td data-label="Rouge">{r.kpis.rougeCount} ({r.kpis.rougePercent}%)</td>
                  <td data-label="Minutes">{r.kpis.totalMinutes} min</td>
                  <td data-label="Envoye a">{r.emailRecipient || '---'}</td>
                  <td data-label="Actions">
                    <div className="actions-cell">
                      <button className="btn-icon-sm" onClick={() => setSelectedReport(r)} title="Voir le rapport">
                        <Eye size={16} />
                      </button>
                      <button className="btn-icon-sm" onClick={() => handleDownloadPdf(r.id)} title="Telecharger PDF">
                        <Download size={16} />
                      </button>
                      <button
                        className="btn-icon-sm btn-icon-danger"
                        onClick={() => handleDelete(r.id)}
                        title="Supprimer"
                        disabled={deletingId === r.id}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                  Aucun rapport genere. Cliquez sur "Generer maintenant" pour creer le premier rapport.
                </td></tr>
              )}
            </tbody>
          </table>
          {stats.total > 10 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 16 }}>
              <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Precedent</button>
              <span style={{ padding: '6px 12px', fontSize: 13, color: '#64748b' }}>Page {page}</span>
              <button className="btn btn-secondary btn-sm" disabled={reports.length < 10} onClick={() => setPage(p => p + 1)}>Suivant</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
