import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Target, Zap, Clock, CheckCircle2, RotateCcw } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { fetchBibleWarSession, fetchBibleWarGroups, submitBibleWarAnswer, fetchBibleWarQuestions } from '../../services/supabaseService';
import { BibleWarSession, Agent } from '../../types';

interface BibleWarStudentProps {
    currentUser: Agent;
    onClose: () => void;
}

const BibleWarStudent: React.FC<BibleWarStudentProps> = ({ currentUser, onClose }) => {
    const [session, setSession] = useState<BibleWarSession | null>(null);
    const [myTeam, setMyTeam] = useState<'A' | 'B' | null>(null);
    const [activeQuestion, setActiveQuestion] = useState<any>(null);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log("🛡️ CARGANDO BIBLE WAR STUDENT v2.1.5 (SYNC-FIX)");
        loadInitialData();

        const sessionChannel = supabase
            .channel('bible_war_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bible_war_sessions' }, (payload) => {
                handleSessionUpdate(payload.new as BibleWarSession);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bible_war_groups' }, () => {
                // Re-cargar grupos si hay cambios para detectar mi equipo
                loadInitialData();
            })
            .on('broadcast', { event: 'LAUNCH_QUESTION' }, (payload) => {
                console.log("🚀 LANZAMIENTO DE PREGUNTA RECIBIDO:", payload.payload);
                if (payload.payload.question) {
                    setActiveQuestion(payload.payload.question);
                    setSelectedOption(null);
                    setSession(prev => prev ? {
                        ...prev,
                        status: 'ACTIVE',
                        current_question_id: payload.payload.question.id,
                        answer_a: null,
                        answer_b: null,
                        show_answer: false,
                        roulette_category: payload.payload.question.category
                    } : null);
                }
            })
            .on('broadcast', { event: 'SPIN_ROULETTE' }, (payload) => {
                console.log("🎰 GIRO DE RULETA RECIBIDO:", payload.payload);
                setSession(prev => prev ? {
                    ...prev,
                    status: 'SPINNING',
                    roulette_category: payload.payload.category,
                    answer_a: null,
                    answer_b: null,
                    current_question_id: null,
                    show_answer: false
                } : null);
                setActiveQuestion(null);
                setSelectedOption(null);
            })
            .on('broadcast', { event: 'RESET' }, () => {
                loadInitialData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(sessionChannel);
        };
    }, []);

    const loadInitialData = async () => {
        const [sessionData, groupsData] = await Promise.all([
            fetchBibleWarSession(),
            fetchBibleWarGroups()
        ]);

        const currentIdStr = String(currentUser.id).trim().toUpperCase();
        console.log("🕵️ Buscando equipo para Agente:", currentIdStr);
        const myGroup = groupsData.find(g => String(g.agent_id).trim().toUpperCase() === currentIdStr);
        if (myGroup) {
            console.log("✅ Equipo encontrado:", myGroup.team);
            setMyTeam(myGroup.team);
        } else {
            console.warn("⚠️ Agente no encontrado en grupos.");
            setMyTeam(null);
        }

        handleSessionUpdate(sessionData);
        setLoading(false);
    };

    const handleSessionUpdate = async (newState: BibleWarSession) => {
        if (!newState) return;
        setSession(newState);

        // Reset local si el status cambió a WAITING o SPINNING
        if (newState.status === 'WAITING' || newState.status === 'SPINNING') {
            setSelectedOption(null);
            if (newState.status === 'WAITING') setActiveQuestion(null);
        }

        // Cargar pregunta si hay una activa
        if (newState.current_question_id) {
            if (activeQuestion?.id !== newState.current_question_id) {
                const bibleQuestions = await fetchBibleWarQuestions();
                const q = bibleQuestions.find(q => q.id === newState.current_question_id);
                setActiveQuestion(q);
                // Reset mi seleccion si es una nueva pregunta detectada por DB
                setSelectedOption(null);
            }
        } else if (newState.status !== 'ACTIVE') {
            setActiveQuestion(null);
        }
    };

    const handleSelectOption = async (option: string) => {
        console.log(`🎯 Selección de opción: ${option} | Team: ${myTeam} | Status: ${session?.status} | isSubmitting: ${isSubmitting}`);
        if (!myTeam || session?.status !== 'ACTIVE' || isSubmitting) {
            console.warn("🚫 Selección bloqueada por estado o falta de equipo.");
            return;
        }

        // Verificar si mi equipo ya respondió (evitar envío doble)
        const myTeamAnswer = myTeam === 'A' ? session.answer_a : session.answer_b;
        if (myTeamAnswer) {
            console.warn("🚫 El equipo ya ha enviado una respuesta:", myTeamAnswer);
            return;
        }

        if ('vibrate' in navigator) navigator.vibrate(40);
        setIsSubmitting(true);
        setSelectedOption(option);

        // Actualización optimista del estado local
        setSession(prev => {
            if (!prev) return null;
            return {
                ...prev,
                answer_a: myTeam === 'A' ? option : prev.answer_a,
                answer_b: myTeam === 'B' ? option : prev.answer_b
            };
        });

        const res = await submitBibleWarAnswer(myTeam, option);
        if (!res.success) {
            alert("Error enviando respuesta.");
            setSelectedOption(null);
            // Revertir estado optimista si falla
            setSession(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    answer_a: myTeam === 'A' ? null : prev.answer_a,
                    answer_b: myTeam === 'B' ? null : prev.answer_b
                };
            });
        }
        setIsSubmitting(false);
    };

    if (loading) return <div className="p-10 text-center text-white/50">Cargando Arsenal...</div>;

    if (!myTeam) {
        return (
            <div className="flex flex-col items-center justify-center min-h-full p-6 text-center bg-[#000814] text-white space-y-4">
                <Shield size={64} className="text-white/20 mb-4" />
                <h2 className="text-3xl font-bebas tracking-widest text-blue-400">OPERATIVO DETECTADO</h2>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2 w-full max-w-xs">
                    <p className="text-[7px] font-black uppercase text-white/40 tracking-widest text-left">Firma Digital</p>
                    <p className="text-[10px] font-black uppercase text-white/80 text-left">{currentUser.name}</p>
                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                        <span className="text-[7px] font-black uppercase text-white/40">ID de Sistema</span>
                        <span className="text-[8px] font-mono text-[#ffb700]">{currentUser.id}</span>
                    </div>
                </div>

                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl w-full max-w-xs">
                    <p className="text-[8px] font-black uppercase text-red-500 tracking-widest">Estado: Sin Escuadrón</p>
                    <p className="text-[7px] text-white/50 uppercase mt-1">El comando aún no te ha asignado a Alfa o Bravo.</p>
                </div>

                <div className="pt-6">
                    <div className="w-8 h-8 border-2 border-t-[#ffb700] border-transparent rounded-full animate-spin mx-auto" />
                </div>

                <div className="flex flex-col gap-2 w-full max-w-xs pt-4">
                    <button onClick={loadInitialData} className="px-6 py-3 bg-white/5 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                        <RotateCcw size={10} /> Reintentar Conexión
                    </button>
                    <button onClick={onClose} className="px-6 py-3 bg-white/10 rounded-xl text-[8px] font-black uppercase tracking-widest opacity-50">Regresar a Base</button>
                </div>
            </div>
        );
    }

    const teamName = myTeam === 'A' ? 'ALFA' : 'BRAVO';
    const teamColor = myTeam === 'A' ? 'text-blue-400' : 'text-teal-400';
    const teamBgColor = myTeam === 'A' ? 'bg-blue-600' : 'bg-teal-600';
    const myTeamAnswer = myTeam === 'A' ? session?.answer_a : session?.answer_b;

    return (
        <div className="fixed inset-0 z-[9999] bg-[#000814] text-white overflow-y-auto custom-scrollbar font-montserrat select-none touch-manipulation">
            {/* Cabecera Fija */}
            <div className="sticky top-0 left-0 right-0 p-4 bg-black/80 border-b border-white/10 flex justify-between items-center backdrop-blur-xl z-50">
                <button
                    onPointerDown={onClose}
                    className="text-white/50 hover:text-white p-2 text-xs font-black uppercase tracking-widest active:scale-90 transition-transform"
                >
                    &lt; SALIR
                </button>
                <div className="flex items-center gap-3">
                    <button
                        onPointerDown={(e) => { e.preventDefault(); loadInitialData(); }}
                        className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-[#ffb700] active:bg-[#ffb700]/20"
                        title="Sincronizar"
                    >
                        <RotateCcw size={14} />
                    </button>
                    <div className="flex flex-col items-end">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${teamColor}`}>ESCUADRÓN {teamName}</span>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[7px] text-white/30 uppercase font-bold tracking-tighter">{currentUser.id}</span>
                            <div className={`w-2 h-2 rounded-full ${teamBgColor} animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.2)]`} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenido Scrollable */}
            <div className="relative z-10 w-full max-w-md mx-auto p-4 md:p-6 pb-40 flex flex-col items-center min-h-full">
                {session?.status === 'WAITING' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-10">
                        <Clock size={48} className="text-[#ffb700]/50 animate-pulse" />
                        <h2 className="text-3xl md:text-4xl font-bebas tracking-widest text-white/50">ESPERANDO DESPLIEGUE</h2>
                        <p className="text-[10px] text-[#ffb700] uppercase font-black tracking-widest">Atento a las instrucciones del Comando</p>

                    </motion.div>
                )}

                {session?.status === 'SPINNING' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-10">
                        <div className="relative">
                            <div className="w-20 h-20 md:w-32 md:h-32 border-4 border-t-[#ffb700] border-white/5 rounded-full animate-spin" />
                            <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#ffb700]" size={24} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl md:text-3xl font-bebas tracking-widest text-[#ffb700]">GIRANDO RULETA...</h2>
                            {session.roulette_category && (
                                <motion.p
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="text-lg font-bebas text-white px-4 py-1 bg-white/5 rounded-full border border-white/10"
                                >
                                    {session.roulette_category}
                                </motion.p>
                            )}
                        </div>
                    </motion.div>
                )}

                {(session?.status === 'ACTIVE' || session?.status === 'RESOLVED') && activeQuestion && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-4 md:space-y-6 pb-10">
                        {/* Status Bar */}
                        <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/10">
                            <div className="flex items-center gap-2">
                                <Zap size={14} className="text-[#ffb700]" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#ffb700]">{session.stakes_xp} XP</span>
                            </div>
                            {session.accumulated_pot && session.accumulated_pot > 0 && (
                                <div className="text-[10px] font-black uppercase tracking-widest text-green-400">
                                    POZO: +{session.accumulated_pot} XP
                                </div>
                            )}
                        </div>

                        <div className="text-center space-y-1 md:space-y-2 px-2">
                            <p className="text-[7px] md:text-[8px] font-black uppercase tracking-[0.3em] text-white/40">{activeQuestion.category}</p>
                            <h3 className="text-base md:text-2xl font-black italic leading-tight">{activeQuestion.question}</h3>
                        </div>

                        {myTeamAnswer && session.status !== 'RESOLVED' ? (
                            <div className="bg-[#ffb700]/10 border border-[#ffb700]/30 rounded-2xl p-4 md:p-6 text-center space-y-3 shadow-[0_0_30px_rgba(255,183,0,0.1)]">
                                <CheckCircle2 size={32} className="mx-auto text-[#ffb700]" />
                                <h3 className="text-xl md:text-2xl font-bebas tracking-widest text-[#ffb700]">RESPUESTA FIJADA</h3>
                                <div className="p-2 bg-white/5 rounded-lg">
                                    <p className="text-[8px] md:text-[10px] font-black tracking-widest uppercase opacity-60">Tu equipo eligió:</p>
                                    <p className="text-xs md:text-sm font-bold mt-1">"{myTeamAnswer}"</p>
                                </div>
                                <p className="text-[7px] md:text-[8px] opacity-40 uppercase mt-2">Esperando resolución del Comando...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {activeQuestion.options.map((opt: string, i: number) => {
                                    const isCorrect = session.show_answer && (opt === activeQuestion.correctAnswer || opt === activeQuestion.correct_answer);
                                    const isMyAnswer = opt === myTeamAnswer;
                                    const isAnyAnswerResolved = isMyAnswer && session.status === 'RESOLVED';

                                    let bgClass = "bg-white/5 border-white/10";
                                    let textClass = "text-white";

                                    if (session.status === 'RESOLVED') {
                                        if (isCorrect) {
                                            bgClass = "bg-green-500/20 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)] scale-105 z-10";
                                            textClass = "text-green-400";
                                        } else if (isMyAnswer && !isCorrect) {
                                            bgClass = "bg-red-500/20 border-red-500";
                                            textClass = "text-red-400 line-through opacity-50";
                                        } else {
                                            bgClass = "bg-white/2 border-transparent opacity-30";
                                        }
                                    } else if (selectedOption === opt) {
                                        bgClass = "bg-[#ffb700]/20 border-[#ffb700]";
                                        textClass = "text-[#ffb700]";
                                    }

                                    return (
                                        <button
                                            key={i}
                                            disabled={!!myTeamAnswer || isSubmitting || session.status === 'RESOLVED'}
                                            onPointerDown={(e) => {
                                                e.preventDefault();
                                                handleSelectOption(opt);
                                            }}
                                            className={`p-4 md:p-6 rounded-2xl transition-colors duration-75 relative overflow-hidden text-left flex flex-col justify-center min-h-[85px] w-full border-2 ${bgClass} 
                                                    ${!!myTeamAnswer ? 'cursor-default' : 'active:bg-blue-500/80 active:border-white active:scale-[0.98]'}
                                                    ${isMyAnswer ? 'ring-4 ring-[#ffb700] ring-offset-2 ring-offset-[#000814] border-[#ffb700]' : ''}
                                                `}
                                        >
                                            {/* Indicador de Selección / Envío */}
                                            {selectedOption === opt && isSubmitting && (
                                                <motion.div
                                                    layoutId="loading-overlay"
                                                    className="absolute inset-0 bg-[#ffb700]/20 flex items-center justify-center backdrop-blur-sm z-20"
                                                >
                                                    <div className="w-6 h-6 border-2 border-[#ffb700] border-t-transparent rounded-full animate-spin" />
                                                </motion.div>
                                            )}

                                            {myTeamAnswer === opt && (
                                                <div className="absolute top-3 right-3 z-10 bg-[#ffb700] rounded-full p-0.5">
                                                    <CheckCircle2 size={14} className="text-[#000814]" />
                                                </div>
                                            )}

                                            <div className="flex items-start gap-3 relative z-10">
                                                <span className="text-xs md:text-base opacity-40 font-black mt-0.5">{i === 0 ? 'A' : i === 1 ? 'B' : i === 2 ? 'C' : i === 3 ? 'D' : i}</span>
                                                <p className={`text-sm md:text-base font-bold leading-tight pr-8 ${textClass}`}>{opt}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {session.status === 'RESOLVED' && (
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-8 text-center bg-white/5 p-4 rounded-xl border border-white/10">
                                <h4 className="text-sm font-black uppercase tracking-widest text-[#ffb700] mb-2">RESOLUCIÓN</h4>
                                {activeQuestion.reference && <p className="text-[10px] text-white/50 italic">{activeQuestion.reference}</p>}
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </div>

            {/* Background FX */}
            <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
            </div>
        </div>
    );
};

export default BibleWarStudent;
