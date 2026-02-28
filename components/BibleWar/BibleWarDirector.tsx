import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Dice5,
    Send,
    RotateCcw,
    Users,
    Trophy,
    Skull,
    ChevronRight,
    Search,
    Plus,
    Minus,
    Zap,
    HelpCircle,
    Eye,
    RefreshCw
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import {
    updateBibleWarSession,
    transferBibleWarXP,
    fetchBibleWarSession,
    fetchBibleWarGroups,
    assignAgentToBibleWarGroup,
    fetchAgentsFromSupabase,
    fetchBibleWarQuestions,
    clearBibleWarQuestions,
    importBibleWarQuestions
} from '../../services/supabaseService';
import { BibleWarSession, Agent } from '../../types';

interface BibleWarDirectorProps {
    onClose?: () => void;
}

const BibleWarDirector: React.FC<BibleWarDirectorProps> = ({ onClose }) => {
    // 1. ESTADOS
    const [session, setSession] = useState<BibleWarSession | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [customStakes, setCustomStakes] = useState(100);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [showGladiatorManager, setShowGladiatorManager] = useState(false);
    const [broadcastChannel, setBroadcastChannel] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [showQuestionImporter, setShowQuestionImporter] = useState(false);
    const [importJson, setImportJson] = useState('');
    const sessionRef = useRef<BibleWarSession | null>(null);
    const questionsRef = useRef<any[]>([]);
    const bcRef = useRef<any>(null);
    const autoResolveRef = useRef<() => void>(() => { });

    // Actualizar Refs cada vez que cambien los estados
    useEffect(() => { sessionRef.current = session; }, [session]);
    useEffect(() => { questionsRef.current = questions; }, [questions]);
    useEffect(() => { bcRef.current = broadcastChannel; }, [broadcastChannel]);

    // 2. EFECTOS
    useEffect(() => {
        console.log("🛠️ BibleWarDirector: COMPONENTE MONTADO");
        loadSession();

        const dbChannel = supabase
            .channel('bible_war_director_db')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bible_war_sessions' }, (payload) => {
                console.log("🔄 BibleWarDirector: DB CHANGE DETECTED", payload);
                setSession(payload.new as BibleWarSession);
            })
            .subscribe((status) => console.log("📡 Subscripción DB:", status));

        const bcChannel = supabase.channel('bible_war_realtime')
            .on('broadcast', { event: 'TIMER_END' }, (envelope) => {
                console.log('⚡ Director: TIMER_END', envelope.payload);
                if (envelope.payload?.phase === 'BATTLE') {
                    console.log("⏰ Tiempo agotado. Disparando auto-resolución...");
                    setTimeout(() => autoResolveRef.current(), 500);
                }
            })
            .on('broadcast', { event: 'BOTH_ANSWERED' }, (envelope) => {
                console.log('⚡ Director: BOTH_ANSWERED', envelope.payload);
                console.log("🎯 Ambos respondieron. Disparando auto-resolución...");
                setTimeout(() => autoResolveRef.current(), 500);
            })
            .subscribe((status) => {
                console.log("📡 Subscripción Broadcast:", status);
                if (status === 'SUBSCRIBED') {
                    setBroadcastChannel(bcChannel);
                }
            });

        return () => {
            console.log("🧹 BibleWarDirector: COMPONENTE DESMONTADO");
            supabase.removeChannel(dbChannel);
            supabase.removeChannel(bcChannel);
        };
    }, []);

    // 3. FUNCIONES DE CARGA Y BROADCAST
    const loadSession = async () => {
        const [sessionData, agentsData, bibleQuestions] = await Promise.all([
            fetchBibleWarSession(),
            fetchAgentsFromSupabase(),
            fetchBibleWarQuestions()
        ]);
        setSession(sessionData);
        setAgents(agentsData);
        setQuestions(bibleQuestions);
        setLoading(false);
    };


    const broadcastAction = (event: string, payload: any = {}) => {
        const channel = bcRef.current;
        if (channel) {
            console.log(`📤 Enviando Broadcast: ${event}`, payload);
            channel.send({
                type: 'broadcast',
                event: event,
                payload: payload
            });
        }
    };

    // 4. FUNCIONES DE LÓGICA DE JUEGO
    const handleLaunchQuestion = async (q: any) => {
        console.log("🚀 Lanzando pregunta:", q.id);
        const usedIds = session?.used_questions || [];

        // Puntos automáticos por dificultad (v2.5)
        let points = 5;
        if (q.difficulty === 'EASY') points = 2;
        if (q.difficulty === 'HARD') points = 15;

        const updates = {
            current_question_id: q.id,
            status: 'ACTIVE' as const,
            show_answer: false,
            active_team: null,
            timer_status: 'STOPPED' as const,
            timer_end_at: null,
            answer_a: null,
            answer_b: null,
            roulette_category: q.category,
            used_questions: Array.from(new Set([...usedIds, q.id])),
            stakes_xp: points
        };

        setSession(prev => prev ? { ...prev, ...updates } : null);
        setSelectedQuestion(q);

        const res = await updateBibleWarSession(updates);
        console.log("📦 Resultado Lanzamiento:", res);
        if (res.success) {
            broadcastAction('LAUNCH_QUESTION', { question: q });
        } else {
            console.error("Error al lanzar pregunta:", res.error);
            alert("Error al lanzar pregunta. Reintentando...");
            loadSession();
        }
    };

    const handleUpdateStakes = async (val: number) => {
        setSession(prev => prev ? { ...prev, stakes_xp: val } : null);
        const res = await updateBibleWarSession({ stakes_xp: val });
        if (res.success) {
            broadcastAction('UPDATE_STAKES', { stakes: val });
        } else {
            loadSession();
        }
    };

    const handleAutoResolve = async () => {
        const currentSession = sessionRef.current;
        const currentQuestions = questionsRef.current;

        // v3.5 logic inside handleAutoResolve...

        if (!currentSession?.current_question_id) {
            console.log("❌ handleAutoResolve: No hay sesión o question_id activo.");
            return;
        }

        const q = currentQuestions.find(qu => qu.id === currentSession.current_question_id);
        if (!q) {
            console.log("❌ handleAutoResolve: No se encontró la pregunta en el banco.");
            return;
        }

        const ansA = currentSession.answer_a;
        const ansB = currentSession.answer_b;

        if (!ansA && !ansB) {
            console.log("⚠️ Nadie respondió. Resolviendo como derrota general (NONE).");
        }

        const isACorrect = ansA && (ansA === q.correct_answer || ansA === (q as any).correctAnswer);
        const isBCorrect = ansB && (ansB === q.correct_answer || ansB === (q as any).correctAnswer);

        let winner: 'A' | 'B' | 'NONE' | 'TIE' = 'NONE';
        if (isACorrect && !isBCorrect) winner = 'A';
        else if (isBCorrect && !isACorrect) winner = 'B';
        else if (isACorrect && isBCorrect) winner = 'TIE';
        else winner = 'NONE';

        const stakes = currentSession?.stakes_xp || customStakes;
        console.log(`✅ Resolviendo: Ganador=${winner}, Stakes=${stakes}`);

        const res = await transferBibleWarXP(winner, stakes);
        if (res.success) {
            broadcastAction('RESOLVE', { winner });
            setTimeout(loadSession, 1000);
        } else {
            console.error("Error en transferencia:", res.error);
        }
    };

    // Registrar handleAutoResolve en el Ref en cada render (v3.5)
    useEffect(() => {
        autoResolveRef.current = handleAutoResolve;
    });

    const handleSpinRoulette = async () => {
        const categories = [...new Set(questions.map(q => q.category))];
        if (categories.length === 0) return alert("No hay preguntas cargadas en el banco.");

        const randomCat = categories[Math.floor(Math.random() * categories.length)];
        const updates = {
            roulette_category: randomCat,
            status: 'SPINNING' as const,
            answer_a: null,
            answer_b: null,
            current_question_id: null,
            show_answer: false
        };

        setSession(prev => prev ? { ...prev, ...updates } : null);
        setSearchTerm(randomCat);

        const res = await updateBibleWarSession(updates);
        if (res.success) {
            broadcastAction('SPIN_ROULETTE', { category: randomCat });
        } else {
            loadSession();
        }
    };

    // 5. FUNCIONES DE MANTENIMIENTO Y RESETS
    const handleForceReload = () => {
        alert("🚨 DEP_SYNC: SE EJECUTARÁ LA ACCIÓN DE CARGA");
        console.log("🚀 Click en FORCE RELOAD");
        broadcastAction('FORCE_RELOAD', {});
        alert("📡 Señal de recarga enviada.");
    };

    const handleResetScores = async () => {
        console.log("🚀 Click en RESET SCORES");
        const updates = { score_a: 0, score_b: 0 };
        const res = await updateBibleWarSession(updates);
        console.log("📦 Resultado updateBibleWarSession:", res);
        if (res.success) {
            loadSession();
            alert("✅ Marcadores reiniciados.");
        } else {
            alert(`❌ Error al reiniciar marcadores: ${res.error}`);
        }
    };

    const handleNukeReset = async () => {
        console.log("🚀 Click en NUKE RESET");
        if (!window.confirm("☢️ NUCLEAR RESET: ¿Estás seguro? Se borrarán TODAS las respuestas y se reiniciará el proyector y móviles.")) return;

        const updates = {
            current_question_id: null,
            status: 'WAITING' as const,
            show_answer: false,
            active_team: null,
            timer_status: 'STOPPED' as const,
            timer_end_at: null,
            answer_a: null,
            answer_b: null,
            roulette_category: null,
            accumulated_pot: 0,
            used_questions: [],
            score_a: 0,
            score_b: 0,
            stakes_xp: 5
        };

        const res = await updateBibleWarSession(updates);
        console.log("📦 Resultado NUKE:", res);
        if (res.success) {
            broadcastAction('RESET', updates);
            broadcastAction('FORCE_RELOAD', {});
            setTimeout(() => {
                loadSession();
                alert("☢️ Sistema purgado y recargado con éxito.");
            }, 500);
        } else {
            alert(`❌ Error en Nuke: ${res.error}`);
        }
    };

    const handleReset = async () => {
        if (!window.confirm('¿RESETEAR TODA LA GUERRA?')) return;
        const updates = {
            score_a: 0,
            score_b: 0,
            status: 'WAITING' as const,
            current_question_id: null,
            active_team: null,
            show_answer: false,
            stakes_xp: 5,
            timer_status: 'STOPPED' as const,
            timer_end_at: null,
            answer_a: null,
            answer_b: null,
            accumulated_pot: 0
        };
        const res = await updateBibleWarSession(updates);
        if (res.success) {
            broadcastAction('RESET');
            loadSession();
        }
    };


    const handleStartTimer = async (seconds: number) => {
        const endAt = new Date(Date.now() + seconds * 1000).toISOString();
        const updates = { timer_end_at: endAt, timer_status: 'RUNNING' as const };
        setSession(prev => prev ? { ...prev, ...updates } : null);
        await updateBibleWarSession(updates);
        broadcastAction('START_TIMER', { endAt, seconds });
    };

    const handleCoinFlip = async () => {
        const teams: ('ALFA' | 'BRAVO')[] = ['ALFA', 'BRAVO'];
        const winner = teams[Math.floor(Math.random() * teams.length)];
        const updates = { last_coin_flip: winner };
        setSession(prev => prev ? { ...prev, ...updates } : null);
        const res = await updateBibleWarSession(updates);
        if (res.success) broadcastAction('COIN_FLIP', { winner });
    };

    const handleClearQuestions = async () => {
        if (!window.confirm("¿BORRAR TODO el banco de preguntas?")) return;
        const res = await clearBibleWarQuestions();
        if (res.success) {
            alert("✅ Banco vaciado.");
            loadSession();
        }
    };

    const handleImportQuestions = async () => {
        try {
            if (!importJson.trim()) return alert("⚠️ JSON vacío.");
            const data = JSON.parse(importJson);
            const res = await importBibleWarQuestions(data);
            if (res.success) {
                alert("✅ Importado con éxito.");
                setImportJson('');
                setShowQuestionImporter(false);
                loadSession();
            }
        } catch (e: any) {
            alert(`⚠️ Error: ${e.message}`);
        }
    };

    // 7. FILTRADO Y RENDERIZADO
    const filteredQuestions = questions.filter(q =>
        q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-10 text-center text-white/50 font-bebas tracking-widest text-2xl animate-pulse">CONECTANDO A LA ARENA...</div>;

    return (
        <div className="flex flex-col h-full bg-[#001f3f] text-white font-montserrat select-none">
            {/* Header */}
            <div className="p-6 bg-black/20 border-b border-white/10 flex items-center justify-between">
                <div>
                    <h2 className="text-lg md:text-xl font-bebas tracking-widest uppercase">Panel de Comando: Guerra Bíblica</h2>
                    <p className="text-[10px] text-red-500 font-black uppercase tracking-widest animate-pulse">ESTADO: v2.5.4 (DEBUG ACTIVE - SI VES ESTO, EL BOTÓN SYNC DEBERÍA DAR ALERTA)</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowQuestionImporter(!showQuestionImporter)} className={`p-2 rounded-xl transition-all ${showQuestionImporter ? 'bg-purple-600' : 'bg-white/5 border border-white/10'}`}>
                        <Plus size={16} />
                    </button>
                    <button onClick={() => setShowGladiatorManager(!showGladiatorManager)} className={`p-2 rounded-xl transition-all ${showGladiatorManager ? 'bg-[#ffb700] text-[#001f3f]' : 'bg-white/5 border border-white/10'}`}>
                        <Users size={16} />
                    </button>
                    <button onClick={() => window.open('?view=bible_war_display', '_blank')} className="p-2 bg-blue-600 rounded-xl">
                        <Eye size={16} />
                    </button>
                    <button onClick={handleReset} className="p-2 bg-red-600/20 border border-red-600/30 rounded-xl text-red-500">
                        <RotateCcw size={16} />
                    </button>
                </div>
            </div>

            {/* Modales In-line */}
            <AnimatePresence>
                {showQuestionImporter && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="bg-purple-900/20 border-b border-purple-500/30 overflow-hidden p-6 space-y-4">
                        <div className="flex justify-between items-center"><h3 className="text-[10px] font-black uppercase text-purple-400">Importador JSON</h3><button onClick={handleClearQuestions} className="text-[8px] color-red-400">VACÍAR</button></div>
                        <textarea value={importJson} onChange={e => setImportJson(e.target.value)} className="w-full h-32 bg-black/40 border border-purple-500/30 rounded-xl p-4 text-[10px] font-mono" />
                        <button onClick={handleImportQuestions} className="w-full py-3 bg-purple-600 rounded-xl font-black uppercase text-[10px]">IMPORTAR</button>
                    </motion.div>
                )}
                {showGladiatorManager && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="bg-black/30 border-b border-white/10 overflow-hidden p-6 space-y-4">
                        <h3 className="text-[10px] font-black uppercase text-[#ffb700]">Selección de Gladiadores Reales</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {['A', 'B'].map(t => {
                                const gladId = t === 'A' ? session?.gladiator_a_id : session?.gladiator_b_id;
                                const gladiator = agents.find(a => a.id === gladId);
                                return (
                                    <div key={t} className="space-y-2">
                                        <p className={`text-[8px] font-black uppercase ${t === 'A' ? 'text-blue-400' : 'text-teal-400'}`}>COMO JUGADOR {t === 'A' ? 'UNO' : 'DOS'}</p>
                                        <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex flex-col gap-3">
                                            {gladiator ? (
                                                <div className="flex items-center gap-3 bg-white/10 p-2 rounded-lg relative group border border-[#ffb700]/30 shadow-lg shadow-[#ffb700]/5">
                                                    <img src={gladiator.photoUrl || '/default-avatar.png'} className="w-10 h-10 rounded-full border-2 border-[#ffb700]/50 object-cover" />
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[10px] font-bold truncate">{gladiator.name}</span>
                                                        <span className="text-[7px] text-[#ffb700] font-black uppercase tracking-widest">{gladiator.rank}</span>
                                                    </div>
                                                    <button
                                                        onClick={async () => {
                                                            const res = await updateBibleWarSession(t === 'A' ? { gladiator_a_id: null } : { gladiator_b_id: null });
                                                            if (!res.success) alert("Error al remover gladiador");
                                                        }}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:scale-125 transition-transform"
                                                    >
                                                        <Plus size={16} className="rotate-45" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="text-center py-4 px-4 border border-dashed border-white/20 rounded-lg text-[8px] text-white/30 italic uppercase tracking-widest animate-pulse">
                                                    SIN GLADIADOR {t === 'A' ? 'ALFA' : 'BRAVO'}
                                                </div>
                                            )}
                                            <div className="relative">
                                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-white/40" size={12} />
                                                <select
                                                    onChange={async (e) => {
                                                        const val = e.target.value;
                                                        if (!val) return;
                                                        const res = await updateBibleWarSession(t === 'A' ? { gladiator_a_id: val } : { gladiator_b_id: val });
                                                        if (!res.success) alert("Error al asignar gladiador");
                                                    }}
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg pl-8 pr-2 py-2 text-[9px] font-black outline-none focus:border-[#ffb700] appearance-none"
                                                    value=""
                                                >
                                                    <option value="" disabled>+ SELECCIONAR GLADIADOR</option>
                                                    {agents.filter(a => a.id !== session?.gladiator_a_id && a.id !== session?.gladiator_b_id)
                                                        .sort((a, b) => a.name.localeCompare(b.name))
                                                        .map(a => (
                                                            <option key={a.id} value={a.id}>{a.name} ({a.rank})</option>
                                                        ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {session?.gladiator_a_id && session?.gladiator_b_id && (
                            <button
                                onClick={() => broadcastAction('TRIGGER_VS_ANIMATION')}
                                className="w-full mt-4 py-3 bg-[#ffb700] text-[#001f3f] rounded-xl font-black uppercase tracking-widest text-[10px] shadow-[0_0_15px_rgba(255,183,0,0.3)] hover:bg-[#ffb700]/90 transition-all flex justify-center items-center gap-2"
                            >
                                <Zap size={16} /> Lanza Animación VS
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                {/* Marcadores */}
                <div className="grid grid-cols-2 gap-4">
                    <div className={`p-4 bg-blue-600/10 border rounded-2xl text-center ${session?.last_coin_flip === 'ALFA' ? 'border-blue-500 bg-blue-500/30 shadow-lg shadow-blue-500/20' : 'border-blue-500/20'}`}>
                        <p className="text-[10px] text-blue-400 font-black uppercase">ALFA</p>
                        <p className="text-3xl font-bebas">{session?.score_a || 0}</p>
                    </div>
                    <div className={`p-4 bg-teal-600/10 border rounded-2xl text-center ${session?.last_coin_flip === 'BRAVO' ? 'border-teal-500 bg-teal-500/30 shadow-lg shadow-teal-500/20' : 'border-teal-500/20'}`}>
                        <p className="text-[10px] text-teal-400 font-black uppercase">BRAVO</p>
                        <p className="text-3xl font-bebas">{session?.score_b || 0}</p>
                    </div>
                </div>

                {/* Sorteo y Timer */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2"><p className="text-[8px] font-black text-gray-500 uppercase">TIEMPO</p><div className="flex gap-2"><button onClick={() => handleStartTimer(15)} className="flex-1 py-1 bg-white/5 rounded text-[8px] font-black border border-white/10">15s</button><button onClick={() => handleStartTimer(30)} className="flex-1 py-1 bg-white/5 rounded text-[8px] font-black border border-white/10">30s</button></div></div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2"><div className="flex justify-between"><p className="text-[8px] font-black text-gray-500 uppercase">TURNO</p><button onClick={handleCoinFlip} className="bg-[#ffb700] text-[#001f3f] px-2 py-0.5 rounded text-[7px] font-black">SORTEO</button></div><div className="text-center font-bebas text-[#ffb700] py-1 border border-[#ffb700]/20 rounded bg-[#ffb700]/5">{session?.last_coin_flip || '---'}</div></div>
                </div>

                {/* Premio (Stakes) */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                    <div className="flex justify-between items-center"><label className="text-[10px] font-black uppercase text-white/40">Premio de la Ronda</label><span className="text-[#ffb700] font-black text-[10px]">{session?.stakes_xp || 100} XP</span></div>
                    <div className="flex gap-2">
                        {[2, 5, 15].map(v => (
                            <button key={v} onClick={() => handleUpdateStakes(v)} className={`flex-1 py-3 border rounded-xl text-[10px] font-black ${session?.stakes_xp === v ? 'bg-[#ffb700] border-[#ffb700] text-[#001f3f]' : 'bg-white/5 border-white/10'}`}>
                                {v} {v === 2 ? 'FÁCIL' : v === 5 ? 'MEDIO' : 'DIFÍCIL'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Buscador y Preguntas */}
                <div className="space-y-4">
                    <div className="relative hover:scale-[1.01] transition-transform">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} type="text" placeholder="BUSCAR PREGUNTA O CATEGORÍA..." className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 text-[10px] font-black tracking-widest outline-none focus:border-[#ffb700]" />
                    </div>
                    <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto pr-2">
                        {filteredQuestions.map(q => {
                            const isUsed = session?.used_questions?.includes(q.id);
                            const isActive = session?.current_question_id === q.id;
                            return (
                                <button key={q.id} onClick={() => handleLaunchQuestion(q)} className={`p-4 border rounded-2xl text-left flex justify-between items-center group transition-all ${isActive ? 'bg-[#ffb700]/10 border-[#ffb700]' : isUsed ? 'opacity-30 grayscale' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                                    <div className="space-y-1">
                                        <div className="flex gap-2 items-center"><span className="text-[7px] font-black px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">{q.category}</span><span className={`text-[7px] font-black px-1.5 py-0.5 rounded ${q.difficulty === 'HARD' ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>{q.difficulty}</span>{isUsed && <span className="text-[6px] font-black bg-gray-600 px-1 rounded">USADA</span>}</div>
                                        <p className="text-[10px] font-bold text-white line-clamp-2">{q.question}</p>
                                    </div>
                                    <Send size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'text-[#ffb700]' : 'text-white'}`} />
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Control de Resolución */}
                {session?.current_question_id && (
                    <div className="bg-black/60 border border-[#ffb700]/30 rounded-[2rem] p-6 space-y-6 animate-in slide-in-from-bottom-4">
                        <div className="text-center space-y-1">
                            <p className="text-[10px] font-black text-[#ffb700] uppercase tracking-widest">Pregunta Lanzada</p>
                            <h3 className="text-sm font-bold italic opacity-90 line-clamp-2">"{questions.find(q => q.id === session.current_question_id)?.question}"</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {['A', 'B'].map(t => {
                                const ans = t === 'A' ? session.answer_a : session.answer_b;
                                return (
                                    <div key={t} className="p-3 bg-white/5 border border-white/10 rounded-xl text-center">
                                        <p className={`text-[8px] font-black uppercase ${t === 'A' ? 'text-blue-400' : 'text-teal-400'}`}>GRUPO {t === 'A' ? 'ALFA' : 'BRAVO'}</p>
                                        <p className={`text-[10px] font-black ${ans ? 'text-green-500' : 'text-white/20'}`}>{ans ? 'LISTO' : 'PENSANDO...'}</p>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="space-y-3">
                            <button onClick={handleAutoResolve} disabled={session.status === 'RESOLVED'} className="w-full py-5 bg-[#ffb700] text-[#001f3f] rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-[#ffb700]/20 active:scale-95 transition-all text-[12px] flex items-center justify-center gap-3 disabled:opacity-50">
                                <Trophy size={18} /> {session.status === 'RESOLVED' ? 'RESOLVIDA' : 'RESOLVER RESPUESTAS'}
                            </button>
                            <button onClick={async () => {
                                const n = !session.show_answer;
                                setSession(prev => prev ? { ...prev, show_answer: n } : null);
                                await updateBibleWarSession({ show_answer: n });
                                broadcastAction('SHOW_ANSWER', { show: n });
                            }} className="w-full py-2 text-[10px] font-black uppercase text-[#ffb700] border border-white/5 rounded-xl bg-white/5 flex items-center justify-center gap-2">
                                <Eye size={14} /> {session.show_answer ? 'OCULTAR RESPUESTA' : 'REVELAR RESPUESTA'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer de Emergencia */}
            <div className="p-6 bg-black/60 border-t border-white/10 space-y-4">
                <button onClick={handleSpinRoulette} className="w-full py-6 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl font-black uppercase tracking-[0.3em] font-bebas shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 border border-white/20">
                    <Dice5 size={24} className="animate-spin-slow" /> GIRAR RULETA
                </button>
                <div className="grid grid-cols-4 gap-2">
                    <button onClick={handleNukeReset} className="flex flex-col items-center justify-center gap-1 p-3 bg-red-600 border border-red-400 rounded-2xl text-[7px] font-black uppercase tracking-widest text-white shadow-lg active:scale-95 transition-all"><Skull size={14} /><span>NUKE</span></button>
                    <button onClick={handleResetScores} className="flex flex-col items-center justify-center gap-1 p-3 bg-orange-600 border border-orange-400 rounded-2xl text-[7px] font-black uppercase tracking-widest text-white shadow-lg active:scale-95 transition-all"><Trophy size={14} /><span>SCORE</span></button>
                    <button onClick={handleForceReload} className="flex flex-col items-center justify-center gap-1 p-3 bg-blue-600 border border-blue-400 rounded-2xl text-[7px] font-black uppercase tracking-widest text-white shadow-lg active:scale-95 transition-all"><RefreshCw size={14} /><span>SYNC</span></button>
                    <button onClick={loadSession} className="flex flex-col items-center justify-center gap-1 p-3 bg-white/10 border border-white/20 rounded-2xl text-[7px] font-black uppercase tracking-widest text-white shadow-lg active:scale-95 transition-all"><Zap size={14} /><span>RELOAD</span></button>
                </div>
            </div>
        </div>
    );
};

export default BibleWarDirector;
