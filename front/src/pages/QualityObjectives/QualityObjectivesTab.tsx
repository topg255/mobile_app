import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { objectivesAPI } from '../../api';
import {
  ObjectiveCategory,
  ObjectiveStatus,
  ObjectivePriority,
  RiskLevel,
  QualityObjective,
  ObjectivesDashboard,
  ObjectiveHistoryRow,
} from '../../types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Timer,
  Camera,
  ClipboardList,
  ShieldCheck,
  Zap,
  Activity,
  BarChart3,
  Calendar,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  Trophy,
  Rocket,
  Award,
  Star,
  Sparkles,
  Gauge,
  Layers,
  Medal,
  Info,
  Flag,
} from 'lucide-react';
import './QualityObjectives.css';
import { useConfirm } from '../../hooks/useConfirm';

type IconComponent = React.ComponentType<{ size?: number | string; className?: string; color?: string }>;

const CATEGORY_META: Record<ObjectiveCategory, { label: string; icon: IconComponent; color: string }> = {
  [ObjectiveCategory.COMPLIANCE]: { label: 'Conformité', icon: ShieldCheck, color: '#2563eb' },
  [ObjectiveCategory.CRITICAL_INCIDENTS]: { label: 'Incidents critiques', icon: AlertTriangle, color: '#ef4444' },
  [ObjectiveCategory.DOWNTIME]: { label: 'Arrêts', icon: Timer, color: '#f59e0b' },
  [ObjectiveCategory.RESOLUTION_TIME]: { label: 'Temps de résolution', icon: Clock, color: '#8b5cf6' },
  [ObjectiveCategory.INSPECTIONS]: { label: 'Inspections', icon: ClipboardList, color: '#0ea5e9' },
  [ObjectiveCategory.PRODUCTIVITY]: { label: 'Productivité', icon: Zap, color: '#10b981' },
  [ObjectiveCategory.PHOTOS]: { label: 'Photos attachées', icon: Camera, color: '#ec4899' },
  [ObjectiveCategory.TRAINING]: { label: 'Formation', icon: Star, color: '#06b6d4' },
  [ObjectiveCategory.CUSTOM]: { label: 'Personnalisé', icon: Gauge, color: '#64748b' },
};

const STATUS_META: Record<ObjectiveStatus, { label: string; color: string; bg: string }> = {
  [ObjectiveStatus.ACTIVE]: { label: 'Actif', color: '#2563eb', bg: '#eff6ff' },
  [ObjectiveStatus.AT_RISK]: { label: 'À risque', color: '#d97706', bg: '#fffbeb' },
  [ObjectiveStatus.COMPLETED]: { label: 'Atteint', color: '#059669', bg: '#ecfdf5' },
  [ObjectiveStatus.FAILED]: { label: 'Échoué', color: '#dc2626', bg: '#fef2f2' },
};

const RISK_META: Record<RiskLevel, { label: string; color: string; bg: string }> = {
  [RiskLevel.LOW]: { label: 'Faible', color: '#059669', bg: '#ecfdf5' },
  [RiskLevel.MEDIUM]: { label: 'Moyen', color: '#d97706', bg: '#fffbeb' },
  [RiskLevel.HIGH]: { label: 'Élevé', color: '#ea580c', bg: '#fff7ed' },
  [RiskLevel.CRITICAL]: { label: 'Critique', color: '#dc2626', bg: '#fef2f2' },
};

const PRIORITY_META: Record<ObjectivePriority, { label: string; color: string }> = {
  [ObjectivePriority.LOW]: { label: 'Basse', color: '#94a3b8' },
  [ObjectivePriority.MEDIUM]: { label: 'Moyenne', color: '#2563eb' },
  [ObjectivePriority.HIGH]: { label: 'Haute', color: '#f59e0b' },
  [ObjectivePriority.CRITICAL]: { label: 'Critique', color: '#dc2626' },
};

