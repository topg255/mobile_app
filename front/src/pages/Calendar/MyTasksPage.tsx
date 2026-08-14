import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  LogOut,
  Calendar as CalendarIcon,
  MapPin,
  Users,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react';
import { calendarAPI } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import NotificationBell from '../../components/Calendar/NotificationBell';
import { TYPE_META } from '../../components/Calendar/EventFormModal';
import { EVENT_PRIORITY_COLORS } from '../../hooks/useCalendar';
import {
  CalendarEvent,
  CalendarEventType,
  EventPriority,
  EventStatus,
} from '../../types';
import { toast } from 'react-hot-toast';

interface TaskEvent extends CalendarEvent {
  supervisorName?: string;
}

const TYPE_LABELS: Record<CalendarEventType, string> = {
  [CalendarEventType.INSPECTION]: 'Inspection',
  [CalendarEventType.REUNION]: 'Réunion',
  [CalendarEventType.AUDIT]: 'Audit',
  [CalendarEventType.FORMATION]: 'Formation',
  [CalendarEventType.MAINTENANCE]: 'Maintenance',
  [CalendarEventType.AUTRE]: 'Autre',
};

const PRIORITY_LABELS: Record<EventPriority, string> = {
  [EventPriority.LOW]: 'Faible',
  [EventPriority.MEDIUM]: 'Normale',
  [EventPriority.HIGH]: 'Haute',
  [EventPriority.CRITICAL]: 'Critique',
};

