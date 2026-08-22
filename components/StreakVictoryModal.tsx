import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, ShieldCheck, Sparkles, Share2, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { tacticalSound } from '../utils/soundEffects';

interface StreakVictoryModalProps {
    isOpen: boolean;
    streakCount: number;
    xpAwarded?: number;
    multiplier?: number;
    shieldsLeft?: number;
    shieldUsed?: boolean;
    agentName?: string;
    sedeName?: string;
    onClose: () => void;
    onOpenShareModal?: () => void;
}

export const StreakVictoryModal: React.FC<StreakVictoryModalProps> = ({
    isOpen,
    streakCount,
    xpAwarded = 15,
    multiplier = 1.0,
    shieldsLeft = 0,
    shieldUsed = false,
    agentName = 'Agente',
    sedeName = 'JESÚS ES EL CENTRO',
    onClose,
    onOpenShareModal
}) => {
    useEffect(() => {
        if (isOpen) {
            tacticalSound.playVictoryChime();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // Determinación de nivel de llama
    const getFlameTheme = (count: number) => {
        if (count >= 14) {
            return {
                title: '🔥 FUEGO SAGRADO DIVINO 🔥',
                subtitle: 'MULTIPLICADOR SUPREMO x2.0 ACTIVO',
                color: 'from-purple-500 via-pink-500 to-amber-400',
                glow: 'rgba(236, 72, 153, 0.4)',
                flameColor: 'text-pink-400',
                multiplierLabel: 'x2.0 XP'
            };
        }
        if (count >= 7) {
            return {
                title: '⚡ LLAMA FÉNIX SUPREMA ⚡',
                subtitle: 'ESCUDO DESBLOQUEADO & MULTIPLICADOR x1.5',
                color: 'from-amber-400 via-orange-500 to-red-500',
                glow: 'rgba(245, 158, 11, 0.4)',
                flameColor: 'text-[#ffb700]',
                multiplierLabel: 'x1.5 XP'
            };
        }
        if (count >= 4) {
            return {
                title: '🔥 LLAMA DORADA DE COMBATE 🔥',
                subtitle: 'CONSTANCIA TÁCTICA DEMOSTRADA',
                color: 'from-amber-300 via-yellow-500 to-amber-600',
                glow: 'rgba(234, 179, 8, 0.3)',
                flameColor: 'text-yellow-400',
                multiplierLabel: 'x1.2 XP'
            };
        }
        return {
            title: '🔷 CHISPA INICIAL DE CONSAGRACIÓN 🔷',
            subtitle: 'EL COMIENZO DE UNA DISCIPLINA IMPARABLE',
            color: 'from-blue-400 via-cyan-500 to-indigo-600',
            glow: 'rgba(59, 130, 246, 0.3)',
            flameColor: 'text-cyan-400',
            multiplierLabel: 'x1.0 XP'
        };
    };

    const theme = getFlameTheme(streakCount);

    const handleShareWhatsApp = () => {
        const text = encodeURIComponent(
            `🔥 ¡Aseguré mi Racha Táctica de ${streakCount} Días en Consagrados 2026! ⚔️\n🏛️ Sede: ${sedeName}\n🏆 XP Total: +${xpAwarded} XP\n\n¿Aceptas el desafío? Únete al escuadrón: https://consagrados.vercel.app`
        );
        window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl overflow-hidden">
                
                {/* Partículas de Fondo */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[...Array(20)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{
                                opacity: 1,
                                y: 100,
                                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
                                scale: Math.random() * 0.8 + 0.2
                            }}
                            animate={{
                                y: -400,
                                opacity: 0,
                                rotate: Math.random() * 360
                            }}
                            transition={{
                                duration: Math.random() * 2 + 1.5,
                                repeat: Infinity,
                                delay: Math.random() * 1.5
                            }}
                            className="absolute bottom-0 w-3 h-3 bg-gradient-to-t from-amber-400 to-yellow-200 rounded-full blur-[1px]"
                        />
                    ))}
                </div>

                <motion.div
                    initial={{ scale: 0.7, opacity: 0, y: 30 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.8, opacity: 0, y: 20 }}
                    transition={{ type: "spring", damping: 20, stiffness: 250 }}
                    className="relative w-full max-w-sm bg-[#000e1f] border-2 border-[#ffb700]/40 rounded-[2.5rem] p-6 text-center shadow-[0_0_50px_rgba(255,183,0,0.25)] overflow-hidden font-montserrat"
                >
                    {/* Aura Neón Trasera */}
                    <div
                        className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl opacity-40 pointer-events-none"
                        style={{ backgroundColor: theme.glow }}
                    />

                    {/* Insignia de Sede */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4">
                        <span className="text-[8px] font-black uppercase tracking-widest text-[#ffb700] font-bebas">
                            🏛️ {sedeName}
                        </span>
                    </div>

                    {/* Ícono de Fuego Gigante Animado */}
                    <div className="relative my-3 flex justify-center items-center">
                        <motion.div
                            animate={{
                                scale: [1, 1.15, 1],
                                rotate: [-3, 3, -3]
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="relative"
                        >
                            <div className="p-6 rounded-full bg-white/5 border border-white/10 shadow-[0_0_40px_rgba(255,183,0,0.3)]">
                                <Flame size={72} className={`${theme.flameColor} drop-shadow-[0_0_20px_rgba(255,183,0,0.8)]`} />
                            </div>
                            
                            {/* Medalla del Contador */}
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.3, type: "spring" }}
                                className="absolute -bottom-2 -right-2 bg-gradient-to-br from-[#ffb700] to-orange-600 text-[#001f3f] w-12 h-12 rounded-full flex flex-col items-center justify-center font-black border-2 border-[#000e1f] shadow-xl"
                            >
                                <span className="text-[16px] font-bebas leading-none">{streakCount}</span>
                                <span className="text-[6px] font-black uppercase tracking-tighter font-montserrat">DÍAS</span>
                            </motion.div>
                        </motion.div>
                    </div>

                    {/* Título y Subtítulo */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-1 mt-3"
                    >
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#ffb700] font-bebas">
                            {theme.title}
                        </p>
                        <h2 className="text-2xl font-black uppercase text-white font-bebas tracking-wider leading-none">
                            ¡Racha Asegurada, {agentName.split(' ')[0]}!
                        </h2>
                        <p className="text-[8px] text-white/50 font-bold uppercase tracking-wider">
                            {theme.subtitle}
                        </p>
                    </motion.div>

                    {/* Recompensas Ganadas */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="grid grid-cols-2 gap-2 my-5"
                    >
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                            <div className="flex items-center justify-center gap-1 text-[8px] font-black uppercase tracking-widest text-white/60 mb-1 font-bebas">
                                <Sparkles size={12} className="text-[#ffb700]" /> Mérito XP
                            </div>
                            <p className="text-lg font-black text-[#ffb700] font-bebas">+{xpAwarded} XP</p>
                            <span className="text-[7px] text-white/40 font-bold uppercase">Mult: {theme.multiplierLabel}</span>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                            <div className="flex items-center justify-center gap-1 text-[8px] font-black uppercase tracking-widest text-white/60 mb-1 font-bebas">
                                <ShieldCheck size={12} className="text-blue-400" /> Escudos
                            </div>
                            <p className="text-lg font-black text-blue-400 font-bebas">{shieldsLeft} / 3</p>
                            <span className="text-[7px] text-white/40 font-bold uppercase">Protección</span>
                        </div>
                    </motion.div>

                    {shieldUsed && (
                        <div className="mb-4 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[8px] font-black uppercase text-blue-300">
                            🛡️ ¡Escudo activado automáticamente para salvar tu racha!
                        </div>
                    )}

                    {/* Botones de Acción */}
                    <div className="space-y-2 pt-1">
                        <button
                            onClick={handleShareWhatsApp}
                            className="w-full py-3 bg-gradient-to-r from-[#ffb700] to-yellow-500 text-[#001f3f] text-xs font-black uppercase tracking-widest rounded-2xl shadow-[0_10px_25px_rgba(255,183,0,0.3)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 font-bebas"
                        >
                            <Share2 size={16} /> Compartir en WhatsApp / Redes
                        </button>

                        <button
                            onClick={onClose}
                            className="w-full py-2.5 bg-white/5 text-white/70 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-2xl border border-white/10 hover:bg-white/10 active:scale-[0.98] transition-all font-bebas flex items-center justify-center gap-1"
                        >
                            Continuar Misión <ArrowRight size={12} />
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default StreakVictoryModal;
