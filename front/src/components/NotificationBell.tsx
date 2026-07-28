import { useState, useEffect, useRef } from 'react';
import { Notification, NotificationType } from '../types';
import { notificationAPI } from '../api';

interface NotificationBellProps {
  onNotificationClick?: (notification: Notification) => void;
  refreshTrigger?: number;
  onNotificationCountChange?: (count: number) => void;
}

export default function NotificationBell({ onNotificationClick, refreshTrigger, onNotificationCountChange }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    loadUnreadCount();
  }, [refreshTrigger]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node) &&
          bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const res = await notificationAPI.getUnreadCount();
      setUnreadCount(res.data.count);
      onNotificationCountChange?.(res.data.count);
    } catch (err) {
      console.error('Failed to load unread count');
    }
  };

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationAPI.getAll();
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to load notifications');
    }
    setLoading(false);
  };

  const toggleOpen = () => {
    if (!isOpen) {
      loadNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      onNotificationCountChange?.(Math.max(0, unreadCount - 1));
    } catch (err) {
      console.error('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      onNotificationCountChange?.(0);
    } catch (err) {
      console.error('Failed to mark all as read');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationAPI.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (!notifications.find(n => n.id === id)?.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
        onNotificationCountChange?.(Math.max(0, unreadCount - 1));
      }
    } catch (err) {
      console.error('Failed to delete notification');
    }
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.MESSAGE: return '💬';
      case NotificationType.LIGNE_ADDED: return '➕';
      case NotificationType.LIGNE_UPDATED: return '✏️';
      default: return '🔔';
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "à l'instant";
    if (diffMins < 60) return `il y a ${diffMins}min`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `il y a ${diffHrs}h`;
    const diffDays = Math.floor(diffHrs / 24);
    return `il y a ${diffDays}j`;
  };

  return (
    <div className="notif-bell-wrapper">
      <button ref={bellRef} className="notif-bell-btn" onClick={toggleOpen} title="Notifications">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className="notif-bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notif-panel" ref={panelRef}>
          <div className="notif-panel-header">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button className="notif-mark-all-btn" onClick={handleMarkAllAsRead}>
                Tout marquer lu
              </button>
            )}
          </div>
          <div className="notif-panel-body">
            {loading ? (
              <div className="notif-empty">Chargement...</div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty">Aucune notification</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`notif-item ${!n.isRead ? 'notif-unread' : ''}`}
                  onClick={() => {
                    if (!n.isRead) handleMarkAsRead(n.id, { stopPropagation: () => {} } as React.MouseEvent);
                    onNotificationClick?.(n);
                    setIsOpen(false);
                  }}
                >
                  <span className="notif-item-icon">{getIcon(n.type)}</span>
                  <div className="notif-item-content">
                    <p className="notif-item-text">{n.message}</p>
                    <span className="notif-item-time">{getTimeAgo(n.createdAt)}</span>
                  </div>
                  <div className="notif-item-actions">
                    {!n.isRead && (
                      <button className="notif-action-btn" onClick={(e) => handleMarkAsRead(n.id, e)} title="Marquer lu">
                        ✓
                      </button>
                    )}
                    <button className="notif-action-btn notif-delete-btn" onClick={(e) => handleDelete(n.id, e)} title="Supprimer">
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
