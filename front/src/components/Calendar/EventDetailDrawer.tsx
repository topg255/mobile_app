import { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, MapPin, Users, CheckCircle2, Pencil, Trash2, Clock } from 'lucide-react';
import { CalendarEvent, CalendarEventType, EventPriority, EventStatus } from '../../types';
import { TYPE_META } from './EventFormModal';
import { ConfirmModal } from '../UI/ConfirmModal';

interface EventDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (event: CalendarEvent) => void | Promise<void>;
  onComplete?: (event: CalendarEvent, note?: string) => void | Promise<void>;
  onStatusChange?: (event: CalendarEvent, status: EventStatus) => void | Promise<void>;
  currentUserId?: string;
}

const STATUS_META: Record<EventStatus, { label: string; color: string; bg: string }> = {
  [EventStatus.PENDING]: { label: 'En attente', color: '#6b7280', bg: '#f3f4f6' },
  [EventStatus.IN_PROGRESS]: { label: 'En cours', color: '#2563eb', bg: '#dbeafe' },
  [EventStatus.COMPLETED]: { label: 'Terminé', color: '#16a34a', bg: '#dcfce7' },
  [EventStatus.CANCELLED]: { label: 'Annulé', color: '#dc2626', bg: '#fee2e2' },
  [EventStatus.POSTPONED]: { label: 'Reporté', color: '#d97706', bg: '#fef3c7' },
};

const STATUS_CHOICES: EventStatus[] = [
  EventStatus.PENDING,
  EventStatus.IN_PROGRESS,
  EventStatus.COMPLETED,
  EventStatus.POSTPONED,
  EventStatus.CANCELLED,
];

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

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} à ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function initials(firstName?: string, lastName?: string): string {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?';
}

