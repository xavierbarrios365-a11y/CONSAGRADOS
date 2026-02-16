import React, { useState, useEffect } from 'react';
import { Newspaper, Trophy, GraduationCap, Award, Flame, Star, ClipboardCheck, RefreshCw, TrendingUp, Zap, ChevronRight } from 'lucide-react';
import { Agent, NewsFeedItem, UserRole } from '../types';
import { fetchNewsFeed } from '../services/sheetsService';
import { formatDriveUrl } from './DigitalIdCard';

interface NewsFeedProps {
    onActivity?: () => void;
    headlines?: string[];
    agents?: Agent[];
}

const NEWS_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
    'CURSO_COMPLETADO': { icon: '🎓', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    'ASCENSO': { icon: '🎖️', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    'CERTIFICADO': { icon: '📜', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    'RACHA': { icon: '🔥', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    'RANKING': { icon: '🏆', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
    'TAREA': { icon: '✅', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    'HEADLINE': { icon: '📢', color: '#ffb700', bg: 'rgba(255,183,0,0.1)' },
};

// Parse headlines into structured data for the "Top" cards
const parseTopAgents = (headlines: string[], category: string) => {
    return headlines
        .filter(h => h.includes(category))
        .map(h => {
            const nameMatch = h.match(/:\s*(.+?)\s*\(/);
            const valMatch = h.match(/\((\d+)/);
            return {
                name: nameMatch?.[1]?.trim() || 'Agente',
                value: valMatch?.[1] || '0',
            };
        })
        .slice(0, 3);
};

const NewsFeed: React.FC<NewsFeedProps> = ({ onActivity, headlines = [], agents = [] }) => {
    const [news, setNews] = useState<NewsFeedItem[]>([]);
    const [loading, setLoading] = useState(true);

    const loadNews = async () => {
        setLoading(true);
        try {
            const data = await fetchNewsFeed();
            const filteredNews = (data || []).filter(item => {
                if (!item.agentId) return true;
                const agent = agents.find(a => String(a.id) === String(item.agentId));
                if (!agent) return true;
                const isLeaderRank = agent.rank === 'LÍDER' || agent.rank === 'LIDER';
                const isLeaderRole = agent.userRole === UserRole.LEADER || agent.userRole === UserRole.DIRECTOR;
                return !isLeaderRank && !isLeaderRole;
            });
            setNews(filteredNews);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { loadNews(); }, []);

    // Extract top agents from headlines
    const topXP = parseTopAgents(headlines, 'XP');
    const topBible = parseTopAgents(headlines, 'BIBLIA');
    const topNotes = parseTopAgents(headlines, 'APUNTES');
    const topLead = parseTopAgents(headlines, 'LIDERAZGO');
    const topStreaks = parseTopAgents(headlines, 'RACHA');

    const rankingCategories = [
        { title: 'XP Total', emoji: '🔥', data: topXP, suffix: 'XP', gradient: 'from-amber-500/20 to-orange-600/5', borderColor: 'border-amber-500/20' },
        { title: 'Biblia', emoji: '📖', data: topBible, suffix: 'PTS', gradient: 'from-blue-500/20 to-indigo-600/5', borderColor: 'border-blue-500/20' },
        { title: 'Apuntes', emoji: '📑', data: topNotes, suffix: 'PTS', gradient: 'from-purple-500/20 to-violet-600/5', borderColor: 'border-purple-500/20' },
        { title: 'Liderazgo', emoji: '🎖️', data: topLead, suffix: 'PTS', gradient: 'from-yellow-500/20 to-amber-600/5', borderColor: 'border-yellow-500/20' },
        { title: 'Rachas', emoji: '⚡', data: topStreaks, suffix: 'DÍAS', gradient: 'from-red-500/20 to-rose-600/5', borderColor: 'border-red-500/20' },
    ].filter(c => c.data.length > 0);

    if (loading) {
        return (
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Newspaper size={16} className="text-[#ffb700]" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Noticias</span>
                </div>
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-t border-[#ffb700]"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in">

            {/* ════════════════ TABLERO DE RANKING ════════════════ */}
            {rankingCategories.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Trophy size={14} className="text-[#ffb700]" />
                        <span className="text-[10px] font-black text-white/60 uppercase tracking-widest font-bebas">Tablero de Líderes</span>
                    </div>
                    <div className="grid grid-cols-2 xs:grid-cols-3 gap-3">
                        {rankingCategories.map(cat => (
                            <div key={cat.title} className={`bg-gradient-to-br ${cat.gradient} border ${cat.borderColor} rounded-2xl p-3 space-y-2`}>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm">{cat.emoji}</span>
                                    <span className="text-[9px] font-black text-white/70 uppercase tracking-widest">{cat.title}</span>
                                </div>
                                <div className="space-y-1.5">
                                    {cat.data.map((agent, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <span className={`text-[9px] font-black w-4 text-center ${idx === 0 ? 'text-[#ffb700]' : 'text-white/30'}`}>
                                                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                                            </span>
                                            <span className="text-[9px] text-white/80 font-bold truncate flex-1">{agent.name}</span>
                                            <span className="text-[8px] text-white/40 font-black">{agent.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ════════════════ NOTICIAS RECIENTES ════════════════ */}
            {(news.length > 0) && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Newspaper size={14} className="text-[#ffb700]" />
                            <span className="text-[10px] font-black text-white/60 uppercase tracking-widest font-bebas">Actividad Reciente</span>
                        </div>
                        <button onClick={loadNews} className="p-1.5 text-gray-600 hover:text-[#ffb700] transition-colors rounded-lg hover:bg-white/5">
                            <RefreshCw size={12} />
                        </button>
                    </div>
                    <div className="space-y-2">
                        {news.slice(0, 6).map((item, idx) => {
                            const config = NEWS_ICONS[item.type] || { icon: '📌', color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' };
                            if (item.type === 'RANKING' && headlines.some(h => h.includes('XP') || h.includes('TOP'))) return null;

                            return (
                                <div
                                    key={item.id || idx}
                                    className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all group"
                                    style={{ animationDelay: `${idx * 80}ms` }}
                                >
                                    <div
                                        className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 shadow-inner"
                                        style={{ backgroundColor: config.bg, border: `1px solid ${config.color}30` }}
                                    >
                                        {config.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] text-white/80 font-bold leading-snug truncate">{item.message}</p>
                                        <p className="text-[8px] text-white/20 mt-0.5 font-bold uppercase tracking-wider">{item.date}</p>
                                    </div>
                                    <ChevronRight size={12} className="text-white/10 group-hover:text-white/30 transition-colors shrink-0" />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {news.length === 0 && rankingCategories.length === 0 && (
                <div className="glass-card border border-white/5 rounded-2xl p-6 text-center space-y-2">
                    <Newspaper size={24} className="mx-auto text-white/10" />
                    <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">Sin noticias aún</p>
                    <p className="text-[8px] text-white/15 font-bold">Completa misiones para aparecer aquí</p>
                </div>
            )}
        </div>
    );
};

export default NewsFeed;
