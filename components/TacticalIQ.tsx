import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Star, Zap, Trophy, HelpCircle, ChevronRight, X, BookOpen, Lightbulb, ChevronLeft, Lock, CheckCircle2 } from 'lucide-react';
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

const TacticalIQ: React.FC<TacticalIQProps> = ({ currentUser, onClose, onUpdateNeeded }) => {
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
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-500/40">
                        <Brain className="text-blue-400" size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bebas tracking-widest leading-none">PROYECTO NEHEMÍAS</h1>
                        <p className="text-[7px] text-blue-400 font-bold uppercase tracking-widest mt-1">Nivel IQ Táctico: {currentIqLevel}</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-full transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                <AnimatePresence mode="wait">
                    {showIntro && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            className="fixed inset-0 z-[60] bg-[#000814]/90 backdrop-blur-xl flex items-center justify-center p-6"
                        >
                            <div className="bg-gradient-to-br from-[#001d3d] to-black border border-blue-500/30 p-6 rounded-[2rem] max-w-sm w-full space-y-4 text-center shadow-[0_0_50px_rgba(59,130,246,0.2)]">
                                <div className="w-12 h-12 bg-blue-500/20 rounded-2xl mx-auto flex items-center justify-center border border-blue-500/40">
                                    <Brain className="text-blue-400" size={24} />
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-xl font-bebas tracking-widest text-white uppercase leading-tight">REGLAS DE OPERACIÓN</h2>
                                    <p className="text-[8px] text-blue-300 font-bold uppercase tracking-widest">Proyecto Nehemías</p>
                                </div>
                                <div className="space-y-3 text-left">
                                    <div className="flex gap-3">
                                        <div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[8px] font-black text-blue-400 border border-blue-500/30 flex-shrink-0">1</div>
                                        <p className="text-[9px] text-white/70 leading-relaxed"><span className="text-white font-bold">DESCIFRA EL PATRÓN:</span> Analiza la secuencia y selecciona la opción correcta.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[8px] font-black text-blue-400 border border-blue-500/30 flex-shrink-0">2</div>
                                        <p className="text-[9px] text-white/70 leading-relaxed"><span className="text-white font-bold">CLAVE BÍBLICA:</span> Si te bloqueas, lee el versículo para desbloquear una pista.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[8px] font-black text-blue-400 border border-blue-500/30 flex-shrink-0">3</div>
                                        <p className="text-[9px] text-white/70 leading-relaxed"><span className="text-white font-bold">RECOMPENSA XP:</span> Ganarás XP escalado según el nivel superado.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        localStorage.setItem('hide_iq_intro', 'true');
                                        setShowIntro(false);
                                    }}
                                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-bebas tracking-widest hover:bg-blue-500 transition-all active:scale-95 shadow-lg"
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
                            className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 pb-32"
                        >
                            {LEVELS.map((lvl) => {
                                const isLocked = lvl.level > currentIqLevel;
                                const isCompleted = lvl.level < currentIqLevel;

                                return (
                                    <button
                                        key={lvl.level}
                                        disabled={isLocked}
                                        onClick={() => handleLevelSelect(lvl.level)}
                                        className={`aspect-square rounded-xl border flex flex-col items-center justify-center transition-all relative group overflow-hidden ${isLocked
                                                ? 'bg-white/5 border-white/5 text-white/20 grayscale'
                                                : isCompleted
                                                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                                                    : 'bg-blue-600/20 border-blue-500/50 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)] animate-pulse'
                                            }`}
                                    >
                                        {isLocked && <Lock size={10} className="mb-0.5" />}
                                        {isCompleted && <CheckCircle2 size={10} className="mb-0.5" />}
                                        <span className="text-xs font-bebas font-bold">{lvl.level}</span>
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
                            className="max-w-md mx-auto h-full flex flex-col gap-4 justify-center pb-20"
                        >
                            <div className="bg-black/40 border border-blue-500/20 p-4 rounded-xl space-y-2 text-center shadow-lg">
                                <span className="px-2 py-0.5 bg-blue-500/20 rounded-full text-[7px] font-black text-blue-400 tracking-widest uppercase border border-blue-500/30">
                                    Nivel {selectedLevel}
                                </span>
                                <h2 className="text-sm font-bold leading-relaxed">
                                    {LEVELS[selectedLevel - 1].question}
                                </h2>
                            </div>

                            {/* PUZZLE AREA */}
                            <div className="aspect-square bg-white/5 rounded-2xl border border-white/10 p-4 flex items-center justify-center relative overflow-hidden shadow-inner">
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                                <div className="grid grid-cols-2 gap-3 w-full max-w-[280px]">
                                    {LEVELS[selectedLevel - 1].options?.map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => setAnswerInput(opt)}
                                            className={`aspect-square rounded-xl border-2 transition-all font-bebas text-2xl flex items-center justify-center ${answerInput === opt
                                                    ? 'bg-blue-600 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.5)] scale-95'
                                                    : 'bg-white/5 border-white/10 active:scale-95'
                                                }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* HINTS SYSTEM */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowBibleClue(true)}
                                    className="flex-1 py-3 bg-[#FFB700]/10 border border-[#FFB700]/30 rounded-xl flex items-center justify-center gap-2 text-[#FFB700] text-[9px] font-black tracking-widest uppercase font-bebas active:scale-95 transition-all"
                                >
                                    <BookOpen size={14} /> CLAVE BÍBLICA
                                </button>
                                <button
                                    onClick={() => setShowHint(true)}
                                    disabled={!showBibleClue}
                                    className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[9px] font-black tracking-widest uppercase font-bebas transition-all active:scale-95 ${showBibleClue
                                            ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                                            : 'bg-white/5 border border-white/5 text-white/20 cursor-not-allowed'
                                        }`}
                                >
                                    <Lightbulb size={14} /> PISTA IQ
                                </button>
                            </div>

                            {showBibleClue && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-blue-900/30 p-3 rounded-xl border border-blue-500/20 text-center">
                                    <p className="text-[10px] italic text-blue-200 mb-1 leading-tight">"{LEVELS[selectedLevel - 1].bibleClue.verse}"</p>
                                    <p className="text-[8px] font-bold text-blue-400 uppercase tracking-widest">{LEVELS[selectedLevel - 1].bibleClue.reference}</p>
                                </motion.div>
                            )}

                            {showHint && showBibleClue && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-green-500/10 p-3 rounded-xl border border-green-500/20 text-center">
                                    <p className="text-[10px] text-green-400 font-bold">💡 {LEVELS[selectedLevel - 1].hint}</p>
                                </motion.div>
                            )}

                            <button
                                onClick={handleSolve}
                                disabled={!answerInput || isSubmitting}
                                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bebas text-lg tracking-widest font-black hover:bg-blue-500 transition-all active:scale-95 shadow-lg disabled:opacity-50"
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
                            className="h-full flex flex-col items-center justify-center text-center gap-4 py-10"
                        >
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                                <Trophy size={32} className="text-green-500" />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-2xl font-bebas tracking-widest text-[#FFB700]">NIVEL COMPLETADO</h2>
                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Protocolo Descifrado con Éxito</p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 w-full max-w-[200px] shadow-lg">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[8px] text-gray-500 font-black tracking-widest">RECOMPENSA</span>
                                    <span className="text-sm font-bebas text-green-400">+{Math.floor(((selectedLevel || 1) - 1) / 10) + 1} XP</span>
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
                                className="px-6 py-3 bg-blue-600 rounded-xl font-bebas tracking-widest hover:bg-blue-500 transition-all active:scale-95 text-sm"
                            >
                                CONTINUAR MAPA
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* HUD DE PROGRESO INFERIOR */}
            <div className="p-3 bg-black/90 backdrop-blur-xl border-t border-white/5 flex justify-center gap-8 shadow-2xl">
                <div className="text-center">
                    <p className="text-[6px] text-gray-500 uppercase font-black mb-0.5 tracking-[0.2em]">PROGRESO TOTAL</p>
                    <p className="text-xs font-bebas tracking-widest text-[#FFB700]">{Math.floor((currentIqLevel / 100) * 100)}%</p>
                </div>
                <div className="text-center">
                    <p className="text-[6px] text-gray-500 uppercase font-black mb-0.5 tracking-[0.2em]">NIVEL ACTUAL</p>
                    <p className="text-xs font-bebas tracking-widest">{currentIqLevel}/100</p>
                </div>
            </div>
        </div>
    );
};

export default TacticalIQ;
