
export enum Rank {
  RECLUTA = 'RECLUTA',
  ACTIVO = 'ACTIVO',
  CONSAGRADO = 'CONSAGRADO',
  REFERENTE = 'REFERENTE'
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
  SETTINGS = 'SETTINGS'
}
