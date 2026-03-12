import React from 'react';
import { motion } from 'framer-motion';
import {
    Bell, Calendar, Target, ShieldCheck, CheckCircle2,
    Loader2, Download, Trophy, UserPlus, AlertTriangle,
    ChevronRight, Activity, Brain, Swords, HelpCircle
} from 'lucide-react';
import { AppView, Agent, UserRole, DailyVerse as DailyVerseType } from '../../types';
import PromotionProgressCard from '../PromotionProgressCard';
import BadgeShowcase from '../BadgeShowcase';
import DailyVerse from '../DailyVerse';
import IntelFeed from '../IntelFeed';
import AcademyModule from '../AcademyModule';
import CIUModule from '../IntelligenceCenter';
import TrainingCenter from '../TrainingCenter';
import StoriesBar from '../StoriesBar';
import { formatDriveUrl } from '../../services/storageUtils';
import { parseAttendanceDate } from '../../utils/dateUtils';
import { generateGoogleCalendarLink, downloadIcsFile, parseEventDate } from '../../services/calendarService';

interface StudentViewProps {
    view: AppView;
    currentUser: Agent | null;
    isOnline: boolean;
    notificationPermission: string;
    initFirebaseMessaging: () => void | Promise<void>;
    dailyVerse: DailyVerseType | null;
    handleVerseQuizComplete: () => void | Promise<void>;

    headlines: string[];
    agents: Agent[];
    effectiveRole: UserRole;
    setView: (view: AppView) => void;
    activeEvents: any[];
    handleConfirmEventAttendance: (event: any) => void;
    isConfirmingEvent: string | null;
    userConfirmations: string[];
    handleRefreshIntel: () => void | Promise<void>;

    isRefreshingIntel: boolean;
    intelReport: string;
    visitorRadar: any[];
    resetSessionTimer: () => void;
    setScannedAgentForPoints: (agent: Agent | null) => void;
    onAgentClick: (agent: Agent) => void;
    showAlert: (config: { title: string, message: string, type: 'SUCCESS' | 'ERROR' | 'INFO' | 'CONFIRM', onConfirm?: () => void | Promise<void> }) => void;
    syncData?: (force?: boolean) => any;
}

