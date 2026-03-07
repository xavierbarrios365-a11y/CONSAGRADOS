import React, { useState, useEffect } from 'react';
import { Quote, BookOpen, CheckCircle2, XCircle, Sparkles, Calendar, Download, Flame, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DailyVerse as DailyVerseType, Agent } from '../types';
import { generateGoogleCalendarLink, downloadIcsFile } from '../services/calendarService';
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
        const checkCompletion = () => {
            const now = new Date();
            const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
            const localToday = localStorage.getItem('verse_completed_date');

            if (!verse?.lastStreakDate && localToday !== todayStr) {
                setQuizCompleted(false);
                return;
            }
            let lastMs = 0;
            const raw = verse?.lastStreakDate || '';
            const numVal = Number(raw);
            if (!isNaN(numVal) && numVal > 1000000000000) {
                lastMs = numVal;
            } else if (raw !== '') {
                const pd = new Date(raw);
                if (!isNaN(pd.getTime())) lastMs = pd.getTime();
            }

            if (lastMs === 0 && localToday !== todayStr) {
                setQuizCompleted(false);
                return;
            }

            // --- LÓGICA DE DÍA CALENDARIO (GMT-4 / Caracas) ---
            const lastDateStr = lastMs > 0 ? new Date(lastMs).toLocaleDateString('en-CA', { timeZone: 'America/Caracas' }) : '';

            // Backup local para evitar que se pida de nuevo si la base de datos tarda en llegar
            const isCompletedToday = (lastDateStr === todayStr) || (localToday === todayStr);

            if (isCompletedToday) {
                setQuizCompleted(true);

                // Calcular tiempo hasta la medianoche de Caracas
                const formatter = new Intl.DateTimeFormat('en-CA', {
                    timeZone: 'America/Caracas',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                });

                // Obtener medianoche (próximo día)
                const parts = formatter.formatToParts(now);
                const getPart = (type: string) => parts.find(p => p.type === type)?.value;
                const tomorrow = new Date(`${getPart('year')}-${getPart('month')}-${getPart('day')}T00:00:00Z`);
                tomorrow.setDate(tomorrow.getDate() + 1); // Este objeto Date está en UTC pero representa la medianoche de Caracas si lo tratamos con cuidado

                // Forma más robusta de obtener ms hasta medianoche Caracas
                const caracasNowStr = new Date().toLocaleString('en-US', { timeZone: 'America/Caracas' });
                const caracasNow = new Date(caracasNowStr);
                const midnightCaracas = new Date(caracasNow);
                midnightCaracas.setHours(24, 0, 0, 0); // Siguiente medianoche local

                const msRemaining = midnightCaracas.getTime() - caracasNow.getTime();

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
        const interval = setInterval(checkCompletion, 1000);
        return () => clearInterval(interval);
    }, [verse?.lastStreakDate]);

    // Preparar el reto cuando el verso cambia
    useEffect(() => {
        if (verse && verse.verse) {
            const words = verse.verse.split(' ');
            // Filtrar palabras de más de 4 letras para que sea un reto real
            const candidates = words.filter(w => w.replace(/[.,;]/g, '').length > 4);
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

            // Al completar, avisar al padre (App.tsx) para que sincronice con el servidor
            if (onQuizComplete) {
                try {
                    const success = await onQuizComplete();
                    if ((success as unknown as boolean) !== false) {
                        setQuizCompleted(true);
                    } else {
                        // Reseteamos en caso de fallo para que intente de nuevo
                        setIsCorrect(null);
                        setInputValue('');
                    }
                } catch (e) {
                    setIsCorrect(null);
                    setInputValue('');
                }
            } else {
                setQuizCompleted(true);
            }
        } else {
            setIsCorrect(false);
            if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
            setTimeout(() => setIsCorrect(null), 2000);
        }
    };

    return (
        <div className="w-full bg-gradient-to-br from-[#ffb700]/10 to-transparent border border-[#ffb700]/20 rounded-2xl p-3 relative overflow-hidden group">
            <div className="absolute top-[-10px] right-[-10px] opacity-5 group-hover:scale-110 transition-transform duration-700">
                <Quote size={80} className="text-[#ffb700]" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-center md:justify-between gap-3">
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
                    </div>

                    {!showQuiz || quizCompleted ? (
                        <div className="flex flex-col md:flex-row items-center md:items-baseline gap-2">
                            <p className="text-[11px] md:text-xs text-white font-bold italic leading-tight font-montserrat line-clamp-2 md:line-clamp-1">
                                "{verse.verse}"
                            </p>
                            <span className="shrink-0 text-[8px] font-black uppercase tracking-widest bg-[#ffb700]/10 text-[#ffb700] px-2 py-0.5 rounded-full border border-[#ffb700]/20 font-bebas">
                                {verse.reference}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 py-1 opacity-50">
                            <Quote size={16} className="text-gray-500 animate-pulse" />
                            <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest leading-none">¿Recordaste el mensaje base?</p>
                        </div>
                    )}
                </div>

                {/* Acciones Compactas */}
                <div className="flex items-center gap-2 shrink-0">
                    {!quizCompleted && !showQuiz && (
                        <motion.button
                            whileHover={{ scale: 1.05, backgroundColor: "rgba(34, 197, 94, 0.3)" }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowQuiz(true)}
                            className="bg-green-500/20 border border-green-500/10 px-3 py-1.5 rounded-xl text-green-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all"
                        >
                            <Sparkles size={12} />
                            Validar Recon
                        </motion.button>
                    )}

                    {showQuiz && !quizCompleted && (
                        <div className="flex items-center gap-2 bg-black/40 p-2 rounded-xl border border-[#ffb700]/30">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
                                placeholder="Palabra..."
                                className={`w-24 bg-black/50 border ${isCorrect === false ? 'border-red-500' : 'border-white/10'} rounded-lg py-1 px-2 text-white text-[9px] font-black uppercase tracking-widest focus:border-[#ffb700] outline-none transition-all placeholder:text-white/20`}
                                autoFocus
                            />
                            <button
                                onClick={checkAnswer}
                                className="bg-[#ffb700] text-[#001f3f] px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest"
                            >
                                <Sparkles size={10} />
                            </button>
                        </div>
                    )}

                    {quizCompleted && (
                        <div className="flex items-center gap-2">
                            {timeLeft && (
                                <div className="hidden xs:flex items-center gap-1.5 px-3 py-1.5 bg-black/40 border border-[#ffb700]/20 rounded-xl">
                                    <Calendar size={10} className="text-[#ffb700]" />
                                    <span className="text-xs font-bebas text-[#ffb700] tracking-widest">{timeLeft}</span>
                                </div>
                            )}
                            {agent && (
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setShowShareModal(true)}
                                    className="p-2 bg-[#ffb700] text-[#001f3f] rounded-xl shadow-lg active:scale-95 group"
                                    title="Compartir Victoria"
                                >
                                    <Share2 size={16} className="group-hover:rotate-12 transition-transform" />
                                </motion.button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Alerta de Error Compacta */}
            <AnimatePresence>
                {isCorrect === false && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute bottom-1 left-0 right-0 flex justify-center"
                    >
                        <p className="text-red-500 text-[7px] font-black uppercase tracking-widest bg-black/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <XCircle size={8} /> Palabra incorrecta
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal de Compartir Personalizado para el Versículo */}
            {showShareModal && agent && (
                <AchievementShareCard
                    agent={agent}
                    newsItem={{
                        id: 'daily-verse-' + Date.now(),
                        type: 'RACHA',
                        message: `¡VICTORIA DIARIA! He mantenido mi racha de ${streakCount} días.`,
                        verse: verse?.verse,
                        reference: verse?.reference,
                        date: new Date().toLocaleDateString(),
                        agentId: agent.id,
                        agentName: agent.name
                    }}
                    onClose={() => setShowShareModal(false)}
                />
            )}
        </div>
    );
};

export default DailyVerse;
