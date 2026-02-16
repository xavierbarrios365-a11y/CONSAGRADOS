import React, { useState, useEffect } from 'react';
import { Newspaper, Trophy, GraduationCap, Award, Flame, Star, ClipboardCheck, RefreshCw } from 'lucide-react';
import { Agent, NewsFeedItem, UserRole } from '../types';
import { fetchNewsFeed } from '../services/sheetsService';

interface NewsFeedProps {
    onActivity?: () => void;
    headlines?: string[];
    agents?: Agent[];
}

const NEWS_ICONS: Record<string, { icon: string; color: string }> = {
    'CURSO_COMPLETADO': { icon: '🎓', color: '#3b82f6' },
    'ASCENSO': { icon: '🎖️', color: '#f59e0b' },
    'CERTIFICADO': { icon: '📜', color: '#8b5cf6' },
    'RACHA': { icon: '🔥', color: '#ef4444' },
    'RANKING': { icon: '🏆', color: '#fbbf24' },
    'TAREA': { icon: '✅', color: '#22c55e' },
    'HEADLINE': { icon: '📢', color: '#ffb700' },
};

const NewsFeed: React.FC<NewsFeedProps> = ({ onActivity, headlines = [], agents = [] }) => {
    const [news, setNews] = useState<NewsFeedItem[]>([]);
    const [loading, setLoading] = useState(true);

    const loadNews = async () => {
        setLoading(true);
        try {
            const data = await fetchNewsFeed();
            // Filtrar noticias para excluir LIDERES y DIRECTORES
            const filteredNews = (data || []).filter(item => {
                if (!item.agentId) return true; // Noticias globales
                const agent = agents.find(a => String(a.id) === String(item.agentId));
                if (!agent) return true; // No encontramos al agente, lo dejamos por si acaso o filtramos? Mejor dejarlo.

                const isLeaderRank = agent.rank === 'LÍDER' || agent.rank === 'LIDER';
                const isLeaderRole = agent.userRole === UserRole.LEADER || agent.userRole === UserRole.DIRECTOR;
                return !isLeaderRank && !isLeaderRole;
            });
            setNews(filteredNews);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { loadNews(); }, []);

    if (loading) {
        return (
            <div className="glass-card border border-white/5 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                    <Newspaper size={16} className="text-[#ffb700]" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Noticias</span>
                </div>
                <div className="flex items-center justify-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-t border-[#ffb700]"></div>
                </div>
            </div>
        );
    }

    if (news.length === 0) {
        return (
            <div className="glass-card border border-white/5 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                    <Newspaper size={16} className="text-[#ffb700]" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Noticias</span>
                </div>
                <p className="text-xs text-gray-600 text-center py-4">No hay noticias aún. ¡Completa misiones para aparecer aquí!</p>
            </div>
        );
    }

    return (
        <div className="glass-card border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Newspaper size={16} className="text-[#ffb700]" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Noticias del Escuadrón</span>
                </div>
                <button onClick={loadNews} className="p-1.5 text-gray-500 hover:text-[#ffb700] transition-colors rounded-lg hover:bg-white/5">
                    <RefreshCw size={14} />
                </button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide pr-1">
                {/* Headlines Synchronized from Ticker */}
                {headlines.map((headline, idx) => (
                    <div
                        key={`headline-${idx}`}
                        className="flex items-start gap-3 p-2.5 rounded-xl bg-[#ffb700]/5 border border-[#ffb700]/10 transition-colors group"
                    >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 mt-0.5 bg-[#ffb700]/10 border border-[#ffb700]/20">
                            📢
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-[#ffb700] font-black uppercase tracking-wider leading-relaxed">{headline}</p>
                            <p className="text-[9px] text-white/20 mt-0.5 font-bold uppercase">Boletín en tiempo real</p>
                        </div>
                    </div>
                ))}

                {/* Standard News Items */}
                {news.slice(0, 10).map((item, idx) => {
                    const config = NEWS_ICONS[item.type] || { icon: '📌', color: '#9ca3af' };
                    // Avoid duplicate ranking items if headlines already show ranking
                    if (item.type === 'RANKING' && headlines.some(h => h.includes('XP') || h.includes('TOP'))) return null;

                    return (
                        <div
                            key={item.id || idx}
                            className="flex items-start gap-3 p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/5 transition-colors group"
                        >
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 mt-0.5"
                                style={{ backgroundColor: `${config.color}15`, border: `1px solid ${config.color}30` }}
                            >
                                {config.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-white/80 leading-relaxed">{item.message}</p>
                                <p className="text-[9px] text-gray-600 mt-0.5">{item.date}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default NewsFeed;