const BADGE_ICONS: Record<string, IconComponent> = {
  goal_achieved: Trophy,
  three_months_success: Calendar,
  best_performance: Rocket,
  fast_recovery: Activity,
  quality_champion: Award,
};

const RISK_PIE_COLORS: Record<string, string> = {
  Faible: '#10b981',
  Moyen: '#f59e0b',
  Élevé: '#f97316',
  Critique: '#ef4444',
};

const defaultForm = {
  title: '',
  description: '',
  category: ObjectiveCategory.COMPLIANCE,
  targetValue: '',
  unit: '',
  priority: ObjectivePriority.MEDIUM,
  startDate: '',
  endDate: '',
  higherIsBetter: true,
  currentValue: '',
};

const todayStr = () => new Date().toISOString().split('T')[0];
const firstOfNextMonth = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 1);
  return d.toISOString().split('T')[0];
};

const daysRemaining = (endDate: string): number => {
  const end = new Date(endDate + 'T23:59:59').getTime();
  return Math.max(0, Math.ceil((end - Date.now()) / 86400000));
};

const fmt = (value: number, unit: string): string => {
  const rounded = Math.round(value * 100) / 100;
  return unit === '%' ? `${rounded}%` : `${rounded} ${unit}`.trim();
};

interface FormState {
  title: string;
  description: string;
  category: ObjectiveCategory;
  targetValue: string;
  unit: string;
  priority: ObjectivePriority;
  startDate: string;
  endDate: string;
  higherIsBetter: boolean;
  currentValue: string;
}

interface Props {
  userRole: string;
}

