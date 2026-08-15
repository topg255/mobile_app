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

// ------------------------------------------------------------------
// Push Notifications
// ------------------------------------------------------------------

export enum PushCategory {
  QUALITY_CRITICAL = 'quality_critical',
  QUALITY_WARNING = 'quality_warning',
  PRODUCTION_STOP = 'production_stop',
  AI_REPORT = 'ai_report',
  OBJECTIVE_RISK = 'objective_risk',
  OBJECTIVE_COMPLETED = 'objective_completed',
  CHAT_MESSAGE = 'chat_message',
  AGENT_REGISTRATION = 'agent_registration',
  AGENT_APPROVED = 'agent_approved',
  BENCHMARK = 'benchmark',
  AI_RISK = 'ai_risk',
  CAPA = 'capa',
  SYSTEM = 'system',
}

export enum PushPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum PushDeliveryStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  DISMISSED = 'dismissed',
  FAILED = 'failed',
}

export interface PushSubscriptionInfo {
  id: string;
  endpoint: string;
  browser: string;
  device: string;
  platform: string;
  isActive: boolean;
  lastActivityAt: string | null;
  createdAt: string;
}

export interface NotificationPreferences {
  id: string;
  criticalAlerts: boolean;
  aiReports: boolean;
  objectives: boolean;
  messages: boolean;
  benchmarkAlerts: boolean;
  weeklyReports: boolean;
  systemNotifications: boolean;
  capaAlerts: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  dndEnabled: boolean;
  dndStart: string;
  dndEnd: string;
  lastBenchmarkRank: number | null;
}

export interface PushNotificationHistoryRow {
  id: string;
  title: string;
  body: string;
  category: PushCategory;
  priority: PushPriority;
  data: Record<string, any> | null;
  deliveryStatus: PushDeliveryStatus;
  groupKey: string | null;
  groupCount: number;
  sentAt: string;
  deliveredAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  dismissedAt: string | null;
  escalatedAt: string | null;
  escalationLevel: number;
  devicePlatform: string | null;
  createdAt: string;
}

export interface PushAnalytics {
  totals: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    dismissed: number;
    failed: number;
    avgResponseMs: number;
    criticalResponseMs: number;
  };
  daily: {
    date: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    dismissed: number;
  }[];
  topSupervisors: {
    userId: string;
    name: string;
    sent: number;
    opened: number;
    clicked: number;
  }[];
}

export interface PushEscalationConfig {
  id: number;
  criticalEscalationMin: number;
  highEscalationMin: number;
  mediumEscalationMin: number;
  groupingWindowMin: number;
  enabled: boolean;
}

export enum CalendarEventType {
  INSPECTION = 'inspection',
  REUNION = 'reunion',
  AUDIT = 'audit',
  FORMATION = 'formation',
  MAINTENANCE = 'maintenance',
  AUTRE = 'autre',
}

export enum EventPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum EventStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  POSTPONED = 'postponed',
}

export type CalendarEventFilter = CalendarEventType | EventPriority | EventStatus;

