
import React, { useState } from 'react';
import { BookOpen, ClipboardList, ChevronUp, ArrowLeft, Target, Sparkles, Zap, Skull } from 'lucide-react';
import ContentModule from './ContentModule';
import TasksModule from './TasksModule';
import PromotionModule from './PromotionModule';
import BibleWarDirector from './BibleWar/BibleWarDirector';
import { AppView, Agent, UserRole, Guide } from '../types';

interface TrainingCenterProps {
    currentUser: Agent;
    setView: (view: AppView) => void;
    onUpdateNeeded: () => void;
    initialTab?: 'material' | 'misiones' | 'ascenso' | 'guerra';
}

const TrainingCenter: React.FC<TrainingCenterProps> = ({
    currentUser,
    setView,
    onUpdateNeeded,
    initialTab = 'material'
}) => {
    const [activeTab, setActiveTab] = useState<'material' | 'misiones' | 'ascenso' | 'guerra'>(initialTab);

    const tabs = [
        { id: 'material', label: 'Material', icon: <BookOpen size={18} />, color: 'text-blue-400' },
        { id: 'misiones', label: 'Misiones', icon: <ClipboardList size={18} />, color: 'text-amber-400' },
        { id: 'ascenso', label: 'Ascenso', icon: <ChevronUp size={18} />, color: 'text-[#ffb700]' },
        ...(currentUser.userRole === UserRole.DIRECTOR ? [{ id: 'guerra', label: 'Guerra', icon: <Skull size={18} />, color: 'text-red-500' }] : []),
    ];

    return (
        <div className="min-h-screen bg-[#001f3f] flex flex-col animate-in fade-in duration-500 pb-24">
            {/* Header Táctico */}
            <div className="bg-black/40 backdrop-blur-md border-b border-white/5 p-6 sticky top-0 z-20">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setView(AppView.HOME)}
                            className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/60"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bebas text-white tracking-widest uppercase leading-none">Centro de Capacitación</h1>
                            <p className="text-[8px] text-[#ffb700] font-black uppercase tracking-[0.3em] mt-1 opacity-70">SISTEMA INTEGRADO DE CRECIMIENTO</p>
                        </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
                        <Zap size={14} className="text-[#ffb700]" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">{currentUser.xp} XP</span>
                    </div>
                </div>
            </div>

            {/* Selector de Tabs Premium */}
            <div className="p-4 sticky top-[80px] z-10 bg-[#001f3f]/95 backdrop-blur-sm">
                <div className="max-w-md mx-auto bg-black/30 p-1.5 rounded-2xl flex gap-1 border border-white/5 shadow-2xl">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab.id
                                ? 'bg-[#ffb700] text-[#001f3f] shadow-[0_0_20px_rgba(255,183,0,0.3)] scale-[1.02]'
                                : 'text-white/40 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {tab.icon}
                            <span className="hidden xs:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Contenido Dinámico */}
            <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-6">
                {activeTab === 'material' && (
                    <div className="animate-in slide-in-from-right-4 duration-500">
                        <ContentModule userRole={currentUser.userRole} />
                    </div>
                )}
                {activeTab === 'misiones' && (
                    <div className="animate-in slide-in-from-right-4 duration-500">
                        <TasksModule agentId={currentUser.id} agentName={currentUser.name} userRole={currentUser.userRole} />
                    </div>
                )}
                {activeTab === 'ascenso' && (
                    <div className="animate-in slide-in-from-right-4 duration-500">
                        <PromotionModule agentId={currentUser.id} agentName={currentUser.name} userRole={currentUser.userRole} onActivity={onUpdateNeeded} />
                    </div>
                )}
                {activeTab === 'guerra' && currentUser.userRole === UserRole.DIRECTOR && (
                    <div className="animate-in slide-in-from-right-4 duration-500 h-full">
                        <BibleWarDirector />
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrainingCenter;
