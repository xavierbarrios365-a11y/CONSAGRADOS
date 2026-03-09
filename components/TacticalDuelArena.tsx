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

const TacticalDuelArena: React.FC<TacticalDuelArenaProps> = ({ currentUser, onClose, onUpdateNeeded }) => {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [challenges, setChallenges] = useState<DuelChallenge[]>([]);
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

    const sessionSubRef = useRef<any>(null);

    useEffect(() => {
        loadInitialData();
        if (currentUser) {
            const challengeSub = supabase
                .channel('public:duelo_desafios')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'duelo_desafios', filter: `oponente_id=eq.${currentUser.id}` }, (payload) => {
                    setChallenges(prev => [...prev, payload.new as DuelChallenge]);
                })
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duelo_desafios', filter: `retador_id=eq.${currentUser.id}` }, (payload) => {
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
        const shuffled = [...allQuestions].sort(() => 0.5 - Math.random()).slice(0, 5);
        setQuestions(shuffled);
        if (shuffled.length > 0) {
            setCurrentQuestion(shuffled[0]);
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
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40 relative">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/20 rounded-xl border border-red-500/40">
                        <Swords className="text-red-400 size-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bebas tracking-widest leading-none">ARENA DE DUELOS</h1>
                        <p className="text-[7px] text-red-400 font-bold uppercase tracking-widest mt-1">Protocolo de Honor</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {challenges.length > 0 && (
                        <button onClick={() => setActiveTab('CHALLENGERS')} className="p-2 bg-yellow-500/20 rounded-full border border-yellow-500/40 animate-pulse">
                            <Bell className="text-yellow-400 size-4" />
                        </button>
                    )}
                    <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* TABS COMPACT */}
            <div className="flex bg-black/40 p-1.5 gap-1.5 border-b border-white/5">
                <button
                    onClick={() => setActiveTab('ARENA')}
                    className={`flex-1 py-2.5 rounded-lg font-bebas tracking-widest text-[9px] uppercase transition-all ${activeTab === 'ARENA' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500'}`}
                >
                    ARENA PÚBLICA
                </button>
                <button
                    onClick={() => setActiveTab('CHALLENGERS')}
                    className={`flex-1 py-2.5 rounded-lg font-bebas tracking-widest text-[9px] uppercase transition-all ${activeTab === 'CHALLENGERS' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500'}`}
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
                            className="fixed inset-0 z-[60] bg-[#000814]/90 backdrop-blur-xl flex items-center justify-center p-6"
                        >
                            <div className="bg-gradient-to-br from-[#1a0000] to-black border border-red-500/30 p-6 rounded-[2rem] max-w-sm w-full space-y-4 text-center shadow-[0_0_50px_rgba(239,68,68,0.2)]">
                                <div className="w-12 h-12 bg-red-500/20 rounded-2xl mx-auto flex items-center justify-center border border-red-500/40">
                                    <Swords className="text-red-400" size={24} />
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-xl font-bebas tracking-widest text-white uppercase leading-tight">REGLAS DE HONOR</h2>
                                    <p className="text-[8px] text-red-300 font-bold uppercase tracking-widest">Protocolo Consagrados</p>
                                </div>
                                <div className="space-y-3 text-left">
                                    <div className="flex gap-3">
                                        <div className="h-5 w-5 rounded-full bg-red-500/20 flex items-center justify-center text-[8px] font-black text-red-400 border border-red-500/30 flex-shrink-0">1</div>
                                        <p className="text-[9px] text-white/70 leading-relaxed"><span className="text-white font-bold">SIN RIESGO:</span> No arriesgas tus puntos de XP base, solo tu reputación táctica.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="h-5 w-5 rounded-full bg-red-500/20 flex items-center justify-center text-[8px] font-black text-red-400 border border-red-500/30 flex-shrink-0">2</div>
                                        <p className="text-[9px] text-white/70 leading-relaxed"><span className="text-white font-bold">TIEMPO REAL:</span> Una vez aceptado el reto, ambos entrarán en sincronización.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="h-5 w-5 rounded-full bg-red-500/20 flex items-center justify-center text-[8px] font-black text-red-400 border border-red-500/30 flex-shrink-0">3</div>
                                        <p className="text-[9px] text-white/70 leading-relaxed"><span className="text-white font-bold">GLORIA:</span> Ganar duelos desbloquea insignias especiales en tu perfil.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        localStorage.setItem('hide_duel_intro', 'true');
                                        setShowIntro(false);
                                    }}
                                    className="w-full py-3 bg-red-600 text-white rounded-xl font-bebas tracking-widest hover:bg-red-500 transition-all active:scale-95"
                                >
                                    ¡RECTO AL COMBATE!
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'ARENA' && (
                        <motion.div key="arena" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 space-y-4">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 size-4" />
                                <input
                                    type="text"
                                    placeholder="BUSCAR AGENTE..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-[10px] font-black font-montserrat outline-none focus:border-red-500/50"
                                />
                            </div>

                            <div className="space-y-2 pb-24">
                                {filteredAgents.map(ag => (
                                    <div key={ag.id} className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 bg-black/40">
                                                <img src={ag.photoUrl || "https://static.thenounproject.com/png/363640-200.png"} className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <h4 className="text-[10px] font-black font-bebas tracking-widest leading-none mb-1">{ag.name}</h4>
                                                <p className="text-[7px] text-red-400 font-black tracking-widest uppercase">{ag.rank} · {ag.xp} XP</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleSendChallenge(ag.id)} className="p-2.5 bg-red-600 rounded-xl hover:bg-red-500 transition-all active:scale-95">
                                            <Swords size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'CHALLENGERS' && (
                        <motion.div key="challengers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 space-y-3">
                            {challenges.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center text-center opacity-30 gap-3">
                                    <UserX size={40} />
                                    <p className="text-[9px] font-black tracking-widest uppercase font-bebas">Sin Desafíos</p>
                                </div>
                            ) : (
                                challenges.map(chall => {
                                    const retador = agents.find(a => a.id === chall.retador_id);
                                    return (
                                        <div key={chall.id} className="p-4 bg-gradient-to-br from-[#1a0000] to-black border border-red-500/20 rounded-2xl space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-11 h-11 bg-white/5 rounded-xl border border-white/10">
                                                    <img src={retador?.photoUrl || "https://static.thenounproject.com/png/363640-200.png"} className="w-full h-full object-cover rounded-lg" />
                                                </div>
                                                <div>
                                                    <p className="text-[7px] text-red-400 font-black tracking-widest uppercase mb-0.5">ESTÁS SIENDO DESAFIADO</p>
                                                    <h3 className="text-sm font-bebas tracking-widest">{retador?.name || 'Agente'}</h3>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button onClick={() => handleAcceptChallenge(chall)} className="py-2.5 bg-green-600 rounded-xl font-bebas text-[10px] tracking-widest hover:bg-green-500 active:scale-95">ACEPTAR</button>
                                                <button className="py-2.5 bg-white/10 rounded-xl font-bebas text-[10px] tracking-widest active:scale-95">RECHAZAR</button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'DUEL' && currentSession && (
                        <motion.div key="duel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col p-4 gap-4">
                            <div className="flex justify-between items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                                <div className="text-center flex-1">
                                    <p className="text-[7px] text-blue-400 font-black uppercase mb-0.5">TÚ</p>
                                    <p className="text-2xl font-bebas tracking-widest">{myScore}</p>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center animate-pulse">
                                        <Zap size={16} />
                                    </div>
                                </div>
                                <div className="text-center flex-1">
                                    <p className="text-[7px] text-red-400 font-black uppercase mb-0.5">OPONENTE</p>
                                    <p className="text-2xl font-bebas tracking-widest">{opponentScore}</p>
                                </div>
                            </div>

                            <AnimatePresence mode="wait">
                                {currentQuestion && (
                                    <motion.div key={currentQuestion.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col gap-4">
                                        <div className="bg-black/40 border border-red-500/20 p-5 rounded-2xl text-center shadow-lg">
                                            <span className="px-2 py-0.5 bg-red-500/20 rounded-full text-[7px] font-black text-red-400 tracking-widest uppercase">COMBATE TÁCTICO</span>
                                            <h2 className="text-sm font-bold leading-tight mt-2">{currentQuestion.question}</h2>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2">
                                            {currentQuestion.options.map((opt, i) => (
                                                <button
                                                    key={i}
                                                    disabled={hasAnswered}
                                                    onClick={() => {
                                                        const isCorrect = opt === currentQuestion.correct_answer;
                                                        setHasAnswered(true);
                                                        const isA = currentSession.gladiator_a_id === currentUser?.id;
                                                        const newScore = (isA ? currentSession.score_a : currentSession.score_b) + (isCorrect ? 10 : 0);
                                                        supabase.from('duelo_sesiones').update(isA ? { score_a: newScore } : { score_b: newScore }).eq('id', currentSession.id).then(() => {
                                                            setTimeout(() => {
                                                                const nextIdx = questions.findIndex(q => q.id === currentQuestion.id) + 1;
                                                                if (nextIdx < questions.length) {
                                                                    setCurrentQuestion(questions[nextIdx]);
                                                                    setHasAnswered(false);
                                                                } else {
                                                                    setActiveTab('ARENA');
                                                                    setCurrentSession(null);
                                                                    if (onUpdateNeeded) onUpdateNeeded();
                                                                }
                                                            }, 1000);
                                                        });
                                                    }}
                                                    className={`py-4 rounded-xl font-bebas tracking-widest text-[11px] ${hasAnswered ? opt === currentQuestion.correct_answer ? 'bg-green-600 text-white' : 'bg-white/5 text-white/30' : 'bg-white/5 border border-white/10 active:scale-95'}`}
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
            <div className="p-3 bg-black/90 backdrop-blur-xl border-t border-white/5 grid grid-cols-3 gap-3">
                <StatItem label="VICTORIAS" value={currentUser?.duelStats?.wins || 0} color="text-green-500" />
                <StatItem label="DERROTAS" value={currentUser?.duelStats?.losses || 0} color="text-red-500" />
                <StatItem label="PUNTOS" value={myScore} color="text-blue-500" />
            </div>
        </div>
    );
};

const StatItem = ({ label, value, color }: { label: string, value: any, color: string }) => (
    <div className="text-center p-2 rounded-xl bg-white/5 border border-white/5">
        <p className="text-[6px] text-gray-500 font-black uppercase mb-0.5 tracking-widest">{label}</p>
        <p className={`text-sm font-bebas tracking-widest ${color}`}>{value}</p>
    </div>
);

export default TacticalDuelArena;
