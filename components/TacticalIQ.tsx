import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Lock, CheckCircle2, Star, Zap, ChevronRight, BookOpen, Lightbulb, Clock, Trophy, RefreshCw, X } from 'lucide-react';
import { Agent, IQLevel } from '../types';
import { submitIQLevelComplete } from '../services/supabaseService';

interface TacticalIQProps {
    currentUser: Agent | null;
    onClose: () => void;
    onUpdateNeeded?: () => void;
}

// Generador de Niveles (Demo - Expandible)
const generateLevels = (count: number): IQLevel[] => {
    return Array.from({ length: count }, (_, i) => ({
        level: i + 1,
        question: `PROTOCOLO DE ENCRIPTACIÓN TÁCTICA ${i + 1}: Selecciona el patrón correcto para estabilizar el núcleo.`,
        answer: "A", // Demo simplificada
        options: ["A", "B", "C", "D"],
        hint: "El patrón sigue una secuencia binaria invertida.",
        bibleClue: {
            verse: "Todo lo puedo en Cristo que me fortalece.",
            reference: "Filipenses 4:13"
        }
    }));
};

const LEVELS = generateLevels(100);

export const TacticalIQ: React.FC<TacticalIQProps> = ({ currentUser, onClose, onUpdateNeeded }) => {
    const [currentIqLevel, setCurrentIqLevel] = useState(currentUser?.iqLevel || 1);
    const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
    const [gameState, setGameState] = useState<'MAP' | 'PLAYING' | 'RESOLVING'>('MAP');
    const [showHint, setShowHint] = useState(false);
    const [showBibleClue, setShowBibleClue] = useState(false);
    const [answerInput, setAnswerInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showIntro, setShowIntro] = useState(!localStorage.getItem('hide_iq_intro'));

    const handleLevelSelect = (level: number) => {
        if (level <= currentIqLevel) {
            setSelectedLevel(level);
            setGameState('PLAYING');
            setAnswerInput('');
            setShowHint(false);
            setShowBibleClue(false);
        }
    };

    const handleSolve = async () => {
        if (!currentUser || !selectedLevel) return;

        setIsSubmitting(true);
        // Simulación de resolución (A es siempre correcta en demo)
        if (answerInput.toUpperCase() === 'A') {
            const res = await submitIQLevelComplete(currentUser.id, selectedLevel);
            if (res.success) {
                if (selectedLevel === currentIqLevel) {
                    setCurrentIqLevel(prev => prev + 1);
                }
                setGameState('RESOLVING');
                if (onUpdateNeeded) onUpdateNeeded();
            }
        } else {
            alert("❌ SECUENCIA INCORRECTA. NÚCLEO INESTABLE.");
        }
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#000814] text-white font-montserrat overflow-hidden flex flex-col">
            {/* HEADER TÁCTICO */}
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#001d3d]/50 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/40">
                        <Brain className="text-blue-400" size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bebas tracking-widest">PROYECTO NEHEMÍAS</h1>
                        <p className="text-[8px] text-blue-400 font-bold uppercase tracking-widest">Nivel IQ Táctico: {currentIqLevel}</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <X size={24} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <AnimatePresence mode="wait">
                    {showIntro && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            className="fixed inset-0 z-[60] bg-[#000814]/90 backdrop-blur-xl flex items-center justify-center p-6"
                        >
                            <div className="bg-gradient-to-br from-[#001d3d] to-black border border-blue-500/30 p-8 rounded-[3rem] max-w-sm w-full space-y-6 text-center shadow-[0_0_50px_rgba(59,130,246,0.2)]">
                                <div className="w-20 h-20 bg-blue-500/20 rounded-3xl mx-auto flex items-center justify-center border border-blue-500/40">
                                    <Brain className="text-blue-400" size={40} />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bebas tracking-widest text-white">INSTRUCCIONES DE OPERACIÓN</h2>
                                    <p className="text-[10px] text-blue-300 font-bold uppercase tracking-widest">Proyecto Nehemías - Reconocimiento de Patrones</p>
                                </div>
                                <div className="space-y-4 text-left">
                                    <div className="flex gap-4">
                                        <div className="h-6 w-6 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-black text-blue-400 border border-blue-500/30 flex-shrink-0">1</div>
                                        <p className="text-[10px] text-white/70 leading-relaxed"><span className="text-white font-bold">DESCIFRA EL PATRÓN:</span> Analiza la secuencia y selecciona la opción correcta para estabilizar el núcleo.</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="h-6 w-6 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-black text-blue-400 border border-blue-500/30 flex-shrink-0">2</div>
                                        <p className="text-[10px] text-white/70 leading-relaxed"><span className="text-white font-bold">SISTEMA DE PISTAS:</span> Si te bloqueas, utiliza la 'Clave Bíblica'. Al leer el versículo, desbloquearás una pista táctica.</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="h-6 w-6 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-black text-blue-400 border border-blue-500/30 flex-shrink-0">3</div>
                                        <p className="text-[10px] text-white/70 leading-relaxed"><span className="text-white font-bold">RECOMPENSA XP:</span> Ganarás XP por cada nivel. La dificultad y la recompensa aumentan cada 10 niveles.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        localStorage.setItem('hide_iq_intro', 'true');
                                        setShowIntro(false);
                                    }}
                                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bebas tracking-widest hover:bg-blue-500 transition-all shadow-lg active:scale-95"
                                >
                                    ENTENDIDO, INICIAR
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {gameState === 'MAP' && (
                        <motion.div
                            key="map"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="grid grid-cols-4 md:grid-cols-8 gap-4 pb-32"
                        >
                            {LEVELS.map((lvl) => {
                                const isLocked = lvl.level > currentIqLevel;
                                const isCompleted = lvl.level < currentIqLevel;

                                return (
                                    <button
                                        key={lvl.level}
                                        disabled={isLocked}
                                        onClick={() => handleLevelSelect(lvl.level)}
                                        className={`aspect-square rounded-2xl border flex flex-col items-center justify-center transition-all relative group overflow-hidden ${isLocked
                                            ? 'bg-white/5 border-white/5 text-white/20 grayscale'
                                            : isCompleted
                                                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                                                : 'bg-blue-600/20 border-blue-500/50 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)] animate-pulse'
                                            }`}
                                    >
                                        {isLocked && <Lock size={12} className="mb-1" />}
                                        {isCompleted && <CheckCircle2 size={12} className="mb-1" />}
                                        <span className="text-sm font-bebas font-bold">{lvl.level}</span>
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                );
                            })}
                        </motion.div>
                    )}

                    {gameState === 'PLAYING' && selectedLevel && (
                        <motion.div
                            key="playing"
                            initial={{ opacity: 0, scale: 1.1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="max-w-md mx-auto h-full flex flex-col gap-8 justify-center pb-20"
                        >
                            <div className="text-center space-y-4">
                                <span className="px-3 py-1 bg-blue-500/20 rounded-full border border-blue-500/30 text-[9px] sm:text-[10px] font-bold tracking-[0.3em] text-blue-400 uppercase">
                                    Nivel {selectedLevel}
                                </span>
                                <h2 className="text-base sm:text-lg font-bold leading-relaxed">{LEVELS[selectedLevel - 1].question}</h2>
                            </div>

                            {/* PUZZLE AREA (VISUAL DEMO) */}
                            <div className="aspect-square bg-white/5 rounded-3xl sm:rounded-[2.5rem] border border-white/10 p-4 sm:p-8 flex items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                                <div className="grid grid-cols-2 gap-2 sm:gap-4 w-full">
                                    {LEVELS[selectedLevel - 1].options?.map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => setAnswerInput(opt)}
                                            className={`py-4 sm:py-8 rounded-2xl sm:rounded-3xl border-2 transition-all font-bebas text-xl sm:text-2xl ${answerInput === opt
                                                ? 'bg-blue-500 border-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.5)]'
                                                : 'bg-white/5 border-white/10 hover:border-white/20'
                                                }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* HINTS SYSTEM */}
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowBibleClue(true)}
                                    className="flex-1 py-4 bg-[#FFB700]/10 border border-[#FFB700]/30 rounded-2xl flex items-center justify-center gap-2 text-[#FFB700] text-[10px] font-black tracking-widest uppercase font-bebas"
                                >
                                    <BookOpen size={16} /> CLAVE BÍBLICA
                                </button>
                                <button
                                    onClick={() => setShowHint(true)}
                                    disabled={!showBibleClue}
                                    className={`flex-1 py-4 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black tracking-widest uppercase font-bebas transition-all ${showBibleClue
                                        ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                                        : 'bg-white/5 border border-white/5 text-white/20 cursor-not-allowed'
                                        }`}
                                >
                                    <Lightbulb size={16} /> PISTA IQ
                                </button>
                            </div>

                            {showBibleClue && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-blue-900/40 p-4 rounded-2xl border border-blue-500/20 text-center">
                                    <p className="text-xs italic text-blue-200 mb-1">"{LEVELS[selectedLevel - 1].bibleClue.verse}"</p>
                                    <p className="text-[10px] font-bold text-blue-400">{LEVELS[selectedLevel - 1].bibleClue.reference}</p>
                                </motion.div>
                            )}

                            {showHint && showBibleClue && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-green-500/10 p-4 rounded-2xl border border-green-500/20 text-center">
                                    <p className="text-xs text-green-400">💡 {LEVELS[selectedLevel - 1].hint}</p>
                                </motion.div>
                            )}

                            <button
                                onClick={handleSolve}
                                disabled={!answerInput || isSubmitting}
                                className="w-full py-4 sm:py-5 bg-white text-[#000814] rounded-2xl font-bebas text-lg sm:text-xl tracking-[0.2em] font-black hover:bg-blue-400 transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? 'PROCESANDO...' : 'ENVIAR SECUENCIA'}
                            </button>
                        </motion.div>
                    )}

                    {gameState === 'RESOLVING' && (
                        <motion.div
                            key="resolving"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="h-full flex flex-col items-center justify-center text-center gap-6"
                        >
                            <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500 shadow-[0_0_50px_rgba(34,197,94,0.4)]">
                                <Trophy size={48} className="text-green-500" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-3xl font-bebas tracking-tighter">NIVEL COMPLETADO</h2>
                                <p className="text-sm text-gray-400">Has descifrado el protocolo con éxito.</p>
                            </div>
                            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 w-full max-w-xs">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-xs text-gray-500">RECOMPENSA</span>
                                    <span className="text-lg font-bebas text-green-400">+{Math.floor(((selectedLevel || 1) - 1) / 10) + 1} XP</span>
                                </div>
                                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: '100%' }}
                                        transition={{ duration: 1 }}
                                        className="h-full bg-green-500"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={() => setGameState('MAP')}
                                className="px-8 py-4 bg-blue-600 rounded-2xl font-bebas tracking-widest hover:bg-blue-500 transition-all"
                            >
                                CONTINUAR MAPA
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* HUD DE PROGRESO INFERIOR */}
            <div className="p-4 bg-black/80 backdrop-blur-md border-t border-white/5 flex justify-center gap-12">
                <div className="text-center">
                    <p className="text-[7px] text-gray-500 uppercase font-black mb-1">PROGRESO TOTAL</p>
                    <p className="text-sm font-bebas tracking-widest text-[#FFB700]">{Math.floor((currentIqLevel / 100) * 100)}%</p>
                </div>
                <div className="text-center">
                    <p className="text-[7px] text-gray-500 uppercase font-black mb-1">NIVEL ACTUAL</p>
                    <p className="text-sm font-bebas tracking-widest">{currentIqLevel}/100</p>
                </div>
            </div>
        </div>
    );
};

export default TacticalIQ;
