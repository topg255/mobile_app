import axios from 'axios';
import {
  AuthResponse,
  SignupResponse,
  ControleDate,
  LigneControle,
  Rapport,
  HistoriqueAgent,
  User,
  LoginLog,
  SuperAdminStats,
  Conversation,
  Message,
  Notification,
} from '../types';

const API_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  signupAgent: (data: {
    firstName: string;
    lastName: string;
    matricule: string;
    email: string;
    password: string;
    image?: File;
  }): Promise<{ data: SignupResponse }> => {
    const formData = new FormData();
    formData.append('firstName', data.firstName);
    formData.append('lastName', data.lastName);
    formData.append('matricule', data.matricule);
    formData.append('email', data.email);
    formData.append('password', data.password);
    if (data.image) formData.append('image', data.image);
    return api.post('/auth/signup/agent-qualite', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  signupSuperviseur: (data: {
    firstName: string;
    lastName: string;
    matricule: string;
    email: string;
    password: string;
    image?: File;
  }): Promise<{ data: SignupResponse }> => {
    const formData = new FormData();
    formData.append('firstName', data.firstName);
    formData.append('lastName', data.lastName);
    formData.append('matricule', data.matricule);
    formData.append('email', data.email);
    formData.append('password', data.password);
    if (data.image) formData.append('image', data.image);
    return api.post('/auth/signup/superviseur-qualite', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  login: (data: {
    matricule: string;
    password: string;
  }): Promise<{ data: AuthResponse }> => api.post('/auth/login', data),

  logout: (): Promise<{ data: { message: string } }> =>
    api.post('/auth/logout'),

  forgotPassword: (data: { email: string }): Promise<{ data: { message: string } }> =>
    api.post('/auth/forgot-password', data),

  resetPassword: (data: {
    token: string;
    newPassword: string;
  }): Promise<{ data: { message: string } }> =>
    api.post('/auth/reset-password', data),

  getProfile: (): Promise<{ data: User }> => api.get('/auth/profile'),

  uploadProfileImage: (file: File): Promise<{ data: { message: string; profileImage: string } }> => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/auth/profile/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const qualityAPI = {
  createControleDate: (data: { dateControle: string }): Promise<{ data: { message: string; controleDate: ControleDate } }> =>
    api.post('/quality/controle-dates', data),

  getAllControleDates: (): Promise<{ data: ControleDate[] }> =>
    api.get('/quality/controle-dates'),

  createLigneControle: (data: {
    nomLigne: string;
    heure?: string;
    note: string;
    delais: string;
    responsable: string;
    details: string;
    controleDateId: string;
  }): Promise<{ data: { message: string; ligne: LigneControle } }> =>
    api.post('/quality/lignes', data),

  updateLigneControle: (id: string, data: {
    nomLigne?: string;
    heure?: string;
    note?: string;
    delais?: string;
    responsable?: string;
    details?: string;
  }): Promise<{ data: { message: string; ligne: LigneControle } }> =>
    api.patch(`/quality/lignes/${id}`, data),

  uploadLigneImage: (id: string, file: File): Promise<{ data: { message: string; ligne: LigneControle } }> => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post(`/quality/lignes/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getMesLignes: (): Promise<{ data: LigneControle[] }> =>
    api.get('/quality/lignes/mes-lignes'),

  getLignesAgent: (agentId: string): Promise<{ data: LigneControle[] }> =>
    api.get(`/quality/lignes/agent/${agentId}`),

  getAllLignes: (): Promise<{ data: LigneControle[] }> =>
    api.get('/quality/lignes'),

  getHistoriqueAgents: (): Promise<{ data: HistoriqueAgent[] }> =>
    api.get('/quality/historique-agents'),

  getRapport: (data: {
    debutDate: string;
    endDate: string;
    agentId?: string;
  }): Promise<{ data: Rapport }> => api.post('/quality/rapport', data),

  deleteLigneControle: (id: string): Promise<{ data: { message: string } }> =>
    api.delete(`/quality/lignes/${id}`),

  deleteControleDate: (id: string): Promise<{ data: { message: string } }> =>
    api.delete(`/quality/controle-dates/${id}`),
};

export const superAdminAPI = {
  getStats: (): Promise<{ data: SuperAdminStats }> =>
    api.get('/super-admin/stats'),

  getAllUsers: (): Promise<{ data: User[] }> =>
    api.get('/super-admin/users'),

  getPendingUsers: (): Promise<{ data: User[] }> =>
    api.get('/super-admin/users/pending'),

  approveUser: (userId: string): Promise<{ data: { message: string; user: User } }> =>
    api.post(`/super-admin/users/${userId}/approve`),

  disapproveUser: (userId: string): Promise<{ data: { message: string; user: User } }> =>
    api.post(`/super-admin/users/${userId}/disapprove`),

  deleteUser: (userId: string): Promise<{ data: { message: string } }> =>
    api.delete(`/super-admin/users/${userId}`),

  getAllLoginLogs: (page?: number, limit?: number): Promise<{ data: { logs: LoginLog[]; pagination: any } }> =>
    api.get('/super-admin/logs', { params: { page, limit } }),

  getLoginLogsByUser: (userId: string): Promise<{ data: { user: any; logs: any[] } }> =>
    api.get(`/super-admin/logs/user/${userId}`),
};

export const chatAPI = {
  getConversations: (): Promise<{ data: Conversation[] }> =>
    api.get('/chat/conversations'),

  getMessages: (userId: string): Promise<{ data: Message[] }> =>
    api.get(`/chat/messages/${userId}`),

  markAsRead: (senderId: string): Promise<{ data: { message: string } }> =>
    api.post(`/chat/read/${senderId}`),

  getUnreadCount: (): Promise<{ data: { unreadCount: number } }> =>
    api.get('/chat/unread-count'),

  getAvailableUsers: (): Promise<{ data: User[] }> =>
    api.get('/chat/agents'),

  editMessage: (messageId: string, content: string): Promise<{ data: Message }> =>
    api.patch(`/chat/messages/${messageId}`, { content }),

  deleteMessage: (messageId: string): Promise<{ data: { deletedMessageId: string; receiverId: string } }> =>
    api.delete(`/chat/messages/${messageId}`),
};

export const notificationAPI = {
  getAll: (): Promise<{ data: Notification[] }> =>
    api.get('/notifications'),

  getUnreadCount: (): Promise<{ data: { unreadCount: number } }> =>
    api.get('/notifications/unread-count'),

  markAsRead: (id: string): Promise<{ data: { message: string; notification: Notification } }> =>
    api.patch(`/notifications/${id}/read`),

  markAllAsRead: (): Promise<{ data: { message: string; count: number } }> =>
    api.patch('/notifications/read-all'),

  delete: (id: string): Promise<{ data: { message: string } }> =>
    api.delete(`/notifications/${id}`),
};

export const libraryAPI = {
  upload: (file: File, description?: string): Promise<{ data: import('../types').LibraryImage }> => {
    const formData = new FormData();
    formData.append('file', file);
    if (description) formData.append('description', description);
    return api.post('/library/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getImages: (folderId?: string | null, agentId?: string): Promise<{ data: import('../types').LibraryImage[] }> => {
    const params: any = {};
    if (folderId !== undefined && folderId !== null) params.folderId = folderId;
    if (agentId) params.agentId = agentId;
    return api.get('/library/images', { params });
  },

  getTrash: (): Promise<{ data: import('../types').LibraryImage[] }> =>
    api.get('/library/trash'),

  getStats: (agentId?: string): Promise<{ data: import('../types').LibraryStats }> =>
    api.get('/library/stats', { params: agentId ? { agentId } : {} }),

  updateImage: (id: string, data: { description?: string; folderId?: string | null }): Promise<{ data: import('../types').LibraryImage }> =>
    api.patch(`/library/images/${id}`, data),

  delete: (id: string): Promise<{ data: { message: string } }> =>
    api.delete(`/library/images/${id}`),

  restore: (id: string): Promise<{ data: { message: string } }> =>
    api.post(`/library/images/${id}/restore`),

  permanentDelete: (id: string): Promise<{ data: { message: string } }> =>
    api.delete(`/library/images/${id}/permanent`),

  move: (imageIds: string[], folderId: string | null): Promise<{ data: { message: string } }> =>
    api.post('/library/move', { imageIds, folderId }),

  getFolders: (agentId?: string): Promise<{ data: import('../types').ImageFolder[] }> => {
    const params: any = {};
    if (agentId) params.agentId = agentId;
    return api.get('/library/folders', { params });
  },

  createFolder: (name: string): Promise<{ data: import('../types').ImageFolder }> =>
    api.post('/library/folders', { name }),

  renameFolder: (id: string, name: string): Promise<{ data: import('../types').ImageFolder }> =>
    api.patch(`/library/folders/${id}`, { name }),

  deleteFolder: (id: string): Promise<{ data: { message: string } }> =>
    api.delete(`/library/folders/${id}`),
};

export const reportAPI = {
  generate: (date?: string): Promise<{ data: { message: string; reports: any[] } }> =>
    api.post('/reports/generate', null, { params: date ? { date } : {} }),

  getReports: (page = 1, limit = 20): Promise<{ data: { items: any[]; total: number; page: number; limit: number; pages: number } }> =>
    api.get('/reports', { params: { page, limit } }),

  getReportById: (id: string): Promise<{ data: any }> =>
    api.get(`/reports/${id}`),

  getStats: (): Promise<{ data: { total: number; sent: number; failed: number } }> =>
    api.get('/reports/stats'),
};

export default api;
