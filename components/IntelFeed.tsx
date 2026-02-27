import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield, Activity, Cpu, Target, Zap,
    ChevronRight, RefreshCw, Trophy,
    GraduationCap, Award, Flame, AlertCircle, Share2, Trash2
} from 'lucide-react';
import { Agent, NewsFeedItem, UserRole } from '../types';
import { fetchNewsFeedSupabase as fetchNewsFeed, deleteNewsItemSupabase } from '../services/supabaseService';
import { formatDriveUrl } from '../services/storageUtils';
import AchievementShareCard from './AchievementShareCard';
import { useTacticalAlert } from './TacticalAlert';

interface NewsFeedProps {
    onActivity?: () => void;
    headlines?: string[];
    agents?: Agent[];
    userRole?: UserRole;
}

const TACTICAL_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    'CURSO_COMPLETADO': { icon: <GraduationCap size={16} />, color: '#3b82f6', label: 'ACADEMIA' },
    'ASCENSO': { icon: <Shield size={16} />, color: '#f59e0b', label: 'ASCENSO' },
    'CERTIFICADO': { icon: <Award size={16} />, color: '#8b5cf6', label: 'CERTIFICACIÓN' },
    'RACHA': { icon: <Flame size={16} />, color: '#ef4444', label: 'CONSAGRACIÓN' },
    'RANKING': { icon: <Trophy size={16} />, color: '#fbbf24', label: 'RANKING' },
    'TAREA': { icon: <Target size={16} />, color: '#22c55e', label: 'MISIÓN' },
    'DESPLIEGUE': { icon: <Cpu size={16} />, color: '#ffb700', label: 'LOGÍSTICA' },
    'OPERACION': { icon: <Activity size={16} />, color: '#00ffff', label: 'OPERACIÓN' },
};

