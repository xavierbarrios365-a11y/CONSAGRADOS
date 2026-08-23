import React from 'react';
import { FileText, Shield, Star, Clock, AlertCircle, CheckCircle, Info, Hash } from 'lucide-react';

interface TacticalDocumentProps {
    title: string;
    content: string;
    xpReward?: number;
    agentName?: string;
    status?: 'PENDIENTE' | 'COMPLETADO' | 'FALLIDO';
    children?: React.ReactNode;
}

const TacticalDocument: React.FC<TacticalDocumentProps> = ({
    title,
    content,
    xpReward = 0,
    agentName = "AGENTE DESCONOCIDO",
    status = 'PENDIENTE',
    children
}) => {
    const today = new Date().toLocaleDateString('es-VE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).toUpperCase();

    return (
        <div className="relative w-full max-w-4xl mx-auto my-6 animate-in fade-in slide-in-from-bottom-6 duration-500 font-montserrat">
            {/* Background Tactical Dossier */}
            <div className="bg-gradient-to-b from-[#001428] via-[#000d1a] to-[#000810] text-white p-6 md:p-10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/10 border-l-4 border-l-[#ffb700] min-h-[600px] relative overflow-hidden">

                {/* Header Information */}
                <div className="flex flex-col md:flex-row justify-between items-start border-b border-white/10 pb-6 mb-8 gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-8 h-8 rounded-xl bg-[#ffb700]/10 border border-[#ffb700]/30 flex items-center justify-center text-[#ffb700]">
                                <Shield size={18} />
                            </div>
                            <h1 className="text-xl md:text-2xl font-black tracking-wider uppercase leading-none font-bebas text-white">
                                PROTOCOLO CONSAGRADOS 2026
                            </h1>
                        </div>
                        <p className="text-[10px] font-bold text-[#ffb700] font-bebas tracking-widest">
                            REGISTRO TÁCTICO: #DOC-{Math.floor(Math.random() * 90000) + 10000}
                        </p>
                        <p className="text-[9px] font-semibold text-white/50">{today}</p>
                    </div>

                    <div className="text-left md:text-right space-y-0.5 bg-black/40 border border-white/10 p-3 rounded-2xl">
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/40 font-bebas">EXPEDIENTE DEL AGENTE</p>
                        <p className="text-xs font-bold text-[#ffb700]">{agentName}</p>
                        <span className="inline-block text-[8px] font-black uppercase px-2 py-0.5 bg-[#ffb700]/10 text-[#ffb700] rounded-full mt-1 border border-[#ffb700]/20 font-bebas">
                            NIVEL DE ACCESO AUTORIZADO
                        </span>
                    </div>
                </div>

                {/* Document Subtitle */}
                <div className="mb-8 pb-4 border-b border-white/5">
                    <span className="text-[9px] font-black uppercase text-[#ffb700] font-bebas tracking-[0.25em] block mb-1">
                        LECCIÓN OPERATIVA
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black tracking-wide uppercase text-white font-bebas leading-tight">
                        {title}
                    </h2>
                </div>

                {/* Main Content Area */}
                <div className="space-y-8 relative">
                    {/* Content Section */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                            <Hash size={14} className="text-[#ffb700]" />
                            <span className="text-xs font-black uppercase tracking-widest text-[#ffb700] font-bebas">
                                BRIEFING & CONTENIDO DE LA LECCIÓN
                            </span>
                        </div>

                        {/* High Contrast HTML Content Container */}
                        <div
                            className="text-sm leading-relaxed text-white/90 space-y-4 font-montserrat prose prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: content }}
                        />
                    </section>

                    {/* Integrated Questions / Children */}
                    {children && (
                        <section className="space-y-6 pt-8 border-t-2 border-white/10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileText size={18} className="text-[#ffb700]" />
                                    <span className="text-sm font-black uppercase tracking-widest text-white font-bebas">
                                        EVALUACIÓN DE CAMPO & ASIGNACIÓN
                                    </span>
                                </div>
                                <div className="text-[10px] font-black uppercase text-[#001f3f] bg-[#ffb700] px-3 py-1.5 rounded-xl font-bebas tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,183,0,0.3)]">
                                    <Star size={12} strokeWidth={3} /> +{xpReward} XP EN JUEGO
                                </div>
                            </div>

                            <div className="space-y-6">
                                {children}
                            </div>
                        </section>
                    )}
                </div>

                {/* Footer / Stamps */}
                <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center md:items-end gap-6">
                    <div className="flex items-center gap-3 opacity-60">
                        <div className="w-10 h-10 rounded-2xl border-2 border-white/20 flex items-center justify-center font-black text-sm font-bebas text-[#ffb700]">
                            OK
                        </div>
                        <div className="text-[9px] font-semibold text-white/70 uppercase leading-snug">
                            RESPALDADO POR EL COMANDO CENTRAL<br />CONSAGRADOS 2026
                        </div>
                    </div>

                    {/* Dynamic Status Stamp */}
                    <div className={`
                        px-5 py-2.5 rounded-2xl font-black text-sm tracking-widest uppercase font-bebas border
                        ${status === 'COMPLETADO' ? 'border-green-500/50 bg-green-500/10 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.2)]' :
                            status === 'FALLIDO' ? 'border-red-500/50 bg-red-500/10 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]' :
                                'border-[#ffb700]/40 bg-[#ffb700]/10 text-[#ffb700]'}
                    `}>
                        {status === 'COMPLETADO' ? '✓ CERTIFICADO APROBADO' :
                            status === 'FALLIDO' ? '✕ RECHAZADO' :
                                '⚡ EN EVALUACIÓN'}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TacticalDocument;
