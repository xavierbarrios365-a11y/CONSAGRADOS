import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Star, Flame, Trophy, Zap, ChevronDown, ChevronUp, Book, Shield, Swords, Info, X } from 'lucide-react';

interface FAQItem {
    question: string;
    answer: React.ReactNode;
    icon: React.ReactNode;
}

const FAQ_DATA: FAQItem[] = [
    {
        question: "¿Cómo gano puntos de Honor (XP)?",
        icon: <Zap className="text-yellow-400" size={18} />,
        answer: "Los Puntos de Honor se obtienen mediante la participación en actividades del Mando Central: asistencias a reuniones, toma de apuntes, estudio bíblico y misiones especiales. Cada actividad tiene un valor base que puede ser multiplicado por tu racha táctica."
    },
    {
        question: "Sistema de Rachas (Streak Multiplier)",
        icon: <Flame className="text-orange-500" size={18} />,
        answer: (
            <div className="space-y-2">
                <p>Mantener una racha activa (asistencia continua) aplica multiplicadores a todas tus ganancias de XP:</p>
                <ul className="list-disc list-inside text-[10px] space-y-1 text-white/60">
                    <li><span className="text-orange-400 font-bold">5 DÍAS:</span> Multiplicador 1.25x</li>
                    <li><span className="text-orange-400 font-bold">10 DÍAS:</span> Multiplicador 1.50x</li>
                    <li><span className="text-orange-400 font-bold">20 DÍAS:</span> Multiplicador 1.75x</li>
                    <li><span className="text-orange-400 font-bold">30 DÍAS:</span> Multiplicador Elitista 2.0x</li>
                </ul>
                <p className="text-[9px] text-red-400/80 font-bold italic">⚠️ NOTA: Las sanciones por inasistencia también se multiplican según tu racha actual.</p>
            </div>
        )
    },
    {
        question: "Rangos y Ascensos",
        icon: <Shield className="text-blue-400" size={18} />,
        answer: "Los agentes comienzan como RECLUTAS. Al acumular XP y completar misiones en la Academia, desbloqueas nuevos rangos (ACTIVO, CONSAGRADO, REFERENTE y LÍDER). El ascenso no solo otorga prestigio, sino que desbloquea misiones de mayor nivel y acceso a sectores restringidos."
    },
    {
        question: "Proyecto Nehemías (Juego IQ)",
        icon: <HelpCircle className="text-purple-400" size={18} />,
        answer: "Este es un entrenamiento mental de 100 niveles. Cada nivel superado otorga XP. Si te quedas atorado, puedes usar una 'Clave Bíblica' para desbloquear una pista. Las respuestas correctas demuestran tu evolución cognitiva como agente."
    },
    {
        question: "Arena de Duelos 1v1",
        icon: <Swords className="text-red-500" size={18} />,
        answer: "Duelos directos entre agentes para probar conocimientos. Estos encuentros son 'Protocolo de Honor', lo que significa que no arriesgas tus puntos de XP base. Ganar aumenta tus estadísticas de combate y tu posición en el radar de honor."
    }
];

interface TacticalHelpProps {
    onClose: () => void;
}

const TacticalHelp: React.FC<TacticalHelpProps> = ({ onClose }) => {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

    return (
        <div className="fixed inset-0 z-[100] bg-[#000814]/95 backdrop-blur-xl text-white font-montserrat flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-500/40">
                        <Info className="text-blue-400" size={18} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bebas tracking-widest leading-none">CENTRO DE INTELIGENCIA</h1>
                        <p className="text-[7px] text-blue-400 font-bold uppercase tracking-widest mt-1">Protocolos de Operación</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-full transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-[1.5rem] mb-4">
                    <h3 className="text-[10px] font-bebas tracking-widest text-blue-400 mb-1 uppercase">Terminal de Operaciones</h3>
                    <p className="text-[9px] text-white/70 leading-relaxed font-bold">
                        Documentación esencial para tu desarrollo táctico.
                        Comprender los sistemas de XP, rachas y rangos es vital para escalar en la jerarquía.
                    </p>
                </div>

                <div className="space-y-3">
                    {FAQ_DATA.map((item, index) => (
                        <motion.div
                            key={index}
                            className={`border rounded-3xl transition-all overflow-hidden ${expandedIndex === index ? 'bg-white/5 border-white/20' : 'bg-black/20 border-white/5'}`}
                        >
                            <button
                                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                                className="w-full p-3 flex items-center justify-between gap-3"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-white/5 rounded-lg">
                                        {item.icon}
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-left">{item.question}</span>
                                </div>
                                {expandedIndex === index ? <ChevronUp size={14} className="text-white/40" /> : <ChevronDown size={14} className="text-white/40" />}
                            </button>

                            <AnimatePresence>
                                {expandedIndex === index && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="px-4 pb-4 pt-1"
                                    >
                                        <div className="h-[1px] bg-white/5 mb-3" />
                                        <div className="text-[9px] text-white/60 leading-relaxed font-medium">
                                            {item.answer}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>

                <div className="pt-8 pb-12 flex flex-col items-center gap-4 opacity-50">
                    <div className="w-12 h-12 border border-white/10 rounded-full flex items-center justify-center">
                        <Star size={18} className="text-[#FFB700]" />
                    </div>
                    <p className="text-[8px] font-bold tracking-[0.4em] uppercase">Soli Deo Gloria</p>
                </div>
            </div>
        </div>
    );
};

export default TacticalHelp;
