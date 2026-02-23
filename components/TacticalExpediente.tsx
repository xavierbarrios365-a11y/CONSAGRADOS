import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Agent } from '../types';
import { formatDriveUrl } from './DigitalIdCard';
import TacticalRadar from './TacticalRadar';
import {
    X,
    Target,
    Calendar,
    MessageSquare,
    Shield,
    Zap,
    Star,
    Clock,
    Phone,
    CheckCircle2,
    Circle,
    AlertTriangle,
    History,
    TrendingUp,
    FileText,
    Activity,
    Cpu,
    Sparkles,
    Lock
} from 'lucide-react';

interface TacticalExpedienteProps {
    agent: Agent;
    onClose: () => void;
}

// Helper para el efecto Typewriter
const TypewriterText = ({ text, delay = 0.02, onComplete }: { text: string, delay?: number, onComplete?: () => void }) => {
    const [displayedText, setDisplayedText] = useState('');

    useEffect(() => {
        let i = 0;
        const timer = setInterval(() => {
            setDisplayedText(text.slice(0, i));
            i++;
            if (i > text.length) {
                clearInterval(timer);
                onComplete?.();
            }
        }, delay * 1000);
        return () => clearInterval(timer);
    }, [text]);

    return <span className="font-mono tracking-wide">{displayedText}<motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.5 }}>_</motion.span></span>;
};

