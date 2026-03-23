import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, QrCode, CheckCircle2, UserPlus, RefreshCw,
    Activity, Trash2, Loader2, AlertTriangle, ChevronRight,
    Users
} from 'lucide-react';

import { AppView, Agent, UserRole } from '../../types';
import AdminDashboard from '../AdminDashboard';
import { formatDriveUrl } from '../../services/storageUtils';
import { parseAttendanceDate } from '../../utils/dateUtils';
import { addVisitorXPSupabase } from '../../services/supabaseService';

interface DirectorViewProps {
    view: AppView;
    setView: (view: AppView) => void;
    videoRef: React.RefObject<HTMLVideoElement>;
    scanStatus: 'IDLE' | 'SCANNING' | 'SUCCESS' | 'ERROR';
    setScanStatus: (status: 'IDLE' | 'SCANNING' | 'SUCCESS' | 'ERROR') => void;
    processScan: (id?: string) => void;
    scannedId: string;
    setScannedId: (id: string) => void;
    agents: Agent[];
    currentUser: Agent | null;
    syncData: (force?: boolean) => void;
    isSyncing: boolean;
    visitorRadar: any[];
    registerVisitorSupabase: (id: string, name: string, reporter?: string, referrerId?: string, referrerName?: string) => Promise<{ success: boolean, error?: string }>;
    deleteAgentService: (id: string) => Promise<{ success: boolean, error?: string }>;
    showAlert: (config: { title: string, message: string, type: 'SUCCESS' | 'ERROR' | 'INFO' | 'CONFIRM', onConfirm?: () => void | Promise<void> }) => void;

    setShowExpedienteFor: (agent: Agent | null) => void;
}

