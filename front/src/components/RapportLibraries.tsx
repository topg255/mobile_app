import React, { useState, useEffect } from 'react';
import { reportAPI } from '../api';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../hooks/useConfirm';
import { SignatureBadge } from './Signature/SignatureBadge';
import './Signature/Signature.css';
import {
  Folder,
  FolderOpen,
  FileText,
  Download,
  Trash2,
  Eye,
  X,
  Calendar,
  User,
  Hash,
  Clock,
  ChevronLeft,
  Loader2,
  BarChart3,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

interface Report {
  id: string;
  reportDate: string;
  summary: string;
  kpis: any;
  aiAnalysis: string;
  recommendations: string;
  status: string;
  emailSentAt: string | null;
  createdAt: string;
  superviseur: { id: string; firstName: string; lastName: string; matricule: string };
  isSigned?: boolean;
  signedAt?: string | null;
  signerName?: string | null;
}

interface ReportStats {
  total: number;
  sent: number;
  failed: number;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  generated: { label: 'Genere', color: '#d97706', bg: '#fef3c7' },
  sent: { label: 'Envoye', color: '#16a34a', bg: '#dcfce7' },
  failed: { label: 'Echoue', color: '#dc2626', bg: '#fee2e2' },
};

const RapportLibraries: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReportStats>({ total: 0, sent: 0, failed: 0 });
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'detail'>('grid');
  const confirm = useConfirm();

  useEffect(() => {
    loadReports();
    loadStats();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await reportAPI.getReports(1, 50);
      setReports(res.data.items);
    } catch {
      toast.error('Erreur lors du chargement des rapports');
    }
    setLoading(false);
  };

  const loadStats = async () => {
    try {
      const res = await reportAPI.getStats();
      setStats(res.data);
    } catch {}
  };

  const handleOpenFolder = (report: Report) => {
    setSelectedReport(report);
    setView('detail');
  };

  const handleViewPdf = async (report: Report) => {
    setPdfLoading(true);
    try {
      const blob = await reportAPI.downloadPdf(report.id);
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch {
      toast.error('Erreur lors du chargement du PDF');
    }
    setPdfLoading(false);
  };

  const handleClosePdf = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Supprimer ce rapport ?',
      message: 'Le rapport qualité sera definitivement supprime. Cette action est irreversible.',
      variant: 'danger',
      confirmLabel: 'Oui, supprimer',
    });
    if (!ok) return;
    setDeletingId(id);
    try {
      await reportAPI.deleteReport(id);
      toast.success('Rapport supprime');
      setReports((prev) => prev.filter((r) => r.id !== id));
      if (selectedReport?.id === id) {
        setSelectedReport(null);
        setView('grid');
      }
      loadStats();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
    setDeletingId(null);
  };

  const handleBack = () => {
    setView('grid');
    setSelectedReport(null);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

  const getReference = (report: Report) => {
    const kpis = report.kpis || {};
    const ligne =
      kpis.criticalLignes?.length > 0
        ? kpis.criticalLignes[0].nom?.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10).toUpperCase()
        : 'GEN';
    const agent =
      kpis.topAgent && kpis.topAgent !== 'Aucun'
        ? kpis.topAgent.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10).toUpperCase()
        : 'GEN';
    const idx = reports.findIndex((r) => r.id === report.id) + 1;
    return `REF-LEONI-${ligne}-${agent}-${String(idx).padStart(3, '0')}`;
  };

  // ── PDF Fullscreen Viewer ──
  if (pdfUrl) {
    return (
      <div className="rl-pdf-overlay">
        <div className="rl-pdf-header">
          <button className="rl-pdf-close" onClick={handleClosePdf}>
            <X size={20} />
          </button>
          <span className="rl-pdf-title">
            {selectedReport ? getReference(selectedReport) : 'Rapport'}
          </span>
          <a
            href={pdfUrl}
            download={`rapport-${selectedReport?.reportDate || 'qualite'}.pdf`}
            className="rl-pdf-download"
          >
            <Download size={16} /> Telecharger
          </a>
        </div>
        <iframe src={pdfUrl} className="rl-pdf-frame" title="Rapport PDF" />
      </div>
    );
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="rl-loading">
        <Loader2 size={32} className="rl-spin" />
        <p>Chargement des rapports...</p>
      </div>
    );
  }

  // ── Detail View ──
  if (view === 'detail' && selectedReport) {
    const ref = getReference(selectedReport);
    const st = STATUS_MAP[selectedReport.status] || STATUS_MAP.generated;
    const kpis = selectedReport.kpis || {};

    return (
      <div className="tab-content rl-detail">
        <button className="rl-back-btn" onClick={handleBack}>
          <ChevronLeft size={18} /> Retour aux dossiers
        </button>

        <div className="rl-detail-header">
          <div className="rl-detail-folder">
            <FolderOpen size={32} color="#3b82f6" />
          </div>
          <div className="rl-detail-info">
            <h2 className="rl-detail-ref">{ref}</h2>
            <div className="rl-detail-meta">
              <span><Calendar size={13} /> {formatDate(selectedReport.reportDate)}</span>
              <span><User size={13} /> {selectedReport.superviseur.firstName} {selectedReport.superviseur.lastName}</span>
              <span style={{ color: st.color, background: st.bg }} className="rl-status-badge">{st.label}</span>
            </div>
          </div>
          <div className="rl-detail-actions">
            <button className="rl-btn rl-btn-primary" onClick={() => handleViewPdf(selectedReport)} disabled={pdfLoading}>
              {pdfLoading ? <Loader2 size={16} className="rl-spin" /> : <Eye size={16} />} Voir PDF
            </button>
            <SignatureBadge
              reportId={selectedReport.id}
              isSigned={!!selectedReport.isSigned}
              signedAt={selectedReport.signedAt || undefined}
              signerName={selectedReport.signerName || undefined}
              onSign={() => {
                loadReports();
                setSelectedReport((prev) => (prev ? { ...prev, isSigned: true, signedAt: new Date().toISOString() } : prev));
              }}
            />
            <button className="rl-btn rl-btn-danger" onClick={() => handleDelete(selectedReport.id)} disabled={deletingId === selectedReport.id}>
              <Trash2 size={16} /> Supprimer
            </button>
          </div>
        </div>

        <div className="rl-detail-kpis">
          <div className="rl-kpi-card rl-kpi-green">
            <div className="rl-kpi-value">{kpis.vertCount || 0}</div>
            <div className="rl-kpi-label">Conformes</div>
            <div className="rl-kpi-pct">{kpis.vertPercent || 0}%</div>
          </div>
          <div className="rl-kpi-card rl-kpi-amber">
            <div className="rl-kpi-value">{kpis.jauneCount || 0}</div>
            <div className="rl-kpi-label">A surveiller</div>
            <div className="rl-kpi-pct">{kpis.jaunePercent || 0}%</div>
          </div>
          <div className="rl-kpi-card rl-kpi-red">
            <div className="rl-kpi-value">{kpis.rougeCount || 0}</div>
            <div className="rl-kpi-label">Critiques</div>
            <div className="rl-kpi-pct">{kpis.rougePercent || 0}%</div>
          </div>
          <div className="rl-kpi-card rl-kpi-blue">
            <div className="rl-kpi-value">{kpis.totalMinutes || 0}</div>
            <div className="rl-kpi-label">Minutes arret</div>
          </div>
        </div>

        <div className="rl-detail-section">
          <h3><BarChart3 size={16} /> Resume</h3>
          <p>{selectedReport.summary}</p>
        </div>

        {selectedReport.aiAnalysis && (
          <div className="rl-detail-section">
            <h3><CheckCircle size={16} /> Analyse IA</h3>
            <div className="rl-detail-text">{selectedReport.aiAnalysis}</div>
          </div>
        )}

        {selectedReport.recommendations && (
          <div className="rl-detail-section">
            <h3><AlertTriangle size={16} /> Recommandations</h3>
            <div className="rl-detail-text">{selectedReport.recommendations}</div>
          </div>
        )}
      </div>
    );
  }

  // ── Grid View (Folders) ──
  return (
    <div className="tab-content rl-grid">
      <div className="rl-header">
        <div>
          <h2 className="rl-title">Rapport Libraries</h2>
          <p className="rl-subtitle">Tous les rapports generes par l'intelligence artificielle</p>
        </div>
      </div>

      <div className="rl-stats-row">
        <div className="rl-stat-card">
          <div className="rl-stat-icon rl-stat-total"><Folder size={18} /></div>
          <div className="rl-stat-info">
            <span className="rl-stat-val">{stats.total}</span>
            <span className="rl-stat-lbl">Total dossiers</span>
          </div>
        </div>
        <div className="rl-stat-card">
          <div className="rl-stat-icon rl-stat-sent"><CheckCircle size={18} /></div>
          <div className="rl-stat-info">
            <span className="rl-stat-val">{stats.sent}</span>
            <span className="rl-stat-lbl">Envoyes</span>
          </div>
        </div>
        <div className="rl-stat-card">
          <div className="rl-stat-icon rl-stat-failed"><AlertTriangle size={18} /></div>
          <div className="rl-stat-info">
            <span className="rl-stat-val">{stats.failed}</span>
            <span className="rl-stat-lbl">Echoues</span>
          </div>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="rl-empty">
          <Folder size={48} color="#cbd5e1" />
          <p>Aucun rapport genere</p>
        </div>
      ) : (
        <div className="rl-folders-grid">
          {reports.map((report) => {
            const ref = getReference(report);
            const st = STATUS_MAP[report.status] || STATUS_MAP.generated;
            const kpis = report.kpis || {};

            return (
              <div key={report.id} className="rl-folder-card" onClick={() => handleOpenFolder(report)}>
                <div className="rl-folder-icon">
                  <Folder size={40} color="#3b82f6" />
                </div>
                <div className="rl-folder-info">
                  <div className="rl-folder-ref">{ref}</div>
                  <div className="rl-folder-date">
                    <Clock size={11} /> {formatDate(report.reportDate)}
                  </div>
                  <div className="rl-folder-kpis">
                    <span className="rl-mini-dot" style={{ background: '#22c55e' }} /> {kpis.vertCount || 0}
                    <span className="rl-mini-dot" style={{ background: '#f59e0b' }} /> {kpis.jauneCount || 0}
                    <span className="rl-mini-dot" style={{ background: '#ef4444' }} /> {kpis.rougeCount || 0}
                  </div>
                </div>
                <span className="rl-folder-status" style={{ color: st.color, background: st.bg }}>
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RapportLibraries;
