import React from 'react';
import { motion } from 'framer-motion';
import {
    Bell, Calendar, Target, ShieldCheck, CheckCircle2,
    Loader2, Download, Trophy, UserPlus, AlertTriangle,
    ChevronRight, Activity
} from 'lucide-react';
import { AppView, Agent, UserRole, DailyVerse as DailyVerseType } from '../../types';
import PromotionProgressCard from '../PromotionProgressCard';
import BadgeShowcase from '../BadgeShowcase';
import DailyVerse from '../DailyVerse';
import IntelFeed from '../IntelFeed';
import AcademyModule from '../AcademyModule';
import CIUModule from '../IntelligenceCenter';
import TrainingCenter from '../TrainingCenter';
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
    showAlert: (config: { title: string, message: string, type: 'SUCCESS' | 'ERROR' | 'INFO' | 'CONFIRM', onConfirm?: () => void | Promise<void> }) => void;
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
        visitorRadar, resetSessionTimer, setScannedAgentForPoints, showAlert
    } = props;

    switch (view) {
        case AppView.HOME:
            return (
                <motion.div variants={viewVariants} initial="initial" animate="animate" exit="exit" key="home" className="h-full">
                    <div className="p-5 md:p-8 space-y-6 pb-24 max-w-2xl mx-auto font-montserrat">
                        {/* ENCABEZADO COMPACTO */}
                        <div className="flex items-center gap-4 mb-2">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-[9px] text-[#ffb700] font-black uppercase tracking-[0.3em] font-montserrat opacity-60">Agente Activo</p>
                                            <div
                                                className={`w-1.5 h-1.5 rounded-full ${isOnline && notificationPermission === 'granted' ? 'bg-[#ffb700] shadow-[0_0_8px_rgba(255,183,0,0.8)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'} animate-pulse`}
                                                title={isOnline && notificationPermission === 'granted' ? 'CONECTADO' : 'DESCONECTADO'}
                                            />
                                        </div>
                                        <p className="text-xl font-bebas text-white tracking-widest uppercase truncate leading-none mt-0.5">
                                            {currentUser?.name
                                                ? currentUser.name.split(' ').slice(0, 2).join(' ')
                                                : 'Agente'}
                                        </p>
                                    </div>
                                    {currentUser && (
                                        <div className="hidden xs:block">
                                            <PromotionProgressCard
                                                agentId={currentUser.id}
                                                currentRank={currentUser.rank}
                                                compact={true}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-3 mt-2">
                                    <span className="text-[8px] text-white/40 font-black uppercase tracking-wider bg-white/5 px-3 py-1 rounded-full">{currentUser?.rank || 'RECLUTA'}</span>
                                    <div className="flex-1">
                                        <BadgeShowcase
                                            currentAgentId={currentUser?.id}
                                            currentAgentName={currentUser?.name}
                                            mode="profile"
                                            compact={true}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* BOTÓN DE ACTIVACIÓN NOTIF */}
                        {notificationPermission !== 'granted' && (
                            <div className="mb-6">
                                <button
                                    onClick={initFirebaseMessaging}
                                    className="w-full py-3 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-600/30 transition-all active:scale-95 font-bebas flex items-center justify-center gap-3"
                                >
                                    <Bell size={14} className="animate-swing" />
                                    ACTIVAR CANAL TÁCTICO DE NOTIFICACIONES
                                </button>
                            </div>
                        )}

                        <div className="w-full animate-in slide-in-from-top-4 duration-1000 mb-6">
                            <DailyVerse
                                verse={dailyVerse ? { ...dailyVerse, lastStreakDate: currentUser?.lastStreakDate } : null}
                                streakCount={currentUser?.streakCount}
                                onQuizComplete={handleVerseQuizComplete}
                                agent={currentUser || undefined}
                            />
                        </div>

                        {currentUser?.id !== 'CON-TEST1' && currentUser?.id !== 'CON-TEST2' && (
                            <IntelFeed headlines={headlines} agents={agents} userRole={effectiveRole} />
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
                                    <div onClick={() => setView(AppView.VISITOR)} className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/30 rounded-2xl cursor-pointer animate-pulse hover:bg-red-500/20 transition-all">
                                        <div className="flex items-center gap-3">
                                            <AlertTriangle className="text-red-500" size={20} />
                                            <div>
                                                <p className="text-[10px] text-white font-black uppercase tracking-widest">COMANDO: ALERTA DE DESERCIÓN</p>
                                                <p className="text-[8px] text-red-500/80 font-bold uppercase">{dangerCount} AGENTES EN PELIGRO CRÍTICO</p>
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
                                    <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <AlertTriangle className="text-amber-500" size={20} />
                                            <div>
                                                <p className="text-[10px] text-white font-black uppercase tracking-widest">⚠️ ALERTA PERSONAL</p>
                                                <p className="text-[8px] text-amber-500/80 font-bold uppercase">LLEVAS {myDiffDays} DÍAS SIN ASISTIR. ¡NO TE RINDAS!</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                        })()}

                        {/* EVENTOS ACTIVOS */}
                        {activeEvents.length > 0 && (
                            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-700">
                                <div className="flex items-center gap-2 mb-2">
                                    <Calendar size={14} className="text-[#ffb700] animate-pulse" />
                                    <span className="text-[10px] font-black text-white/60 uppercase tracking-widest font-bebas">Operaciones Próximas</span>
                                </div>
                                {activeEvents.map(evt => (
                                    <div key={evt.id} className="bg-[#001833] border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                            <Target size={60} className="text-[#ffb700]" />
                                        </div>
                                        <div className="relative z-10">
                                            <h4 className="text-lg font-bebas font-black text-white uppercase tracking-wider">{evt.titulo}</h4>
                                            <p className="text-[8px] text-[#ffb700] font-black uppercase tracking-widest mb-3 opacity-80">{evt.fecha} @ {evt.hora || 'S/H'}</p>
                                            {evt.descripcion && <p className="text-[9px] text-white/50 mb-4 leading-relaxed font-montserrat">{evt.descripcion}</p>}

                                            <div className="flex flex-col gap-2">
                                                {userConfirmations.includes(String(evt.titulo).trim()) ? (
                                                    <div className="w-full bg-green-500/10 border border-green-500/30 text-green-500 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 font-bebas">
                                                        <ShieldCheck size={14} /> Misión Confirmada
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleConfirmEventAttendance(evt)}
                                                        disabled={isConfirmingEvent === evt.id}
                                                        className="w-full bg-[#ffb700] text-[#001f3f] font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest hover:bg-[#ffb700]/90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 font-bebas shadow-[0_10px_20px_rgba(255,183,0,0.2)]"
                                                    >
                                                        {isConfirmingEvent === evt.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                                        Confirmar Mi Asistencia
                                                    </button>
                                                )}

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            try {
                                                                const startDate = parseEventDate(evt.fecha, evt.hora);
                                                                const endDate = new Date(startDate.getTime() + 2 * 3600000);
                                                                const calLink = generateGoogleCalendarLink({
                                                                    title: evt.titulo,
                                                                    description: evt.descripcion || '',
                                                                    startTime: startDate,
                                                                    endTime: endDate
                                                                });
                                                                if (calLink) {
                                                                    window.open(calLink, '_blank', 'noopener,noreferrer');
                                                                } else {
                                                                    showAlert({ title: "ERROR", message: "No se pudo generar el enlace.", type: 'ERROR' });
                                                                }
                                                            } catch (e) {
                                                                showAlert({ title: "ERROR", message: "Fecha inválida.", type: 'ERROR' });
                                                            }
                                                        }}
                                                        className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-white/10 py-3 rounded-xl text-white/70 text-[8px] font-black uppercase tracking-widest hover:bg-[#ffb700]/20 hover:text-[#ffb700] transition-all"
                                                    >
                                                        <Calendar size={12} /> Google
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            try {
                                                                const startDate = parseEventDate(evt.fecha, evt.hora);
                                                                const endDate = new Date(startDate.getTime() + 2 * 3600000);
                                                                downloadIcsFile({
                                                                    title: evt.titulo,
                                                                    description: evt.descripcion || '',
                                                                    startTime: startDate,
                                                                    endTime: endDate
                                                                });
                                                            } catch (e) {
                                                                showAlert({ title: "ERROR", message: "Fecha inválida.", type: 'ERROR' });
                                                            }
                                                        }}
                                                        className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-white/10 py-3 rounded-xl text-white/70 text-[8px] font-black uppercase tracking-widest hover:bg-[#ffb700]/20 hover:text-[#ffb700] transition-all"
                                                    >
                                                        <Download size={12} /> Apple / Sistema
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className={`grid gap-3 ${currentUser?.id === 'CON-TEST1' || currentUser?.id === 'CON-TEST2' ? 'grid-cols-1' : 'grid-cols-2 xs:grid-cols-3'}`}>
                            {currentUser?.id !== 'CON-TEST1' && currentUser?.id !== 'CON-TEST2' && (
                                <button onClick={() => setView(AppView.RANKING)} className="p-4 glass-card border-white/10 rounded-3xl flex flex-col items-center gap-2 hover:bg-[#ffb700]/10 hover:border-[#ffb700]/40 transition-all active:scale-90 shadow-lg group">
                                    <Trophy size={24} className="text-[#ffb700] group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(255,183,0,0.5)] transition-transform" />
                                    <span className="text-[10px] font-black uppercase tracking-widest font-bebas text-white/60 group-hover:text-white transition-colors">Ranking</span>
                                </button>
                            )}

                            {(currentUser?.userRole === UserRole.DIRECTOR || currentUser?.id === 'CON-TEST1' || currentUser?.id === 'CON-TEST2') && (
                                <button onClick={() => setView(AppView.BIBLE_WAR_STUDENT)} className={`p-4 glass-card border-white/10 rounded-3xl flex flex-col items-center gap-2 hover:bg-blue-500/10 hover:border-blue-500/40 transition-all active:scale-90 shadow-lg group ${currentUser?.id === 'CON-TEST1' || currentUser?.id === 'CON-TEST2' ? 'py-8 border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : ''}`}>
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
                            onUpdateNeeded={() => resetSessionTimer()} // Reemplaza syncData si se maneja en App
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
                    <AcademyModule userRole={effectiveRole} agentId={currentUser?.id || ''} onActivity={resetSessionTimer} />
                </motion.div>
            );

        case AppView.ASCENSO:
        case AppView.CONTENT:
        case AppView.TAREAS:
            return (
                <motion.div variants={viewVariants} initial="initial" animate="animate" exit="exit" key="training" className="h-full">
                    {currentUser ? (
                        <TrainingCenter
                            currentUser={currentUser}
                            setView={setView}
                            onUpdateNeeded={() => resetSessionTimer()}
                            initialTab={
                                view === AppView.CONTENT ? 'material' :
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
