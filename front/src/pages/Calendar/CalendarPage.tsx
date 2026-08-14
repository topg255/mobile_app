import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/react/daygrid';
import timeGridPlugin from '@fullcalendar/react/timegrid';
import interactionPlugin from '@fullcalendar/react/interaction';
import listPlugin from '@fullcalendar/react/list';
import classicTheme from '@fullcalendar/react/themes/classic';
import frLocale from '@fullcalendar/react/locales/fr';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
  ClipboardCheck,
  BookOpen,
  Wrench,
  Pin,
} from 'lucide-react';
import '@fullcalendar/react/skeleton.css';
import '@fullcalendar/react/themes/classic/theme.css';
import '@fullcalendar/react/themes/classic/palette.css';
import type {
  EventClickInfo,
  EventDisplayInfo,
  DateSelectInfo,
  EventDropInfo,
  EventChangeInfo,
  CalendarRef,
} from '@fullcalendar/react';
import {
  useCalendar,
  eventToFullCalendarFormat,
  EVENT_TYPE_COLORS,
  EVENT_PRIORITY_COLORS,
  CalendarEventQuery,
} from '../../hooks/useCalendar';
import EventFormModal from '../../components/Calendar/EventFormModal';
import EventDetailDrawer from '../../components/Calendar/EventDetailDrawer';
import {
  CalendarEvent,
  CalendarEventType,
  EventPriority,
  EventStatus,
} from '../../types';
import { calendarAPI } from '../../api';
import { toast } from 'react-hot-toast';

type ViewType = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek';

const VIEW_META: { key: ViewType; label: string }[] = [
  { key: 'dayGridMonth', label: 'Mois' },
  { key: 'timeGridWeek', label: 'Semaine' },
  { key: 'timeGridDay', label: 'Jour' },
  { key: 'listWeek', label: 'Liste' },
];

const TYPE_LABELS: Record<CalendarEventType, { label: string; icon: React.ComponentType<{ size?: number | string; color?: string }> }> = {
  [CalendarEventType.INSPECTION]: { label: 'Inspection', icon: Search },
  [CalendarEventType.REUNION]: { label: 'Réunion', icon: Users },
  [CalendarEventType.AUDIT]: { label: 'Audit', icon: ClipboardCheck },
  [CalendarEventType.FORMATION]: { label: 'Formation', icon: BookOpen },
  [CalendarEventType.MAINTENANCE]: { label: 'Maintenance', icon: Wrench },
  [CalendarEventType.AUTRE]: { label: 'Autre', icon: Pin },
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

function getRange(view: ViewType, date: Date): { start: string; end: string } {
  const start = new Date(date);
  let end = new Date(date);
  if (view === 'dayGridMonth') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
  } else if (view === 'timeGridWeek' || view === 'listWeek') {
    const day = start.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diffToMonday);
    start.setHours(0, 0, 0, 0);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }
  return { start: start.toISOString(), end: end.toISOString() };
}

