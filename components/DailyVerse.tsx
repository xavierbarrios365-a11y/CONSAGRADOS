
import React, { useState, useEffect } from 'react';
import { Quote, BookOpen, CheckCircle2, XCircle, Sparkles, Calendar, Download } from 'lucide-react';
import { DailyVerse as DailyVerseType } from '../types';
import { generateGoogleCalendarLink, downloadIcsFile } from '../services/calendarService';

interface DailyVerseProps {
    verse: DailyVerseType | null;
    onQuizComplete?: () => void;
}

const DailyVerse: React.FC<DailyVerseProps> = ({ verse, onQuizComplete }) => {
    const [showQuiz, setShowQuiz] = useState(false);
    const [quizCompleted, setQuizCompleted] = useState(false);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [inputValue, setInputValue] = useState('');
    const [missingWord, setMissingWord] = useState('');
    const [displayVerse, setDisplayVerse] = useState('');

    // Verificar si ya completó el quiz hoy (usando fecha local para evitar desfases UTC)
    useEffect(() => {
        const localToday = new Date().toLocaleDateString('en-CA'); // format: YYYY-MM-DD
        const completed = localStorage.getItem('verse_quiz_completed');
        if (completed === localToday) {
            setQuizCompleted(true);
        }
    }, []);

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
    }, [verse]);

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

            const localToday = new Date().toLocaleDateString('en-CA');
            localStorage.setItem('verse_quiz_completed', localToday);
            setQuizCompleted(true);

            setTimeout(() => {
                if (onQuizComplete) onQuizComplete();
            }, 1000);
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
                <div className="flex items-center gap-2 mb-2">
                    <BookOpen size={14} className="text-[#ffb700]" />
                    <span className="text-[10px] font-black text-[#ffb700] uppercase tracking-[0.3em] font-bebas">Versículo del Día</span>
                    {quizCompleted && <CheckCircle2 size={14} className="text-green-500" />}
                </div>

                {!showQuiz ? (
                    <>
                        <p className="text-sm md:text-base text-white font-bold italic leading-relaxed font-montserrat">
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
                        className="mt-4 flex items-center gap-2 bg-green-500/20 border border-green-500/40 px-6 py-3 rounded-2xl text-green-500 text-[10px] font-black uppercase tracking-widest hover:bg-green-500/30 transition-all active:scale-95"
                    >
                        <Sparkles size={14} />
                        Marcar como Leído
                    </button>
                )}

                {showQuiz && !quizCompleted && (
                    <div className="w-full mt-4 space-y-4 animate-in slide-in-from-bottom-2 bg-black/40 p-6 rounded-[2rem] border border-[#ffb700]/30 shadow-[0_0_30px_rgba(255,183,0,0.1)]">
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
                    <div className="flex flex-col items-center gap-3 mt-2">
                        <p className="text-green-500 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1">
                            <CheckCircle2 size={12} /> Racha Diaria Completada
                        </p>

                        <div className="flex gap-2">
                            <a
                                href={generateGoogleCalendarLink({
                                    title: `Misión: ${verse.reference}`,
                                    description: `Versículo del día: ${verse.verse}`,
                                    startTime: new Date(),
                                    endTime: new Date(new Date().getTime() + 3600000)
                                })}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-white/70 text-[8px] font-black uppercase tracking-widest hover:bg-[#ffb700]/20 hover:text-[#ffb700] transition-all"
                            >
                                <Calendar size={10} /> Google
                            </a>
                            <button
                                onClick={() => downloadIcsFile({
                                    title: `Misión: ${verse.reference}`,
                                    description: `Versículo del día: ${verse.verse}`,
                                    startTime: new Date(),
                                    endTime: new Date(new Date().getTime() + 3600000)
                                })}
                                className="flex items-center gap-1 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-white/70 text-[8px] font-black uppercase tracking-widest hover:bg-[#ffb700]/20 hover:text-[#ffb700] transition-all"
                            >
                                <Download size={10} /> .ICS
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DailyVerse;
