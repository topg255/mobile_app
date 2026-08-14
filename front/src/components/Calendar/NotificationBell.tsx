import { useState, useEffect, useRef } from 'react';
import { Bell, User, Clock, Pencil, X, CheckCircle2 } from 'lucide-react';
import { EventNotification, EventNotifType } from '../../types';
import { calendarAPI } from '../../api';

const NOTIF_ICONS: Record<EventNotifType, { icon: typeof User; color: string; bg: string }> = {
  [EventNotifType.ASSIGNED]: { icon: User, color: '#1d4ed8', bg: '#dbeafe' },
  [EventNotifType.REMINDER]: { icon: Clock, color: '#d97706', bg: '#fef3c7' },
  [EventNotifType.UPDATED]: { icon: Pencil, color: '#7c3aed', bg: '#ede9fe' },
  [EventNotifType.CANCELLED]: { icon: X, color: '#dc2626', bg: '#fee2e2' },
  [EventNotifType.COMPLETED]: { icon: CheckCircle2, color: '#16a34a', bg: '#dcfce7' },
};

const NOTIF_LABELS: Record<EventNotifType, string> = {
  [EventNotifType.ASSIGNED]: 'Assigné',
  [EventNotifType.REMINDER]: 'Rappel',
  [EventNotifType.UPDATED]: 'Mis à jour',
  [EventNotifType.CANCELLED]: 'Annulé',
  [EventNotifType.COMPLETED]: 'Terminé',
};

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const diffMs = now - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'à l\'instant';
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  return `il y a ${Math.floor(diffH / 24)} j`;
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<EventNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  const load = async () => {
    try {
      const res = await calendarAPI.getNotifications();
      setNotifications(res.data);
      setUnreadCount(res.data.filter((n) => !n.isRead).length);
    } catch {
      // silencieux
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = async () => {
    try {
      await calendarAPI.markNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // silencieux
    }
  };

  const markRead = async (id: number) => {
    try {
      await calendarAPI.markNotificationsRead([id]);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // silencieux
    }
  };

  const displayed = notifications.slice(0, 10);

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={bellRef}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#475569',
          padding: 8,
          display: 'flex',
        }}
        title="Notifications du calendrier"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: '#dc2626',
              color: '#ffffff',
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              boxSizing: 'border-box',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: 340,
            maxWidth: '90vw',
            backgroundColor: '#ffffff',
            borderRadius: 16,
            boxShadow: '0 16px 40px rgba(15,23,42,0.18)',
            zIndex: 9500,
            overflow: 'hidden',
            border: '1px solid #f1f5f9',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em' }}>
                CALENDRIER
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>
                Notifications
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {displayed.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                Aucune notification
              </div>
            ) : (
              displayed.map((n) => {
                const meta = NOTIF_ICONS[n.type] ?? NOTIF_ICONS[EventNotifType.REMINDER];
                const Icon = meta.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      if (!n.isRead) void markRead(n.id);
                    }}
                    style={{
                      display: 'flex',
                      gap: 10,
                      width: '100%',
                      padding: '10px 16px',
                      border: 'none',
                      borderBottom: '1px solid #f8fafc',
                      backgroundColor: n.isRead ? '#ffffff' : '#eff6ff',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor: meta.bg,
                        color: meta.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={15} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          display: 'block',
                          fontSize: 13,
                          color: '#1e293b',
                          lineHeight: 1.4,
                          wordBreak: 'break-word',
                        }}
                      >
                        {n.message}
                      </span>
                      <span
                        style={{
                          display: 'block',
                          marginTop: 3,
                          fontSize: 11,
                          color: '#94a3b8',
                        }}
                      >
                        {getTimeAgo(n.sentAt)} · {NOTIF_LABELS[n.type] ?? n.type}
                      </span>
                    </span>
                    {!n.isRead && (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: '#2563eb',
                          marginTop: 4,
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}