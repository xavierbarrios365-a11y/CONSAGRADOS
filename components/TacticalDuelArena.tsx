import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Shield, Zap, Target, User, Search, Play, X, UserX, UserPlus, Bell, ChevronRight, Trophy, Clock, Sparkles } from 'lucide-react';
import { Agent, DuelChallenge, BibleWarSession } from '../types';
import { fetchMyChallenges, sendDuelChallenge, acceptDuelChallenge, fetchAgentsFromSupabase, fetchBibleWarQuestions } from '../services/supabaseService';
import { supabase } from '../services/supabaseClient';
import { BibleWarQuestion } from '../types';
interface TacticalDuelArenaProps {
    currentUser: Agent | null;
    onClose: () => void;
    onUpdateNeeded?: () => void;
}

export const TacticalDuelArena: React.FC<TacticalDuelArenaProps> = ({ currentUser, onClose, onUpdateNeeded }) => {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [challenges, setChallenges] = useState<DuelChallenge[]>([]);
    const [activeSession, setActiveSession] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<'ARENA' | 'CHALLENGERS' | 'DUEL'>('ARENA');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showIntro, setShowIntro] = useState(!localStorage.getItem('hide_duel_intro'));

    // Combat State
    const [currentSession, setCurrentSession] = useState<any | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<BibleWarQuestion | null>(null);
    const [questions, setQuestions] = useState<BibleWarQuestion[]>([]);
    const [myScore, setMyScore] = useState(0);
    const [opponentScore, setOpponentScore] = useState(0);
    const [hasAnswered, setHasAnswered] = useState(false);
    const [combatTimer, setCombatTimer] = useState(0);

    const sessionSubRef = useRef<any>(null);
    useEffect(() => {
        loadInitialData();
        // Suscripción en tiempo real para desafíos
        if (currentUser) {
            const challengeSub = supabase
                .channel('public:duelo_desafios')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'duelo_desafios', filter: `oponente_id=eq.${currentUser.id}` }, (payload) => {
                    setChallenges(prev => [...prev, payload.new as DuelChallenge]);
                })
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duelo_desafios', filter: `retador_id=eq.${currentUser.id}` }, (payload) => {
                    // Si mi desafío enviado fue aceptado, entrar a la arena
                    if (payload.new.status === 'ACEPTADO' && payload.new.session_id) {
                        handleEnterSession(payload.new.session_id);
                    }
                })
                .subscribe();

            return () => {
                challengeSub.unsubscribe();
                if (sessionSubRef.current) sessionSubRef.current.unsubscribe();
            };
        }
    }, [currentUser]);

    const handleEnterSession = async (sessionId: string) => {
        setIsLoading(true);
        const { data: session } = await supabase
            .from('duelo_sesiones')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (session) {
            setCurrentSession(session);
            setActiveTab('DUEL');
            subscribeToSession(sessionId);
            loadQuestions();
        }
        setIsLoading(false);
    };

    const subscribeToSession = (sessionId: string) => {
        if (sessionSubRef.current) sessionSubRef.current.unsubscribe();

        sessionSubRef.current = supabase
            .channel(`duel_session:${sessionId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duelo_sesiones', filter: `id=eq.${sessionId}` }, (payload) => {
                const refreshed = payload.new;
                setCurrentSession(refreshed);

                // Actualizar puntajes locales
                if (currentUser) {
                    const isA = refreshed.gladiator_a_id === currentUser.id;
                    setMyScore(isA ? refreshed.score_a : refreshed.score_b);
                    setOpponentScore(isA ? refreshed.score_b : refreshed.score_a);
                }
            })
            .subscribe();
    };

    const loadQuestions = async () => {
        const allQuestions = await fetchBibleWarQuestions();
        // Mezclar y tomar 5
        const shuffled = [...allQuestions].sort(() => 0.5 - Math.random()).slice(0, 5);
        setQuestions(shuffled);
        if (shuffled.length > 0) {
            setCurrentQuestion(shuffled[0]);
            // El que entra primero podría setear la pregunta inicial en la DB si está vacía
            // Pero mejor dejarlo reactivo al frontend por ahora para simplicidad táctica
        }
    };
    const loadInitialData = async () => {
        setIsLoading(true);
        if (currentUser) {
            const [agentsData, challengesData] = await Promise.all([
                fetchAgentsFromSupabase(),
                fetchMyChallenges(currentUser.id)
            ]);
            setAgents(agentsData.filter(a => a.id !== currentUser.id));
            setChallenges(challengesData);
        }
        setIsLoading(false);
    };

    const handleSendChallenge = async (oponenteId: string) => {
        if (!currentUser) return;
        const res = await sendDuelChallenge(currentUser.id, oponenteId);
        if (res.success) {
            alert("⚠️ DESAFÍO ENVIADO. ESPERANDO RESPUESTA...");
        }
    };

    const handleAcceptChallenge = async (challenge: DuelChallenge) => {
        const res = await acceptDuelChallenge(challenge.id, challenge.retador_id, challenge.oponente_id);
        if (res.success && res.sessionId) {
            handleEnterSession(res.sessionId);
        }
    };

    const filteredAgents = agents.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.rank.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 bg-[#000814]/95 backdrop-blur-2xl text-white font-montserrat flex flex-col overflow-hidden">
            {/* HEADER TÁCTICO */}
            <div className="p-4 sm:p-6 border-b border-white/10 flex justify-between items-center bg-black/40 relative">
                <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className="p-2 sm:p-3 bg-red-500/20 rounded-xl border border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                        <Swords className="text-red-400 size-5 sm:size-6" />
                    </div>
                    <div>
                        <h1 className="text-lg sm:text-xl font-bebas tracking-[.15em] sm:tracking-[.2em]">ARENA DE DUELOS</h1>
                        <p className="text-[6px] sm:text-[7px] text-red-400 font-bold uppercase tracking-[0.3em] sm:tracking-[0.4em] font-montserrat flex items-center gap-1.5">
                            <span className="w-1 h-1 bg-red-500 rounded-full animate-pulse" /> PROTOCOLO DE HONOR - ONLINE
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {challenges.length > 0 && (
                        <button
                            onClick={() => setActiveTab('CHALLENGERS')}
                            className="relative p-2 bg-yellow-500/20 rounded-full border border-yellow-500/40 animate-pulse"
                        >
                            <Bell className="text-yellow-400 size-[18px] sm:size-5" />
                            <span className="absolute -top-1 -right-1 bg-red-600 text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
                                {challenges.length}
                            </span>
                        </button>
                    )}
                    <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-white/5 rounded-full transition-colors">
                        <X className="size-5 sm:size-6" />
                    </button>
                </div>
            </div>

            {/* TABS NATIVE-LIKE */}
            <div className="flex bg-black/20 p-2 gap-2 border-b border-white/5">
                <button
                    onClick={() => setActiveTab('ARENA')}
                    className={`flex-1 py-3 rounded-xl font-bebas tracking-widest text-[10px] uppercase transition-all ${activeTab === 'ARENA' ? 'bg-white text-black shadow-xl scale-[0.98]' : 'text-gray-500 hover:text-white'}`}
                >
                    ARENA PÚBLICA
                </button>
                <button
                    onClick={() => setActiveTab('CHALLENGERS')}
                    className={`flex-1 py-3 rounded-xl font-bebas tracking-widest text-[10px] uppercase transition-all ${activeTab === 'CHALLENGERS' ? 'bg-white text-black shadow-xl scale-[0.98]' : 'text-gray-500 hover:text-white'}`}
                >
                    SOLICITUDES
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                    {showIntro && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            className="fixed inset-0 z-[60] bg-[#000814]/90 backdrop-blur-3xl flex items-center justify-center p-6"
                        >
                            <div className="bg-gradient-to-br from-[#1a0000] to-black border border-red-500/30 p-8 rounded-[3rem] max-w-sm w-full space-y-6 text-center shadow-[0_0_50px_rgba(239,68,68,0.2)]">
                                <div className="w-20 h-20 bg-red-500/20 rounded-3xl mx-auto flex items-center justify-center border border-red-500/40">
                                    <Swords className="text-red-400 size-10" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bebas tracking-widest text-white">REGLAS DE HONOR - ARENA</h2>
                                    <p className="text-[10px] text-red-300 font-bold uppercase tracking-widest">Protocolo de Combate Online Consagrados</p>
                                </div>
                                <div className="space-y-4 text-left">
                                    <div className="flex gap-4">
                                        <div className="h-6 w-6 rounded-full bg-red-500/20 flex items-center justify-center text-[10px] font-black text-red-400 border border-red-500/30 flex-shrink-0">1</div>
                                        <p className="text-[10px] text-white/70 leading-relaxed"><span className="text-white font-bold">DESAFÍO SIN RIESGO:</span> El duelo es una prueba de honor. No arriesgas tus puntos de XP base, solo tu reputación táctica.</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="h-6 w-6 rounded-full bg-red-500/20 flex items-center justify-center text-[10px] font-black text-red-400 border border-red-500/30 flex-shrink-0">2</div>
                                        <p className="text-[10px] text-white/70 leading-relaxed"><span className="text-white font-bold">COMBATE EN TIEMPO REAL:</span> Una vez aceptado el reto, ambos agentes entrarán en una sincronización de datos para responder simultáneamente.</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="h-6 w-6 rounded-full bg-red-500/20 flex items-center justify-center text-[10px] font-black text-red-400 border border-red-500/30 flex-shrink-0">3</div>
                                        <p className="text-[10px] text-white/70 leading-relaxed"><span className="text-white font-bold">ASCENSO DE GLORIA:</span> Ganar duelos desbloquea insignias especiales y mejora tus estadísticas en el perfil global.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        localStorage.setItem('hide_duel_intro', 'true');
                                        setShowIntro(false);
                                    }}
                                    className="w-full py-4 bg-red-600 text-white rounded-2xl font-bebas tracking-widest hover:bg-red-500 transition-all shadow-lg active:scale-95"
                                >
                                    ¡RECTO AL COMBATE!
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'ARENA' && (
                        <motion.div
                            key="arena"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="p-6 space-y-6"
                        >
                            {/* BUSCADOR */}
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors size-[18px]" />
                                <input
                                    type="text"
                                    placeholder="BUSCAR AGENTE PARA DESAFÍO..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 sm:py-4 pl-10 sm:pl-12 pr-6 text-[10px] sm:text-xs font-bold font-montserrat outline-none focus:border-blue-500/50 transition-all"
                                />
                            </div>

                            {/* LISTA DE AGENTES */}
                            <div className="space-y-3 pb-24">
                                {filteredAgents.map(ag => (
                                    <motion.div
                                        layout
                                        key={ag.id}
                                        className="p-4 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-between group hover:border-blue-500/30 transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 p-0.5 bg-gradient-to-tr from-blue-500/20 to-purple-500/20">
                                                <img src={ag.photoUrl || "https://static.thenounproject.com/png/363640-200.png"} alt={ag.name} className="w-full h-full object-cover rounded-xl" />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black uppercase font-bebas tracking-widest">{ag.name}</h4>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[7px] text-blue-400 font-black tracking-widest uppercase">{ag.rank}</span>
                                                    <span className="w-1 h-1 bg-white/20 rounded-full" />
                                                    <span className="text-[7px] text-gray-500 font-bold uppercase">{ag.xp} XP</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleSendChallenge(ag.id)}
                                            className="p-3 bg-red-600/10 border border-red-600/30 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-lg active:scale-95"
                                        >
                                            <Swords size={20} />
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'CHALLENGERS' && (
                        <motion.div
                            key="challengers"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="p-6 space-y-4"
                        >
                            {challenges.length === 0 ? (
                                <div className="h-96 flex flex-col items-center justify-center text-center opacity-30 grayscale gap-4">
                                    <UserX size={64} />
                                    <p className="text-xs font-bold tracking-[.3em] uppercase font-bebas">Sin Desafíos Pendientes</p>
                                </div>
                            ) : (
                                challenges.map(chall => {
                                    const retador = agents.find(a => a.id === chall.retador_id);
                                    return (
                                        <div key={chall.id} className="p-6 bg-gradient-to-br from-[#001d3d] to-[#000814] border border-blue-500/30 rounded-[2.5rem] relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                                                <Swords size={48} className="text-blue-500" />
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 bg-white/5 rounded-2xl border border-white/10 p-0.5">
                                                        <img src={retador?.photoUrl || "https://static.thenounproject.com/png/363640-200.png"} className="w-full h-full object-cover rounded-xl" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[8px] text-blue-400 font-black tracking-widest uppercase mb-1">¡ESTÁS SIENDO DESAFIADO!</p>
                                                        <h3 className="text-lg font-bebas tracking-tighter">{retador?.name || 'Agente Desconocido'}</h3>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <button
                                                        onClick={() => handleAcceptChallenge(chall)}
                                                        className="py-4 bg-green-600 rounded-2xl font-bebas text-xs tracking-widest hover:bg-green-500 transition-all shadow-[0_0_20px_rgba(22,163,74,0.3)] active:scale-95"
                                                    >
                                                        ACEPTAR DUELO
                                                    </button>
                                                    <button className="py-4 bg-white/5 border border-white/10 rounded-2xl font-bebas text-xs tracking-widest hover:bg-red-900/40 transition-all active:scale-95">
                                                        RECHAZAR
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'DUEL' && currentSession && (
                        <motion.div
                            key="duel"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="h-full flex flex-col p-6 gap-6"
                        >
                            {/* SCOREBOARD */}
                            <div className="flex justify-between items-center gap-4 bg-white/5 p-6 rounded-[2rem] border border-white/10 relative overflow-hidden">
                                <div className="absolute inset-0 bg-blue-500/5 transition-all duration-1000" style={{ width: `${(myScore / (myScore + opponentScore || 1)) * 100}%` }} />
                                <div className="relative z-10 text-center flex-1">
                                    <p className="text-[8px] text-blue-400 font-black uppercase mb-1">TÚ (PUNTOS)</p>
                                    <p className="text-3xl font-bebas text-white tracking-widest">{myScore}</p>
                                </div>
                                <div className="relative z-10 mx-4 flex flex-col items-center">
                                    <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center border-2 border-white/20 animate-pulse">
                                        <Zap size={20} className="text-white" />
                                    </div>
                                    <p className="text-[6px] font-bold mt-2 text-white/40">COMBATE</p>
                                </div>
                                <div className="relative z-10 text-center flex-1">
                                    <p className="text-[8px] text-red-400 font-black uppercase mb-1">OPONENTE</p>
                                    <p className="text-3xl font-bebas text-white tracking-widest">{opponentScore}</p>
                                </div>
                            </div>

                            {/* QUESTION AREA */}
                            <AnimatePresence mode="wait">
                                {currentQuestion && (
                                    <motion.div
                                        key={currentQuestion.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 1.1 }}
                                        className="flex-1 flex flex-col gap-6"
                                    >
                                        <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] text-center space-y-4">
                                            <span className="px-3 py-1 bg-blue-500/20 rounded-full text-[8px] font-black text-blue-400 tracking-widest uppercase">PREGUNTA TÁCTICA</span>
                                            <h2 className="text-lg font-bold leading-relaxed">{currentQuestion.question}</h2>
                                        </div>

                                        <div className="grid grid-cols-1 gap-3">
                                            {currentQuestion.options.map((opt, i) => (
                                                <button
                                                    key={i}
                                                    disabled={hasAnswered}
                                                    onClick={() => {
                                                        const isCorrect = opt === currentQuestion.correct_answer;
                                                        setHasAnswered(true);

                                                        // Actualizar en Supabase
                                                        const isA = currentSession.gladiator_a_id === currentUser?.id;
                                                        const newScore = (isA ? currentSession.score_a : currentSession.score_b) + (isCorrect ? 10 : 0);

                                                        supabase.from('duelo_sesiones')
                                                            .update(isA ? { score_a: newScore } : { score_b: newScore })
                                                            .eq('id', currentSession.id)
                                                            .then(() => {
                                                                // Siguiente pregunta después de una breve pausa
                                                                setTimeout(() => {
                                                                    const nextIdx = questions.findIndex(q => q.id === currentQuestion.id) + 1;
                                                                    if (nextIdx < questions.length) {
                                                                        setCurrentQuestion(questions[nextIdx]);
                                                                        setHasAnswered(false);
                                                                    } else {
                                                                        // Finalizar
                                                                        setActiveTab('ARENA');
                                                                        setCurrentSession(null);
                                                                        alert("🏁 COMBATE FINALIZADO. REVISA TUS ESTADÍSTICAS.");
                                                                        if (onUpdateNeeded) onUpdateNeeded();
                                                                    }
                                                                }, 1000);
                                                            });
                                                    }}
                                                    className={`py-5 rounded-2xl font-bebas text-lg tracking-widest transition-all ${hasAnswered
                                                            ? opt === currentQuestion.correct_answer
                                                                ? 'bg-green-600 border-green-500 text-white'
                                                                : 'bg-white/5 border-white/5 text-white/20'
                                                            : 'bg-white/5 border border-white/10 hover:border-blue-500/50 hover:bg-white/10'
                                                        }`}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* DASHBOARD DE STATS INFERIOR */}
            <div className="p-4 bg-black/80 backdrop-blur-md border-t border-white/5 flex grid grid-cols-3 gap-2">
                <StatItem label="VICTORIAS" value={currentUser?.duelStats?.wins || 0} color="text-green-500" />
                <StatItem label="DERROTAS" value={currentUser?.duelStats?.losses || 0} color="text-red-500" />
                <StatItem label="EMPATES" value={currentUser?.duelStats?.draws || 0} color="text-blue-500" />
            </div>
        </div>
    );
};

const StatItem = ({ label, value, color }: { label: string, value: number, color: string }) => (
    <div className="text-center p-2 rounded-2xl bg-white/5 border border-white/5">
        <p className="text-[6px] text-gray-500 font-black uppercase mb-1">{label}</p>
        <p className={`text-md font-bebas tracking-widest ${color}`}>{value}</p>
    </div>
);

export default TacticalDuelArena;
