import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Heart, Shield, Activity, Cpu, Target, Zap,
    ChevronRight, RefreshCw, Trophy,
    GraduationCap, Award, Flame, AlertCircle, Share2, Trash2, Gift,
    MessageCircle, AtSign, X
} from 'lucide-react';
import { Agent, NewsFeedItem, UserRole } from '../types';
import {
    fetchNewsFeedSupabase as fetchNewsFeed,
    deleteNewsItemSupabase,
    publishNewsSupabase,
    toggleLikeSupabase,
    fetchNewsLikesSupabase,
    fetchUserLikesSupabase,
    getMostLikedAgentSupabase,
    supabase,
    validateContent,
    toggleDislikeSupabase
} from '../services/supabaseService';
import { sendSocialNotification } from '../services/notifyService';
import { formatDriveUrl } from '../services/storageUtils';
import AchievementShareCard from './AchievementShareCard';
import { useTacticalAlert } from './TacticalAlert';

interface NewsFeedProps {
    onActivity?: () => void;
    headlines?: string[];
    agents?: Agent[];
    userRole?: UserRole;
    currentUser?: Agent | null;
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
    'CUMPLEAÑOS': { icon: <Gift size={16} />, color: '#ec4899', label: 'CUMPLEAÑOS' },
    'SOCIAL': { icon: <MessageCircle size={16} />, color: '#6366f1', label: 'SOCIAL' },
};

