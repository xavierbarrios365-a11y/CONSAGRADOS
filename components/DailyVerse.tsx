
import React, { useState, useEffect } from 'react';
import { Quote, BookOpen, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { DailyVerse as DailyVerseType } from '../types';

interface DailyVerseProps {
    verse: DailyVerseType | null;
    onQuizComplete?: () => void;
}

const DailyVerse: React.FC<DailyVerseProps> = ({ verse, onQuizComplete }) => {
    const [showQuiz, setShowQuiz] = useState(false);
    const [quizCompleted, setQuizCompleted] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

    // Verificar si ya completó el quiz hoy
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        const completed = localStorage.getItem('verse_quiz_completed');
        if (completed === today) {
            setQuizCompleted(true);
        }
    }, []);

    if (!verse) return (
        <div className="w-full bg-white/5 border border-white/5 rounded-[2.5rem] p-8 animate-pulse">
            <div className="h-4 bg-white/10 rounded w-3/4 mb-4 mx-auto"></div>
            <div className="h-3 bg-white/5 rounded w-1/4 mx-auto"></div>
        </div>
    );

    // Generar opciones una sola vez cuando el componente se monta o el verso cambia
    const [options, setOptions] = useState<string[]>([]);
    const [correctIndex, setCorrectIndex] = useState<number>(-1);

    useEffect(() => {
        if (verse) {
            const correctAnswer = verse.reference.split(' ')[0];
            const opts = [correctAnswer, 'Mateo', 'Marcos', 'Lucas'].sort(() => Math.random() - 0.5);
            setOptions(opts);
            setCorrectIndex(opts.indexOf(correctAnswer));
        }
    }, [verse]);

    const handleAnswer = (index: number) => {
        setSelectedAnswer(index);
        const correct = index === correctIndex;
        setIsCorrect(correct);

        if (correct) {
            // Vibración de feedback
            if (navigator.vibrate) navigator.vibrate(100);

            const today = new Date().toISOString().split('T')[0];
            localStorage.setItem('verse_quiz_completed', today);
            setQuizCompleted(true);

            // Callback para marcar racha
            setTimeout(() => {
                if (onQuizComplete) onQuizComplete();
            }, 1500);
        }
    };

    return (
        <div className="w-full bg-gradient-to-br from-[#ffb700]/10 to-transparent border border-[#ffb700]/20 rounded-[2.5rem] p-8 relative overflow-hidden group">
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
                    <div className="w-full mt-4 space-y-4 animate-in slide-in-from-bottom-2 bg-black/20 p-4 rounded-[2rem] border border-white/5">
                        <div className="flex flex-col items-center gap-1 mb-2">
                            <Sparkles className="text-[#ffb700] animate-bounce" size={20} />
                            <p className="text-[11px] text-white font-black uppercase tracking-widest">¡RETO DE MEMORIA ACTIVO!</p>
                            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">¿De qué libro era el versículo?</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {options.map((opt, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleAnswer(i)}
                                    disabled={selectedAnswer !== null}
                                    className={`py-4 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg
                                        ${selectedAnswer === i
                                            ? (isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white')
                                            : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white'
                                        }
                                        ${selectedAnswer !== null && i === correctIndex && 'ring-2 ring-green-500 border-green-500'}
                                    `}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                        {isCorrect === false && (
                            <p className="text-red-500 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1 mt-2 animate-bounce">
                                <XCircle size={14} /> El nodo no olvida. Intenta mañana.
                            </p>
                        )}
                    </div>
                )}

                {quizCompleted && (
                    <p className="text-green-500 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 mt-2">
                        <CheckCircle2 size={12} /> Racha Diaria Completada
                    </p>
                )}
            </div>
        </div>
    );
};

export default DailyVerse;
