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

    // --- AUTOPLAY SLIDER LOGIC ---
    const sliderRef = React.useRef<HTMLDivElement>(null);
    const [sliderIndex, setSliderIndex] = React.useState(0);
    const sliderItems = React.useMemo(() => {
        const items = [
            ...activeEvents.map(evt => ({ id: evt.id, type: 'event', event: evt, title: evt.titulo, sub: 'OPERACIÓN', color: 'amber', icon: <Calendar size={20} /> })),
            { id: 'nehemias', type: 'shortcut', view: AppView.IQ_GAME, title: 'PROYECTO NEHEMÍAS', sub: 'INTELIGENCIA', color: 'blue', icon: <Brain size={20} /> },
            { id: 'duelos', type: 'shortcut', view: AppView.DUEL_ARENA, title: 'ARENA DE DUELOS', sub: 'COMBATE', color: 'red', icon: <Swords size={20} /> }
        ];
        return items;
    }, [activeEvents]);

    React.useEffect(() => {
        if (sliderItems.length <= 1) return;
        const interval = setInterval(() => {
            setSliderIndex(prev => (prev + 1) % sliderItems.length);
        }, 4000); // Rota cada 4 segundos
        return () => clearInterval(interval);
    }, [sliderItems.length]);

    // SCROLL SILENCIOSO (Evita saltos de página)
    React.useEffect(() => {
        if (sliderRef.current) {
            const container = sliderRef.current;
            const targetScroll = sliderIndex * container.clientWidth;
            container.scrollTo({
                left: targetScroll,
                behavior: 'smooth'
            });
        }
    }, [sliderIndex]);

    switch (view) {
        case AppView.HOME:
            return (
                <motion.div variants={viewVariants} initial="initial" animate="animate" exit="exit" key="home" className="h-full">
                    <div className="max-w-2xl mx-auto pt-4 pb-10 ig-container font-montserrat">
                        {/* HISTORIAS FULL WIDTH (IG STYLE) */}
                        <div className="mb-4 -mx-4 px-4 overflow-x-auto no-scrollbar border-b border-white/5 pb-4">
                            <StoriesBar currentUser={currentUser} />
                        </div>

                        {/* TACTICAL DASHBOARD SLIDER (AUTOPLAY) */}
                        <div className="mb-6 -mx-4 relative group overflow-hidden">
                            <div
                                className="flex overflow-x-auto no-scrollbar pb-4 scroll-smooth snap-x snap-mandatory"
                                ref={sliderRef}
                            >
                                {sliderItems.map((item: any, idx) => (
                                    <div key={item.id} className="w-full shrink-0 px-4 snap-center">
                                        <button
                                            onClick={() => {
                                                if (item.type === 'shortcut') setView(item.view);
                                                else if (item.type === 'event') handleConfirmEventAttendance(item.event);
                                            }}
                                            className={`flex items-center gap-4 p-5 rounded-xl w-full border transition-all shadow-lg active:scale-[0.98] ${item.color === 'blue' ? 'bg-blue-900/10 border-blue-500/30 hover:bg-blue-900/20' :
                                                item.color === 'red' ? 'bg-red-900/10 border-red-500/30 hover:bg-red-900/20' :
                                                    'bg-[#ffb700]/10 border-[#ffb700]/40 hover:bg-[#ffb700]/20'
                                                }`}
                                        >
                                            <div className={`p-4 rounded-lg shadow-inner shrink-0 ${item.color === 'blue' ? 'bg-blue-500/20 text-blue-400' :
                                                item.color === 'red' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-[#ffb700]/20 text-[#ffb700]'
                                                }`}>
                                                {item.icon}
                                            </div>
                                            <div className="text-left min-w-0 flex-1">
                                                <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${item.color === 'blue' ? 'text-blue-400' :
                                                    item.color === 'red' ? 'text-red-400' :
                                                        'text-[#ffb700]'
                                                    }`}>{item.sub}</p>
                                                <h4 className="text-[16px] font-bebas tracking-widest text-white leading-tight uppercase truncate">{item.title}</h4>
                                                {item.type === 'event' && item.event ? (
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-white/60 font-medium">{item.event.fecha}</span>
                                                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-white/60 font-medium">{item.event.hora || 'S/H'}</span>
                                                    </div>
                                                ) : (
                                                    <p className="text-[10px] text-white/30 mt-1 font-medium italic">ACCESO PRIORITARIO</p>
                                                )}
                                            </div>
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Indicadores de Slider */}
                            <div className="flex justify-center gap-1.5 mt-2">
                                {sliderItems.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={`h-1 rounded-full transition-all duration-300 ${idx === sliderIndex ? 'w-4 bg-[#ffb700]' : 'w-1 bg-white/10'}`}
                                    />
                                ))}
                            </div>
                        </div>

                        <div id="tutorial-daily-verse" className="w-full animate-in slide-in-from-top-4 duration-1000 mb-2">
                            <DailyVerse
                                verse={dailyVerse ? { ...dailyVerse, lastStreakDate: currentUser?.lastStreakDate } : null}
                                streakCount={currentUser?.streakCount}
                                onQuizComplete={handleVerseQuizComplete}
                                agent={currentUser || undefined}
                            />
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
                                <button id="btn-combatir" onClick={() => setView(AppView.BIBLE_WAR_ARENA)} className={`p-4 glass-card border-white/10 rounded-3xl flex flex-col items-center gap-2 hover:bg-blue-500/10 hover:border-blue-500/40 transition-all active:scale-90 shadow-lg group ${currentUser?.id === 'CON-TEST1' || currentUser?.id === 'CON-TEST2' ? 'py-8 border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : ''}`}>
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

                            <button onClick={() => setView(AppView.DEPLOYMENT_AUTH)} className="p-4 glass-card border-white/10 rounded-3xl flex flex-col items-center gap-2 hover:bg-red-500/10 hover:border-red-500/40 transition-all active:scale-90 shadow-lg group">
                                <ShieldCheck size={24} className="text-red-400 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] transition-transform" />
                                <span className="text-[10px] font-black uppercase tracking-widest font-bebas text-white/60 group-hover:text-white transition-colors">Autorización</span>
                            </button>

                            <button onClick={() => setView(AppView.HELP_CENTER)} className="p-4 glass-card border-white/10 rounded-3xl flex flex-col items-center gap-2 hover:bg-white/10 hover:border-white/20 transition-all active:scale-90 shadow-lg group">
                                <HelpCircle size={24} className="text-blue-400 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.5)] transition-transform" />
                                <span className="text-[10px] font-black uppercase tracking-widest font-bebas text-white/60 group-hover:text-white transition-colors">Ayuda</span>
                            </button>
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
