import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Notification } from '../types';

const SOCKET_URL = 'http://localhost:3000';

export function useNotificationSocket(
  token: string | null,
  onNotification?: (notification: Notification) => void,
  onUnreadCount?: (data: { unreadCount: number }) => void,
) {
  const socketRef = useRef<Socket | null>(null);
  const onNotificationRef = useRef(onNotification);
  const onUnreadCountRef = useRef(onUnreadCount);

  onNotificationRef.current = onNotification;
  onUnreadCountRef.current = onUnreadCount;

  useEffect(() => {
    if (!token) return;

    const socket = io(`${SOCKET_URL}/notifications`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      console.log('[Notif-WS] Connected, id:', socket.id);
    });

    socket.on('newNotification', (notification: Notification) => {
      console.log('[Notif-WS] Received notification:', notification);
      onNotificationRef.current?.(notification);
    });

    socket.on('unreadCount', (data: { unreadCount: number }) => {
      onUnreadCountRef.current?.(data);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Notif-WS] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.log('[Notif-WS] Connection error:', err.message);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  return { socket: socketRef.current };
}
