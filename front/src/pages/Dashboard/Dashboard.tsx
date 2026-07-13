import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { qualityAPI } from '../../api';
import { LigneControle, NoteQualite } from '../../types';
import { toast } from 'react-hot-toast';
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
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user, logout, isSuperviseur, isAgent } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [lignes, setLignes] = useState<LigneControle[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Qualité</h2>
          <span className="role-badge">
            {isSuperviseur ? 'Superviseur' : 'Agent'}
          </span>
        </div>
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <LayoutDashboard size={18} /> Vue d'ensemble
          </button>
          {isSuperviseur && (
            <>
              <button
                className={`nav-item ${activeTab === 'controle-dates' ? 'active' : ''}`}
                onClick={() => setActiveTab('controle-dates')}
              >
                <Calendar size={18} /> Dates de contrôle
              </button>
              <button
                className={`nav-item ${activeTab === 'all-lignes' ? 'active' : ''}`}
                onClick={() => setActiveTab('all-lignes')}
              >
                <List size={18} /> Toutes les lignes
              </button>
              <button
                className={`nav-item ${activeTab === 'historique' ? 'active' : ''}`}
                onClick={() => setActiveTab('historique')}
              >
                <Clock size={18} /> Historique agents
              </button>
            </>
          )}
          {isAgent && (
            <button
              className={`nav-item ${activeTab === 'mes-lignes' ? 'active' : ''}`}
              onClick={() => setActiveTab('mes-lignes')}
            >
              <List size={18} /> Mes lignes
            </button>
          )}
          <button
            className={`nav-item ${activeTab === 'add-ligne' ? 'active' : ''}`}
            onClick={() => setActiveTab('add-ligne')}
          >
            <Plus size={18} /> Ajouter une ligne
          </button>
          {isSuperviseur && (
            <button
              className={`nav-item ${activeTab === 'rapport' ? 'active' : ''}`}
              onClick={() => setActiveTab('rapport')}
            >
              <BarChart3 size={18} /> Rapport
            </button>
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <span>{user?.firstName} {user?.lastName}</span>
            <small>{user?.matricule}</small>
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
            {activeTab === 'controle-dates' && 'Dates de contrôle'}
            {activeTab === 'all-lignes' && 'Toutes les lignes'}
            {activeTab === 'mes-lignes' && 'Mes lignes'}
            {activeTab === 'historique' && 'Historique agents'}
            {activeTab === 'add-ligne' && 'Ajouter une ligne'}
            {activeTab === 'rapport' && 'Rapport qualité'}
          </h1>
        </header>

        <div className="content-body">
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
          {activeTab === 'all-lignes' && isSuperviseur && (
            <LignesTab lignes={lignes} loading={loading} />
          )}
          {activeTab === 'mes-lignes' && isAgent && (
            <LignesTab lignes={lignes} loading={loading} />
          )}
          {activeTab === 'historique' && isSuperviseur && <HistoriqueTab />}
          {activeTab === 'add-ligne' && <AddLigneTab onSuccess={fetchLignes} />}
          {activeTab === 'rapport' && <RapportTab />}
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
                <td>{new Date(d.dateControle).toLocaleDateString('fr-FR')}</td>
                <td>{d.createdBy?.firstName} {d.createdBy?.lastName}</td>
                <td>
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

const LignesTab: React.FC<{ lignes: LigneControle[]; loading: boolean }> = ({
  lignes,
  loading,
}) => {
  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Nom ligne</th>
            <th>Heure</th>
            <th>Note</th>
            <th>Délai</th>
            <th>Responsable</th>
            <th>Agent</th>
            <th>Détails</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l.id}>
              <td>{new Date(l.controleDate?.dateControle).toLocaleDateString('fr-FR')}</td>
              <td>{l.nomLigne}</td>
              <td>{l.heure || '-'}</td>
              <td>
                <span className={`note-badge ${l.note}`}>{l.note}</span>
              </td>
              <td>{l.delais} min</td>
              <td>{l.responsable}</td>
              <td>{l.agent?.firstName} {l.agent?.lastName}</td>
              <td className="details-cell">{l.details}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {lignes.length === 0 && (
        <div className="empty-state">Aucune ligne trouvée</div>
      )}
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

const AddLigneTab: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.controleDateId) {
      toast.error('Veuillez sélectionner une date de contrôle');
      return;
    }
    setLoading(true);
    try {
      await qualityAPI.createLigneControle(formData);
      toast.success('Ligne ajoutée');
      setFormData({ nomLigne: '', heure: '', note: 'vert', delais: '', responsable: '', details: '', controleDateId: '' });
      setSelectedDate('');
      onSuccess();
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
      <button type="submit" className="btn btn-primary" disabled={loading}>
        <Plus size={16} /> Ajouter la ligne
      </button>
    </form>
  );
};

const RapportTab: React.FC = () => {
  const [debutDate, setDebutDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rapport, setRapport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await qualityAPI.getRapport({ debutDate, endDate });
      setRapport(response.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

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
        <div className="rapport-result">
          <div className="rapport-summary">
            <div className="summary-card">
              <h4>Total lignes</h4>
              <span className="big-number">{rapport.totalLignes}</span>
            </div>
            <div className="summary-card">
              <h4>Minutes d'arrêt</h4>
              <span className="big-number">{rapport.minutesArretCumulees} min</span>
            </div>
          </div>

          <div className="rapport-charts">
            <div className="chart-card">
              <h4>Répartition Qualité (%)</h4>
              <div className="pie-chart">
                <div
                  className="pie-segment vert"
                  style={{ flex: rapport.repartitionPourcentage.vert }}
                />
                <div
                  className="pie-segment jaune"
                  style={{ flex: rapport.repartitionPourcentage.jaune }}
                />
                <div
                  className="pie-segment rouge"
                  style={{ flex: rapport.repartitionPourcentage.rouge }}
                />
              </div>
              <div className="chart-legend">
                <span><span className="dot vert"></span> Vert {rapport.repartitionPourcentage.vert}%</span>
                <span><span className="dot jaune"></span> Jaune {rapport.repartitionPourcentage.jaune}%</span>
                <span><span className="dot rouge"></span> Rouge {rapport.repartitionPourcentage.rouge}%</span>
              </div>
            </div>

            <div className="chart-card">
              <h4>Détails</h4>
              <div className="rapport-details">
                {rapport.details.map((d: any) => (
                  <div key={d.id} className="detail-row">
                    <span className={`note-badge ${d.note}`}>{d.note}</span>
                    <span>{d.delais} min</span>
                    <span>{d.responsable}</span>
                    <span>{d.agent.firstName} {d.agent.lastName}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
