import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Notification } from '../types';

const SOCKET_URL = 'http://localhost:3000';

export function useNotificationSocket(
  token: string | null,
  onNotification?: (notification: Notification) => void,
  onUnreadCount?: (data: { unreadCount: number }) => void,
) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    const socket = io(`${SOCKET_URL}/notifications`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('[Notif-WS] Connected');
    });

    socket.on('newNotification', (notification: Notification) => {
      onNotification?.(notification);
    });

    socket.on('unreadCount', (data: { unreadCount: number }) => {
      onUnreadCount?.(data);
    });

    socket.on('disconnect', () => {
      console.log('[Notif-WS] Disconnected');
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, onNotification, onUnreadCount]);

  return { socket: socketRef.current };
}
