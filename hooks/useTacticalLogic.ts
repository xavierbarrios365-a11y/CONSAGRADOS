import { useState, useCallback, useRef, useEffect } from 'react';
import { AppView, Agent, UserRole, DailyVerse as DailyVerseType } from '../types';
import {
    submitTransactionSupabase,
    updateAgentPointsSupabase,
    updateAgentStreaksSupabase,
    updateAgentAttendanceSupabase,
    confirmEventAttendanceSupabase as confirmEventAttendanceService,
    fetchAcademyDataSupabase,
    updateAgentAiProfileSupabase,
    updateAgentAiPendingStatusSupabase,
    fetchDailyVerseSupabase,
    confirmDirectorAttendanceSupabase
} from '../services/supabaseService';


import {
    generateTacticalProfile,
    getTacticalAnalysis
} from '../services/geminiService';

import {
    parseEventDate,
    generateGoogleCalendarLink
} from '../services/calendarService';

import jsQR from 'jsqr';

export const useTacticalLogic = (
    currentUser: Agent | null,
    agents: Agent[],
    syncData: (force?: boolean) => Promise<Agent[] | void>,
    refreshCurrentUser: (agents: Agent[]) => void,
    showAlert: (config: {
        title: string,
        message: string,
        type?: 'SUCCESS' | 'ERROR' | 'WARNING' | 'INFO' | 'CONFIRM',
        confirmText?: string,
        cancelText?: string,
        onConfirm?: () => void | Promise<void>
    }) => void,
    setView: (view: AppView) => void,
    updateAgentLocalState?: (updatedAgent: Agent) => void
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
                // Asignar los puntos reales de Asistencia (XP) a la vez
                await updateAgentPointsSupabase(id, 'XP', 10);

                // Actualizar la fecha de última asistencia
                const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
                await updateAgentAttendanceSupabase(id, todayStr);

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
                await updateAgentAiProfileSupabase(currentUser.id, result.stats, result.summary);
                await updateAgentAiPendingStatusSupabase(currentUser.id, false);
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

    const handleVerseQuizComplete = useCallback(async (): Promise<void> => {
        if (!currentUser) return;
        const localToday = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
        const alreadyDone = localStorage.getItem('verse_completed_date') === localToday;

        // También verificar con la fecha del servidor para prevenir abuso entre dispositivos/sesiones
        let serverAlreadyDone = false;
        if (currentUser.lastStreakDate) {
            const raw = currentUser.lastStreakDate;
            const numVal = Number(raw);
            let lastMs = 0;
            if (!isNaN(numVal) && numVal > 1e12) lastMs = numVal;
            else { const pd = new Date(raw); if (!isNaN(pd.getTime())) lastMs = pd.getTime(); }
            if (lastMs > 0) {
                const serverDateStr = new Date(lastMs).toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
                serverAlreadyDone = serverDateStr === localToday;
            }
        }

        if (alreadyDone || serverAlreadyDone) {
            // Asegurar localStorage sincronizado para evitar re-cálculos
            localStorage.setItem('verse_completed_date', localToday);
            return;
        }

        // MARK AS DONE IMMEDIATELY — never block the UI
        localStorage.setItem('verse_completed_date', localToday);

        const safeStreak = currentUser.streakCount || 0;
        const safeXp = currentUser.xp || 0;

        const updatedTasks = currentUser.weeklyTasks?.map(t =>
            t.id === 'bible' ? { ...t, completed: true } : t
        ) || [{ id: 'bible', title: 'Lectura diaria', completed: true }];

        // FIRE-AND-FORGET: sync con el servidor en background con timeout de 5s
        const timeoutPromise = new Promise<{ success: false, error: 'TIMEOUT' }>((resolve) =>
            setTimeout(() => resolve({ success: false, error: 'TIMEOUT' }), 5000)
        );

        Promise.race([
            updateAgentStreaksSupabase(currentUser.id, false, updatedTasks, currentUser.name, dailyVerse?.verse, dailyVerse?.reference, safeStreak, safeXp),
            timeoutPromise
        ]).then((res: any) => {
            if (res.success) {
                // UPDATE LOCAL STATE IMMEDIATELY with the data from response or expected
                if (updateAgentLocalState && res.updatedAgent) {
                    updateAgentLocalState(res.updatedAgent);
                } else if (updateAgentLocalState) {
                    // Fallback: update manually if RPC doesn't return full agent
                    updateAgentLocalState({
                        ...currentUser,
                        streakCount: res.newStreak !== undefined ? res.newStreak : safeStreak,
                        lastStreakDate: String(Date.now()), // Usar string para complacer el tipo Agent
                        weeklyTasks: updatedTasks
                    });
                }
                syncData(true);
            } else {
                console.warn('⚠️ Streak sync failed or timed out:', res.error);
            }
        }).catch((e) => {
            console.error('Error sincronizando racha:', e);
        });

        // Return true IMMEDIATELY — don't wait for server
        return;
    }, [currentUser, dailyVerse, syncData]);

    const handleConfirmEventAttendance = useCallback(async (event: any) => {
        if (!currentUser) return;

        // --- STEP 1: INITIAL CONFIRMATION ---
        showAlert({
            title: "CONFIRMAR MISIÓN",
            message: `¿Deseas registrar tu asistencia para la operación:\n"${event.titulo}"?`,
            type: 'CONFIRM',
            confirmText: 'SÍ, CONFIRMAR',
            cancelText: 'CANCELAR',
            onConfirm: async () => {
                setIsConfirmingEvent(event.id);
                try {
                    const res = await confirmEventAttendanceService({
                        agentId: currentUser.id,
                        agentName: currentUser.name,
                        eventId: event.id,
                        eventTitle: event.titulo
                    });

                    if (res.success) {
                        // --- STEP 2: PREPARE CALENDAR DATA ---
                        const startDate = parseEventDate(event.fecha, event.hora);
                        const reminderDate = new Date(startDate.getTime() - 30 * 60 * 1000);
                        const endDate = new Date(startDate.getTime() + 90 * 60 * 1000);

                        const googleUrl = generateGoogleCalendarLink({
                            title: `OPERACIÓN: ${event.titulo}`,
                            description: `Asistencia táctica confirmada con el Centro de Mando. (Ingreso 30 min antes).`,
                            startTime: reminderDate,
                            endTime: endDate,
                            location: "Centro de Operaciones Consagrados"
                        });

                        // --- STEP 3: SUCCESS ALERT + CALENDAR REDIRECT ---
                        if (googleUrl) {
                            showAlert({
                                title: "REGISTRO EXITOSO",
                                message: `✅ Asistencia confirmada.\n\n📅 ¿Deseas agendar esta misión en tu Google Calendar? (Se agendará con 30 min de ración previa).`,
                                type: 'CONFIRM',
                                confirmText: 'SÍ, AGENDAR',
                                cancelText: 'LUEGO',
                                onConfirm: () => {
                                    window.open(googleUrl, '_blank');
                                }
                            });
                        } else {
                            showAlert({
                                title: "REGISTRO EXITOSO",
                                message: `✅ Asistencia confirmada.\n\n⚠️ Los datos de fecha/hora son irregulares para el calendario automático.`,
                                type: 'SUCCESS'
                            });
                        }
                        syncData(true);
                    }
                } catch (e) {
                    showAlert({ title: "FALLO TÉCNICO", message: "No se pudo sincronizar la asistencia con el núcleo.", type: 'ERROR' });
                } finally {
                    setIsConfirmingEvent(null);
                }
            }
        });
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
            const res: any = await confirmDirectorAttendanceSupabase(currentUser.id, currentUser.name);
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
