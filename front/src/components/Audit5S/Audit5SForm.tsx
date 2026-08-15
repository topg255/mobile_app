import { useState, useEffect, useRef } from 'react';
import { audit5sAPI } from '../../api';
import { CriteresParPilier, Audit5S } from '../../types';
import { toast } from 'react-hot-toast';
import {
  X, CheckCircle2, Loader2, AlertTriangle, Clock,
  ChevronDown, ChevronUp, Trash2, Archive, Sparkles,
  ClipboardList, RotateCcw, Send,
} from 'lucide-react';

interface Props {
  ligneControleId: string;
  nomLigne: string;
  onCompleted: (audit: Audit5S) => void;
}

const PILIER_KEYS = ['s1', 's2', 's3', 's4', 's5'] as const;
const PILIER_ICONS = [Trash2, Archive, Sparkles, ClipboardList, RotateCcw];
const PILIER_COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
const PILIER_SHORT = ['Trier', 'Ranger', 'Nettoyer', 'Standard.', 'Pérenniser'];

function formatTime(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const color = score >= 80 ? '#22c55e' : score >= 55 ? '#f97316' : '#ef4444';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={4} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={c} strokeDashoffset={c - (score / 100) * c}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.3s' }} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize={size * 0.24} fontWeight="700"
        style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}>{score}</text>
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
  const [activePilier, setActivePilier] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    audit5sAPI.getCriteres().then((res) => {
      setCriteres(res.data);
      const init: Record<string, boolean> = {};
      for (const key of PILIER_KEYS) {
        res.data[key].criteria.forEach((_: any, i: number) => { init[`${key}_${i}`] = false; });
      }
      setReponses(init);
    });
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTime]);

  const toggle = (key: string) => setReponses(p => ({ ...p, [key]: !p[key] }));

  const calcPilier = (key: typeof PILIER_KEYS[number]) => {
    if (!criteres) return 0;
    let o = 0, t = 0;
    criteres[key].criteria.forEach((c: any, i: number) => {
      t += c.points;
      if (reponses[`${key}_${i}`]) o += c.points;
    });
    return t > 0 ? Math.round((o / t) * 20) : 0;
  };

  const scores = PILIER_KEYS.map(k => calcPilier(k));
  const scoreGlobal = scores.reduce((a, b) => a + b, 0);
  const noteCalculee = scoreGlobal >= 80 ? 'vert' : scoreGlobal >= 55 ? 'orange' : 'rouge';
  const hasAny = Object.values(reponses).some(Boolean);

  const handleSubmit = async () => {
    if (!hasAny || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await audit5sAPI.submit({
        ligneControleId, reponses,
        commentaireAgent: commentaire || undefined,
        dureeSecondes: elapsed,
      });
      setAuditResult(res.data);
      setIsCompleted(true);
      if (timerRef.current) clearInterval(timerRef.current);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erreur');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!criteres) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)' }}>
        <Loader2 size={28} className="animate-spin" color="#6366f1" />
      </div>
    );
  }

  // ── RESULT MODAL ──
  if (isCompleted && auditResult) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '28px 24px', maxWidth: 400, width: '90%', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 56, height: 56, borderRadius: '50%', marginBottom: 10,
              background: auditResult.noteCalculee === 'vert' ? '#dcfce7' : auditResult.noteCalculee === 'orange' ? '#ffedd5' : '#fecaca',
            }}>
              {auditResult.noteCalculee === 'vert' ? <CheckCircle2 size={28} color="#22c55e" /> : <AlertTriangle size={28} color={auditResult.noteCalculee === 'orange' ? '#f97316' : '#ef4444'} />}
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Audit terminé</h2>
            <p style={{ color: '#64748b', fontSize: 12, margin: '2px 0 0' }}>{nomLigne}</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 14 }}>
            <ScoreRing score={auditResult.scoreGlobal} size={64} />
            <div>
              <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Score</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: auditResult.noteCalculee === 'vert' ? '#22c55e' : auditResult.noteCalculee === 'orange' ? '#f97316' : '#ef4444' }}>
                {auditResult.scoreGlobal}/100
              </div>
            </div>
          </div>

          {/* Mini pilier scores */}
          <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginBottom: 14 }}>
            {[auditResult.scoreS1, auditResult.scoreS2, auditResult.scoreS3, auditResult.scoreS4, auditResult.scoreS5].map((s, i) => {
              const Icon = PILIER_ICONS[i];
              return (
                <div key={i} style={{ flex: 1, textAlign: 'center', padding: '6px 0', borderRadius: 8, background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                  <Icon size={11} color={PILIER_COLORS[i]} />
                  <div style={{ fontSize: 11, fontWeight: 700, color: s >= 16 ? '#22c55e' : s >= 11 ? '#f97316' : '#ef4444', marginTop: 2 }}>
                    {s}<span style={{ fontWeight: 400, fontSize: 9, color: '#94a3b8' }}>/20</span>
                  </div>
                </div>
              );
            })}
          </div>

          {auditResult.analyseIA && auditResult.analyseIA !== 'Analyse en cours...' ? (
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                <Sparkles size={11} color="#6366f1" />
                <span style={{ fontSize: 9, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 0.5 }}>Analyse IA</span>
              </div>
              <p style={{ fontSize: 11, lineHeight: 1.5, color: '#475569', margin: 0 }}>{auditResult.analyseIA}</p>
            </div>
          ) : (
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 12, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Loader2 size={13} className="animate-spin" color="#6366f1" />
              <span style={{ fontSize: 11, color: '#94a3b8' }}>Analyse en cours...</span>
            </div>
          )}

          {auditResult.capaDeclenche && (
            <div style={{ background: '#fef2f2', borderRadius: 10, padding: 10, marginBottom: 12, border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={13} color="#ef4444" />
              <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>CAPA ouvert automatiquement</span>
            </div>
          )}

          <button onClick={() => onCompleted(auditResult)} style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: 'none', background: '#0f172a', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Fermer
          </button>
        </div>
      </div>
    );
  }

  // ── MAIN FORM ──
  const pilier = criteres[PILIER_KEYS[activePilier]];
  const pilierCriteria = pilier.criteria;
  const pilierChecked = pilierCriteria.filter((_: any, i: number) => reponses[`${PILIER_KEYS[activePilier]}_${i}`]).length;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)' }}>
      <div style={{ width: '92%', maxWidth: 420, maxHeight: '85vh', background: '#fff', borderRadius: 20, display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>

        {/* ── HEADER ── */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => onCompleted({} as Audit5S)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                <X size={18} color="#64748b" />
              </button>
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#0f172a' }}>{nomLigne}</h2>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>Audit 5S</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#64748b', fontSize: 11 }}>
              <Clock size={12} />
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{formatTime(elapsed)}</span>
            </div>
          </div>

          {/* ── STEPPER ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {PILIER_KEYS.map((key, i) => {
              const Icon = PILIER_ICONS[i];
              const isActive = i === activePilier;
              const isDone = i < activePilier;
              const s = scores[i];
              const color = isDone ? '#22c55e' : isActive ? PILIER_COLORS[i] : '#d1d5db';
              return (
                <div key={key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                  {/* Connector line */}
                  {i > 0 && (
                    <div style={{
                      position: 'absolute', top: 14, right: '50%', width: '100%', height: 2,
                      background: isDone ? '#22c55e' : '#e5e7eb', transition: 'background 0.3s',
                    }} />
                  )}
                  <div
                    onClick={() => setActivePilier(i)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isActive ? `${PILIER_COLORS[i]}18` : isDone ? '#f0fdf4' : '#f8fafc',
                      border: `2px solid ${color}`,
                      cursor: 'pointer', position: 'relative', zIndex: 1,
                      transition: 'all 0.3s ease',
                      transform: isActive ? 'scale(1.15)' : 'scale(1)',
                      boxShadow: isActive ? `0 0 0 4px ${PILIER_COLORS[i]}20` : 'none',
                    }}
                  >
                    {isDone ? <CheckCircle2 size={13} color="#22c55e" /> : <Icon size={12} color={color} />}
                  </div>
                  <span style={{
                    fontSize: 8, fontWeight: isActive ? 700 : 500, marginTop: 3, textAlign: 'center',
                    color: isActive ? '#0f172a' : isDone ? '#22c55e' : '#94a3b8',
                    transition: 'color 0.3s',
                  }}>{PILIER_SHORT[i]}</span>
                  {s > 0 && !isDone && (
                    <span style={{ fontSize: 8, color: '#94a3b8' }}>{s}/20</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── SCORE BAR (compact) ── */}
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #f8fafc', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <ScoreRing score={scoreGlobal} size={36} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 3 }}>
              {PILIER_KEYS.map((key, i) => {
                const s = scores[i];
                return (
                  <div key={key} style={{ flex: 1 }}>
                    <div style={{ height: 3, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(s / 20) * 100}%`, borderRadius: 2, background: s >= 16 ? '#22c55e' : s >= 11 ? '#f97316' : '#ef4444', transition: 'width 0.3s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── CRITERIA (scrollable) ── */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px 80px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {activePilier + 1}S — {pilier.label.replace(/^\dS\s—\s/, '')}
          </div>
          {pilierCriteria.map((crit: any, i: number) => {
            const repKey = `${PILIER_KEYS[activePilier]}_${i}`;
            const isChecked = !!reponses[repKey];
            return (
              <div
                key={i}
                onClick={() => toggle(repKey)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 11px', marginBottom: 5, borderRadius: 10, cursor: 'pointer',
                  border: isChecked ? '1px solid #bbf7d0' : '1px solid #f1f5f9',
                  background: isChecked ? '#f0fdf4' : '#fafbfc',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  border: isChecked ? '2px solid #22c55e' : '2px solid #d1d5db',
                  background: isChecked ? '#22c55e' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                  {isChecked && <CheckCircle2 size={13} color="#fff" />}
                </div>
                <span style={{ fontSize: 12, flex: 1, color: isChecked ? '#166534' : '#475569', fontWeight: isChecked ? 500 : 400 }}>
                  {crit.label}
                </span>
              </div>
            );
          })}

          {/* Prev / Next buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {activePilier > 0 && (
              <button
                onClick={() => setActivePilier(p => p - 1)}
                style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >← Précédent</button>
            )}
            {activePilier < 4 ? (
              <button
                onClick={() => setActivePilier(p => p + 1)}
                style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >Suivant →</button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!hasAny || isSubmitting}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8, border: 'none',
                  background: !hasAny ? '#e2e8f0' : scoreGlobal >= 80 ? '#22c55e' : scoreGlobal >= 55 ? '#f97316' : '#ef4444',
                  color: '#fff', fontSize: 12, fontWeight: 600,
                  cursor: !hasAny ? 'not-allowed' : 'pointer', opacity: !hasAny ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />}
                {isSubmitting ? '...' : 'Soumettre'}
              </button>
            )}
          </div>
        </div>

        {/* ── BOTTOM BAR (comment + submit on last step) ── */}
        {activePilier === 4 && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #f1f5f9', padding: '8px 16px 12px', zIndex: 20 }}>
            <input
              placeholder="Observation (optionnel)"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11, boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 6 }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
