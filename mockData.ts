
import { Agent, Rank, UserRole } from './types';

export const INITIAL_AGENTS: Agent[] = [
  {
    id: 'OP-4251',
    name: 'SAHEL XAVIER BARRIOS MERCADO',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png',
    role: 'AGENTE OPERATIVO',
    talent: 'SISTEMAS',
    baptismStatus: 'SÍ',
    status: 'ACTIVO',
    xp: 420,
    rank: Rank.ACTIVO,
    userRole: UserRole.LEADER, // Sahel ahora tiene rango de Líder para ver Escáner
    pin: '1234',
    joinedDate: '2024-05-20',
    idSignature: 'SIG-V37-SAHEL-4251',
    // Added missing required CIU properties and optional info
    bible: 75,
    notes: 85,
    leadership: 65,
    age: '17 AÑOS',
    birthday: '20/05'
  },
  {
    id: 'v-20389331',
    name: 'ADMIN DIRECTOR',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    role: 'ALTO MANDO',
    talent: 'ESTRATEGIA',
    baptismStatus: 'SÍ',
    status: 'ACTIVO',
    xp: 2500,
    rank: Rank.REFERENTE,
    userRole: UserRole.DIRECTOR,
    pin: '20.Gym..20',
    joinedDate: '2020-01-01',
    idSignature: 'SIG-MASTER-20389331',
    // Added missing required CIU properties and optional info
    bible: 100,
    notes: 100,
    leadership: 100,
    age: '28 AÑOS',
    birthday: '01/01'
  }
];