const STATUS_META: Record<EventStatus, { label: string; color: string; bg: string }> = {
  [EventStatus.PENDING]: { label: 'En attente', color: '#6b7280', bg: '#f3f4f6' },
  [EventStatus.IN_PROGRESS]: { label: 'En cours', color: '#2563eb', bg: '#dbeafe' },
  [EventStatus.COMPLETED]: { label: 'Terminé', color: '#16a34a', bg: '#dcfce7' },
  [EventStatus.CANCELLED]: { label: 'Annulé', color: '#dc2626', bg: '#fee2e2' },
  [EventStatus.POSTPONED]: { label: 'Reporté', color: '#d97706', bg: '#fef3c7' },
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function weekKey(date: Date): string {
  const start = new Date(date);
  const day = start.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diffToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${start.getDate()}/${start.getMonth() + 1} – ${end.getDate()}/${end.getMonth() + 1}`;
}

function weekStart(date: Date): Date {
  const start = new Date(date);
  const day = start.getDay();
  start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day));
  start.setHours(0, 0, 0, 0);
  return start;
}

export default function MyTasksPage() {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState<TaskEvent[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | EventStatus>('all');
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [completeNote, setCompleteNote] = useState('');
  const [completing, setCompleting] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      const to = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
      const res = await calendarAPI.getMyTasks(from.toISOString(), to.toISOString());
      setTasks(res.data as TaskEvent[]);
    } catch {
      toast.error('Erreur de chargement des tâches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    const interval = setInterval(() => void fetchTasks(), 60000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const filtered = useMemo(() => {
    const list =
      statusFilter === 'all' ? tasks : tasks.filter((t) => t.status === statusFilter);
    return [...list].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );
  }, [tasks, statusFilter]);

  const groupedByWeek = useMemo(() => {
    const groups: { label: string; tasks: TaskEvent[] }[] = [];
    const map = new Map<string, TaskEvent[]>();
    const now = new Date();
    for (const t of filtered) {
      const start = new Date(t.startDate);
      const key =
        start < weekStart(now)
          ? 'Avant cette semaine'
          : weekKey(start);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    for (const [label, list] of map.entries()) {
      groups.push({ label, tasks: list });
    }
    const order = ['Avant cette semaine'];
    groups.sort((a, b) => {
      const ia = order.indexOf(a.label);
      const ib = order.indexOf(b.label);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.label.localeCompare(b.label);
    });
    return groups;
  }, [filtered]);

  const isUrgent = (t: TaskEvent): boolean => {
    const start = new Date(t.startDate).getTime();
    const now = Date.now();
    return (
      start >= now &&
      start - now <= 2 * 60 * 60 * 1000 &&
      (t.status === EventStatus.PENDING || t.status === EventStatus.IN_PROGRESS)
    );
  };

  const handleComplete = async (t: TaskEvent) => {
    setCompleting(true);
    try {
      await calendarAPI.completeEvent(t.id, completeNote || undefined);
      toast.success('Tâche marquée comme terminée');
      setCompletingId(null);
      setCompleteNote('');
      void fetchTasks();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erreur');
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
      <div
        style={{
          height: 60,
          backgroundColor: '#0f172a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={() => (window.location.href = '/dashboard')}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}
            title="Retour au tableau de bord"
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={20} color="#60a5fa" />
            <span style={{ color: '#ffffff', fontSize: 16, fontWeight: 600 }}>Mes tâches</span>
            <span style={{ color: '#64748b', fontSize: 12, marginLeft: 8 }}>Agent</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <NotificationBell />
          <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 500 }}>
            {user?.firstName} {user?.lastName}
          </span>
          <button
            onClick={() => void logout()}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}
            title="Déconnexion"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 18, fontWeight: 600, color: '#0f172a' }}>
            Tâches assignées
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['all', EventStatus.PENDING, EventStatus.COMPLETED] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 999,
                  border: 'none',
                  backgroundColor: statusFilter === f ? '#2563eb' : '#ffffff',
                  color: statusFilter === f ? '#ffffff' : '#475569',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(15,23,42,0.06)',
                }}
              >
                {f === 'all' ? 'Toutes' : f === EventStatus.PENDING ? 'En attente' : 'Terminées'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Loader2 size={28} color="#94a3b8" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : groupedByWeek.length === 0 ? (
          <div
            style={{
              padding: '50px 20px',
              backgroundColor: '#ffffff',
              borderRadius: 16,
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: 14,
            }}
          >
            Aucune tâche pour le moment
          </div>
        ) : (
          groupedByWeek.map((group) => (
            <div key={group.label} style={{ marginBottom: 22 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 10,
                }}
              >
                {group.label}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {group.tasks.map((t) => {
                  const typeMeta = TYPE_META[t.type] ?? TYPE_META[CalendarEventType.AUTRE];
                  const priorityColor = EVENT_PRIORITY_COLORS[t.priority] ?? '#3b82f6';
                  const st = STATUS_META[t.status] ?? STATUS_META[EventStatus.PENDING];
                  const urgent = isUrgent(t);
                  const canComplete =
                    t.status === EventStatus.PENDING || t.status === EventStatus.IN_PROGRESS;
                  return (
                    <div
                      key={t.id}
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: 14,
                        padding: '14px 16px',
                        boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
                        border: '1px solid #f1f5f9',
                        borderLeft: urgent ? '4px solid #dc2626' : '4px solid ' + (t.color || typeMeta.color),
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{t.title}</span>
                            {urgent && (
                              <span
                                style={{
                                  padding: '2px 9px',
                                  borderRadius: 999,
                                  backgroundColor: '#fee2e2',
                                  color: '#dc2626',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  animation: 'calPulse 1.2s ease-in-out infinite',
                                }}
                              >
                                Urgent
                              </span>
                            )}
                            <span style={{ padding: '2px 9px', borderRadius: 999, backgroundColor: st.bg, color: st.color, fontSize: 11, fontWeight: 600 }}>
                              {st.label}
                            </span>
                            <span style={{ padding: '2px 9px', borderRadius: 999, backgroundColor: priorityColor + '14', color: priorityColor, fontSize: 11, fontWeight: 600 }}>
                              {PRIORITY_LABELS[t.priority]}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 13, color: '#475569' }}>
                            <CalendarIcon size={14} color="#94a3b8" />
                            {formatDateTime(t.startDate)} → {formatDateTime(t.endDate)}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6, fontSize: 12, color: '#64748b', flexWrap: 'wrap' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Users size={13} />
                              {t.supervisorName ?? 'Superviseur'}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              {typeMeta.icon} {TYPE_LABELS[t.type]}
                            </span>
                            {t.location && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <MapPin size={13} /> {t.location}
                              </span>
                            )}
                          </div>
                          {t.description && (
                            <p style={{ margin: '10px 0 0', fontSize: 13, color: '#475569', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                              {t.description}
                            </p>
                          )}
                        </div>
                        {canComplete && (
                          <button
                            onClick={() => { setCompletingId(t.id); setCompleteNote(''); }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '9px 14px',
                              borderRadius: 10,
                              border: 'none',
                              backgroundColor: '#16a34a',
                              color: '#ffffff',
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                          >
                            <CheckCircle2 size={15} />
                            Marquer terminé
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {completingId !== null && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9000,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 18,
              padding: '26px 24px',
              width: '100%',
              maxWidth: 420,
              boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 6px' }}>
              Marquer comme terminé
            </h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 14px' }}>
              {tasks.find((t) => t.id === completingId)?.title}
            </p>
            <textarea
              value={completeNote}
              onChange={(e) => setCompleteNote(e.target.value)}
              placeholder="Note de complétion (optionnelle)…"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1.5px solid #e5e7eb',
                fontSize: 13,
                fontFamily: 'inherit',
                resize: 'vertical',
                minHeight: 80,
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                onClick={() => setCompletingId(null)}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  borderRadius: 10,
                  border: '1.5px solid #e5e7eb',
                  backgroundColor: '#ffffff',
                  color: '#374151',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  const t = tasks.find((x) => x.id === completingId);
                  if (t) void handleComplete(t);
                }}
                disabled={completing}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  borderRadius: 10,
                  border: 'none',
                  backgroundColor: completing ? '#86efac' : '#16a34a',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: completing ? 'default' : 'pointer',
                }}
              >
                {completing ? 'Enregistrement…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes calPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}