import { useState, useCallback, useEffect, useRef } from 'react';
import { Agent, UserRole, Visitor, Badge } from '../types';
import { INITIAL_AGENTS } from '../mockData';

import {
    fetchAgentsFromSupabase,
    fetchVisitorRadarSupabase as fetchVisitorRadar,
    fetchActiveEventsSupabase as fetchActiveEvents,
    fetchUserEventConfirmationsSupabase as fetchUserEventConfirmations,
    checkAndPublishBirthdays,
    computeBadgesSupabase,
    fetchNotificationsSupabase,
    supabase
} from '../services/supabaseService';

export function useDataSync(currentUser: Agent | null, isLoggedIn: boolean) {
    const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
    const [isSyncing, setIsSyncing] = useState(false);
    const [visitorRadar, setVisitorRadar] = useState<Visitor[]>([]);
    const [activeEvents, setActiveEvents] = useState<any[]>([]);
    const [badges, setBadges] = useState<Badge[]>([]);
    const [headlines, setHeadlines] = useState<string[]>([]);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [userConfirmations, setUserConfirmations] = useState<string[]>([]);

    /**
     * Syncs all data from the backend.
     * Returns the fresh agents list so the caller can update currentUser.
     */
    const syncData = useCallback(async (isSilent = false): Promise<Agent[] | null> => {
        if (!isSilent) setIsSyncing(true);
        try {
            const callerRole = currentUser?.userRole || 'STUDENT';
            const sheetAgents = await fetchAgentsFromSupabase(false, callerRole);
            console.log(`🔄 SYNC [${callerRole}]: ${sheetAgents?.length || 0} agents, optimized columns`);
            if (sheetAgents && sheetAgents.length > 0) {
                setAgents(sheetAgents);

                // Run birthday check once per day locally
                const todayStr = new Date().toISOString().split('T')[0];
                if (localStorage.getItem('last_birthday_check_v4') !== todayStr) {
                    checkAndPublishBirthdays(sheetAgents).then(() => {
                        localStorage.setItem('last_birthday_check_v4', todayStr);
                    });
                }
            } else {
                console.warn('⚠️ SYNC: Empty response, keeping existing agents');
            }

            // Eventos: fetch ligero (pocas filas)
            const events = await fetchActiveEvents();
            setActiveEvents(events || []);

            // Badges: cachear con TTL de 10 min para no re-calcular cada ciclo
            const BADGE_CACHE_KEY = 'cached_badges';
            const BADGE_TTL = 600000; // 10 min
            const cachedBadges = localStorage.getItem(BADGE_CACHE_KEY);
            let badgeData: Badge[] = [];
            if (cachedBadges) {
                const parsed = JSON.parse(cachedBadges);
                if (Date.now() - parsed.ts < BADGE_TTL) {
                    badgeData = parsed.data;
                }
            }
            if (badgeData.length === 0) {
                badgeData = await computeBadgesSupabase() || [];
                localStorage.setItem(BADGE_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: badgeData }));
            }
            setBadges(badgeData);

            if (currentUser) {
                const confs = await fetchUserEventConfirmations(currentUser.id);
                const titles = confs.map((c: any) => {
                    if (c.detalle && c.detalle.includes('Confirmación para evento: ')) {
                        return c.detalle.replace('Confirmación para evento: ', '').trim();
                    }
                    return c.detalle || c.titulo || '';
                });
                setUserConfirmations(titles.filter(Boolean));
            }

            return sheetAgents;
        } catch (err) {
            console.error('❌ SYNC ERROR:', err);
            return null;
        } finally {
            if (!isSilent) setIsSyncing(false);
        }
    }, []);

    /**
     * Checks headlines for the news ticker: notifications, rankings, badges.
     */
    const checkHeadlines = useCallback(async () => {
        try {
            // 1. Notifications
            const notifs = await fetchNotificationsSupabase(currentUser?.id) || [];
            const agentId = currentUser?.id?.toUpperCase();

            const READ_KEY = agentId ? `read_notifications_${agentId}` : 'read_notifications';
            const DELETED_KEY = agentId ? `deleted_notifications_${agentId}` : 'deleted_notifications';

            // FALLBACK: Si no hay nada en localStorage para este usuario, usamos lo que viene del backend
            // UNIFICACIÓN DE PERSISTENCIA: Mezclar local con backend para evitar que reaparezcan
            const localReadStr = localStorage.getItem(READ_KEY);
            const localDelStr = localStorage.getItem(DELETED_KEY);
            const localReadIds = localReadStr ? JSON.parse(localReadStr) : [];
            const localDelIds = localDelStr ? JSON.parse(localDelStr) : [];

            const backendReadIds = currentUser?.notifPrefs?.read || [];
            const backendDelIds = currentUser?.notifPrefs?.deleted || [];

            // Unión de conjuntos para asegurar consistencia total
            const readIds = Array.from(new Set([...localReadIds, ...backendReadIds]));
            const delIds = Array.from(new Set([...localDelIds, ...backendDelIds]));

            // Si hubo mezcla y hay más datos, actualizar storage local
            if (readIds.length > localReadIds.length) localStorage.setItem(READ_KEY, JSON.stringify(readIds));
            if (delIds.length > localDelIds.length) localStorage.setItem(DELETED_KEY, JSON.stringify(delIds));

            // Filtrar: Dirigidas a mí o Globales + No leída + No borrada
            const unreadNotifs = notifs.filter(n => {
                const nAgentId = (n.agent_id || '').toUpperCase();
                const isMyNotif = !n.agent_id || nAgentId === agentId;
                const isNotRead = !readIds.includes(n.id);
                const isNotDeleted = !delIds.includes(n.id);
                return isMyNotif && isNotRead && isNotDeleted;
            });

            setUnreadNotifications(unreadNotifs.length);

            const notifHeadlines = unreadNotifs.slice(0, 5).map(n => `📢 ${n.titulo.toUpperCase()}`);

            // 2. Rankings (exclude NO ONE from feed so Directors appear)
            // FIX #3: Reuse already-synced agents instead of fetching again (halves API calls)
            const allAgents = agents;
            const filteredAgents = allAgents; // Se quitó el filtro que excluía a LÍDER y DIRECTOR

            const topXp = [...filteredAgents].sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 3);
            const topBible = [...filteredAgents].sort((a, b) => (b.bible || 0) - (a.bible || 0)).slice(0, 3);
            const topNotes = [...filteredAgents].sort((a, b) => (b.notes || 0) - (a.notes || 0)).slice(0, 3);
            const topLeadership = [...filteredAgents].sort((a, b) => (b.leadership || 0) - (a.leadership || 0)).slice(0, 3);
            const topStreaks = [...filteredAgents].sort((a, b) => (b.streakCount || 0) - (a.streakCount || 0)).slice(0, 3);

            const rankHeadlines = topXp.map((a, i) => `🔥 TOP ${i + 1} XP: ${a.name} (${a.xp} XP)`);
            const bibleHeadlines = topBible.map((a, i) => `📖 TOP ${i + 1} BIBLIA: ${a.name} (${a.bible} PTS)`);
            const notesHeadlines = topNotes.map((a, i) => `📑 TOP ${i + 1} APUNTES: ${a.name} (${a.notes} PTS)`);
            const leadershipHeadlines = topLeadership.map((a, i) => `🎖️ TOP ${i + 1} LIDERAZGO: ${a.name} (${a.leadership} PTS)`);
            const streakHeadlines = topStreaks.map((a, i) => `⚡ RACHA TOP: ${a.name} (${a.streakCount} DÍAS)`);

            // 3. Badges (usar los ya cacheados, NO re-fetch)
            const badgeHeadlines = badges.slice(0, 5).map(b => `🎖️ LOGRO: ${b.agentName} ganó ${b.label} (${b.value})`);

            // Combine
            setHeadlines([
                ...notifHeadlines,
                ...badgeHeadlines,
                ...rankHeadlines,
                ...bibleHeadlines,
                ...notesHeadlines,
                ...leadershipHeadlines,
                ...streakHeadlines,
                "🚀 BIENVENIDO AL CENTRO DE OPERACIÓN CONSAGRADOS 2026",
                "🎯 CUMPLE TUS MISIONES DIARIAS PARA SUBIR EN EL RANKING"
            ]);
        } catch (e) {
            console.error("Error en pulso de datos para ticker:", e);
        }
    }, [currentUser, agents]);

    // === REFS ESTABLES para romper ciclos de dependencia ===
    const syncDataRef = useRef(syncData);
    syncDataRef.current = syncData;
    const checkHeadlinesRef = useRef(checkHeadlines);
    checkHeadlinesRef.current = checkHeadlines;

    // Badging API Synchronization
    useEffect(() => {
        const anyNav = navigator as any;
        const supportsBadging = 'setAppBadge' in anyNav || 'setExperimentalAppBadge' in anyNav;

        console.log(`📊 Badging API Check: ${supportsBadging ? 'Soportado' : 'No Soportado'}. Unread: ${unreadNotifications}`);

        if (supportsBadging) {
            const setBadge = anyNav.setAppBadge || anyNav.setExperimentalAppBadge;
            const clearBadge = anyNav.clearAppBadge || anyNav.clearExperimentalAppBadge;

            if (unreadNotifications > 0) {
                setBadge.call(anyNav, unreadNotifications).then(() => {
                    console.log(`✅ Badge seteado a: ${unreadNotifications}`);
                }).catch((err: any) => {
                    console.warn("⚠️ Badging API failed:", err);
                });
            } else {
                clearBadge.call(anyNav).then(() => {
                    console.log(`✅ Badge limpiado`);
                }).catch((err: any) => {
                    console.warn("⚠️ Badging API clear failed:", err);
                });
            }
        }
    }, [unreadNotifications]);

    // ==========================================
    // ESTRATEGIA DE SYNC NIVEL 2 (ULTRA-AHORRO)
    // 1. Fetch completo SOLO al montar (1 vez)
    // 2. Realtime para cambios en 'agentes' (WebSocket, NO cuenta como egress)
    // 3. Realtime para nuevas notificaciones (ya existente)
    // 4. Sync de RESPALDO cada 10 min (seguridad)
    // ==========================================

    // 1. Fetch inicial al montar (UNA SOLA VEZ)
    useEffect(() => {
        syncDataRef.current();
        checkHeadlinesRef.current();

        // Respaldo: Sync cada 10 min
        const interval = setInterval(() => syncDataRef.current(true), 600000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // MOUNT ONLY - NO DEPS

    // 2. Realtime: Escuchar cambios en la tabla 'agentes'
    useEffect(() => {
        if (!isLoggedIn) {
            setUnreadNotifications(0);
            return;
        }

        let debounceTimer: ReturnType<typeof setTimeout> | null = null;
        let isSyncingFromRealtime = false;

        const agentChannel = supabase
            .channel('agentes-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'agentes' },
                () => {
                    if (debounceTimer) clearTimeout(debounceTimer);
                    if (isSyncingFromRealtime) return;
                    debounceTimer = setTimeout(async () => {
                        isSyncingFromRealtime = true;
                        await syncDataRef.current(true);
                        isSyncingFromRealtime = false;
                    }, 5000);
                }
            )
            .subscribe();

        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            supabase.removeChannel(agentChannel);
        };
    }, [isLoggedIn]);

    // 3. Realtime: Escuchar nuevas notificaciones
    useEffect(() => {
        if (!isLoggedIn || !currentUser) return;

        const channel = supabase
            .channel('notificaciones-realtime')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notificaciones_push' },
                (payload) => {
                    const newNotif = payload.new;
                    if (!newNotif.agent_id || newNotif.agent_id.toUpperCase() === currentUser.id.toUpperCase()) {
                        checkHeadlinesRef.current();
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [isLoggedIn, currentUser]);

    // 4. Headlines: refresh cada 10 min o cuando cambie el usuario (notifPrefs)
    useEffect(() => {
        if (!isLoggedIn) return;
        checkHeadlinesRef.current();
        const interval = setInterval(() => checkHeadlinesRef.current(), 600000);
        return () => clearInterval(interval);
    }, [isLoggedIn, currentUser?.notifPrefs]);

    return {
        agents, setAgents,
        isSyncing,
        visitorRadar, setVisitorRadar,
        activeEvents, setActiveEvents,
        badges, setBadges,
        headlines,
        unreadNotifications, setUnreadNotifications,
        syncData,
        checkHeadlines,
        userConfirmations, setUserConfirmations,
    };
}
