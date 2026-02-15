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
        <div className="relative w-full max-w-4xl mx-auto my-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Background Paper Effect */}
            <div className="bg-[#f0f0f0] text-black p-8 md:p-12 rounded-sm shadow-[20px_20px_60px_rgba(0,0,0,0.5),-1px_-1px_5px_rgba(255,255,255,0.1)] border-l-8 border-[#2d3436] min-h-[800px] relative overflow-hidden font-mono">

                {/* Subtle Grid Pattern Overlay */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                {/* Header Information */}
                <div className="flex flex-col md:flex-row justify-between items-start border-b-2 border-black/20 pb-6 mb-8 gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <Shield size={24} className="text-black" />
                            <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">PROTOCOLO CONSAGRADOS</h1>
                        </div>
                        <p className="text-[10px] font-bold">REGISTRO: #TACT-{Math.floor(Math.random() * 90000) + 10000}</p>
                        <p className="text-[10px] font-bold">FECHA: {today}</p>
                    </div>
                    <div className="text-right space-y-1 border-2 border-black p-3 rounded-sm bg-black/5">
                        <p className="text-[12px] font-black uppercase">EXPEDIENTE DEL AGENTE</p>
                        <p className="text-[14px] font-bold underline">{agentName}</p>
                        <p className="text-[9px] font-bold mt-1">NIVEL DE ACCESO: RESTRINGIDO</p>
                    </div>
                </div>

                {/* Document Subtitle */}
                <div className="mb-8 relative">
                    <div className="bg-black text-white px-4 py-2 inline-block skew-x-[-10deg] mb-2">
                        <h2 className="text-xl font-bold tracking-widest uppercase italic">{title}</h2>
                    </div>
                    <div className="h-0.5 w-full bg-black/10"></div>
                </div>

                {/* Main Content Area */}
                <div className="space-y-10 relative">

                    {/* Content Section */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-black/10 pb-1">
                            <Hash size={14} />
                            <span className="text-xs font-black">BRIEFING OPERATIVO</span>
                        </div>
                        <div
                            className="text-sm leading-relaxed text-gray-800 space-y-4"
                            dangerouslySetInnerHTML={{ __html: content }}
                        />
                    </section>

                    {/* Integrated Questions / Children */}
                    {children && (
                        <section className="space-y-6 pt-6 border-t-2 border-dashed border-black/20">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileText size={16} />
                                    <span className="text-xs font-black uppercase tracking-widest">EVALUACIÓN DE CAMPO</span>
                                </div>
                                <div className="text-[10px] font-bold bg-black/10 px-2 py-1 flex items-center gap-1">
                                    <Star size={10} /> +{xpReward} XP ASIGNADOS
                                </div>
                            </div>

                            <div className="space-y-8">
                                {children}
                            </div>
                        </section>
                    )}
                </div>

                {/* Footer / Stamps */}
                <div className="mt-20 pt-10 border-t-2 border-black/10 flex flex-col md:flex-row justify-between items-end gap-10">
                    <div className="space-y-4 opacity-70">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full border-4 border-black/20 flex items-center justify-center font-black text-2xl">
                                OK
                            </div>
                            <div className="text-[9px] font-bold uppercase leading-tight">
                                RESPALDADO POR<br />CONSEJO TÁCTICO<br />DE CONSAGRADOS
                            </div>
                        </div>
                        <p className="text-[8px] font-bold max-w-[250px]">
                            EL CONTENIDO DE ESTE DOCUMENTO ES ESTRICTAMENTE CONFIDENCIAL Y PARA EL USO EXCLUSIVO DE LOS AGENTES AUTORIZADOS.
                        </p>
                    </div>

                    {/* Dynamic Status Stamp */}
                    <div className={`
                        -rotate-[15deg] border-4 p-4 rounded-lg font-black text-3xl tracking-widest uppercase shadow-sm
                        ${status === 'COMPLETADO' ? 'border-green-700 text-green-700' :
                            status === 'FALLIDO' ? 'border-red-700 text-red-700' :
                                'border-blue-800/40 text-blue-800/40'}
                    `}>
                        {status === 'COMPLETADO' ? 'APROBADO' :
                            status === 'FALLIDO' ? 'RECHAZADO' :
                                'EN TRAMITE'}
                    </div>
                </div>

                {/* Subtle paper edges decorations */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-black/5 -rotate-45 translate-x-16 -translate-y-16 pointer-events-none"></div>
                <div className="absolute bottom-4 left-4 text-[10px] font-bold tracking-[0.5em] opacity-20 pointer-events-none -rotate-90 origin-left">
                    CONSAGRADOS_OFFICIAL_RECORD_2026
                </div>
            </div>

            {/* Document Shadow Depth */}
            <div className="absolute -z-10 inset-0 translate-x-3 translate-y-3 bg-black/30 blur-xl"></div>
        </div>
    );
};

export default TacticalDocument;
