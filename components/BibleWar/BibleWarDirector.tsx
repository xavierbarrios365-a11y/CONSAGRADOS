import React, { useState, useEffect } from 'react';
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
    Eye
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { updateBibleWarSession, transferBibleWarXP, fetchBibleWarSession, fetchBibleWarGroups, assignAgentToBibleWarGroup, fetchAgentsFromSupabase, fetchBibleWarQuestions, clearBibleWarQuestions, importBibleWarQuestions } from '../../services/supabaseService';
import { BibleWarSession, Agent } from '../../types';
// import questionsData from '../../bible_war_bank.json'; // Ya no usaremos el local

interface BibleWarDirectorProps {
    onClose?: () => void;
}

const BibleWarDirector: React.FC<BibleWarDirectorProps> = ({ onClose }) => {
    const [session, setSession] = useState<BibleWarSession | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [customStakes, setCustomStakes] = useState(100);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [groups, setGroups] = useState<{ agent_id: string, team: 'A' | 'B' }[]>([]);
    const [showGroupManager, setShowGroupManager] = useState(false);
    const [broadcastChannel, setBroadcastChannel] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [showQuestionImporter, setShowQuestionImporter] = useState(false);
    const [importJson, setImportJson] = useState('');

    useEffect(() => {
        loadSession();

        // 1. Canal de base de datos
        const dbChannel = supabase
            .channel('bible_war_director_db')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bible_war_sessions' }, (payload) => {
                setSession(payload.new as BibleWarSession);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bible_war_groups' }, () => {
                loadGroups(); // Recargar grupos si cambian fuera
            })
            .subscribe();

        // 2. Canal de Broadcast (Persistente para evitar recrearlo)
        const bcChannel = supabase.channel('bible_war_sync').subscribe();
        setBroadcastChannel(bcChannel);

        return () => {
            supabase.removeChannel(dbChannel);
            supabase.removeChannel(bcChannel);
        };
    }, []);

    const loadSession = async () => {
        const [sessionData, agentsData, bibleQuestions] = await Promise.all([
            fetchBibleWarSession(),
            fetchAgentsFromSupabase(),
            fetchBibleWarQuestions()
        ]);
        setSession(sessionData);
        setAgents(agentsData);
        setQuestions(bibleQuestions);
        await loadGroups();
        setLoading(false);
    };

    const loadGroups = async () => {
        const groupsData = await fetchBibleWarGroups();
        setGroups(groupsData);
    };

    const broadcastAction = (type: string, payload: any = {}) => {
        if (broadcastChannel) {
            broadcastChannel.send({
                type: 'broadcast',
                event: 'bible_war_action',
                payload: { type, ...payload }
            });
        }
    };

    const handleLaunchQuestion = async (q: any) => {
        const updates = {
            current_question_id: q.id,
            status: 'ACTIVE' as const,
            show_answer: false,
            active_team: null,
            timer_status: 'STOPPED' as const,
            timer_end_at: null,
            answer_a: null,
            answer_b: null
        };
        // Actualización optimista
        setSession(prev => prev ? { ...prev, ...updates } : null);
        setSelectedQuestion(q);

        const res = await updateBibleWarSession(updates);
        if (res.success) {
            broadcastAction('LAUNCH_QUESTION', { question: q });
        } else {
            alert("Error al lanzar pregunta. Verifica la consola.");
            loadSession(); // Rollback
        }
    };

    const handleSpinRoulette = async () => {
        const categories = [...new Set(questions.map(q => q.category))];
        if (categories.length === 0) return alert("No hay preguntas cargadas en el banco.");

        const randomCat = categories[Math.floor(Math.random() * categories.length)];
        const updates = {
            roulette_category: randomCat,
            status: 'SPINNING' as const
        };
        // Optimista
        setSession(prev => prev ? { ...prev, ...updates } : null);
        setSearchTerm(randomCat); // Auto-filtrar por categoría

        const res = await updateBibleWarSession(updates);
        if (res.success) {
            broadcastAction('SPIN_ROULETTE', { category: randomCat });
        } else {
            loadSession();
        }
    };

    const handleAutoResolve = async () => {
        if (!session?.current_question_id) return;
        const q = questions.find(qu => qu.id === session.current_question_id);
        if (!q) return;

        const ansA = session.answer_a;
        const ansB = session.answer_b;

        const isACorrect = ansA === q.correctAnswer || ansA === q.correct_answer;
        const isBCorrect = ansB === q.correctAnswer || ansB === q.correct_answer;

        let winner: 'A' | 'B' | 'NONE' | 'TIE' = 'NONE';

        if (isACorrect && !isBCorrect) winner = 'A';
        else if (isBCorrect && !isACorrect) winner = 'B';
        else winner = 'TIE'; // Empate (ambos bien o ambos mal) suma al pozo

        const stakes = session?.stakes_xp || customStakes;
        await transferBibleWarXP(winner, stakes);
        broadcastAction('RESOLVE', { winner });

        setTimeout(loadSession, 1000);
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

    const handleAssignGroup = async (agentId: string, team: 'A' | 'B' | null) => {
        // Actualización optimista local
        const prevGroups = [...groups];
        if (!team) {
            setGroups(groups.filter(g => g.agent_id !== agentId));
        } else {
            setGroups(prev => [...prev.filter(g => g.agent_id !== agentId), { agent_id: agentId, team }]);
        }

        const res = await assignAgentToBibleWarGroup(agentId, team);
        if (!res.success) {
            alert("Error: Asegúrate de ejecutar el SQL de grupos.");
            setGroups(prevGroups); // Rollback
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
            stakes_xp: 100,
            timer_status: 'STOPPED' as const,
            timer_end_at: null,
            answer_a: null,
            answer_b: null,
            accumulated_pot: 0
        };
        setSession(prev => prev ? { ...prev, ...updates } : null);
        setSelectedQuestion(null);

        const res = await updateBibleWarSession(updates);
        if (res.success) {
            broadcastAction('RESET');
            console.log("✅ Reinicio de sesión exitoso");
        } else {
            alert(`❌ Error al reiniciar sesión: ${res.error}\n\nAsegúrate de haber ejecutado el SQL v6.1.`);
        }
    };

    const handleStartTimer = async (seconds: number) => {
        const endAt = new Date(Date.now() + seconds * 1000).toISOString();
        const updates = {
            timer_end_at: endAt,
            timer_status: 'RUNNING' as const
        };
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
        if (res.success) {
            broadcastAction('COIN_FLIP', { winner });
        }
    };



    const handleImportQuestions = async () => {
        console.log("🚀 Iniciando importación de preguntas...");
        try {
            if (!importJson.trim()) {
                alert("⚠️ El campo de texto está vacío.");
                return;
            }

            const data = JSON.parse(importJson);
            console.log("📦 JSON parseado correctamente:", data);

            if (!Array.isArray(data)) throw new Error("El JSON debe ser un array de preguntas.");

            const res = await importBibleWarQuestions(data);
            if (res.success) {
                console.log("✅ Importación exitosa");
                alert("✅ Preguntas importadas con éxito.");
                setImportJson('');
                setShowQuestionImporter(false);
                loadSession();
            } else {
                console.error("❌ Error en importBibleWarQuestions:", res.error);
                alert(`❌ Error al importar: ${res.error}\n\nNota: Asegúrate de haber ejecutado el SQL v6 en Supabase.`);
            }
        } catch (e: any) {
            console.error("⚠️ Error atrapado en handleImportQuestions:", e.message);
            alert(`⚠️ Error: ${e.message}`);
        }
    };

    const handleClearQuestions = async () => {
        if (!window.confirm("¿Seguro que quieres BORRAR TODO el banco de preguntas actual?")) return;
        const res = await clearBibleWarQuestions();
        if (res.success) {
            alert("✅ Banco de preguntas vaciado.");
            loadSession();
        }
    };

    const filteredQuestions = questions.filter(q =>
        q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-10 text-center text-white/50">CONECTANDO A LA ARENA...</div>;

    return (
        <div className="flex flex-col h-full bg-[#001f3f] text-white font-montserrat">
            {/* Header Director */}
            <div className="p-6 bg-black/20 border-b border-white/10 flex items-center justify-between">
                <div>
                    <h2 className="text-lg md:text-xl font-bebas tracking-widest uppercase">Panel de Comando: Guerra Bíblica</h2>
                    <p className="text-[8px] text-[#ffb700] font-black uppercase tracking-widest opacity-60">Controlador de Eventos Real-time</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowQuestionImporter(!showQuestionImporter)}
                        className={`flex items-center gap-2 px-2 md:px-4 py-2 rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all ${showQuestionImporter ? 'bg-purple-600 text-white' : 'bg-white/5 border border-white/10'}`}
                    >
                        <Plus size={14} /> <span className="hidden xs:inline">Banco JSON</span><span className="xs:hidden">JSON</span>
                    </button>
                    <button
                        onClick={() => setShowGroupManager(!showGroupManager)}
                        className={`flex items-center gap-2 px-2 md:px-4 py-2 rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all ${showGroupManager ? 'bg-[#ffb700] text-[#001f3f]' : 'bg-white/5 border border-white/10'}`}
                    >
                        <Users size={14} /> <span className="hidden xs:inline">Grupos</span><span className="xs:hidden">GPS</span>
                    </button>
                    <button
                        onClick={() => window.open('?view=bible_war_display', '_blank')}
                        className="flex items-center gap-2 px-2 md:px-4 py-2 bg-blue-600 rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/40"
                    >
                        <Eye size={14} /> <span className="hidden xs:inline">Lanzar Arena</span><span className="xs:hidden">ARENA</span>
                    </button>
                    <button onClick={handleReset} className="p-2 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 hover:bg-red-500/20 transition-all">
                        <RotateCcw size={16} />
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {showQuestionImporter && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-purple-900/20 border-b border-purple-500/30 overflow-hidden"
                    >
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-purple-400">Importador de Preguntas JSON</h3>
                                <button onClick={handleClearQuestions} className="text-[8px] bg-red-500/20 text-red-400 px-3 py-1 rounded-lg border border-red-500/30 hover:bg-red-500/40 transition-all font-black uppercase">Vaciar Banco Actual</button>
                            </div>
                            <textarea
                                value={importJson}
                                onChange={(e) => setImportJson(e.target.value)}
                                placeholder='Pega aquí tu JSON (ej: [{"id": "q1", "category": "PENTATEUCO", ...}])'
                                className="w-full h-32 bg-black/40 border border-purple-500/30 rounded-xl p-4 text-[10px] font-mono outline-none focus:border-purple-500 transition-all resize-none"
                            />
                            <button
                                onClick={handleImportQuestions}
                                disabled={!importJson}
                                className="w-full py-3 bg-purple-600 rounded-xl text-white font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all disabled:opacity-30"
                            >
                                Procesar e Importar Preguntas
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showGroupManager && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-black/30 border-b border-white/10 overflow-hidden"
                    >
                        <div className="p-6 space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#ffb700]">Gestión de Escuadras (Alfa vs Bravo)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Grupo Alfa */}
                                <div className="space-y-3">
                                    <p className="text-[8px] font-black uppercase text-blue-400">Grupo Alfa</p>
                                    <div className="bg-white/5 rounded-xl p-2 min-h-[100px] space-y-1">
                                        {agents.filter(a => groups.find(g => g.agent_id === a.id && g.team === 'A')).map(a => (
                                            <div key={a.id} className="flex items-center justify-between p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                                <span className="text-[8px] font-bold uppercase">{a.name}</span>
                                                <button onClick={() => handleAssignGroup(a.id, null)} className="text-white/40 hover:text-red-500"><Minus size={12} /></button>
                                            </div>
                                        ))}
                                        <select
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    handleAssignGroup(e.target.value, 'A');
                                                    e.target.value = '';
                                                }
                                            }}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-[8px] font-bold uppercase outline-none"
                                        >
                                            <option value="">+ AÑADIR ALFA</option>
                                            {agents.filter(a => !groups.find(g => g.agent_id === a.id)).map(a => (
                                                <option key={a.id} value={a.id}>{a.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                {/* Grupo Bravo */}
                                <div className="space-y-3">
                                    <p className="text-[8px] font-black uppercase text-teal-400">Grupo Bravo</p>
                                    <div className="bg-white/5 rounded-xl p-2 min-h-[100px] space-y-1">
                                        {agents.filter(a => groups.find(g => g.agent_id === a.id && g.team === 'B')).map(a => (
                                            <div key={a.id} className="flex items-center justify-between p-2 bg-teal-500/10 rounded-lg border border-teal-500/20">
                                                <span className="text-[8px] font-bold uppercase">{a.name}</span>
                                                <button onClick={() => handleAssignGroup(a.id, null)} className="text-white/40 hover:text-red-500"><Minus size={12} /></button>
                                            </div>
                                        ))}
                                        <select
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    handleAssignGroup(e.target.value, 'B');
                                                    e.target.value = '';
                                                }
                                            }}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-[8px] font-bold uppercase outline-none"
                                        >
                                            <option value="">+ AÑADIR BRAVO</option>
                                            {agents.filter(a => !groups.find(g => g.agent_id === a.id)).map(a => (
                                                <option key={a.id} value={a.id}>{a.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 md:y-8">
                {/* 1. Estatus Actual Display */}
                <div className="grid grid-cols-2 gap-4">
                    <div className={`p-4 bg-blue-600/10 border rounded-2xl text-center transition-all ${session?.last_coin_flip === 'ALFA' ? 'border-blue-500 bg-blue-500/30 shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'border-blue-500/30'}`}>
                        <p className="text-[10px] text-blue-400 font-black uppercase mb-1">Grupo Alfa</p>
                        <p className="text-3xl font-bebas">{session?.score_a || 0}</p>
                    </div>
                    <div className={`p-4 bg-teal-600/10 border rounded-2xl text-center transition-all ${session?.last_coin_flip === 'BRAVO' ? 'border-teal-500 bg-teal-500/30 shadow-[0_0_20px_rgba(20,184,166,0.3)]' : 'border-teal-500/30'}`}>
                        <p className="text-[10px] text-teal-400 font-black uppercase mb-1">Grupo Bravo</p>
                        <p className="text-3xl font-bebas">{session?.score_b || 0}</p>
                    </div>
                </div>

                {/* 1.5. Control de Moneda y Temporizador */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                        <p className="text-[8px] font-black uppercase text-gray-400">Temporizador de Ronda</p>
                        <div className="flex gap-2">
                            <button onClick={() => handleStartTimer(15)} className="flex-1 py-2 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black hover:bg-white/10 transition-all">Lector (15s)</button>
                            <button onClick={() => handleStartTimer(30)} className="flex-1 py-2 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black hover:bg-white/10 transition-all">Respuesta (30s)</button>
                        </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[8px] font-black uppercase text-gray-400">Sorteo de Turno</p>
                            <button
                                onClick={handleCoinFlip}
                                className="p-1 px-2 bg-[#ffb700] text-[#001f3f] rounded text-[7px] font-bold uppercase hover:scale-105 transition-transform"
                            >
                                Lanzar Moneda
                            </button>
                        </div>
                        <div className="w-full py-2 bg-white/5 border border-white/10 rounded-lg text-lg font-bebas text-white flex items-center justify-center gap-2">
                            {session?.last_coin_flip ? (
                                <motion.span initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-2 text-[#ffb700]">
                                    <Zap size={14} /> TURNO: {session.last_coin_flip}
                                </motion.span>
                            ) : (
                                <span className="text-white/20">SIN SORTEAR</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Control de Stakes */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Zap size={16} className="text-[#ffb700]" />
                            <span className="text-[10px] font-black uppercase tracking-widest">XP en Juego (Stakes)</span>
                        </div>
                        <span className="text-xl font-bebas text-[#ffb700]">{session?.stakes_xp || 100} XP</span>
                    </div>
                    <div className="flex gap-2">
                        {[50, 100, 250, 500].map(val => (
                            <button
                                key={val}
                                onClick={() => handleUpdateStakes(val)}
                                className={`flex-1 py-3 rounded-xl border text-[10px] font-black tracking-widest transition-all ${session?.stakes_xp === val ? 'bg-[#ffb700] text-[#001f3f] border-[#ffb700]' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                            >
                                {val}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3. Selector de Preguntas */}
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                        <input
                            type="text"
                            placeholder="BUSCAR PREGUNTA O CATEGORÍA..."
                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-[10px] font-black uppercase tracking-widest outline-none focus:border-[#ffb700] transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-3 max-h-64 md:max-h-96 overflow-y-auto pr-2">
                        {filteredQuestions.map(q => (
                            <button
                                key={q.id}
                                onClick={() => handleLaunchQuestion(q)}
                                className={`p-4 rounded-2xl border transition-all text-left flex justify-between items-center group ${session?.current_question_id === q.id ? 'bg-[#ffb700]/10 border-[#ffb700]' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[7px] font-black px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded uppercase">{q.category}</span>
                                        <span className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase ${q.difficulty === 'HARD' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>{q.difficulty}</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-white leading-tight pr-4">{q.question}</p>
                                </div>
                                <div className="p-2 bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Send size={14} className="text-[#ffb700]" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 4. Controles de Resolución (Solo si hay pregunta activa) */}
                {session?.current_question_id && (
                    <div className="bg-black/60 border border-[#ffb700]/30 rounded-3xl md:rounded-[2.5rem] p-4 md:p-8 space-y-4 md:space-y-6 animate-in slide-in-from-bottom-4">
                        <div className="text-center space-y-2">
                            <p className="text-[10px] text-[#ffb700] font-black uppercase tracking-widest">En Pantalla:</p>
                            <h3 className="text-lg font-bold italic line-clamp-2">"{questions.find(q => q.id === session.current_question_id)?.question}"</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center">
                                <span className="text-[10px] uppercase font-black text-blue-400 block mb-1">Alfa</span>
                                <span className={`text-xs font-bold ${session.answer_a ? 'text-green-400' : 'text-gray-500'}`}>{session.answer_a ? 'LISTO' : 'PENSANDO...'}</span>
                            </div>
                            <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center">
                                <span className="text-[10px] uppercase font-black text-teal-400 block mb-1">Bravo</span>
                                <span className={`text-xs font-bold ${session.answer_b ? 'text-green-400' : 'text-gray-500'}`}>{session.answer_b ? 'LISTO' : 'PENSANDO...'}</span>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                onClick={handleAutoResolve}
                                disabled={session.status === 'RESOLVED'}
                                className="w-full py-5 bg-[#ffb700] rounded-3xl text-[#001f3f] font-black uppercase text-[12px] tracking-widest shadow-lg shadow-[#ffb700]/40 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                <Trophy size={18} /> {session.status === 'RESOLVED' ? 'RONDA RESOLVIDA' : 'RESOLVER RESPUESTAS'}
                            </button>
                        </div>

                        <button
                            onClick={async () => {
                                const newShow = !session.show_answer;
                                setSession(prev => prev ? { ...prev, show_answer: newShow } : null);
                                await updateBibleWarSession({ show_answer: newShow });
                                broadcastAction('SHOW_ANSWER', { show: newShow });
                            }}
                            className="w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#ffb700] hover:text-white transition-colors py-2 border border-white/5 rounded-xl bg-white/5"
                        >
                            <Eye size={14} /> {session.show_answer ? 'Ocultar Respuesta en Arena' : 'Revelar Respuesta en Arena'}
                        </button>
                    </div>
                )}
            </div>

            {/* Footer / Acciones Globales */}
            <div className="p-6 bg-black/40 border-t border-white/5">
                <button
                    onClick={handleSpinRoulette}
                    className="w-full py-6 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl text-white font-black uppercase text-[14px] tracking-[0.3em] font-bebas shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4"
                >
                    <Dice5 size={24} className="animate-bounce" /> Girar Ruleta de Categorías
                </button>
            </div>
        </div>
    );
};

export default BibleWarDirector;
