import React, { useState } from 'react';
import { Agent, UserRole } from '../types';
import { Trophy, Medal, Crown, Star, Search, Flame, Target, Shield, Zap, Users } from 'lucide-react';
import { formatDriveUrl } from './DigitalIdCard';

interface TacticalRankingProps {
    agents: Agent[];
    currentUser: Agent | null;
}

const TacticalRanking: React.FC<TacticalRankingProps> = ({ agents, currentUser }) => {
    const [activeCategory, setActiveCategory] = useState<'AGENTS' | 'LEADERS'>('AGENTS');
    const [activeTier, setActiveTier] = useState<string>('RECLUTA');

    const tiers = ['RECLUTA', 'ACTIVO', 'CONSAGRADO', 'REFERENTE', 'LÍDER'];

    const getLevel = (xp: number) => {
        if (xp < 300) return 'RECLUTA';
        if (xp < 500) return 'ACTIVO';
        if (xp < 700) return 'CONSAGRADO';
        if (xp < 1000) return 'REFERENTE';
        return 'LÍDER';
    };

    const filteredAgents = agents.filter(a => {
        if (activeCategory === 'LEADERS') {
            return a.role === 'LIDER' || a.userRole === UserRole.LEADER || a.userRole === UserRole.DIRECTOR;
        } else {
            return getLevel(a.xp) === activeTier && (a.userRole === UserRole.STUDENT || !a.userRole);
        }
    });

    const sortedAgents = [...filteredAgents]
        .sort((a, b) => b.xp - a.xp)
        .map((agent, index) => ({ ...agent, position: index + 1 }));

    const topThree = sortedAgents.slice(0, 3);
    const restOfAgents = sortedAgents.slice(3);

    const getRankColor = (position: number) => {
        if (activeCategory === 'LEADERS') return 'text-blue-400';
        switch (position) {
            case 1: return 'text-[#FFB700]';
            case 2: return 'text-gray-400';
            case 3: return 'text-orange-600';
            default: return 'text-white/40';
        }
    };

    const getPodiumScale = (position: number) => {
        switch (position) {
            case 1: return 'scale-110 z-10';
            case 2: return 'scale-100 z-0 translate-y-4';
            case 3: return 'scale-90 z-0 translate-y-8';
            default: return '';
        }
    };

    return (
        <div className="p-2 md:p-8 space-y-6 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-full overflow-x-hidden pb-32 font-montserrat">
            {/* Header Section */}
            <div className="relative overflow-hidden bg-[#001f3f] border border-[#FFB700]/20 rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 shadow-2xl">
                <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-[#FFB700]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>

                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8">
                    <div className="space-y-3 md:space-y-4">
                        <div className="inline-flex items-center gap-2 bg-[#FFB700]/10 border border-[#FFB700]/30 px-3 py-1 rounded-full">
                            <Trophy size={12} className="text-[#FFB700]" />
                            <span className="text-[8px] md:text-[10px] font-black text-[#FFB700] uppercase tracking-[0.2em] font-bebas">Escuadrón de Élite</span>
                        </div>
                        <h2 className="text-4xl md:text-7xl font-bebas text-white uppercase leading-none tracking-tight">
                            CUADRO DE <span className="text-[#FFB700] drop-shadow-[0_0_15px_rgba(255,183,0,0.4)]">HONOR</span>
                        </h2>
                        <p className="text-[10px] md:text-sm text-white/50 font-montserrat max-w-md uppercase font-black tracking-widest leading-relaxed">
                            {activeCategory === 'LEADERS' ? 'Los capitanes que comandan la victoria.' : 'El escalafón de los guerreros más letales.'}
                        </p>
                    </div>

                    <div className="flex flex-col gap-4 md:gap-6">
                        <div className="flex bg-black/60 p-1.5 rounded-[1.5rem] md:rounded-[2rem] border border-white/10 shadow-2xl backdrop-blur-xl">
                            <button
                                onClick={() => setActiveCategory('AGENTS')}
                                className={`flex-1 py-3 md:py-4 px-6 md:px-8 rounded-[1rem] md:rounded-[1.5rem] text-[9px] md:text-[11px] font-black uppercase transition-all whitespace-nowrap flex items-center justify-center gap-2 md:gap-3 ${activeCategory === 'AGENTS' ? 'bg-[#FFB700] text-[#001f3f] shadow-[0_0_20px_rgba(255,183,0,0.3)]' : 'text-white/40 hover:text-white'}`}
                            >
                                <Users size={14} /> Agentes
                            </button>
                            <button
                                onClick={() => setActiveCategory('LEADERS')}
                                className={`flex-1 py-3 md:py-4 px-6 md:px-8 rounded-[1rem] md:rounded-[1.5rem] text-[9px] md:text-[11px] font-black uppercase transition-all whitespace-nowrap flex items-center justify-center gap-2 md:gap-3 ${activeCategory === 'LEADERS' ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'text-white/40 hover:text-white'}`}
                            >
                                <Crown size={14} /> Líderes
                            </button>
                        </div>

                        {activeCategory === 'AGENTS' && (
                            <div className="flex gap-2 p-1.5 bg-black/30 rounded-xl border border-white/5 overflow-x-auto no-scrollbar max-w-full">
                                {tiers.map(tier => (
                                    <button
                                        key={tier}
                                        onClick={() => setActiveTier(tier)}
                                        className={`flex-1 py-2 px-3 rounded-lg text-[7px] md:text-[8px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${activeTier === tier ? 'bg-white/10 text-white border-white/30 shadow-lg' : 'text-white/20 hover:text-white/40 border-transparent'}`}
                                    >
                                        {tier}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {sortedAgents.length > 0 ? (
                <>
                    {/* Podium Section - Stepped Horizontal Layout (Now also for Mobile) */}
                    <div className="flex items-end justify-center gap-2 md:gap-8 max-w-5xl mx-auto px-1 md:px-4 mt-8 md:mt-12">

                        {/* Second Place - Left Side */}
                        {topThree[1] && (
                            <div className="flex flex-col items-center space-y-2 md:space-y-4 w-[28%] md:w-auto transition-all duration-700 animate-in slide-in-from-left-4">
                                <div className="relative group">
                                    <div className="absolute -inset-2 bg-gray-400/10 rounded-full blur-xl md:blur-2xl"></div>
                                    <img
                                        src={formatDriveUrl(topThree[1].photoUrl)}
                                        className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-32 md:h-32 rounded-full border-2 md:border-4 border-gray-400/30 object-cover grayscale transition-all shadow-xl"
                                        onError={(e) => e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}
                                    />
                                    <div className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 w-6 h-6 md:w-10 md:h-10 bg-[#1A1A1A] border-2 border-gray-400 rounded-lg md:rounded-xl flex items-center justify-center text-gray-400">
                                        <span className="font-bebas text-xs md:text-xl">2</span>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <h3 className="text-[10px] sm:text-xs md:text-lg font-bebas text-white uppercase tracking-wider truncate w-20 sm:w-24 md:w-auto">{topThree[1].name}</h3>
                                    <div className="flex items-center justify-center gap-1 text-gray-400">
                                        <Zap size={8} className="md:size-3" fill="currentColor" />
                                        <span className="text-[8px] md:text-[11px] font-black">{topThree[1].xp} </span>
                                    </div>
                                </div>
                                <div className="w-full h-12 md:h-32 bg-gradient-to-b from-gray-400/10 via-white/5 to-transparent rounded-t-xl md:rounded-t-3xl border-t border-x border-white/10 flex flex-col items-center justify-end pb-2 md:pb-4">
                                    <Medal size={12} className="md:size-6 text-gray-400 opacity-50" />
                                </div>
                            </div>
                        )}

                        {/* First Place - Center and Elevated */}
                        {topThree[0] && (
                            <div className="flex flex-col items-center space-y-3 md:space-y-6 w-[36%] md:w-auto scale-105 md:scale-125 z-10 transition-all duration-1000 animate-in zoom-in-95">
                                <div className="relative mb-0 md:mb-2">
                                    <Crown className="absolute -top-4 md:-top-10 left-1/2 -translate-x-1/2 text-[#FFB700] w-6 h-6 md:w-16 md:h-16 drop-shadow-[0_0_20px_rgba(255,183,0,0.6)] animate-pulse" />
                                    <div className="absolute -inset-4 md:-inset-10 bg-[#FFB700]/10 rounded-full blur-[20px] md:blur-[50px] animate-pulse"></div>
                                    <img
                                        src={formatDriveUrl(topThree[0].photoUrl)}
                                        className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-48 md:h-48 rounded-full border-2 md:border-4 border-[#FFB700] object-cover shadow-[0_0_40px_rgba(255,183,0,0.3)]"
                                        onError={(e) => e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}
                                    />
                                    <div className={`absolute -bottom-1 -right-1 md:-bottom-4 md:-right-4 w-8 h-8 md:w-14 md:h-14 ${activeCategory === 'LEADERS' ? 'bg-blue-600' : 'bg-[#FFB700]'} border-2 md:border-4 border-[#001f3f] rounded-lg md:rounded-2xl flex items-center justify-center ${activeCategory === 'LEADERS' ? 'text-white' : 'text-[#001f3f]'} shadow-2xl`}>
                                        <span className="font-bebas text-lg md:text-3xl font-black">1</span>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <h3 className="text-[12px] sm:text-sm md:text-2xl font-bebas text-[#FFB700] uppercase tracking-widest truncate w-24 sm:w-32 md:w-auto drop-shadow-md">{topThree[0].name}</h3>
                                    <div className="flex items-center justify-center gap-1 text-[#FFB700]">
                                        <Flame size={10} className="md:size-5 animate-pulse" fill="currentColor" />
                                        <span className="text-[10px] md:text-xl font-black">{topThree[0].xp} XP</span>
                                    </div>
                                </div>
                                <div className={`w-full h-20 md:h-56 bg-gradient-to-b ${activeCategory === 'LEADERS' ? 'from-blue-600/20' : 'from-[#FFB700]/10'} via-black/40 to-transparent rounded-t-xl md:rounded-t-[3rem] border-t border-x ${activeCategory === 'LEADERS' ? 'border-blue-600/40' : 'border-[#FFB700]/30'} flex flex-col items-center justify-end pb-4 md:pb-8 shadow-2xl`}>
                                    <Star size={14} className={`md:size-8 ${activeCategory === 'LEADERS' ? 'text-blue-400' : 'text-[#FFB700]'} animate-spin-slow`} />
                                </div>
                            </div>
                        )}

                        {/* Third Place - Right Side */}
                        {topThree[2] && (
                            <div className="flex flex-col items-center space-y-2 md:space-y-4 w-[28%] md:w-auto transition-all duration-700 animate-in slide-in-from-right-4">
                                <div className="relative group">
                                    <img
                                        src={formatDriveUrl(topThree[2].photoUrl)}
                                        className="relative w-14 h-14 sm:w-18 sm:h-18 md:w-28 md:h-28 rounded-full border-2 md:border-4 border-orange-800/20 object-cover grayscale transition-all shadow-xl"
                                        onError={(e) => e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}
                                    />
                                    <div className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 w-5 h-5 md:w-9 md:h-9 bg-[#1A1A1A] border-2 border-orange-800 rounded-lg md:rounded-xl flex items-center justify-center text-orange-800">
                                        <span className="font-bebas text-[10px] md:text-lg">3</span>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <h3 className="text-[10px] sm:text-xs md:text-lg font-bebas text-white uppercase tracking-wider truncate w-16 sm:w-20 md:w-auto">{topThree[2].name}</h3>
                                    <div className="flex items-center justify-center gap-1 text-orange-800/60">
                                        <Zap size={8} className="md:size-3" fill="currentColor" />
                                        <span className="text-[8px] md:text-[10px] font-black">{topThree[2].xp} XP</span>
                                    </div>
                                </div>
                                <div className="w-full h-8 md:h-24 bg-gradient-to-b from-orange-800/10 via-white/5 to-transparent rounded-t-lg md:rounded-t-2xl border-t border-x border-white/10 flex flex-col items-center justify-end pb-2 md:pb-3">
                                    <Medal size={10} className="md:size-5 text-orange-800 opacity-50" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Global List Section */}
                    <div className="max-w-6xl mx-auto w-full px-2">
                        <div className="bg-[#001f3f] border border-white/5 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl">
                            <div className="px-6 md:px-8 py-4 md:py-6 bg-black/20 flex items-center justify-between border-b border-white/5">
                                <h4 className="text-[8px] md:text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Lista de Escalafón Operativo</h4>
                                <span className="text-[8px] md:text-[10px] font-black text-white/40 uppercase">Total: {sortedAgents.length}</span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-white/5">
                                            <th className="px-4 md:px-8 py-4 text-[8px] md:text-[9px] font-black text-gray-500 uppercase tracking-widest">Pos</th>
                                            <th className="px-4 md:px-8 py-4 text-[8px] md:text-[9px] font-black text-gray-500 uppercase tracking-widest">Identidad</th>
                                            <th className="hidden md:table-cell px-8 py-4 text-[9px] font-black text-gray-500 uppercase tracking-widest text-center">Nivel</th>
                                            <th className="px-4 md:px-8 py-4 text-[8px] md:text-[9px] font-black text-gray-500 uppercase tracking-widest text-right">XP</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {restOfAgents.map((agent) => (
                                            <tr
                                                key={agent.id}
                                                className={`group hover:bg-[#FFB700]/5 transition-all duration-300 ${agent.id === currentUser?.id ? 'bg-[#FFB700]/10 border-l-4 border-l-[#FFB700]' : ''}`}
                                            >
                                                <td className="px-4 md:px-8 py-4 md:py-6">
                                                    <span className={`w-6 h-6 md:w-8 md:h-8 rounded-lg flex items-center justify-center font-bebas text-sm md:text-lg ${getRankColor(agent.position)} bg-white/5 border border-white/10`}>
                                                        {agent.position}
                                                    </span>
                                                </td>
                                                <td className="px-4 md:px-8 py-4 md:py-6">
                                                    <div className="flex items-center gap-3 md:gap-4">
                                                        <img
                                                            src={formatDriveUrl(agent.photoUrl)}
                                                            className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl object-cover grayscale group-hover:grayscale-0 transition-all border border-white/10"
                                                            onError={(e) => e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}
                                                        />
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] md:text-[11px] font-black text-white uppercase tracking-wider truncate max-w-[120px] md:max-w-none">{agent.name}</p>
                                                            <p className="text-[7px] md:text-[8px] text-[#FFB700] font-bold uppercase tracking-widest opacity-60">{agent.id}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="hidden md:table-cell px-8 py-4 md:py-6 text-center">
                                                    <span className="text-[9px] font-black text-white/60 uppercase tracking-widest font-bebas">{agent.rank || 'AGENTE'}</span>
                                                </td>
                                                <td className="px-4 md:px-8 py-4 md:py-6 text-right">
                                                    <div className="flex items-center justify-end gap-1 md:gap-2">
                                                        <span className="text-md md:text-xl font-bebas text-white tracking-widest">{agent.xp}</span>
                                                        <Zap size={14} className="text-[#FFB700]" fill="#FFB700" />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="py-20 text-center space-y-4 bg-[#001f3f]/50 border border-white/5 rounded-[2.5rem] md:rounded-[3rem] p-6 animate-in fade-in mx-2">
                    <div className="w-20 h-20 md:w-24 md:h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                        <Users size={32} className="text-white/20" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-bebas text-white uppercase tracking-widest">Operación en Espera</h3>
                    <p className="text-[8px] md:text-[10px] text-white/40 font-bold uppercase tracking-[0.2em] max-w-sm mx-auto">Aún no hay agentes clasificados en <span className="text-[#FFB700]">{activeTier}</span>.</p>
                </div>
            )}

            {/* Motivation Footer */}
            <div className="bg-gradient-to-r from-[#FFB700]/5 to-transparent p-6 md:p-12 rounded-[2rem] md:rounded-[3.5rem] flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 border border-[#FFB700]/10 shadow-2xl relative overflow-hidden mx-2">
                <div className="flex items-center gap-4 md:gap-6 relative z-10">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-[#FFB700] rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center text-[#001f3f] shadow-2xl rotate-3">
                        <Trophy size={32} />
                    </div>
                    <div>
                        <h3 className="text-2xl md:text-3xl font-bebas text-white uppercase tracking-wider">¿QUIERES ESCALAR?</h3>
                        <p className="text-[8px] md:text-[10px] text-white/50 font-bold uppercase tracking-[0.2em] max-w-xs">Participa en misiones académicas para aumentar tu XP.</p>
                    </div>
                </div>
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="w-full md:w-auto relative z-10 bg-[#FFB700] text-[#001f3f] px-10 py-4 md:px-12 md:py-5 rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-[12px] tracking-[0.2em] shadow-2xl active:scale-95 transition-all font-bebas"
                >
                    Volver a la cima
                </button>
            </div>
        </div>
    );
};

export default TacticalRanking;
