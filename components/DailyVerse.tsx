
import React from 'react';
import { Quote, BookOpen } from 'lucide-react';
import { DailyVerse as DailyVerseType } from '../types';

interface DailyVerseProps {
    verse: DailyVerseType | null;
}

const DailyVerse: React.FC<DailyVerseProps> = ({ verse }) => {
    if (!verse) return (
        <div className="w-full bg-white/5 border border-white/5 rounded-[2.5rem] p-8 animate-pulse">
            <div className="h-4 bg-white/10 rounded w-3/4 mb-4 mx-auto"></div>
            <div className="h-3 bg-white/5 rounded w-1/4 mx-auto"></div>
        </div>
    );

    return (
        <div className="w-full bg-gradient-to-br from-[#ffb700]/10 to-transparent border border-[#ffb700]/20 rounded-[2.5rem] p-8 relative overflow-hidden group">
            <div className="absolute top-[-20px] right-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-700">
                <Quote size={120} className="text-[#ffb700]" />
            </div>

            <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <BookOpen size={14} className="text-[#ffb700]" />
                    <span className="text-[10px] font-black text-[#ffb700] uppercase tracking-[0.3em] font-bebas">Versículo del Día</span>
                </div>

                <p className="text-sm md:text-base text-white font-bold italic leading-relaxed font-montserrat">
                    "{verse.verse}"
                </p>

                <div className="pt-2">
                    <span className="px-4 py-1.5 bg-[#ffb700] text-[#001f3f] text-[9px] font-black uppercase tracking-widest rounded-full font-bebas">
                        {verse.reference}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default DailyVerse;