export interface CalendarEvent {
  id: number;
  title: string;
  description: string | null;
  type: CalendarEventType;
  customType: string | null;
  priority: EventPriority;
  startDate: string;
  endDate: string;
  allDay: boolean;
  location: string | null;
  superviseurId: string;
  assignedToId: string | null;
  assignedToName: string | null;
  status: EventStatus;
  isRecurring: boolean;
  recurrenceRule: string | null;
  recurrenceParentId: number | null;
  reminderMinutes: number | null;
  color: string | null;
  attachmentNote: string | null;
  completedAt: string | null;
  completedNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export enum EventNotifType {
  ASSIGNED = 'ASSIGNED',
  REMINDER = 'REMINDER',
  UPDATED = 'UPDATED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export interface EventNotification {
  id: number;
  eventId: number;
  recipientId: string;
  type: EventNotifType;
  isRead: boolean;
  sentAt: string;
  message: string;
}

export interface CalendarStats {
  totalEvents: number;
  assignedToAgents: number;
  personalTasks: number;
  completedCount: number;
  pendingCount: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  upcomingToday: CalendarEvent[];
}

export type SignatureProcessingStatusValue =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export interface SuperviseurSignature {
  id: number;
  superviseurId: string;
  originalImageBase64: string;
  enhancedImageBase64: string | null;
  svgPath: string | null;
  width: number;
  height: number;
  isActive: boolean;
  quality: number | null;
  improvements: string | null;
  processingStatus: SignatureProcessingStatusValue;
  processingError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalSignature {
  base64: string;
  width: number;
  height: number;
}

export interface SignatureUploadResult {
  id: number;
  superviseurId: string;
  processingStatus: SignatureProcessingStatusValue;
}

// ─── CAPA ────────────────────────────────────────────────────────────────

export type CapaStatus = 'ouvert' | 'en_analyse' | 'en_cours' | 'en_verification' | 'cloture' | 'annule';
export type CapaPriority = 'faible' | 'moyenne' | 'haute' | 'critique';
export type CapaTypeValue = 'corrective' | 'preventive' | 'les_deux';
export type ActionTypeValue = 'corrective' | 'preventive';
export type ActionStatusValue = 'a_faire' | 'en_cours' | 'terminee' | 'bloquee';

export interface Capa {
  id: number;
  reference: string;
  ligneControleId: string | null;
  nomLigne: string;
  superviseurId: string;
  superviseurName: string;
  titre: string;
  description: string;
  status: CapaStatus;
  priority: CapaPriority;
  type: CapaTypeValue;
  causeRacine: string | null;
  causeRacineIA: string | null;
  dateEcheance: string;
  dateOuverture: string;
  dateCloture: string | null;
  efficaciteVerifiee: boolean;
  noteEfficacite: string | null;
  coutEstime: number | null;
  createdAt: string;
  updatedAt: string;
  totalActions?: number;
  terminees?: number;
  enRetard?: boolean;
  actions?: CapaAction[];
  commentaires?: CapaCommentaire[];
}

export interface CapaAction {
  id: number;
  capaId: number;
  titre: string;
  description: string;
  type: ActionTypeValue;
  responsableId: string;
  responsableName: string;
  dateEcheance: string;
  status: ActionStatusValue;
  completedAt: string | null;
  preuve: string | null;
  createdAt: string;
  updatedAt: string;
  capa?: Capa;
}

export interface CapaCommentaire {
  id: number;
  capaId: number;
  auteurId: string;
  auteurName: string;
  contenu: string;
  type: 'commentaire' | 'changement_statut' | 'action_ajoutee' | 'verification';
  ancienStatut: string | null;
  nouveauStatut: string | null;
  createdAt: string;
}

export interface CapaStats {
  totalCapas: number;
  ouverts: number;
  enCours: number;
  cloturesThisMois: number;
  tauxResolution: number;
  delaiMoyenResolution: number;
  capasEnRetard: Capa[];
  byPriority: Record<string, number>;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  topLignesProblematiques: { nomLigne: string; count: number }[];
}

export interface Audit5S {
  id: number;
  ligneControleId: string;
  nomLigne: string;
  agentId: string;
  agentName: string;
  superviseurId: string;
  scoreGlobal: number;
  noteCalculee: 'vert' | 'orange' | 'rouge';
  scoreS1: number;
  scoreS2: number;
  scoreS3: number;
  scoreS4: number;
  scoreS5: number;
  reponsesJson: string;
  analyseIA: string | null;
  pilierPlusFaible: string | null;
  capaDeclenche: boolean;
  capaId: number | null;
  dureeRemplissageSecondes: number | null;
  commentaireAgent: string | null;
  createdAt: string;
}

export interface Critere5S {
  id: number;
  label: string;
  points: number;
  ordre: number;
}

export interface CriteresParPilier {
  s1: { label: string; criteria: Critere5S[] };
  s2: { label: string; criteria: Critere5S[] };
  s3: { label: string; criteria: Critere5S[] };
  s4: { label: string; criteria: Critere5S[] };
  s5: { label: string; criteria: Critere5S[] };
}

export interface Audit5SStats {
  moyenneScore: number;
  repartitionNotes: { vert: number; orange: number; rouge: number };
  evolutionScoreParJour: { date: string; moyenne: number }[];
  piliersPlusFaibles: { pilier: string; scoreMoyen: number }[];
  lignesMeilleureScore: { nomLigne: string; scoreMoyen: number }[];
  lignesPireScore: { nomLigne: string; scoreMoyen: number }[];
  totalAuditsEffectues: number;
}
