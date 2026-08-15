import { useState, useEffect, useRef } from 'react';
import { audit5sAPI } from '../../api';
import { CriteresParPilier, Audit5S } from '../../types';
import { toast } from 'react-hot-toast';
import { X, CheckCircle2, Loader2, AlertTriangle, Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  ligneControleId: string;
  nomLigne: string;
  onCompleted: (audit: Audit5S) => void;
}

const PILIER_KEYS = ['s1', 's2', 's3', 's4', 's5'] as const;
const PILIER_ICONS = ['🗑️', '📦', '🧹', '📋', '🔄'];
const PILIER_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#22c55e' : score >= 55 ? '#f97316' : '#ef4444';

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={6} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize={size * 0.28}
        fontWeight="700"
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
      // Init all reponses to false
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
      let obtained = 0;
      let total = 0;
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

  const getSubmitLabel = () => {
    if (score.scoreGlobal >= 80) return 'Soumettre — Ligne verte';
    if (score.scoreGlobal >= 55) return 'Soumettre — Ligne orange';
    return 'Soumettre — Ligne rouge (CAPA automatique)';
  };

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
        <Loader2 size={24} className="animate-spin" style={{ color: '#3b82f6' }} />
      </div>
    );
  }

  // Result modal
  if (isCompleted && auditResult) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 480, width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 80, height: 80, borderRadius: '50%', background: auditResult.noteCalculee === 'vert' ? '#dcfce7' : auditResult.noteCalculee === 'orange' ? '#ffedd5' : '#fecaca', marginBottom: 16 }}>
              {auditResult.noteCalculee === 'vert' ? <CheckCircle2 size={40} color="#22c55e" /> : <AlertTriangle size={40} color={auditResult.noteCalculee === 'orange' ? '#f97316' : '#ef4444'} />}
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Audit 5S terminé</h2>
            <p style={{ color: '#64748b', fontSize: 14 }}>{nomLigne}</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 20 }}>
            <ScoreRing score={auditResult.scoreGlobal} size={90} />
            <div>
              <div style={{ fontSize: 14, color: '#64748b' }}>Score global</div>
              <div style={{
                fontSize: 18, fontWeight: 700,
                color: auditResult.noteCalculee === 'vert' ? '#22c55e' : auditResult.noteCalculee === 'orange' ? '#f97316' : '#ef4444',
              }}>
                {auditResult.noteCalculee === 'vert' ? 'Vert' : auditResult.noteCalculee === 'orange' ? 'Orange' : 'Rouge'}
              </div>
            </div>
          </div>

          {/* Per pilier scores */}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
            {[auditResult.scoreS1, auditResult.scoreS2, auditResult.scoreS3, auditResult.scoreS4, auditResult.scoreS5].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>{PILIER_ICONS[i]}</div>
                <div style={{
                  fontSize: 13, fontWeight: 600,
                  color: s >= 16 ? '#22c55e' : s >= 11 ? '#f97316' : '#ef4444',
                }}>{s}/20</div>
              </div>
            ))}
          </div>

          {auditResult.analyseIA && auditResult.analyseIA !== 'Analyse en cours...' ? (
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 16, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#3b82f6', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Analyse IA</div>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: '#334155', margin: 0 }}>{auditResult.analyseIA}</p>
            </div>
          ) : (
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 16, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Loader2 size={14} className="animate-spin" style={{ color: '#3b82f6' }} />
                <span style={{ fontSize: 12, color: '#94a3b8' }}>Analyse IA en cours...</span>
              </div>
            </div>
          )}

          {auditResult.capaDeclenche && (
            <div style={{ background: '#fef2f2', borderRadius: 10, padding: 12, marginBottom: 16, border: '1px solid #fecaca' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={14} color="#ef4444" />
                <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>Un CAPA a été ouvert automatiquement</span>
              </div>
            </div>
          )}

          <button
            onClick={() => onCompleted(auditResult)}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
              background: '#3b82f6', color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 0 100px' }}>
      {/* Header */}
      <div style={{ padding: '16px 0', borderBottom: '1px solid #e2e8f0', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{nomLigne}</h2>
            <span style={{ display: 'inline-block', marginTop: 4, padding: '2px 10px', borderRadius: 20, background: '#dbeafe', color: '#2563eb', fontSize: 11, fontWeight: 600 }}>Audit 5S en cours</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 13 }}>
            <Clock size={14} />
            <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{formatTime(elapsed)}</span>
          </div>
        </div>
      </div>

      {/* Sticky score */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fff', padding: '12px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
        <ScoreRing score={score.scoreGlobal} size={64} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Score provisoire</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {PILIER_KEYS.map((key, i) => {
              const s = score[`score${key.toUpperCase()}` as keyof typeof score] as number;
              return (
                <div key={key} style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 2 }}>{PILIER_ICONS[i]}</div>
                  <div style={{ height: 4, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
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

      {/* Pilier sections */}
      {PILIER_KEYS.map((key, pilierIdx) => {
        const pilier = criteres[key];
        const pilierScore = score[`score${key.toUpperCase()}` as keyof typeof score] as number;
        const isExpanded = expandedPilier === key;
        const checkedCount = pilier.criteria.filter((_: any, i: number) => reponses[`${key}_${i}`]).length;

        return (
          <div key={key} style={{ marginBottom: 12, border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
            {/* Pilier header */}
            <div
              onClick={() => setExpandedPilier(isExpanded ? null : key)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', cursor: 'pointer',
                background: isExpanded ? '#f8fafc' : '#fff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>{PILIER_ICONS[pilierIdx]}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{pilier.label}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{checkedCount}/{pilier.criteria.length} critères</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 13, fontWeight: 700,
                  color: pilierScore >= 16 ? '#22c55e' : pilierScore >= 11 ? '#f97316' : '#ef4444',
                }}>{pilierScore}/20</span>
                {isExpanded ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
              </div>
            </div>

            {/* Criteria */}
            {isExpanded && (
              <div style={{ padding: '0 14px 14px' }}>
                {pilier.criteria.map((crit: any, i: number) => {
                  const repKey = `${key}_${i}`;
                  const isChecked = !!reponses[repKey];
                  return (
                    <div
                      key={i}
                      onClick={() => toggleReponse(repKey)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 12px', marginTop: 8, borderRadius: 10, cursor: 'pointer',
                        border: isChecked ? '1px solid #22c55e' : '1px solid #e5e7eb',
                        background: isChecked ? '#f0fdf4' : '#fff',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <span style={{
                        fontSize: 12, fontWeight: 500,
                        color: isChecked ? '#166534' : '#475569',
                        flex: 1,
                      }}>{crit.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12 }}>
                        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{crit.points}pts</span>
                        {isChecked && <CheckCircle2 size={16} color="#22c55e" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Bottom bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff',
        borderTop: '1px solid #e2e8f0', padding: '12px 16px', zIndex: 20,
      }}>
        <textarea
          placeholder="Observation de l'agent (optionnel)"
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          rows={2}
          style={{
            width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0',
            fontSize: 12, resize: 'none', marginBottom: 10, boxSizing: 'border-box',
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!hasAnyResponse || isSubmitting}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
            background: !hasAnyResponse ? '#cbd5e1' : score.scoreGlobal >= 80 ? '#22c55e' : score.scoreGlobal >= 55 ? '#f97316' : '#ef4444',
            color: '#fff', fontSize: 14, fontWeight: 600,
            cursor: !hasAnyResponse ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
          {isSubmitting ? 'Soumission...' : getSubmitLabel()}
        </button>
      </div>
    </div>
  );
}
