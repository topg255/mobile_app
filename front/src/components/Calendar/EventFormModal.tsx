import { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  X,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  BellRing,
  Palette,
  Paperclip,
  Repeat,
  Search,
  ClipboardCheck,
  BookOpen,
  Wrench,
  Pin,
  type LucideIcon,
} from 'lucide-react';
import {
  CalendarEvent,
  CalendarEventType,
  EventPriority,
  EventStatus,
  User,
} from '../../types';
import { ConfirmModal } from '../UI/ConfirmModal';

interface EventFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (dto: Record<string, unknown>, existing?: CalendarEvent) => void | Promise<void>;
  onDelete?: (event: CalendarEvent) => void | Promise<void>;
  event?: CalendarEvent | null;
  agents?: User[];
  defaultDate?: Date;
  defaultStartTime?: string;
  saving?: boolean;
}

const TYPE_LABELS: Record<CalendarEventType, string> = {
  [CalendarEventType.INSPECTION]: 'Inspection',
  [CalendarEventType.REUNION]: 'Réunion',
  [CalendarEventType.AUDIT]: 'Audit',
  [CalendarEventType.FORMATION]: 'Formation',
  [CalendarEventType.MAINTENANCE]: 'Maintenance',
  [CalendarEventType.AUTRE]: 'Autre',
};

export const TYPE_META: Record<CalendarEventType, { icon: LucideIcon; color: string }> = {
  [CalendarEventType.INSPECTION]: { icon: Search, color: '#1d4ed8' },
  [CalendarEventType.REUNION]: { icon: Users, color: '#7c3aed' },
  [CalendarEventType.AUDIT]: { icon: ClipboardCheck, color: '#0d9488' },
  [CalendarEventType.FORMATION]: { icon: BookOpen, color: '#d97706' },
  [CalendarEventType.MAINTENANCE]: { icon: Wrench, color: '#6b7280' },
  [CalendarEventType.AUTRE]: { icon: Pin, color: '#374151' },
};

const PRIORITY_META: Record<EventPriority, { label: string; color: string; bg: string }> = {
  [EventPriority.LOW]: { label: 'Faible', color: '#6b7280', bg: '#e5e7eb' },
  [EventPriority.MEDIUM]: { label: 'Normale', color: '#3b82f6', bg: '#dbeafe' },
  [EventPriority.HIGH]: { label: 'Haute', color: '#f59e0b', bg: '#fef3c7' },
  [EventPriority.CRITICAL]: { label: 'Critique', color: '#dc2626', bg: '#fee2e2' },
};

const COLOR_SWATCHES = ['#1d4ed8', '#16a34a', '#dc2626', '#f59e0b', '#7c3aed', '#6b7280'];
const REMINDER_OPTIONS = [
  { value: 0, label: 'Aucun' },
  { value: 15, label: '15 minutes avant' },
  { value: 30, label: '30 minutes avant' },
  { value: 60, label: '1 heure avant' },
  { value: 120, label: '2 heures avant' },
  { value: 1440, label: '1 jour avant' },
];
const WEEKDAYS = [
  { key: 'MO', label: 'Lun' },
  { key: 'TU', label: 'Mar' },
  { key: 'WE', label: 'Mer' },
  { key: 'TH', label: 'Jeu' },
  { key: 'FR', label: 'Ven' },
  { key: 'SA', label: 'Sam' },
  { key: 'SU', label: 'Dim' },
];

function toDateTimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDateLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function EventFormModal({
  open,
  onClose,
  onSave,
  onDelete,
  event,
  agents = [],
  defaultDate,
  defaultStartTime = '08:00',
  saving = false,
}: EventFormModalProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<CalendarEventType>(CalendarEventType.INSPECTION);
  const [priority, setPriority] = useState<EventPriority>(EventPriority.MEDIUM);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [assignedToId, setAssignedToId] = useState<string | null>(null);
  const [reminderMinutes, setReminderMinutes] = useState(0);
  const [color, setColor] = useState('');
  const [attachmentNote, setAttachmentNote] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [freq, setFreq] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [weekDays, setWeekDays] = useState<string[]>(['MO', 'WE']);
  const [recurrenceEnd, setRecurrenceEnd] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setShowDeleteConfirm(false);
    if (event) {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      setTitle(event.title);
      setType(event.type);
      setPriority(event.priority);
      setStartDate(toDateTimeLocal(start));
      setEndDate(toDateTimeLocal(end));
      setAllDay(event.allDay);
      setLocation(event.location ?? '');
      setDescription(event.description ?? '');
      setAssignedToId(event.assignedToId);
      setReminderMinutes(event.reminderMinutes ?? 0);
      setColor(event.color ?? '');
      setAttachmentNote(event.attachmentNote ?? '');
      setIsRecurring(false);
    } else {
      const base = defaultDate ? new Date(defaultDate) : new Date();
      base.setSeconds(0, 0);
      const start = toDateTimeLocal(base);
      const end = new Date(base.getTime() + 60 * 60 * 1000);
      setTitle('');
      setType(CalendarEventType.INSPECTION);
      setPriority(EventPriority.MEDIUM);
      setStartDate(start);
      setEndDate(toDateTimeLocal(end));
      setAllDay(false);
      setLocation('');
      setDescription('');
      setAssignedToId(null);
      setReminderMinutes(0);
      setColor('');
      setAttachmentNote('');
      setIsRecurring(false);
      void defaultStartTime;
    }
  }, [open, event, defaultDate]);

  if (!open) return null;

  const validate = (): boolean => {
    if (!title.trim()) {
      setError('Le titre est obligatoire');
      return false;
    }
    if (!startDate || !endDate) {
      setError('Les dates de début et de fin sont obligatoires');
      return false;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setError('La date de fin doit être après la date de début');
      return false;
    }
    setError('');
    return true;
  };

  const toggleWeekDay = (key: string) => {
    setWeekDays((prev) =>
      prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key],
    );
  };

  const buildRule = (): string | null => {
    if (!isRecurring) return null;
    let rule = `FREQ=${freq}`;
    if (freq === 'WEEKLY' && weekDays.length > 0) {
      rule += `;BYDAY=${weekDays.join(',')}`;
    }
    if (recurrenceEnd) {
      rule += `;UNTIL=${recurrenceEnd.replace(/-/g, '')}T235959Z`;
    }
    return rule;
  };

  const handleSave = () => {
    if (!validate()) return;
    const dto: Record<string, unknown> = {
      title: title.trim(),
      type,
      priority,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      allDay,
      location: location.trim() || undefined,
      description: description.trim() || undefined,
      assignedToId: assignedToId || undefined,
      reminderMinutes: reminderMinutes > 0 ? reminderMinutes : undefined,
      color: color || undefined,
      attachmentNote: attachmentNote.trim() || undefined,
      isRecurring,
      recurrenceRule: buildRule() || undefined,
    };
    void onSave(dto, event ?? undefined);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1.5px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '14px',
    color: '#111827',
    backgroundColor: '#ffffff',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        backgroundColor: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '760px',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid #f3f4f6',
          }}
        >
          <h2 style={{ fontSize: '17px', fontWeight: 600, color: '#111827', margin: 0 }}>
            {event ? 'Modifier l\'événement' : 'Nouvel événement'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
              padding: 4,
              display: 'flex',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px', minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Titre *</label>
              <input
                style={inputStyle}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Inspection ligne L-07"
                maxLength={200}
              />
            </div>

            <div>
              <label style={labelStyle}>Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {(Object.keys(TYPE_META) as CalendarEventType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    style={{
                      padding: '8px 6px',
                      borderRadius: '10px',
                      border: type === t ? `2px solid ${TYPE_META[t].color}` : '1.5px solid #e5e7eb',
                      backgroundColor: type === t ? `${TYPE_META[t].color}14` : '#ffffff',
                      color: type === t ? TYPE_META[t].color : '#374151',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                    }}
                  >
                    {(() => {
                      const TypeIcon = TYPE_META[t].icon;
                      return <TypeIcon size={15} />;
                    })()}
                    <span>{TYPE_LABELS[t]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Priorité</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {(Object.keys(PRIORITY_META) as EventPriority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '10px',
                      border: priority === p ? `2px solid ${PRIORITY_META[p].color}` : '1.5px solid #e5e7eb',
                      backgroundColor: priority === p ? PRIORITY_META[p].bg : '#ffffff',
                      color: PRIORITY_META[p].color,
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {PRIORITY_META[p].label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Date de début</label>
                <input
                  type="date"
                  style={inputStyle}
                  value={startDate.slice(0, 10)}
                  onChange={(e) => {
                    const time = startDate.slice(11) || '08:00';
                    setStartDate(`${e.target.value}T${time}`);
                  }}
                  disabled={allDay}
                />
                {!allDay && (
                  <div style={{ marginTop: 6 }}>
                    <input
                      type="time"
                      style={inputStyle}
                      value={startDate.slice(11)}
                      onChange={(e) => setStartDate(`${startDate.slice(0, 10)}T${e.target.value}`)}
                    />
                  </div>
                )}
              </div>
              <div>
                <label style={labelStyle}>Date de fin</label>
                <input
                  type="date"
                  style={inputStyle}
                  value={endDate.slice(0, 10)}
                  onChange={(e) => {
                    const time = endDate.slice(11) || '17:00';
                    setEndDate(`${e.target.value}T${time}`);
                  }}
                  disabled={allDay}
                />
                {!allDay && (
                  <div style={{ marginTop: 6 }}>
                    <input
                      type="time"
                      style={inputStyle}
                      value={endDate.slice(11)}
                      onChange={(e) => setEndDate(`${endDate.slice(0, 10)}T${e.target.value}`)}
                    />
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1.5px solid #e5e7eb',
                backgroundColor: '#f9fafb',
              }}
            >
              <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>
                Toute la journée
              </span>
              <button
                onClick={() => setAllDay(!allDay)}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: allDay ? '#1d4ed8' : '#d1d5db',
                  position: 'relative',
                  transition: 'background 0.15s',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: allDay ? 22 : 2,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    transition: 'left 0.15s',
                  }}
                />
              </button>
            </div>

            <div>
              <label style={labelStyle}>Lieu</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#9ca3af' }} />
                <input
                  style={{ ...inputStyle, paddingLeft: 36 }}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: Atelier 3, Ligne L-07"
                  maxLength={100}
                />
              </div>
            </div>
          </div>

          <div style={{ flex: '1 1 300px', minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                style={{ ...inputStyle, minHeight: 88, resize: 'vertical' }}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Détail libre de la tâche…"
              />
            </div>

            <div
              style={{
                padding: '14px',
                borderRadius: '12px',
                border: '1.5px solid #e5e7eb',
                backgroundColor: '#f9fafb',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Users size={15} color="#1d4ed8" />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                  Assigner à un agent
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 170, overflowY: 'auto' }}>
                <button
                  onClick={() => setAssignedToId(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: assignedToId === null ? '2px solid #1d4ed8' : '1.5px solid #e5e7eb',
                    backgroundColor: assignedToId === null ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      border: '2px solid #9ca3af',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {assignedToId === null && (
                      <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#1d4ed8' }} />
                    )}
                  </span>
                  <span style={{ fontSize: '13px', color: '#111827' }}>
                    Aucun agent — tâche personnelle
                  </span>
                </button>
                {agents.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAssignedToId(a.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: assignedToId === a.id ? '2px solid #1d4ed8' : '1.5px solid #e5e7eb',
                      backgroundColor: assignedToId === a.id ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        border: '2px solid #9ca3af',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {assignedToId === a.id && (
                        <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#1d4ed8' }} />
                      )}
                    </span>
                    {a.profileImage ? (
                      <img
                        src={`http://localhost:3000${a.profileImage}`}
                        alt=""
                        style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          backgroundColor: '#1d4ed8',
                          color: '#ffffff',
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
                    )}
                    <span style={{ fontSize: '13px', color: '#111827' }}>
                      {a.firstName} {a.lastName}
                      <span style={{ color: '#6b7280', fontSize: 11, marginLeft: 6 }}>
                        {a.matricule}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Rappel</label>
              <div style={{ position: 'relative' }}>
                <BellRing size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#9ca3af' }} />
                <select
                  style={{ ...inputStyle, paddingLeft: 36 }}
                  value={reminderMinutes}
                  onChange={(e) => setReminderMinutes(Number(e.target.value))}
                >
                  {REMINDER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Couleur</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {COLOR_SWATCHES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(color === c ? '' : c)}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      backgroundColor: c,
                      border: color === c ? '3px solid #ffffff' : 'none',
                      outline: color === c ? '2px solid ' + c : 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={color || '#1d4ed8'}
                  onChange={(e) => setColor(e.target.value)}
                  style={{ width: 28, height: 28, border: 'none', cursor: 'pointer', padding: 0, background: 'none' }}
                  title="Couleur personnalisée"
                />
                {color && (
                  <button
                    onClick={() => setColor('')}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#6b7280',
                      fontSize: 12,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Par défaut
                  </button>
                )}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Note / Pièce jointe</label>
              <div style={{ position: 'relative' }}>
                <Paperclip size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#9ca3af' }} />
                <textarea
                  style={{ ...inputStyle, minHeight: 56, paddingLeft: 36, resize: 'vertical' }}
                  value={attachmentNote}
                  onChange={(e) => setAttachmentNote(e.target.value)}
                  placeholder="Note ou lien joint à l'événement"
                />
              </div>
            </div>

            <div
              style={{
                padding: '14px',
                borderRadius: '12px',
                border: '1.5px solid #e5e7eb',
                backgroundColor: '#f9fafb',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: isRecurring ? 12 : 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Repeat size={15} color="#1d4ed8" />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                    Événement récurrent
                  </span>
                </div>
                <button
                  onClick={() => setIsRecurring(!isRecurring)}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: isRecurring ? '#1d4ed8' : '#d1d5db',
                    position: 'relative',
                    transition: 'background 0.15s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 2,
                      left: isRecurring ? 22 : 2,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      transition: 'left 0.15s',
                    }}
                  />
                </button>
              </div>
              {isRecurring && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: 4 }}>Fréquence</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setFreq(f)}
                          style={{
                            flex: 1,
                            padding: '7px 4px',
                            borderRadius: '8px',
                            border: freq === f ? '2px solid #1d4ed8' : '1.5px solid #e5e7eb',
                            backgroundColor: freq === f ? '#eff6ff' : '#ffffff',
                            color: '#111827',
                            fontSize: 12,
                            cursor: 'pointer',
                          }}
                        >
                          {f === 'DAILY' ? 'Quotidien' : f === 'WEEKLY' ? 'Hebdomadaire' : 'Mensuel'}
                        </button>
                      ))}
                    </div>
                  </div>
                  {freq === 'WEEKLY' && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {WEEKDAYS.map((d) => (
                        <button
                          key={d.key}
                          onClick={() => toggleWeekDay(d.key)}
                          style={{
                            width: 34,
                            padding: '6px 0',
                            borderRadius: '8px',
                            border: weekDays.includes(d.key) ? '2px solid #1d4ed8' : '1.5px solid #e5e7eb',
                            backgroundColor: weekDays.includes(d.key) ? '#eff6ff' : '#ffffff',
                            color: '#111827',
                            fontSize: 12,
                            fontWeight: weekDays.includes(d.key) ? 600 : 400,
                            cursor: 'pointer',
                          }}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <div>
                    <label style={{ ...labelStyle, marginBottom: 4 }}>Fin de récurrence</label>
                    <input
                      type="date"
                      style={inputStyle}
                      value={recurrenceEnd}
                      onChange={(e) => setRecurrenceEnd(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              margin: '0 24px 8px',
              padding: '10px 14px',
              borderRadius: '10px',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 10,
            padding: '18px 24px',
            borderTop: '1px solid #f3f4f6',
          }}
        >
          {event && onDelete ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '11px 18px',
                borderRadius: '12px',
                border: '1.5px solid #fecaca',
                backgroundColor: '#ffffff',
                color: '#dc2626',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <Trash2 size={16} /> Supprimer
            </button>
          ) : (
            <span />
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                padding: '11px 20px',
                borderRadius: '12px',
                border: '1.5px solid #e5e7eb',
                backgroundColor: '#f9fafb',
                color: '#374151',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '11px 22px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: saving ? '#93c5fd' : '#2563eb',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: saving ? 'default' : 'pointer',
              }}
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={showDeleteConfirm}
        onConfirm={() => {
          if (event && onDelete) void onDelete(event);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Supprimer l'événement"
        message={`Êtes-vous sûr de vouloir supprimer « ${event?.title ?? ''} » ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        variant="danger"
      />
    </div>
  );
}