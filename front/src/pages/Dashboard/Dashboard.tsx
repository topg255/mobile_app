import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { qualityAPI } from '../../api';
import { LigneControle, NoteQualite } from '../../types';
import { toast } from 'react-hot-toast';
import Chat from '../../components/Chat';
import {
  LayoutDashboard,
  Plus,
  List,
  BarChart3,
  LogOut,
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
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Dashboard: React.FC = () => {
  const { user, logout, isSuperviseur, isAgent } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [lignes, setLignes] = useState<LigneControle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [editingLigne, setEditingLigne] = useState<LigneControle | null>(null);
  const [lignesSubTab, setLignesSubTab] = useState<'mes-lignes' | 'agent-lignes'>('mes-lignes');

  useEffect(() => {
    fetchLignes();
  }, []);

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

  const stats = getStats();

  const closeSidebar = useCallback(() => setMobileOpen(false), []);

  const handleTab = (tab: string) => {
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
          <button
            className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => handleTab('messages')}
          >
            <MessageSquare size={18} /> <span>Messages</span>
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <span>{user?.firstName} {user?.lastName}</span>
            <small>{user?.matricule}</small>
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
            <h1>Tableau de bord</h1>
            <span className="role-badge">
              {isSuperviseur ? 'Superviseur Qualité' : 'Agent Qualité'}
            </span>
          </div>
          <div className="top-bar-right">
            {user?.profileImage ? (
              <img src={`http://localhost:3000${user.profileImage}`} alt="" className="user-avatar-img" />
            ) : (
              <div className="user-avatar">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
            )}
          </div>
        </div>
        <div className="content-body">
          <div className="welcome-banner">
            <h2>Bonjour <span>{user?.firstName}</span> !</h2>
            <p>Voici un aperçu de votre activité qualité</p>
            <div className="welcome-stats">
              <div className="welcome-stat">
                <div className="welcome-stat-value">{stats.total}</div>
                <div className="welcome-stat-label"><span className="stat-dot total"></span> Lignes</div>
              </div>
              <div className="welcome-stat">
                <div className="welcome-stat-value">{stats.vert}</div>
                <div className="welcome-stat-label"><span className="stat-dot vert"></span> Vert</div>
              </div>
              <div className="welcome-stat">
                <div className="welcome-stat-value">{stats.jaune}</div>
                <div className="welcome-stat-label"><span className="stat-dot jaune"></span> Jaune</div>
              </div>
              <div className="welcome-stat">
                <div className="welcome-stat-value">{stats.rouge}</div>
                <div className="welcome-stat-label"><span className="stat-dot rouge"></span> Rouge</div>
              </div>
            </div>
          </div>

        {activeTab === 'overview' && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon total">
                  <List size={24} />
                </div>
                <div className="stat-info">
                  <h3>{stats.total}</h3>
                  <p>Total lignes</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon vert">
                  <CheckCircle size={24} />
                </div>
                <div className="stat-info">
                  <h3>{stats.vert}</h3>
                  <p>Vert</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon jaune">
                  <AlertTriangle size={24} />
                </div>
                <div className="stat-info">
                  <h3>{stats.jaune}</h3>
                  <p>Jaune</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon rouge">
                  <XCircle size={24} />
                </div>
                <div className="stat-info">
                  <h3>{stats.rouge}</h3>
                  <p>Rouge</p>
                </div>
              </div>
              <div className="stat-card full-width">
                <div className="stat-icon time">
                  <Clock size={24} />
                </div>
                <div className="stat-info">
                  <h3>{stats.totalMinutes} min</h3>
                  <p>Minutes d'arrêt cumulées</p>
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
            />
          )}
          {activeTab === 'mes-lignes' && isAgent && (
            <LignesTab lignes={lignes} loading={loading} onEdit={(ligne) => { setEditingLigne(ligne); setActiveTab('edit-ligne'); }} />
          )}
          {activeTab === 'historique' && isSuperviseur && <HistoriqueTab />}
          {activeTab === 'add-ligne' && <AddLigneTab onSuccess={fetchLignes} onEdit={(ligne) => { setEditingLigne(ligne); setActiveTab('edit-ligne'); }} />}
          {activeTab === 'edit-ligne' && editingLigne && (
            <EditLigneTab ligne={editingLigne} onSuccess={() => { fetchLignes(); setActiveTab('mes-lignes'); }} onCancel={() => setActiveTab('mes-lignes')} />
          )}
          {activeTab === 'rapport' && <RapportTab />}
          {activeTab === 'messages' && <Chat />}
        </div>
      </main>
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
      toast.success('Date créée');
      setNewDate('');
      fetchDates();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tab-content">
      <form onSubmit={handleCreate} className="inline-form">
        <div className="form-group">
          <label>Date de contrôle</label>
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          <Plus size={16} /> Ajouter
        </button>
      </form>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Créé par</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {dates.map((d) => (
              <tr key={d.id}>
                <td data-label="Date">{new Date(d.dateControle).toLocaleDateString('fr-FR')}</td>
                <td data-label="Créé par">{d.createdBy?.firstName} {d.createdBy?.lastName}</td>
                <td data-label="Statut">
                  <span className={`badge ${d.isActive ? 'active' : 'inactive'}`}>
                    {d.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const LignesSuperviseurTab: React.FC<{
  lignes: LigneControle[];
  loading: boolean;
  subTab: 'mes-lignes' | 'agent-lignes';
  onSubTabChange: (tab: 'mes-lignes' | 'agent-lignes') => void;
  user: any;
}> = ({ lignes, loading, subTab, onSubTabChange, user }) => {
  const [viewLigne, setViewLigne] = useState<LigneControle | null>(null);
  const [search, setSearch] = useState('');

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
                    <button className="btn-icon-sm" onClick={() => setViewLigne(l)} title="Voir les détails">
                      <Eye size={16} />
                    </button>
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

const LignesTab: React.FC<{ lignes: LigneControle[]; loading: boolean; onEdit?: (ligne: LigneControle) => void }> = ({
  lignes,
  loading,
  onEdit,
}) => {
  const [search, setSearch] = useState('');
  const [viewLigne, setViewLigne] = useState<LigneControle | null>(null);
  const filtered = lignes.filter(
    (l) => l.nomLigne?.toLowerCase().includes(search.toLowerCase())
  );

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
    <div className="historique-grid">
      {historique.map((h) => (
        <div key={h.agent.id} className="historique-card">
          <div className="card-header">
            <h3>{h.agent.firstName} {h.agent.lastName}</h3>
            <span className="matricule">{h.agent.matricule}</span>
          </div>
          <div className="card-stats">
            <span>{h.totalLignes} lignes</span>
          </div>
          <div className="card-lignes">
            {h.lignes.slice(0, 5).map((l: LigneControle) => (
              <div key={l.id} className="ligne-mini">
                <span className={`note-dot ${l.note}`}></span>
                <span>{new Date(l.controleDate?.dateControle).toLocaleDateString('fr-FR')}</span>
                <span>{l.delais} min</span>
              </div>
            ))}
            {h.lignes.length > 5 && (
              <span className="more">+{h.lignes.length - 5} lignes</span>
            )}
          </div>
        </div>
      ))}
      {historique.length === 0 && (
        <div className="empty-state">Aucun agent trouvé</div>
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
            id="image-upload"
            style={{ display: 'none' }}
          />
          <label htmlFor="image-upload" className="image-upload-label">
            {imagePreview ? (
              <img src={imagePreview} alt="Aperçu" className="image-preview" />
            ) : (
              <span><Camera size={14} /> Cliquer pour ajouter une image</span>
            )}
          </label>
          {imageFile && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setImageFile(null); setImagePreview(null); }}>
              Supprimer l'image
            </button>
          )}
        </div>
      </div>
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
          <input type="file" accept="image/*" onChange={handleImageChange} id="edit-image-upload" style={{ display: 'none' }} />
          <label htmlFor="edit-image-upload" className="image-upload-label">
            {imagePreview ? (
              <img src={imagePreview} alt="Aperçu" className="image-preview" />
            ) : (
              <span><Camera size={14} /> Cliquer pour ajouter une image</span>
            )}
          </label>
          {imageFile && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setImageFile(null); setImagePreview(ligne.image ? `http://localhost:3000${ligne.image}` : null); }}>
              Supprimer l'image
            </button>
          )}
        </div>
      </div>
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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await qualityAPI.getRapport({ debutDate, endDate });
      setRapport(response.data);
      setSearch('');
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

  const filteredStats = (() => {
    const total = filteredDetails.length;
    if (total === 0) return { total: 0, vert: 0, jaune: 0, rouge: 0, minutes: 0, pctVert: 0, pctJaune: 0, pctRouge: 0 };
    const vert = filteredDetails.filter((d: any) => d.note === 'vert').length;
    const jaune = filteredDetails.filter((d: any) => d.note === 'jaune').length;
    const rouge = filteredDetails.filter((d: any) => d.note === 'rouge').length;
    const minutes = filteredDetails.reduce((acc: number, d: any) => {
      const min = parseInt(d.delais, 10);
      return acc + (isNaN(min) ? 0 : min);
    }, 0);
    return {
      total,
      vert, jaune, rouge, minutes,
      pctVert: Math.round((vert / total) * 100 * 100) / 100,
      pctJaune: Math.round((jaune / total) * 100 * 100) / 100,
      pctRouge: Math.round((rouge / total) * 100 * 100) / 100,
    };
  })();

  return (
    <div className="tab-content">
      <form onSubmit={handleGenerate} className="inline-form">
        <div className="form-group">
          <label>Date début</label>
          <input
            type="date"
            value={debutDate}
            onChange={(e) => setDebutDate(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Date fin</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          <BarChart3 size={16} /> Générer
        </button>
      </form>

      {rapport && (
        <>
          <div className="search-bar" style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Filtrer par nom de ligne, responsable ou agent..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="rapport-result">
            <div className="rapport-summary">
              <div className="summary-card">
                <h4>Total lignes</h4>
                <span className="big-number">{filteredStats.total}</span>
              </div>
              <div className="summary-card">
                <h4>Minutes d'arrêt</h4>
                <span className="big-number">{filteredStats.minutes} min</span>
              </div>
            </div>

            <div className="rapport-charts">
              <div className="chart-card">
                <h4>Répartition Qualité (%)</h4>
                <div className="pie-chart">
                  <div
                    className="pie-segment vert"
                    style={{ flex: filteredStats.pctVert || 1 }}
                  />
                  <div
                    className="pie-segment jaune"
                    style={{ flex: filteredStats.pctJaune || 1 }}
                  />
                  <div
                    className="pie-segment rouge"
                    style={{ flex: filteredStats.pctRouge || 1 }}
                  />
                </div>
                <div className="chart-legend">
                  <span><span className="dot vert"></span> Vert {filteredStats.pctVert}%</span>
                  <span><span className="dot jaune"></span> Jaune {filteredStats.pctJaune}%</span>
                  <span><span className="dot rouge"></span> Rouge {filteredStats.pctRouge}%</span>
                </div>
              </div>

              <div className="chart-card">
                <h4>Détails {search && `(${filteredDetails.length} résultat(s))`}</h4>
                <div className="rapport-details">
                  {filteredDetails.map((d: any) => (
                    <div key={d.id} className="detail-row">
                      <span className={`note-badge ${d.note}`}>{d.note}</span>
                      <span>{d.delais} min</span>
                      <span>{d.responsable}</span>
                      <span>{d.agent.firstName} {d.agent.lastName}</span>
                    </div>
                  ))}
                  {filteredDetails.length === 0 && (
                    <div className="empty-state">Aucune ligne ne correspond à votre recherche</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
