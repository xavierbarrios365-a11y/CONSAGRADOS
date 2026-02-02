import React from 'react';
import { Trophy, Shield, Award, Target } from 'lucide-react';

interface TacticalCertificateProps {
    agentName: string;
    courseTitle: string;
    date: string;
    onClose: () => void;
}

const TacticalCertificate: React.FC<TacticalCertificateProps> = ({ agentName, courseTitle, date, onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in">
            {/* Controls */}
            <div className="absolute top-8 right-8 flex gap-4 z-[110]">
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

            {/* The Certificate Canvas - Designed to look like the Brandbook sheets */}
            <div id="certificate-content" className="relative bg-[#0a0a0a] w-full max-w-[210mm] aspect-[210/297] md:aspect-[297/210] overflow-hidden border-[10px] border-[#1a1a1a] shadow-2xl flex flex-col md:flex-row print:m-0 print:border-none">

                {/* Left Military Stripe / Tech Bar */}
                <div className="w-full md:w-16 bg-[#001f3f] flex flex-row md:flex-col items-center justify-center gap-8 py-4 md:py-10 border-b md:border-b-0 md:border-r border-[#FFB700]/30">
                    <div className="w-1 h-32 bg-[#FFB700] hidden md:block opacity-50" />
                    <p className="font-bebas text-amber-500 text-3xl md:-rotate-90 whitespace-nowrap tracking-[0.5em] opacity-30 select-none">
                        CONSAGRADOS ACADEMY
                    </p>
                    <div className="w-1 flex-grow bg-white/10 hidden md:block" />
                    <Shield className="text-[#FFB700] mb-0 md:mb-4" size={24} />
                    <div className="technical text-[6px] text-[#FFB700] rotate-0 md:-rotate-90 whitespace-nowrap opacity-50 tracking-widest">
                        CONFIDENTIAL // V37-CORE
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 relative p-10 md:p-20 flex flex-col justify-between overflow-hidden">
                    {/* Background Tech Watermark */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none w-full flex justify-center">
                        <h1 className="text-[20rem] font-black leading-none select-none tracking-tighter">C</h1>
                    </div>

                    {/* Header */}
                    <div className="relative">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="h-[2px] w-12 bg-[#FFB700]"></div>
                            <span className="text-[#FFB700] font-black uppercase tracking-[0.3em] text-[10px]">Doctrina de la Excelencia</span>
                        </div>
                        <h1 className="font-bebas text-white text-6xl md:text-8xl leading-none tracking-tight">
                            CERTIFICADO DE<br />
                            <span className="text-[#FFB700]">COMPETENCIA TÁCTICA</span>
                        </h1>
                    </div>

                    {/* Body */}
                    <div className="relative py-12 md:py-20">
                        <p className="font-oswald text-gray-400 uppercase tracking-widest text-sm mb-4">Se otorga con honor el presente reconocimiento al Agente:</p>
                        <h2 className="font-bebas text-6xl md:text-7xl text-white mb-8 border-b-4 border-[#FFB700] inline-block pb-2 animate-in slide-in-from-left duration-1000">
                            {agentName}
                        </h2>

                        <div className="max-w-xl">
                            <p className="text-gray-300 text-base md:text-lg font-medium leading-relaxed mb-6">
                                Por haber demostrado resiliencia, disciplina y excelencia operativa durante la compleción exitosa de la unidad de entrenamiento nivel élite:
                            </p>
                            <div className="bg-[#1a1a1a] p-6 border-l-4 border-[#FFB700]">
                                <h3 className="font-oswald text-2xl md:text-3xl text-white uppercase tracking-wider">{courseTitle}</h3>
                                <p className="text-[#FFB700] text-[10px] font-black uppercase tracking-widest mt-2">Estado: EGRESADO CON HONOR // 100% COMPLETADO</p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="relative flex flex-col md:flex-row justify-between items-end md:items-center gap-8">
                        <div className="space-y-2 order-2 md:order-1">
                            <div className="flex items-center gap-3">
                                <div className="bg-[#FFB700] p-1.5 rounded-lg text-[#001f3f]">
                                    <Award size={20} />
                                </div>
                                <div className="font-bebas text-2xl text-white tracking-widest">VALIDACIÓN ACADÉMICA</div>
                            </div>
                            <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">
                                FECHA DE EMISIÓN: {date} // ID DE REGISTRO: CSA-{(Math.random() * 10000).toFixed(0)}
                            </p>
                        </div>

                        <div className="text-right order-1 md:order-2">
                            <p className="font-oswald text-[#FFB700] text-3xl font-black italic tracking-widest opacity-80 mb-1">#NOESPORVISTA</p>
                            <p className="text-gray-600 text-[8px] font-black uppercase tracking-widest">
                                EST. 2026 // TUREN, VENEZUELA
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tech Deco Elements */}
                <div className="absolute top-0 right-0 p-8 flex gap-2 opacity-20 hidden md:flex">
                    <Target size={12} className="text-white" />
                    <div className="w-12 h-[1px] bg-white mt-1.5" />
                </div>
                <div className="absolute bottom-10 left-20 opacity-[0.05] font-mono text-[8px] text-white space-y-1 hidden md:block">
                    <div>SYSTEM://CONSAGRADOS-CORE_V37</div>
                    <div>ENCRYPTION://AES-256-TACTICAL</div>
                    <div>AUTHORIZATION://DIRECTOR_OVERRIDE</div>
                </div>
            </div>
        </div>
    );
};

export default TacticalCertificate;
