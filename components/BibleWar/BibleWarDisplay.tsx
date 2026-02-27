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
    const timerRef = useRef<NodeJS.Timeout | null>(null);

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

        // 2. Canal de Broadcast para sincronización instantánea (Ultra-low latency)
        const syncChannel = supabase
            .channel('bible_war_sync')
            .on('broadcast', { event: 'bible_war_action' }, (envelope) => {
                const payload = envelope.payload;
                console.log('⚡ Recibido comando de ultra-baja latencia:', payload);
                if (!payload) return;

                if (payload.type === 'SPIN_ROULETTE') {
                    setSession(prev => prev ? { ...prev, status: 'SPINNING', roulette_category: payload.category } : null);
                } else if (payload.type === 'LAUNCH_QUESTION') {
                    setActiveQuestion(payload.question);
                    setSession(prev => prev ? { ...prev, status: 'ACTIVE', current_question_id: payload.question?.id, show_answer: false } : null);
                } else if (payload.type === 'RESOLVE') {
                    setShowTransfer(payload.winner);
                    setTimeout(() => setShowTransfer(null), 5000);
                    loadSession(); // Recargar estado completo para ver el ganador y XP
                } else if (payload.type === 'UPDATE_STAKES') {
                    setSession(prev => prev ? { ...prev, stakes_xp: payload.stakes } : null);
                } else if (payload.type === 'SHOW_ANSWER') {
                    setSession(prev => prev ? { ...prev, show_answer: payload.show } : null);
                } else if (payload.type === 'START_TIMER') {
                    startLocalTimer(payload.seconds);
                } else if (payload.type === 'RESET') {
                    loadSession();
                    setActiveQuestion(null);
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Arena conectada al canal de sincronización instantánea');
                }
            });

        return () => {
            supabase.removeChannel(dbChannel);
            supabase.removeChannel(syncChannel);
        };
    }, []);

    const handleUpdate = async (newState: BibleWarSession) => {
        setSession(newState);

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

    const startLocalTimer = (seconds: number) => {
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeLeft(seconds);
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current);
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
        <div className={`${isFullScreen ? 'fixed inset-0' : 'w-full h-full min-h-[600px] rounded-[2rem]'} bg-[#000814] flex flex-col overflow-hidden font-montserrat text-white select-none`}>
            {/* Background Ambient FX */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#003566_0%,transparent_70%)]" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
            </div>

            {/* Top Bar: Scores & Match Info */}
            <div className="relative z-10 p-2 md:p-6 flex flex-row justify-between items-center bg-black/40 backdrop-blur-xl border-b border-white/5 gap-2 md:gap-4 overflow-hidden">
                {/* Team A Card */}
                <motion.div
                    animate={showTransfer === 'A' ? { scale: [1, 1.1, 1], borderColor: '#ffb700' } : {}}
                    className="flex items-center gap-2 md:gap-8 bg-blue-900/20 p-2 md:p-6 rounded-xl md:rounded-2xl border border-blue-500/30 shadow-2xl min-w-0 flex-1 md:flex-initial md:min-w-[320px]"
                >
                    <div className="w-10 h-10 md:w-24 md:h-24 bg-blue-600 rounded-lg md:rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.4)] flex-shrink-0">
                        <Shield size={isFullScreen ? (window.innerWidth < 768 ? 20 : 48) : 24} className="text-white" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[8px] md:text-[14px] font-black text-blue-400 uppercase tracking-[0.2em] md:tracking-[0.3em] truncate"> ALFA</p>
                        <motion.p
                            key={session?.score_a}
                            initial={{ scale: 1.5, color: '#60a5fa' }}
                            animate={{ scale: 1, color: '#ffffff' }}
                            className="text-2xl md:text-7xl font-bebas leading-tight"
                        >
                            {session?.score_a || 0}
                        </motion.p>
                    </div>
                </motion.div>

                {/* Central Stakes Container */}
                <div className="flex flex-col items-center gap-1 md:gap-2 scale-75 md:scale-100">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-black/60 border border-[#ffb700]/30 px-4 md:px-10 py-1 md:py-4 rounded-full flex flex-col items-center shadow-[0_0_40px_rgba(255,183,0,0.1)]"
                    >
                        <div className="flex items-center gap-2 md:gap-4">
                            <Zap size={isFullScreen ? (window.innerWidth < 768 ? 14 : 24) : 16} className="text-[#ffb700] animate-pulse" />
                            <span className="text-md md:text-2xl font-bebas tracking-[0.1em] md:tracking-[0.2em] text-[#ffb700] whitespace-nowrap">{session?.stakes_xp || 100} XP</span>
                        </div>
                    </motion.div>
                </div>

                {/* Team B Card */}
                <motion.div
                    animate={showTransfer === 'B' ? { scale: [1, 1.1, 1], borderColor: '#ffb700' } : {}}
                    className="flex items-center gap-2 md:gap-8 bg-teal-900/20 p-2 md:p-6 rounded-xl md:rounded-2xl border border-teal-500/30 shadow-2xl min-w-0 flex-1 md:flex-initial md:min-w-[320px] text-right justify-end"
                >
                    <div className="min-w-0">
                        <p className="text-[8px] md:text-[14px] font-black text-teal-400 uppercase tracking-[0.2em] md:tracking-[0.3em] truncate"> BRAVO</p>
                        <motion.p
                            key={session?.score_b}
                            initial={{ scale: 1.5, color: '#2dd4bf' }}
                            animate={{ scale: 1, color: '#ffffff' }}
                            className="text-2xl md:text-7xl font-bebas leading-tight"
                        >
                            {session?.score_b || 0}
                        </motion.p>
                    </div>
                    <div className="w-10 h-10 md:w-24 md:h-24 bg-teal-600 rounded-lg md:rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(20,184,166,0.4)] flex-shrink-0">
                        <Target size={isFullScreen ? (window.innerWidth < 768 ? 20 : 48) : 24} className="text-white" />
                    </div>
                </motion.div>
            </div>

            {/* Main Stage: Roulette or Question */}
            <div className="relative flex-1 flex flex-col items-center justify-center p-2 md:p-10 z-10 overflow-hidden">
                {/* Temporizador HUD */}
                <AnimatePresence>
                    {timeLeft > 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.5 }}
                            className="absolute bottom-4 md:bottom-20 right-4 md:right-10 z-[100] pointer-events-none"
                        >
                            <div className={`text-6xl md:text-9xl font-bebas ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-[#ffb700]'} drop-shadow-[0_0_30px_rgba(0,0,0,0.5)]`}>
                                {timeLeft}
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
                            className="max-w-6xl w-full space-y-12 text-center"
                        >
                            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-1 rounded-full">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ffb700]">{activeQuestion.category}</span>
                                <div className="w-[1px] h-3 bg-white/20" />
                                <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${getDifficultyColor(activeQuestion.difficulty)}`}>{activeQuestion.difficulty}</span>
                            </div>

                            <motion.h1
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="text-2xl md:text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 leading-tight px-4"
                            >
                                {activeQuestion.question}
                            </motion.h1>

                            {/* Indicadores de Respuesta de Equipo */}
                            <div className="flex justify-center gap-12 pt-4">
                                <div className="flex flex-col items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.5)] transition-all duration-500 ${session?.answer_a ? 'bg-blue-500 scale-125' : 'bg-white/10'}`} />
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${session?.answer_a ? 'text-blue-400' : 'text-white/20'}`}>ALFA {session?.answer_a ? 'LISTO' : ''}</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full shadow-[0_0_15px_rgba(20,184,166,0.5)] transition-all duration-500 ${session?.answer_b ? 'bg-teal-500 scale-125' : 'bg-white/10'}`} />
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${session?.answer_b ? 'text-teal-400' : 'text-white/20'}`}>BRAVO {session?.answer_b ? 'LISTO' : ''}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-6 mt-4 md:mt-10">
                                {activeQuestion.options.map((opt: string, i: number) => {
                                    const isCorrect = opt === activeQuestion.correctAnswer || opt === activeQuestion.correct_answer;
                                    const showAnswer = session?.show_answer;

                                    return (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.8 + (i * 0.1) }}
                                            className={`p-4 md:p-8 rounded-xl md:rounded-[2rem] border text-lg md:text-3xl font-bebas tracking-wider transition-all duration-500 ${showAnswer && isCorrect ? 'bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_30px_rgba(34,197,94,0.3)] scale-[1.02]' : showAnswer ? 'opacity-10 border-white/5 bg-white/2' : 'bg-white/5 border-white/10 text-white/80'}`}
                                        >
                                            <span className="text-xs md:text-xl mr-2 md:mr-4 opacity-30">{i + 1}.</span> {opt}
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {session?.show_answer && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="mt-12 space-y-4"
                                >
                                    <div className="flex justify-center gap-6 md:gap-12">
                                        <div className="bg-blue-900/30 border border-blue-500/30 p-4 rounded-xl text-center min-w-[150px]">
                                            <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.3em] mb-2">ALFA ELIGIÓ</p>
                                            <p className="text-sm md:text-lg font-bebas tracking-widest">{session.answer_a || '---'}</p>
                                        </div>
                                        <div className="bg-teal-900/30 border border-teal-500/30 p-4 rounded-xl text-center min-w-[150px]">
                                            <p className="text-[10px] text-teal-400 font-black uppercase tracking-[0.3em] mb-2">BRAVO ELIGIÓ</p>
                                            <p className="text-sm md:text-lg font-bebas tracking-widest">{session.answer_b || '---'}</p>
                                        </div>
                                    </div>

                                    {activeQuestion.reference && (
                                        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl inline-block mt-4">
                                            <p className="text-[12px] text-[#ffb700] font-black uppercase tracking-[0.4em] mb-2">Referencia Táctica</p>
                                            <p className="text-2xl font-serif italic text-white/60">"{activeQuestion.reference}"</p>
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

            {/* Bottom Tech Bar */}
            <div className="relative z-10 p-4 md:p-8 flex justify-center md:justify-between items-center bg-black/60 border-t border-white/5 opacity-40">
                <div className="hidden md:flex gap-10">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Encryption</span>
                        <span className="text-[10px] font-mono">ULTRA-LOW-LATENCY-V5</span>
                    </div>
                </div>
                <div className="text-center md:text-right">
                    <span className="text-[8px] font-black uppercase tracking-[0.5em] text-white/60">© 2026 ARENA TÁCTICA</span>
                </div>
            </div>
        </div>
    );
};

export default BibleWarDisplay;
