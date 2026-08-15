import { useState, useEffect, useRef } from 'react';
import { audit5sAPI } from '../../api';
import { CriteresParPilier, Audit5S } from '../../types';
import { toast } from 'react-hot-toast';
import {
  X, CheckCircle2, Loader2, AlertTriangle, Clock,
  ChevronDown, ChevronUp, Trash2, Archive, Sparkles,
  ClipboardList, RotateCcw, Send, FileText,
} from 'lucide-react';

interface Props {
  ligneControleId: string;
  nomLigne: string;
  onCompleted: (audit: Audit5S) => void;
}

const PILIER_KEYS = ['s1', 's2', 's3', 's4', 's5'] as const;
const PILIER_ICONS = [Trash2, Archive, Sparkles, ClipboardList, RotateCcw];
const PILIER_COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
const PILIER_LABELS_SHORT = ['Trier', 'Ranger', 'Nettoyer', 'Standardiser', 'Pérenniser'];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#22c55e' : score >= 55 ? '#f97316' : '#ef4444';

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={5} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth={5}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.3s ease' }}
      />
      <text
        x={size / 2} y={size / 2}
        textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize={size * 0.26} fontWeight="700"
        style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}
      >
        {score}
      </text>
    </svg>
  );
}

export default function Audit5SForm({ ligneControleId, nomLigne, onCompleted }: Props) {
  const [criteres, setCriteres] = useState<CriteresParPilier | null>(null);
  const [reponses, setReponses] = useState<Record<string, boolean>>({});
  const [commentaire, setCommentaire] = useState('');
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [auditResult, setAuditResult] = useState<Audit5S | null>(null);
  const [expandedPilier, setExpandedPilier] = useState<string | null>('s1');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    audit5sAPI.getCriteres().then((res) => {
      setCriteres(res.data);
      const init: Record<string, boolean> = {};
      const keys = ['s1', 's2', 's3', 's4', 's5'] as const;
      for (const key of keys) {
        res.data[key].criteria.forEach((_: any, i: number) => {
          init[`${key}_${i}`] = false;
        });
      }
      setReponses(init);
    });
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTime]);

  const toggleReponse = (key: string) => {
    setReponses((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const calcScoreLocal = () => {
    if (!criteres) return { scoreGlobal: 0, noteCalculee: 'rouge', scoreS1: 0, scoreS2: 0, scoreS3: 0, scoreS4: 0, scoreS5: 0 };
    const calcPilier = (key: 's1' | 's2' | 's3' | 's4' | 's5') => {
      const pilier = criteres[key];
      let obtained = 0, total = 0;
      for (let i = 0; i < pilier.criteria.length; i++) {
        total += pilier.criteria[i].points;
        if (reponses[`${key}_${i}`]) obtained += pilier.criteria[i].points;
      }
      return total > 0 ? Math.round((obtained / total) * 20) : 0;
    };
    const s1 = calcPilier('s1'), s2 = calcPilier('s2'), s3 = calcPilier('s3'), s4 = calcPilier('s4'), s5 = calcPilier('s5');
    const scoreGlobal = s1 + s2 + s3 + s4 + s5;
    const noteCalculee = scoreGlobal >= 80 ? 'vert' : scoreGlobal >= 55 ? 'orange' : 'rouge';
    return { scoreGlobal, noteCalculee, scoreS1: s1, scoreS2: s2, scoreS3: s3, scoreS4: s4, scoreS5: s5 };
  };

  const score = calcScoreLocal();
  const hasAnyResponse = Object.values(reponses).some(Boolean);

  const handleSubmit = async () => {
    if (!hasAnyResponse || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await audit5sAPI.submit({
        ligneControleId,
        reponses,
        commentaireAgent: commentaire || undefined,
        dureeSecondes: elapsed,
      });
      setAuditResult(res.data);
      setIsCompleted(true);
      if (timerRef.current) clearInterval(timerRef.current);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erreur lors de la soumission');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!criteres) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <Loader2 size={24} className="animate-spin" style={{ color: '#6366f1' }} />
      </div>
    );
  }

  // Result modal
  if (isCompleted && auditResult) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)',
      }}>
        <div style={{
          background: '#fff', borderRadius: 20, padding: '32px 28px',
          maxWidth: 440, width: '92%', boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 64, height: 64, borderRadius: '50%', marginBottom: 12,
              background: auditResult.noteCalculee === 'vert' ? '#dcfce7' : auditResult.noteCalculee === 'orange' ? '#ffedd5' : '#fecaca',
            }}>
              {auditResult.noteCalculee === 'vert'
                ? <CheckCircle2 size={32} color="#22c55e" />
                : <AlertTriangle size={32} color={auditResult.noteCalculee === 'orange' ? '#f97316' : '#ef4444'} />}
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#0f172a' }}>Audit terminé</h2>
            <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>{nomLigne}</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 18 }}>
            <ScoreRing score={auditResult.scoreGlobal} size={80} />
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Score</div>
              <div style={{
                fontSize: 22, fontWeight: 800,
                color: auditResult.noteCalculee === 'vert' ? '#22c55e' : auditResult.noteCalculee === 'orange' ? '#f97316' : '#ef4444',
              }}>
                {auditResult.scoreGlobal}/100
              </div>
            </div>
          </div>

          {/* Mini pilier scores */}
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 18 }}>
            {[auditResult.scoreS1, auditResult.scoreS2, auditResult.scoreS3, auditResult.scoreS4, auditResult.scoreS5].map((s, i) => {
              const Icon = PILIER_ICONS[i];
              return (
                <div key={i} style={{
                  flex: 1, textAlign: 'center', padding: '8px 2px', borderRadius: 10,
                  background: '#f8fafc', border: '1px solid #f1f5f9',
                }}>
                  <Icon size={12} color={PILIER_COLORS[i]} style={{ marginBottom: 2 }} />
                  <div style={{
                    fontSize: 12, fontWeight: 700,
                    color: s >= 16 ? '#22c55e' : s >= 11 ? '#f97316' : '#ef4444',
                  }}>{s}<span style={{ fontWeight: 400, fontSize: 10, color: '#94a3b8' }}>/20</span></div>
                </div>
              );
            })}
          </div>

          {auditResult.analyseIA && auditResult.analyseIA !== 'Analyse en cours...' ? (
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 14, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Sparkles size={12} color="#6366f1" />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 0.5 }}>Analyse IA</span>
              </div>
              <p style={{ fontSize: 12, lineHeight: 1.6, color: '#475569', margin: 0 }}>{auditResult.analyseIA}</p>
            </div>
          ) : (
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 14, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Loader2 size={14} className="animate-spin" color="#6366f1" />
                <span style={{ fontSize: 12, color: '#94a3b8' }}>Analyse en cours...</span>
              </div>
            </div>
          )}

          {auditResult.capaDeclenche && (
            <div style={{ background: '#fef2f2', borderRadius: 12, padding: 12, marginBottom: 14, border: '1px solid #fecaca' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={14} color="#ef4444" />
                <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>CAPA ouvert automatiquement</span>
              </div>
            </div>
          )}

          <button
            onClick={() => onCompleted(auditResult)}
            style={{
              width: '100%', padding: '11px 0', borderRadius: 12, border: 'none',
              background: '#0f172a', color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'opacity 0.15s',
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', justifyContent: 'center',
      background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)',
    }}>
      <div style={{
        width: '100%', maxWidth: 520, height: '100vh',
        background: '#fff', overflow: 'auto', position: 'relative',
        boxShadow: '0 0 60px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 20, background: '#fff',
          borderBottom: '1px solid #f1f5f9', padding: '14px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => onCompleted({} as Audit5S)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6 }}
              >
                <X size={18} color="#64748b" />
              </button>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#0f172a' }}>{nomLigne}</h2>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>Audit 5S</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 12 }}>
              <Clock size={13} />
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{formatTime(elapsed)}</span>
            </div>
          </div>

          {/* Score bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
            <ScoreRing score={score.scoreGlobal} size={52} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {PILIER_KEYS.map((key, i) => {
                  const s = score[`score${key.toUpperCase()}` as keyof typeof score] as number;
                  const Icon = PILIER_ICONS[i];
                  return (
                    <div key={key} style={{ flex: 1, textAlign: 'center' }}>
                      <Icon size={10} color={PILIER_COLORS[i]} style={{ marginBottom: 1 }} />
                      <div style={{ height: 3, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${(s / 20) * 100}%`, borderRadius: 2,
                          background: s >= 16 ? '#22c55e' : s >= 11 ? '#f97316' : '#ef4444',
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Pilier sections */}
        <div style={{ padding: '12px 16px 120px' }}>
          {PILIER_KEYS.map((key, pilierIdx) => {
            const pilier = criteres[key];
            const pilierScore = score[`score${key.toUpperCase()}` as keyof typeof score] as number;
            const isExpanded = expandedPilier === key;
            const checkedCount = pilier.criteria.filter((_: any, i: number) => reponses[`${key}_${i}`]).length;
            const PilierIcon = PILIER_ICONS[pilierIdx];

            return (
              <div key={key} style={{
                marginBottom: 8, border: '1px solid #f1f5f9', borderRadius: 12,
                overflow: 'hidden', background: isExpanded ? '#fafbfc' : '#fff',
              }}>
                <div
                  onClick={() => setExpandedPilier(isExpanded ? null : key)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '11px 12px', cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: `${PILIER_COLORS[pilierIdx]}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <PilierIcon size={14} color={PILIER_COLORS[pilierIdx]} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>
                        {pilierIdx + 1}S — {PILIER_LABELS_SHORT[pilierIdx]}
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>{checkedCount}/{pilier.criteria.length}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontSize: 12, fontWeight: 700,
                      color: pilierScore >= 16 ? '#22c55e' : pilierScore >= 11 ? '#f97316' : '#ef4444',
                    }}>{pilierScore}/20</span>
                    {isExpanded ? <ChevronUp size={14} color="#cbd5e1" /> : <ChevronDown size={14} color="#cbd5e1" />}
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '0 12px 12px' }}>
                    {pilier.criteria.map((crit: any, i: number) => {
                      const repKey = `${key}_${i}`;
                      const isChecked = !!reponses[repKey];
                      return (
                        <div
                          key={i}
                          onClick={() => toggleReponse(repKey)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '9px 10px', marginBottom: 4, borderRadius: 8, cursor: 'pointer',
                            border: isChecked ? '1px solid #bbf7d0' : '1px solid transparent',
                            background: isChecked ? '#f0fdf4' : '#f8fafc',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{
                            width: 20, height: 20, borderRadius: 6,
                            border: isChecked ? '2px solid #22c55e' : '2px solid #d1d5db',
                            background: isChecked ? '#22c55e' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.15s ease', flexShrink: 0,
                          }}>
                            {isChecked && <CheckCircle2 size={12} color="#fff" />}
                          </div>
                          <span style={{
                            fontSize: 12, flex: 1,
                            color: isChecked ? '#166534' : '#475569',
                            fontWeight: isChecked ? 500 : 400,
                          }}>{crit.label}</span>
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                            background: isChecked ? '#dcfce7' : '#f1f5f9',
                            color: isChecked ? '#16a34a' : '#94a3b8',
                          }}>{crit.points}pts</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom bar */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20,
          background: '#fff', borderTop: '1px solid #f1f5f9',
          padding: '10px 16px 16px', maxWidth: 520, margin: '0 auto',
        }}>
          <textarea
            placeholder="Observation (optionnel)"
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            rows={1}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 8,
              border: '1px solid #e2e8f0', fontSize: 12, resize: 'none',
              marginBottom: 8, boxSizing: 'border-box', fontFamily: 'inherit',
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!hasAnyResponse || isSubmitting}
            style={{
              width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
              background: !hasAnyResponse ? '#e2e8f0'
                : score.scoreGlobal >= 80 ? '#22c55e'
                : score.scoreGlobal >= 55 ? '#f97316' : '#ef4444',
              color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: !hasAnyResponse ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.15s ease',
              opacity: !hasAnyResponse ? 0.6 : 1,
            }}
          >
            {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />}
            {isSubmitting ? 'Soumission...' : !hasAnyResponse ? 'Cochez au moins un critère'
              : score.scoreGlobal >= 80 ? 'Soumettre — Vert'
              : score.scoreGlobal >= 55 ? 'Soumettre — Orange'
              : 'Soumettre — Rouge (CAPA)'}
          </button>
        </div>
      </div>
    </div>
  );
}
