import React, { useState, useEffect } from 'react';
import { Trophy, Target, Flame, Swords, GraduationCap, Medal, Sparkles } from 'lucide-react';
import { Badge } from '../types';
import { fetchBadges } from '../services/sheetsService';

interface BadgeShowcaseProps {
    currentAgentId?: string;
    currentAgentName?: string;
    mode?: 'profile' | 'summary';
    compact?: boolean;
}

const BADGE_CONFIG: Record<string, { icon: React.ReactNode; gradient: string; glow: string; border: string }> = {
    'CONSAGRADO_MES': {
        icon: <Trophy size={20} />,
        gradient: 'from-amber-400 to-yellow-600',
        glow: 'shadow-[0_0_25px_rgba(251,191,36,0.4)]',
        border: 'border-amber-500/40'
    },
    'RECLUTADOR': {
        icon: <Target size={20} />,
        gradient: 'from-cyan-400 to-blue-600',
        glow: 'shadow-[0_0_25px_rgba(34,211,238,0.4)]',
        border: 'border-cyan-500/40'
    },
    'STREAKER': {
        icon: <Flame size={20} />,
        gradient: 'from-red-400 to-orange-600',
        glow: 'shadow-[0_0_25px_rgba(239,68,68,0.4)]',
        border: 'border-red-500/40'
    },
    'MISIONERO_ELITE': {
        icon: <Swords size={20} />,
        gradient: 'from-emerald-400 to-green-600',
        glow: 'shadow-[0_0_25px_rgba(52,211,153,0.4)]',
        border: 'border-emerald-500/40'
    },
    'ACADEMICO': {
        icon: <GraduationCap size={20} />,
        gradient: 'from-purple-400 to-indigo-600',
        glow: 'shadow-[0_0_25px_rgba(167,139,250,0.4)]',
        border: 'border-purple-500/40'
    }
};

const BadgeShowcase: React.FC<BadgeShowcaseProps> = ({ currentAgentId, currentAgentName, mode = 'summary', compact = false }) => {
    const [badges, setBadges] = useState<Badge[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const data = await fetchBadges();
                setBadges(data || []);
            } catch (e) { console.error(e); }
            setLoading(false);
        };
        load();
    }, []);

    if (loading) {
        return (
            <div className="space-y-2 animate-pulse">
                <div className="h-4 w-40 bg-white/5 rounded-full" />
                <div className="flex gap-3 overflow-hidden">
                    {[1, 2, 3].map(i => <div key={i} className="h-24 w-28 bg-white/5 rounded-2xl shrink-0" />)}
                </div>
            </div>
        );
    }

    if (badges.length === 0) return null;

    // In profile mode, only show badges the current user has earned
    const displayBadges = mode === 'profile'
        ? badges.filter(b => {
            const idMatch = b.agentId && currentAgentId && b.agentId.toUpperCase() === currentAgentId.toUpperCase();
            const nameMatch = b.agentName && currentAgentName && b.agentName.toUpperCase() === currentAgentName.toUpperCase();
            return idMatch || nameMatch;
        })
        : badges;

    if (displayBadges.length === 0 && mode === 'profile') return null;

    return (
        <div className="space-y-3 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex items-center gap-2 px-1">
                <div className="relative">
                    <Medal size={14} className="text-[#ffb700]" />
                    <Sparkles size={8} className="absolute -top-1 -right-1 text-[#ffb700] animate-pulse" />
                </div>
                <span className="text-[10px] font-black text-[#ffb700] uppercase tracking-[0.2em] font-montserrat">
                    {mode === 'profile' ? 'Mis Insignias' : 'Insignias del Mes'}
                </span>
            </div>

            {/* Badge Cards */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {displayBadges.map((badge, idx) => {
                    const config = BADGE_CONFIG[badge.type] || BADGE_CONFIG['CONSAGRADO_MES'];
                    return (
                        <div
                            key={badge.type + idx}
                            className={`shrink-0 relative overflow-hidden rounded-2xl ${compact ? 'p-2 w-24' : 'p-4 w-36'} border ${config.border} ${config.glow} bg-gradient-to-br from-white/[0.04] to-white/[0.01] transition-all hover:scale-105 hover:-translate-y-1 cursor-default`}
                            style={{ animationDelay: `${idx * 100}ms` }}
                        >
                            {/* Background Glow */}
                            <div className={`absolute -top-4 -right-4 ${compact ? 'w-10 h-10' : 'w-16 h-16'} bg-gradient-to-br ${config.gradient} rounded-full blur-2xl opacity-20`} />

                            <div className={`relative z-10 ${compact ? 'space-y-1' : 'space-y-2'}`}>
                                <div className={`${compact ? 'w-7 h-7' : 'w-10 h-10'} rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center text-white shadow-lg`}>
                                    {React.isValidElement(config.icon) ? React.cloneElement(config.icon as React.ReactElement<any>, { size: compact ? 14 : 20 }) : config.icon}
                                </div>
                                <div>
                                    <p className={`${compact ? 'text-[6px]' : 'text-[8px]'} font-black text-white/50 uppercase tracking-wider leading-none`}>{badge.label}</p>
                                    <p className={`${compact ? 'text-[8px]' : 'text-[10px]'} font-black text-white uppercase truncate mt-0.5 leading-tight`}>{badge.agentName}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className={`${compact ? 'text-[12px]' : 'text-[16px]'} font-bebas font-black text-white leading-none`}>{badge.value}</span>
                                    <span className="text-[7px] text-white/40 font-bold uppercase">
                                        {badge.type === 'STREAKER' ? 'días' :
                                            badge.type === 'RECLUTADOR' ? 'referidos' :
                                                badge.type === 'CONSAGRADO_MES' ? 'asistencias' :
                                                    badge.type === 'MISIONERO_ELITE' ? 'misiones' :
                                                        'cursos'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default BadgeShowcase;
