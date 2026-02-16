import React, { useState, useEffect } from 'react';
import {
    Shield, Activity, Cpu, Target, Zap,
    ChevronRight, RefreshCw, Trophy,
    GraduationCap, Award, Flame, AlertCircle
} from 'lucide-react';
import { Agent, NewsFeedItem, UserRole } from '../types';
import { fetchNewsFeed } from '../services/sheetsService';

interface NewsFeedProps {
    onActivity?: () => void;
    headlines?: string[];
    agents?: Agent[];
}

const TACTICAL_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    'CURSO_COMPLETADO': { icon: <GraduationCap size={16} />, color: '#3b82f6', label: 'ACADEMIA' },
    'ASCENSO': { icon: <Shield size={16} />, color: '#f59e0b', label: 'ASCENSO' },
    'CERTIFICADO': { icon: <Award size={16} />, color: '#8b5cf6', label: 'CERTIFICACIÓN' },
    'RACHA': { icon: <Flame size={16} />, color: '#ef4444', label: 'CONSAGRACIÓN' },
    'RANKING': { icon: <Trophy size={16} />, color: '#fbbf24', label: 'RANKING' },
    'TAREA': { icon: <Target size={16} />, color: '#22c55e', label: 'MISIÓN' },
    'DESPLIEGUE': { icon: <Cpu size={16} />, color: '#ffb700', label: 'LOGÍSTICA' },
    'OPERACION': { icon: <Activity size={16} />, color: '#00ffff', label: 'OPERACIÓN' },
};

const IntelFeed: React.FC<NewsFeedProps> = ({ onActivity, headlines = [], agents = [] }) => {
    const [news, setNews] = useState<NewsFeedItem[]>([]);
    const [loading, setLoading] = useState(true);

    const loadNews = async () => {
        setLoading(true);
        try {
            const data = await fetchNewsFeed();
            // Filter out system actors or specific ranks if needed
            setNews(data || []);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { loadNews(); }, []);

    if (loading) {
        return (
            <div className="space-y-4 p-4 bg-black/20 rounded-3xl border border-white/5 animate-pulse">
                <div className="h-4 w-32 bg-white/5 rounded-full" />
                <div className="space-y-2">
                    {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white/5 rounded-2xl w-full" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-700">
            {/* Intel Header */}
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Activity size={18} className="text-[#ffb700] animate-pulse" />
                        <div className="absolute inset-0 bg-[#ffb700]/20 blur-sm animate-pulse rounded-full" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[12px] font-black text-white uppercase tracking-[0.2em] font-bebas leading-tight">Intel Feed</span>
                        <span className="text-[7px] font-black text-[#ffb700]/60 uppercase tracking-[0.3em] font-montserrat">Centro de Inteligencia</span>
                    </div>
                </div>
                <button
                    onClick={loadNews}
                    className="p-2 bg-white/5 hover:bg-[#ffb700]/10 border border-white/10 rounded-xl text-white/40 hover:text-[#ffb700] transition-all active:rotate-180 duration-500"
                >
                    <RefreshCw size={14} />
                </button>
            </div>

            {/* Tactical Stream */}
            <div className="space-y-2 relative">
                {/* Decorative side line */}
                <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-[#ffb700]/40 via-white/5 to-transparent ml-1" />

                {news.length > 0 ? (
                    news.slice(0, 10).map((item, idx) => {
                        const config = TACTICAL_CONFIG[item.type] || { icon: <AlertCircle size={16} />, color: '#9ca3af', label: 'NOTIFICACIÓN' };

                        return (
                            <div
                                key={item.id || idx}
                                className="group relative ml-4 p-4 bg-white/[0.02] hover:bg-[#ffb700]/[0.05] border border-white/5 hover:border-[#ffb700]/20 rounded-2xl transition-all duration-300 overflow-hidden"
                            >
                                {/* Scanline Effect on Hover */}
                                <div className="absolute inset-x-0 top-0 h-[1px] bg-[#ffb700]/10 group-hover:animate-scanline pointer-events-none" />

                                <div className="flex items-start gap-4">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:scale-110"
                                        style={{
                                            backgroundColor: `${config.color}15`,
                                            border: `1px solid ${config.color}30`,
                                            color: config.color
                                        }}
                                    >
                                        {config.icon}
                                    </div>

                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/40 uppercase tracking-widest">
                                                {config.label}
                                            </span>
                                            <span className="text-[7px] text-white/20 font-black uppercase tracking-wider">{item.date}</span>
                                        </div>
                                        <p className="text-[11px] text-white/80 font-bold leading-tight line-clamp-2 uppercase tracking-wide font-montserrat group-hover:text-white transition-colors">
                                            {item.message}
                                        </p>
                                    </div>

                                    <ChevronRight size={14} className="text-white/5 group-hover:text-[#ffb700]/40 transition-all mt-2" />
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="p-12 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-3xl">
                        <Zap size={24} className="mx-auto text-white/5 mb-3" />
                        <p className="text-[9px] text-white/20 font-black uppercase tracking-[0.2em]">Silencio Radial en el Canal</p>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes scanline {
                    0% { transform: translateY(0); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateY(80px); opacity: 0; }
                }
                .animate-scanline {
                    animation: scanline 2s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default IntelFeed;
