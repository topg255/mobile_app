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
  OBJECTIVE_AT_RISK = 'objective_at_risk',
  OBJECTIVE_COMPLETED = 'objective_completed',
  OBJECTIVE_FAILED = 'objective_failed',
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

export enum ObjectiveCategory {
  COMPLIANCE = 'compliance',
  CRITICAL_INCIDENTS = 'critical_incidents',
  DOWNTIME = 'downtime',
  RESOLUTION_TIME = 'resolution_time',
  INSPECTIONS = 'inspections',
  PRODUCTIVITY = 'productivity',
  PHOTOS = 'photos',
  TRAINING = 'training',
  CUSTOM = 'custom',
}

export enum ObjectiveStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  AT_RISK = 'at_risk',
}

export enum ObjectivePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface QualityObjective {
  id: string;
  title: string;
  description: string | null;
  category: ObjectiveCategory;
  targetValue: number;
  currentValue: number;
  unit: string;
  higherIsBetter: boolean;
  progress: number;
  status: ObjectiveStatus;
  priority: ObjectivePriority;
  startDate: string;
  endDate: string;
  predictionProbability: number | null;
  predictedValue: number | null;
  riskLevel: RiskLevel;
  recommendation: string | null;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

export interface ObjectiveBadge {
  id: string;
  code: string;
  name: string;
  description: string;
  unlockedAt: string;
}

export interface ObjectiveHistoryRow {
  id: string;
  objectiveId: string;
  value: number;
  progress: number;
  probability: number | null;
  recordedAt: string;
}

export interface ObjectiveKpis {
  total: number;
  active: number;
  atRisk: number;
  completed: number;
  failed: number;
  avgProbability: number;
}

export interface ObjectivesDashboard {
  kpis: ObjectiveKpis;
  objectives: QualityObjective[];
  monthlyEvolution: {
    month: string;
    label: string;
    avgProgress: number | null;
    avgProbability: number | null;
    objectives: number;
  }[];
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  badges: ObjectiveBadge[];
}

export interface ObjectivePrediction {
  id: string;
  title: string;
  category: ObjectiveCategory;
  currentValue: number;
  targetValue: number;
  unit: string;
  progress: number;
  status: ObjectiveStatus;
  priority: ObjectivePriority;
  predictedValue: number | null;
  predictionProbability: number | null;
  riskLevel: RiskLevel;
  daysRemaining: number;
  endDate: string;
}
