import React, { useState, useEffect } from 'react';
import { Quote, BookOpen, CheckCircle2, XCircle, Sparkles, Timer, Download, Flame, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DailyVerse as DailyVerseType, Agent } from '../types';
import AchievementShareCard from './AchievementShareCard';

interface DailyVerseProps {
    verse: DailyVerseType | null;
    streakCount?: number;
    onQuizComplete?: () => void | Promise<void | boolean>;
    agent?: Agent; // Añadido para compartir
}

const DailyVerse: React.FC<DailyVerseProps> = ({ verse, streakCount = 0, onQuizComplete, agent }) => {
    const [showQuiz, setShowQuiz] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [quizCompleted, setQuizCompleted] = useState(false);
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
                    // Si onQuizComplete devuelve false, algo falló en la sincronización
                    if (res !== false) {
                        setQuizCompleted(true);
                        setShowQuiz(false);
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
            }
        } else {
            setIsCorrect(false);
            if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
            setTimeout(() => setIsCorrect(null), 2000);
        }
    };

    // --- RENDER MINIMALISTA (ESTADO NORMAL / COMPLETADO) ---
    const renderMinimalist = () => (
        <div className="w-full relative group">
            <div className="absolute top-[-10px] right-[-10px] opacity-0 group-hover:opacity-5 transition-opacity duration-700">
                <Quote size={80} className="text-[#ffb700]" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-center md:justify-between gap-3 px-1">
                <div className="flex flex-col items-center md:items-start text-center md:text-left flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <BookOpen size={12} className="text-[#ffb700]" />
                        <span className="text-[9px] font-black text-[#ffb700] uppercase tracking-widest font-bebas">Versículo del Día</span>
                        {quizCompleted && <CheckCircle2 size={12} className="text-green-500" />}
                        {streakCount > 0 && (
                            <div className="flex items-center gap-1 bg-[#ffb700] text-[#001f3f] px-1.5 py-0.5 rounded-full border border-white/10 ml-2">
                                <Flame size={8} className={quizCompleted ? "animate-bounce" : "animate-pulse"} />
                                <span className="text-[8px] font-black uppercase font-bebas">{streakCount} DÍAS</span>
                            </div>
                        )}
                        {quizCompleted && timeLeft && (
                            <div className="flex items-center gap-1 bg-black/40 text-[#ffb700] px-1.5 py-0.5 rounded-full border border-[#ffb700]/20 ml-1">
                                <Timer size={8} />
                                <span className="text-[8px] font-black uppercase font-bebas tracking-wider">{timeLeft}</span>
                            </div>
                        )}
                        {quizCompleted && agent && (
                            <button
                                onClick={() => setShowShareModal(true)}
                                className="p-1 text-white/30 hover:text-[#ffb700] transition-colors"
                                title="Compartir Victoria"
                            >
                                <Share2 size={12} />
                            </button>
                        )}
                        {!quizCompleted && (
                            <button
                                onClick={() => setShowQuiz(true)}
                                className="ml-auto text-green-500/80 hover:text-green-500 text-[8px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors border border-green-500/30 px-2 py-0.5 rounded-full bg-green-500/5"
                            >
                                <Sparkles size={10} />
                                VALIDAR RECON
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col md:flex-row items-center md:items-baseline gap-2">
                        <p className="text-[11px] md:text-xs text-white font-bold italic leading-tight font-montserrat line-clamp-2 md:line-clamp-1">
                            "{verse.verse}"
                        </p>
                        <span className="shrink-0 text-[8px] font-black uppercase tracking-widest bg-[#ffb700]/10 text-[#ffb700] px-2 py-0.5 rounded-full border border-[#ffb700]/20 font-bebas">
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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full bg-[#0a0a0a]/90 backdrop-blur-2xl border-2 border-[#ffb700]/30 rounded-[2.5rem] p-10 shadow-[0_0_50px_rgba(255,183,0,0.1)] relative overflow-hidden"
        >
            {/* Background Decorative */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffb700]/5 rounded-full blur-3xl -mr-16 -mt-16" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#ffb700]/5 rounded-full blur-3xl -ml-16 -mb-16" />

            <div className="relative z-10 flex flex-col items-center text-center space-y-8">
                <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                        <Flame size={20} className="text-[#ffb700] animate-pulse" />
                        <h3 className="text-3xl font-bebas text-white tracking-[0.2em] uppercase">Protocolo de Reconocimiento</h3>
                    </div>
                    <p className="text-[10px] text-[#ffb700] font-black uppercase tracking-[0.3em] opacity-60">Completa el mensaje para validar tu racha táctica</p>
                </div>

                <div className="p-8 bg-white/5 border border-white/10 rounded-3xl w-full max-w-2xl relative">
                    <Quote size={40} className="absolute top-[-20px] left-8 text-[#ffb700]/20" />
                    <p className="text-xl md:text-2xl text-white font-montserrat font-medium italic leading-relaxed">
                        "{displayVerse}"
                    </p>
                    <div className="mt-4 flex justify-center">
                        <span className="text-[10px] font-black text-[#ffb700] uppercase tracking-widest bg-[#ffb700]/10 px-4 py-1.5 rounded-full border border-[#ffb700]/20">
                            {verse.reference}
                        </span>
                    </div>
                </div>

                <div className="w-full max-w-md space-y-6">
                    <div className="relative">
                        <input
                            id="quiz-input"
                            name="quiz-input"
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
                            placeholder="ESCRIBE LA PALABRA FALTANTE..."
                            className={`w-full bg-white/5 border-2 ${isCorrect === false ? 'border-red-500' : 'border-[#ffb700]/20'} focus:border-[#ffb700] rounded-2xl py-5 px-8 text-white text-lg font-black uppercase tracking-widest outline-none transition-all text-center placeholder:text-white/10`}
                            autoFocus
                        />
                        <AnimatePresence>
                            {isCorrect === false && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute -bottom-6 left-0 right-0"
                                >
                                    <span className="text-red-500 text-[9px] font-black uppercase tracking-widest">⚠️ Registro de memoria fallido. Intente de nuevo.</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <button
                            onClick={() => {
                                setShowQuiz(false);
                                setInputValue('');
                                setIsCorrect(null);
                            }}
                            className="py-4 rounded-xl border border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
                        >
                            Volver al Base
                        </button>
                        <button
                            onClick={checkAnswer}
                            className="bg-[#ffb700] text-[#001f3f] py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-[0_10px_20px_rgba(255,183,0,0.2)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Sparkles size={16} /> Validar Ahora
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );

    return (
        <AnimatePresence mode="wait">
            {!showQuiz || quizCompleted ? (
                <motion.div
                    key="minimalist"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full"
                >
                    {renderMinimalist()}
                </motion.div>
            ) : (
                <motion.div
                    key="expanded"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="w-full"
                >
                    {renderExpanded()}
                </motion.div>
            )}

            {/* Modal de Compartir */}
            {showShareModal && agent && (
                <AchievementShareCard
                    agent={agent}
                    newsItem={{
                        id: 'daily-victory',
                        type: 'RACHA',
                        message: `¡Racha de ${streakCount} días alcanzada!`,
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
        </AnimatePresence>
    );
};

export default DailyVerse;