const viewVariants: any = {
    initial: { opacity: 0, y: 15, filter: 'blur(10px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.4, ease: "circOut" } },
    exit: { opacity: 0, y: -15, filter: 'blur(10px)', transition: { duration: 0.3, ease: "circIn" } }
};


const DirectorView: React.FC<DirectorViewProps> = (props) => {
    const {
        view, setView, videoRef, scanStatus, setScanStatus, processScan,
        scannedId, setScannedId, agents, currentUser, syncData, isSyncing,
        visitorRadar, registerVisitorSupabase, deleteAgentService, showAlert,
        setShowExpedienteFor
    } = props;

    const [showVisitorModal, setShowVisitorModal] = useState<{ isOpen: boolean, targetId?: string, isReward?: boolean, visitorName?: string }>({ isOpen: false });
    const [visitorNameInput, setVisitorNameInput] = useState('');
    const [referrerIdInput, setReferrerIdInput] = useState('');
    const [rewardXpInput, setRewardXpInput] = useState(10);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleVisitorSubmit = async () => {
        if (!showVisitorModal.targetId) return;
        setIsSubmitting(true);
        try {
            if (showVisitorModal.isReward) {
                const res = await addVisitorXPSupabase(showVisitorModal.targetId, showVisitorModal.visitorName || 'Visitante', rewardXpInput, `Recompensa táctica de ${currentUser?.name}`);
                if (res.success) {
                    showAlert({ title: "MÉRITO ASIGNADO", message: `+${rewardXpInput} XP otorgados.`, type: 'SUCCESS' });
                    syncData(true);
                    setShowVisitorModal({ isOpen: false });
                } else {
                    showAlert({ title: "ERROR", message: res.error || "Fallo al asignar XP.", type: 'ERROR' });
                }
            } else {
                if (!visitorNameInput.trim()) {
                    showAlert({ title: "ERROR", message: "El nombre es obligatorio.", type: 'ERROR' });
                    setIsSubmitting(false);
                    return;
                }
                setScanStatus('SCANNING');
                const referrerAgent = agents.find(a => a.id === referrerIdInput);
                const res = await registerVisitorSupabase(showVisitorModal.targetId, visitorNameInput, currentUser?.name, referrerIdInput, referrerAgent?.name);
                if (res.success) {
                    setScanStatus('SUCCESS');
                    showAlert({ title: "VISITANTE REGISTRADO", message: "✅ Acceso concedido.", type: 'SUCCESS' });
                    setTimeout(() => { setScanStatus('IDLE'); setScannedId(''); syncData(true); }, 2000);
                    setShowVisitorModal({ isOpen: false });
                } else {
                    showAlert({ title: "FALLO DE SISTEMA", message: res.error || "Fallo en registro.", type: 'ERROR' });
                    setScanStatus('IDLE');
                }
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderContent = () => {
        switch (view) {
            case AppView.SCANNER:
                return (
                    <motion.div variants={viewVariants} initial="initial" animate="animate" exit="exit" key="scanner" className="h-full">
                        <div className="fixed inset-0 z-50 bg-[#001f3f] flex flex-col p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div className="space-y-1">
                                    <h2 className="text-3xl font-bebas text-white tracking-widest">Escáner Táctico</h2>
                                    <p className="text-[8px] text-[#ffb700] font-black uppercase tracking-[0.3em] opacity-60">Consagrados Force 2026</p>
                                </div>
                                <button onClick={() => setView(AppView.HOME)} className="p-3 bg-white/5 rounded-2xl border border-white/10 text-gray-400"><X size={24} /></button>
                            </div>

                            <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden rounded-[3rem] border border-white/5 bg-black/40">
                                <div className="absolute inset-0 z-0">
                                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover grayscale opacity-40" />
                                </div>
                                <div className="relative z-10 w-48 h-48 sm:w-64 sm:h-64 border-2 border-[#ffb700]/30 rounded-[2rem] flex flex-col items-center justify-center p-6 bg-black/40 backdrop-blur-md scanner-frame shadow-[0_0_30px_rgba(255,183,0,0.1)]">
                                    {scanStatus === 'SCANNING' ? (
                                        <>
                                            <div className="absolute inset-0 bg-gradient-to-b from-[#ffb700]/20 to-transparent animate-pulse rounded-[2rem]"></div>
                                            <QrCode size={40} className="text-[#ffb700] animate-bounce mb-3" />
                                            <p className="text-[10px] text-[#ffb700] font-black uppercase tracking-[0.2em] font-bebas">Buscando Agente...</p>
                                        </>
                                    ) : scanStatus === 'SUCCESS' ? (
                                        <div className="flex flex-col items-center gap-2 animate-in zoom-in-50 duration-300">
                                            <CheckCircle2 size={48} className="text-green-500" />
                                            <p className="text-[12px] text-green-500 font-black uppercase tracking-widest font-bebas">Verificado</p>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => { setScanStatus('SCANNING'); }}
                                            className="px-8 py-4 bg-[#ffb700] text-[#001f3f] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all font-bebas"
                                        >
                                            Reactivar Lente
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="w-full pt-6 pb-[env(safe-area-inset-bottom,20px)] flex-shrink-0 z-20">
                                <div className="max-w-sm mx-auto space-y-4">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="BUSCAR NOMBRE O ID..."
                                            value={scannedId}
                                            onChange={(e) => setScannedId(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-8 text-white text-[12px] font-black uppercase tracking-widest outline-none focus:border-[#ffb700] transition-all text-center placeholder:text-white/20"
                                        />
                                        {scannedId && !agents.find(a => String(a.id) === scannedId) && (
                                            <div className="absolute bottom-full left-0 right-0 mb-3 bg-[#001f3f] border border-white/10 rounded-2xl shadow-2xl max-h-60 overflow-y-auto p-2 z-50 animate-in slide-in-from-bottom-2 no-scrollbar">
                                                {agents.filter(a => a.name.toLowerCase().includes(scannedId.toLowerCase()) || String(a.id).includes(scannedId)).slice(0, 8).map(a => (
                                                    <button key={a.id} onClick={() => { setScannedId(a.id); processScan(a.id); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all text-left">
                                                        <img src={formatDriveUrl(a.photoUrl)} className="w-8 h-8 rounded-lg object-cover" />
                                                        <div>
                                                            <p className="text-[10px] font-black text-white uppercase leading-none">{a.name}</p>
                                                            <p className="text-[7px] text-[#ffb700]/60 font-bold">ID: {a.id}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => scannedId && processScan(scannedId)}
                                        disabled={!scannedId || !!(scannedId && !agents.find(a => String(a.id) === scannedId))}
                                        className="w-full bg-[#ffb700] py-5 rounded-3xl text-[#001f3f] font-black uppercase text-[11px] tracking-[0.2em] shadow-xl active:scale-95 transition-all disabled:opacity-20 flex items-center justify-center gap-3"
                                    >
                                        <CheckCircle2 size={18} /> Confirmar Asistencia
                                    </button>
                                    {scannedId && !agents.find(a => String(a.id) === scannedId) && (
                                        <button
                                            onClick={() => {
                                                setVisitorNameInput('');
                                                setReferrerIdInput('');
                                                setShowVisitorModal({ isOpen: true, targetId: scannedId });
                                            }}
                                            className="w-full bg-blue-600/20 border border-blue-500/30 text-blue-400 py-4 rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-blue-600/30 transition-all flex items-center justify-center gap-2 mt-2"
                                        >
                                            <UserPlus size={16} /> Registrar como Visitante
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="absolute top-6 right-6 z-20">
                                <button
                                    onClick={() => syncData()}
                                    className="p-3 bg-[#001f3f]/80 backdrop-blur-md border border-white/10 rounded-2xl text-[#ffb700] hover:bg-[#ffb700]/10 transition-all shadow-xl active:scale-95"
                                    title="Actualizar Radar"
                                >
                                    <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
                                </button>
                            </div>
                        </div>
                    </motion.div >
                );

            case AppView.VISITOR:
                return (
                    <motion.div variants={viewVariants} initial="initial" animate="animate" exit="exit" key="visitor" className="h-full">
                        <div className="p-6 md:p-10 space-y-8 pb-10 max-w-4xl mx-auto">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                                <div>
                                    <h2 className="text-3xl font-bebas text-white tracking-widest uppercase">Radar de Inteligencia</h2>
                                    <p className="text-[10px] text-[#ffb700] font-black uppercase tracking-[0.3em] font-montserrat opacity-60">SISTEMA DE ANÁLISIS DE SEÑALES TÁCTICAS</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <button onClick={() => syncData()} className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/40 border border-white/10">
                                        <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} /> ESCANEAR DESERCIONES
                                    </button>
                                    <button onClick={() => setView(AppView.ENROLLMENT)} className="bg-green-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-green-900/40 border border-white/10">
                                        <UserPlus size={16} /> INSCRIPCIÓN DE AGENTE
                                    </button>
                                    <button onClick={() => {
                                        setVisitorNameInput('');
                                        setReferrerIdInput('');
                                        setShowVisitorModal({ isOpen: true, targetId: `VISIT-${Date.now()}` });
                                    }} className="bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-blue-900/40 border border-white/10">
                                        <UserPlus size={16} /> REGISTRAR VISITANTE
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-12">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                                        <Activity size={18} className="text-red-500 animate-pulse" />
                                        <h3 className="text-xl font-bebas text-white tracking-widest uppercase">RADAR DE DESERCIÓN</h3>
                                    </div>
                                    {(() => {
                                        const riskAgents = agents.filter(a => {
                                            if (a.status === 'OCULTO') return false;
                                            const isStudent = (a.userRole === UserRole.STUDENT || !a.userRole);
                                            if (!isStudent) return false;
                                            if (!a.lastAttendance || a.lastAttendance === 'N/A') return true;
                                            const lastDate = parseAttendanceDate(a.lastAttendance);
                                            if (!lastDate) return true;
                                            const diffDays = Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
                                            return diffDays >= 14;
                                        }).sort((a, b) => {
                                            const dateA = parseAttendanceDate(a.lastAttendance);
                                            const dateB = parseAttendanceDate(b.lastAttendance);
                                            if (!dateA) return -1;
                                            if (!dateB) return 1;
                                            return dateA.getTime() - dateB.getTime();
                                        });

                                        if (riskAgents.length === 0) return (
                                            <div className="py-8 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                                                <p className="text-[10px] text-white/30 font-black uppercase tracking-widest font-bebas">No se detectan agentes en riesgo crítico</p>
                                            </div>
                                        );

                                        return (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {riskAgents.map(a => {
                                                    const lastDate = parseAttendanceDate(a.lastAttendance);
                                                    const diffDays = lastDate ? Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)) : 999;
                                                    const isDanger = diffDays >= 21;
                                                    return (
                                                        <div key={a.id} onClick={() => setShowExpedienteFor(a)} className={`group relative bg-[#001833] border rounded-[2.5rem] p-6 hover:border-[#ffb700]/30 transition-all cursor-pointer shadow-xl hover:-translate-y-1 ${isDanger ? 'border-red-500/30' : 'border-amber-500/20'}`}>
                                                            <div className="flex items-center gap-4">
                                                                <div className="relative w-16 h-16">
                                                                    <img src={formatDriveUrl(a.photoUrl)} className="w-full h-full rounded-2xl object-cover grayscale group-hover:grayscale-0 transition-all border border-white/10" />
                                                                    <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-[#001833] ${isDanger ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                                                                </div>
                                                                <div className="flex-1 overflow-hidden">
                                                                    <p className="text-lg font-bebas text-white uppercase tracking-wider truncate">{a.name}</p>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${isDanger ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                                            {diffDays >= 999 ? 'SIN REGISTRO' : `${diffDays} DÍAS AUSENTE`}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                {currentUser?.userRole === UserRole.DIRECTOR && (
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            onClick={async (e) => {
                                                                                e.stopPropagation();
                                                                                if (window.confirm(`⚠️ ¿OCULTAR PERFIL DE ${a.name.toUpperCase()}?\n\nEste perfil ya no será visible en rankings ni en el radar.`)) {
                                                                                    try {
                                                                                        const { supabase } = await import('../../services/supabaseService');
                                                                                        const { error } = await supabase.from('agentes').update({ status: 'OCULTO' }).eq('id', a.id);
                                                                                        if (!error) {
                                                                                            showAlert({ title: "OPERACIÓN EXITOSA", message: "PERFIL OCULTADO.", type: 'SUCCESS' });
                                                                                            syncData();
                                                                                        }
                                                                                    } catch (err) { }
                                                                                }
                                                                            }}
                                                                            className="p-2 bg-zinc-600/20 border border-zinc-500/30 text-[10px] font-bebas tracking-widest text-zinc-400 rounded-xl hover:bg-zinc-600/40 transition-all active:scale-90 flex items-center justify-center"
                                                                            title="Ocultar Perfil"
                                                                        >
                                                                            Ocultar
                                                                        </button>
                                                                        <button
                                                                            onClick={async (e) => {
                                                                                e.stopPropagation();
                                                                                showAlert({
                                                                                    title: "BAJA DE AGENTE",
                                                                                    message: `¿Estás seguro de que deseas eliminar permanentemente al agente ${a.name}?`,
                                                                                    type: 'CONFIRM',
                                                                                    onConfirm: async () => {
                                                                                        const res = await deleteAgentService(a.id);
                                                                                        if (res.success) {
                                                                                            showAlert({ title: "OPERACIÓN EXITOSA", message: `AGENTE ${a.name} ELIMINADO.`, type: 'SUCCESS' });
                                                                                            syncData();
                                                                                        } else {
                                                                                            showAlert({ title: "FALLO TÁCTICO", message: res.error || "Error al eliminar.", type: 'ERROR' });
                                                                                        }
                                                                                    }
                                                                                });
                                                                            }}
                                                                            className="p-2 bg-red-500/10 border border-red-500/30 rounded-xl hover:bg-red-500/30 transition-all active:scale-90"
                                                                        >
                                                                            <Trash2 size={16} className="text-red-500" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                                        <Users size={18} className="text-[#ffb700]" />
                                        <h3 className="text-xl font-bebas text-white tracking-widest uppercase">Señales Externas (Visitantes)</h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {visitorRadar.length > 0 ? (
                                            visitorRadar.map(v => (
                                                <div key={v.id} onClick={() => { setScannedId(v.id); setView(AppView.SCANNER); }} className="group relative bg-[#001833] border border-white/5 rounded-[2.5rem] p-8 hover:border-[#ffb700]/30 transition-all cursor-pointer shadow-xl hover:-translate-y-1">
                                                    <div className="absolute top-4 right-6">
                                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="p-3 bg-white/5 rounded-2xl w-fit group-hover:bg-[#ffb700]/10 transition-colors">
                                                            <Users className="text-[#ffb700]" size={24} />
                                                        </div>
                                                        <div>
                                                            <p className="text-xl font-bebas text-white uppercase tracking-wider group-hover:text-[#ffb700] transition-colors">{v.name}</p>
                                                            <p className="text-[10px] text-gray-400 font-mono mt-1">{v.id}</p>
                                                            <span className="text-[8px] text-white/40 font-black uppercase tracking-widest mt-2 block flex justify-between">
                                                                <span>{v.visits || 0} Visitas</span>
                                                                {v.xp > 0 && <span className="text-green-400">+{v.xp} XP</span>}
                                                            </span>
                                                            {v.referrerName && (
                                                                <div className="mt-2 text-[8px] tracking-widest uppercase font-black px-2 py-1 bg-white/5 rounded-lg border border-white/10 text-[#ffb700]/70 truncate inline-block">
                                                                    Ref: {v.referrerName}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setRewardXpInput(10);
                                                            setShowVisitorModal({ isOpen: true, targetId: v.id, isReward: true, visitorName: v.name });
                                                        }}
                                                        className="w-full mt-4 py-3 bg-white/5 hover:bg-green-500/20 text-white/50 hover:text-green-400 border border-white/10 hover:border-green-500/30 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <CheckCircle2 size={12} /> Otorgar XP Misión
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
                                                <Activity className="mx-auto text-gray-800 mb-4 opacity-20" size={48} />
                                                <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest font-bebas">Buscando señales externas tácticas...</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );

            case AppView.ADMIN:
                return (
                    <motion.div variants={viewVariants} initial="initial" animate="animate" exit="exit" key="admin" className="h-full">
                        <AdminDashboard
                            currentUser={currentUser}
                            onClose={() => setView(AppView.HOME)}
                            onRefreshGlobalData={() => syncData(false)}
                        />
                    </motion.div>
                );

            default:
                return null;
        }
    };

    return (
        <>
            {renderContent()}
            <AnimatePresence>
                {showVisitorModal.isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-montserrat"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="bg-[#001833] border border-[#ffb700]/30 rounded-[2rem] p-6 sm:p-8 w-full max-w-md shadow-2xl relative overflow-hidden"
                        >
                            <button onClick={() => setShowVisitorModal({ isOpen: false })} className="absolute top-4 right-4 p-2 text-white/40 hover:text-white transition-colors bg-white/5 rounded-full"><X size={20} /></button>

                            <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-6">
                                {showVisitorModal.isReward ? <Activity className="text-green-400" size={24} /> : <UserPlus className="text-[#ffb700]" size={24} />}
                                <h3 className="text-2xl font-bebas tracking-widest text-white uppercase">
                                    {showVisitorModal.isReward ? 'Asignar Mérito Táctico' : 'Registro de Visitante'}
                                </h3>
                            </div>

                            <div className="space-y-5">
                                {showVisitorModal.isReward ? (
                                    <>
                                        <div>
                                            <p className="text-[10px] text-white/50 font-black uppercase tracking-widest mb-2">Visitante</p>
                                            <p className="text-lg font-bebas text-white tracking-widest">{showVisitorModal.visitorName}</p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-white/50 font-black uppercase tracking-widest mb-2 block">Puntos (XP) a Otorgar</label>
                                            <div className="flex items-center gap-3">
                                                {[10, 25, 50].map(points => (
                                                    <button key={points} onClick={() => setRewardXpInput(points)} className={`flex-1 py-3 rounded-xl border font-black text-xs transition-all ${rewardXpInput === points ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/30'}`}>
                                                        +{points} XP
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="text-[10px] text-white/50 font-black uppercase tracking-widest mb-2 block">Nombre Completo</label>
                                            <input
                                                type="text"
                                                value={visitorNameInput}
                                                onChange={e => setVisitorNameInput(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl py-4 px-4 text-white text-[12px] font-bold uppercase tracking-widest outline-none focus:border-[#ffb700] transition-colors"
                                                placeholder="EJ. JUAN PÉREZ"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-[#ffb700]/70 font-black uppercase tracking-widest mb-2 block flex items-center justify-between">
                                                <span>¿Referido por algún Agente?</span>
                                                <span className="text-[8px] text-white/30">(OPCIONAL)</span>
                                            </label>
                                            <select
                                                value={referrerIdInput}
                                                onChange={e => setReferrerIdInput(e.target.value)}
                                                className="w-full bg-black/40 border border-[#ffb700]/20 rounded-xl py-4 px-4 text-white text-[10px] font-bold uppercase tracking-widest outline-none focus:border-[#ffb700] transition-colors appearance-none"
                                            >
                                                <option value="">-- NINGUNO (VINO POR SU CUENTA) --</option>
                                                {agents.filter(a => a.userRole === UserRole.STUDENT || a.userRole === UserRole.LEADER).sort((a, b) => a.name.localeCompare(b.name)).map(a => (
                                                    <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
                                                ))}
                                            </select>
                                        </div>
                                    </>
                                )}

                                <button
                                    onClick={handleVisitorSubmit}
                                    disabled={isSubmitting || (!showVisitorModal.isReward && !visitorNameInput.trim())}
                                    className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-[12px] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 bg-[#ffb700] text-[#001f3f] hover:bg-[#ffb700]/90 shadow-[0_0_15px_rgba(255,183,0,0.3)] active:scale-[0.98]"
                                >
                                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                    {showVisitorModal.isReward ? 'Otorgar Puntos' : 'Registrar Ingreso'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default DirectorView;
