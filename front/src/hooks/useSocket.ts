import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Message } from '../types';

const SOCKET_URL = 'http://localhost:3000';

export function useSocket(
  token: string | null,
  onMessage?: (message: Message) => void,
  onMessagesRead?: (data: { readerId: string }) => void,
  onMessageEdited?: (message: Message) => void,
  onMessageDeleted?: (data: { messageId: string }) => void,
  onUnreadCount?: (data: { unreadCount: number }) => void,
) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('[WS] Connected');
    });

    socket.on('newMessage', (message: Message) => {
      onMessage?.(message);
    });

    socket.on('messagesRead', (data: { readerId: string }) => {
      onMessagesRead?.(data);
    });

    socket.on('messageEdited', (message: Message) => {
      onMessageEdited?.(message);
    });

    socket.on('messageDeleted', (data: { messageId: string }) => {
      onMessageDeleted?.(data);
    });

    socket.on('unreadCount', (data: { unreadCount: number }) => {
      onUnreadCount?.(data);
    });

    socket.on('disconnect', () => {
      console.log('[WS] Disconnected');
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, onMessage, onMessagesRead, onMessageEdited, onMessageDeleted, onUnreadCount]);

  const sendMessage = useCallback((receiverId: string, content: string) => {
    socketRef.current?.emit('sendMessage', { receiverId, content });
  }, []);

  const editMessage = useCallback((messageId: string, content: string) => {
    socketRef.current?.emit('editMessage', { messageId, content });
  }, []);

  const deleteMessage = useCallback((messageId: string) => {
    socketRef.current?.emit('deleteMessage', { messageId });
  }, []);

  const markAsRead = useCallback((senderId: string) => {
    socketRef.current?.emit('markAsRead', { senderId });
  }, []);

  const getOnlineUsers = useCallback(() => {
    socketRef.current?.emit('getOnlineUsers');
  }, []);

  return { sendMessage, editMessage, deleteMessage, markAsRead, getOnlineUsers, socket: socketRef.current };
}