function avatarColor(id: string): string {
  const palette = ['#1d4ed8', '#7c3aed', '#0d9488', '#d97706', '#dc2626', '#16a34a'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

export default function EventDetailDrawer({
  open,
  onClose,
  event,
  onEdit,
  onDelete,
  onComplete,
  onStatusChange,
  currentUserId,
}: EventDetailDrawerProps) {
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [completeNote, setCompleteNote] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (open) {
      setShowCompleteForm(false);
      setCompleteNote('');
      setShowDeleteConfirm(false);
    }
  }, [open, event]);

  if (!open || !event) return null;

  const typeMeta = TYPE_META[event.type] ?? TYPE_META[CalendarEventType.AUTRE];
  const typeLabel =
    event.type === CalendarEventType.AUTRE && event.customType
      ? event.customType
      : TYPE_LABELS[event.type];
  const statusMeta = STATUS_META[event.status] ?? STATUS_META[EventStatus.PENDING];
  const isAssignedAgent =
    !!currentUserId && event.assignedToId === currentUserId;
  const canComplete =
    isAssignedAgent &&
    (event.status === EventStatus.PENDING || event.status === EventStatus.IN_PROGRESS);

  const sectionLabel: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 6,
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 8000,
        pointerEvents: 'none',
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(15,23,42,0.35)',
          pointerEvents: 'auto',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: '380px',
          maxWidth: '92vw',
          backgroundColor: '#ffffff',
          boxShadow: '-12px 0 40px rgba(0,0,0,0.15)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          pointerEvents: 'auto',
        }}
      >
        <div
          style={{
            padding: '22px 20px',
            backgroundColor: event.color || typeMeta.color,
            color: '#ffffff',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '999px',
                  backgroundColor: 'rgba(255,255,255,0.22)',
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                {(() => {
                  const TypeIcon = typeMeta.icon;
                  return (
                    <>
                      <TypeIcon size={13} /> {typeLabel}
                    </>
                  );
                })()}
              </span>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '999px',
                  backgroundColor: 'rgba(255,255,255,0.22)',
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                {PRIORITY_LABELS[event.priority]}
              </span>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 4 }}
            >
              <X size={20} />
            </button>
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '14px 0 6px', lineHeight: 1.35 }}>
            {event.title}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, opacity: 0.92 }}>
            <CalendarIcon size={14} />
            <span>
              {formatDateTime(event.startDate)} → {formatDateTime(event.endDate)}
            </span>
          </div>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {event.location && (
            <div>
              <div style={sectionLabel}>Lieu</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#111827' }}>
                <MapPin size={16} color="#6b7280" />
                {event.location}
              </div>
            </div>
          )}

          <div>
            <div style={sectionLabel}>Agent assigné</div>
            {event.assignedToId ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    backgroundColor: avatarColor(event.assignedToId),
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {initials(event.assignedToName?.split(' ')[0], event.assignedToName?.split(' ')[1])}
                </span>
                <div>
                  <div style={{ fontSize: 14, color: '#111827', fontWeight: 500 }}>
                    {event.assignedToName}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    {isAssignedAgent ? 'Vous' : 'Agent qualité'}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#374151' }}>
                <Users size={16} color="#6b7280" />
                Tâche personnelle (superviseur)
              </div>
            )}
          </div>

          <div>
            <div style={sectionLabel}>Statut</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span
                style={{
                  padding: '5px 12px',
                  borderRadius: '999px',
                  backgroundColor: statusMeta.bg,
                  color: statusMeta.color,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {statusMeta.label}
              </span>
              {!isAssignedAgent && onStatusChange && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {STATUS_CHOICES.filter((s) => s !== event.status).map((s) => (
                    <button
                      key={s}
                      onClick={() => void onStatusChange(event, s)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '8px',
                        border: '1.5px solid #e5e7eb',
                        backgroundColor: '#ffffff',
                        color: '#374151',
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      {STATUS_META[s].label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {event.description && (
            <div>
              <div style={sectionLabel}>Description</div>
              <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                {event.description}
              </p>
            </div>
          )}

          {event.attachmentNote && (
            <div>
              <div style={sectionLabel}>Note / Pièce jointe</div>
              <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.55, margin: 0, whiteSpace: 'pre-wrap' }}>
                {event.attachmentNote}
              </p>
            </div>
          )}

          {event.status === EventStatus.COMPLETED && event.completedAt && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#15803d' }}>
                <CheckCircle2 size={15} />
                Complétée le {formatDateTime(event.completedAt)}
              </div>
              {event.completedNote && (
                <p style={{ fontSize: 13, color: '#166534', margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>
                  {event.completedNote}
                </p>
              )}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#9ca3af' }}>
            <Clock size={12} />
            Créé le {formatDateTime(event.createdAt)}
            {event.isRecurring && <span style={{ marginLeft: 6 }}>· Récurent ({event.recurrenceRule})</span>}
          </div>
        </div>

        {canComplete && (
          <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f3f4f6', paddingTop: 16 }}>
            {!showCompleteForm ? (
              <button
                onClick={() => setShowCompleteForm(true)}
                style={{
                  width: '100%',
                  padding: '12px 0',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Marquer comme terminé
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <textarea
                  value={completeNote}
                  onChange={(e) => setCompleteNote(e.target.value)}
                  placeholder="Note de complétion (optionnelle)…"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #e5e7eb',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    minHeight: 64,
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setShowCompleteForm(false)}
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      borderRadius: '10px',
                      border: '1.5px solid #e5e7eb',
                      backgroundColor: '#ffffff',
                      color: '#374151',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => void onComplete?.(event, completeNote || undefined)}
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Confirmer
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {!isAssignedAgent && (
          <div
            style={{
              display: 'flex',
              gap: 10,
              padding: '18px 20px',
              borderTop: '1px solid #f3f4f6',
            }}
          >
            <button
              onClick={() => onEdit?.(event)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '11px 0',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Pencil size={15} /> Modifier
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '11px 0',
                borderRadius: '12px',
                border: '1.5px solid #fecaca',
                backgroundColor: '#ffffff',
                color: '#dc2626',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <Trash2 size={15} /> Supprimer
            </button>
          </div>
        )}
      </div>

      <ConfirmModal
        open={showDeleteConfirm}
        onConfirm={() => {
          if (onDelete) void onDelete(event);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Supprimer l'événement"
        message={`Êtes-vous sûr de vouloir supprimer « ${event.title} » ? Les occurrences récurrentes seront aussi supprimées.`}
        confirmLabel="Supprimer"
        variant="danger"
      />
    </div>
  );
}