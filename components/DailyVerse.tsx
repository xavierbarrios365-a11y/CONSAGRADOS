
import React, { useState, useEffect } from 'react';
import { Quote, BookOpen, CheckCircle2, XCircle, Sparkles, Calendar, Download } from 'lucide-react';
import { DailyVerse as DailyVerseType } from '../types';
import { generateGoogleCalendarLink, downloadIcsFile } from '../services/calendarService';

interface DailyVerseProps {
    verse: DailyVerseType | null;
    streakCount?: number;
    onQuizComplete?: () => void;
}

const DailyVerse: React.FC<DailyVerseProps> = ({ verse, streakCount = 0, onQuizComplete }) => {
    const [showQuiz, setShowQuiz] = useState(false);
    const [quizCompleted, setQuizCompleted] = useState(false);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [inputValue, setInputValue] = useState('');
    const [missingWord, setMissingWord] = useState('');
    const [displayVerse, setDisplayVerse] = useState('');
    const [timeLeft, setTimeLeft] = useState<string | null>(null);

    // Sincronizar estado de completado basado en el servidor (lastStreakDate)
    useEffect(() => {
        if (!verse?.lastStreakDate) {
            setQuizCompleted(false);
            return;
        }

        const checkCompletion = () => {
            let lastMs = 0;
            const raw = verse.lastStreakDate!;
            const numVal = Number(raw);
            if (!isNaN(numVal) && numVal > 1000000000000) {
                lastMs = numVal;
            } else {
                const pd = new Date(raw);
                if (!isNaN(pd.getTime())) lastMs = pd.getTime();
            }

            if (lastMs === 0) {
                setQuizCompleted(false);
                return;
            }

            // --- LÓGICA DE DÍA CALENDARIO (GMT-4 / Caracas) ---
            const now = new Date();
            const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
            const lastDateStr = new Date(lastMs).toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });

            if (lastDateStr === todayStr) {
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

            const cleanTarget = target.replace(/[.,;]/g, '');
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

    const checkAnswer = () => {
        if (inputValue.trim().toLowerCase() === missingWord.toLowerCase()) {
            if (navigator.vibrate) navigator.vibrate(100);
            setIsCorrect(true);

            // Al completar, avisar al padre (App.tsx) para que sincronice con el servidor
            if (onQuizComplete) onQuizComplete();

            // local set for immediate feedback
            setQuizCompleted(true);
        } else {
            setIsCorrect(false);
            if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
            setTimeout(() => setIsCorrect(null), 2000);
        }
    };

    return (
        <div className="w-full bg-gradient-to-br from-[#ffb700]/10 to-transparent border border-[#ffb700]/20 rounded-3xl p-5 relative overflow-hidden group">
            <div className="absolute top-[-20px] right-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-700">
                <Quote size={120} className="text-[#ffb700]" />
            </div>

            <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2">
                        <BookOpen size={14} className="text-[#ffb700]" />
                        <span className="text-[10px] font-black text-[#ffb700] uppercase tracking-[0.3em] font-bebas">Versículo del Día</span>
                        {quizCompleted && <CheckCircle2 size={14} className="text-green-500" />}
                    </div>
                    {streakCount > 0 && (
                        <div className="flex items-center gap-1.5 bg-[#ffb700] text-[#001f3f] px-2.5 py-0.5 rounded-full border border-white/20 shadow-lg animate-in slide-in-from-right-4 duration-500">
                            <Sparkles size={10} className="animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-widest font-bebas">RACHA: {streakCount} DÍAS</span>
                        </div>
                    )}
                </div>

                {!showQuiz || quizCompleted ? (
                    <>
                        <p className="text-sm md:text-base text-white font-bold italic leading-relaxed font-montserrat px-4">
                            "{verse.verse}"
                        </p>

                        <div className="pt-2">
                            <span className="px-4 py-1.5 bg-[#ffb700] text-[#001f3f] text-[9px] font-black uppercase tracking-widest rounded-full font-bebas">
                                {verse.reference}
                            </span>
                        </div>
                    </>
                ) : (
                    <div className="py-6 flex flex-col items-center justify-center space-y-2 opacity-50">
                        <Quote size={40} className="text-gray-500 animate-pulse" />
                        <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">¿Recordaste el mensaje base?</p>
                    </div>
                )}

                {/* Quiz Duolingo-Style */}
                {!quizCompleted && !showQuiz && (
                    <button
                        onClick={() => setShowQuiz(true)}
                        className="mt-4 flex items-center gap-2 bg-green-500/20 border border-green-500/40 px-6 py-3 rounded-2xl text-green-500 text-[10px] font-black uppercase tracking-widest hover:bg-green-500/30 transition-all active:scale-95 shadow-lg shadow-green-900/10"
                    >
                        <Sparkles size={14} />
                        Marcar como Leído
                    </button>
                )}

                {showQuiz && !quizCompleted && (
                    <div className="w-full mt-2 space-y-4 animate-in slide-in-from-bottom-2 bg-black/40 p-6 rounded-[2rem] border border-[#ffb700]/30 shadow-[0_0_30px_rgba(255,183,0,0.1)]">
                        <div className="flex flex-col items-center gap-1 mb-2">
                            <Sparkles className="text-[#ffb700] animate-bounce" size={20} />
                            <p className="text-[11px] text-[#ffb700] font-black uppercase tracking-widest">Reto de Memoria Táctica</p>
                            <p className="text-[8px] text-white/40 font-bold uppercase tracking-widest">Escribe la palabra que falta</p>
                        </div>

                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 mb-4">
                            <p className="text-xs text-white/80 italic font-montserrat leading-relaxed">
                                {displayVerse}
                            </p>
                        </div>

                        <div className="relative">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
                                placeholder="Escribe aquí..."
                                className={`w-full bg-black/50 border ${isCorrect === false ? 'border-red-500' : 'border-white/10'} rounded-xl py-4 px-4 text-white text-[10px] font-black uppercase tracking-widest focus:border-[#ffb700] focus:ring-1 focus:ring-[#ffb700] outline-none transition-all placeholder:text-white/20`}
                                autoFocus
                            />
                            <button
                                onClick={checkAnswer}
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#ffb700] text-[#001f3f] px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                            >
                                Validar
                            </button>
                        </div>

                        {isCorrect === false && (
                            <p className="text-red-500 text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-1 animate-bounce">
                                <XCircle size={12} /> Palabra incorrecta. ¡Concéntrate!
                            </p>
                        )}
                    </div>
                )}

                {quizCompleted && (
                    <div className="flex flex-col items-center gap-3 mt-4 animate-in zoom-in duration-500">
                        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-full">
                            <CheckCircle2 size={12} className="text-green-500" />
                            <p className="text-green-500 text-[9px] font-black uppercase tracking-widest">Racha Diaria Asegurada</p>
                        </div>

                        {timeLeft && (
                            <div className="flex flex-col items-center gap-1 mt-1">
                                <p className="text-[8px] text-white/40 font-bold uppercase tracking-[0.2em]">Próximo Objetivo Recon en:</p>
                                <div className="flex items-center gap-2 text-xl font-bebas text-[#ffb700] tracking-widest bg-black/40 px-6 py-2 rounded-2xl border border-white/5 shadow-inner">
                                    <Calendar size={14} className="animate-pulse" />
                                    {timeLeft}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DailyVerse;