const QualityObjectivesTab: React.FC<Props> = ({ userRole }) => {
  const canManage = userRole === 'superviseur_qualite' || userRole === 'super_admin';
  const confirm = useConfirm();

  const [dashboard, setDashboard] = useState<ObjectivesDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [history, setHistory] = useState<ObjectiveHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<QualityObjective | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await objectivesAPI.getDashboard();
      setDashboard(res.data);
      setSelectedObjectiveId((prev) =>
        prev && res.data.objectives.some((o) => o.id === prev)
          ? prev
          : (res.data.objectives[0]?.id ?? ''),
      );
    } catch (err) {
      setError(true);
      toast.error('Erreur lors du chargement des objectifs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (!selectedObjectiveId) {
      setHistory([]);
      return;
    }
    setHistoryLoading(true);
    objectivesAPI
      .getHistory(selectedObjectiveId)
      .then((res) => setHistory(res.data))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [selectedObjectiveId]);

  // ----------------------------------------------------------------
  // Donnees des graphiques
  // ----------------------------------------------------------------

  const historyLineData = useMemo(
    () =>
      history.map((h) => ({
        day: h.recordedAt.slice(0, 10),
        Progression: Math.round(h.progress * 100) / 100,
        Probabilité: h.probability === null ? null : Math.round(h.probability * 100) / 100,
      })),
    [history],
  );

  const evolutionBarData = useMemo(
    () =>
      (dashboard?.monthlyEvolution ?? [])
        .map((m) => ({
          label: m.label,
          Progression: m.avgProgress,
          Probabilité: m.avgProbability,
        }))
        .filter((d) => d.Progression !== null || d.Probabilité !== null),
    [dashboard],
  );

  const riskPieData = useMemo(() => {
    const dist = dashboard?.riskDistribution ?? { low: 0, medium: 0, high: 0, critical: 0 };
    return [
      { name: 'Faible', value: dist.low },
      { name: 'Moyen', value: dist.medium },
      { name: 'Élevé', value: dist.high },
      { name: 'Critique', value: dist.critical },
    ].filter((d) => d.value > 0);
  }, [dashboard]);

  const selectedObjective = useMemo(
    () => dashboard?.objectives.find((o) => o.id === selectedObjectiveId) ?? null,
    [dashboard, selectedObjectiveId],
  );

  // ----------------------------------------------------------------
  // Formulaire
  // ----------------------------------------------------------------

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...defaultForm,
      startDate: todayStr(),
      endDate: firstOfNextMonth(),
    });
    setModalOpen(true);
  };

  const openEdit = (objective: QualityObjective) => {
    setEditing(objective);
    setForm({
      title: objective.title,
      description: objective.description ?? '',
      category: objective.category,
      targetValue: String(objective.targetValue),
      unit: objective.unit,
      priority: objective.priority,
      startDate: objective.startDate,
      endDate: objective.endDate,
      higherIsBetter: objective.higherIsBetter,
      currentValue: String(objective.currentValue),
    });
    setModalOpen(true);
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(form.targetValue);
    if (!form.title.trim()) return toast.error('Le titre est obligatoire');
    if (isNaN(target) || target <= 0) return toast.error('La valeur cible doit etre un nombre positif');
    if (!form.startDate || !form.endDate) return toast.error('Les dates sont obligatoires');
    if (form.endDate <= form.startDate) return toast.error('La date de fin doit etre posterieure a la date de debut');

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        targetValue: target,
        unit: form.unit.trim() || undefined,
        priority: form.priority,
        startDate: form.startDate,
        endDate: form.endDate,
        higherIsBetter: form.higherIsBetter,
        currentValue:
          form.category === ObjectiveCategory.CUSTOM
            ? parseFloat(form.currentValue) || 0
            : undefined,
      };
      if (editing) {
        await objectivesAPI.update(editing.id, payload);
        toast.success('Objectif mis a jour avec succes');
      } else {
        await objectivesAPI.create(payload);
        toast.success('Objectif cree avec succes');
      }
      setModalOpen(false);
      fetchDashboard();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (objective: QualityObjective) => {
    const ok = await confirm({
      title: "Supprimer l'objectif ?",
      message: `L'objectif "${objective.title}" sera definitivement supprime, ainsi que son historique de progression.`,
      variant: 'danger',
      confirmLabel: 'Oui, supprimer',
    });
    if (!ok) return;
    setDeletingId(objective.id);
    try {
      await objectivesAPI.remove(objective.id);
      toast.success('Objectif supprime');
      fetchDashboard();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const riskColorOf = (status: ObjectiveStatus, risk: RiskLevel) => {
    if (status === ObjectiveStatus.COMPLETED) return '#10b981';
    if (status === ObjectiveStatus.FAILED) return '#ef4444';
    return RISK_META[risk].color;
  };

  // ----------------------------------------------------------------
  // Rendu
  // ----------------------------------------------------------------

  if (loading) {
    return (
      <div className="tab-content">
        <div className="qo-loading">
          <Loader2 size={32} className="qo-spin" />
          <span>Chargement des objectifs qualite...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tab-content">
        <div className="qo-error">
          <AlertCircle size={40} />
          <h3>Impossible de charger les objectifs</h3>
          <button className="qo-retry-btn" onClick={fetchDashboard}>Reessayer</button>
        </div>
      </div>
    );
  }

  const kpis = dashboard?.kpis ?? {
    total: 0, active: 0, atRisk: 0, completed: 0, failed: 0, avgProbability: 0,
  };

  const kpiItems = [
    { label: 'Objectifs', value: kpis.total, icon: Target, color: '#2563eb' },
    { label: 'Actifs', value: kpis.active, icon: Activity, color: '#0ea5e9' },
    { label: 'À risque', value: kpis.atRisk, icon: AlertTriangle, color: '#f59e0b' },
    { label: 'Atteints', value: kpis.completed, icon: CheckCircle2, color: '#10b981' },
    { label: 'Échoués', value: kpis.failed, icon: XCircle, color: '#ef4444' },
    { label: 'Prob. moyenne', value: `${kpis.avgProbability}%`, icon: Gauge, color: '#8b5cf6' },
  ];

  return (
    <div className="tab-content qo-tab">
      {/* En-tete */}
      <div className="qo-header">
        <div className="qo-header-left">
          <div className="qo-header-icon"><Target size={22} /></div>
          <div>
            <h2 className="qo-title">Objectifs Qualité & OKR</h2>
            <p className="qo-subtitle">
              Objectifs mensuels, progression automatique et prédictions statistiques
            </p>
          </div>
        </div>
        {canManage && (
          <button className="qo-add-btn" onClick={openCreate}>
            <Plus size={18} /> Nouvel objectif
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="qo-kpi-grid">
        {kpiItems.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="qo-kpi" style={{ borderTopColor: k.color }}>
              <div className="qo-kpi-icon" style={{ background: `${k.color}18`, color: k.color }}>
                <Icon size={18} />
              </div>
              <div className="qo-kpi-info">
                <span className="qo-kpi-val">{k.value}</span>
                <span className="qo-kpi-lbl">{k.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Objectifs */}
      {dashboard?.objectives.length === 0 ? (
        <div className="qo-empty">
          <Target size={44} />
          <h3>Aucun objectif pour le moment</h3>
          <p>
            {canManage
              ? 'Créez votre premier objectif mensuel pour suivre la performance qualité.'
              : 'Aucun objectif défini par votre superviseur pour le moment.'}
          </p>
          {canManage && (
            <button className="qo-add-btn" onClick={openCreate}>
              <Plus size={18} /> Créer un objectif
            </button>
          )}
        </div>
      ) : (
        <div className="qo-grid">
          {dashboard?.objectives.map((o) => {
            const cat = CATEGORY_META[o.category];
            const status = STATUS_META[o.status];
            const risk = RISK_META[o.riskLevel];
            const CatIcon = cat.icon;
            const barColor = riskColorOf(o.status, o.riskLevel);
            const remaining = daysRemaining(o.endDate);
            const progressPct = Math.min(100, Math.max(0, o.progress));
            return (
              <div key={o.id} className="qo-card">
                <div className="qo-card-head">
                  <div className="qo-cat-chip" style={{ color: cat.color, background: `${cat.color}14` }}>
                    <CatIcon size={14} />
                    <span>{cat.label}</span>
                  </div>
                  <span className="qo-status-badge" style={{ color: status.color, background: status.bg }}>
                    {status.label}
                  </span>
                </div>

                <h3 className="qo-card-title">{o.title}</h3>
                {o.description && <p className="qo-card-desc">{o.description}</p>}

                <div className="qo-card-values">
                  <div className="qo-value">
                    <span className="qo-value-lbl">Cible</span>
                    <span className="qo-value-num">{fmt(o.targetValue, o.unit)}</span>
                  </div>
                  <div className="qo-value">
                    <span className="qo-value-lbl">Actuel</span>
                    <span className="qo-value-num">{fmt(o.currentValue, o.unit)}</span>
                  </div>
                  <div className="qo-value">
                    <span className="qo-value-lbl">Jours restants</span>
                    <span className="qo-value-num">{remaining}</span>
                  </div>
                </div>

                <div className="qo-progress">
                  <div className="qo-progress-head">
                    <span>Progression</span>
                    <span style={{ color: barColor }}>{Math.round(o.progress)}%</span>
                  </div>
                  <div className="qo-progress-bar">
                    <div
                      className="qo-progress-fill"
                      style={{ width: `${progressPct}%`, background: barColor }}
                    />
                  </div>
                </div>

                {o.status === ObjectiveStatus.ACTIVE || o.status === ObjectiveStatus.AT_RISK ? (
                  <div className="qo-prediction">
                    <div className="qo-pred-head">
                      <span className="qo-pred-label"><TrendingUp size={14} /> Prédiction fin de mois</span>
                      <span
                        className="qo-risk-chip"
                        style={{ color: risk.color, background: risk.bg }}
                      >
                        Risque {risk.label}
                      </span>
                    </div>
                    <div className="qo-pred-body">
                      <span className="qo-pred-value">
                        {o.predictedValue === null ? '—' : fmt(o.predictedValue, o.unit)}
                      </span>
                      <span className="qo-pred-prob" style={{ color: risk.color }}>
                        {o.predictionProbability === null ? '—' : `${o.predictionProbability}% de réussite`}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="qo-prediction qo-prediction-final">
                    <span>Résultat final : {fmt(o.currentValue, o.unit)} / cible {fmt(o.targetValue, o.unit)}</span>
                  </div>
                )}

                {o.recommendation && (
                  <div className="qo-reco">
                    <Info size={14} />
                    <span>{o.recommendation}</span>
                  </div>
                )}

                <div className="qo-card-foot">
                  <span className="qo-priority" style={{ color: PRIORITY_META[o.priority].color }}>
                    <Flag size={13} /> {PRIORITY_META[o.priority].label}
                  </span>
                  <span className="qo-owner">
                    {o.createdBy.firstName} {o.createdBy.lastName}
                  </span>
                  {canManage && (
                    <div className="qo-card-actions">
                      <button className="qo-icon-btn" title="Modifier" onClick={() => openEdit(o)}>
                        <Pencil size={15} />
                      </button>
                      <button
                        className="qo-icon-btn qo-icon-danger"
                        title="Supprimer"
                        onClick={() => handleDelete(o)}
                        disabled={deletingId === o.id}
                      >
                        {deletingId === o.id ? <Loader2 size={15} className="qo-spin" /> : <Trash2 size={15} />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Graphiques */}
      {(historyLineData.length > 0 || evolutionBarData.length > 0 || riskPieData.length > 0) && (
        <div className="qo-charts">
          {historyLineData.length > 0 && (
            <div className="qo-chart-card qo-chart-wide">
              <div className="qo-chart-head">
                <div>
                  <h3 className="qo-chart-title"><BarChart3 size={16} /> Évolution mensuelle</h3>
                  <p className="qo-chart-sub">{selectedObjective?.title ?? ''}</p>
                </div>
                {dashboard && dashboard.objectives.length > 1 && (
                  <select
                    className="qo-select"
                    value={selectedObjectiveId}
                    onChange={(e) => setSelectedObjectiveId(e.target.value)}
                  >
                    {dashboard.objectives.map((o) => (
                      <option key={o.id} value={o.id}>{o.title}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="qo-chart-body">
                {historyLoading ? (
                  <div className="qo-chart-empty"><Loader2 size={20} className="qo-spin" /></div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={historyLineData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <Tooltip
                        contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }}
                        formatter={(value: any) => [`${value}%`, undefined]}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="Progression" stroke="#2563eb" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="Probabilité" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 4" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}

          {evolutionBarData.length > 0 && (
            <div className="qo-chart-card">
              <div className="qo-chart-head">
                <div>
                  <h3 className="qo-chart-title"><TrendingUp size={16} /> Comparaison historique</h3>
                  <p className="qo-chart-sub">6 derniers mois</p>
                </div>
              </div>
              <div className="qo-chart-body">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={evolutionBarData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }}
                      formatter={(value: any) => [`${value}%`, undefined]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Progression" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Probabilité" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {riskPieData.length > 0 && (
            <div className="qo-chart-card">
              <div className="qo-chart-head">
                <div>
                  <h3 className="qo-chart-title"><Layers size={16} /> Répartition des risques</h3>
                  <p className="qo-chart-sub">Par objectif actif</p>
                </div>
              </div>
              <div className="qo-chart-body">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={riskPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {riskPieData.map((entry) => (
                        <Cell key={entry.name} fill={RISK_PIE_COLORS[entry.name] ?? '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Badges */}
      {(dashboard?.badges.length ?? 0) > 0 && (
        <div className="qo-badges-section">
          <h3 className="qo-chart-title"><Medal size={16} /> Badges débloqués</h3>
          <div className="qo-badges">
            {dashboard?.badges.map((b) => {
              const Icon = BADGE_ICONS[b.code] ?? Sparkles;
              return (
                <div key={b.id} className="qo-badge">
                  <div className="qo-badge-icon"><Icon size={20} /></div>
                  <div className="qo-badge-info">
                    <span className="qo-badge-name">{b.name}</span>
                    <span className="qo-badge-desc">{b.description}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal creer / modifier */}
      {modalOpen && (
        <div className="qo-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="qo-modal" onClick={(e) => e.stopPropagation()}>
            <div className="qo-modal-head">
              <h3>{editing ? 'Modifier l\'objectif' : 'Nouvel objectif'}</h3>
              <button className="qo-modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSave} className="qo-form">
              <div className="qo-form-grid">
                <label className="qo-field qo-field-full">
                  <span>Titre *</span>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setField('title', e.target.value)}
                    placeholder="Ex : Maintenir la conformité >= 95%"
                    maxLength={255}
                    required
                  />
                </label>
                <label className="qo-field qo-field-full">
                  <span>Description</span>
                  <textarea
                    value={form.description}
                    onChange={(e) => setField('description', e.target.value)}
                    placeholder="Description de l'objectif..."
                    rows={2}
                  />
                </label>
                <label className="qo-field">
                  <span>Catégorie *</span>
                  <select
                    value={form.category}
                    onChange={(e) => setField('category', e.target.value as ObjectiveCategory)}
                  >
                    {(Object.keys(CATEGORY_META) as ObjectiveCategory[]).map((c) => (
                      <option key={c} value={c}>{CATEGORY_META[c].label}</option>
                    ))}
                  </select>
                </label>
                <label className="qo-field">
                  <span>Priorité</span>
                  <select
                    value={form.priority}
                    onChange={(e) => setField('priority', e.target.value as ObjectivePriority)}
                  >
                    {(Object.keys(PRIORITY_META) as ObjectivePriority[]).map((p) => (
                      <option key={p} value={p}>{PRIORITY_META[p].label}</option>
                    ))}
                  </select>
                </label>
                <label className="qo-field">
                  <span>Valeur cible *</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.targetValue}
                    onChange={(e) => setField('targetValue', e.target.value)}
                    placeholder="Ex : 95"
                    required
                  />
                </label>
                <label className="qo-field">
                  <span>Unité</span>
                  <input
                    type="text"
                    value={form.unit}
                    onChange={(e) => setField('unit', e.target.value)}
                    placeholder={CATEGORY_META[form.category].label === 'Personnalisé' ? '' : '%'}
                    maxLength={50}
                  />
                </label>
                <label className="qo-field">
                  <span>Date de début *</span>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setField('startDate', e.target.value)}
                    required
                  />
                </label>
                <label className="qo-field">
                  <span>Date de fin *</span>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setField('endDate', e.target.value)}
                    required
                  />
                </label>
                {form.category === ObjectiveCategory.CUSTOM && (
                  <label className="qo-field qo-field-full">
                    <span>Valeur actuelle</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={form.currentValue}
                      onChange={(e) => setField('currentValue', e.target.value)}
                      placeholder="Valeur mesurée actuelle"
                    />
                  </label>
                )}
                {form.category === ObjectiveCategory.CUSTOM && (
                  <label className="qo-field qo-field-full qo-check">
                    <input
                      type="checkbox"
                      checked={form.higherIsBetter}
                      onChange={(e) => setField('higherIsBetter', e.target.checked)}
                    />
                    <span>Plus la valeur est élevée, mieux c'est</span>
                  </label>
                )}
              </div>
              <div className="qo-form-foot">
                <button type="button" className="qo-cancel-btn" onClick={() => setModalOpen(false)}>
                  Annuler
                </button>
                <button type="submit" className="qo-save-btn" disabled={saving}>
                  {saving ? <Loader2 size={16} className="qo-spin" /> : <CheckCircle2 size={16} />}
                  {editing ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QualityObjectivesTab;
