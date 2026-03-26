import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseService';

// Variables globales para el Singleton de Presencia
let globalOnlineMap: Record<string, boolean> = {};
let listeners: Array<(map: Record<string, boolean>) => void> = [];
let isSubscribed = false;

const initGlobalPresence = () => {
    if (isSubscribed) return;
    isSubscribed = true;

    const channel = supabase.channel('global-presence');
    channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const newMap: Record<string, boolean> = {};
        Object.keys(state).forEach(id => {
            newMap[id] = true;
        });
        globalOnlineMap = newMap;
        listeners.forEach(fn => fn({ ...newMap }));
    });

    // En Supabase v2, invocar subscribe de un canal existente adjunta el listener de forma segura
    channel.subscribe();
};

export const usePresence = () => {
    const [onlineAgents, setOnlineAgents] = useState<Record<string, boolean>>(globalOnlineMap);

    useEffect(() => {
        initGlobalPresence();
        listeners.push(setOnlineAgents);
        setOnlineAgents(globalOnlineMap); // set current state right away

        return () => {
            listeners = listeners.filter(fn => fn !== setOnlineAgents);
        };
    }, []);

    return onlineAgents;
};
