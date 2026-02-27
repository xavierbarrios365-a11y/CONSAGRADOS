import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap,
    Trophy,
    Skull,
    Star,
    Sparkles,
    Shield,
    Target
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { fetchBibleWarSession, fetchBibleWarQuestions } from '../../services/supabaseService';
import { BibleWarSession } from '../../types';
// import questionsData from '../../bible_war_bank.json'; // Eliminado

interface BibleWarDisplayProps {
    isFullScreen?: boolean;
}

const BibleWarDisplay: React.FC<BibleWarDisplayProps> = ({ isFullScreen = true }) => {
    const [session, setSession] = useState<BibleWarSession | null>(null);
    const [activeQuestion, setActiveQuestion] = useState<any>(null);
    const [prevScores, setPrevScores] = useState({ a: 0, b: 0 });
    const [showTransfer, setShowTransfer] = useState<'A' | 'B' | 'NONE' | 'TIE' | null>(null);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [displayPhase, setDisplayPhase] = useState<'IDLE' | 'READING' | 'BATTLE'>('IDLE');
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const soundsRef = useRef<Record<string, HTMLAudioElement>>({});

    // Motor de Audio v2.9 (Máxima Compatibilidad)
    const playSound = (effect: string, loop: boolean = false) => {
        try {
            const audioPath = `/sounds/bible-war/${effect}.mp3`;
            const audio = new Audio(audioPath);
            audio.volume = 0.6;
            audio.loop = loop;

            // Si hay un audio sonando, lo pausamos sutilmente
            if (audioRef.current && !loop) {
                audioRef.current.pause();
                audioRef.current = null;
            }

            audio.play()
                .then(() => {
                    if (loop) audioRef.current = audio;
                })
                .catch(e => console.warn(`Audio ${effect} blocked:`, e));
        } catch (e) {
            console.error("Audio constructor error:", e);
        }
    };

    const stopSound = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
    };

    // Pre-carga de sonidos v3.1 (Persistente)
    useEffect(() => {
        const effects = ['reading_pulse', 'battle_transition', 'success', 'fail', 'timeout'];
        effects.forEach(eff => {
            const audio = new Audio(`/sounds/bible-war/${eff}.mp3`);
            audio.load();
            soundsRef.current[eff] = audio;
        });

        return () => {
            // Limpieza al desmontar
            Object.values(soundsRef.current).forEach(a => a.pause());
            soundsRef.current = {};
        };
    }, []);

    useEffect(() => {
        loadSession();

        // 1. Canal de cambios en base de datos (Postgres)
        const dbChannel = supabase
            .channel('bible_war_display_db')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bible_war_sessions' }, (payload) => {
                const newState = payload.new as BibleWarSession;
                handleUpdate(newState);
            })
            .subscribe();

        // 2. Canal de Broadcast para sincronización instantánea (Unificado con Director)
        const syncChannel = supabase
            .channel('bible_war_realtime')
            .on('broadcast', { event: 'SPIN_ROULETTE' }, (envelope) => {
                console.log('⚡ Display: SPIN_ROULETTE', envelope.payload);
                setSession(prev => prev ? { ...prev, status: 'SPINNING', roulette_category: envelope.payload?.category, answer_a: null, answer_b: null, current_question_id: null, show_answer: false } : null);
                setActiveQuestion(null);
            })
            .on('broadcast', { event: 'LAUNCH_QUESTION' }, (envelope) => {
                console.log('⚡ Display: LAUNCH_QUESTION', envelope.payload);
                if (envelope.payload?.question) {
                    setActiveQuestion(envelope.payload.question);
                    setSession(prev => prev ? { ...prev, status: 'ACTIVE', current_question_id: envelope.payload.question?.id, show_answer: false, answer_a: null, answer_b: null } : null);

                    // Iniciar Secuencia Cineatográfica v2.6
                    setDisplayPhase('READING');
                    playSound('reading_pulse', true); // Loop sutil mientras leen
                    startLocalTimer(15, 'READING');
                }
            })
            .on('broadcast', { event: 'RESOLVE' }, (envelope) => {
                console.log('⚡ Display: RESOLVE', envelope.payload);
                const winner = envelope.payload?.winner;
                setShowTransfer(winner);
                if (winner === 'A' || winner === 'B' || winner === 'TIE') playSound('success');
                else if (winner === 'NONE') playSound('fail');

                setTimeout(() => setShowTransfer(null), 5000);
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
                    console.log('✅ Arena Display v2.2.0 conectada al canal de sincronización unificado');
                }
            });

        return () => {
            supabase.removeChannel(dbChannel);
            supabase.removeChannel(syncChannel);
        };
    }, []);

    const handleUpdate = async (newState: BibleWarSession) => {
        setSession(newState);

        // v3.0: Auto-revelado si ambos respondieron
        if (displayPhase === 'BATTLE' && newState.answer_a && newState.answer_b && !newState.show_answer) {
            console.log("🎯 Ambos equipos listos. Auto-revelado.");
            setSession(prev => prev ? { ...prev, show_answer: true } : null);
            // Sincronizar con el director (él hará el transfer de XP)
            supabase.channel('bible_war_realtime').send({
                type: 'broadcast',
                event: 'BOTH_ANSWERED',
                payload: { answer_a: newState.answer_a, answer_b: newState.answer_b }
            });
        }

        // Actualizar pregunta activa si cambia el ID
        if (newState.current_question_id) {
            if (activeQuestion?.id !== newState.current_question_id) {
                const bibleQuestions = await fetchBibleWarQuestions();
                const q = bibleQuestions.find(q => q.id === newState.current_question_id);
                setActiveQuestion(q);
            }
        } else {
            setActiveQuestion(null);
        }
    };

    const loadSession = async () => {
        const data = await fetchBibleWarSession();
        setSession(data);
        if (data?.current_question_id) {
            // Cargar de las preguntas dinámicas si es posible
            const bibleQuestions = await fetchBibleWarQuestions();
            setActiveQuestion(bibleQuestions.find(q => q.id === data.current_question_id));
        }

        // Sincronizar temporizador si está corriendo
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

                    // Transición Automática de Fase
                    if (phase === 'READING') {
                        setDisplayPhase('BATTLE');
                        stopSound(); // Detener el pulso de lectura
                        playSound('battle_transition');
                        startLocalTimer(30, 'BATTLE');
                    } else {
                        // v3.0: Cuando termina el tiempo de batalla, revelamos
                        console.log("⏰ Tiempo agotado en BATTLE. Auto-revelado.");
                        playSound('timeout');
                        setSession(prev => prev ? { ...prev, show_answer: true } : null);
                        // Emitir evento para que el Director sepa que el tiempo terminó
                        supabase.channel('bible_war_realtime').send({
                            type: 'broadcast',
                            event: 'TIMER_END',
                            payload: { phase: 'BATTLE' }
                        });
                    }
                    return 0;
                }

                // Efecto de Ticking en los últimos 30s
                if (phase === 'BATTLE' && prev <= 31) {
                    // Quizás play sound cada segundo?
                    // playSound('tick_tock');
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
            {/* Background Ambient FX */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#003566_0%,transparent_70%)]" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
            </div>

            {/* Side-Glow Indicators (v2.7) */}
            <div className="absolute inset-y-0 left-0 w-4 z-50 pointer-events-none">
                <motion.div
                    animate={session?.answer_a ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                    className="h-full w-full bg-blue-600 shadow-[0_0_50px_rgba(37,99,235,0.8)] filter blur-[2px]"
                />
                <motion.div
                    animate={session?.answer_a ? { opacity: 0.4 } : { opacity: 0 }}
                    className="absolute inset-y-0 left-4 w-[20vw] bg-gradient-to-r from-blue-600/30 to-transparent"
                />
            </div>

            <div className="absolute inset-y-0 right-0 w-4 z-50 pointer-events-none">
                <motion.div
                    animate={session?.answer_b ? { opacity: 1, x: 0 } : { opacity: 0, x: 10 }}
                    className="h-full w-full bg-teal-500 shadow-[0_0_50px_rgba(20,184,166,0.8)] filter blur-[2px]"
                />
                <motion.div
                    animate={session?.answer_b ? { opacity: 0.4 } : { opacity: 0 }}
                    className="absolute inset-y-0 right-4 w-[20vw] bg-gradient-to-l from-teal-500/30 to-transparent"
                />
            </div>

            {/* Top Bar: Scores & Match Info */}
            <div className="relative z-10 p-4 md:p-8 grid grid-cols-1 md:grid-cols-3 items-center bg-black/40 backdrop-blur-xl border-b border-white/5 gap-6">
                {/* Team A Card */}
                <motion.div
                    animate={showTransfer === 'A' ? { scale: [1, 1.1, 1], borderColor: '#ffb700' } : {}}
                    className="flex items-center gap-4 md:gap-6 bg-blue-900/20 p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-blue-500/30 shadow-2xl w-full max-w-[450px] justify-self-start"
                >
                    <div className="w-14 h-14 md:w-28 md:h-28 bg-blue-600 rounded-2xl md:rounded-[2.5rem] flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.5)] flex-shrink-0">
                        <Shield size={isFullScreen ? (window.innerWidth < 768 ? 28 : 56) : 32} className="text-white" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[12px] md:text-[16px] font-black text-blue-400 uppercase tracking-[0.3em] truncate">ESCUADRÓN ALFA</p>
                        <motion.p
                            key={session?.score_a}
                            initial={{ scale: 1.5, color: '#60a5fa' }}
                            animate={{ scale: 1, color: '#ffffff' }}
                            className="text-5xl md:text-8xl font-bebas leading-none mt-1"
                        >
                            {session?.score_a || 0}
                        </motion.p>
                    </div>
                </motion.div>

                {/* Central Stakes + Pot Container */}
                <div className="flex flex-col items-center gap-2 md:gap-4 justify-self-center py-4 md:py-0">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-black/80 border border-[#ffb700]/40 px-6 md:px-12 py-3 md:py-5 rounded-3xl md:rounded-[3rem] flex flex-col items-center shadow-[0_0_60px_rgba(255,183,0,0.15)]"
                    >
                        <div className="flex items-center gap-3 md:gap-5">
                            <Zap size={isFullScreen ? (window.innerWidth < 768 ? 20 : 36) : 24} className="text-[#ffb700] animate-pulse" />
                            <span className="text-2xl md:text-5xl font-bebas tracking-[0.2em] text-[#ffb700] whitespace-nowrap">{session?.stakes_xp || 100} XP</span>
                        </div>
                    </motion.div>
                    {/* POZO ACUMULADO */}
                    {(session?.accumulated_pot ?? 0) > 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-green-500/20 border border-green-500/40 px-6 md:px-10 py-2 md:py-3 rounded-full flex items-center gap-3 shadow-[0_0_30px_rgba(34,197,94,0.3)]"
                        >
                            <Sparkles size={isFullScreen ? (window.innerWidth < 768 ? 16 : 24) : 16} className="text-green-400 animate-pulse" />
                            <span className="text-lg md:text-2xl font-bebas tracking-widest text-green-400 whitespace-nowrap uppercase">POZO: +{session?.accumulated_pot} XP</span>
                        </motion.div>
                    )}
                </div>

                {/* Team B Card */}
                <motion.div
                    animate={showTransfer === 'B' ? { scale: [1, 1.1, 1], borderColor: '#ffb700' } : {}}
                    className="flex items-center gap-4 md:gap-6 bg-teal-900/20 p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-teal-500/30 shadow-2xl w-full max-w-[450px] text-right justify-self-end flex-row-reverse"
                >
                    <div className="w-14 h-14 md:w-28 md:h-28 bg-teal-600 rounded-2xl md:rounded-[2.5rem] flex items-center justify-center shadow-[0_0_40px_rgba(20,184,166,0.5)] flex-shrink-0">
                        <Target size={isFullScreen ? (window.innerWidth < 768 ? 28 : 56) : 32} className="text-white" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[12px] md:text-[16px] font-black text-teal-400 uppercase tracking-[0.3em] truncate">ESCUADRÓN BRAVO</p>
                        <motion.p
                            key={session?.score_b}
                            initial={{ scale: 1.5, color: '#2dd4bf' }}
                            animate={{ scale: 1, color: '#ffffff' }}
                            className="text-5xl md:text-8xl font-bebas leading-none mt-1"
                        >
                            {session?.score_b || 0}
                        </motion.p>
                    </div>
                </motion.div>
            </div>

            {/* Main Stage: Roulette or Question */}
            <div className="relative flex-1 flex flex-col items-center justify-center p-2 md:p-6 z-10 w-full">
                {/* Temporizador HUD Dinámico (v2.9 - Reconstruido) */}
                <AnimatePresence>
                    {timeLeft > 0 && (
                        <motion.div
                            key={displayPhase + "-timer"}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: displayPhase === 'READING' ? 0.4 : 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.5 }}
                            className={`absolute z-[100] transition-all duration-700 pointer-events-none ${displayPhase === 'READING'
                                ? 'top-10 right-10 md:top-14 md:right-14'
                                : 'bottom-16 right-10 md:bottom-24 md:right-16'
                                }`}
                        >
                            <div className={`relative flex items-center justify-center ${displayPhase === 'READING' ? 'w-24 h-24 md:w-40 md:h-40' : 'w-32 h-32 md:w-56 md:h-56'}`}>
                                {/* Anillo de Progreso */}
                                <svg className="absolute inset-0 w-full h-full -rotate-90">
                                    <circle cx="50%" cy="50%" r="45%" stroke="white" strokeOpacity="0.1" strokeWidth="2" fill="none" />
                                    <motion.circle
                                        cx="50%" cy="50%" r="45%"
                                        fill="none"
                                        stroke={timeLeft <= 5 ? '#ef4444' : '#ffb700'}
                                        strokeWidth="4"
                                        strokeDasharray="283"
                                        initial={{ strokeDashoffset: 283 }}
                                        animate={{ strokeDashoffset: 283 - (timeLeft / (displayPhase === 'READING' ? 15 : 30)) * 283 }}
                                    />
                                </svg>
                                <div className={`font-bebas leading-none ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-[#ffb700]'} ${displayPhase === 'READING' ? 'text-4xl md:text-7xl' : 'text-6xl md:text-[8rem]'}`}>
                                    {timeLeft}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>



                <AnimatePresence mode="wait">
                    {session?.status === 'SPINNING' ? (
                        <motion.div
                            key="roulette"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.2 }}
                            className="flex flex-col items-center gap-10"
                        >
                            <div className="relative w-48 h-48 md:w-80 md:h-80 rounded-full border-4 md:border-8 border-white/10 flex items-center justify-center overflow-hidden">
                                <motion.div
                                    animate={{ rotate: 3600 }}
                                    transition={{ duration: 4, ease: "circOut" }}
                                    className="absolute inset-0 bg-[conic-gradient(from_0deg,#3b82f6,#2dd4bf,#ef4444,#f59e0b,#8b5cf6,#3b82f6)]"
                                />
                                <div className="absolute inset-1.5 md:inset-2 bg-[#001f3f] rounded-full z-10 flex items-center justify-center text-center p-4 md:p-6">
                                    <p className="text-xl md:text-4xl font-bebas tracking-tighter transition-all duration-300">
                                        {session?.roulette_category || '???'}
                                    </p>
                                </div>
                            </div>
                            <p className="text-lg md:text-2xl font-bebas text-[#ffb700] tracking-[0.2em] md:tracking-[0.4em] animate-pulse">SELECCIONANDO CATEGORÍA...</p>
                        </motion.div>
                    ) : activeQuestion ? (
                        <motion.div
                            key={activeQuestion.id}
                            initial={{ opacity: 0, y: 50, filter: 'blur(20px)' }}
                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, y: -50, filter: 'blur(20px)' }}
                            className="max-w-7xl w-full space-y-12 text-center relative"
                        >
                            {/* PHASE 1: READING - Pregunta Gigante */}
                            <AnimatePresence mode="wait">
                                {displayPhase === 'READING' ? (
                                    <motion.div
                                        key="reading"
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 1.2, opacity: 0, y: -100 }}
                                        className="py-10"
                                    >
                                        <p className="text-[12px] md:text-[20px] font-black uppercase tracking-[0.5em] text-[#ffb700] mb-8 animate-pulse">PREPARA TU MENTE / PREGUNTA DE NIVEL {activeQuestion.difficulty}</p>
                                        <motion.h1
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ type: "spring", damping: 15 }}
                                            className="text-4xl md:text-8xl font-black italic tracking-tighter leading-[1.1] px-10 drop-shadow-[0_0_50px_rgba(255,b7,0,0.3)] text-white"
                                        >
                                            {activeQuestion.question}
                                        </motion.h1>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="battle"
                                        initial={{ y: 100, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        className="space-y-8"
                                    >
                                        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-1 rounded-full">
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ffb700]">{activeQuestion.category}</span>
                                            <div className="w-[1px] h-3 bg-white/20" />
                                            <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${getDifficultyColor(activeQuestion.difficulty)}`}>{activeQuestion.difficulty}</span>
                                        </div>

                                        <motion.h1
                                            layoutId="question-text"
                                            className="text-xl md:text-4xl font-bold italic text-white/90 leading-tight px-4 max-w-4xl mx-auto"
                                        >
                                            {activeQuestion.question}
                                        </motion.h1>

                                        {/* Imagen de la Pregunta (v2.3) */}
                                        {activeQuestion.image_url && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="relative w-full max-h-[25vh] flex justify-center py-2"
                                            >
                                                <img
                                                    src={activeQuestion.image_url}
                                                    alt="Pregunta"
                                                    className="relative max-h-[25vh] rounded-2xl border border-white/10 shadow-2xl object-contain bg-black/40"
                                                />
                                            </motion.div>
                                        )}

                                        {/* Indicadores de Respuesta de Equipo */}
                                        <div className="flex justify-center gap-12 pt-2">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.5)] transition-all duration-500 ${session?.answer_a ? 'bg-blue-500 scale-125' : 'bg-white/10'}`} />
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${session?.answer_a ? 'text-blue-400' : 'text-white/20'}`}>ALFA {session?.answer_a ? 'LISTO' : ''}</span>
                                            </div>
                                            <div className="flex flex-col items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full shadow-[0_0_15px_rgba(20,184,166,0.5)] transition-all duration-500 ${session?.answer_b ? 'bg-teal-500 scale-125' : 'bg-white/10'}`} />
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${session?.answer_b ? 'text-teal-400' : 'text-white/20'}`}>BRAVO {session?.answer_b ? 'LISTO' : ''}</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-10 mb-8 px-6">
                                            {activeQuestion.options.map((opt: string, i: number) => {
                                                const isCorrect = opt === activeQuestion.correctAnswer || opt === activeQuestion.correct_answer;
                                                const showAnswer = session?.show_answer;

                                                return (
                                                    <motion.div
                                                        key={i}
                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ delay: 0.3 + (i * 0.1) }}
                                                        className={`p-4 md:p-8 rounded-2xl border text-lg md:text-3xl font-bebas tracking-widest transition-all duration-500 ${showAnswer && isCorrect ? 'bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_50px_rgba(34,197,94,0.4)] scale-[1.05]' : showAnswer ? 'opacity-20 border-white/5 grayscale' : 'bg-white/5 border-white/10 text-white/90 hover:bg-white/10'}`}
                                                    >
                                                        <span className="text-xs md:text-lg mr-2 opacity-30">{i + 1}.</span> {opt}
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {session?.show_answer && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-8 space-y-4"
                                >
                                    <div className="flex justify-center gap-6 md:gap-12">
                                        <div className="bg-blue-900/30 border border-blue-500/30 p-4 rounded-xl text-center min-w-[150px]">
                                            <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.3em] mb-2">ALFA ELIGIÓ</p>
                                            <p className="text-sm md:text-lg font-bebas">{session.answer_a || '---'}</p>
                                        </div>
                                        <div className="bg-teal-900/30 border border-teal-500/30 p-4 rounded-xl text-center min-w-[150px]">
                                            <p className="text-[10px] text-teal-400 font-black uppercase tracking-[0.3em] mb-2">BRAVO ELIGIÓ</p>
                                            <p className="text-sm md:text-lg font-bebas">{session.answer_b || '---'}</p>
                                        </div>
                                    </div>

                                    {activeQuestion.reference && (
                                        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl inline-block mt-2">
                                            <p className="text-[10px] text-[#ffb700] font-black uppercase tracking-[0.4em] mb-1">Referencia Táctica</p>
                                            <p className="text-lg font-serif italic text-white/60">"{activeQuestion.reference}"</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="waiting"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center gap-12"
                        >
                            <img src="/logo_white.png" className="w-64 opacity-20 grayscale" alt="Escala365" />
                            <div className="space-y-4 text-center">
                                <h2 className="text-7xl font-bebas text-white/5 opacity-80 tracking-[0.8em]">ESPERANDO DEBRIEFING</h2>
                                <p className="text-[12px] text-[#ffb700]/40 font-black uppercase tracking-[1em] animate-pulse">SISTEMA LISTO PARA COMBATE</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* XP Transfer Overlay Animation */}
            <AnimatePresence>
                {showTransfer && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center overflow-hidden"
                    >
                        {/* Trail Animation from one team to another */}
                        {showTransfer === 'A' && (
                            <motion.div
                                initial={{ x: '40vw', opacity: 1, scale: 1 }}
                                animate={{ x: '-40vw', transition: { duration: 1.5, ease: "circIn" } }}
                                className="w-1 h-[200vh] bg-blue-500 shadow-[0_0_100px_#3b82f6] blur-xl"
                            />
                        )}
                        {showTransfer === 'B' && (
                            <motion.div
                                initial={{ x: '-40vw', opacity: 1, scale: 1 }}
                                animate={{ x: '40vw', transition: { duration: 1.5, ease: "circIn" } }}
                                className="w-1 h-[200vh] bg-teal-500 shadow-[0_0_100px_#2dd4bf] blur-xl"
                            />
                        )}

                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 200 }}
                                className="text-center"
                            >
                                <Trophy size={100} className={`mx-auto mb-6 ${showTransfer === 'TIE' ? 'text-green-400' : showTransfer === 'A' ? 'text-blue-400' : showTransfer === 'B' ? 'text-teal-400' : 'text-red-500'}`} />
                                <h2 className="text-6xl md:text-9xl font-bebas tracking-widest text-white drop-shadow-[0_0_50px_rgba(255,115,0,0.5)]">
                                    {showTransfer === 'TIE' ? '¡EMPATE TÁCTICO!' : showTransfer === 'NONE' ? '¡DERROTA COMPARTIDA!' : showTransfer === 'A' ? '¡GRUPO ALFA GANA!' : '¡GRUPO BRAVO GANA!'}
                                </h2>
                                <p className="text-2xl md:text-4xl font-bebas text-[#ffb700] tracking-[0.5em] mt-4">
                                    {showTransfer === 'TIE' ? `+${session?.stakes_xp} XP ACUMULADOS AL POZO` : showTransfer === 'A' || showTransfer === 'B' ? `+${(session?.stakes_xp || 0) + (session?.accumulated_pot || 0)} XP ARREBATADOS` : `-${session?.stakes_xp} XP POR FALLO GENERAL`}
                                </p>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom Tech Bar - Pulido v2.9.1 */}
            <div className="relative z-10 px-8 py-6 flex justify-between items-center bg-black/80 border-t border-white/10 backdrop-blur-md">
                <div className="flex gap-12 items-center">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Operational Link</span>
                        <span className="text-[12px] font-mono text-blue-400/60 uppercase">Stable Connect // v2.9.1</span>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="w-[1px] h-8 bg-white/10 mx-4 hidden md:block" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 italic">© 2026 ARENA TÁCTICA DE ÉLITE</span>
                </div>
            </div>
        </div>
    );
};

export default BibleWarDisplay;
