import React from 'react';
import { motion } from 'framer-motion';
import { Agent } from '../types';
import TacticalRadar from './TacticalRadar';
import {
    Shield,
    Target,
    Zap,
    Activity,
    TrendingUp,
    CheckCircle2,
    FileText,
    Cpu,
    Brain,
    History,
    Star
} from 'lucide-react';

interface TacticalProfileDetailProps {
    agent: Agent;
}

const TacticalProfileDetail: React.FC<TacticalProfileDetailProps> = ({ agent }) => {
    return (
        <div className="w-full max-w-2xl mx-auto mt-12 space-y-8 pb-20 px-4">
            {/* Header Seccional */}
            <div className="flex items-center gap-4">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-amber-500/30"></div>
                <h3 className="text-amber-500 font-bebas text-2xl tracking-[0.3em] uppercase">Expediente de Inteligencia</h3>
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-amber-500/30"></div>
            </div>

            {/* Grid de Métricas Técnicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Bloque de Análisis IA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="md:col-span-2 bg-amber-500/5 border border-amber-500/20 rounded-3xl p-8 relative overflow-hidden group shadow-2xl"
                >
                    <div className="absolute top-0 right-0 p-6 opacity-5">
                        <Brain size={120} className="text-amber-500" />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-3">
                            <Cpu size={18} className="text-amber-500" />
                            <h4 className="text-[10px] text-white/40 font-black uppercase tracking-[0.4em]">Reporte de Evaluación Técnica</h4>
                        </div>
                        <p className="text-[14px] text-amber-50/90 leading-relaxed font-mono tracking-tight first-letter:text-3xl first-letter:font-bebas first-letter:text-amber-500 first-letter:mr-2">
                            {agent.tacticalSummary || "Sin análisis de profundidad disponible. Se requiere una re-evaluación para generar el dossier técnico."}
                        </p>
                    </div>
                </motion.div>

                {/* Radar Detallado */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="bg-black/40 border border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center space-y-4 shadow-xl"
                >
                    <h4 className="text-[9px] text-white/30 font-black uppercase tracking-widest self-start mb-2">Vectores de Capacidad</h4>
                    {agent.tacticalStats ? (
                        <TacticalRadar stats={agent.tacticalStats} size={220} />
                    ) : (
                        <div className="h-[220px] flex flex-col items-center justify-center opacity-20">
                            <Activity size={40} className="animate-pulse mb-2" />
                            <p className="text-[8px] font-black uppercase tracking-widest">Sin Datos</p>
                        </div>
                    )}
                </motion.div>

                {/* Desglose de Desempeño */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="bg-black/40 border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl"
                >
                    <h4 className="text-[9px] text-white/30 font-black uppercase tracking-widest mb-4">Métricas de Campo</h4>
                    <div className="space-y-4">
                        <DetailRow icon={<Star size={14} className="text-amber-500" />} label="XP Acumulada" value={`${agent.xp} Puntos`} />
                        <DetailRow icon={<Target size={14} className="text-indigo-500" />} label="Rango Táctico" value={agent.rank} />
                        <DetailRow icon={<Zap size={14} className="text-yellow-500" />} label="Talento Activo" value={agent.talent} />
                        <DetailRow icon={<CheckCircle2 size={14} className="text-green-500" />} label="Estado de Servicio" value={agent.status} />
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                            <History size={12} className="text-white/20" />
                            <p className="text-[8px] text-white/20 font-black uppercase tracking-widest">Última Actualización</p>
                        </div>
                        <p className="text-[10px] text-white/40 font-mono tracking-widest">
                            {agent.lastAiUpdate ? new Date(agent.lastAiUpdate).toLocaleString() : 'PENDIENTE'}
                        </p>
                    </div>
                </motion.div>
            </div>

            {/* Footer del Reporte */}
            <div className="text-center space-y-4 pt-8">
                <div className="flex justify-center gap-2 opacity-10">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-1 h-3 bg-white rounded-full"></div>)}
                </div>
                <p className="text-[8px] text-white/10 font-black uppercase tracking-[0.5em]">
                    Dossier Generado por Núcleo de Inteligencia Consagrados 2026
                </p>
            </div>
        </div>
    );
};

const DetailRow = ({ icon, label, value }: { icon: any, label: string, value: string }) => (
    <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] transition-colors">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-white/5 rounded-lg">
                {icon}
            </div>
            <span className="text-[8px] text-white/40 font-black uppercase tracking-widest">{label}</span>
        </div>
        <span className="text-[10px] text-white font-black uppercase tracking-tight">{value}</span>
    </div>
);

export default TacticalProfileDetail;