function formatDayTitle(date: Date): string {
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function CalendarPage() {
  const {
    events,
    agents,
    stats,
    isLoading,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    fetchStats,
    fetchAgents,
    setEvents,
  } = useCalendar();

  const [currentView, setCurrentView] = useState<ViewType>('timeGridWeek');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [activeTypes, setActiveTypes] = useState<CalendarEventType[]>([]);
  const [activePriorities, setActivePriorities] = useState<EventPriority[]>([]);
  const [hiddenAgentIds, setHiddenAgentIds] = useState<Set<string>>(new Set());
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formDefaultDate, setFormDefaultDate] = useState<Date | undefined>(undefined);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const calendarRef = useRef<CalendarRef | null>(null);
  const fetchRef = useRef<{ start: string; end: string; types: CalendarEventType[]; priorities: EventPriority[] } | null>(null);

  const doFetch = useCallback(
    async (view: ViewType, date: Date, types: CalendarEventType[], priorities: EventPriority[]) => {
      const range = getRange(view, date);
      const query: CalendarEventQuery = {
        startDate: range.start,
        endDate: range.end,
      };
      if (types.length > 0) query.type = types.join(',');
      if (priorities.length > 0) query.priority = priorities.join(',');
      fetchRef.current = { start: range.start, end: range.end, types, priorities };
      return fetchEvents(query);
    },
    [fetchEvents],
  );

  useEffect(() => {
    void doFetch(currentView, selectedDate, activeTypes, activePriorities);
  }, [currentView, selectedDate, activeTypes, activePriorities, doFetch]);

  useEffect(() => {
    void fetchStats();
    void fetchAgents();
  }, [fetchStats, fetchAgents]);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (fetchRef.current) {
        const params: Record<string, string> = {
          startDate: fetchRef.current.start,
          endDate: fetchRef.current.end,
        };
        if (fetchRef.current.types.length > 0) params.type = fetchRef.current.types.join(',');
        if (fetchRef.current.priorities.length > 0) params.priority = fetchRef.current.priorities.join(',');
        const res = await calendarAPI.getEvents(params);
        setEvents(res.data);
      }
      void fetchStats();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchStats, setEvents]);

  const navigate = (dir: number) => {
    const next = new Date(selectedDate);
    if (currentView === 'dayGridMonth' || currentView === 'listWeek') {
      next.setMonth(next.getMonth() + dir);
    } else if (currentView === 'timeGridWeek') {
      next.setDate(next.getDate() + 7 * dir);
    } else {
      next.setDate(next.getDate() + dir);
    }
    setSelectedDate(next);
    const api = calendarRef.current?.getApi();
    if (api) api.gotoDate(next);
  };

  const toggleType = (t: CalendarEventType) => {
    setActiveTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const togglePriority = (p: EventPriority) => {
    setActivePriorities((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const toggleAgent = (id: string) => {
    setHiddenAgentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const visibleEvents = useMemo(() => {
    if (hiddenAgentIds.size === 0) return events;
    return events.filter((e) => e.assignedToId === null || !hiddenAgentIds.has(e.assignedToId));
  }, [events, hiddenAgentIds]);

  const fcEvents = useMemo(() => visibleEvents.map(eventToFullCalendarFormat), [visibleEvents]);

  const todayEvents = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return events
      .filter((e) => {
        const s = new Date(e.startDate);
        const en = new Date(e.endDate);
        return s < endOfDay && en > startOfDay;
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [events]);

  const handleSelect = (arg: DateSelectInfo) => {
    setEditingEvent(null);
    setFormDefaultDate(new Date(arg.start));
    setIsFormModalOpen(true);
  };

  const handleEventClick = (arg: EventClickInfo) => {
    const evt = (arg.event.extendedProps as { event: CalendarEvent }).event;
    setSelectedEvent(evt);
    setIsDetailOpen(true);
  };

  const handleDrop = async (arg: EventDropInfo) => {
    const evt = (arg.event.extendedProps as { event: CalendarEvent }).event;
    const start = arg.event.start as Date;
    const end = arg.event.end as Date;
    try {
      await updateEvent(evt.id, { startDate: start.toISOString(), endDate: end.toISOString() });
      toast.success('Événement déplacé');
      void doFetch(currentView, selectedDate, activeTypes, activePriorities);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erreur');
      arg.revert();
    }
  };

  const handleResize = async (arg: EventChangeInfo) => {
    const evt = (arg.event.extendedProps as { event: CalendarEvent }).event;
    const end = arg.event.end;
    if (!end) return;
    try {
      await updateEvent(evt.id, { endDate: end.toISOString() });
      toast.success('Durée mise à jour');
      void doFetch(currentView, selectedDate, activeTypes, activePriorities);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erreur');
      arg.revert();
    }
  };

  const handleSave = async (dto: Record<string, unknown>, existing?: CalendarEvent) => {
    setSaving(true);
    try {
      if (existing) {
        const updated = await updateEvent(existing.id, dto);
        setSelectedEvent(updated);
      } else {
        await createEvent(dto);
      }
      toast.success(existing ? 'Événement modifié' : 'Événement créé');
      setIsFormModalOpen(false);
      setEditingEvent(null);
      void doFetch(currentView, selectedDate, activeTypes, activePriorities);
      void fetchStats();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (evt: CalendarEvent) => {
    try {
      await deleteEvent(evt.id);
      toast.success('Événement supprimé');
      setIsFormModalOpen(false);
      setIsDetailOpen(false);
      setEditingEvent(null);
      void doFetch(currentView, selectedDate, activeTypes, activePriorities);
      void fetchStats();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleStatusChange = async (evt: CalendarEvent, status: EventStatus) => {
    try {
      await updateEvent(evt.id, { status });
      toast.success('Statut mis à jour');
      void doFetch(currentView, selectedDate, activeTypes, activePriorities);
      void fetchStats();
      setIsDetailOpen(false);
    } catch {
      toast.error('Erreur');
    }
  };

  const renderEventContent = (arg: EventDisplayInfo) => {
    const evt = (arg.event.extendedProps as { event: CalendarEvent }).event;
    const color = evt.color || EVENT_TYPE_COLORS[evt.type];
    const critical = evt.priority === EventPriority.CRITICAL;
    const timeText = arg.timeText;
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '1px 4px',
          borderLeft: critical ? '4px solid #dc2626' : 'none',
          minHeight: 18,
          overflow: 'hidden',
        }}
      >
        {evt.assignedToName && (
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.35)',
              color: '#ffffff',
              fontSize: 8,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {(evt.assignedToName[0] ?? '').toUpperCase()}
          </span>
        )}
        {arg.view.type !== 'dayGridMonth' && timeText && (
          <span style={{ fontSize: 10, fontWeight: 500, opacity: 0.95, flexShrink: 0 }}>{timeText}</span>
        )}
        <span style={{ fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {evt.title}
        </span>
      </div>
    );
  };

  const openCreate = () => {
    setEditingEvent(null);
    setFormDefaultDate(undefined);
    setIsFormModalOpen(true);
  };

  const openEdit = (evt: CalendarEvent) => {
    setIsDetailOpen(false);
    setEditingEvent(evt);
    setFormDefaultDate(new Date(evt.startDate));
    setIsFormModalOpen(true);
  };

  const priorityDot = (p: EventPriority) => EVENT_PRIORITY_COLORS[p] ?? '#3b82f6';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
      <div style={{ display: 'flex', gap: 16, padding: 16, alignItems: 'flex-start', maxWidth: 1500, margin: '0 auto' }}>
        <div
          style={{
            width: 300,
            flexShrink: 0,
            backgroundColor: '#ffffff',
            borderRadius: 16,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>Calendrier</span>
            <button
              onClick={openCreate}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '8px 12px',
                borderRadius: 10,
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Plus size={15} />
              Nouvel événement
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
            {VIEW_META.map((v) => (
              <button
                key={v.key}
                onClick={() => {
                  setCurrentView(v.key);
                  calendarRef.current?.getApi()?.changeView(v.key);
                }}
                style={{
                  padding: '7px 0',
                  borderRadius: 9,
                  border: 'none',
                  backgroundColor: currentView === v.key ? '#2563eb' : '#f1f5f9',
                  color: currentView === v.key ? '#ffffff' : '#475569',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {v.label}
              </button>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>
              Filtres par type
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(Object.keys(TYPE_LABELS) as CalendarEventType[]).map((t) => {
                const active = activeTypes.includes(t);
                const Icon = TYPE_LABELS[t].icon;
                return (
                  <button
                    key={t}
                    onClick={() => toggleType(t)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 999,
                      border: active ? `1.5px solid ${EVENT_TYPE_COLORS[t]}` : '1.5px solid #e2e8f0',
                      backgroundColor: active ? `${EVENT_TYPE_COLORS[t]}14` : '#ffffff',
                      color: active ? EVENT_TYPE_COLORS[t] : '#64748b',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    <Icon size={13} /> {TYPE_LABELS[t].label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>
              Filtres par priorité
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(Object.keys(PRIORITY_LABELS) as EventPriority[]).map((p) => {
                const active = activePriorities.includes(p);
                return (
                  <button
                    key={p}
                    onClick={() => togglePriority(p)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 999,
                      border: active ? `1.5px solid ${priorityDot(p)}` : '1.5px solid #e2e8f0',
                      backgroundColor: active ? `${priorityDot(p)}14` : '#ffffff',
                      color: active ? priorityDot(p) : '#64748b',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    {PRIORITY_LABELS[p]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>
              Mes tâches du jour ({todayEvents.length})
            </div>
            {todayEvents.length === 0 ? (
              <div style={{ fontSize: 13, color: '#94a3b8', padding: '10px 0' }}>
                Aucune tâche aujourd&apos;hui
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                {todayEvents.map((e) => {
                  const st = STATUS_META[e.status] ?? STATUS_META[EventStatus.PENDING];
                  return (
                    <button
                      key={e.id}
                      onClick={() => {
                        setSelectedEvent(e);
                        setIsDetailOpen(true);
                      }}
                      style={{
                        textAlign: 'left',
                        padding: '9px 11px',
                        borderRadius: 10,
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#f8fafc',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {e.title}
                        </span>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: st.color, flexShrink: 0 }} />
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                        {new Date(e.startDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        {e.assignedToName ? ` · ${e.assignedToName}` : ' · Personnelle'}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>
              Agents ({agents.length})
            </div>
            {agents.length === 0 ? (
              <div style={{ fontSize: 13, color: '#94a3b8', padding: '6px 0' }}>
                Aucun agent dans votre équipe
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                {agents.map((a) => {
                  const hidden = hiddenAgentIds.has(a.id);
                  return (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <span
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            backgroundColor: hidden ? '#e2e8f0' : '#2563eb',
                            color: hidden ? '#94a3b8' : '#ffffff',
                            fontSize: 11,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {a.firstName?.[0]}{a.lastName?.[0]}
                        </span>
                        <span style={{ fontSize: 13, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.firstName} {a.lastName}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleAgent(a.id)}
                        style={{
                          width: 36,
                          height: 20,
                          borderRadius: 10,
                          border: 'none',
                          cursor: 'pointer',
                          backgroundColor: hidden ? '#cbd5e1' : '#2563eb',
                          position: 'relative',
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            top: 2,
                            left: hidden ? 2 : 18,
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            backgroundColor: '#ffffff',
                            transition: 'left 0.15s',
                          }}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div
            style={{
              padding: '10px 12px',
              borderRadius: 12,
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>
              Statistiques du mois
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Total', value: stats?.totalEvents ?? 0, color: '#0f172a' },
                { label: 'Assignés', value: stats?.assignedToAgents ?? 0, color: '#2563eb' },
                { label: 'Personnels', value: stats?.personalTasks ?? 0, color: '#7c3aed' },
                { label: 'Complétés', value: stats?.completedCount ?? 0, color: '#16a34a' },
              ].map((s) => (
                <div key={s.label} style={{ padding: '8px 10px', borderRadius: 10, backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0, backgroundColor: '#ffffff', borderRadius: 16, padding: 14, boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => navigate(-1)} style={navBtnStyle}>
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => { setSelectedDate(new Date()); calendarRef.current?.getApi().today(); }} style={navBtnStyle}>
                Aujourd&apos;hui
              </button>
              <button onClick={() => navigate(1)} style={navBtnStyle}>
                <ChevronRight size={16} />
              </button>
            </div>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', textTransform: 'capitalize' }}>
              {formatDayTitle(selectedDate)}
            </span>
            {isLoading && <span style={{ fontSize: 12, color: '#94a3b8' }}>Chargement…</span>}
          </div>

          <FullCalendar
            ref={calendarRef}
            plugins={[classicTheme, dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            locale={frLocale}
            initialView="timeGridWeek"
            viewDidMount={(arg) => setSelectedDate(new Date(arg.view.currentStart))}
            headerToolbar={false}
            selectable
            selectMirror
            editable
            select={(arg) => handleSelect(arg)}
            eventClick={(arg) => handleEventClick(arg)}
            eventDrop={(arg) => void handleDrop(arg)}
            eventResize={(arg) => void handleResize(arg)}
            events={fcEvents}
            eventContent={(arg) => renderEventContent(arg)}
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            firstDay={1}
            height="auto"
            eventDisplay="block"
            dayMaxEvents={3}
            eventTimeFormat={{ hour: '2-digit', minute: '2-digit' }}
            eventDidMount={(arg) => {
              const evt = (arg.event.extendedProps as { event: CalendarEvent }).event;
              const tip = `${evt.title}${evt.assignedToName ? ` — ${evt.assignedToName}` : ''} — ${STATUS_META[evt.status]?.label ?? evt.status}`;
              arg.el.title = tip;
            }}
          />
        </div>
      </div>

      <EventFormModal
        open={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingEvent(null);
        }}
        onSave={(dto, existing) => void handleSave(dto, existing)}
        onDelete={(evt) => void handleDelete(evt)}
        event={editingEvent}
        agents={agents}
        defaultDate={formDefaultDate}
        saving={saving}
      />

      <EventDetailDrawer
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        event={selectedEvent}
        onEdit={(evt) => openEdit(evt)}
        onDelete={(evt) => void handleDelete(evt)}
        onStatusChange={(evt, status) => void handleStatusChange(evt, status)}
      />
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '7px 12px',
  borderRadius: 9,
  border: '1px solid #e2e8f0',
  backgroundColor: '#ffffff',
  color: '#334155',
  fontSize: 13,
  cursor: 'pointer',
};