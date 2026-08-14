import { useState, useEffect, useRef } from 'react';
import { capaAPI } from '../../api';
import {
  Capa,
  CapaStatus,
  CapaAction,
  CapaCommentaire,
  ActionStatusValue,
  ActionTypeValue,
  User,
} from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../hooks/useConfirm';
import {
  X,
  Loader2,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Send,
  FileText,
  Trash2,
} from 'lucide-react';

interface Props {
  capaId: number | null;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

const STATUS_STEPS: { key: CapaStatus; label: string }[] = [
  { key: 'ouvert', label: 'Ouvert' },
  { key: 'en_analyse', label: 'En analyse' },
  { key: 'en_cours', label: 'En cours' },
  { key: 'en_verification', label: 'Vérification' },
  { key: 'cloture', label: 'Clôturé' },
];

const STATUS_COLORS: Record<CapaStatus, { bg: string; color: string }> = {
  ouvert: { bg: '#FEF3C7', color: '#92400E' },
  en_analyse: { bg: '#DBEAFE', color: '#1E40AF' },
  en_cours: { bg: '#EDE9FE', color: '#4C1D95' },
  en_verification: { bg: '#CCFBF1', color: '#134E4A' },
  cloture: { bg: '#DCFCE7', color: '#14532D' },
  annule: { bg: '#F3F4F6', color: '#1F2937' },
};

const ACTION_STATUS_COLORS: Record<ActionStatusValue, { bg: string; color: string; label: string }> = {
  a_faire: { bg: '#FEF3C7', color: '#92400E', label: 'À faire' },
  en_cours: { bg: '#DBEAFE', color: '#1E40AF', label: 'En cours' },
  terminee: { bg: '#DCFCE7', color: '#14532D', label: 'Terminée' },
  bloquee: { bg: '#FEE2E2', color: '#991B1B', label: 'Bloquée' },
};

export default function CapaDetailDrawer({ capaId, open, onClose, onUpdated }: Props) {
  const { user, token } = useAuth();
  const confirm = useConfirm();
  const [capa, setCapa] = useState<Capa | null>(null);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<User[]>([]);
  const [commentaire, setCommentaire] = useState('');
  const [showAddAction, setShowAddAction] = useState(false);
  const [actionForm, setActionForm] = useState({
    titre: '', description: '', type: 'corrective' as ActionTypeValue,
    responsableId: '', responsableName: '', dateEcheance: '',
  });
  const [completePreuve, setCompletePreuve] = useState<number | null>(null);
  const [preuveText, setPreuveText] = useState('');
  const commentEndRef = useRef<HTMLDivElement>(null);

  const fetchCapa = async () => {
    if (!capaId) return;
    try {
      const [capaRes, agentsRes] = await Promise.all([
        capaAPI.getById(capaId),
        capaAPI.getAgents(),
      ]);
      setCapa(capaRes.data);
      setAgents(agentsRes.data);
    } catch {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && capaId) {
      setLoading(true);
      fetchCapa();
    }
  }, [open, capaId]);

