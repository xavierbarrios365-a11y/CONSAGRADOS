import { useState, useCallback, useRef, useEffect } from 'react';
import { AppView, Agent, UserRole, DailyVerse as DailyVerseType } from '../types';
import {
    submitTransactionSupabase,
    updateAgentPointsSupabase,
    updateAgentStreaksSupabase,
    confirmEventAttendanceSupabase as confirmEventAttendanceService,
    fetchAcademyDataSupabase
} from '../services/supabaseService';

import {
    updateAgentAiProfile,
    updateAgentAiPendingStatus,
    fetchDailyVerse,
    confirmDirectorAttendance
} from '../services/sheetsService';

import { generateTacticalProfile, getTacticalAnalysis } from '../services/geminiService';

import jsQR from 'jsqr';

export const useTacticalLogic = (
    currentUser: Agent | null,
    agents: Agent[],
    syncData: (force?: boolean) => Promise<Agent[] | void>,
    refreshCurrentUser: (agents: Agent[]) => void,
    showAlert: (config: { title: string, message: string, type: 'SUCCESS' | 'ERROR' | 'INFO' | 'CONFIRM', onConfirm?: () => void | Promise<void> }) => void,
    setView: (view: AppView) => void
) => {
    const [scanStatus, setScanStatus] = useState<'IDLE' | 'SCANNING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [scannedId, setScannedId] = useState('');
    const [scannedAgentForPoints, setScannedAgentForPoints] = useState<Agent | null>(null);
    const [isUpdatingPoints, setIsUpdatingPoints] = useState(false);
    const [isUpdatingAiProfile, setIsUpdatingAiProfile] = useState(false);
    const [isConfirmingEvent, setIsConfirmingEvent] = useState<string | null>(null);
    const [dailyVerse, setDailyVerse] = useState<DailyVerseType | null>(null);
    const [intelReport, setIntelReport] = useState<string>('SISTEMAS EN LÍNEA...');
    const [isRefreshingIntel, setIsRefreshingIntel] = useState(false);


    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const processScan = useCallback(async (idToProcess?: string) => {
        const id = idToProcess || scannedId;
        if (!id || scanStatus === 'SUCCESS') return;
        setScanStatus('SCANNING');
        try {
            const result = await submitTransactionSupabase(id, 'ASISTENCIA', currentUser?.name);
            if (result.success) {
                setScanStatus('SUCCESS');
                syncData(true); // Se desplaza fuera del timeout para actualización inmediata en UI
                const agent = agents.find(a => String(a.id) === String(id));
                if (agent) {
                    setScannedAgentForPoints(agent);
                }
                setTimeout(() => {
                    setScanStatus('IDLE');
                    setScannedId('');
                }, 3000);
            } else {
                showAlert({ title: "FALLO DE SISTEMA", message: result.error || "Fallo en registro.", type: 'ERROR' });
                setScanStatus('IDLE');
                setScannedId('');
            }
        } catch (err) {
            setScanStatus('IDLE');
            setScannedId('');
        }
    }, [scannedId, scanStatus, currentUser, agents, syncData, showAlert]);

    const handleIncrementPoints = useCallback(async (type: 'BIBLIA' | 'APUNTES' | 'LIDERAZGO') => {
        if (!scannedAgentForPoints) return;
        setIsUpdatingPoints(true);
        try {
            const res = await updateAgentPointsSupabase(scannedAgentForPoints.id, type, 10);
            if (res.success) {
                showAlert({ title: "PUNTOS ASIGNADOS", message: "✅ +10 PUNTOS REGISTRADOS EXITOSAMENTE", type: 'SUCCESS' });
                syncData();
            } else {
                showAlert({ title: "FALLO DE PROTOCOLO", message: "❌ ERROR AL REGISTRAR PUNTOS: " + (res.error || "Fallo en el protocolo."), type: 'ERROR' });
            }
        } catch (err: any) {
            showAlert({ title: "FALLO DE CONEXIÓN", message: "⚠️ FALLO DE CONEXIÓN CON EL NÚCLEO: " + (err.message || "Error desconocido."), type: 'ERROR' });
        } finally {
            setIsUpdatingPoints(false);
        }
    }, [scannedAgentForPoints, showAlert, syncData]);

    const handleGlobalTestComplete = useCallback(async (testAnswers: any, awardedXp: number) => {
        if (!currentUser) return;
        setIsUpdatingAiProfile(true);
        try {
            const { progress } = await fetchAcademyDataSupabase(currentUser.id);
            const result = await generateTacticalProfile(currentUser, progress, testAnswers);
            if (result) {
                await updateAgentAiProfile(currentUser.id, result.stats, result.summary);
                await updateAgentAiPendingStatus(currentUser.id, false);
                if (awardedXp > 0 && currentUser.isAiProfilePending) {
                    await updateAgentPointsSupabase(currentUser.id, "XP", awardedXp);
                }
                const freshAgents = await syncData();
                if (freshAgents) refreshCurrentUser(freshAgents);
            }
        } catch (err) {
            console.error("Fallo re-perfilado global", err);
            showAlert({ title: "FALLO TÉCNICO", message: "⚠️ ERROR TÉCNICO EN RE-PERFILADO. REINTENTE.", type: 'ERROR' });
        } finally {
            setIsUpdatingAiProfile(false);
        }
    }, [currentUser, syncData, refreshCurrentUser, showAlert]);

    const handleVerseQuizComplete = useCallback(async () => {
        if (!currentUser) return;
        const localToday = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
        const alreadyDone = localStorage.getItem('verse_completed_date') === localToday;
        if (alreadyDone) return;

        const updatedTasks = currentUser.weeklyTasks?.map(t =>
            t.id === 'bible' ? { ...t, completed: true } : t
        ) || [{ id: 'bible', title: 'Lectura diaria', completed: true }];

        const optimisticStreak = (currentUser.streakCount || 0) + 1;

        try {
            const res = await updateAgentStreaksSupabase(currentUser.id, false, updatedTasks, currentUser.name, dailyVerse?.verse, dailyVerse?.reference);
            if (res.success && res.streak !== undefined) {
                localStorage.setItem('verse_completed_date', localToday);
                syncData(true);
            }
        } catch (e) {
            console.error("Error sincronizando racha con servidor:", e);
        }
    }, [currentUser, dailyVerse, syncData]);

    const handleConfirmEventAttendance = useCallback(async (event: any) => {
        if (!currentUser) return;
        setIsConfirmingEvent(event.id);
        try {
            const res = await confirmEventAttendanceService({
                agentId: currentUser.id,
                agentName: currentUser.name,
                eventId: event.id,
                eventTitle: event.titulo
            });
            if (res.success) {
                showAlert({ title: "MISIÓN CONFIRMADA", message: `✅ Has sido registrado exitosamente para: ${event.titulo}`, type: 'SUCCESS' });
                syncData(true);
            }
        } catch (e) {
            showAlert({ title: "ERROR", message: "No se pudo confirmar la asistencia.", type: 'ERROR' });
        } finally {
            setIsConfirmingEvent(null);
        }
    }, [currentUser, showAlert, syncData]);

    const handleRefreshIntel = useCallback(async () => {
        setIsRefreshingIntel(true);
        const analysis = await getTacticalAnalysis(agents);
        setIntelReport(analysis || 'ESTATUS NOMINAL.');
        setIsRefreshingIntel(false);
    }, [agents]);

    const handleConfirmDirectorAttendance = useCallback(async () => {
        if (!currentUser || currentUser.userRole !== UserRole.DIRECTOR) return;
        try {
            const res = await confirmDirectorAttendance(currentUser.id, currentUser.name);
            if (res.alreadyDone) {
                showAlert({ title: "ESTATUS NOMINAL", message: "✅ YA HAS CONFIRMADO TU ASISTENCIA HOY.", type: 'INFO' });
            } else if (res.success) {
                showAlert({ title: "ASISTENCIA CONFIRMADA", message: "✅ ASISTENCIA CONFIRMADA TÁCTICAMENTE.", type: 'SUCCESS' });
                showAlert({
                    title: "CALENDARIO TÁCTICO",
                    message: "📅 ¿DESEAS AÑADIR ESTE EVENTO A TU CALENDARIO?",
                    type: 'CONFIRM',
                    onConfirm: () => {
                        window.open("https://calendar.google.com/calendar/r", '_blank');
                    }
                });
            }
        } catch (e) {
            showAlert({ title: "ERROR TÁCTICO", message: "❌ FALLO EN PROTOCOLO DE ASISTENCIA", type: 'ERROR' });
        }
    }, [currentUser, showAlert]);

    return {
        scanStatus, setScanStatus,
        scannedId, setScannedId,
        processScan,
        scannedAgentForPoints, setScannedAgentForPoints,
        isUpdatingPoints,
        handleIncrementPoints,
        isUpdatingAiProfile,
        handleGlobalTestComplete,
        dailyVerse, setDailyVerse,
        handleVerseQuizComplete,
        isConfirmingEvent,
        handleConfirmEventAttendance,
        intelReport, isRefreshingIntel, handleRefreshIntel,
        handleConfirmDirectorAttendance,
        videoRef, streamRef
    };

};
