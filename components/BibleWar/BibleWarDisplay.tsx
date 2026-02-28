import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy,
    ShieldAlert,
    Sparkles,
    Target,
    Settings,
    Star,
    Shield,
    Zap
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { fetchBibleWarSession, fetchBibleWarQuestions } from '../../services/supabaseService';
import { formatDriveUrl } from '../../services/storageUtils';
import { BibleWarSession, Agent } from '../../types';

interface BibleWarDisplayProps {
    isFullScreen?: boolean;
    stopSound?: () => void;
}

const formatName = (fullName: string | undefined) => {
    if (!fullName) return '';
    const words = fullName.trim().split(/\s+/);
    if (words.length >= 3) return `${words[0]} ${words[2]}`;
    if (words.length === 2) return `${words[0]} ${words[1]}`;
    return words[0];
};

const ParticleSwarm = ({ winner }: { winner: 'A' | 'B' }) => {
    const startX = winner === 'A' ? '40vw' : '-40vw';
    const endX = winner === 'A' ? '-40vw' : '40vw';

    return (
        <div className="fixed inset-0 pointer-events-none z-[250] overflow-hidden flex items-center justify-center">
            {[...Array(20)].map((_, i) => {
                const randomY = (Math.random() - 0.5) * 40;
                const randomArc = (Math.random() - 0.5) * 60;
                return (
                    <motion.div
                        key={i}
                        initial={{ x: startX, y: `${randomY}vh`, opacity: 0, scale: 0 }}
                        animate={{
                            x: endX,
                            y: [`${randomY}vh`, `${randomY - randomArc}vh`, `${randomY}vh`],
                            opacity: [0, 1, 1, 0],
                            scale: [0, 1.5, 1, 0]
                        }}
                        transition={{
                            duration: 1.5 + Math.random() * 1,
                            delay: i * 0.05,
                            ease: "easeInOut"
                        }}
                        className="absolute"
                    >
                        <Star size={32} className="text-[#ffb700] fill-[#ffb700] drop-shadow-[0_0_15px_rgba(255,183,0,0.8)]" />
                    </motion.div>
                );
            })}
        </div>
    );
};

