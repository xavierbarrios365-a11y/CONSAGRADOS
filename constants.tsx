
import React from 'react';
import { Shield, Target, Award, Star, Crown } from 'lucide-react';
import { Rank } from './types';

export const RANK_CONFIG = {
  [Rank.RECLUTA]: {
    minXp: 0,
    color: '#9ca3af', // Gray
    icon: <Shield className="w-5 h-5" />,
    label: 'Recluta'
  },
  [Rank.ACTIVO]: {
    minXp: 300,
    color: '#3b82f6', // Blue
    icon: <Target className="w-5 h-5" />,
    label: 'Activo'
  },
  [Rank.CONSAGRADO]: {
    minXp: 500,
    color: '#8b5cf6', // Purple
    icon: <Award className="w-5 h-5" />,
    label: 'Consagrado'
  },
  [Rank.REFERENTE]: {
    minXp: 700,
    color: '#d4af37', // Gold
    icon: <Star className="w-5 h-5" />,
    label: 'Referente'
  },
  [Rank.LIDER]: {
    minXp: 1000,
    color: '#ef4444', // Red
    icon: <Crown className="w-5 h-5" />,
    label: 'Líder'
  }
};

export const XP_RULES = {
  BASE: 10,
  BIBLE_BONUS: 5,
  NOTES_BONUS: 5
};

export const PROMOTION_RULES: Record<string, { nextRank: string; requiredXp: number; requiredCertificates: number }> = {
  'RECLUTA': { nextRank: 'ACTIVO', requiredXp: 300, requiredCertificates: 5 },
  'ACTIVO': { nextRank: 'CONSAGRADO', requiredXp: 500, requiredCertificates: 10 },
  'CONSAGRADO': { nextRank: 'REFERENTE', requiredXp: 700, requiredCertificates: 20 },
  'REFERENTE': { nextRank: 'LÍDER', requiredXp: 1000, requiredCertificates: 40 },
};

export const TASK_AREAS = [
  { value: 'SERVICIO', label: 'Servicio', icon: '🛠️' },
  { value: 'ESPIRITUAL', label: 'Espiritual', icon: '🙏' },
  { value: 'MISION', label: 'Misión', icon: '🎯' },
  { value: 'CAPACITACION', label: 'Capacitación', icon: '📚' },
  { value: 'LIDERAZGO', label: 'Liderazgo', icon: '👑' },
  { value: 'FORMACION', label: 'Formación', icon: '🌱' },
];
