import { useState, useEffect, useCallback } from 'react';
import { capaAPI } from '../../api';
import {
  Capa,
  CapaStats,
  CapaStatus,
  CapaPriority,
  CapaTypeValue,
} from '../../types';
import { toast } from 'react-hot-toast';
import CapaFormModal from '../../components/Capa/CapaFormModal';
import CapaDetailDrawer from '../../components/Capa/CapaDetailDrawer';
import {
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  BarChart3,
  FileText,
  Eye,
  Loader2,
} from 'lucide-react';

const STATUS_CONFIG: Record<CapaStatus, { bg: string; color: string; label: string }> = {
  ouvert: { bg: '#FEF3C7', color: '#92400E', label: 'Ouvert' },
  en_analyse: { bg: '#DBEAFE', color: '#1E40AF', label: 'En analyse' },
  en_cours: { bg: '#EDE9FE', color: '#4C1D95', label: 'En cours' },
  en_verification: { bg: '#CCFBF1', color: '#134E4A', label: 'En vérification' },
  cloture: { bg: '#DCFCE7', color: '#14532D', label: 'Clôturé' },
  annule: { bg: '#F3F4F6', color: '#1F2937', label: 'Annulé' },
};

const PRIORITY_CONFIG: Record<CapaPriority, { bg: string; color: string; label: string }> = {
  faible: { bg: '#F3F4F6', color: '#374151', label: 'Faible' },
  moyenne: { bg: '#DBEAFE', color: '#1E40AF', label: 'Moyenne' },
  haute: { bg: '#FEF3C7', color: '#92400E', label: 'Haute' },
  critique: { bg: '#FEE2E2', color: '#991B1B', label: 'Critique' },
};

const STATUS_FILTERS: { value: CapaStatus | ''; label: string }[] = [
  { value: '', label: 'Tous' },
  { value: 'ouvert', label: 'Ouvert' },
  { value: 'en_analyse', label: 'En analyse' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'en_verification', label: 'Vérification' },
  { value: 'cloture', label: 'Clôturé' },
  { value: 'annule', label: 'Annulé' },
];

export default function CapaPage() {
  const [capas, setCapas] = useState<Capa[]>([]);
  const [stats, setStats] = useState<CapaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<CapaStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<CapaPriority | ''>('');

  const fetchData = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const [capasRes, statsRes] = await Promise.all([
        capaAPI.getAll(params),
        capaAPI.getStats(),
      ]);
      setCapas(capasRes.data);
      setStats(statsRes.data);
    } catch {
      toast.error('Erreur lors du chargement des CAPAs');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <Loader2 size={28} className="animate-spin" style={{ color: '#94a3b8' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 20, maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
      {/* Colonne gauche */}
      <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 12,
            border: 'none',
            backgroundColor: '#2563EB',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Plus size={18} /> Nouveau CAPA
        </button>

        {stats && (
          <>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ textAlign: 'center', padding: 8 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>{stats.ouverts}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Ouverts</div>
                </div>
                <div style={{ textAlign: 'center', padding: 8 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#DC2626' }}>{stats.capasEnRetard.length}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>En retard</div>
                </div>
                <div style={{ textAlign: 'center', padding: 8 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#16A34A' }}>{stats.cloturesThisMois}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Clôturés ce mois</div>
                </div>
                <div style={{ textAlign: 'center', padding: 8 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#2563EB' }}>{stats.tauxResolution}%</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Taux résolution</div>
                </div>
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                Filtres
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setStatusFilter(f.value as CapaStatus | '')}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      background: statusFilter === f.value ? '#2563EB' : '#f8fafc',
                      color: statusFilter === f.value ? '#fff' : '#475569',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {stats.capasEnRetard.length > 0 && (
              <div style={{ background: '#FEF2F2', borderRadius: 12, border: '1px solid #FECACA', padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#991B1B', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={14} /> En retard
                </div>
                {stats.capasEnRetard.slice(0, 3).map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    style={{ padding: '6px 0', borderBottom: '1px solid #FECACA', cursor: 'pointer', fontSize: 12, color: '#991B1B' }}
                  >
                    <div style={{ fontWeight: 600 }}>{c.reference}</div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>{c.titre.substring(0, 35)}...</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Colonne droite */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
              {capas.length} CAPA{capas.length !== 1 ? 's' : ''}
            </span>
          </div>

          {capas.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
              <AlertTriangle size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
              <p style={{ fontSize: 14 }}>Aucun CAPA trouvé</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {['Référence', 'Titre', 'Ligne', 'Statut', 'Priorité', 'Échéance', 'Actions', ''].map((h) => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {capas.map((c) => {
                    const overdue = c.enRetard;
                    const st = STATUS_CONFIG[c.status] || STATUS_CONFIG.ouvert;
                    const pr = PRIORITY_CONFIG[c.priority] || PRIORITY_CONFIG.moyenne;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedId(c.id)}
                        style={{
                          borderBottom: '1px solid #f8fafc',
                          cursor: 'pointer',
                          background: overdue ? '#FEF2F2' : undefined,
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={(e) => { if (!overdue) (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
                        onMouseLeave={(e) => { if (!overdue) (e.currentTarget as HTMLElement).style.background = ''; }}
                      >
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600, color: '#2563EB', fontSize: 12 }}>{c.reference}</td>
                        <td style={{ padding: '10px 14px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.titre}</td>
                        <td style={{ padding: '10px 14px', color: '#64748b', fontSize: 12 }}>{c.nomLigne}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: st.bg, color: st.color }}>{st.label}</span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: pr.bg, color: pr.color }}>{pr.label}</span>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: overdue ? '#DC2626' : '#475569', fontWeight: overdue ? 600 : 400 }}>
                          {formatDate(c.dateEcheance)}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b' }}>
                          {c.terminees !== undefined && c.totalActions !== undefined && (
                            <span>{c.terminees}/{c.totalActions}</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedId(c.id); }}
                              style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#475569' }}
                            >
                              <Eye size={12} /> Voir
                            </button>
                            <a
                              href={capaAPI.getPdfUrl(c.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#475569', textDecoration: 'none' }}
                            >
                              <FileText size={12} /> PDF
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CapaFormModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); fetchData(); }}
        />
      )}
      {selectedId && (
        <CapaDetailDrawer
          capaId={selectedId}
          open={!!selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={fetchData}
        />
      )}
    </div>
  );
}