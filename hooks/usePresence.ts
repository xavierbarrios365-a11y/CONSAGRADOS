import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseService';
import { Agent } from '../types';

let globalOnlineMap: Record<string, boolean> = {};
let listeners: Array<(map: Record<string, boolean>) => void> = [];
let isSubscribed = false;
let globalChannel: any = null;

const initGlobalPresence = (currentUser: Agent | null) => {
    if (isSubscribed || !currentUser) return;
    isSubscribed = true;

    // Crear el canal CON LA CONFIGURACIÓN CORRECTA DE PRESENCIA
    globalChannel = supabase.channel('global-presence', {
        config: {
            presence: {
                key: currentUser.id,
            },
        },
    });

    globalChannel.on('presence', { event: 'sync' }, () => {
        const state = globalChannel.presenceState();
        const newMap: Record<string, boolean> = {};
        Object.keys(state).forEach(id => {
            newMap[id] = true;
        });
        globalOnlineMap = newMap;
        listeners.forEach(fn => fn({ ...newMap }));
    });

    globalChannel.on('presence', { event: 'join' }, ({ key }: any) => {
        globalOnlineMap = { ...globalOnlineMap, [key]: true };
        listeners.forEach(fn => fn({ ...globalOnlineMap }));
    });

    globalChannel.on('presence', { event: 'leave' }, ({ key }: any) => {
        const newMap = { ...globalOnlineMap };
        delete newMap[key];
        globalOnlineMap = newMap;
        listeners.forEach(fn => fn({ ...globalOnlineMap }));
    });

    globalChannel.subscribe(async (status: string) => {
        console.log(`Presence Channel Status: ${status}`);
        if (status === 'SUBSCRIBED') {
            const trackStatus = await globalChannel.track({
                online_at: new Date().toISOString(),
                user_id: currentUser.id,
                name: currentUser.name
            });
            console.log("Presence Track Status:", trackStatus);
        }
    });

    // Re-track periodico para evitar caidas silenciosas
    setInterval(async () => {
        if (globalChannel && isSubscribed) {
            await globalChannel.track({
                online_at: new Date().toISOString(),
                user_id: currentUser.id,
                name: currentUser.name
            });
        }
    }, 30000); // Cada 30 segs
};

export const usePresence = (currentUser?: Agent | null) => {
    const [onlineAgents, setOnlineAgents] = useState<Record<string, boolean>>(globalOnlineMap);

    useEffect(() => {
        if (currentUser) {
            initGlobalPresence(currentUser);
        }
        listeners.push(setOnlineAgents);
        setOnlineAgents(globalOnlineMap); // set current state right away

        return () => {
            listeners = listeners.filter(fn => fn !== setOnlineAgents);
        };
    }, [currentUser]);

    return onlineAgents;
};
