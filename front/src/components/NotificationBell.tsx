import { useState, useEffect, useRef, useCallback } from 'react';
import { Notification, NotificationType, EventNotification, EventNotifType } from '../types';
import { notificationAPI, calendarAPI } from '../api';
import { useNotificationSocket } from '../hooks/useNotificationSocket';
import { toast } from 'react-hot-toast';
import { User, Clock, Pencil, X, CheckCircle2 } from 'lucide-react';

const CAL_ICONS: Record<EventNotifType, { icon: typeof User; color: string; bg: string }> = {
  [EventNotifType.ASSIGNED]: { icon: User, color: '#1d4ed8', bg: '#dbeafe' },
  [EventNotifType.REMINDER]: { icon: Clock, color: '#d97706', bg: '#fef3c7' },
  [EventNotifType.UPDATED]: { icon: Pencil, color: '#7c3aed', bg: '#ede9fe' },
  [EventNotifType.CANCELLED]: { icon: X, color: '#dc2626', bg: '#fee2e2' },
  [EventNotifType.COMPLETED]: { icon: CheckCircle2, color: '#16a34a', bg: '#dcfce7' },
};

const CAL_LABELS: Record<EventNotifType, string> = {
  [EventNotifType.ASSIGNED]: 'Assigné',
  [EventNotifType.REMINDER]: 'Rappel',
  [EventNotifType.UPDATED]: 'Mis à jour',
  [EventNotifType.CANCELLED]: 'Annulé',
  [EventNotifType.COMPLETED]: 'Terminé',
};

interface NotificationBellProps {
  token: string | null;
  onNotificationClick?: (notification: Notification) => void;
}

