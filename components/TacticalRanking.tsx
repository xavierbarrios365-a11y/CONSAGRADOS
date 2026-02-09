import React, { useState } from 'react';
import { Agent, UserRole } from '../types';
import { Trophy, Medal, Crown, Star, Search, Flame, Target, Shield, Zap, Users } from 'lucide-react';
import { formatDriveUrl } from './DigitalIdCard';

interface TacticalRankingProps {
    agents: Agent[];
    currentUser: Agent | null;
}

const TacticalRanking: React.FC<TacticalRankingProps> = ({ agents, currentUser }) => {
    const [searchQuery, setSearchQuery] = useState('');
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
        const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.id.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;

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
        <div className="p-4 md:p-8 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-full overflow-x-hidden pb-32">
            {/* Header Section */}
            <div className="relative overflow-hidden bg-[#001f3f] border border-[#FFB700]/20 rounded-[3rem] p-8 md:p-12 shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFB700]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>

                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 bg-[#FFB700]/10 border border-[#FFB700]/30 px-4 py-1.5 rounded-full">
                            <Flame size={14} className="text-[#FFB700]" />
                            <span className="text-[10px] font-black text-[#FFB700] uppercase tracking-[0.2em] font-bebas">Operación Competitividad</span>
                        </div>
                        <h2 className="text-4xl md:text-6xl font-bebas text-white uppercase leading-none tracking-tight">
                            CUADRO DE <span className="text-[#FFB700]">HONOR</span>
                        </h2>
                        <p className="text-xs md:text-sm text-white/50 font-montserrat max-w-md uppercase font-bold tracking-widest leading-relaxed">
                            {activeCategory === 'LEADERS' ? 'Los pilares que guían la operación Consagrados 2026.' : 'El escalafón táctico de los prospectos más destacados en operaciones de entrenamiento.'}
                        </p>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#FFB700] transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="BUSCAR TRIPLE-A..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full md:w-80 bg-[#3A3A3A]/20 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white text-[11px] font-black uppercase tracking-widest outline-none focus:border-[#FFB700] transition-all"
                            />
                        </div>
                        <div className="flex flex-col gap-4">
                            <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5 shadow-inner">
                                <button
                                    onClick={() => setActiveCategory('AGENTS')}
                                    className={`flex-1 py-3 px-6 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap flex items-center justify-center gap-2 ${activeCategory === 'AGENTS' ? 'bg-[#FFB700] text-[#001f3f]' : 'text-white/40 hover:text-white'}`}
                                >
                                    <Users size={14} /> Ranking Agentes
                                </button>
                                <button
                                    onClick={() => setActiveCategory('LEADERS')}
                                    className={`flex-1 py-3 px-6 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap flex items-center justify-center gap-2 ${activeCategory === 'LEADERS' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                                >
                                    <Crown size={14} /> Ranking Líderes
                                </button>
                            </div>

                            {activeCategory === 'AGENTS' && (
                                <div className="flex gap-2 p-1 bg-black/20 rounded-xl border border-white/5 overflow-x-auto no-scrollbar">
                                    {tiers.map(tier => (
                                        <button
                                            key={tier}
                                            onClick={() => setActiveTier(tier)}
                                            className={`flex-1 py-2 px-4 rounded-lg text-[8px] font-black uppercase transition-all whitespace-nowrap border ${activeTier === tier ? 'bg-white/10 text-white border-white/20' : 'text-white/30 hover:text-white/50 border-transparent'}`}
                                        >
                                            {tier}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {sortedAgents.length > 0 ? (
                <>
                    {/* Podium Section */}
                    {!searchQuery && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 items-end max-w-5xl mx-auto px-4 mt-8">
                            {/* Second Place */}
                            {topThree[1] && (
                                <div className={`flex flex-col items-center space-y-4 order-2 md:order-1 ${getPodiumScale(2)} transition-all duration-700`}>
                                    <div className="relative group">
                                        <div className="absolute -inset-1 bg-gradient-to-t from-gray-400/20 to-transparent rounded-full blur opacity-50 group-hover:opacity-100 transition duration-500"></div>
                                        <img
                                            src={formatDriveUrl(topThree[1].photoUrl)}
                                            className="relative w-28 h-28 rounded-full border-4 border-gray-400/30 object-cover grayscale group-hover:grayscale-0 transition-all shadow-xl"
                                            onError={(e) => e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}
                                        />
                                        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#3A3A3A] border-2 border-gray-400 rounded-xl flex items-center justify-center text-gray-400 shadow-xl">
                                            <span className="font-bebas text-xl">2</span>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{topThree[1].rank || 'AGENTE'}</p>
                                        <h3 className="text-lg font-bebas text-white uppercase tracking-wider">{topThree[1].name}</h3>
                                        <div className="flex items-center justify-center gap-1 text-[#FFB700]">
                                            <Zap size={12} fill="#FFB700" />
                                            <span className="text-[11px] font-black">{topThree[1].xp} XP</span>
                                        </div>
                                    </div>
                                    <div className="w-full h-32 bg-gradient-to-b from-white/5 to-transparent rounded-t-3xl border-t border-x border-white/5 flex flex-col items-center justify-end pb-4">
                                        <Medal size={24} className="text-gray-400 opacity-50" />
                                    </div>
                                </div>
                            )}

                            {/* First Place */}
                            {topThree[0] && (
                                <div className={`flex flex-col items-center space-y-4 order-1 md:order-2 ${getPodiumScale(1)} transition-all duration-1000`}>
                                    <div className="relative mb-4">
                                        <Crown className="absolute -top-8 left-1/2 -translate-x-1/2 text-[#FFB700] w-12 h-12 drop-shadow-[0_0_15px_rgba(255,183,0,0.5)] animate-bounce" />
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute -inset-4 bg-[#FFB700]/10 rounded-full blur-2xl group-hover:bg-[#FFB700]/20 transition-all"></div>
                                        <img
                                            src={formatDriveUrl(topThree[0].photoUrl)}
                                            className="relative w-40 h-40 rounded-full border-4 border-[#FFB700] object-cover shadow-[0_0_40px_rgba(255,183,0,0.2)] group-hover:scale-105 transition-all"
                                            onError={(e) => e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}
                                        />
                                        <div className={`absolute -bottom-3 -right-3 w-14 h-14 ${activeCategory === 'LEADERS' ? 'bg-blue-600' : 'bg-[#FFB700]'} border-4 border-[#001f3f] rounded-2xl flex items-center justify-center ${activeCategory === 'LEADERS' ? 'text-white' : 'text-[#001f3f]'} shadow-2xl`}>
                                            <span className="font-bebas text-3xl">1</span>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <p className={`text-[12px] font-black ${activeCategory === 'LEADERS' ? 'text-blue-400' : 'text-[#FFB700]'} uppercase tracking-[0.3em] font-bebas`}>{topThree[0].rank || 'GENERAL'}</p>
                                        <h3 className="text-2xl font-bebas text-white uppercase tracking-widest">{topThree[0].name}</h3>
                                        <div className={`flex items-center justify-center gap-2 ${activeCategory === 'LEADERS' ? 'text-blue-400' : 'text-[#FFB700]'}`}>
                                            <Flame size={16} fill="currentColor" className="animate-pulse" />
                                            <span className="text-lg font-black">{topThree[0].xp} XP</span>
                                        </div>
                                    </div>
                                    <div className={`w-full h-48 bg-gradient-to-b ${activeCategory === 'LEADERS' ? 'from-blue-600/10' : 'from-[#FFB700]/10'} to-transparent rounded-t-3xl border-t border-x ${activeCategory === 'LEADERS' ? 'border-blue-600/20' : 'border-[#FFB700]/10'} flex flex-col items-center justify-end pb-6`}>
                                        <Star size={32} className={`${activeCategory === 'LEADERS' ? 'text-blue-400' : 'text-[#FFB700]'} animate-spin-slow`} />
                                    </div>
                                </div>
                            )}

                            {/* Third Place */}
                            {topThree[2] && (
                                <div className={`flex flex-col items-center space-y-4 order-3 md:order-3 ${getPodiumScale(3)} transition-all duration-700`}>
                                    <div className="relative group">
                                        <div className="absolute -inset-1 bg-gradient-to-t from-orange-800/20 to-transparent rounded-full blur opacity-50 group-hover:opacity-100 transition duration-500"></div>
                                        <img
                                            src={formatDriveUrl(topThree[2].photoUrl)}
                                            className="relative w-24 h-24 rounded-full border-4 border-orange-800/30 object-cover grayscale group-hover:grayscale-0 transition-all shadow-lg"
                                            onError={(e) => e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}
                                        />
                                        <div className="absolute -bottom-2 -right-2 w-9 h-9 bg-[#3A3A3A] border-2 border-orange-800 rounded-xl flex items-center justify-center text-orange-800 shadow-xl">
                                            <span className="font-bebas text-lg">3</span>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{topThree[2].rank || 'AGENTE'}</p>
                                        <h3 className="text-md font-bebas text-white uppercase tracking-wider">{topThree[2].name}</h3>
                                        <div className="flex items-center justify-center gap-1 text-[#FFB700]">
                                            <Zap size={10} fill="#FFB700" />
                                            <span className="text-[10px] font-black">{topThree[2].xp} XP</span>
                                        </div>
                                    </div>
                                    <div className="w-full h-24 bg-gradient-to-b from-white/5 to-transparent rounded-t-3xl border-t border-x border-white/5 flex flex-col items-center justify-end pb-3">
                                        <Medal size={20} className="text-orange-800 opacity-50" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Global List Section */}
                    <div className="max-w-6xl mx-auto w-full">
                        <div className="bg-[#001f3f] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                            <div className="px-8 py-6 bg-black/20 flex items-center justify-between border-b border-white/5">
                                <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Lista de Escalafón Operativo</h4>
                                <div className="flex items-center gap-6">
                                    <span className="text-[10px] font-black text-white/40 uppercase">Agentes en {activeCategory === 'LEADERS' ? 'Mando' : activeTier}: {sortedAgents.length}</span>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/5">
                                            <th className="px-8 py-6 text-[9px] font-black text-gray-500 uppercase tracking-widest">Posición</th>
                                            <th className="px-8 py-6 text-[9px] font-black text-gray-500 uppercase tracking-widest">Identidad</th>
                                            <th className="px-8 py-6 text-[9px] font-black text-gray-500 uppercase tracking-widest text-center">Nivel Táctico</th>
                                            <th className="px-8 py-6 text-[9px] font-black text-gray-500 uppercase tracking-widest text-right">XP Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {restOfAgents.map((agent) => (
                                            <tr
                                                key={agent.id}
                                                className={`group hover:bg-[#FFB700]/5 transition-all duration-300 ${agent.id === currentUser?.id ? 'bg-[#FFB700]/10 border-l-4 border-l-[#FFB700]' : ''}`}
                                            >
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bebas text-lg ${getRankColor(agent.position)} bg-white/5 border border-white/10`}>
                                                            {agent.position}
                                                        </span>
                                                        {agent.id === currentUser?.id && (
                                                            <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-md">
                                                                <Target size={10} className="text-[#FFB700]" />
                                                                <span className="text-[8px] font-black text-white uppercase">TÚ</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="relative">
                                                            <img
                                                                src={formatDriveUrl(agent.photoUrl)}
                                                                className="w-12 h-12 rounded-xl object-cover grayscale group-hover:grayscale-0 transition-all border border-white/10"
                                                                onError={(e) => e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}
                                                            />
                                                            {agent.status === 'ACTIVO' && (
                                                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-[#001f3f] rounded-full"></div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] font-black text-white uppercase tracking-wider font-montserrat">{agent.name}</p>
                                                            <p className="text-[8px] text-[#FFB700] font-bold uppercase tracking-widest opacity-60">{agent.id}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <div className="inline-flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
                                                        <Shield size={12} className="text-blue-400 opacity-60" />
                                                        <span className="text-[9px] font-black text-white uppercase tracking-widest font-bebas">{agent.rank || (activeCategory === 'LEADERS' ? 'LÍDER' : 'AGENTE')}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <div className="flex items-center gap-2 group-hover:scale-110 transition-transform">
                                                            <span className="text-xl font-bebas text-white tracking-widest">{agent.xp}</span>
                                                            <Zap size={14} className="text-[#FFB700]" fill="#FFB700" />
                                                        </div>
                                                        <div className="w-24 h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-blue-500 to-[#FFB700] transition-all duration-1000"
                                                                style={{ width: `${Math.min(100, (agent.xp / (sortedAgents[0]?.xp || 1)) * 100)}%` }}
                                                            ></div>
                                                        </div>
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
                <div className="py-20 text-center space-y-4 bg-[#001f3f]/50 border border-white/5 rounded-[3rem] animate-in fade-in">
                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-inner">
                        <Users size={40} className="text-white/20" />
                    </div>
                    <h3 className="text-2xl font-bebas text-white uppercase tracking-widest">Operación en Espera</h3>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em] max-w-sm mx-auto">Aún no hay agentes clasificados en la categoría <span className="text-[#FFB700]">{activeTier}</span>.</p>
                </div>
            )}

            {/* Motivation Footer */}
            <div className="bg-gradient-to-r from-[#FFB700]/5 to-transparent p-12 rounded-[3.5rem] flex flex-col md:flex-row items-center justify-between gap-8 border border-[#FFB700]/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFB700]/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-2xl"></div>
                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-20 h-20 bg-[#FFB700] rounded-[2rem] flex items-center justify-center text-[#001f3f] shadow-[0_15px_30px_rgba(255,183,0,0.4)] rotate-3">
                        <Trophy size={40} />
                    </div>
                    <div>
                        <h3 className="text-3xl font-bebas text-white uppercase tracking-wider">¿QUIERES ESCALAR?</h3>
                        <p className="text-[10px] text-white/50 font-bold uppercase tracking-[0.2em] max-w-xs">Participa en misiones académicas y eventos tácticos para aumentar tu XP.</p>
                    </div>
                </div>
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="relative z-10 bg-[#FFB700] text-[#001f3f] px-12 py-5 rounded-2xl font-black uppercase text-[12px] tracking-[0.2em] shadow-[0_15px_35px_rgba(255,183,0,0.3)] hover:scale-105 active:scale-95 transition-all font-bebas"
                >
                    Volver a la cima
                </button>
            </div>
        </div>
    );
};

export default TacticalRanking;
