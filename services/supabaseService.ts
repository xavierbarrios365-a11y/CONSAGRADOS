import { supabase } from './supabaseClient';
export { supabase };

import { Agent, Badge, InboxNotification, UserRole, Rank, DailyVerse as DailyVerseType, DuelChallenge } from '../types';

// --- Domain Services Bridge ---
export * from './agentService';
export * from './socialService';
export * from './authService';
export * from './gameService';
export * from './eventService';
export * from './notifyService';
export * from './resourceService';

// --- Consolidated Explicit Exports for Stability ---
import { getStreakMultiplier } from './agentService';
import {
    syncAcademyToSupabase,
    clearBibleWarQuestions,
    fetchBibleWarSession,
    updateBibleWarSession,
    transferBibleWarXP,
    fetchBibleWarGroups,
    submitBibleWarAnswer,
    importBibleWarQuestions,
    fetchLevelConfigs,
    fetchBibleWarQuestions
} from './gameService';
import { submitInversionLead } from './socialService';
import { fetchTacticalResourcesSupabase, addTacticalResourceSupabase, deleteTacticalResourceSupabase } from './resourceService';
import { sendTelegramAlert, sendPushBroadcast } from './notifyService';

export {
    getStreakMultiplier,
    syncAcademyToSupabase,
    clearBibleWarQuestions,
    fetchBibleWarSession,
    updateBibleWarSession,
    transferBibleWarXP,
    fetchBibleWarGroups,
    submitBibleWarAnswer,
    importBibleWarQuestions,
    fetchLevelConfigs,
    fetchBibleWarQuestions,
    submitInversionLead,
    fetchTacticalResourcesSupabase,
    addTacticalResourceSupabase,
    deleteTacticalResourceSupabase,
    sendTelegramAlert,
    sendPushBroadcast
};

export const CENSORED_WORDS = [
    'PUTA', 'PUTO', 'MAMAGUEVO', 'MAMAGUEBO', 'GUEVO', 'GUEBO', 'COÑO', 'MALDITA', 'MALDITO',
    'GUEVON', 'GUEBON', 'MADRE', 'HIJO DE PUTA', 'HDP', 'MARICO', 'MARICA', 'MARICON',
    'MALPARIDO', 'MALPARIDA', 'CARETABLA', 'LADRON', 'CHABESTIA', 'ESCUALIDO'
];

/**
 * @deprecated Use specific domain services. This file remains as a bridge for legacy imports.
 */
console.log('🛡️ Supabase Bridge Active: Domain modularization complete.');