const viewVariants: any = {
    initial: { opacity: 0, y: 15, filter: 'blur(10px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.4, ease: "circOut" } },
    exit: { opacity: 0, y: -15, filter: 'blur(10px)', transition: { duration: 0.3, ease: "circIn" } }
};


const StudentView: React.FC<StudentViewProps> = (props) => {
    const {
        view, currentUser, isOnline, notificationPermission, initFirebaseMessaging,
        dailyVerse, handleVerseQuizComplete, headlines, agents, effectiveRole,
        setView, activeEvents, handleConfirmEventAttendance, isConfirmingEvent,
        userConfirmations, handleRefreshIntel, isRefreshingIntel, intelReport,
        visitorRadar, resetSessionTimer, setScannedAgentForPoints, onAgentClick, showAlert, syncData
    } = props;

    switch (view) {
        case AppView.HOME:
            return (
                <motion.div variants={viewVariants} initial="initial" animate="animate" exit="exit" key="home" className="h-full">
                    <div className="max-w-2xl mx-auto pt-4 pb-10 ig-container font-montserrat">
                        {/* TACTICAL DASHBOARD SLIDER (HORIZONTAL) - TOP POSITION */}
                        <div className="mb-4 -mx-4 px-4 overflow-x-auto no-scrollbar flex gap-3 pb-2 pt-2 border-b border-white/5">
                            {/* Shortcut: Proyecto Nehemías */}
                            <button
                                onClick={() => setView(AppView.IQ_GAME)}
                                className="flex items-center gap-3 p-4 bg-blue-900/10 border border-blue-500/10 rounded-3xl shrink-0 w-64 hover:bg-blue-900/20 transition-all group shadow-lg"
                            >
                                <div className="p-3 bg-blue-500/20 rounded-2xl group-hover:bg-blue-500 transition-colors shadow-inner">
                                    <Brain className="text-blue-400 group-hover:text-white" size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-blue-400 mb-0.5">INTELIGENCIA</p>
                                    <h4 className="text-[12px] font-bebas tracking-widest text-white leading-none">PROYECTO NEHEMÍAS</h4>
                                </div>
                            </button>

                            {/* Shortcut: Arena de Duelos */}
                            <button
                                onClick={() => setView(AppView.DUEL_ARENA)}
                                className="flex items-center gap-3 p-4 bg-red-900/10 border border-red-500/10 rounded-3xl shrink-0 w-64 hover:bg-red-900/20 transition-all group shadow-lg"
                            >
                                <div className="p-3 bg-red-500/20 rounded-2xl group-hover:bg-red-500 transition-colors shadow-inner">
                                    <Swords className="text-red-400 group-hover:text-white" size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-red-400 mb-0.5">COMBATE</p>
                                    <h4 className="text-[12px] font-bebas tracking-widest text-white leading-none">ARENA DE DUELOS</h4>
                                </div>
                            </button>

                            {/* Active Operations listed horizontally */}
                            {activeEvents.map(evt => (
                                <div
                                    key={evt.id}
                                    className="flex items-center gap-4 p-4 bg-[#ffb700]/10 border border-[#ffb700]/30 rounded-3xl shrink-0 w-72 hover:bg-[#ffb700]/20 transition-all cursor-pointer shadow-lg group relative overflow-hidden"
                                    onClick={() => handleConfirmEventAttendance(evt)}
                                >
                                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform">
                                        <Target size={40} className="text-[#ffb700]" />
                                    </div>
                                    <div className="p-3 bg-[#ffb700]/20 rounded-2xl shadow-inner shrink-0">
                                        <Calendar size={20} className="text-[#ffb700]" />
                                    </div>
                                    <div className="text-left min-w-0">
                                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#ffb700] mb-0.5">OPERACIÓN</p>
                                        <h4 className="text-[12px] font-bebas tracking-widest text-white leading-none truncate">{evt.titulo}</h4>
                                        <p className="text-[9px] text-white/40 mt-1 font-medium">{evt.fecha} @ {evt.hora || 'S/H'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* HISTORIAS FULL WIDTH (IG STYLE) */}
                        <div className="mb-4 -mx-4 px-4 overflow-x-auto no-scrollbar border-b border-white/5 pb-4">
                            <StoriesBar currentUser={currentUser} />
                        </div>
                        {currentUser?.id !== 'CON-TEST1' && currentUser?.id !== 'CON-TEST2' && (
                            <IntelFeed
                                headlines={headlines}
                                agents={agents}
                                userRole={effectiveRole}
                                currentUser={currentUser}
                                onAgentClick={onAgentClick}
                            />
                        )}

                        {/* RADAR DE DESERCIÓN RÁPIDO */}
                        {(() => {
                            const isCommandRole = currentUser?.userRole === UserRole.DIRECTOR || currentUser?.userRole === UserRole.LEADER;
                            if (isCommandRole) {
                                const dangerCount = agents.filter(a => {
                                    if (!a.lastAttendance || a.lastAttendance === 'N/A') return false;
                                    const lastDate = parseAttendanceDate(a.lastAttendance);
                                    if (!lastDate) return false;
                                    const diffDays = Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
                                    return diffDays >= 21;
                                }).length;

                                if (dangerCount === 0) return null;

                                return (
                                    <div onClick={() => setView(AppView.VISITOR)} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl transition-all cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <AlertTriangle className="text-red-500" size={18} />
                                            <div>
                                                <p className="text-[10px] text-red-500/80 font-black uppercase tracking-widest">{dangerCount} AGENTES EN PELIGRO CRÍTICO</p>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-red-500" />
                                    </div>
                                );
                            } else {
                                if (!currentUser?.lastAttendance || currentUser.lastAttendance === 'N/A') return null;
                                const myLastDate = parseAttendanceDate(currentUser.lastAttendance);
                                if (!myLastDate) return null;
                                const myDiffDays = Math.floor((new Date().getTime() - myLastDate.getTime()) / (1000 * 60 * 60 * 24));

                                if (myDiffDays < 14) return null;

                                return (
                                    <div className="flex items-center justify-between p-2">
                                        <div className="flex items-center gap-3">
                                            <AlertTriangle className="text-amber-500" size={18} />
                                            <div>
                                                <p className="text-[10px] text-amber-500/80 font-black uppercase tracking-widest">LLEVAS {myDiffDays} DÍAS SIN ASISTIR. ¡NO TE RINDAS!</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                        })()}


                        <div className={`grid gap-3 ${currentUser?.id === 'CON-TEST1' || currentUser?.id === 'CON-TEST2' ? 'grid-cols-1' : 'grid-cols-2 xs:grid-cols-3'}`}>
                            {currentUser?.id !== 'CON-TEST1' && currentUser?.id !== 'CON-TEST2' && (
                                <button id="btn-ranking" onClick={() => setView(AppView.RANKING)} className="p-4 glass-card border-white/10 rounded-3xl flex flex-col items-center gap-2 hover:bg-[#ffb700]/10 hover:border-[#ffb700]/40 transition-all active:scale-90 shadow-lg group">
                                    <Trophy size={24} className="text-[#ffb700] group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(255,183,0,0.5)] transition-transform" />
                                    <span className="text-[10px] font-black uppercase tracking-widest font-bebas text-white/60 group-hover:text-white transition-colors">Ranking</span>
                                </button>
                            )}

                            {(currentUser?.userRole === UserRole.DIRECTOR || currentUser?.id === 'CON-TEST1' || currentUser?.id === 'CON-TEST2') && (
                                <button id="btn-combatir" onClick={() => setView(AppView.BIBLE_WAR_STUDENT)} className={`p-4 glass-card border-white/10 rounded-3xl flex flex-col items-center gap-2 hover:bg-blue-500/10 hover:border-blue-500/40 transition-all active:scale-90 shadow-lg group ${currentUser?.id === 'CON-TEST1' || currentUser?.id === 'CON-TEST2' ? 'py-8 border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : ''}`}>
                                    <ShieldCheck size={24} className="text-blue-400 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.5)] transition-transform" />
                                    <span className="text-[10px] font-black uppercase tracking-widest font-bebas text-white/60 group-hover:text-white transition-colors">Combatir</span>
                                </button>
                            )}

                            {currentUser?.userRole !== UserRole.STUDENT && currentUser?.id !== 'CON-TEST1' && currentUser?.id !== 'CON-TEST2' && (
                                <button onClick={() => setView(AppView.ENROLLMENT)} className="p-4 glass-card border-white/10 rounded-3xl flex flex-col items-center gap-2 hover:bg-white/10 hover:border-white/20 transition-all active:scale-90 shadow-lg group">
                                    <UserPlus size={24} className="text-[#ffb700] group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(255,183,0,0.5)] transition-transform" />
                                    <span className="text-[10px] font-black uppercase tracking-widest font-bebas text-white/60 group-hover:text-white transition-colors">Reclutar</span>
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            );

        case AppView.CIU:
            return (
                <motion.div variants={viewVariants} initial="initial" animate="animate" exit="exit" key="ciu" className="h-full">
                    {currentUser ? (
                        <CIUModule
                            agents={agents}
                            currentUser={currentUser}
                            onUpdateNeeded={async () => {
                                if (syncData) await syncData();
                                resetSessionTimer();
                            }}
                            intelReport={intelReport}
                            setView={setView}
                            visitorCount={visitorRadar.length}
                            onRefreshIntel={handleRefreshIntel}
                            isRefreshingIntel={isRefreshingIntel}
                            onAgentClick={(agent) => { setScannedAgentForPoints(agent); setView(AppView.HOME); }}
                            userRole={effectiveRole}
                            onActivateNotifications={initFirebaseMessaging}
                        />
                    ) : null}
                </motion.div>
            );

        case AppView.ACADEMIA:
            return (
                <motion.div variants={viewVariants} initial="initial" animate="animate" exit="exit" key="academia" className="h-full">
                    <AcademyModule userRole={effectiveRole} agentId={currentUser?.id || ''} onActivity={resetSessionTimer} onUpdateNeeded={syncData} />
                </motion.div>
            );

        case AppView.CONTENT:
            return (
                <motion.div variants={viewVariants} initial="initial" animate="animate" exit="exit" key="social_feed" className="h-full">
                    <div className="p-5 md:p-8 pb-10 max-w-2xl mx-auto font-montserrat">
                        <IntelFeed
                            headlines={headlines}
                            agents={agents}
                            userRole={effectiveRole}
                            currentUser={currentUser}
                            onAgentClick={onAgentClick}
                            filterType="SOCIAL" // Solo hilos
                        />
                    </div>
                </motion.div>
            );

        case AppView.ASCENSO:
        case AppView.TAREAS:
            return (
                <motion.div variants={viewVariants} initial="initial" animate="animate" exit="exit" key="training" className="h-full">
                    {currentUser ? (
                        <TrainingCenter
                            currentUser={currentUser}
                            setView={setView}
                            onUpdateNeeded={() => resetSessionTimer()}
                            initialTab={
                                view === AppView.TAREAS ? 'misiones' : 'ascenso'
                            }
                        />
                    ) : null}
                </motion.div>
            );

        default:
            return null;
    }
};

export default StudentView;
