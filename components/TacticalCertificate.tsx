import React from 'react';
import { Trophy, Shield, Award, Target, Star, CheckCircle } from 'lucide-react';
import { formatDriveUrl } from './DigitalIdCard';

interface TacticalCertificateProps {
    agentName: string;
    courseTitle: string;
    date: string;
    onClose: () => void;
}

const OFFICIAL_LOGO = "1DYDTGzou08o0NIPuCPH9JvYtaNFf2X5f";

const TacticalCertificate: React.FC<TacticalCertificateProps> = ({ agentName, courseTitle, date, onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in overflow-y-auto">
            {/* Controls */}
            <div className="fixed top-8 right-8 flex gap-4 z-[110] print:hidden">
                <button
                    onClick={() => window.print()}
                    className="px-6 py-3 bg-[#FFB700] text-[#001f3f] font-black uppercase text-[10px] rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,183,0,0.3)]"
                >
                    Guardar / Imprimir
                </button>
                <button
                    onClick={onClose}
                    className="px-6 py-3 bg-white/10 text-white font-black uppercase text-[10px] rounded-xl border border-white/10 hover:bg-white/20 transition-all"
                >
                    Cerrar
                </button>
            </div>

            {/* The Certificate Canvas - Horizontal A4 format */}
            <div id="certificate-content" className="relative bg-[#001f3f] w-full max-w-[297mm] aspect-[297/210] overflow-hidden border-[15px] border-double border-[#FFB700]/50 shadow-2xl flex flex-col p-12 md:p-16 print:m-0 print:border-[10px] print:shadow-none">

                {/* Formal Border Frame (Inner) */}
                <div className="absolute inset-4 border border-[#FFB700]/30 pointer-events-none" />

                {/* Decorative Corners */}
                <div className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 border-[#FFB700] opacity-50" />
                <div className="absolute top-8 right-8 w-12 h-12 border-t-2 border-r-2 border-[#FFB700] opacity-50" />
                <div className="absolute bottom-8 left-8 w-12 h-12 border-b-2 border-l-2 border-[#FFB700] opacity-50" />
                <div className="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 border-[#FFB700] opacity-50" />

                {/* Header Section */}
                <div className="relative flex justify-between items-start mb-12">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Shield className="text-[#FFB700]" size={32} />
                            <div className="h-px w-24 bg-gradient-to-r from-[#FFB700] to-transparent" />
                        </div>
                        <h1 className="font-bebas text-white text-5xl md:text-7xl leading-none tracking-tight">
                            DIPLOMA DE<br />
                            <span className="text-[#FFB700]">EXCELENCIA TÁCTICA</span>
                        </h1>
                    </div>

                    {/* Brand Logo */}
                    <div className="flex flex-col items-end gap-2">
                        <img
                            src={formatDriveUrl(OFFICIAL_LOGO)}
                            className="w-24 md:w-32 object-contain filter brightness-0 invert"
                            alt="Logo Consagrados"
                        />
                        <p className="font-bebas text-[10px] text-white/40 tracking-[0.4em] mr-2">SISTEMA CORE V.37</p>
                    </div>
                </div>

                {/* Body Content */}
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 relative">
                    {/* Watermark Logo */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                        <img src={formatDriveUrl(OFFICIAL_LOGO)} className="w-[400px] h-[400px] object-contain" alt="" />
                    </div>

                    <div className="space-y-2">
                        <p className="font-oswald text-gray-400 uppercase tracking-[0.3em] text-[10px] md:text-xs">Este reconocimiento se otorga formalmente al Agente:</p>
                        <h2 className="font-bebas text-6xl md:text-8xl text-white tracking-widest drop-shadow-lg scale-y-110">
                            {agentName}
                        </h2>
                        <div className="h-px w-full max-w-2xl bg-gradient-to-r from-transparent via-[#FFB700] to-transparent mx-auto mt-4" />
                    </div>

                    <div className="max-w-3xl space-y-4">
                        <p className="text-gray-300 text-sm md:text-lg font-medium leading-relaxed uppercase tracking-wide">
                            Por haber demostrado resiliencia excepcional, disciplina inquebrantable y superioridad técnica durante la compleción exitosa de la unidad de entrenamiento táctico:
                        </p>
                        <div className="inline-block px-8 py-3 bg-white/5 border border-white/10 rounded-lg relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-r from-[#FFB700]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <h3 className="font-oswald text-2xl md:text-3xl text-[#FFB700] uppercase tracking-wider relative z-10">{courseTitle}</h3>
                        </div>
                    </div>
                </div>

                {/* Footer / Signatures Section */}
                <div className="mt-12 flex justify-between items-end">
                    {/* Left: Metadata */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 text-white/60">
                            <Award size={20} className="text-[#FFB700]" />
                            <span className="text-[10px] font-black uppercase tracking-widest font-bebas">Validación Académica de Élite</span>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">FECHA DE EMISIÓN: {date}</p>
                            <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">ID DE REGISTRO: CSA-{(Math.random() * 10000).toFixed(0)}</p>
                            <p className="text-[8px] text-[#FFB700] font-black uppercase tracking-widest mt-2 flex items-center gap-2">
                                <CheckCircle size={10} /> AUTENTICIDAD VERIFICADA POR OMNI AI
                            </p>
                        </div>
                    </div>

                    {/* Center: Signatures */}
                    <div className="flex gap-20 items-end pb-4 hidden md:flex">
                        <div className="text-center space-y-2">
                            <div className="w-48 h-px bg-white/20 mx-auto" />
                            <p className="text-[8px] text-white/50 font-black uppercase tracking-widest">Director de Academia</p>
                        </div>
                        <div className="text-center space-y-2">
                            <div className="w-48 h-px bg-white/20 mx-auto" />
                            <p className="text-[8px] text-white/50 font-black uppercase tracking-widest">Comandante General</p>
                        </div>
                    </div>

                    {/* Right: Slogan & Location */}
                    <div className="text-right">
                        <div className="flex flex-col items-end">
                            <div className="flex gap-1 mb-2">
                                <Star size={12} className="text-[#FFB700]" />
                                <Star size={12} className="text-[#FFB700]" />
                                <Star size={12} className="text-[#FFB700]" />
                                <Star size={12} className="text-[#FFB700]" />
                                <Star size={12} className="text-[#FFB700]" />
                            </div>
                            <p className="font-oswald text-[#FFB700] text-3xl font-black italic tracking-[0.2em] mb-1">#NOESPORVISTA</p>
                            <p className="text-white/40 text-[8px] font-black uppercase tracking-[0.3em]">
                                TUREN, ESTADO PORTUGUESA // 2026
                            </p>
                        </div>
                    </div>
                </div>

                {/* Technical Overlay */}
                <div className="absolute top-1/2 left-0 h-32 w-1 bg-gradient-to-b from-transparent via-[#FFB700]/20 to-transparent" />
                <div className="absolute top-1/2 right-0 h-32 w-1 bg-gradient-to-b from-transparent via-[#FFB700]/20 to-transparent" />
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        size: A4 landscape;
                        margin: 0;
                    }
                    body {
                        background: #001f3f !important;
                        -webkit-print-color-adjust: exact;
                    }
                    #certificate-content {
                        width: 100vw !important;
                        height: 100vh !important;
                        max-width: none !important;
                        border-width: 20px !important;
                    }
                }
            `}} />
        </div>
    );
};


export default TacticalCertificate;