const IntelFeed: React.FC<NewsFeedProps> = ({ onActivity, headlines = [], agents = [], userRole }) => {
    const { showAlert } = useTacticalAlert();
    const [news, setNews] = useState<NewsFeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);
    const [sharePreview, setSharePreview] = useState<{
        agent?: Agent;
        newsItem?: NewsFeedItem;
    } | null>(null);

    const PAGE_SIZE = 5;
    const totalPages = Math.ceil(news.length / PAGE_SIZE);
    const displayedNews = news.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

    const loadNews = async () => {
        setLoading(true);
        try {
            const data = await fetchNewsFeed();
            setNews(data || []);
            setCurrentPage(0); // Reset on refresh
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => {
        loadNews();
        // Latido profesional: Actualizar noticias cada 30 segundos
        const heartBeat = setInterval(loadNews, 30000);
        return () => clearInterval(heartBeat);
    }, []);

    if (loading) {
        return (
            <div className="space-y-4 p-4 bg-black/20 rounded-3xl border border-white/5 animate-pulse">
                <div className="h-4 w-32 bg-white/5 rounded-full" />
                <div className="space-y-2">
                    {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white/5 rounded-2xl w-full" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-700">
            {/* Intel Header */}
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Activity size={18} className="text-[#ffb700] animate-pulse" />
                        <div className="absolute inset-0 bg-[#ffb700]/20 blur-sm animate-pulse rounded-full" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[12px] font-black text-white uppercase tracking-[0.2em] font-bebas leading-tight">Intel Feed</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[7px] font-black text-[#ffb700]/60 uppercase tracking-[0.3em] font-montserrat">Centro de Inteligencia</span>
                            {totalPages > 1 && (
                                <span className="text-[8px] bg-[#ffb700]/10 text-[#ffb700] px-1.5 py-0.5 rounded font-black border border-[#ffb700]/20">
                                    PÁGINA {currentPage + 1}/{totalPages}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadNews} className="p-2 text-white/40 hover:text-[#ffb700] transition-colors"><RefreshCw size={14} /></button>
                    {totalPages > 1 && (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                                disabled={currentPage === 0}
                                className="p-2 bg-white/5 border border-white/10 rounded-xl text-white/40 disabled:opacity-20 hover:bg-white/10 transition-all"
                            >
                                <ChevronRight size={14} className="rotate-180" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                                disabled={currentPage === totalPages - 1}
                                className="p-2 bg-white/5 border border-white/10 rounded-xl text-white/40 disabled:opacity-20 hover:bg-white/10 transition-all"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-2 relative">
                {/* Decorative side line */}
                <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-[#ffb700]/40 via-white/5 to-transparent ml-1" />

                <AnimatePresence mode="popLayout">
                    {displayedNews.length > 0 ? (
                        displayedNews.map((item, idx) => {
                            const config = TACTICAL_CONFIG[item.type] || { icon: <AlertCircle size={16} />, color: '#9ca3af', label: 'NOTIFICACIÓN' };
                            let agent = agents.find(a => String(a.id) === String(item.agentId));
                            if (!agent && item.message) {
                                agent = agents.find(a => item.message.toUpperCase().includes(a.name.toUpperCase()));
                            }

                            const photoUrl = agent?.photoUrl ? formatDriveUrl(agent.photoUrl) : null;
                            const agentName = agent ? agent.name.split(' ')[0] : 'SISTEMA';

                            return (
                                <div key={item.id || idx} className="relative ml-4 group/swipe overflow-hidden rounded-2xl">
                                    {/* Action Background (Red Delete) - Solo para Directores/Líderes */}
                                    {(userRole === UserRole.DIRECTOR || userRole === UserRole.LEADER) && (
                                        <div className="absolute inset-0 bg-red-600/20 backdrop-blur-md flex items-center justify-end px-8 border border-red-500/30">
                                            <div className="flex flex-col items-center gap-1 text-red-500 animate-pulse">
                                                <Trash2 size={24} />
                                                <span className="text-[8px] font-black uppercase tracking-widest">Eliminar</span>
                                            </div>
                                        </div>
                                    )}

                                    <motion.div
                                        key={item.id || idx}
                                        layout
                                        drag={(userRole === UserRole.DIRECTOR || userRole === UserRole.LEADER) ? "x" : false}
                                        dragConstraints={{ left: -100, right: 0 }}
                                        dragElastic={0.1}
                                        onDragEnd={(event, info) => {
                                            if (info.offset.x < -80) {
                                                showAlert({
                                                    title: "ELIMINAR NOTICIA",
                                                    message: "¿Estás seguro de que deseas eliminar esta notificación del feed?",
                                                    type: 'CONFIRM',
                                                    onConfirm: async () => {
                                                        const res = await deleteNewsItemSupabase(item.id);
                                                        if (res.success) {
                                                            showAlert({ title: "ÉXITO", message: "NOTICIA ELIMINADA", type: 'SUCCESS' });
                                                            loadNews();
                                                        } else {
                                                            showAlert({
                                                                title: "FALLO TÁCTICO",
                                                                message: `ERROR DE PERMISOS: ${res.error || 'Acceso Denegado'}\n\nAplica el parche RLS en Supabase Central.`,
                                                                type: 'ERROR'
                                                            });
                                                        }
                                                    }
                                                });
                                            }
                                        }}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{
                                            opacity: 1,
                                            x: 0,
                                            transition: { delay: idx * 0.1 }
                                        }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        whileHover={{ backgroundColor: "rgba(255, 183, 0, 0.08)" }}
                                        className="relative p-4 bg-[#001f3f]/40 backdrop-blur-xl border border-white/5 hover:border-[#ffb700]/20 transition-all duration-300 overflow-hidden cursor-grab active:cursor-grabbing"
                                    >
                                        {/* Scanline Effect on Hover */}
                                        <div className="absolute inset-x-0 top-0 h-[1px] bg-[#ffb700]/10 group-hover:animate-scanline pointer-events-none" />

                                        <div className="flex items-start gap-4">
                                            <div className="relative shrink-0">
                                                {photoUrl ? (
                                                    <div className="relative">
                                                        <img
                                                            src={photoUrl}
                                                            alt={agent?.name || 'Agente'}
                                                            className="w-10 h-10 rounded-xl object-cover border border-white/10 shadow-lg transition-transform"
                                                        />
                                                        <div
                                                            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-lg flex items-center justify-center shadow-lg border border-black/20"
                                                            style={{
                                                                backgroundColor: config.color,
                                                                color: '#001f3f'
                                                            }}
                                                        >
                                                            {React.isValidElement(config.icon) ? React.cloneElement(config.icon as React.ReactElement<any>, { size: 10 }) : config.icon}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg transition-transform"
                                                        style={{
                                                            backgroundColor: `${config.color}15`,
                                                            border: `1px solid ${config.color}30`,
                                                            color: config.color
                                                        }}
                                                    >
                                                        {config.icon}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0 pt-0.5">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[#ffb700] uppercase tracking-widest">
                                                        {agent ? agentName : config.label}
                                                    </span>
                                                    <span className="text-[7px] text-white/20 font-black uppercase tracking-wider">{item.date}</span>
                                                </div>
                                                <p className="text-[11px] text-white/80 font-bold leading-tight line-clamp-2 uppercase tracking-wide font-montserrat">
                                                    {item.message}
                                                </p>
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        setSharePreview({ agent, newsItem: item });
                                                    }}
                                                    className="shrink-0 p-2 text-white/20 hover:text-[#ffb700] transition-colors"
                                                    title="Compartir Logro"
                                                >
                                                    <Share2 size={16} />
                                                </button>

                                                {(userRole === UserRole.DIRECTOR || userRole === UserRole.LEADER) && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            showAlert({
                                                                title: "ELIMINAR NOTICIA",
                                                                message: "¿Estás seguro de que deseas eliminar esta notificación del feed?",
                                                                type: 'CONFIRM',
                                                                onConfirm: async () => {
                                                                    const res = await deleteNewsItemSupabase(item.id);
                                                                    if (res.success) {
                                                                        showAlert({ title: "ÉXITO", message: "NOTICIA ELIMINADA", type: 'SUCCESS' });
                                                                        loadNews();
                                                                    } else {
                                                                        showAlert({ title: "ERROR", message: "FALLO AL ELIMINAR", type: 'ERROR' });
                                                                    }
                                                                }
                                                            });
                                                        }}
                                                        className="shrink-0 p-2 text-white/10 hover:text-red-500 transition-colors"
                                                        title="Eliminar Noticia"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            );
                        })
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-8 text-center bg-white/5 rounded-3xl border border-dashed border-white/10"
                        >
                            <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">Sin actividad operativa reciente</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Achievement Share Modal */}
            {sharePreview && (
                <AchievementShareCard
                    agent={sharePreview.agent}
                    newsItem={sharePreview.newsItem}
                    onClose={() => setSharePreview(null)}
                />
            )}
        </div>
    );
};

export default IntelFeed;