const IntelFeed: React.FC<NewsFeedProps> = ({ onActivity, headlines = [], agents = [], userRole, currentUser }) => {
    const { showAlert } = useTacticalAlert();
    const [news, setNews] = useState<NewsFeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);
    const [likesCount, setLikesCount] = useState<Record<string, number>>({});
    const [userLikes, setUserLikes] = useState<string[]>([]);
    const [userDislikes, setUserDislikes] = useState<string[]>([]);
    const [dislikesCount, setDislikesCount] = useState<Record<string, number>>({});
    const [mostLikedAgentId, setMostLikedAgentId] = useState<string | null>(null);
    const [sharePreview, setSharePreview] = useState<{
        agent?: Agent;
        newsItem?: NewsFeedItem;
    } | null>(null);

    const [socialMessage, setSocialMessage] = useState('');
    const [replyTo, setReplyTo] = useState<NewsFeedItem | null>(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [mentions, setMentions] = useState<Agent[]>([]);
    const [showMentions, setShowMentions] = useState(false);
    const [expandedThread, setExpandedThread] = useState<string | null>(null);

    const PAGE_SIZE = 20;

    // Filtramos para mostrar solo los mensajes principales (sin parentId) en el feed general
    // Pero si estamos en una página de "hilo" (que aquí manejamos inline), el filtro cambia.
    // El usuario quiere ver todo el feed expandido de 10 a 20.
    const rootNews = news.filter(item => !item.parentId);
    const totalPages = Math.ceil(rootNews.length / PAGE_SIZE);
    const displayedNews = rootNews.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

    const loadNews = async (silent = false) => {
        if (!silent || news.length === 0) setLoading(true);
        try {
            const data = await fetchNewsFeed();
            setNews(data || []);
            setCurrentPage(0);

            if (data && data.length > 0) {
                const ids = data.map(i => i.id);
                const counts = await fetchNewsLikesSupabase(ids);
                setLikesCount(counts);

                // Mapear dislikes desde la data (si fetchNewsFeed los trae)
                const dCounts: Record<string, number> = {};
                data.forEach(item => {
                    if (item.dislikesCount !== undefined) dCounts[item.id] = item.dislikesCount;
                });
                setDislikesCount(dCounts);
            }

            const mostLiked = await getMostLikedAgentSupabase();
            if (mostLiked) setMostLikedAgentId(mostLiked.agentId);

            if (currentUser) {
                const userL = await fetchUserLikesSupabase(currentUser.id);
                setUserLikes(userL);

                // Fetch user dislikes (necesitaríamos un servicio similar a fetchUserLikes)
                // Por ahora asumimos que los dislikes se gestionan reactivamente
            }
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handlePublishSocial = async (parentId?: string) => {
        if (!currentUser || !socialMessage.trim() || isPublishing) return;
        if (socialMessage.length > 128) {
            showAlert({ title: "OPERACIÓN DENEGADA", message: "EL MENSAJE EXCEDE EL LÍMITE TÁCTICO DE 128 CARACTERES.", type: 'ERROR' });
            return;
        }

        // 1. Validación de Censura Local
        const validation = validateContent(socialMessage);
        if (!validation.valid) {
            showAlert({
                title: "DETECTADA INFRACCIÓN",
                message: `TU MENSAJE CONTIENE TÉRMINOS NO PERMITIDOS [${validation.word}]. POR FAVOR, REVISA LAS POLÍTICAS DE CONVIVENCIA.`,
                type: 'ERROR'
            });
            return;
        }

        setIsPublishing(true);
        try {
            const res = await publishNewsSupabase(currentUser.id, currentUser.name, 'SOCIAL', socialMessage, parentId);
            if (res.success) {
                const messageSnippet = socialMessage;
                const senderName = currentUser.name;

                // 2. Notificaciones de Mención (@usuario)
                const mentionMatches = socialMessage.match(/@(\w+)/g);
                if (mentionMatches) {
                    mentionMatches.forEach(tag => {
                        const cleanTag = tag.slice(1).toLowerCase();
                        const targetAgent = agents.find(a => a.name.replace(/\s/g, '').toLowerCase().includes(cleanTag));
                        if (targetAgent && targetAgent.id !== currentUser.id) {
                            sendSocialNotification('MENTION', targetAgent.id, { senderName, messageSnippet });
                        }
                    });
                }

                // 3. Notificación de Trending (>5 mensajes en hilo)
                if (parentId) {
                    const threadCount = news.filter(n => n.parentId === parentId).length + 1;
                    if (threadCount === 6) { // Justo al cruzar 5
                        // Notificar a todos (o al menos loguear/broadcast)
                        // Por ahora notificamos al dueño del hilo original
                        const originalPost = news.find(n => n.id === parentId);
                        if (originalPost && originalPost.agentId !== currentUser.id) {
                            sendSocialNotification('TRENDING', originalPost.agentId, { senderName });
                        }
                    }
                }

                setSocialMessage('');
                setReplyTo(null);
                loadNews(true); // Silent refresh
                if (onActivity) onActivity();
            } else {
                throw new Error(res.error);
            }
        } catch (e: any) {
            showAlert({ title: "FALLO DE TRANSMISIÓN", message: e.message || "NO SE PUDO PUBLICAR.", type: 'ERROR' });
        } finally {
            setIsPublishing(false);
        }
    };

    const renderPostArea = (parentId?: string) => {
        if (!currentUser) return null;
        const isReply = !!parentId;

        return (
            <div className={`bg-[#001833]/60 backdrop-blur-xl border border-[#ffb700]/20 rounded-3xl p-4 space-y-3 shadow-xl ${isReply ? 'mt-3 mb-4' : ''}`}>
                <div className="flex items-start gap-3">
                    <img
                        src={formatDriveUrl(currentUser.photoUrl, currentUser.name)}
                        className="w-10 h-10 rounded-xl object-cover border border-white/20"
                        alt="Yo"
                    />
                    <div className="flex-1 space-y-2">
                        {isReply && (
                            <div className="flex items-center justify-between bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                <span className="text-[8px] text-white/40 font-black uppercase">Respondiendo a @{replyTo?.agentName?.split(' ')[0]}</span>
                                <button onClick={() => setReplyTo(null)} className="text-white/20 hover:text-white"><X size={10} /></button>
                            </div>
                        )}
                        <div className="relative">
                            <textarea
                                value={socialMessage}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setSocialMessage(val);
                                    const lastWord = val.split(' ').pop() || '';
                                    if (lastWord.startsWith('@') && lastWord.length > 1) {
                                        const search = lastWord.slice(1).toLowerCase();
                                        const filtered = (agents || []).filter(a =>
                                            a.name.toLowerCase().replace(/\s/g, '').includes(search)
                                        );
                                        setMentions(filtered);
                                        setShowMentions(filtered.length > 0);
                                    } else {
                                        setShowMentions(false);
                                    }
                                }}
                                placeholder={isReply ? "Escribe tu respuesta..." : "¿Qué está pasando en el sector?"}
                                maxLength={128}
                                className="w-full bg-transparent border-none text-white text-[12px] font-medium placeholder:text-white/20 outline-none resize-none min-h-[60px] no-scrollbar font-montserrat"
                                spellCheck="true"
                                autoCapitalize="sentences"
                                autoCorrect="on"
                            />
                            {showMentions && (
                                <div className="absolute left-0 bottom-full mb-2 w-full max-h-32 overflow-y-auto bg-[#001f3f] border border-white/10 rounded-xl shadow-2xl z-50 no-scrollbar">
                                    {mentions.map(a => (
                                        <button
                                            key={a.id}
                                            onClick={() => {
                                                const words = socialMessage.split(' ');
                                                words.pop();
                                                const tag = `@${a.name.replace(/\s/g, '').toLowerCase()}`;
                                                setSocialMessage(words.join(' ') + (words.length > 0 ? ' ' : '') + tag + ' ');
                                                setShowMentions(false);
                                            }}
                                            className="w-full flex items-center gap-2 p-2 hover:bg-white/5 text-left border-b border-white/5"
                                        >
                                            <img src={formatDriveUrl(a.photoUrl, a.name)} className="w-5 h-5 rounded-full object-cover" />
                                            <span className="text-[10px] text-white font-bold">{a.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black ${socialMessage.length > 110 ? 'text-[#ffb700]' : 'text-white/20'}`}>
                            {socialMessage.length}/128
                        </span>
                    </div>
                    <button
                        onClick={() => handlePublishSocial(parentId)}
                        disabled={!socialMessage.trim() || isPublishing}
                        className="bg-[#ffb700] text-[#001f3f] px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
                    >
                        {isPublishing ? 'Enviando...' : isReply ? 'Responder' : 'Publicar'}
                    </button>
                </div>
            </div>
        );
    };

    const handleToggleLike = async (noticiaId: string) => {
        if (!currentUser) return;

        const res = await toggleLikeSupabase(noticiaId, currentUser.id, currentUser.name);
        if (res.success) {
            setUserLikes(prev => res.liked ? [...prev, noticiaId] : prev.filter(id => id !== noticiaId));
            setLikesCount(prev => ({
                ...prev,
                [noticiaId]: (prev[noticiaId] || 0) + (res.liked ? 1 : -1)
            }));

            // Notificación de Like
            if (res.liked) {
                const post = news.find(n => n.id === noticiaId);
                if (post && post.agentId !== currentUser.id) {
                    sendSocialNotification('LIKE', post.agentId, { senderName: currentUser.name });
                }
            }

            const mostLiked = await getMostLikedAgentSupabase();
            if (mostLiked) setMostLikedAgentId(mostLiked.agentId);
        }
    };

    const handleToggleDislike = async (noticiaId: string) => {
        if (!currentUser) return;

        const res = await toggleDislikeSupabase(noticiaId, currentUser.id);
        if (res.success) {
            setUserDislikes(prev => res.disliked ? [...prev, noticiaId] : prev.filter(id => id !== noticiaId));
            setDislikesCount(prev => ({
                ...prev,
                [noticiaId]: (prev[noticiaId] || 0) + (res.disliked ? 1 : -1)
            }));

            // Si el post se auto-eliminó por el trigger de 5 dislikes, loadNews refrescará el feed
            if (res.disliked && (dislikesCount[noticiaId] || 0) + 1 >= 5) {
                setTimeout(() => loadNews(true), 500);
            }
        }
    };

    useEffect(() => {
        loadNews();

        // Suscripción Realtime (Estilo Pro)
        const channel = supabase
            .channel('social_feed_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'asistencia_visitas'
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    const item = payload.new;
                    const mappedItem: NewsFeedItem = {
                        id: item.id,
                        agentId: item.agent_id,
                        agentName: item.agent_name,
                        type: item.tipo,
                        message: item.detalle || '',
                        parentId: item.parent_id,
                        date: new Date(item.registrado_en).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                        }).toUpperCase()
                    };
                    setNews(prev => {
                        // Evitar duplicados
                        if (prev.find(p => p.id === mappedItem.id)) return prev;
                        return [mappedItem, ...prev];
                    });
                } else if (payload.eventType === 'DELETE') {
                    setNews(prev => prev.filter(p => p.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
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
        <div id="intel-feed-container" className="space-y-4 animate-in fade-in zoom-in-95 duration-700">
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
                    <button onClick={() => loadNews()} className="p-2 text-white/40 hover:text-[#ffb700] transition-colors"><RefreshCw size={14} /></button>
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

            {/* Social Post Area (Main) */}
            {!replyTo && renderPostArea()}

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
                                <div key={item.id || idx} className="relative ml-4">
                                    <motion.div
                                        layout
                                        drag={(userRole === UserRole.DIRECTOR || userRole === UserRole.LEADER) ? "x" : false}
                                        dragDirectionLock
                                        dragListener
                                        dragConstraints={{ left: -100, right: 0 }}
                                        dragElastic={0.1}
                                        onDragEnd={(event, info) => {
                                            if (info.offset.x < -60 || info.velocity.x < -500) {
                                                showAlert({
                                                    title: "ELIMINAR NOTICIA",
                                                    message: "¿Estás seguro de que deseas eliminar esta notificación del feed?",
                                                    type: 'CONFIRM',
                                                    onConfirm: async () => {
                                                        const res = await deleteNewsItemSupabase(item.id);
                                                        if (res.success) {
                                                            showAlert({ title: "ÉXITO", message: "NOTICIA ELIMINADA", type: 'SUCCESS' });
                                                            loadNews(true);
                                                        } else {
                                                            showAlert({ title: "FALLO TÁCTICO", message: `ERROR DE PERMISOS`, type: 'ERROR' });
                                                        }
                                                    }
                                                });
                                            }
                                        }}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0, transition: { delay: idx * 0.05 } }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        whileHover={{ backgroundColor: "rgba(255, 183, 0, 0.08)" }}
                                        className="relative p-4 bg-[#001f3f]/40 backdrop-blur-xl border border-white/5 hover:border-[#ffb700]/20 transition-all rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing touch-pan-y shadow-lg"
                                    >
                                        <div className="absolute inset-x-0 top-0 h-[1px] bg-[#ffb700]/10 pointer-events-none" />

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
                                                            style={{ backgroundColor: config.color, color: '#001f3f' }}
                                                        >
                                                            {React.isValidElement(config.icon) ? React.cloneElement(config.icon as React.ReactElement<any>, { size: 10 }) : config.icon}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg border border-white/10"
                                                        style={{ backgroundColor: `${config.color}15`, color: config.color }}
                                                    >
                                                        {config.icon}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0 pt-0.5">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[#ffb700] uppercase tracking-widest flex items-center gap-1">
                                                        {agent ? agentName : config.label}
                                                        {agent && mostLikedAgentId === agent.id && <Trophy size={8} className="text-[#ffb700] animate-pulse" />}
                                                    </span>
                                                    <span className="text-[7px] text-white/20 font-black uppercase tracking-wider">{item.date}</span>
                                                </div>
                                                <p className="text-[11px] text-white/80 font-bold leading-tight tracking-wide font-montserrat">
                                                    {item.message.split(' ').map((word, i) =>
                                                        word.startsWith('@') ? <span key={i} className="text-[#ffb700] font-black">{word} </span> : word + ' '
                                                    )}
                                                </p>

                                                <div className="flex items-center gap-4 mt-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleToggleLike(item.id); }}
                                                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${userLikes.includes(item.id) ? 'bg-[#ff4d00]/10 border-[#ff4d00]/30 text-[#ff4d00]' : 'bg-white/5 border-white/10 text-white/40'}`}
                                                    >
                                                        <Heart size={12} fill={userLikes.includes(item.id) ? "currentColor" : "none"} />
                                                        <span className="text-[9px] font-black">{likesCount[item.id] || 0}</span>
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleToggleDislike(item.id); }}
                                                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${userDislikes.includes(item.id) ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-white/5 border-white/10 text-white/40'}`}
                                                    >
                                                        <AtSign size={12} className={userDislikes.includes(item.id) ? "animate-pulse" : ""} />
                                                        <span className="text-[9px] font-black">{dislikesCount[item.id] || 0}</span>
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setReplyTo(item); }}
                                                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg border bg-white/5 border-white/10 text-white/40 hover:text-white/60 transition-all font-montserrat"
                                                    >
                                                        <MessageCircle size={12} />
                                                        <span className="text-[8px] font-black uppercase">Responder</span>
                                                    </button>
                                                </div>
                                                {/* In-line Reply Area */}
                                                {replyTo?.id === item.id && renderPostArea(item.id)}
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <button onClick={() => setSharePreview({ agent, newsItem: item })} className="p-2 text-white/20 hover:text-[#ffb700] transition-colors"><Share2 size={16} /></button>
                                                {(userRole === UserRole.DIRECTOR) && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            showAlert({
                                                                title: "ELIMINAR MENSAJE (DIRECTOR)",
                                                                message: "¿ESTÁS SEGURO? ESTA ACCIÓN ES IRREVERSIBLE.",
                                                                type: 'CONFIRM',
                                                                onConfirm: async () => {
                                                                    const res = await deleteNewsItemSupabase(item.id);
                                                                    if (res.success) {
                                                                        showAlert({ title: "ÉXITO", message: "MENSAJE ELIMINADO", type: 'SUCCESS' });
                                                                        loadNews(true);
                                                                    }
                                                                }
                                                            });
                                                        }}
                                                        className="p-2 text-red-500/40 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Nested Comments */}
                                        <div className="mt-2 space-y-2">
                                            {(() => {
                                                const threadComments = news.filter(comment => comment.parentId === item.id);
                                                const showAll = expandedThread === item.id;
                                                const visibleComments = showAll ? threadComments : threadComments.slice(0, 10);

                                                return (
                                                    <>
                                                        {visibleComments.map(comment => (
                                                            <div key={comment.id} className="ml-8 p-3 bg-white/5 rounded-2xl border border-white/5 flex items-start gap-3 shadow-inner">
                                                                <img
                                                                    src={formatDriveUrl(agents.find(a => a.id === comment.agentId)?.photoUrl || '', comment.agentName || '')}
                                                                    className="w-6 h-6 rounded-lg object-cover border border-white/10"
                                                                    alt={comment.agentName}
                                                                    onError={(e) => {
                                                                        const target = e.currentTarget as HTMLImageElement;
                                                                        if (!target.src.includes('ui-avatars.com')) {
                                                                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.agentName || 'Agente')}&background=1A1A1A&color=FFB700&size=200&bold=true`;
                                                                        }
                                                                    }}
                                                                />
                                                                <div className="flex-1 space-y-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[8px] font-black text-[#ffb700] uppercase">{comment.agentName?.split(' ')[0]}</span>
                                                                        <span className="text-[6px] text-white/20 font-black uppercase">{comment.date}</span>
                                                                    </div>
                                                                    <p className="text-[10px] text-white/70 font-medium leading-tight font-montserrat">
                                                                        {comment.message.split(' ').map((word, i) =>
                                                                            word.startsWith('@') ? <span key={i} className="text-[#ffb700] font-black">{word} </span> : word + ' '
                                                                        )}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}

                                                        {threadComments.length > 10 && !showAll && (
                                                            <button
                                                                onClick={() => setExpandedThread(item.id)}
                                                                className="ml-8 w-full py-2 bg-[#ffb700]/10 border border-dashed border-[#ffb700]/20 rounded-xl text-[8px] text-[#ffb700] font-black uppercase tracking-widest hover:bg-[#ffb700]/20 transition-all"
                                                            >
                                                                Ver hilo completo ({threadComments.length} comentarios)
                                                            </button>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </motion.div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-8 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                            <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">Sin actividad operativa reciente</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>

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
