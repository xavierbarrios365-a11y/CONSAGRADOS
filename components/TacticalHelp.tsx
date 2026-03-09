import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HelpCircle, BookOpen, Star, Trophy, Zap, ChevronRight, Award } from 'lucide-react';

interface TacticalHelpProps {
    onClose: () => void;
}

const FAQ_ITEMS = [
    {
        icon: <Zap size={14} className="text-yellow-400" />,
        title: "SISTEMA DE XP Y RACHAS",
        content: "Los XP se obtienen por asistencia (20) y misiones. Tu racha activa multiplica los puntos ganados y perdidos: 5d (1.25x), 10d (1.50x), 20d (1.75x) y 30+d (2.0x)."
    },
    {
        icon: <Award size={14} className="text-blue-400" />,
        title: "RANGOS OFICIALES",
        content: "RECLUTA (0-500), ACTIVO (501-1500), CONSAGRADO (1501-3000), REFERENTE (3001-5000) y LÍDER (5000+). Las promociones desbloquean misiones de mayor calibre."
    },
    {
        icon: <Trophy size={14} className="text-green-400" />,
        title: "ARENA DE DUELOS",
        content: "Duelos en tiempo real sin riesgo de XP. Sirven para mejorar tus estadísticas de honor y ganar insignias sociales en el Intel Feed."
    },
    {
        icon: <Star size={14} className="text-purple-400" />,
        title: "PROYECTO NEHEMÍAS",
        content: "Juego de IQ de 100 niveles. Cada 10 niveles superados, la recompensa aumenta: 1-10 (1 XP), 11-20 (2 XP) y así sucesivamente hasta 10 XP por nivel."
    }
];

export const TacticalHelp: React.FC<TacticalHelpProps> = ({ onClose }) => {
    const [openIndex, setOpenIndex] = React.useState<number | null>(0);

    return (
        <div className="fixed inset-0 z-[100] bg-[#000814]/95 backdrop-blur-2xl flex flex-col font-montserrat overflow-hidden">
            {/* HEADER ULTRA COMPACTO */}
            <div className="p-3 border-b border-white/5 flex justify-between items-center bg-black/60">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500/20 rounded-lg border border-blue-500/30">
                        <HelpCircle className="text-blue-400" size={16} />
                    </div>
                    <div>
                        <h1 className="text-base font-bebas tracking-widest leading-none">TERMINAL DE AYUDA</h1>
                        <p className="text-[6px] text-blue-400 font-black uppercase mt-0.5 tracking-widest">Protocolos de Operación</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-full transition-colors">
                    <X size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {FAQ_ITEMS.map((item, idx) => (
                    <div key={idx} className="border border-white/5 rounded-xl bg-white/[0.02] overflow-hidden">
                        <button
                            onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                            className="w-full p-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                {item.icon}
                                <span className="text-[10px] font-black font-bebas tracking-widest">{item.title}</span>
                            </div>
                            <ChevronRight size={12} className={`text-gray-500 transition-transform ${openIndex === idx ? 'rotate-90' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {openIndex === idx && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="px-3 pb-3"
                                >
                                    <p className="text-[9px] text-gray-400 font-bold leading-relaxed border-t border-white/5 pt-2">
                                        {item.content}
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>

            {/* FOOTER COMPACTO */}
            <div className="p-3 bg-black/40 border-t border-white/5 text-center">
                <p className="text-[7px] text-gray-500 font-black uppercase tracking-[0.3em]">Consagrados Tactical OS v3.0</p>
            </div>
        </div>
    );
};

export default TacticalHelp;
