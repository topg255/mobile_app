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
  }): Promise<{ data: SignupResponse }> =>
    api.post('/auth/signup/agent-qualite', data),

  signupSuperviseur: (data: {
    firstName: string;
    lastName: string;
    matricule: string;
    email: string;
    password: string;
  }): Promise<{ data: SignupResponse }> =>
    api.post('/auth/signup/superviseur-qualite', data),

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

export default api;