  useEffect(() => {
    commentEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [capa?.commentaires?.length]);

  if (!open || !capaId) return null;

  const handleNextStep = async () => {
    if (!capa) return;
    const currentIdx = STATUS_STEPS.findIndex((s) => s.key === capa.status);
    if (currentIdx < 0 || currentIdx >= STATUS_STEPS.length - 1) return;
    const next = STATUS_STEPS[currentIdx + 1].key;
    const ok = await confirm({
      title: 'Passer à l\'étape suivante ?',
      message: `Statut : ${STATUS_STEPS[currentIdx].label} → ${STATUS_STEPS[currentIdx + 1].label}`,
      confirmLabel: 'Confirmer',
      variant: 'info',
    });
    if (!ok) return;
    try {
      await capaAPI.updateStatus(capa.id, next);
      toast.success('Statut mis à jour');
      fetchCapa();
      onUpdated?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erreur');
    }
  };

  const handleCancel = async () => {
    if (!capa) return;
    const ok = await confirm({
      title: 'Annuler ce CAPA ?',
      message: 'Cette action est irréversible.',
      confirmLabel: 'Annuler le CAPA',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await capaAPI.updateStatus(capa.id, 'annule', 'Annulé par le superviseur');
      toast.success('CAPA annulé');
      fetchCapa();
      onUpdated?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erreur');
    }
  };

  const handleCloture = async () => {
    if (!capa) return;
    const ok = await confirm({
      title: 'Clôturer ce CAPA ?',
      message: 'L\'efficacité est confirmée. Le CAPA sera marqué comme clôturé.',
      confirmLabel: 'Clôturer',
      variant: 'success',
    });
    if (!ok) return;
    try {
      await capaAPI.updateStatus(capa.id, 'cloture', 'Efficacité confirmée');
      toast.success('CAPA clôturé');
      fetchCapa();
      onUpdated?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erreur');
    }
  };

  const handleSendComment = async () => {
    if (!capa || !commentaire.trim()) return;
    try {
      await capaAPI.addCommentaire(capa.id, commentaire.trim());
      setCommentaire('');
      fetchCapa();
    } catch {
      toast.error('Erreur lors de l\'envoi');
    }
  };

  const handleAddAction = async () => {
    if (!capa || !actionForm.titre.trim() || !actionForm.responsableId || !actionForm.dateEcheance) {
      toast.error('Remplissez tous les champs obligatoires');
      return;
    }
    try {
      await capaAPI.addAction(capa.id, {
        ...actionForm,
        dateEcheance: actionForm.dateEcheance,
      });
      toast.success('Action ajoutée');
      setShowAddAction(false);
      setActionForm({ titre: '', description: '', type: 'corrective', responsableId: '', responsableName: '', dateEcheance: '' });
      fetchCapa();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erreur');
    }
  };

  const handleCompleteAction = async (actionId: number) => {
    if (!preuveText.trim()) {
      toast.error('Une preuve est requise');
      return;
    }
    try {
      await capaAPI.completeAction(actionId, preuveText.trim());
      toast.success('Action marquée terminée');
      setCompletePreuve(null);
      setPreuveText('');
      fetchCapa();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erreur');
    }
  };

  const handleApplyRecommendations = async () => {
    if (!capa?.causeRacineIA) return;
    try {
      const ia = JSON.parse(capa.causeRacineIA);
      if (ia.actionsRecommandees) {
        for (const rec of ia.actionsRecommandees) {
          await capaAPI.addAction(capa.id, {
            titre: rec.titre,
            description: `Action recommandée par l'IA (priorité: ${rec.priorite})`,
            type: rec.type,
            responsableId: user?.id || '',
            responsableName: user ? `${user.firstName} ${user.lastName}` : '',
            dateEcheance: new Date(Date.now() + 30 * 86400000).toISOString(),
          });
        }
        toast.success(`${ia.actionsRecommandees.length} actions créées`);
        fetchCapa();
      }
    } catch {
      toast.error('Erreur lors de l\'application');
    }
  };

  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === capa?.status);
  const iaData = capa?.causeRacineIA ? (() => { try { return JSON.parse(capa.causeRacineIA); } catch { return null; } })() : null;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'flex-end' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560, maxWidth: '100%', height: '100%', background: '#fff', overflow: 'auto',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column',
        }}
      >
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={28} className="animate-spin" style={{ color: '#94a3b8' }} />
          </div>
        ) : capa ? (
          <>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', position: 'relative' }}>
              <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#2563EB' }}>{capa.reference}</span>
                <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: STATUS_COLORS[capa.status]?.bg, color: STATUS_COLORS[capa.status]?.color }}>
                  {STATUS_STEPS.find((s) => s.key === capa.status)?.label || capa.status}
                </span>
              </div>
              <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{capa.titre}</h2>
              <div style={{ fontSize: 12, color: '#64748b', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span>Ligne : {capa.nomLigne}</span>
                <span>Superviseur : {capa.superviseurName}</span>
                <span>Ouvert le {new Date(capa.dateOuverture).toLocaleDateString('fr-FR')}</span>
                <span>Échéance : <span style={{ color: capa.enRetard ? '#DC2626' : '#475569', fontWeight: capa.enRetard ? 600 : 400 }}>{new Date(capa.dateEcheance).toLocaleDateString('fr-FR')}</span></span>
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Stepper */}
              {capa.status !== 'annule' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  {STATUS_STEPS.map((step, i) => {
                    const done = i < currentStepIdx;
                    const active = i === currentStepIdx;
                    return (
                      <div key={step.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: done ? '#16A34A' : active ? '#2563EB' : '#e2e8f0',
                          color: done || active ? '#fff' : '#94a3b8', fontSize: 12, fontWeight: 700,
                        }}>
                          {done ? <CheckCircle2 size={14} /> : i + 1}
                        </div>
                        <div style={{ fontSize: 10, color: done ? '#16A34A' : active ? '#2563EB' : '#94a3b8', marginTop: 4, fontWeight: active ? 600 : 400, textAlign: 'center' }}>
                          {step.label}
                        </div>
                        {i < STATUS_STEPS.length - 1 && (
                          <div style={{
                            position: 'absolute', width: '100%', height: 2,
                            background: done ? '#16A34A' : '#e2e8f0', top: 14, left: '50%', zIndex: -1,
                          }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {capa.status !== 'cloture' && capa.status !== 'annule' && currentStepIdx < STATUS_STEPS.length - 1 && (
                <button onClick={handleNextStep} style={{
                  width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: '#2563EB',
                  color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  Passer à l'étape suivante <ChevronRight size={16} />
                </button>
              )}

              {/* Analyse IA */}
              {(iaData || capa.causeRacineIA === null) && capa.status !== 'cloture' && (
                <div style={{ background: '#F8FAFC', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={14} color="#F59E0B" /> Analyse IA
                  </div>
                  {!iaData && capa.causeRacineIA === null ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 12 }}>
                      <Loader2 size={14} className="animate-spin" /> L'IA analyse le problème...
                    </div>
                  ) : iaData ? (
                    <div style={{ fontSize: 12, lineHeight: 1.7 }}>
                      {iaData.cinqPourquoi && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontWeight: 700, color: '#475569', marginBottom: 4 }}>5 Pourquoi</div>
                          {iaData.cinqPourquoi.map((p: string, i: number) => (
                            <div key={i} style={{ color: '#475569' }}>{i + 1}. {p}</div>
                          ))}
                        </div>
                      )}
                      {iaData.causesRacines && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontWeight: 700, color: '#475569', marginBottom: 4 }}>Causes racines</div>
                          {iaData.causesRacines.map((c: string, i: number) => (
                            <div key={i} style={{ color: '#475569' }}>• {c}</div>
                          ))}
                        </div>
                      )}
                      {iaData.risqueSiNonTraite && (
                        <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, padding: 10, marginBottom: 10, color: '#92400E' }}>
                          <strong>Risque si non traité :</strong> {iaData.risqueSiNonTraite}
                        </div>
                      )}
                      {iaData.actionsRecommandees && (
                        <div>
                          <div style={{ fontWeight: 700, color: '#475569', marginBottom: 4 }}>Actions recommandées</div>
                          {iaData.actionsRecommandees.map((a: any, i: number) => (
                            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                              <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 10, background: a.type === 'corrective' ? '#FEE2E2' : '#DBEAFE', color: a.type === 'corrective' ? '#991B1B' : '#1E40AF' }}>{a.type}</span>
                              <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 10, background: '#F3F4F6', color: '#374151' }}>{a.priorite}</span>
                              <span>{a.titre}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <button onClick={handleApplyRecommendations} style={{
                        marginTop: 10, padding: '8px 14px', borderRadius: 8, border: '1px solid #2563EB',
                        background: '#EFF6FF', color: '#2563EB', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}>
                        Appliquer les recommandations
                      </button>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Cause racine */}
              {capa.causeRacine && (
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Cause racine (manuelle)</div>
                  <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>{capa.causeRacine}</div>
                </div>
              )}

              {/* Actions */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Actions ({capa.actions?.length || 0})</div>
                  {capa.status !== 'cloture' && capa.status !== 'annule' && (
                    <button onClick={() => setShowAddAction(!showAddAction)} style={{
                      padding: '5px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#475569',
                    }}>
                      <Plus size={12} /> Ajouter
                    </button>
                  )}
                </div>

                {showAddAction && (
                  <div style={{ background: '#F8FAFC', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <input placeholder="Titre de l'action" value={actionForm.titre} onChange={(e) => setActionForm({ ...actionForm, titre: e.target.value })} style={inputSmall} />
                      <input type="date" value={actionForm.dateEcheance} onChange={(e) => setActionForm({ ...actionForm, dateEcheance: e.target.value })} style={inputSmall} />
                    </div>
                    <textarea placeholder="Description" value={actionForm.description} onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })} rows={2} style={{ ...inputSmall, resize: 'vertical' }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                      <select value={actionForm.type} onChange={(e) => setActionForm({ ...actionForm, type: e.target.value as ActionTypeValue })} style={inputSmall}>
                        <option value="corrective">Corrective</option>
                        <option value="preventive">Préventive</option>
                      </select>
                      <select value={actionForm.responsableId} onChange={(e) => {
                        const agent = agents.find((a) => a.id === e.target.value);
                        setActionForm({ ...actionForm, responsableId: e.target.value, responsableName: agent ? `${agent.firstName} ${agent.lastName}` : '' });
                      }} style={inputSmall}>
                        <option value="">Responsable...</option>
                        {agents.map((a) => (
                          <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
                      <button onClick={() => setShowAddAction(false)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', fontSize: 11, cursor: 'pointer' }}>Annuler</button>
                      <button onClick={handleAddAction} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#2563EB', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Ajouter</button>
                    </div>
                  </div>
                )}

                {capa.actions && capa.actions.length > 0 ? (
                  capa.actions.map((a) => {
                    const st = ACTION_STATUS_COLORS[a.status];
                    return (
                      <div key={a.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{a.titre}</div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                              {a.responsableName} • {new Date(a.dateEcheance).toLocaleDateString('fr-FR')}
                            </div>
                          </div>
                          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: st.bg, color: st.color }}>{st.label}</span>
                        </div>
                        {a.preuve && (
                          <div style={{ marginTop: 6, padding: 8, background: '#F0FDF4', borderRadius: 6, fontSize: 11, color: '#166534' }}>
                            <strong>Preuve :</strong> {a.preuve}
                          </div>
                        )}
                        {a.status !== 'terminee' && user?.id === a.responsableId && (
                          <div style={{ marginTop: 8 }}>
                            {completePreuve === a.id ? (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <input
                                  value={preuveText}
                                  onChange={(e) => setPreuveText(e.target.value)}
                                  placeholder="Décrivez la preuve de réalisation..."
                                  style={{ ...inputSmall, flex: 1 }}
                                />
                                <button onClick={() => handleCompleteAction(a.id)} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#16A34A', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>OK</button>
                                <button onClick={() => { setCompletePreuve(null); setPreuveText(''); }} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', fontSize: 11, cursor: 'pointer' }}>×</button>
                              </div>
                            ) : (
                              <button onClick={() => setCompletePreuve(a.id)} style={{
                                padding: '5px 10px', borderRadius: 6, border: '1px solid #16A34A',
                                background: '#F0FDF4', color: '#16A34A', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 4,
                              }}>
                                <CheckCircle2 size={12} /> Marquer terminée
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 20 }}>Aucune action définie</div>
                )}
              </div>

              {/* Commentaires */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>Historique & commentaires</div>
                {capa.commentaires && capa.commentaires.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {capa.commentaires.map((c) => (
                      <div key={c.id} style={{
                        padding: '10px 12px', borderRadius: 10,
                        background: c.type === 'changement_statut' ? '#F8FAFC' : '#fff',
                        border: '1px solid #f1f5f9',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#E0E7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#3730A3' }}>
                              {c.auteurName.split(' ').map((n) => n[0]).join('').substring(0, 2)}
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{c.auteurName}</span>
                          </div>
                          <span style={{ fontSize: 10, color: '#94a3b8' }}>
                            {new Date(c.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>{c.contenu}</div>
                      </div>
                    ))}
                    <div ref={commentEndRef} />
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 16 }}>Aucun commentaire</div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <input
                    value={commentaire}
                    onChange={(e) => setCommentaire(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSendComment(); }}
                    placeholder="Ajouter un commentaire..."
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, outline: 'none' }}
                  />
                  <button onClick={handleSendComment} disabled={!commentaire.trim()} style={{
                    padding: '8px 12px', borderRadius: 8, border: 'none',
                    background: commentaire.trim() ? '#2563EB' : '#e2e8f0',
                    color: commentaire.trim() ? '#fff' : '#94a3b8',
                    cursor: commentaire.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center',
                  }}>
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                onClick={async () => {
                  try {
                    const res = await fetch(capaAPI.getPdfUrl(capa.id), {
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    if (!res.ok) throw new Error('Erreur PDF');
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `CAPA-${capa.reference || capa.id}.pdf`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch {
                    toast.error('Erreur lors du téléchargement du PDF');
                  }
                }}
                style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <FileText size={14} /> PDF
              </button>
              {capa.status !== 'annule' && capa.status !== 'cloture' && (
                <button onClick={handleCancel} style={{
                  padding: '8px 14px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2',
                  color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <Trash2 size={14} /> Annuler
                </button>
              )}
              {capa.status === 'en_verification' && (
                <button onClick={handleCloture} style={{
                  flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#16A34A',
                  color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <CheckCircle2 size={16} /> Clôturer — efficacité confirmée
                </button>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

const inputSmall: React.CSSProperties = {
  width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #e2e8f0',
  fontSize: 12, fontFamily: 'inherit', color: '#1e293b', background: '#fff', outline: 'none', boxSizing: 'border-box',
};