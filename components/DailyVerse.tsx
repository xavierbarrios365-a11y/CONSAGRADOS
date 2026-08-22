import React, { useState, useEffect } from 'react';
import { Quote, BookOpen, CheckCircle2, XCircle, Sparkles, Timer, Download, Flame, Share2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DailyVerse as DailyVerseType, Agent } from '../types';
import AchievementShareCard from './AchievementShareCard';
import StreakVictoryModal from './StreakVictoryModal';
import { tacticalSound } from '../utils/soundEffects';

interface DailyVerseProps {
    verse: DailyVerseType | null;
    streakCount?: number;
    onQuizComplete?: () => void | Promise<void | boolean>;
    agent?: Agent; // Añadido para compartir
}

const DailyVerse: React.FC<DailyVerseProps> = ({ verse, streakCount = 0, onQuizComplete, agent }) => {
    const [showQuiz, setShowQuiz] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showVictoryModal, setShowVictoryModal] = useState(false);
    const [quizCompleted, setQuizCompleted] = useState(false);
    // Racha real post-quiz: se actualiza al valor del prop más reciente siempre
    const actualStreak = streakCount;
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [inputValue, setInputValue] = useState('');
    const [missingWord, setMissingWord] = useState('');
    const [displayVerse, setDisplayVerse] = useState('');
    const [timeLeft, setTimeLeft] = useState<string | null>(null);

    // Sincronizar estado de completado basado en el servidor (lastStreakDate)
    useEffect(() => {
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });

        const checkCompletion = () => {
            const localDone = localStorage.getItem('verse_completed_date') === todayStr;
            let serverDone = false;

            if (verse?.lastStreakDate) {
                const raw = String(verse.lastStreakDate);
                // Soporte para timestamp legacy o string YYYY-MM-DD
                if (raw.match(/^\d+$/)) {
                    serverDone = new Date(parseInt(raw, 10)).toLocaleDateString('en-CA', { timeZone: 'America/Caracas' }) === todayStr;
                } else {
                    serverDone = raw === todayStr;
                }
            }

            if (localDone || serverDone) {
                setQuizCompleted(true);

                // Sincronizar local si el servidor ya lo tiene pero local no
                if (serverDone && !localDone) {
                    localStorage.setItem('verse_completed_date', todayStr);
                }

                // Calcular tiempo restante para el siguiente (Caracas Time)
                const caracasNowStr = new Date().toLocaleString('en-US', { timeZone: 'America/Caracas' });
                const caracasNow = new Date(caracasNowStr);
                const nextDay = new Date(caracasNow);
                nextDay.setHours(24, 0, 0, 0);

                const msRemaining = nextDay.getTime() - caracasNow.getTime();
                const hours = Math.floor(msRemaining / (1000 * 60 * 60));
                const mins = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
                const secs = Math.floor((msRemaining % (1000 * 60)) / 1000);
                setTimeLeft(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
            } else {
                setQuizCompleted(false);
                setTimeLeft(null);
            }
        };

        checkCompletion();
        const timer = setInterval(checkCompletion, 1000);
        return () => clearInterval(timer);
    }, [verse?.lastStreakDate, quizCompleted]);

    // Preparar el reto cuando el verso cambia
    useEffect(() => {
        if (verse && verse.verse) {
            const words = verse.verse.split(' ');
            // Filtrar palabras de más de 4 letras para que sea un reto real
            const candidates = words.filter(w => w.replace(/[.,;¡!¿?:"']/g, '').length > 4);
            const target = candidates.length > 0
                ? candidates[Math.floor(Math.random() * candidates.length)]
                : words[Math.floor(words.length / 2)];

            const cleanTarget = target.replace(/[.,;¡!¿?:"']/g, '');
            setMissingWord(cleanTarget);

            const newDisplay = verse.verse.replace(target, '__________');
            setDisplayVerse(newDisplay);
        }
    }, [verse?.verse]);

    if (!verse) return (
        <div className="w-full bg-white/5 border border-white/5 rounded-[2.5rem] p-8 animate-pulse">
            <div className="h-4 bg-white/10 rounded w-3/4 mb-4 mx-auto"></div>
            <div className="h-3 bg-white/5 rounded w-1/4 mx-auto"></div>
        </div>
    );

    const normalizeText = (text: string) => {
        return text
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
            .replace(/[.,;¡!¿?:"']/g, "")    // Eliminar puntuación
            .trim();
    };

    const checkAnswer = async () => {
        const inputNorm = normalizeText(inputValue);
        const targetNorm = normalizeText(missingWord);

        if (inputNorm === targetNorm) {
            if (navigator.vibrate) navigator.vibrate(100);
            setIsCorrect(true);

            // Al completar, avisar al padre (useTacticalLogic) para que sincronice con el servidor
            if (onQuizComplete) {
                try {
                    const res = await onQuizComplete();
                    if (res !== false) {
                        setQuizCompleted(true);
                        setShowQuiz(false);
                        setShowVictoryModal(true);
                    } else {
                        setIsCorrect(null);
                        setInputValue('');
                    }
                } catch (e) {
                    setIsCorrect(null);
                    setInputValue('');
                }
            } else {
                setQuizCompleted(true);
                setShowQuiz(false);
                setShowVictoryModal(true);
            }
        } else {
            setIsCorrect(false);
            if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
            setTimeout(() => setIsCorrect(null), 2000);
        }
    };

    const handleCardClick = () => {
        tacticalSound.playReactionPop();
        if (!quizCompleted) {
            setShowQuiz(true);
        } else {
            setShowVictoryModal(true);
        }
    };

    // --- RENDER MINIMALISTA (ESTADO NORMAL / COMPLETADO) ---
    const renderMinimalist = () => (
        <div className="w-full relative group bg-gradient-to-r from-white/[0.04] to-amber-500/[0.02] border border-white/10 hover:border-[#ffb700]/40 rounded-2xl p-4 transition-all duration-500 shadow-lg">
            <div className="flex flex-col md:flex-row items-center md:justify-between gap-3">
                <div className="flex flex-col items-center md:items-start text-center md:text-left flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5 justify-center md:justify-start">
                        <div className="p-1.5 bg-[#ffb700]/15 rounded-lg border border-[#ffb700]/30 text-[#ffb700]">
                            <BookOpen size={13} />
                        </div>
                        <span className="text-[10px] font-black text-[#ffb700] uppercase tracking-widest font-bebas">
                            Versículo del Día
                        </span>
                        {quizCompleted && (
                            <span className="flex items-center gap-1 text-[8px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bebas">
                                <CheckCircle2 size={10} /> Validado
                            </span>
                        )}
                        {streakCount > 0 && (
                            <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-black px-2.5 py-0.5 rounded-full font-black text-[9px] font-bebas shadow-[0_0_15px_rgba(255,183,0,0.4)]">
                                <Flame size={11} className="animate-bounce" />
                                <span>{streakCount} DÍAS RACHA</span>
                            </div>
                        )}
                        {quizCompleted && timeLeft && (
                            <div className="flex items-center gap-1 bg-black/60 text-white/60 px-2 py-0.5 rounded-full border border-white/10 text-[8px] font-black font-bebas tracking-wider">
                                <Timer size={10} className="text-[#ffb700]" />
                                <span>SIGUIENTE: {timeLeft}</span>
                            </div>
                        )}
                        {quizCompleted && agent && (
                            <button
                                onClick={() => setShowShareModal(true)}
                                className="p-1.5 text-white/40 hover:text-[#ffb700] hover:bg-white/5 rounded-lg transition-all"
                                title="Compartir Victoria"
                            >
                                <Share2 size={13} />
                            </button>
                        )}
                        {!quizCompleted && (
                            <button
                                onClick={() => { tacticalSound.playReactionPop(); setShowQuiz(true); }}
                                className="ml-auto bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all px-3 py-1 rounded-xl font-bebas shadow-[0_0_20px_rgba(255,183,0,0.4)] hover:scale-105 active:scale-95 animate-pulse"
                            >
                                <Sparkles size={12} />
                                VALIDAR RACHA (+15 XP)
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col md:flex-row items-center md:items-baseline gap-2">
                        <p className="text-xs md:text-sm text-white font-medium italic leading-relaxed font-montserrat line-clamp-2">
                            "{verse.verse}"
                        </p>
                        <span className="shrink-0 text-[8px] font-black uppercase tracking-widest bg-[#ffb700]/10 text-[#ffb700] px-2.5 py-0.5 rounded-full border border-[#ffb700]/30 font-bebas">
                            {verse.reference}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );

    // --- RENDER EXPANDIDO (ELITE GLASSMORFISM QUIZ) ---
    const renderExpanded = () => (
        <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="w-full bg-gradient-to-b from-[#001428]/95 via-[#000d1a]/95 to-[#000814]/95 backdrop-blur-2xl border-2 border-[#ffb700]/40 rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(255,183,0,0.18)] relative overflow-hidden"
        >
            {/* Background Radial Glow */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-yellow-500/10 rounded-full blur-[80px] pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-[#ffb700] text-[9px] font-black font-bebas tracking-widest uppercase mb-1">
                        <Flame size={12} className="animate-bounce" />
                        DESAFÍO DE RACHA SAGRADA (+15 XP)
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bebas text-white tracking-widest uppercase">
                        Protocolo de Reconocimiento
                    </h3>
                    <p className="text-[9px] text-white/50 font-black uppercase tracking-[0.3em] font-montserrat">
                        Completa la palabra clave de las Escrituras
                    </p>
                </div>

                <div className="p-6 md:p-8 bg-white/[0.03] border border-white/10 rounded-2xl w-full max-w-xl relative shadow-inner">
                    <Quote size={28} className="absolute -top-3.5 left-6 text-[#ffb700] opacity-80" />
                    <p className="text-base md:text-lg text-white/95 font-montserrat font-medium italic leading-relaxed">
                        "{displayVerse}"
                    </p>
                    <div className="mt-4 flex justify-center">
                        <span className="text-[9px] font-black text-[#ffb700] uppercase tracking-widest bg-[#ffb700]/15 px-3 py-1 rounded-full border border-[#ffb700]/30 font-bebas">
                            {verse.reference}
                        </span>
                    </div>
                </div>

                <div className="w-full max-w-md space-y-4">
                    <div className="relative">
                        <input
                            id="quiz-input"
                            name="quiz-input"
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
                            placeholder="Escribe la palabra faltante..."
                            className={`w-full bg-black/60 border-2 ${
                                isCorrect === false ? 'border-red-500 ring-4 ring-red-500/20' :
                                isCorrect === true ? 'border-emerald-500 ring-4 ring-emerald-500/20' :
                                'border-white/15 focus:border-[#ffb700] focus:ring-4 focus:ring-amber-500/20'
                            } rounded-2xl py-3.5 px-6 text-white text-base font-bold tracking-wide outline-none transition-all text-center placeholder:text-white/20 font-montserrat`}
                            autoFocus
                        />
                        <AnimatePresence>
                            {isCorrect === false && (
                                <motion.div
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="mt-2"
                                >
                                    <span className="text-red-400 text-[9px] font-black uppercase tracking-widest font-bebas">
                                        ⚠️ Palabra incorrecta. ¡Inténtalo de nuevo!
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                        <button
                            onClick={() => {
                                setShowQuiz(false);
                                setInputValue('');
                                setIsCorrect(null);
                            }}
                            className="py-3 rounded-xl border border-white/10 text-white/50 text-xs font-black uppercase tracking-wider font-bebas hover:bg-white/5 transition-all active:scale-95"
                        >
                            Volver a Base
                        </button>
                        <button
                            onClick={checkAnswer}
                            className="bg-gradient-to-r from-amber-400 to-yellow-500 text-black py-3 rounded-xl text-xs font-black uppercase tracking-widest font-bebas shadow-[0_0_25px_rgba(255,183,0,0.4)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Sparkles size={16} /> Validar Ahora
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );

    return (
        <div className="w-full">
            <AnimatePresence mode="wait">
                {!showQuiz ? (
                    <motion.div
                        key="minimalist"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleCardClick}
                        className="w-full cursor-pointer active:scale-[0.98] transition-transform select-none"
                    >
                        {renderMinimalist()}
                    </motion.div>
                ) : (
                    <motion.div
                        key="expanded"
                        initial={{ opacity: 0, scale: 0.95, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -15 }}
                        className="w-full"
                    >
                        {renderExpanded()}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal de Compartir Logro */}
            {showShareModal && agent && (
                <AchievementShareCard
                    agent={agent}
                    newsItem={{
                        id: 'daily-victory',
                        type: 'RACHA',
                        message: `🎖️ Racha de ${actualStreak} días lograda.`,
                        verse: verse?.verse,
                        reference: verse?.reference,
                        version: verse?.version || 'RVR1960',
                        date: new Date().toLocaleDateString(),
                        agentId: agent?.id,
                        agentName: agent?.name
                    }}
                    onClose={() => setShowShareModal(false)}
                />
            )}

            {/* Modal de Victoria Inmersiva de Racha */}
            <StreakVictoryModal
                isOpen={showVictoryModal}
                streakCount={actualStreak > 0 ? actualStreak : 1}
                agentName={agent?.name || 'Agente'}
                sedeName={agent?.sedeId === 'SEDE-JESUS-ES-EL-CENTRO' || !agent?.sedeId ? 'JESÚS ES EL CENTRO' : agent.sedeId.replace('SEDE-', '').replace(/-/g, ' ')}
                xpAwarded={15}
                shieldsLeft={agent?.rachaProteccion || 0}
                onClose={() => setShowVictoryModal(false)}
                onOpenShareModal={() => {
                    setShowVictoryModal(false);
                    setShowShareModal(true);
                }}
            />
        </div>
    );
};

export default DailyVerse;
