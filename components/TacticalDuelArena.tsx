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
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'duelo_desafios', filter: `oponente_id=eq.${currentUser.id.toUpperCase()}` }, (payload) => {
                    setChallenges(prev => [...prev, payload.new as DuelChallenge]);
                })
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duelo_desafios', filter: `retador_id=eq.${currentUser.id.toUpperCase()}` }, (payload) => {
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
                    const isA = String(refreshed.gladiator_a_id).toUpperCase() === String(currentUser.id).toUpperCase();
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
                fetchMyChallenges(currentUser.id.toUpperCase())
            ]);
            setAgents(agentsData.filter(a => String(a.id).toUpperCase() !== String(currentUser.id).toUpperCase()));
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
            {/* HEADER TÁCTICO - ULTRA COMPACTO */}
            <div className="p-3 border-b border-white/5 flex justify-between items-center bg-black/60 relative">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-red-500/20 rounded-lg border border-red-500/30">
                        <Swords className="text-red-400" size={16} />
                    </div>
                    <div>
                        <h1 className="text-base font-bebas tracking-widest leading-none">ARENA DE DUELOS</h1>
                        <p className="text-[6px] text-red-400 font-black uppercase tracking-widest mt-0.5">Protocolo Honor</p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    {challenges.length > 0 && (
                        <button onClick={() => setActiveTab('CHALLENGERS')} className="p-1.5 bg-yellow-500/20 rounded-full border border-yellow-500/30 animate-pulse">
                            <Bell className="text-yellow-400" size={14} />
                        </button>
                    )}
                    <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-full transition-colors">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* TABS ULTRA COMPACT */}
            <div className="flex bg-black/40 p-1 gap-1 border-b border-white/5">
                <button
                    onClick={() => setActiveTab('ARENA')}
                    className={`flex-1 py-1.5 rounded-md font-bebas tracking-widest text-[8px] uppercase transition-all ${activeTab === 'ARENA' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500'}`}
                >
                    PÚBLICA
                </button>
                <button
                    onClick={() => setActiveTab('CHALLENGERS')}
                    className={`flex-1 py-1.5 rounded-md font-bebas tracking-widest text-[8px] uppercase transition-all ${activeTab === 'CHALLENGERS' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500'}`}
                >
                    RETOS
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                    {showIntro && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            className="fixed inset-0 z-[60] bg-[#000814]/90 backdrop-blur-xl flex items-center justify-center p-4"
                        >
                            <div className="bg-gradient-to-br from-[#1a0000] to-black border border-red-500/20 p-5 rounded-[1.5rem] max-w-sm w-full space-y-3 text-center shadow-2xl">
                                <div className="w-10 h-10 bg-red-500/20 rounded-xl mx-auto flex items-center justify-center border border-red-500/30">
                                    <Swords className="text-red-400" size={20} />
                                </div>
                                <div className="space-y-0.5">
                                    <h2 className="text-lg font-bebas tracking-widest text-white uppercase">REGLAS DE HONOR</h2>
                                    <p className="text-[7px] text-red-300 font-black uppercase tracking-widest">Protocolo Consagrados</p>
                                </div>
                                <div className="space-y-2 text-left">
                                    <div className="flex gap-2.5">
                                        <div className="h-4 w-4 rounded-full bg-red-500/20 flex items-center justify-center text-[7px] font-black text-red-400 border border-red-500/30 flex-shrink-0">1</div>
                                        <p className="text-[8px] text-white/60 leading-tight"><span className="text-white font-bold">SIN RIESGO:</span> El combate no afecta tus XP base.</p>
                                    </div>
                                    <div className="flex gap-2.5">
                                        <div className="h-4 w-4 rounded-full bg-red-500/20 flex items-center justify-center text-[7px] font-black text-red-400 border border-red-500/30 flex-shrink-0">2</div>
                                        <p className="text-[8px] text-white/60 leading-tight"><span className="text-white font-bold">TIEMPO REAL:</span> Sincronización táctica con tu oponente.</p>
                                    </div>
                                    <div className="flex gap-2.5">
                                        <div className="h-4 w-4 rounded-full bg-red-500/20 flex items-center justify-center text-[7px] font-black text-red-400 border border-red-500/30 flex-shrink-0">3</div>
                                        <p className="text-[8px] text-white/60 leading-tight"><span className="text-white font-bold">GLORIA:</span> Desbloquea méritos únicos en tu perfil.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        localStorage.setItem('hide_duel_intro', 'true');
                                        setShowIntro(false);
                                    }}
                                    className="w-full py-2.5 bg-red-600 text-white rounded-lg font-bebas tracking-widest hover:bg-red-500 transition-all active:scale-95 text-sm"
                                >
                                    ¡RECTO AL COMBATE!
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'ARENA' && (
                        <motion.div key="arena" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 space-y-3">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 size-3.5" />
                                <input
                                    type="text"
                                    placeholder="BUSCAR AGENTE..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-white/[0.02] border border-white/5 rounded-lg py-2 pl-9 pr-4 text-[9px] font-black font-montserrat outline-none focus:border-red-500/30"
                                />
                            </div>

                            <div className="space-y-1.5 pb-24">
                                {filteredAgents.map(ag => (
                                    <div key={ag.id} className="p-2 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 bg-black/40">
                                                <img src={ag.photoUrl || "https://static.thenounproject.com/png/363640-200.png"} className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <h4 className="text-[9px] font-black font-bebas tracking-widest leading-none mb-0.5">{ag.name}</h4>
                                                <p className="text-[6px] text-red-400 font-black tracking-widest uppercase">{ag.rank} · {ag.xp} XP</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleSendChallenge(ag.id)} className="p-1.5 bg-red-600 rounded-lg hover:bg-red-500 transition-all active:scale-95">
                                            <Swords size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'CHALLENGERS' && (
                        <motion.div key="challengers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 space-y-2">
                            {challenges.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center text-center opacity-30 gap-2">
                                    <UserX size={32} />
                                    <p className="text-[8px] font-black tracking-widest uppercase font-bebas">Vacío</p>
                                </div>
                            ) : (
                                challenges.map(chall => {
                                    const retador = agents.find(a => a.id === chall.retador_id);
                                    return (
                                        <div key={chall.id} className="p-3 bg-gradient-to-br from-[#1a0000] to-black border border-red-500/10 rounded-xl space-y-2">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-9 h-9 bg-white/5 rounded-lg border border-white/10">
                                                    <img src={retador?.photoUrl || "https://static.thenounproject.com/png/363640-200.png"} className="w-full h-full object-cover rounded-md" />
                                                </div>
                                                <div>
                                                    <p className="text-[6px] text-red-400 font-black tracking-widest uppercase">NUEVO DESAFÍO</p>
                                                    <h3 className="text-xs font-bebas tracking-widest">{retador?.name || 'Agente'}</h3>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-1.5">
                                                <button onClick={() => handleAcceptChallenge(chall)} className="py-2 bg-green-600 rounded-lg font-bebas text-[9px] tracking-widest hover:bg-green-500 active:scale-95">ACEPTAR</button>
                                                <button className="py-2 bg-white/5 rounded-lg font-bebas text-[9px] tracking-widest active:scale-95">IGNORAR</button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'DUEL' && currentSession && (
                        <motion.div key="duel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col p-3 gap-3">
                            <div className="flex justify-between items-center gap-3 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                                <div className="text-center flex-1">
                                    <p className="text-[6px] text-blue-400 font-black uppercase">TÚ</p>
                                    <p className="text-xl font-bebas tracking-widest">{myScore}</p>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="w-7 h-7 bg-red-600 rounded-full flex items-center justify-center animate-pulse border border-white/10">
                                        <Zap size={14} />
                                    </div>
                                </div>
                                <div className="text-center flex-1">
                                    <p className="text-[6px] text-red-400 font-black uppercase">RIVAL</p>
                                    <p className="text-xl font-bebas tracking-widest">{opponentScore}</p>
                                </div>
                            </div>

                            <AnimatePresence mode="wait">
                                {currentQuestion && (
                                    <motion.div key={currentQuestion.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col gap-3">
                                        <div className="bg-black/40 border border-red-500/10 p-4 rounded-xl text-center shadow-lg">
                                            <span className="px-2 py-0.5 bg-red-500/20 rounded-full text-[6px] font-black text-red-400 tracking-widest uppercase">COMBATE</span>
                                            <h2 className="text-[11px] font-bold leading-tight mt-1.5 text-white/90">{currentQuestion.question}</h2>
                                        </div>
                                        <div className="grid grid-cols-1 gap-1.5">
                                            {currentQuestion.options.map((opt, i) => (
                                                <button
                                                    key={i}
                                                    disabled={hasAnswered}
                                                    onClick={() => {
                                                        const isCorrect = opt === currentQuestion.correct_answer;
                                                        setHasAnswered(true);
                                                        const isA = String(currentSession.gladiator_a_id).toUpperCase() === String(currentUser?.id).toUpperCase();
                                                        const newScore = (isA ? (currentSession.score_a || 0) : (currentSession.score_b || 0)) + (isCorrect ? 10 : 0);

                                                        supabase.from('duelo_sesiones')
                                                            .update(isA ? { score_a: newScore } : { score_b: newScore })
                                                            .eq('id', currentSession.id)
                                                            .then(() => {
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
                                                    className={`py-3.5 rounded-lg font-bebas tracking-widest text-[10px] ${hasAnswered ? opt === currentQuestion.correct_answer ? 'bg-green-600 text-white' : 'bg-white/5 text-white/30' : 'bg-white/5 border border-white/10 active:scale-95'}`}
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

            {/* DASHBOARD DE STATS INFERIOR - ULTRA COMPACTO */}
            <div className="p-2.5 bg-black/90 backdrop-blur-xl border-t border-white/5 grid grid-cols-3 gap-2 shadow-2xl">
                <StatItem label="WINS" value={currentUser?.duelStats?.wins || 0} color="text-green-500" />
                <StatItem label="LOSS" value={currentUser?.duelStats?.losses || 0} color="text-red-500" />
                <StatItem label="PTS" value={myScore} color="text-blue-500" />
            </div>
        </div>
    );
};

const StatItem = ({ label, value, color }: { label: string, value: any, color: string }) => (
    <div className="text-center p-1.5 rounded-lg bg-white/[0.02] border border-white/5">
        <p className="text-[5px] text-gray-500 font-black uppercase mb-0.5 tracking-widest">{label}</p>
        <p className={`text-[10px] font-bebas tracking-widest ${color}`}>{value}</p>
    </div>
);

export default TacticalDuelArena;
