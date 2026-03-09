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
            {/* HEADER TÁCTICO - ULTRA COMPACTO */}
            <div className="p-3 border-b border-white/5 flex justify-between items-center bg-black/60 backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500/20 rounded-lg border border-blue-500/30">
                        <Brain className="text-blue-400" size={16} />
                    </div>
                    <div>
                        <h1 className="text-base font-bebas tracking-widest leading-none">PROYECTO NEHEMÍAS</h1>
                        <p className="text-[6px] text-blue-400 font-black uppercase tracking-[0.2em] mt-0.5">Nivel IQ: {currentIqLevel}</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-full transition-colors">
                    <X size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
                <AnimatePresence mode="wait">
                    {showIntro && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            className="fixed inset-0 z-[60] bg-[#000814]/90 backdrop-blur-xl flex items-center justify-center p-4"
                        >
                            <div className="bg-gradient-to-br from-[#001d3d] to-black border border-blue-500/20 p-5 rounded-[1.5rem] max-w-sm w-full space-y-3 text-center shadow-2xl">
                                <div className="w-10 h-10 bg-blue-500/20 rounded-xl mx-auto flex items-center justify-center border border-blue-500/30">
                                    <Brain className="text-blue-400" size={20} />
                                </div>
                                <div className="space-y-0.5">
                                    <h2 className="text-lg font-bebas tracking-widest text-white uppercase">REGLAS DE OPERACIÓN</h2>
                                    <p className="text-[7px] text-blue-300 font-black uppercase tracking-widest">Protocolo Consagrados</p>
                                </div>
                                <div className="space-y-2 text-left">
                                    <div className="flex gap-2.5">
                                        <div className="h-4 w-4 rounded-full bg-blue-500/20 flex items-center justify-center text-[7px] font-black text-blue-400 border border-blue-500/30 flex-shrink-0">1</div>
                                        <p className="text-[8px] text-white/60 leading-tight"><span className="text-white font-bold">DESCIFRA EL PATRÓN:</span> Analiza la secuencia y selecciona la opción correcta.</p>
                                    </div>
                                    <div className="flex gap-2.5">
                                        <div className="h-4 w-4 rounded-full bg-blue-500/20 flex items-center justify-center text-[7px] font-black text-blue-400 border border-blue-500/30 flex-shrink-0">2</div>
                                        <p className="text-[8px] text-white/60 leading-tight"><span className="text-white font-bold">CLAVE BÍBLICA:</span> Desbloquea pistas leyendo el versículo táctico.</p>
                                    </div>
                                    <div className="flex gap-2.5">
                                        <div className="h-4 w-4 rounded-full bg-blue-500/20 flex items-center justify-center text-[7px] font-black text-blue-400 border border-blue-500/30 flex-shrink-0">3</div>
                                        <p className="text-[8px] text-white/60 leading-tight"><span className="text-white font-bold">GANANCIA XP:</span> Recompensas escaladas por cada nivel superado.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        localStorage.setItem('hide_iq_intro', 'true');
                                        setShowIntro(false);
                                    }}
                                    className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bebas tracking-widest hover:bg-blue-500 transition-all active:scale-95 text-sm"
                                >
                                    INICIAR PROTOCOLO
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {gameState === 'MAP' && (
                        <motion.div
                            key="map"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 pb-32"
                        >
                            {LEVELS.map((lvl) => {
                                const isLocked = lvl.level > currentIqLevel;
                                const isCompleted = lvl.level < currentIqLevel;

                                return (
                                    <button
                                        key={lvl.level}
                                        disabled={isLocked}
                                        onClick={() => handleLevelSelect(lvl.level)}
                                        className={`aspect-square rounded-lg border flex flex-col items-center justify-center transition-all relative group overflow-hidden ${isLocked
                                            ? 'bg-white/5 border-white/5 text-white/10 grayscale'
                                            : isCompleted
                                                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                                : 'bg-blue-600/20 border-blue-500/40 text-white shadow-lg animate-pulse'
                                            }`}
                                    >
                                        {isLocked && <Lock size={8} className="mb-0.5" />}
                                        {isCompleted && <CheckCircle2 size={8} className="mb-0.5" />}
                                        <span className="text-[10px] font-bebas font-bold">{lvl.level}</span>
                                    </button>
                                );
                            })}
                        </motion.div>
                    )}

                    {gameState === 'PLAYING' && selectedLevel && (
                        <motion.div
                            key="playing"
                            initial={{ opacity: 0, scale: 1.05 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="max-w-md mx-auto h-full flex flex-col gap-3 justify-center pb-20"
                        >
                            <div className="bg-black/60 border border-blue-500/10 p-3 rounded-lg text-center space-y-1.5 shadow-xl">
                                <span className="px-2 py-0.5 bg-blue-500/20 rounded-full text-[6px] font-black text-blue-400 tracking-[0.2em] uppercase border border-blue-500/20">
                                    Nivel {selectedLevel}
                                </span>
                                <h2 className="text-[11px] font-bold leading-relaxed text-white/90 px-2">
                                    {LEVELS[selectedLevel - 1].question}
                                </h2>
                            </div>

                            {/* PUZZLE AREA - REDUCED SIZE */}
                            <div className="aspect-square bg-white/[0.02] rounded-xl border border-white/5 p-3 flex items-center justify-center relative overflow-hidden shadow-inner max-w-[280px] mx-auto w-full">
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5" />
                                <div className="grid grid-cols-2 gap-2 w-full">
                                    {LEVELS[selectedLevel - 1].options?.map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => setAnswerInput(opt)}
                                            className={`aspect-square rounded-lg border transition-all font-bebas text-xl flex items-center justify-center ${answerInput === opt
                                                ? 'bg-blue-600 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.4)] scale-95'
                                                : 'bg-white/5 border-white/10 active:scale-95'
                                                }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* HINTS SYSTEM - COMPACT */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowBibleClue(true)}
                                    className="flex-1 py-2 bg-[#FFB700]/5 border border-[#FFB700]/20 rounded-lg flex items-center justify-center gap-1.5 text-[#FFB700] text-[8px] font-black tracking-widest uppercase font-bebas active:scale-95 transition-all"
                                >
                                    <BookOpen size={12} /> BÍBLICA
                                </button>
                                <button
                                    onClick={() => setShowHint(true)}
                                    disabled={!showBibleClue}
                                    className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 text-[8px] font-black tracking-widest uppercase font-bebas transition-all active:scale-95 ${showBibleClue
                                        ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                                        : 'bg-white/5 border border-white/5 text-white/10 cursor-not-allowed'
                                        }`}
                                >
                                    <Lightbulb size={12} /> PISTA IQ
                                </button>
                            </div>

                            {showBibleClue && (
                                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-blue-900/20 p-2 rounded-lg border border-blue-500/10 text-center">
                                    <p className="text-[9px] italic text-blue-200/80 leading-tight mb-0.5">"{LEVELS[selectedLevel - 1].bibleClue.verse}"</p>
                                    <p className="text-[7px] font-black text-blue-400 uppercase tracking-widest">{LEVELS[selectedLevel - 1].bibleClue.reference}</p>
                                </motion.div>
                            )}

                            {showHint && showBibleClue && (
                                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-green-500/5 p-2 rounded-lg border border-green-500/10 text-center">
                                    <p className="text-[9px] text-green-400/90 font-bold">💡 {LEVELS[selectedLevel - 1].hint}</p>
                                </motion.div>
                            )}

                            <button
                                onClick={handleSolve}
                                disabled={!answerInput || isSubmitting}
                                className="w-full py-3 bg-blue-600 text-white rounded-lg font-bebas text-base tracking-[0.15em] font-black hover:bg-blue-500 transition-all active:scale-95 shadow-lg disabled:opacity-50"
                            >
                                {isSubmitting ? 'PROCESANDO...' : 'ENVIAR SECUENCIA'}
                            </button>
                        </motion.div>
                    )}

                    {gameState === 'RESOLVING' && (
                        <motion.div
                            key="resolving"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="h-full flex flex-col items-center justify-center text-center gap-3 py-6"
                        >
                            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                                <Trophy size={24} className="text-green-500" />
                            </div>
                            <div className="space-y-0.5">
                                <h2 className="text-xl font-bebas tracking-widest text-[#FFB700]">COMPLETADO</h2>
                                <p className="text-[8px] text-gray-400 uppercase font-black tracking-widest">Protocolo Descifrado</p>
                            </div>
                            <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5 w-full max-w-[180px]">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-[7px] text-gray-500 font-black tracking-widest">XP GANADOS</span>
                                    <span className="text-xs font-bebas text-green-400">+{Math.floor(((selectedLevel || 1) - 1) / 10) + 1} XP</span>
                                </div>
                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
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
                                className="px-5 py-2.5 bg-blue-600 rounded-lg font-bebas tracking-widest hover:bg-blue-500 transition-all active:scale-95 text-xs"
                            >
                                VOLVER AL MAPA
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* HUD DE PROGRESO INFERIOR - ULTRA COMPACTO */}
            <div className="p-2.5 bg-black/90 backdrop-blur-xl border-t border-white/5 flex justify-center gap-6 shadow-2xl">
                <div className="text-center">
                    <p className="text-[5px] text-gray-500 uppercase font-black mb-0.5 tracking-widest">PROGRESO</p>
                    <p className="text-[10px] font-bebas tracking-widest text-[#FFB700]">{Math.floor((currentIqLevel / 100) * 100)}%</p>
                </div>
                <div className="text-center">
                    <p className="text-[5px] text-gray-500 uppercase font-black mb-0.5 tracking-widest">NIVEL</p>
                    <p className="text-[10px] font-bebas tracking-widest">{currentIqLevel}/100</p>
                </div>
            </div>
        </div>
    );
};

export default TacticalIQ;
