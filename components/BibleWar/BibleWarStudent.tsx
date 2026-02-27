import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Target, Zap, Clock, CheckCircle2 } from 'lucide-react';
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
        loadInitialData();

        const dbChannel = supabase
            .channel('bible_war_student_db')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bible_war_sessions' }, (payload) => {
                handleSessionUpdate(payload.new as BibleWarSession);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(dbChannel);
        };
    }, []);

    const loadInitialData = async () => {
        const [sessionData, groupsData] = await Promise.all([
            fetchBibleWarSession(),
            fetchBibleWarGroups()
        ]);

        const myGroup = groupsData.find(g => g.agent_id === currentUser.id);
        if (myGroup) {
            setMyTeam(myGroup.team);
        }

        handleSessionUpdate(sessionData);
        setLoading(false);
    };

    const handleSessionUpdate = async (newState: BibleWarSession) => {
        setSession(newState);

        // Cargar pregunta si hay una activa
        if (newState.current_question_id) {
            if (activeQuestion?.id !== newState.current_question_id) {
                const bibleQuestions = await fetchBibleWarQuestions();
                const q = bibleQuestions.find(q => q.id === newState.current_question_id);
                setActiveQuestion(q);
                // Reset mi seleccion si es una nueva pregunta
                setSelectedOption(null);
            }
        } else {
            setActiveQuestion(null);
            setSelectedOption(null);
        }
    };

    const handleSelectOption = async (option: string) => {
        if (!myTeam || session?.status !== 'ACTIVE' || isSubmitting) return;

        // Verificar si mi equipo ya respondió (evitar envío doble)
        const myTeamAnswer = myTeam === 'A' ? session.answer_a : session.answer_b;
        if (myTeamAnswer) return;

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
            <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#000814] text-white space-y-4">
                <Shield size={64} className="text-white/20 mb-4" />
                <h2 className="text-3xl font-bebas tracking-widest">FUERA DE COMBATE</h2>
                <p className="text-[10px] uppercase font-black tracking-widest text-[#ffb700]">No estás asignado a ningún Escuadrón (Alfa/Bravo).</p>
                <button onClick={onClose} className="mt-8 px-6 py-3 bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest">Regresar a Base</button>
            </div>
        );
    }

    const teamName = myTeam === 'A' ? 'ALFA' : 'BRAVO';
    const teamColor = myTeam === 'A' ? 'text-blue-400' : 'text-teal-400';
    const teamBgColor = myTeam === 'A' ? 'bg-blue-600' : 'bg-teal-600';
    const myTeamAnswer = myTeam === 'A' ? session?.answer_a : session?.answer_b;

    return (
        <div className="flex flex-col h-[100dvh] bg-[#000814] text-white overflow-hidden font-montserrat">
            {/* Cabecera */}
            <div className="p-4 bg-black/40 border-b border-white/10 flex justify-between items-center backdrop-blur-md relative z-20">
                <button onClick={onClose} className="text-white/50 hover:text-white p-2 text-xs font-black uppercase tracking-widest">
                    &lt; SALIR
                </button>
                <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${teamColor}`}>ESCUADRÓN {teamName}</span>
                    <div className={`w-3 h-3 rounded-full ${teamBgColor} animate-pulse`} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-8 flex flex-col items-center relative z-10 w-full custom-scrollbar">
                {session?.status === 'WAITING' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-10">
                        <Clock size={48} className="text-[#ffb700]/50 animate-pulse" />
                        <h2 className="text-3xl md:text-4xl font-bebas tracking-widest text-white/50">ESPERANDO DESPLIEGUE</h2>
                        <p className="text-[10px] text-[#ffb700] uppercase font-black tracking-widest">Atento a las instrucciones del Comando</p>
                    </motion.div>
                )}

                {session?.status === 'SPINNING' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-10">
                        <div className="w-16 h-16 md:w-24 md:h-24 border-4 border-t-[#ffb700] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                        <h2 className="text-2xl md:text-3xl font-bebas tracking-widest text-[#ffb700]">GIRANDO RULETA...</h2>
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

                        {/* Estado: Pendiente de responder o ya respondido */}
                        {myTeamAnswer && session.status !== 'RESOLVED' ? (
                            <div className="bg-[#ffb700]/20 border border-[#ffb700] rounded-2xl p-6 text-center space-y-4 shadow-[0_0_30px_rgba(255,183,0,0.2)]">
                                <CheckCircle2 size={48} className="mx-auto text-[#ffb700]" />
                                <h3 className="text-2xl font-bebas tracking-widest text-[#ffb700]">¡RESPUESTA FIJADA!</h3>
                                <p className="text-[10px] font-black tracking-widest uppercase">Tu equipo eligió: <br />"{myTeamAnswer}"</p>
                                <p className="text-[8px] opacity-60 uppercase mt-4">Esperando a Bravo/Resolución del Comando...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {activeQuestion.options.map((opt: string, i: number) => {
                                    const isCorrect = session.show_answer && (opt === activeQuestion.correctAnswer || opt === activeQuestion.correct_answer);
                                    const isMyAnswer = opt === myTeamAnswer;
                                    const isAnyAnswerResolved = isMyAnswer && session.status === 'RESOLVED';

                                    let bgClass = "bg-white/5 border border-white/10";
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
                                            onClick={() => handleSelectOption(opt)}
                                            className={`p-2.5 md:p-4 rounded-xl md:rounded-2xl transition-all duration-300 relative overflow-hidden ${bgClass} ${!!myTeamAnswer ? 'cursor-default ring-2 ring-[#ffb700] ring-offset-2 ring-offset-[#000814]' : 'hover:border-white/30 active:scale-95'}`}
                                        >
                                            {/* Indicador de Selección / Envío */}
                                            {selectedOption === opt && isSubmitting && (
                                                <motion.div
                                                    layoutId="loading-overlay"
                                                    className="absolute inset-0 bg-white/20 flex items-center justify-center backdrop-blur-sm"
                                                >
                                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                </motion.div>
                                            )}

                                            {myTeamAnswer === opt && (
                                                <div className="absolute top-2 right-2">
                                                    <CheckCircle2 size={16} className="text-[#ffb700]" />
                                                </div>
                                            )}

                                            <p className={`text-xs md:text-base font-bold ${textClass}`}>{opt}</p>
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
