import React from 'react';
import { motion } from 'framer-motion';
import {
    Users, Search, Crown, Zap, Trophy, Target, Key,
    Fingerprint, Loader2, LogOut, ChevronRight, Medal
} from 'lucide-react';
import { AppView, Agent, UserRole } from '../../types';
import DigitalIdCard from '../DigitalIdCard';
import BibleWarDisplay from '../BibleWar/BibleWarDisplay';
import { formatDriveUrl } from '../../services/storageUtils';

interface SharedViewProps {
    view: AppView;
    setView: (view: AppView) => void;
    agents: Agent[];
    currentUser: Agent | null;
    directorySearch: string;
    setDirectorySearch: (s: string) => void;
    setFoundAgent: (a: Agent | null) => void;
    badges: any[];
    biometricAvailable: boolean;
    isRegisteringBio: boolean;
    registerBiometric: (id: string, name: string, credentials: string[]) => Promise<string>;
    registerBiometrics: (id: string, credentialId: string) => Promise<{ success: boolean }>;
    handleLogout: (purge: boolean) => void;
    showAlert: (config: any) => void;
    syncData: (force?: boolean) => void;
    viewingAsRole: UserRole | null;
    setViewingAsRole: (role: UserRole | null) => void;
}

const viewVariants: any = {
    initial: { opacity: 0, y: 15, filter: 'blur(10px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.4, ease: "circOut" } },
    exit: { opacity: 0, y: -15, filter: 'blur(10px)', transition: { duration: 0.3, ease: "circIn" } }
};


const SharedView: React.FC<SharedViewProps> = (props) => {
    const {
        view, setView, agents, currentUser, directorySearch, setDirectorySearch,
        setFoundAgent, badges, biometricAvailable, isRegisteringBio,
        registerBiometric, registerBiometrics, handleLogout, showAlert,
        syncData, viewingAsRole, setViewingAsRole
    } = props;

    switch (view) {
        case AppView.DIRECTORY:
            const search = directorySearch.toLowerCase();
            const matchSearch = (a: any) => !directorySearch || a.name.toLowerCase().includes(search) || String(a.id).includes(directorySearch);
            const directors = agents.filter(a => a.userRole === UserRole.DIRECTOR && matchSearch(a));
            const leaders = agents.filter(a => a.userRole === UserRole.LEADER && matchSearch(a)).sort((a, b) => b.xp - a.xp);
            const students = agents.filter(a => (a.userRole === UserRole.STUDENT || !a.userRole) && matchSearch(a)).sort((a, b) => b.xp - a.xp);

            const renderGrid = (list: typeof agents, borderClass: string, xpColor: string) => (
                <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4">
                    {list.map((a, idx) => (
                        <div
                            key={a.id}
                            onClick={() => setFoundAgent(a)}
                            className={`group relative aspect-square rounded-3xl overflow-hidden border-2 ${borderClass} transition-all p-1 active:scale-90 cursor-pointer shadow-lg hover:shadow-2xl hover:-translate-y-1`}
                        >
                            <img
                                src={formatDriveUrl(a.photoUrl, a.name)}
                                className="w-full h-full object-cover rounded-2xl grayscale group-hover:grayscale-0 transition-all duration-700"
                                onError={(e) => {
                                    const target = e.currentTarget as HTMLImageElement;
                                    if (!target.src.includes('ui-avatars.com')) {
                                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(a.name || 'Agente')}&background=1A1A1A&color=FFB700&size=200&bold=true`;
                                    }
                                }}
                            />
                            <div className="absolute top-1 right-1 flex flex-col gap-1 z-10">
                                {badges.filter(b => String(b.agentId) === String(a.id) || String(b.agentName) === String(a.name)).map((b, i) => (
                                    <div key={i} className="w-4 h-4 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-[8px]" title={b.label}>
                                        {b.emoji}
                                    </div>
                                ))}
                            </div>
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-2 text-center pointer-events-none">
                                <p className="text-[8px] font-black text-white uppercase truncate leading-none mb-0.5">{a.name.split(' ')[0]}</p>
                                <p className={`text-[6px] font-bold ${xpColor}`}>{a.xp} XP</p>
                            </div>
                        </div>
                    ))}
                </div>
            );

            return (
                <motion.div variants={viewVariants} initial="initial" animate="animate" exit="exit" key="directory" className="h-full">
                    <div className="p-6 md:p-10 space-y-6 pb-24 max-w-4xl mx-auto">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                            <div>
                                <h2 className="text-3xl font-bebas text-white tracking-widest uppercase">Directorio de Agentes</h2>
                                <p className="text-[10px] text-[#ffb700] font-black uppercase tracking-[0.3em] font-montserrat opacity-60">Toca un agente para ver su perfil</p>
                            </div>
                        </div>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="BUSCAR AGENTE..."
                                value={directorySearch}
                                onChange={(e) => setDirectorySearch(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-[11px] font-black uppercase tracking-widest outline-none focus:border-[#ffb700] transition-all placeholder:text-white/20"
                            />
                            <Search size={16} className="absolute right-6 top-1/2 -translate-y-1/2 text-white/30" />
                        </div>
                        <div className="space-y-6 pb-10">
                            {directors.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 px-1">
                                        <Crown size={14} className="text-[#ffb700]" />
                                        <span className="text-[9px] text-[#ffb700] font-black uppercase tracking-[0.3em]">Directores ({directors.length})</span>
                                    </div>
                                    {renderGrid(directors, "border-[#ffb700]/30 bg-[#ffb700]/5 hover:border-[#ffb700]/50", "text-[#ffb700]")}
                                </div>
                            )}
                            {leaders.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 px-1">
                                        <Zap size={14} className="text-blue-400" />
                                        <span className="text-[9px] text-blue-400 font-black uppercase tracking-[0.3em]">Líderes ({leaders.length})</span>
                                    </div>
                                    {renderGrid(leaders, "border-blue-400/20 bg-blue-400/5 hover:border-blue-400/40", "text-blue-400")}
                                </div>
                            )}
                            {students.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 px-1">
                                        <Users size={14} className="text-white/60" />
                                        <span className="text-[9px] text-white/60 font-black uppercase tracking-[0.3em]">Estudiantes ({students.length})</span>
                                    </div>
                                    {renderGrid(students, "border-white/5 bg-white/5 hover:border-white/20", "text-[#ffb700]")}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            );

        case AppView.PROFILE:
            return (
                <motion.div variants={viewVariants} initial="initial" animate="animate" exit="exit" key="profile" className="h-full">
                    <div className="p-6 md:p-10 space-y-8 pb-32 max-w-2xl mx-auto font-montserrat flex flex-col items-center">
                        <div className="w-full flex justify-between items-center mb-4">
                            <h2 className="text-3xl font-bebas text-white tracking-widest uppercase truncate">Expediente de Agente</h2>
                            <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                                <Target className="text-[#ffb700]" size={20} />
                            </div>
                        </div>

                        {currentUser && <DigitalIdCard agent={currentUser} onClose={() => setView(AppView.HOME)} />}

                        {currentUser?.userRole === UserRole.DIRECTOR && (
                            <div className="w-full space-y-2 mt-6">
                                <p className="text-[8px] text-white/40 font-black uppercase tracking-widest text-center">Vista como rol</p>
                                <div className="grid grid-cols-3 gap-2">
                                    <button onClick={() => setViewingAsRole(viewingAsRole === UserRole.STUDENT ? null : UserRole.STUDENT)} className={`py-3 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all ${viewingAsRole === UserRole.STUDENT ? 'bg-[#ffb700] text-[#001f3f] border-[#ffb700]' : 'bg-white/5 text-white/40 border-white/10'}`}>Estudiante</button>
                                    <button onClick={() => setViewingAsRole(viewingAsRole === UserRole.LEADER ? null : UserRole.LEADER)} className={`py-3 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all ${viewingAsRole === UserRole.LEADER ? 'bg-blue-500 text-white border-blue-500' : 'bg-white/5 text-white/40 border-white/10'}`}>Líder</button>
                                    <button onClick={() => setViewingAsRole(viewingAsRole === UserRole.DIRECTOR ? null : UserRole.DIRECTOR)} className={`py-3 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all ${(!viewingAsRole || viewingAsRole === UserRole.DIRECTOR) ? 'bg-[#ffb700] text-[#001f3f] border-[#ffb700]' : 'bg-white/5 text-white/40 border-white/10'}`}>Director</button>
                                </div>
                            </div>
                        )}

                        <div className="w-full space-y-3 mt-6">
                            {biometricAvailable && (
                                <button
                                    onClick={async () => {
                                        if (!currentUser) return;
                                        try {
                                            const credentialId = await registerBiometric(currentUser.id, currentUser.name, currentUser.biometricCredential ? [currentUser.biometricCredential] : []);
                                            if (credentialId) {
                                                const res = await registerBiometrics(currentUser.id, credentialId);
                                                if (res.success) {
                                                    showAlert({ title: "ÉXITO", message: "BIOMETRÍA REGISTRADA.", type: 'SUCCESS' });
                                                    syncData();
                                                }
                                            }
                                        } catch (err: any) {
                                            showAlert({ title: "ERROR", message: err.message || "FALLO BIOMÉTRICO.", type: 'ERROR' });
                                        }
                                    }}
                                    disabled={isRegisteringBio}
                                    className="w-full flex items-center justify-between px-6 py-5 bg-blue-600/10 border border-blue-500/20 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest font-bebas group"
                                >
                                    <div className="flex items-center gap-3">
                                        {isRegisteringBio ? <Loader2 size={18} className="animate-spin" /> : <Fingerprint size={18} className="text-blue-400" />}
                                        <span>Configurar Biometría</span>
                                    </div>
                                    <div className={`w-2 h-2 rounded-full ${currentUser?.biometricCredential ? 'bg-green-500' : 'bg-red-500 pulse-red'}`} />
                                </button>
                            )}

                            <button
                                onClick={() => handleLogout(false)}
                                className="w-full flex items-center justify-center gap-3 px-6 py-5 bg-white/5 border border-white/10 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest font-bebas"
                            >
                                <LogOut size={18} /> Cerrar Conexión
                            </button>
                        </div>
                    </div>
                </motion.div>
            );

        case AppView.BIBLE_WAR_DISPLAY:
            return (
                <motion.div variants={viewVariants} initial="initial" animate="animate" exit="exit" key="bible_war_display" className="h-full">
                    <BibleWarDisplay />
                </motion.div>
            );

        default:
            return null;
    }
};

export default SharedView;
