
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
  streakCount?: number;
  weeklyTasks?: { id: string; title: string; completed: boolean }[];
}

export interface DailyVerse {
  verse: string;
  reference: string;
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
  HOME = 'home'
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
