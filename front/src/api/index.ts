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
    superviseurCode: string;
    image?: File;
  }): Promise<{ data: SignupResponse }> => {
    const formData = new FormData();
    formData.append('firstName', data.firstName);
    formData.append('lastName', data.lastName);
    formData.append('matricule', data.matricule);
    formData.append('email', data.email);
    formData.append('password', data.password);
    formData.append('superviseurCode', data.superviseurCode);
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

  getMyAgents: (): Promise<{ data: User[] }> =>
    api.get('/auth/agents'),

  approveAgent: (agentId: string): Promise<{ data: { message: string; agent: User } }> =>
    api.post(`/auth/agents/${agentId}/approve`),

  rejectAgent: (agentId: string): Promise<{ data: { message: string; agent: User } }> =>
    api.post(`/auth/agents/${agentId}/reject`),
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

export const signatureAPI = {
  sign: (
    reportId: string,
  ): Promise<{ data: Blob; headers: Record<string, string> }> =>
    api.post(`/signature/sign/${reportId}`, undefined, { responseType: 'blob' }),

  verify: (pdf: Blob, reportId?: string): Promise<{ data: any }> => {
    const formData = new FormData();
    formData.append('pdf', pdf);
    if (reportId) formData.append('reportId', reportId);
    return api.post('/signature/verify', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getAuditTrail: (reportId: string): Promise<{ data: { count: number; items: any[] } }> =>
    api.get(`/signature/audit/${reportId}`),
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
    api.post('/reports/generate', {}, { params: date ? { date } : undefined }),

  getReports: (page = 1, limit = 20): Promise<{ data: { items: any[]; total: number; page: number; limit: number; pages: number } }> =>
    api.get('/reports', { params: { page, limit } }),

  getReportById: (id: string): Promise<{ data: any }> =>
    api.get(`/reports/${id}`),

  getStats: (): Promise<{ data: { total: number; sent: number; failed: number } }> =>
    api.get('/reports/stats'),

  deleteReport: (id: string): Promise<{ data: { message: string } }> =>
    api.delete(`/reports/${id}`),

  downloadPdf: (id: string): Promise<Blob> =>
    api.get(`/reports/${id}/pdf`, { responseType: 'blob' }).then(r => r.data),

  getRecipients: (): Promise<{ data: import('../types').ReportRecipient[] }> =>
    api.get('/reports/recipients'),

  addRecipient: (email: string): Promise<{ data: import('../types').ReportRecipient }> =>
    api.post('/reports/recipients', { email }),

  deleteRecipient: (id: string): Promise<{ data: { message: string } }> =>
    api.delete(`/reports/recipients/${id}`),
};

export const objectivesAPI = {
  create: (data: {
    title: string;
    description?: string;
    category: string;
    targetValue: number;
    unit?: string;
    priority?: string;
    startDate: string;
    endDate: string;
    higherIsBetter?: boolean;
    currentValue?: number;
    superviseurId?: string;
  }): Promise<{ data: import('../types').QualityObjective }> =>
    api.post('/quality-objectives', data),

  getAll: (params?: {
    status?: string;
    category?: string;
    superviseurId?: string;
  }): Promise<{ data: import('../types').QualityObjective[] }> =>
    api.get('/quality-objectives', { params }),

  getById: (id: string): Promise<{ data: import('../types').QualityObjective }> =>
    api.get(`/quality-objectives/${id}`),

  update: (id: string, data: {
    title?: string;
    description?: string;
    category?: string;
    targetValue?: number;
    unit?: string;
    priority?: string;
    startDate?: string;
    endDate?: string;
    higherIsBetter?: boolean;
    currentValue?: number;
  }): Promise<{ data: import('../types').QualityObjective }> =>
    api.patch(`/quality-objectives/${id}`, data),

  remove: (id: string): Promise<{ data: { message: string } }> =>
    api.delete(`/quality-objectives/${id}`),

  getDashboard: (superviseurId?: string): Promise<{ data: import('../types').ObjectivesDashboard }> =>
    api.get('/quality-objectives/dashboard', { params: superviseurId ? { superviseurId } : {} }),

  getPredictions: (superviseurId?: string): Promise<{ data: import('../types').ObjectivePrediction[] }> =>
    api.get('/quality-objectives/predictions', { params: superviseurId ? { superviseurId } : {} }),

  getHistory: (objectiveId?: string): Promise<{ data: import('../types').ObjectiveHistoryRow[] }> =>
    api.get('/quality-objectives/history', { params: objectiveId ? { objectiveId } : {} }),

  getBadges: (superviseurId?: string): Promise<{ data: import('../types').ObjectiveBadge[] }> =>
    api.get('/quality-objectives/badges', { params: superviseurId ? { superviseurId } : {} }),
};

export default api;

export const pushAPI = {
  getVapidPublicKey: (): Promise<{ data: { publicKey: string | null } }> =>
    api.get('/push/vapid-public-key'),

  subscribe: (data: {
    endpoint: string;
    p256dh: string;
    auth: string;
    browser?: string;
    device?: string;
    platform?: string;
  }): Promise<{ data: import('../types').PushSubscriptionInfo }> =>
    api.post('/push/subscribe', data),

  unsubscribe: (endpoint?: string): Promise<{ data: { message: string } }> =>
    api.post('/push/unsubscribe', endpoint ? { endpoint } : {}),

  sendTest: (): Promise<{ data: { message: string } }> =>
    api.post('/push/test'),

  getHistory: (page = 1, limit = 25): Promise<{
    data: { items: import('../types').PushNotificationHistoryRow[]; total: number; page: number; limit: number };
  }> => api.get('/push/history', { params: { page, limit } }),

  getSettings: (): Promise<{
    data: {
      preferences: import('../types').NotificationPreferences;
      subscriptions: import('../types').PushSubscriptionInfo[];
    };
  }> => api.get('/push/settings'),

  updateSettings: (data: Partial<import('../types').NotificationPreferences>): Promise<{
    data: import('../types').NotificationPreferences;
  }> => api.patch('/push/settings', data),

  getAnalytics: (days = 14): Promise<{ data: import('../types').PushAnalytics }> =>
    api.get('/push/analytics', { params: { days } }),

  getEscalationConfig: (): Promise<{ data: import('../types').PushEscalationConfig }> =>
    api.get('/push/escalation'),

  updateEscalationConfig: (data: Partial<import('../types').PushEscalationConfig>): Promise<{
    data: import('../types').PushEscalationConfig;
  }> => api.patch('/push/escalation', data),

runEscalation: (): Promise<{ data: { escalated: number } }> =>
    api.post('/push/escalation/run'),
};

export const calendarAPI = {
  getEvents: (params: Record<string, unknown>): Promise<{ data: import('../types').CalendarEvent[] }> =>
    api.get('/calendar/events', { params }),

  getEventById: (id: number): Promise<{ data: import('../types').CalendarEvent }> =>
    api.get(`/calendar/events/${id}`),

  createEvent: (data: Record<string, unknown>): Promise<{ data: import('../types').CalendarEvent }> =>
    api.post('/calendar/events', data),

  updateEvent: (id: number, data: Record<string, unknown>): Promise<{ data: import('../types').CalendarEvent }> =>
    api.patch(`/calendar/events/${id}`, data),

  deleteEvent: (id: number): Promise<{ data: { message: string } }> =>
    api.delete(`/calendar/events/${id}`),

  completeEvent: (id: number, completedNote?: string): Promise<{ data: import('../types').CalendarEvent }> =>
    api.patch(`/calendar/events/${id}/complete`, completedNote ? { completedNote } : {}),

  getStats: (): Promise<{ data: import('../types').CalendarStats }> =>
    api.get('/calendar/events/stats'),

  getMyTasks: (startDate: string, endDate: string, status?: string): Promise<{ data: import('../types').CalendarEvent[] }> =>
    api.get('/calendar/events/my-tasks', { params: { startDate, endDate, status } }),

  getNotifications: (): Promise<{ data: import('../types').EventNotification[] }> =>
    api.get('/calendar/notifications'),

  markNotificationsRead: (notifIds?: number[]): Promise<{ data: { message: string } }> =>
    api.patch('/calendar/notifications/read', notifIds ? { notifIds } : {}),
};