export default function NotificationBell({ token, onNotificationClick }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'calendar'>('all');
  const [loading, setLoading] = useState(false);
  const [calNotifications, setCalNotifications] = useState<EventNotification[]>([]);
  const [calUnread, setCalUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  const handleNewNotification = useCallback((notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
    toast(notification.message, { duration: 4000 });
  }, []);

  const handleUnreadCountUpdate = useCallback((data: { unreadCount: number }) => {
    setUnreadCount(data.unreadCount);
  }, []);

  useNotificationSocket(token, handleNewNotification, handleUnreadCountUpdate);

  const loadCalNotifications = useCallback(async () => {
    try {
      const res = await calendarAPI.getNotifications();
      setCalNotifications(res.data);
      setCalUnread(res.data.filter((n) => !n.isRead).length);
    } catch {}
  }, []);

  useEffect(() => {
    loadUnreadCount();
    void loadCalNotifications();
    const interval = setInterval(() => void loadCalNotifications(), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(event.target as Node) &&
        bellRef.current && !bellRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const res = await notificationAPI.getUnreadCount();
      setUnreadCount(res.data.unreadCount);
    } catch {}
  };

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationAPI.getAll();
      setNotifications(res.data);
    } catch {}
    setLoading(false);
  };

  const toggleOpen = () => {
    if (!isOpen) loadNotifications();
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationAPI.delete(id);
      const removed = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (removed && !removed.isRead) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const handleCalRead = async (id: number) => {
    try {
      await calendarAPI.markNotificationsRead([id]);
      setCalNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setCalUnread(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const handleCalAllRead = async () => {
    try {
      await calendarAPI.markNotificationsRead();
      setCalNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setCalUnread(0);
    } catch {}
  };

  const getTypeLabel = (type: NotificationType) => {
    switch (type) {
      case NotificationType.MESSAGE: return 'Message';
      case NotificationType.LIGNE_ADDED: return 'Qualité';
      case NotificationType.LIGNE_UPDATED: return 'Qualité';
      default: return 'Système';
    }
  };

  const getTypeColor = (type: NotificationType) => {
    switch (type) {
      case NotificationType.MESSAGE: return '#3b82f6';
      case NotificationType.LIGNE_ADDED: return '#22c55e';
      case NotificationType.LIGNE_UPDATED: return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getInitial = (type: NotificationType) => {
    switch (type) {
      case NotificationType.MESSAGE: return 'M';
      case NotificationType.LIGNE_ADDED: return '+';
      case NotificationType.LIGNE_UPDATED: return '~';
      default: return '!';
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "maintenant";
    const diffMins = Math.floor(diffSec / 60);
    if (diffMins < 60) return `${diffMins}min`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}j`;
  };

  const filtered = activeTab === 'unread' ? notifications.filter(n => !n.isRead) : notifications;
  const totalUnread = unreadCount + calUnread;

  return (
    <div className="notif-bell-wrapper">
      <button ref={bellRef} className="notif-bell-btn" onClick={toggleOpen}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {totalUnread > 0 && (
          <span className="notif-bell-badge">{totalUnread > 99 ? '99+' : totalUnread}</span>
        )}
      </button>

      {isOpen && (
        <div className="notif-panel" ref={panelRef}>
          <div className="notif-panel-header">
            <div className="notif-header-left">
              <span className="notif-header-label">INBOX</span>
              <h3 className="notif-header-title">Notifications</h3>
            </div>
            <div className="notif-header-actions">
              {unreadCount > 0 && (
                <button className="notif-header-icon" onClick={handleMarkAllAsRead} title="Tout marquer lu">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 11 12 14 22 4"/>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                </button>
              )}
              <button className="notif-header-icon notif-close-btn" onClick={() => setIsOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          <div className="notif-tabs">
            <button
              className={`notif-tab ${activeTab === 'all' ? 'notif-tab-active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              Toutes <span className="notif-tab-count">{notifications.length}</span>
            </button>
            <button
              className={`notif-tab ${activeTab === 'unread' ? 'notif-tab-active' : ''}`}
              onClick={() => setActiveTab('unread')}
            >
              Non lues <span className="notif-tab-count">{unreadCount}</span>
            </button>
            <button
              className={`notif-tab ${activeTab === 'calendar' ? 'notif-tab-active' : ''}`}
              onClick={() => setActiveTab('calendar')}
            >
              Calendrier <span className="notif-tab-count">{calNotifications.length}</span>
            </button>
          </div>

          <div className="notif-panel-body">
            {activeTab === 'calendar' ? (
              calNotifications.length === 0 ? (
                <div className="notif-empty">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  <p>Aucune notification calendrier</p>
                </div>
              ) : (
                calNotifications.slice(0, 20).map(n => {
                  const meta = CAL_ICONS[n.type] ?? CAL_ICONS[EventNotifType.REMINDER];
                  const Icon = meta.icon;
                  return (
                    <div
                      key={`c-${n.id}`}
                      className={`notif-card ${!n.isRead ? 'notif-card-unread' : ''}`}
                      onClick={() => {
                        if (!n.isRead) void handleCalRead(n.id);
                      }}
                    >
                      <div className="notif-card-avatar" style={{ background: meta.bg, color: meta.color }}>
                        <Icon size={15} />
                      </div>
                      <div className="notif-card-body">
                        <div className="notif-card-top">
                          <span className="notif-card-title">{n.message}</span>
                        </div>
                        <span className="notif-card-meta">{getTimeAgo(n.sentAt)} · {CAL_LABELS[n.type] ?? n.type}</span>
                      </div>
                      {!n.isRead && <div className="notif-card-dot" />}
                    </div>
                  );
                })
              )
            ) : loading ? (
              <div className="notif-empty">
                <div className="notif-loading-spinner" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="notif-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <p>{activeTab === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}</p>
              </div>
            ) : (
              filtered.map(n => (
                <div
                  key={n.id}
                  className={`notif-card ${!n.isRead ? 'notif-card-unread' : ''}`}
                  onClick={() => {
                    if (!n.isRead) handleMarkAsRead(n.id, { stopPropagation: () => {} } as React.MouseEvent);
                    onNotificationClick?.(n);
                  }}
                >
                  <div className="notif-card-avatar" style={{ background: getTypeColor(n.type) + '18', color: getTypeColor(n.type) }}>
                    {getInitial(n.type)}
                  </div>
                  <div className="notif-card-body">
                    <div className="notif-card-top">
                      <span className="notif-card-title">{n.message}</span>
                      <button className="notif-card-delete" onClick={(e) => handleDelete(n.id, e)} title="Supprimer">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                    <span className="notif-card-meta">{getTimeAgo(n.createdAt)} · {getTypeLabel(n.type)}</span>
                  </div>
                  {!n.isRead && <div className="notif-card-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}