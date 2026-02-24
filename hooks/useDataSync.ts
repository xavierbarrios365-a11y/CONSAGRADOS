import { useState, useCallback, useEffect } from 'react';
import { Agent, UserRole, Visitor, Badge } from '../types';
import { INITIAL_AGENTS } from '../mockData';
import {
    fetchAgentsFromSheets,
    fetchVisitorRadar,
    fetchActiveEvents,
    fetchNotifications,
    fetchBadges,
    fetchUserEventConfirmations
} from '../services/sheetsService';

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
            const sheetAgents = await fetchAgentsFromSheets();
            console.log(`🔄 SYNC: Received ${sheetAgents?.length || 0} agents`);
            if (sheetAgents && sheetAgents.length > 0) {
                // Log first 3 agents' XP for verification
                sheetAgents.slice(0, 3).forEach(a =>
                    console.log(`  📊 ${a.name}: XP=${a.xp} B=${a.bible} A=${a.notes} L=${a.leadership}`)
                );
                setAgents(sheetAgents);
            } else {
                console.warn('⚠️ SYNC: Empty response, keeping existing agents');
            }
            const radar = await fetchVisitorRadar();
            setVisitorRadar(radar || []);

            const events = await fetchActiveEvents();
            setActiveEvents(events || []);

            const badgeData = await fetchBadges();
            setBadges(badgeData || []);

            if (currentUser) {
                const confs = await fetchUserEventConfirmations(currentUser.id);
                setUserConfirmations(confs || []);
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
            const notifs = await fetchNotifications() || [];
            const agentId = currentUser?.id;
            const READ_KEY = agentId ? `read_notifications_${agentId}` : 'read_notifications';
            const DELETED_KEY = agentId ? `deleted_notifications_${agentId}` : 'deleted_notifications';

            const readIds = JSON.parse(localStorage.getItem(READ_KEY) || '[]');
            const delIds = JSON.parse(localStorage.getItem(DELETED_KEY) || '[]');
            const unreadNotifs = notifs.filter(n => !readIds.includes(n.id) && !delIds.includes(n.id));
            setUnreadNotifications(unreadNotifs.length);

            const notifHeadlines = unreadNotifs.slice(0, 5).map(n => `📢 ${n.titulo.toUpperCase()}`);

            // 2. Rankings (exclude Leaders/Directors)
            // FIX #3: Reuse already-synced agents instead of fetching again (halves API calls)
            const allAgents = agents;
            const filteredAgents = allAgents.filter(a => {
                const isLeaderRank = a.rank === 'LÍDER' || a.rank === 'LIDER';
                const isLeaderRole = a.userRole === UserRole.LEADER || a.userRole === UserRole.DIRECTOR;
                return !isLeaderRank && !isLeaderRole;
            });

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

            // 3. Badges
            const badgeData = await fetchBadges() || [];
            const badgeHeadlines = badgeData.slice(0, 5).map(b => `🎖️ LOGRO: ${b.agentName} ganó ${b.label} (${b.value})`);

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
    }, [currentUser]);

    // Periodic data sync (every 60s)
    useEffect(() => {
        syncData();
        const interval = setInterval(() => syncData(true), 60000);
        return () => clearInterval(interval);
    }, [syncData]);

    // Headlines refresh (every 2 min)
    useEffect(() => {
        if (isLoggedIn) {
            checkHeadlines();
            const interval = setInterval(checkHeadlines, 120000);
            return () => clearInterval(interval);
        }
    }, [isLoggedIn, checkHeadlines]);

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
