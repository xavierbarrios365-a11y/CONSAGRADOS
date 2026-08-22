import React from 'react';
import { motion } from 'framer-motion';
import {
    Bell, Calendar, Target, ShieldCheck, CheckCircle2,
    Loader2, Download, Trophy, UserPlus, AlertTriangle,
    ChevronRight, Activity, Brain, Swords, HelpCircle,
    Flame, BookOpen, GraduationCap, Sparkles, Zap
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
                    <div className="max-w-md mx-auto pt-2 pb-28 px-3.5 font-montserrat space-y-4">
                        {/* HISTORIAS FULL WIDTH (IG STYLE) */}
                        <div className="mb-2 -mx-3.5 px-3.5 overflow-x-auto no-scrollbar border-b border-white/5 pb-3">
                            <StoriesBar currentUser={currentUser} />
                        </div>

                        {/* TACTICAL DASHBOARD SLIDER (AUTOPLAY) */}
                        {sliderItems.length > 0 && (
                            <div className="relative group overflow-hidden rounded-2xl">
                                <div
                                    className="flex overflow-x-auto no-scrollbar pb-1 scroll-smooth snap-x snap-mandatory"
                                    ref={sliderRef}
                                >
                                    {sliderItems.map((item: any) => (
                                        <div key={item.id} className="w-full shrink-0 snap-center">
                                            <button
                                                onClick={() => {
                                                    if (item.type === 'shortcut') setView(item.view);
                                                    else if (item.type === 'event') handleConfirmEventAttendance(item.event);
                                                }}
                                                className={`flex items-center gap-3.5 p-4 rounded-2xl w-full border transition-all shadow-lg active:scale-[0.98] ${
                                                    item.color === 'blue' ? 'bg-gradient-to-r from-blue-900/20 to-blue-600/10 border-blue-500/30 hover:border-blue-400/50' :
                                                    item.color === 'red' ? 'bg-gradient-to-r from-red-900/20 to-red-600/10 border-red-500/30 hover:border-red-400/50' :
                                                    'bg-gradient-to-r from-amber-500/15 to-yellow-500/5 border-[#ffb700]/30 hover:border-[#ffb700]/60'
                                                }`}
                                            >
                                                <div className={`p-3 rounded-xl shadow-inner shrink-0 ${
                                                    item.color === 'blue' ? 'bg-blue-500/20 text-blue-400' :
                                                    item.color === 'red' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-[#ffb700]/20 text-[#ffb700]'
                                                }`}>
                                                    {item.icon}
                                                </div>
                                                <div className="text-left min-w-0 flex-1">
                                                    <p className={`text-[8px] font-black uppercase tracking-[0.2em] mb-0.5 ${
                                                        item.color === 'blue' ? 'text-blue-400' :
                                                        item.color === 'red' ? 'text-red-400' :
                                                        'text-[#ffb700]'
                                                    }`}>{item.sub}</p>
                                                    <h4 className="text-sm md:text-base font-bebas tracking-wider text-white leading-tight uppercase truncate">{item.title}</h4>
                                                    {item.type === 'event' && item.event ? (
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[8px] text-white/70 font-medium">{item.event.fecha}</span>
                                                            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[8px] text-white/70 font-medium">{item.event.hora || 'S/H'}</span>
                                                        </div>
                                                    ) : (
                                                        <p className="text-[8px] text-white/40 mt-0.5 font-bold uppercase tracking-widest font-bebas">ACCESO INMEDIATO</p>
                                                    )}
                                                </div>
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* Indicadores de Slider */}
                                {sliderItems.length > 1 && (
                                    <div className="flex justify-center gap-1.5 mt-1.5">
                                        {sliderItems.map((_, idx) => (
                                            <div
                                                key={idx}
                                                className={`h-1 rounded-full transition-all duration-300 ${idx === sliderIndex ? 'w-3.5 bg-[#ffb700]' : 'w-1 bg-white/15'}`}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* RETO / PROTOCOLO DEL VERSÍCULO DEL DÍA (TOUCH TO LAUNCH) */}
                        <div id="tutorial-daily-verse" className="w-full">
                            <DailyVerse
                                verse={dailyVerse ? { ...dailyVerse, lastStreakDate: currentUser?.lastStreakDate } : null}
                                streakCount={currentUser?.streakCount}
                                onQuizComplete={handleVerseQuizComplete}
                                agent={currentUser || undefined}
                            />
                        </div>

                        {/* SHORTCUTS GRID TÁCTICO MÓVIL */}
                        <div className="grid grid-cols-4 gap-2">
                            <button
                                onClick={() => setView(AppView.BIBLE)}
                                className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-[#ffb700]/40 flex flex-col items-center gap-1 transition-all text-center active:scale-95 shadow-md"
                            >
                                <BookOpen size={18} className="text-[#ffb700]" />
                                <span className="text-[9px] font-black uppercase text-white font-bebas tracking-wide">Biblia</span>
                            </button>

                            <button
                                onClick={() => setView(AppView.ACADEMIA)}
                                className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-blue-500/40 flex flex-col items-center gap-1 transition-all text-center active:scale-95 shadow-md"
                            >
                                <GraduationCap size={18} className="text-blue-400" />
                                <span className="text-[9px] font-black uppercase text-white font-bebas tracking-wide">Academia</span>
                            </button>

                            <button
                                onClick={() => setView(AppView.RANKING)}
                                className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-yellow-500/40 flex flex-col items-center gap-1 transition-all text-center active:scale-95 shadow-md"
                            >
                                <Trophy size={18} className="text-yellow-400" />
                                <span className="text-[9px] font-black uppercase text-white font-bebas tracking-wide">Ranking</span>
                            </button>

                            <button
                                onClick={() => {
                                    if (currentUser) onAgentClick(currentUser);
                                }}
                                className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-emerald-500/40 flex flex-col items-center gap-1 transition-all text-center active:scale-95 shadow-md"
                            >
                                <ShieldCheck size={18} className="text-emerald-400" />
                                <span className="text-[9px] font-black uppercase text-white font-bebas tracking-wide">Carnet 3D</span>
                            </button>
                        </div>

                        {/* FEED DE NOTICIAS & INTEL */}
                        {currentUser?.id !== 'CON-TEST1' && currentUser?.id !== 'CON-TEST2' && (
                            <IntelFeed
                                headlines={headlines}
                                agents={agents}
                                userRole={effectiveRole}
                                currentUser={currentUser}
                                onAgentClick={onAgentClick}
                            />
                        )}
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
