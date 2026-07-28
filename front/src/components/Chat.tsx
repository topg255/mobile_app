import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { chatAPI } from '../api';
import { Conversation, Message, User } from '../types';
import { MessageSquare, Send, ArrowLeft, UserPlus, Search, Pencil, Trash2, Check, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import './Chat.css';

interface ChatProps {
  onUnreadCountChange?: (count: number) => void;
}

const Chat: React.FC<ChatProps> = ({ onUnreadCountChange }) => {
  const { user, token } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [searchUser, setSearchUser] = useState('');
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNewMessage = useCallback((message: Message) => {
    const myId = user?.id;

    setConversations((prev) => {
      const otherUserId = message.sender.id === myId ? message.receiver.id : message.sender.id;
      const otherUser = message.sender.id === myId ? message.receiver : message.sender;

      const existing = prev.find((c) => c.user.id === otherUserId);
      if (existing) {
        const isActive = activeConversation?.user.id === otherUserId;
        return [
          {
            ...existing,
            lastMessage: message,
            unreadCount: isActive ? 0 : existing.unreadCount + (message.receiver.id === myId ? 1 : 0),
          },
          ...prev.filter((c) => c.user.id !== otherUserId),
        ];
      }

      return [
        { user: otherUser, lastMessage: message, unreadCount: message.receiver.id === myId ? 1 : 0 },
        ...prev,
      ];
    });

    if (activeConversation) {
      const otherId = activeConversation.user.id;
      if (message.sender.id === otherId || message.receiver.id === otherId) {
        setMessages((prev) => [...prev, message]);
      }
    }
  }, [user, activeConversation]);

  const handleMessagesRead = useCallback((data: { readerId: string }) => {
    setConversations((prev) =>
      prev.map((c) => (c.user.id === data.readerId ? { ...c, unreadCount: 0 } : c))
    );
  }, []);

  const handleMessageEdited = useCallback((message: Message) => {
    setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
    setConversations((prev) =>
      prev.map((c) => {
        if (c.lastMessage?.id === message.id) {
          return { ...c, lastMessage: message };
        }
        return c;
      })
    );
  }, []);

  const handleMessageDeleted = useCallback((data: { messageId: string }) => {
    setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
  }, []);

  const handleUnreadCount = useCallback((data: { unreadCount: number }) => {
    onUnreadCountChange?.(data.unreadCount);
  }, [onUnreadCountChange]);

  const { sendMessage, editMessage, deleteMessage, markAsRead } = useSocket(
    token, handleNewMessage, handleMessagesRead, handleMessageEdited, handleMessageDeleted, handleUnreadCount
  );

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    try {
      const res = await chatAPI.getConversations();
      setConversations(res.data);
    } catch {
      toast.error('Erreur lors du chargement des conversations');
    } finally {
      setLoading(false);
    }
  };

  const openConversation = async (conv: Conversation) => {
    setActiveConversation(conv);
    setShowNewChat(false);
    setMobileShowChat(true);
    setEditingId(null);
    try {
      const res = await chatAPI.getMessages(conv.user.id);
      setMessages(res.data);
      markAsRead(conv.user.id);
      setConversations((prev) =>
        prev.map((c) => (c.user.id === conv.user.id ? { ...c, unreadCount: 0 } : c))
      );
      const countRes = await chatAPI.getUnreadCount();
      onUnreadCountChange?.(countRes.data.unreadCount);
    } catch {
      toast.error('Erreur lors du chargement des messages');
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !activeConversation) return;
    const content = newMessage.trim();
    setNewMessage('');
    sendMessage(activeConversation.user.id, content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEdit = (msg: Message) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editContent.trim()) return;
    editMessage(editingId, editContent.trim());
    setEditingId(null);
    setEditContent('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleDelete = (msg: Message) => {
    if (!confirm('Supprimer ce message ?')) return;
    deleteMessage(msg.id);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    }
    if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const openNewChat = async () => {
    setShowNewChat(true);
    setActiveConversation(null);
    try {
      const res = await chatAPI.getAvailableUsers();
      setAvailableUsers(res.data);
    } catch {
      toast.error('Erreur lors du chargement des utilisateurs');
    }
  };

  const startConversation = (u: User) => {
    const existing = conversations.find((c) => c.user.id === u.id);
    if (existing) {
      openConversation(existing);
    } else {
      setActiveConversation({ user: u, lastMessage: null as any, unreadCount: 0 });
      setMessages([]);
      setShowNewChat(false);
      setMobileShowChat(true);
      setConversations((prev) => [{ user: u, lastMessage: null as any, unreadCount: 0 }, ...prev]);
    }
  };

  const filteredUsers = availableUsers.filter(
    (u) =>
      u.id !== user?.id &&
      (`${u.firstName} ${u.lastName}`.toLowerCase().includes(searchUser.toLowerCase()) ||
        u.matricule.toLowerCase().includes(searchUser.toLowerCase()))
  );

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-container">
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <MessageSquare size={20} />
          <span>Messages</span>
          <button className="btn-icon-sm chat-new-btn" onClick={openNewChat} title="Nouvelle conversation">
            <UserPlus size={16} />
          </button>
        </div>
        <div className="chat-conversations">
          {loading ? (
            <div className="chat-loading">Chargement...</div>
          ) : conversations.length === 0 ? (
            <div className="chat-empty">Aucune conversation</div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.user.id}
                className={`chat-conv-item ${activeConversation?.user.id === conv.user.id ? 'active' : ''}`}
                onClick={() => openConversation(conv)}
              >
                <div className="chat-conv-avatar">
                  {conv.user.profileImage ? (
                    <img src={`http://localhost:3000${conv.user.profileImage}`} alt="" />
                  ) : (
                    <span>{conv.user.firstName[0]}{conv.user.lastName[0]}</span>
                  )}
                </div>
                <div className="chat-conv-info">
                  <div className="chat-conv-name">{conv.user.firstName} {conv.user.lastName}</div>
                  <div className="chat-conv-preview">
                    {conv.lastMessage?.isDeleted ? (
                      <em>Message supprimé</em>
                    ) : (
                      <>
                        {conv.lastMessage?.isEdited && <em>Modifié: </em>}
                        {conv.lastMessage?.content?.substring(0, 30)}{conv.lastMessage?.content?.length > 30 ? '...' : ''}
                      </>
                    )}
                  </div>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="chat-unread-badge">{conv.unreadCount}</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className={`chat-main ${mobileShowChat ? 'mobile-open' : ''}`}>
        {showNewChat ? (
          <div className="chat-new-panel">
            <div className="chat-new-header">
              <button className="btn-icon-sm" onClick={() => setShowNewChat(false)}>
                <ArrowLeft size={18} />
              </button>
              <span>Nouvelle conversation</span>
            </div>
            <div className="chat-search-user">
              <Search size={16} />
              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
              />
            </div>
            <div className="chat-users-list">
              {filteredUsers.map((u) => (
                <div key={u.id} className="chat-user-item" onClick={() => startConversation(u)}>
                  <div className="chat-conv-avatar">
                    {u.profileImage ? (
                      <img src={`http://localhost:3000${u.profileImage}`} alt="" />
                    ) : (
                      <span>{u.firstName[0]}{u.lastName[0]}</span>
                    )}
                  </div>
                  <div className="chat-conv-info">
                    <div className="chat-conv-name">{u.firstName} {u.lastName}</div>
                    <div className="chat-conv-preview">{u.matricule}</div>
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <div className="chat-empty">Aucun utilisateur trouvé</div>
              )}
            </div>
          </div>
        ) : activeConversation ? (
          <>
            <div className="chat-header">
              <button className="btn-icon-sm chat-back-btn" onClick={() => { setActiveConversation(null); setMobileShowChat(false); }}>
                <ArrowLeft size={18} />
              </button>
              <div className="chat-header-avatar">
                {activeConversation.user.profileImage ? (
                  <img src={`http://localhost:3000${activeConversation.user.profileImage}`} alt="" />
                ) : (
                  <span>{activeConversation.user.firstName[0]}{activeConversation.user.lastName[0]}</span>
                )}
              </div>
              <div className="chat-header-info">
                <span className="chat-header-name">{activeConversation.user.firstName} {activeConversation.user.lastName}</span>
                <span className="chat-header-role">{activeConversation.user.role === 'agent_qualite' ? 'Agent Qualité' : 'Superviseur Qualité'}</span>
              </div>
            </div>
            <div className="chat-messages">
              {messages.map((msg) => {
                const isMine = msg.sender.id === user?.id;
                const isEditing = editingId === msg.id;

                return (
                  <div key={msg.id} className={`chat-msg ${isMine ? 'sent' : 'received'}`}>
                    <div className="chat-msg-bubble">
                      {isEditing ? (
                        <div className="chat-edit-area">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            rows={2}
                            autoFocus
                          />
                          <div className="chat-edit-actions">
                            <button className="chat-edit-save" onClick={handleSaveEdit} title="Sauvegarder">
                              <Check size={14} />
                            </button>
                            <button className="chat-edit-cancel" onClick={handleCancelEdit} title="Annuler">
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p>{msg.content}</p>
                          <div className="chat-msg-footer">
                            <span className="chat-msg-time">
                              {msg.isEdited && <span className="chat-edited-badge">Modifié</span>}
                              {formatTime(msg.createdAt)}
                            </span>
                            {isMine && (
                              <div className="chat-msg-actions">
                                <button className="chat-msg-action" onClick={() => handleEdit(msg)} title="Modifier">
                                  <Pencil size={12} />
                                </button>
                                <button className="chat-msg-action chat-msg-action-danger" onClick={() => handleDelete(msg)} title="Supprimer">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <div className="chat-input-area">
              <textarea
                placeholder="Tapez votre message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button className="chat-send-btn" onClick={handleSend} disabled={!newMessage.trim()}>
                <Send size={18} />
              </button>
            </div>
          </>
        ) : (
          <div className="chat-placeholder">
            <MessageSquare size={48} />
            <p>Sélectionnez une conversation ou commencez-en une nouvelle</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
