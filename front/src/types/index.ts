export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  SUPERVISEUR_QUALITE = 'superviseur_qualite',
  AGENT_QUALITE = 'agent_qualite',
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  matricule: string;
  email: string;
  role: UserRole;
  isApproved?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthResponse {
  message: string;
  accessToken: string;
  user: User;
}

export interface SignupResponse {
  message: string;
  user: User;
}

export enum NoteQualite {
  VERT = 'vert',
  JAUNE = 'jaune',
  ROUGE = 'rouge',
}

export interface ControleDate {
  id: string;
  dateControle: string;
  isActive: boolean;
  createdBy: User;
  createdAt: string;
}

export interface LigneControle {
  id: string;
  nomLigne: string;
  heure?: string;
  note: NoteQualite;
  delais: string;
  responsable: string;
  details: string;
  controleDate: ControleDate;
  agent: User;
  createdAt: string;
}

export interface Rapport {
  periode: { debut: string; fin: string };
  totalLignes: number;
  repartition: { vert: number; jaune: number; rouge: number };
  repartitionPourcentage: { vert: number; jaune: number; rouge: number };
  minutesArretCumulees: number;
  details: RapportDetail[];
}

export interface RapportDetail {
  id: string;
  nomLigne: string;
  heure?: string;
  note: NoteQualite;
  delais: string;
  responsable: string;
  details: string;
  dateControle: string;
  agent: {
    id: string;
    firstName: string;
    lastName: string;
    matricule: string;
  };
  createdAt: string;
}

export interface HistoriqueAgent {
  agent: {
    id: string;
    firstName: string;
    lastName: string;
    matricule: string;
  };
  totalLignes: number;
  lignes: LigneControle[];
}

export interface LoginLog {
  id: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    matricule: string;
    role: UserRole;
  };
  action: 'login' | 'logout';
  ipAddress: string | null;
  userAgent: string | null;
  loggedAt: string;
}

export interface SuperAdminStats {
  totalUsers: number;
  totalAgents: number;
  totalSuperviseurs: number;
  pendingUsers: number;
  approvedUsers: number;
  totalLogs: number;
}