const TacticalExpediente: React.FC<TacticalExpedienteProps> = ({ agent, onClose }) => {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoaded(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const isAtRisk = (() => {
        try {
            if (!agent.lastAttendance || agent.lastAttendance === 'N/A') return true;
            let lastDate: Date;
            const raw = agent.lastAttendance as any;
            if (raw && typeof raw === 'object' && typeof raw.getTime === 'function') {
                lastDate = raw;
            } else {
                const val = String(agent.lastAttendance).trim();
                if (!val || val === 'N/A' || val === '') return true;
                const parts = val.split('/');
                lastDate = parts.length === 3
                    ? new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
                    : new Date(val);
            }
            if (isNaN(lastDate.getTime())) return false;
            const diffDays = Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
            return diffDays >= 14;
        } catch {
            return false;
        }
    })();

    const whatsappLink = agent.whatsapp
        ? `https://wa.me/${agent.whatsapp.replace(/\D/g, '')}`
        : null;

    const modalVariants = {
        hidden: { opacity: 0, scale: 0.9, y: 20 },
        visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } }
    } as const;

    return (
        <div className="fixed inset-0 z-[100] bg-[#000810]/98 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            {/* Capas de Post-Procesamiento Global */}
            <div className="absolute inset-0 pointer-events-none z-10 opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>

            <motion.div
                initial="hidden"
                animate="visible"
                variants={modalVariants}
                className="w-full max-w-4xl bg-[#00101a] border border-amber-500/20 rounded-[3rem] shadow-[0_0_100px_rgba(255,183,0,0.1)] overflow-hidden relative max-h-[95vh] flex flex-col md:flex-row"
            >
                {/* DECORACIÓN CORNER TÁCTICA */}
                <div className="absolute top-0 right-0 p-4 opacity-20 transform translate-x-4 -translate-y-4">
                    <div className="w-20 h-20 border-t-4 border-r-4 border-amber-500 rounded-tr-3xl"></div>
                </div>
                <div className="absolute bottom-0 left-0 p-4 opacity-20 transform -translate-x-4 translate-y-4">
                    <div className="w-20 h-20 border-b-4 border-l-4 border-amber-500 rounded-bl-3xl"></div>
                </div>

                {/* SIDEBAR IZQUIERDO: PERFIL Y RADAR */}
                <div className="w-full md:w-80 bg-black/40 border-r border-white/5 p-8 flex flex-col items-center gap-6 relative z-10 overflow-y-auto no-scrollbar">
                    <motion.div
                        initial={{ opacity: 0, rotateY: 90 }}
                        animate={{ opacity: 1, rotateY: 0 }}
                        transition={{ delay: 0.2, duration: 1 }}
                        className="relative"
                    >
                        <div className={`absolute -inset-4 bg-gradient-to-br ${isAtRisk ? 'from-red-500 to-orange-600' : 'from-amber-500 to-yellow-600'} rounded-[3rem] blur-2xl opacity-10 animate-pulse`}></div>
                        <div className="w-44 h-44 rounded-[2.5rem] border-2 border-amber-500/30 p-1.5 bg-[#00101a] shadow-inner relative overflow-hidden group">
                            <img
                                src={formatDriveUrl(agent.photoUrl || '')}
                                alt={agent.name}
                                className="w-full h-full rounded-[2.25rem] object-cover grayscale hover:grayscale-0 transition-all duration-700 hover:scale-110"
                                loading="lazy"
                                onError={(e) => {
                                    const target = e.currentTarget;
                                    if (target.src !== "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png") {
                                        target.src = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";
                                        target.className = "w-full h-full object-cover opacity-20";
                                    }
                                }}
                            />
                            {/* Overlay de HUD sobre la foto */}
                            <div className="absolute inset-0 pointer-events-none border border-white/10 rounded-[2.25rem]"></div>
                            <div className="absolute top-4 left-4 flex gap-1">
                                <div className="w-1 h-1 bg-amber-500 rounded-full animate-ping"></div>
                                <div className="w-1 h-3 bg-amber-500/20 rounded-full"></div>
                            </div>
                        </div>
                    </motion.div>

                    <div className="text-center space-y-2">
                        <motion.h1
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-3xl font-bebas font-black text-white tracking-widest leading-none"
                        >
                            {agent.name}
                        </motion.h1>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.6 }}
                            className="text-[9px] text-amber-500 font-bold uppercase tracking-[0.4em] font-montserrat"
                        >
                            {agent.rank || 'RECLUTA'} // {agent.id}
                        </motion.div>
                    </div>

                    <div className="w-full space-y-4">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 w-full text-center">
                            <p className="text-[7px] text-white/40 font-black uppercase mb-1 tracking-widest">EXPERIENCIA ACUMULADA</p>
                            <p className="text-2xl font-bebas font-black text-amber-500 leading-none">{agent.xp} XP</p>
                        </div>

                        <div className="relative pt-4 flex justify-center">
                            {agent.tacticalStats ? (
                                <TacticalRadar stats={agent.tacticalStats} size={180} />
                            ) : (
                                <div className="py-10 text-center opacity-20 flex flex-col items-center gap-3">
                                    <Cpu size={32} className="animate-spin-slow" />
                                    <p className="text-[8px] font-black uppercase tracking-widest">Calculando Vectores...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* CONTENIDO PRINCIPAL: DOSSIER */}
                <div className="flex-1 flex flex-col min-h-0 relative">
                    {/* Header con Botón Cerrar */}
                    <div className="p-6 md:p-8 flex justify-between items-start border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-20">
                        <div className="space-y-1">
                            <h2 className="text-white font-bebas text-2xl tracking-widest flex items-center gap-3">
                                <span className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/30">
                                    <Lock className="text-amber-500" size={16} />
                                </span>
                                ACCESO CLASIFICADO
                            </h2>
                            <p className="text-[9px] text-amber-500 font-black uppercase tracking-[0.4em] opacity-40">Dossier Militar Nivel S-4 // Consagrados 2026</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 text-white/50 hover:text-white transition-all active:scale-95 group"
                        >
                            <X size={20} className="group-hover:rotate-90 transition-transform" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 no-scrollbar">
                        {/* SECCIÓN IA: EL BRIEFING */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-amber-500/5 border border-amber-500/20 rounded-[2.5rem] p-8 space-y-6 relative overflow-hidden group shadow-inner"
                        >
                            {/* Efectos de HUD IA */}
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Activity size={120} className="text-amber-500" />
                            </div>
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent"></div>

                            <div className="flex items-center gap-3 relative z-10">
                                <div className="w-1.5 h-6 bg-amber-500 rounded-full shadow-[0_0_10px_#ffb700]"></div>
                                <h3 className="text-[12px] text-white font-black uppercase tracking-widest font-bebas flex items-center gap-2">
                                    <Sparkles size={14} className="text-amber-500" />
                                    Analítica del Comando IA
                                </h3>
                            </div>

                            <div className="text-[13px] text-amber-100/80 leading-relaxed relative z-10 font-mono tracking-tight min-h-[80px]">
                                {isLoaded ? (
                                    <TypewriterText text={agent.tacticalSummary || "A la espera de enlace satelital para descargar analítica táctica del activo..."} />
                                ) : (
                                    <span className="opacity-20">Procesando transmisión...</span>
                                )}
                            </div>
                        </motion.div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* HISTORIAL ESTATICO */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-[2px] bg-amber-500/30"></div>
                                    <h3 className="text-[10px] text-white/40 font-black uppercase tracking-widest font-bebas">Registro Operativo</h3>
                                </div>
                                <div className="space-y-4">
                                    <MetricRow label="Última Presencia" value={agent.lastAttendance || 'N/A'} isRisk={isAtRisk} icon={<Clock size={12} />} />
                                    <MetricRow label="Talento Principal" value={agent.talent || 'SIN ASIGNAR'} icon={<Star size={12} />} />
                                    <MetricRow label="Estado Actual" value={agent.status || 'ACTIVO'} icon={<Activity size={12} />} />
                                </div>
                            </div>

                            {/* MISIONES RECIENTES */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-[2px] bg-amber-500/30"></div>
                                    <h3 className="text-[10px] text-white/40 font-black uppercase tracking-widest font-bebas">Progreso de Misiones</h3>
                                </div>
                                <div className="space-y-3">
                                    {agent.weeklyTasks?.slice(0, 3).map((task, i) => (
                                        <motion.div
                                            key={task.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.8 + i * 0.1 }}
                                            className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5"
                                        >
                                            <span className="text-[9px] font-black text-white/70 uppercase truncate max-w-[150px]">{task.title}</span>
                                            {task.completed ? <CheckCircle2 size={14} className="text-green-500" /> : <div className="w-3.5 h-3.5 rounded-full border border-white/20"></div>}
                                        </motion.div>
                                    ))}
                                    {(!agent.weeklyTasks || agent.weeklyTasks.length === 0) && (
                                        <div className="py-4 text-center opacity-20 italic text-[9px]">Sin misiones en curso</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ACCIONES DE COMANDO */}
                        <div className="pt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <motion.a
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                href={whatsappLink || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center justify-center gap-3 p-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${whatsappLink ? 'bg-amber-500 text-[#001f3f] shadow-[0_0_30px_rgba(255,183,0,0.2)]' : 'bg-white/5 border border-white/5 text-white/20 cursor-not-allowed'}`}
                            >
                                <Phone size={16} />
                                Iniciar Enlace Seguro
                            </motion.a>
                            <motion.button
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                className="flex items-center justify-center gap-3 p-5 bg-[#00101a] border border-white/10 text-white/80 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:border-amber-500/50 transition-all"
                            >
                                <MessageSquare size={16} />
                                Enviar Orden Directa
                            </motion.button>
                        </div>
                    </div>

                    {/* FOOTER HUD */}
                    <div className="p-6 bg-black/40 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4 text-[7px] text-white/20 font-black uppercase tracking-[0.4em]">
                            <span>SISTEMA DE VIGILANCIA C26</span>
                            <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                            <span>NIVEL DE ACCESO: {agent.accessLevel || 'RECLUTA'}</span>
                        </div>
                        <div className="flex gap-1 h-2 items-center">
                            {[1, 2, 3, 4, 5, 6, 7].map(i => (
                                <div key={i} className="w-1 h-full bg-amber-500/10 rounded-full overflow-hidden">
                                    <motion.div
                                        animate={{ height: ["0%", "100%", "0%"] }}
                                        transition={{ repeat: Infinity, duration: 2, delay: i * 0.2 }}
                                        className="w-full bg-amber-500/40"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const MetricRow = ({ label, value, icon, isRisk }: { label: string, value: string, icon: any, isRisk?: boolean }) => (
    <div className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-2xl group hover:bg-white/[0.05] transition-colors">
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isRisk ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'} border border-current opacity-60`}>
                {icon}
            </div>
            <span className="text-[8px] text-white/40 font-black uppercase tracking-widest">{label}</span>
        </div>
        <span className={`text-[11px] font-black uppercase tracking-tight ${isRisk ? 'text-red-500 animate-pulse' : 'text-white'}`}>
            {value}
        </span>
    </div>
);

export default TacticalExpediente;

