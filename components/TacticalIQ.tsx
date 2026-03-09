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
        try {
            // Simulación de resolución (A es siempre correcta en demo)
            if (answerInput.toUpperCase() === 'A') {
                const res = await submitIQLevelComplete(currentUser.id, selectedLevel);
                if (res.success) {
                    if (selectedLevel === currentIqLevel) {
                        setCurrentIqLevel(prev => prev + 1);
                    }
                    setGameState('RESOLVING');
                    if (onUpdateNeeded) onUpdateNeeded();
                } else {
                    alert(`❌ ERROR DE ENLACE: ${res.error || 'NÚCLEO INESTABLE'}`);
                }
            } else {
                alert("❌ SECUENCIA INCORRECTA. NÚCLEO INESTABLE.");
            }
        } catch (error: any) {
            alert(`⚠️ FALLO CRÍTICO: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#000814] text-white font-montserrat overflow-hidden flex flex-col">
            {/* HEADER TÁCTICO - ULTRA COMPACTO */}
            <div className="p-3 border-b border-white/5 flex justify-between items-center bg-black/60 backdrop-blur-md z-10">
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

            <div className="flex-1 overflow-y-auto p-3 relative">
                <AnimatePresence mode="wait">
                    {showIntro && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            className="fixed inset-0 z-[60] bg-[#000814]/90 backdrop-blur-xl flex items-center justify-center p-4"
                        >
                            <div className="bg-gradient-to-br from-[#001d3d] to-black border border-blue-500/20 p-6 rounded-[1.5rem] max-w-sm w-full space-y-4 text-center shadow-2xl">
                                <div className="w-12 h-12 bg-blue-500/20 rounded-xl mx-auto flex items-center justify-center border border-blue-500/30">
                                    <Brain className="text-blue-400" size={24} />
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-xl font-bebas tracking-widest text-white uppercase">REGLAS DE OPERACIÓN</h2>
                                    <p className="text-[8px] text-blue-300 font-black uppercase tracking-widest">Protocolo Consagrados</p>
                                </div>
                                <div className="space-y-3 text-left">
                                    <div className="flex gap-3">
                                        <div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[8px] font-black text-blue-400 border border-blue-500/30 flex-shrink-0">1</div>
                                        <p className="text-[10px] text-white/60 leading-tight"><span className="text-white font-bold">DESCIFRA EL PATRÓN:</span> Analiza la secuencia y selecciona la opción correcta.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[8px] font-black text-blue-400 border border-blue-500/30 flex-shrink-0">2</div>
                                        <p className="text-[10px] text-white/60 leading-tight"><span className="text-white font-bold">CLAVE BÍBLICA:</span> Desbloquea pistas leyendo el versículo táctico.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[8px] font-black text-blue-400 border border-blue-500/30 flex-shrink-0">3</div>
                                        <p className="text-[10px] text-white/60 leading-tight"><span className="text-white font-bold">GANANCIA XP:</span> Recompensas escaladas por cada nivel superado.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        localStorage.setItem('hide_iq_intro', 'true');
                                        setShowIntro(false);
                                    }}
                                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-bebas tracking-widest hover:bg-blue-500 transition-all active:scale-95 text-base shadow-lg shadow-blue-600/20"
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
                            className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 pb-32 pt-2"
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
                            className="max-w-md mx-auto min-h-full flex flex-col gap-3 justify-start pb-24 pt-2"
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
                            <div className="aspect-square bg-white/[0.02] rounded-xl border border-white/5 p-4 flex items-center justify-center relative overflow-hidden shadow-inner max-w-[260px] mx-auto w-full">
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5" />
                                <div className="grid grid-cols-2 gap-3 w-full">
                                    {LEVELS[selectedLevel - 1].options?.map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => setAnswerInput(opt)}
                                            className={`aspect-square rounded-xl border-2 transition-all font-bebas text-2xl flex items-center justify-center ${answerInput === opt
                                                ? 'bg-blue-600 border-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.5)] scale-95'
                                                : 'bg-white/5 border-white/10 active:scale-95 hover:border-white/20'
                                                }`}
                                        >
                                            <span className={answerInput === opt ? 'text-white' : 'text-white/60'}>
                                                {opt}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* HINTS SYSTEM - COMPACT */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowBibleClue(true)}
                                    className="flex-1 py-2.5 bg-[#FFB700]/5 border border-[#FFB700]/20 rounded-lg flex items-center justify-center gap-1.5 text-[#FFB700] text-[10px] font-black tracking-widest uppercase font-bebas active:scale-95 transition-all shadow-sm"
                                >
                                    <BookOpen size={14} /> RECURSO BÍBLICO
                                </button>
                                <button
                                    onClick={() => setShowHint(true)}
                                    disabled={!showBibleClue}
                                    className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-1.5 text-[10px] font-black tracking-widest uppercase font-bebas transition-all active:scale-95 shadow-sm ${showBibleClue
                                        ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                                        : 'bg-white/5 border border-white/5 text-white/10 cursor-not-allowed opacity-50'
                                        }`}
                                >
                                    <Lightbulb size={14} /> PISTA TÁCTICA
                                </button>
                            </div>

                            {showBibleClue && (
                                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-blue-900/20 p-3 rounded-lg border border-blue-500/10 text-center">
                                    <p className="text-[10px] italic text-blue-200/90 leading-tight mb-1">"{LEVELS[selectedLevel - 1].bibleClue.verse}"</p>
                                    <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">{LEVELS[selectedLevel - 1].bibleClue.reference}</p>
                                </motion.div>
                            )}

                            {showHint && showBibleClue && (
                                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-green-500/5 p-3 rounded-lg border border-green-500/10 text-center">
                                    <p className="text-[10px] text-green-400 font-bold">💡 SISTEMA: {LEVELS[selectedLevel - 1].hint}</p>
                                </motion.div>
                            )}

                            <div className="mt-auto pt-4">
                                <button
                                    onClick={handleSolve}
                                    disabled={!answerInput || isSubmitting}
                                    className="w-full py-4 bg-blue-600 text-white rounded-xl font-bebas text-lg tracking-[0.2em] font-black hover:bg-blue-500 transition-all active:scale-95 shadow-[0_4px_15px_rgba(37,99,235,0.4)] disabled:opacity-50 disabled:grayscale"
                                >
                                    {isSubmitting ? 'ESTABLECIENDO ENLACE...' : 'ENVIAR SECUENCIA'}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {gameState === 'RESOLVING' && (
                        <motion.div
                            key="resolving"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="min-h-full flex flex-col items-center justify-center text-center gap-4 py-8"
                        >
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                                <Trophy size={32} className="text-green-500" />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-2xl font-bebas tracking-widest text-[#FFB700]">ÉXITO TÁCTICO</h2>
                                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Protocolo de Nivel Descifrado</p>
                            </div>
                            <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5 w-full max-w-[200px] shadow-inner">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[9px] text-gray-500 font-black tracking-widest">XP ADQUIRIDOS</span>
                                    <span className="text-sm font-bebas text-green-400">+{Math.floor(((selectedLevel || 1) - 1) / 10) + 1} XP</span>
                                </div>
                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: '100% ' }}
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                        className="h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={() => setGameState('MAP')}
                                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bebas tracking-[0.15em] hover:bg-blue-500 transition-all active:scale-95 text-sm shadow-lg shadow-blue-600/20"
                            >
                                CONTINUAR AVANCE
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
