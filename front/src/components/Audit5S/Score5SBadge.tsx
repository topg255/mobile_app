import { useState, useEffect } from 'react';
import { audit5sAPI } from '../../api';
import { Audit5S } from '../../types';

interface Props {
  ligneControleId: string;
  scoreGlobal?: number;
  noteCalculee?: string;
  lastAuditDate?: string;
  onClick?: () => void;
}

function MiniScoreRing({ score, size = 32 }: { score: number; size?: number }) {
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#22c55e' : score >= 55 ? '#f97316' : '#ef4444';

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={3} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth={3}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
      />
      <text
        x={size / 2} y={size / 2}
        textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize={size * 0.32} fontWeight="700"
        style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}
      >
        {score}
      </text>
    </svg>
  );
}

export default function Score5SBadge({
  ligneControleId,
  scoreGlobal: initialScore,
  noteCalculee: initialNote,
  lastAuditDate,
  onClick,
}: Props) {
  const [score, setScore] = useState<number | null>(initialScore ?? null);
  const [note, setNote] = useState<string | null>(initialNote ?? null);
  const [date, setDate] = useState<string | null>(lastAuditDate ?? null);
  const [tooltip, setTooltip] = useState(false);

  useEffect(() => {
    if (initialScore !== undefined) setScore(initialScore);
    if (initialNote !== undefined) setNote(initialNote);
    if (lastAuditDate) setDate(lastAuditDate);
  }, [initialScore, initialNote, lastAuditDate]);

  useEffect(() => {
    if (score === null && !date) {
      audit5sAPI.getHistorique(ligneControleId).then((res) => {
        const audits = res.data;
        if (audits && audits.length > 0) {
          const latest = audits[0];
          setScore(latest.scoreGlobal);
          setNote(latest.noteCalculee);
          setDate(latest.createdAt);
        }
      }).catch(() => {});
    }
  }, [ligneControleId, score, date]);

  if (score === null) {
    return (
      <span
        onClick={onClick}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 8px', borderRadius: 12,
          background: '#f1f5f9', color: '#94a3b8',
          fontSize: 10, fontWeight: 600, cursor: onClick ? 'pointer' : 'default',
        }}
      >
        5S requis
      </span>
    );
  }

  return (
    <span
      onClick={onClick}
      onMouseEnter={() => setTooltip(true)}
      onMouseLeave={() => setTooltip(false)}
      style={{
        position: 'relative',
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 6px', borderRadius: 12,
        background: note === 'vert' ? '#f0fdf4' : note === 'orange' ? '#fff7ed' : '#fef2f2',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <MiniScoreRing score={score} size={24} />
      <span style={{
        fontSize: 10, fontWeight: 600,
        color: note === 'vert' ? '#22c55e' : note === 'orange' ? '#f97316' : '#ef4444',
      }}>{score}</span>

      {tooltip && (
        <div style={{
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          background: '#1e293b', color: '#fff', padding: '6px 10px', borderRadius: 8,
          fontSize: 11, whiteSpace: 'nowrap', zIndex: 50, marginBottom: 6,
        }}>
          {date ? new Date(date).toLocaleDateString('fr-FR') : 'N/A'}
        </div>
      )}
    </span>
  );
}
