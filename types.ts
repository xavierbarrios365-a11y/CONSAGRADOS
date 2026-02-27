
export enum Rank {
  RECLUTA = 'RECLUTA',
  ACTIVO = 'ACTIVO',
  CONSAGRADO = 'CONSAGRADO',
  REFERENTE = 'REFERENTE',
  LIDER = 'LÍDER'
}

export enum UserRole {
  DIRECTOR = 'DIRECTOR',
  LEADER = 'LEADER',
  STUDENT = 'STUDENT'
}

export interface Agent {
  id: string;
  name: string;
  photoUrl: string;
  rank: string;
  role: string;
  talent: string;
  baptismStatus: string;
  status: string;
  xp: number;
  userRole: UserRole;
  pin: string;
  idSignature: string;
  joinedDate: string;
  bible: number;
  notes: number;
  leadership: number;
  age?: string;
  birthday?: string;
  whatsapp?: string;
  relationshipWithGod?: string;
  accessLevel?: string;
  securityQuestion?: string;
  securityAnswer?: string;
  mustChangePassword: boolean;
  tacticalStats?: {
    liderazgo: number;
    servicio: number;
    analisis: number;
    potencial: number;
    adaptabilidad: number;
  };
  tacticalSummary?: string;
  lastAiUpdate?: string;
  biometricCredential?: string;
  isAiProfilePending?: boolean;
  streakCount?: number;
  lastStreakDate?: string;
  lastAttendance?: string;
  weeklyTasks?: { id: string; title: string; completed: boolean }[];
  notifPrefs?: { read: string[]; deleted: string[] };
  lastCourse?: string;
}

export interface DailyVerse {
  verse: string;
  reference: string;
  lastStreakDate?: string;
}

export interface Guide {
  id: string;
  name: string;
  type: 'ESTUDIANTE' | 'LIDER';
  url: string;
  date: string;
}

export enum AppView {
  SCANNER = 'scanner',
  DIRECTORY = 'directory',
  ENROLLMENT = 'enrollment',
  PROFILE = 'profile',
  CONTENT = 'content',
  CIU = 'CIU',
  SETTINGS = 'SETTINGS',
  VISITOR = 'VISITOR',
  ACADEMIA = 'ACADEMIA',
  RANKING = 'RANKING',
  ASCENSO = 'ASCENSO',
  TAREAS = 'TAREAS',
  CAPACITACION = 'CAPACITACION',
  HOME = 'home',
  ADMIN = 'admin',
  BIBLE_WAR_DISPLAY = 'BIBLE_WAR_DISPLAY',
  BIBLE_WAR_ARENA = 'BIBLE_WAR_ARENA',
  BIBLE_WAR_STUDENT = 'BIBLE_WAR_STUDENT'
}

export interface Visitor {
  id: string;
  name: string;
  visits?: number;
  absences?: number;
  status: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  requiredLevel: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer?: string;
  type: 'TEXT' | 'MULTIPLE' | 'DISC';
  optionCategories?: string[]; // Para tests tipo DISC o por categorías
  points?: number; // Puntos por respuesta correcta (si aplica)
}

export interface Lesson {
  id: string;
  courseId: string;
  order: number;
  title: string;
  videoUrl: string;
  content: string;
  questions: QuizQuestion[];
  xpReward: number;
  startTime?: number;
  endTime?: number;
  resultAlgorithm?: 'HIGHEST_CATEGORY' | 'SCORE_PERCENTAGE';
  resultMappings?: {
    category?: string;
    minScore?: number;
    maxScore?: number;
    title: string;
    content: string;
  }[];
}

export interface LessonProgress {
  lessonId: string;
  status: 'COMPLETADO' | 'FALLIDO';
  score: number;
  date: string;
  attempts: number;
}

export interface InboxNotification {
  id: string;
  fecha: string;
  titulo: string;
  mensaje: string;
  categoria: 'ALERTA' | 'INFO' | 'MISION';
  emisor: string;
}

// ===== SISTEMA DE ASCENSO =====

export interface ServiceTask {
  id: string;
  title: string;
  description: string;
  area: string;
  requiredLevel: string;
  xpReward: number;
  maxSlots: number;
  currentSlots: number;
}

export interface TaskProgress {
  taskId: string;
  agentId: string;
  completedDate: string;
  verifiedBy: string;
  status: 'SOLICITADO' | 'EN_PROGRESO' | 'ENTREGADO' | 'VERIFICADO' | 'RECHAZADO';
}

export interface NewsFeedItem {
  id: string;
  type: 'CURSO_COMPLETADO' | 'ASCENSO' | 'CERTIFICADO' | 'RACHA' | 'RANKING' | 'TAREA' | 'DESPLIEGUE' | 'OPERACION' | 'INSIGNIA';
  message: string;
  date: string;
  agentId?: string;
  agentName?: string;
  verse?: string;
  reference?: string;
}

export interface Badge {
  type: 'CONSAGRADO_MES' | 'RECLUTADOR' | 'STREAKER' | 'MISIONERO_ELITE' | 'ACADEMICO';
  emoji: string;
  label: string;
  agentId?: string;
  agentName: string;
  value: number;
}

export interface BibleWarSession {
  id: string;
  status: 'WAITING' | 'ACTIVE' | 'SPINNING' | 'RESOLVED' | 'FINISHED';
  score_a: number;
  score_b: number;
  current_question_id: string | null;
  active_team: 'A' | 'B' | null;
  stakes_xp: number;
  show_answer: boolean;
  roulette_category: string | null;
  updated_at: string;
  answer_a?: string | null;
  answer_b?: string | null;
  accumulated_pot?: number;
  timer_status?: 'RUNNING' | 'STOPPED';
  timer_end_at?: string | null;
  last_coin_flip?: string | null;
}

