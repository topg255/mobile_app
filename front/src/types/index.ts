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
  profileImage?: string;
  superviseurCode?: string;
  superviseurId?: string;
  superviseur?: User;
  isApprovedBySuperviseur?: boolean;
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
  image?: string;
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
    profileImage?: string;
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

export interface Message {
  id: string;
  sender: User;
  receiver: User;
  content: string;
  isRead: boolean;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  user: User;
  lastMessage: Message;
  unreadCount: number;
}

export enum NotificationType {
  MESSAGE = 'message',
  LIGNE_ADDED = 'ligne_added',
  LIGNE_UPDATED = 'ligne_updated',
  REPORT_GENERATED = 'report_generated',
}

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  isRead: boolean;
  relatedId: string | null;
  createdAt: string;
}

export interface LibraryImage {
  id: string;
  url: string;
  filename: string;
  originalName: string;
  description: string | null;
  mimeType: string;
  fileSize: number;
  uploadedBy: User;
  folder: ImageFolder | null;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
}

export interface ImageFolder {
  id: string;
  name: string;
  createdBy: User;
  createdAt: string;
}

export interface LibraryStats {
  total: number;
  trashCount: number;
  folderCount: number;
}

export interface ReportRecipient {
  id: string;
  superviseurId: string;
  email: string;
  createdAt: string;
}