const BibleWarDisplay: React.FC<BibleWarDisplayProps> = ({ isFullScreen = true, stopSound: externalStopSound }) => {
    const [session, setSession] = useState<BibleWarSession | null>(null);
    const [activeQuestion, setActiveQuestion] = useState<any>(null);
    const [prevScores, setPrevScores] = useState({ a: 0, b: 0 });
    const [showTransfer, setShowTransfer] = useState<'A' | 'B' | 'NONE' | 'TIE' | null>(null);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [displayPhase, setDisplayPhase] = useState<'IDLE' | 'READING' | 'BATTLE'>('IDLE');
    const [gladiators, setGladiators] = useState<{ a: Agent | null, b: Agent | null }>({ a: null, b: null });
    const [showVsAnimation, setShowVsAnimation] = useState(false);
    const prevGladiatorsReady = useRef<string | null>(null);
    const isResolvingRef = useRef(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const phaseRef = useRef<'IDLE' | 'READING' | 'BATTLE'>('IDLE');

    useEffect(() => {
        phaseRef.current = displayPhase;
    }, [displayPhase]);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const soundsRef = useRef<Record<string, HTMLAudioElement>>({});

    // Motor de Audio v3.1 (Pro - Pre-cargado)
    const playSound = (effect: string, loop: boolean = false) => {
        try {
            const audio = soundsRef.current[effect];
            if (!audio) {
                console.warn(`Audio ${effect} no pre-cargado. Fallback local.`);
                const fallback = new Audio(`/sounds/bible-war/${effect}.mp3`);
                fallback.volume = 0.6;
                fallback.loop = loop;
                fallback.play().catch(e => console.warn("Fallback blocked:", e));
                return;
            }

            // Detener cualquier sonido previo
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }

            audio.loop = loop;
            audio.volume = 0.6;
            audio.currentTime = 0;

            audio.play()
                .then(() => {
                    audioRef.current = audio;
                })
                .catch(e => {
                    if (e.name === 'NotAllowedError') {
                        console.warn(`Audio ${effect} blocked. Click required.`);
                    } else {
                        console.error(`Error playing ${effect}:`, e);
                    }
                });
        } catch (e) {
            console.error("Audio system error:", e);
        }
    };

    const stopSound = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
    };

    // Pre-carga de sonidos v3.1 (Persistente)
    useEffect(() => {
        const effects = ['reading_pulse', 'battle_transition', 'success', 'fail', 'timeout', 'transicion_2'];
        effects.forEach(eff => {
            const audio = new Audio(`/sounds/bible-war/${eff}.mp3`);
            audio.load();
            soundsRef.current[eff] = audio;
        });

        return () => {
            Object.values(soundsRef.current).forEach(a => a.pause());
            soundsRef.current = {};
        };
    }, []);

    // ✨ VS ANIMATION TRIGGER ✨
    // Ahora se lanza MANUALMENTE desde el Director via 'TRIGGER_VS_ANIMATION'


    useEffect(() => {
        loadSession();

        const dbChannel = supabase
            .channel('bible_war_display_db')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bible_war_sessions' }, (payload) => {
                const newState = payload.new as BibleWarSession;
                handleUpdate(newState);
            })
            .subscribe();

        const syncChannel = supabase
            .channel('bible_war_realtime')
            .on('broadcast', { event: 'SPIN_ROULETTE' }, (envelope) => {
                console.log('⚡ Display: SPIN_ROULETTE', envelope.payload);
                setSession(prev => prev ? { ...prev, status: 'SPINNING', roulette_category: envelope.payload?.category, answer_a: null, answer_b: null, current_question_id: null, show_answer: false } : null);
                setActiveQuestion(null);
            })
            .on('broadcast', { event: 'TRIGGER_VS_ANIMATION' }, () => {
                console.log('⚡ Display: TRIGGER_VS_ANIMATION');
                setShowVsAnimation(true);
                playSound('transicion_2');
                setTimeout(() => setShowVsAnimation(false), 4500);
            })
            .on('broadcast', { event: 'LAUNCH_QUESTION' }, (envelope) => {
                console.log('⚡ Display: LAUNCH_QUESTION', envelope.payload);
                if (envelope.payload?.question) {
                    setActiveQuestion(envelope.payload.question);
                    setSession(prev => prev ? { ...prev, status: 'ACTIVE', current_question_id: envelope.payload.question?.id, show_answer: false, answer_a: null, answer_b: null } : null);
                    setDisplayPhase('READING');
                    playSound('reading_pulse', true);
                    startLocalTimer(15, 'READING');
                }
            })
            .on('broadcast', { event: 'RESOLVE' }, (envelope) => {
                console.log('⚡ Display: RESOLVE', envelope.payload);
                isResolvingRef.current = true;

                // 🛑 Detener y ocultar el cronómetro inmediatamente
                if (timerRef.current) clearInterval(timerRef.current);
                setTimeLeft(0);

                const winner = envelope.payload?.winner;
                setShowTransfer(winner);
                if (winner === 'A' || winner === 'B' || winner === 'TIE') playSound('success');
                else if (winner === 'NONE') playSound('fail');

                setTimeout(() => {
                    setShowTransfer(null);
                    // 🛑 Limpiar pantalla y prepararla para la siguiente ronda
                    setActiveQuestion(null);
                    setDisplayPhase('IDLE');
                    isResolvingRef.current = false;
                }, 5000);

                loadSession();
            })
            .on('broadcast', { event: 'UPDATE_STAKES' }, (envelope) => {
                setSession(prev => prev ? { ...prev, stakes_xp: envelope.payload?.stakes } : null);
            })
            .on('broadcast', { event: 'SHOW_ANSWER' }, (envelope) => {
                setSession(prev => prev ? { ...prev, show_answer: envelope.payload?.show } : null);
            })
            .on('broadcast', { event: 'START_TIMER' }, (envelope) => {
                startLocalTimer(envelope.payload?.seconds);
            })
            .on('broadcast', { event: 'RESET' }, () => {
                stopSound();
                loadSession();
                setActiveQuestion(null);
                setDisplayPhase('IDLE');
            })
            .on('broadcast', { event: 'FORCE_RELOAD' }, () => {
                window.location.reload();
            })
            .on('broadcast', { event: 'COIN_FLIP' }, (envelope) => {
                setSession(prev => prev ? { ...prev, last_coin_flip: envelope.payload?.winner } : null);
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Arena Display v3.1.0 conectada');
                }
            });

        return () => {
            supabase.removeChannel(dbChannel);
            supabase.removeChannel(syncChannel);
        };
    }, []);

    const handleUpdate = async (newState: BibleWarSession) => {
        setSession(newState);

        // Cargar gladiadores si cambiaron (v4.0)
        if (newState.gladiator_a_id !== session?.gladiator_a_id || newState.gladiator_b_id !== session?.gladiator_b_id) {
            const { data: rawAgents } = await supabase.from('agentes').select('*').in('id', [newState.gladiator_a_id, newState.gladiator_b_id].filter(Boolean));

            // Mapeo manual de snake_case (DB) a camelCase (Frontend)
            const mappedAgents = (rawAgents || []).map(d => ({
                id: d.id,
                name: d.nombre,
                photoUrl: d.foto_url,
                xp: d.xp || 0,
                rank: d.rango
            })) as unknown as Agent[];

            setGladiators({
                a: mappedAgents.find(a => a.id === newState.gladiator_a_id) || null,
                b: mappedAgents.find(a => a.id === newState.gladiator_b_id) || null
            });
        }

        // Verificamos si ambos equipos han respondido para notificar auto-resolución
        // Eliminamos la restricción de 'BATTLE' phase para que si responden muy rápido en 'READING' también resuelva de inmediato.
        if (newState.status === 'ACTIVE' && newState.answer_a && newState.answer_b && !newState.show_answer) {
            console.log("🎯 Ambos equipos listos. Notificando Director...");
            supabase.channel('bible_war_realtime').send({
                type: 'broadcast',
                event: 'BOTH_ANSWERED',
                payload: { answer_a: newState.answer_a, answer_b: newState.answer_b }
            });
        }

        if (newState.current_question_id && newState.status !== 'RESOLVED' && !isResolvingRef.current) {
            if (activeQuestion?.id !== newState.current_question_id) {
                const bibleQuestions = await fetchBibleWarQuestions();
                const q = bibleQuestions.find(q => q.id === newState.current_question_id);
                setActiveQuestion(q);
            }
        } else if (newState.status === 'RESOLVED' && !isResolvingRef.current) {
            setActiveQuestion(null);
        } else if (!newState.current_question_id) {
            setActiveQuestion(null);
        }
    };

    const loadSession = async () => {
        const data = await fetchBibleWarSession();
        setSession(data);

        if (data?.current_question_id && data?.status !== 'RESOLVED' && !isResolvingRef.current) {
            const bibleQuestions = await fetchBibleWarQuestions();
            setActiveQuestion(bibleQuestions.find(q => q.id === data.current_question_id));
        } else if (data?.status === 'RESOLVED' && !isResolvingRef.current) {
            setActiveQuestion(null);
        }

        // Siempre refrescar gladiadores por si hubo cambio de puntos
        if (data?.gladiator_a_id || data?.gladiator_b_id) {
            const { data: rawAgents } = await supabase.from('agentes').select('*').in('id', [data.gladiator_a_id, data.gladiator_b_id].filter(Boolean));
            const mappedAgents = (rawAgents || []).map(d => ({
                id: d.id,
                name: d.nombre,
                photoUrl: d.foto_url,
                xp: d.xp || 0,
                rank: d.rango
            })) as unknown as Agent[];
            setGladiators({
                a: mappedAgents.find(a => a.id === data.gladiator_a_id) || null,
                b: mappedAgents.find(a => a.id === data.gladiator_b_id) || null
            });
        }

        if (data?.timer_status === 'RUNNING' && data.timer_end_at) {
            const remaining = Math.max(0, Math.floor((new Date(data.timer_end_at).getTime() - Date.now()) / 1000));
            startLocalTimer(remaining);
        }
    };

    const startLocalTimer = (seconds: number, phase: 'READING' | 'BATTLE' = 'BATTLE') => {
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeLeft(seconds);
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    if (phase === 'READING') {
                        setDisplayPhase('BATTLE');
                        stopSound();
                        playSound('battle_transition');
                        startLocalTimer(30, 'BATTLE');
                    } else {
                        console.log("⏰ Tiempo agotado. Notificando Director...");
                        playSound('timeout');
                        supabase.channel('bible_war_realtime').send({
                            type: 'broadcast',
                            event: 'TIMER_END',
                            payload: { phase: 'BATTLE' }
                        });
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const getDifficultyColor = (diff: string) => {
        switch (diff) {
            case 'HARD': return 'text-red-500';
            case 'MEDIUM': return 'text-amber-500';
            default: return 'text-green-500';
        }
    };

    return (
        <div className={`${isFullScreen ? 'fixed inset-0' : 'w-full h-screen'} bg-[#000814] flex flex-col overflow-hidden font-montserrat text-white select-none`}>
            {/* Background FX */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#003566_0%,transparent_70%)]" />
            </div>

            {/* Side-Glow Indicators */}
            <div className="absolute inset-y-0 left-0 w-4 z-50 pointer-events-none">
                <motion.div animate={session?.answer_a ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }} className="h-full w-full bg-blue-600 shadow-[0_0_50px_rgba(37,99,235,0.8)] filter blur-[2px]" />
            </div>
            <div className="absolute inset-y-0 right-0 w-4 z-50 pointer-events-none">
                <motion.div animate={session?.answer_b ? { opacity: 1, x: 0 } : { opacity: 0, x: 10 }} className="h-full w-full bg-teal-500 shadow-[0_0_50px_rgba(20,184,166,0.8)] filter blur-[2px]" />
            </div>

            {/* Top Bar */}
            <div className="relative z-10 p-4 md:p-8 grid grid-cols-1 md:grid-cols-3 items-center bg-black/40 backdrop-blur-xl border-b border-white/5 gap-6">
                <motion.div animate={showTransfer === 'A' ? { scale: [1, 1.1, 1], borderColor: '#ffb700' } : {}} className="flex items-center gap-4 bg-blue-900/40 p-4 rounded-2xl border border-blue-500/30 shadow-2xl overflow-hidden min-w-0">
                    <div className="w-16 h-16 md:w-24 md:h-24 shrink-0 relative">
                        {gladiators.a?.photoUrl ? (
                            <img src={formatDriveUrl(gladiators.a.photoUrl)} className="w-full h-full object-cover rounded-2xl border-2 border-blue-400/50 shadow-[0_0_40px_rgba(37,99,235,0.5)]" />
                        ) : (
                            <div className="w-full h-full bg-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.5)]">
                                <Shield size={40} className="text-white" />
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <p className="text-xl md:text-3xl font-black text-blue-400 uppercase tracking-widest truncate">{formatName(gladiators.a?.name) || 'ALFA'}</p>
                        </div>
                        <motion.p key={gladiators.a?.xp || session?.score_a} className="text-6xl md:text-8xl font-bebas leading-none truncate text-blue-100">{gladiators.a?.xp ?? (session?.score_a || 0)}</motion.p>
                    </div>
                </motion.div>

                <div className="flex flex-col items-center gap-2">
                    <div className="bg-black/80 border border-[#ffb700]/40 px-10 py-4 rounded-[3rem] flex items-center gap-4 shadow-[0_0_60px_rgba(255,183,0,0.15)]">
                        <Zap size={32} className="text-[#ffb700] animate-pulse" />
                        <span className="text-3xl md:text-5xl font-bebas tracking-widest text-[#ffb700]">{session?.stakes_xp || 100} XP</span>
                    </div>
                    {/* POZO */}
                    {(session?.accumulated_pot ?? 0) > 0 && (
                        <div className="bg-green-500/20 border border-green-500/40 px-6 py-2 rounded-full flex items-center gap-2 text-green-400 font-bebas text-xl">
                            <Sparkles size={20} className="animate-pulse" /> +{session?.accumulated_pot} POZO
                        </div>
                    )}
                </div>

                <motion.div animate={showTransfer === 'B' ? { scale: [1, 1.1, 1], borderColor: '#ffb700' } : {}} className="flex items-center gap-4 bg-teal-900/40 p-4 rounded-2xl border border-teal-500/30 shadow-2xl flex-row-reverse text-right overflow-hidden min-w-0">
                    <div className="w-16 h-16 md:w-24 md:h-24 shrink-0 relative">
                        {gladiators.b?.photoUrl ? (
                            <img src={formatDriveUrl(gladiators.b.photoUrl)} className="w-full h-full object-cover rounded-2xl border-2 border-teal-400/50 shadow-[0_0_40px_rgba(20,184,166,0.5)]" />
                        ) : (
                            <div className="w-full h-full bg-teal-600 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(20,184,166,0.5)]">
                                <Target size={40} className="text-white" />
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-end gap-2">
                            <p className="text-xl md:text-3xl font-black text-teal-400 uppercase tracking-widest truncate">{formatName(gladiators.b?.name) || 'BRAVO'}</p>
                        </div>
                        <motion.p key={gladiators.b?.xp || session?.score_b} className="text-6xl md:text-8xl font-bebas leading-none truncate text-teal-100">{gladiators.b?.xp ?? (session?.score_b || 0)}</motion.p>
                    </div>
                </motion.div>
            </div>

            {/* Main Stage */}
            <div className="relative flex-1 flex flex-col items-center justify-center p-4 md:p-10 z-10 w-full min-h-0">
                {/* Timer */}
                <AnimatePresence>
                    {timeLeft > 0 && (
                        <motion.div key={displayPhase + "-timer"} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: displayPhase === 'READING' ? 0.3 : 1, scale: 1 }} exit={{ opacity: 0, scale: 1.5 }} className={`absolute z-[100] transition-all duration-700 ${displayPhase === 'READING' ? 'top-10 right-10' : 'bottom-20 right-16'}`}>
                            <div className={`relative flex items-center justify-center ${displayPhase === 'READING' ? 'w-32 h-32' : 'w-48 h-48'}`}>
                                <svg className="absolute inset-0 w-full h-full -rotate-90"><circle cx="50%" cy="50%" r="45%" stroke="white" strokeOpacity="0.1" strokeWidth="2" fill="none" /><motion.circle cx="50%" cy="50%" r="45%" fill="none" stroke={timeLeft <= 5 ? '#ef4444' : '#ffb700'} strokeWidth="4" strokeDasharray="283" initial={{ strokeDashoffset: 283 }} animate={{ strokeDashoffset: 283 - (timeLeft / (displayPhase === 'READING' ? 15 : 30)) * 283 }} /></svg>
                                <div className={`font-bebas leading-none ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-[#ffb700]'} ${displayPhase === 'READING' ? 'text-5xl' : 'text-8xl'}`}>{timeLeft}</div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                    {session?.status === 'SPINNING' ? (
                        <motion.div key="roulette" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-10">
                            <div className="w-64 h-64 md:w-96 md:h-96 rounded-full border-8 border-white/10 flex items-center justify-center overflow-hidden relative">
                                <motion.div animate={{ rotate: 3600 }} transition={{ duration: 4, ease: "circOut" }} className="absolute inset-0 bg-[conic-gradient(from_0deg,#3b82f6,#2dd4bf,#ef4444,#f59e0b,#8b5cf6,#3b82f6)]" />
                                <div className="absolute inset-2 bg-[#001f3f] rounded-full z-10 flex items-center justify-center text-center p-8"><p className="text-2xl md:text-5xl font-bebas uppercase">{session?.roulette_category || '???'}</p></div>
                            </div>
                        </motion.div>
                    ) : activeQuestion ? (
                        <div className="max-w-7xl w-full h-full text-center flex flex-col justify-center min-h-0">
                            {displayPhase === 'READING' ? (
                                <motion.div key="reading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -100 }} className="space-y-4 md:space-y-6">
                                    <p className="text-lg md:text-xl font-black uppercase tracking-[0.6em] text-[#ffb700] animate-pulse">ESTUDIO DE CAMPO</p>
                                    <h1 className="text-[clamp(1.5rem,5vw,5rem)] font-black italic tracking-tighter leading-tight px-10">{activeQuestion.question}</h1>
                                </motion.div>
                            ) : (
                                <motion.div key="battle" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-2 md:space-y-4 flex flex-col justify-center min-h-0 h-full">
                                    <h1 className="text-[clamp(1.2rem,3vw,3rem)] font-bold italic text-white/90 max-w-5xl mx-auto leading-tight shrink-0">{activeQuestion.question}</h1>
                                    {activeQuestion.image_url && <img src={activeQuestion.image_url} className="max-h-[25vh] mx-auto rounded-2xl border border-white/10 shadow-2xl object-contain min-h-0" />}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 px-10 overflow-y-auto no-scrollbar py-2">
                                        {activeQuestion.options.map((opt: string, i: number) => {
                                            const isCorrect = opt === (activeQuestion.correct_answer || activeQuestion.correctAnswer);
                                            const show = session?.show_answer;
                                            return (
                                                <div key={i} className={`p-3 md:p-5 rounded-xl md:rounded-2xl border text-[clamp(1rem,2vw,2rem)] font-bebas tracking-widest transition-all duration-500 flex items-center justify-center text-center ${show && isCorrect ? 'bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_50px_rgba(34,197,94,0.4)] scale-105' : show ? 'opacity-20 grayscale border-white/5' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}>
                                                    {opt}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center space-y-8">
                            <h2 className="text-8xl font-bebas text-white/5 tracking-[0.5em]">ARENA LISTA</h2>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Results Overlay */}
            <AnimatePresence>
                {showTransfer && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md">
                            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="text-center space-y-6">
                                <Trophy size={120} className="mx-auto text-[#ffb700]" />
                                <h2 className="text-7xl md:text-9xl font-bebas tracking-[0.2em] uppercase">
                                    {showTransfer === 'A' ? (gladiators.a?.name ? `${gladiators.a.name} VENCE` : 'ALFA VENCE') :
                                        showTransfer === 'B' ? (gladiators.b?.name ? `${gladiators.b.name} VENCE` : 'BRAVO VENCE') :
                                            showTransfer === 'TIE' ? 'EMPATE' : 'NINGUNO'}
                                </h2>
                                {(showTransfer === 'A' || showTransfer === 'B') && (
                                    <p className="text-3xl md:text-5xl font-black text-[#ffb700] italic">¡GLORIA AL VENCEDOR!</p>
                                )}
                            </motion.div>
                        </motion.div>
                        {(showTransfer === 'A' || showTransfer === 'B') && <ParticleSwarm winner={showTransfer} />}
                    </>
                )}
            </AnimatePresence>

            {/* 🔥 EPIC VS ANIMATION OVERLAY 🔥 */}
            <AnimatePresence>
                {showVsAnimation && gladiators.a && gladiators.b && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 1.5, filter: "blur(20px)" }}
                        transition={{ duration: 0.5 }}
                        className="fixed inset-0 z-[300] flex items-center justify-center bg-[#000814]/90 backdrop-blur-2xl overflow-hidden"
                    >
                        {/* Rayos de fondo */}
                        <div className="absolute inset-0 z-0 opacity-30 flex items-center justify-center pointer-events-none">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                className="w-[150vw] h-[150vw] bg-[conic-gradient(from_0deg,transparent_0deg,#ffb700_45deg,transparent_90deg,transparent_180deg,#ffb700_225deg,transparent_270deg)]"
                            />
                        </div>

                        <div className="flex items-center justify-center gap-4 md:gap-20 w-full px-4 md:px-10 z-10 relative">
                            {/* Alfa */}
                            <motion.div
                                initial={{ x: -300, opacity: 0, scale: 0.5 }}
                                animate={{ x: 0, opacity: 1, scale: 1 }}
                                transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
                                className="flex flex-col items-center gap-6"
                            >
                                <div className="w-32 h-32 md:w-64 md:h-64 relative rounded-full p-2 bg-blue-500/20 border-4 border-blue-500 shadow-[0_0_100px_rgba(37,99,235,0.8)]">
                                    {gladiators.a.photoUrl ? (
                                        <img src={formatDriveUrl(gladiators.a.photoUrl)} className="w-full h-full object-cover rounded-full" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-blue-500 rounded-full"><Shield size={60} /></div>
                                    )}
                                </div>
                                <h2 className="text-3xl md:text-6xl font-black text-blue-400 uppercase tracking-widest text-center">{formatName(gladiators.a.name)}</h2>
                                <p className="text-xl md:text-3xl text-blue-200/50 font-bebas tracking-widest -mt-4">ALFA</p>
                            </motion.div>

                            {/* VS Text */}
                            <motion.div
                                initial={{ scale: 0, rotate: -180, opacity: 0 }}
                                animate={{ scale: [0, 1.5, 1], rotate: 0, opacity: 1 }}
                                transition={{ type: "spring", bounce: 0.7, delay: 0.5 }}
                                className="text-8xl md:text-[15rem] font-bebas text-[#ffb700] drop-shadow-[0_0_80px_rgba(255,183,0,1)] z-10 italic"
                            >
                                VS
                            </motion.div>

                            {/* Bravo */}
                            <motion.div
                                initial={{ x: 300, opacity: 0, scale: 0.5 }}
                                animate={{ x: 0, opacity: 1, scale: 1 }}
                                transition={{ type: "spring", bounce: 0.5, delay: 0.3 }}
                                className="flex flex-col items-center gap-6"
                            >
                                <div className="w-32 h-32 md:w-64 md:h-64 relative rounded-full p-2 bg-teal-500/20 border-4 border-teal-500 shadow-[0_0_100px_rgba(20,184,166,0.8)]">
                                    {gladiators.b.photoUrl ? (
                                        <img src={formatDriveUrl(gladiators.b.photoUrl)} className="w-full h-full object-cover rounded-full" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-teal-500 rounded-full"><Target size={60} /></div>
                                    )}
                                </div>
                                <h2 className="text-3xl md:text-6xl font-black text-teal-400 uppercase tracking-widest text-center">{formatName(gladiators.b.name)}</h2>
                                <p className="text-xl md:text-3xl text-teal-200/50 font-bebas tracking-widest -mt-4">BRAVO</p>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Footer */}
            <div className="px-10 py-8 bg-black/80 border-t border-white/5 flex justify-between items-center text-[10px] uppercase tracking-[0.4em] font-black opacity-30 italic">
                <span>Operational Connect // v3.1.0</span>
                <span>© 2026 Arena Táctica</span>
            </div>
        </div>
    );
};

export default BibleWarDisplay;
