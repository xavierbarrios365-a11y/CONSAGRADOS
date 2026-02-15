
import React from 'react';
import { Agent, UserRole } from '../types';
import { formatDriveUrl } from './DigitalIdCard';
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
    FileText
} from 'lucide-react';

interface TacticalExpedienteProps {
    agent: Agent;
    onClose: () => void;
}

const TacticalExpediente: React.FC<TacticalExpedienteProps> = ({ agent, onClose }) => {
    const isAtRisk = (() => {
        try {
            if (!agent.lastAttendance || agent.lastAttendance === 'N/A') return true;
            // Handle Date objects directly
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

    return (
        <div className="fixed inset-0 z-[100] bg-[#000c19]/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
            <div className="w-full max-w-2xl bg-[#001f3f] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col">

                {/* DECORACIÓN TÁCTICA */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#ffb700] to-transparent"></div>
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#ffb700]/5 rounded-full blur-3xl"></div>

                {/* HEADER / CIERRE */}
                <div className="flex justify-between items-center p-6 border-b border-white/5 relative z-10 bg-[#001f3f]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#ffb700]/10 border border-[#ffb700]/30 rounded-lg">
                            <FileText className="text-[#ffb700]" size={18} />
                        </div>
                        <div>
                            <h2 className="text-white font-bebas text-2xl tracking-widest uppercase leading-none">Expediente Táctico</h2>
                            <p className="text-[8px] text-[#ffb700] font-black uppercase tracking-[0.3em] font-montserrat opacity-60">Dossier de Inteligencia S-37</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 text-white/50 hover:text-white transition-all active:scale-95"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 no-scrollbar">

                    {/* SECCIÓN 1: PERFIL PRINCIPAL */}
                    <div className="flex flex-col md:flex-row items-center gap-8 border-b border-white/5 pb-8">
                        <div className="relative group">
                            <div className={`absolute -inset-2 bg-gradient-to-br ${isAtRisk ? 'from-red-500 to-orange-600' : 'from-[#ffb700] to-amber-600'} rounded-[2rem] blur-xl opacity-20 animate-pulse`}></div>
                            <div className="w-40 h-40 rounded-[2rem] border-2 border-white/10 p-1.5 bg-black/40 shadow-inner relative overflow-hidden">
                                <img
                                    src={formatDriveUrl(agent.photoUrl)}
                                    className="w-full h-full rounded-[1.5rem] object-cover grayscale hover:grayscale-0 transition-all duration-700"
                                    onError={(e) => {
                                        e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";
                                        e.currentTarget.className = "w-full h-full object-cover opacity-20";
                                    }}
                                />
                            </div>
                            <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full border shadow-lg text-[9px] font-black uppercase tracking-widest whitespace-nowrap
                                ${isAtRisk ? 'bg-red-500 border-red-400 text-white' : 'bg-[#ffb700] border-amber-400 text-[#001f3f]'}`}>
                                {agent.rank || 'RECLUTA'}
                            </div>
                        </div>

                        <div className="flex-1 text-center md:text-left space-y-4">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bebas font-black text-white tracking-wider uppercase leading-none mb-1">{agent.name}</h1>
                                <p className="text-[10px] text-white/40 font-mono tracking-widest uppercase">ID: {agent.id} | {agent.accessLevel || 'ESTUDIANTE'}</p>
                            </div>

                            <div className="flex flex-wrap justify-center md:justify-start gap-2">
                                <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5 flex items-center gap-2">
                                    <Star size={12} className="text-[#ffb700]" />
                                    <span className="text-[9px] text-white font-black">{agent.xp} XP TOTAL</span>
                                </div>
                                <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5 flex items-center gap-2">
                                    <TrendingUp size={12} className="text-blue-400" />
                                    <span className="text-[9px] text-white font-black">{agent.streakCount || 0} DÍAS DE RACHA</span>
                                </div>
                                {isAtRisk && (
                                    <div className="px-4 py-2 bg-red-500/10 rounded-xl border border-red-500/30 flex items-center gap-2 animate-pulse">
                                        <AlertTriangle size={12} className="text-red-500" />
                                        <span className="text-[9px] text-red-500 font-black tracking-widest">ALERTA DE DESERCIÓN</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 2: DATOS HISTÓRICOS (EL CORAZÓN DEL EXPEDIENTE) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-black/20 rounded-[2rem] border border-white/5 p-6 space-y-6">
                            <div className="flex items-center gap-3">
                                <Calendar size={16} className="text-[#ffb700]" />
                                <h3 className="text-[10px] text-white font-black uppercase tracking-widest font-bebas">Historial de Registro</h3>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                    <div className="flex flex-col">
                                        <span className="text-[7px] text-white/40 font-black uppercase tracking-widest">Ingreso al Sistema</span>
                                        <span className="text-[11px] text-white font-bold">{agent.joinedDate || 'S/D'}</span>
                                    </div>
                                    <Shield size={14} className="text-white/20" />
                                </div>
                                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                    <div className="flex flex-col">
                                        <span className="text-[7px] text-white/40 font-black uppercase tracking-widest">Última Presencia</span>
                                        <span className={`text-[11px] font-bold ${isAtRisk ? 'text-red-500' : 'text-green-500'}`}>
                                            {agent.lastAttendance || 'SIN REGISTRO'}
                                        </span>
                                    </div>
                                    <Clock size={14} className="text-white/20" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[7px] text-white/40 font-black uppercase tracking-widest mb-2">Estado de Operatividad</span>
                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-1000 shadow-lg ${isAtRisk ? 'bg-red-500 shadow-red-900/50' : 'bg-green-500 shadow-green-900/50'}`}
                                            style={{ width: isAtRisk ? '30%' : '100%' }}
                                        />
                                    </div>
                                    <p className="text-[8px] text-white/30 mt-2 font-bold uppercase">
                                        {isAtRisk ? 'Agente en fase de desconexión' : 'Agente plenamente operativo'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-black/20 rounded-[2rem] border border-white/5 p-6 space-y-6">
                            <div className="flex items-center gap-3">
                                <Zap size={16} className="text-[#ffb700]" />
                                <h3 className="text-[10px] text-white font-black uppercase tracking-widest font-bebas">Análisis Académico</h3>
                            </div>

                            <div className="space-y-4">
                                {agent.weeklyTasks?.map(task => (
                                    <div key={task.id} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                                        {task.completed ? (
                                            <CheckCircle2 size={16} className="text-green-500" />
                                        ) : (
                                            <Circle size={16} className="text-white/20" />
                                        )}
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${task.completed ? 'text-white' : 'text-white/40'}`}>
                                            {task.title}
                                        </span>
                                    </div>
                                ))}
                                {(!agent.weeklyTasks || agent.weeklyTasks.length === 0) && (
                                    <div className="py-4 text-center opacity-30">
                                        <p className="text-[8px] font-black uppercase tracking-widest">Cargando misiones...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 3: RESUMEN IA */}
                    <div className="bg-indigo-600/5 border border-indigo-500/20 rounded-[2rem] p-6 space-y-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-5">
                            <Target size={120} className="text-indigo-500" />
                        </div>
                        <div className="flex items-center gap-3 relative z-10">
                            <History size={16} className="text-indigo-400" />
                            <h3 className="text-[10px] text-indigo-400 font-black uppercase tracking-widest font-bebas">Informe Neuronal Táctico</h3>
                        </div>
                        <p className="text-[11px] text-indigo-100/70 italic leading-relaxed relative z-10 font-montserrat">
                            {agent.tacticalSummary || '"Resumen táctico no disponible en esta frecuencia. Requiere actualización mediante el Nodo de Inteligencia."'}
                        </p>
                    </div>

                    {/* SECCIÓN 4: ACCIÓN DIRECTA / CONTACTO */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <a
                            href={whatsappLink || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center justify-center gap-3 p-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${whatsappLink ? 'bg-green-600/10 border border-green-500/30 text-green-500 hover:bg-green-600/20 active:scale-95 shadow-xl shadow-green-900/10' : 'bg-white/5 border border-white/5 text-white/20 cursor-not-allowed'}`}
                        >
                            <Phone size={16} />
                            Contactar vía WhatsApp
                        </a>
                        <button
                            className="flex items-center justify-center gap-3 p-5 bg-white/5 border border-white/5 text-white/60 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
                        >
                            <MessageSquare size={16} />
                            Enviar Misión Directa
                        </button>
                    </div>

                </div>

                {/* FOOTER */}
                <div className="p-4 bg-black/40 border-t border-white/5 text-center">
                    <p className="text-[7px] text-white/20 font-black uppercase tracking-[0.4em]">Consagrados Armed Force • Surveillance System 2026</p>
                </div>
            </div>
        </div>
    );
};

export default TacticalExpediente;
