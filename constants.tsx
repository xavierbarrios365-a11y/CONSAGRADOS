
import React from 'react';
import { Shield, Target, Award, Star } from 'lucide-react';
import { Rank } from './types';

export const RANK_CONFIG = {
  [Rank.RECLUTA]: {
    minXp: 0,
    color: '#9ca3af', // Gray
    icon: <Shield className="w-5 h-5" />,
    label: 'Recluta'
  },
  [Rank.ACTIVO]: {
    minXp: 100,
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
    minXp: 1000,
    color: '#d4af37', // Gold
    icon: <Star className="w-5 h-5" />,
    label: 'Referente'
  }
};

export const XP_RULES = {
  BASE: 10,
  BIBLE_BONUS: 5,
  NOTES_BONUS: 5
};
