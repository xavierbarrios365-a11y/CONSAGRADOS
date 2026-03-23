import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Heart, Shield, Activity, Cpu, Target, Zap,
    ChevronRight, RefreshCw, Trophy,
    GraduationCap, Award, Flame, AlertCircle, Share2, Trash2, Gift,
    MessageCircle, AtSign, X, ThumbsUp, ThumbsDown, BookOpen, Eye,
    VolumeX, Volume2, Pause, Play, Maximize
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
    toggleDislikeSupabase,
    parseNewsMessage
} from '../services/supabaseService';
import { uploadToCloudinary as uploadCloudinaryDirect } from '../services/cloudinaryService';
import { sendSocialNotification } from '../services/notifyService';
import { formatDriveUrl } from '../services/storageUtils';
import AchievementShareCard from './AchievementShareCard';
import { useTacticalAlert } from './TacticalAlert';
import TacticalMediaPlayer from './TacticalMediaPlayer';

interface NewsFeedProps {
    onActivity?: () => void;
    headlines?: string[];
    agents?: Agent[];
    userRole?: UserRole;
    currentUser?: Agent | null;
    filterType?: string;
    onAgentClick?: (agent: Agent) => void;
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
    'BIBLE_SHARE': { icon: <BookOpen size={16} />, color: '#ffb700', label: 'REFLEXIÓN' },
};

const TacticalMedia = ({ url, type, onClick, isTrending = false }: { url: string; type: 'image' | 'video'; onClick: () => void; isTrending?: boolean }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [progress, setProgress] = useState(0);
    const mediaRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    if (type === 'video') {
                        videoRef.current?.play().catch(() => { });
                        setIsPlaying(true);
                    }
                } else {
                    if (type === 'video') {
                        videoRef.current?.pause();
                        setIsPlaying(false);
                    }
                }
            });
        }, { threshold: 0.6 });

        if (mediaRef.current) observer.observe(mediaRef.current);
        return () => observer.disconnect();
    }, [type]);

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const current = videoRef.current.currentTime;
            const duration = videoRef.current.duration;
            setProgress((current / duration) * 100);
        }
    };

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (videoRef.current) {
            if (isPlaying) videoRef.current.pause();
            else videoRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMuted(!isMuted);
    };

    return (
        <div
            ref={mediaRef}
            className={`mt-4 relative rounded-3xl overflow-hidden border border-white/10 aspect-video bg-black/40 cursor-pointer shadow-2xl group transition-all duration-500 hover:border-[#ffb700]/30 ${!isLoaded ? 'animate-pulse' : ''}`}
            onClick={onClick}
        >
            {isVisible && (
                type === 'video' ? (
                    <div className="relative w-full h-full">
                        <video
                            ref={videoRef}
                            src={url}
                            className={`w-full h-full object-cover transition-opacity duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                            muted={isMuted}
                            playsInline
                            loop
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedData={() => setIsLoaded(true)}
                            onClick={togglePlay}
                        />

                        {/* Inline Controls (Threads Style) */}
                        <div className="absolute inset-0 flex flex-col justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-black/20 via-transparent to-black/40">
                            <div className="flex justify-end">
                                <button
                                    onClick={toggleMute}
                                    className="p-1.5 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 text-white/80 hover:bg-white hover:text-black transition-all"
                                >
                                    {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                                </button>
                            </div>

                            <div className="flex items-center justify-between pointer-events-none">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-white/10 backdrop-blur-xl rounded-lg flex items-center justify-center border border-white/10">
                                        {isPlaying ? <Pause size={10} className="text-white" /> : <Play size={10} className="text-white fill-white" />}
                                    </div>
                                    <span className="text-[7px] font-bold text-white uppercase tracking-widest opacity-60">En Curso</span>
                                </div>

                                <div className="flex items-center gap-1.5 px-2 py-1 bg-white/10 backdrop-blur-xl rounded-full border border-white/10">
                                    <Maximize size={8} className="text-white" />
                                    <span className="text-[7px] font-black text-white uppercase tracking-widest">Expandir</span>
                                </div>
                            </div>

                            {/* Minimal Progress Bar (Bottom) */}
                            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10">
                                <motion.div
                                    className="h-full bg-white"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>

                        {!isLoaded && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/5">
                                <Activity size={24} className="text-[#ffb700]/30 animate-spin" />
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <img
                            src={url}
                            className={`w-full h-full object-cover transition-opacity duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                            alt="Media content"
                            onLoad={() => setIsLoaded(true)}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                            <div className="flex items-center gap-2 px-3 py-1 bg-[#ffb700] rounded-full">
                                <Maximize size={10} className="text-[#001f3f]" />
                                <span className="text-[8px] font-black text-[#001f3f] uppercase">Ver Inteligencia</span>
                            </div>
                        </div>
                        {!isLoaded && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/5">
                                <Activity size={24} className="text-[#ffb700]/30 animate-spin" />
                            </div>
                        )}
                    </>
                )
            )}
            {isTrending && (
                <div className="absolute top-3 left-3 px-3 py-1 bg-[#ff6b00]/20 backdrop-blur-md border border-[#ff6b00]/30 rounded-full flex items-center gap-2 text-[#ff6b00] text-[8px] font-black tracking-widest z-10">
                    <Flame size={10} /> TRENDING
                </div>
            )}
        </div>
    );
};

const IntelFeed: React.FC<NewsFeedProps> = ({ onActivity, headlines = [], agents = [], userRole, currentUser, filterType, onAgentClick }) => {
    const { showAlert } = useTacticalAlert();
    const [news, setNews] = useState<NewsFeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);
    const [likesCount, setLikesCount] = useState<Record<string, number>>({});
    const [userLikes, setUserLikes] = useState<string[]>([]);
    const [userDislikes, setUserDislikes] = useState<string[]>([]);
    const [dislikesCount, setDislikesCount] = useState<Record<string, number>>({});
    const [mostLikedAgentId, setMostLikedAgentId] = useState<string | null>(null);
    const [sharePreview, setSharePreview] = useState<{ agent?: Agent; newsItem?: NewsFeedItem; } | null>(null);

    const [socialMessage, setSocialMessage] = useState('');
    const [replyTo, setReplyTo] = useState<NewsFeedItem | null>(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [mentions, setMentions] = useState<Agent[]>([]);
    const [showMentions, setShowMentions] = useState(false);
    const [expandedThread, setExpandedThread] = useState<string | null>(null);
    const [newItemsCount, setNewItemsCount] = useState(0);
    const [isAtTop, setIsAtTop] = useState(true);

    const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [isUploadingMedia, setIsUploadingMedia] = useState(false);
    const [viewingMedia, setViewingMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
    const mediaInputRef = useRef<HTMLInputElement>(null);

    const PAGE_SIZE = 20;

    const rootNews = news.filter(item => {
        const isRoot = !item.parentId;
        const matchesType = filterType ? item.type === filterType : true;
        const author = agents?.find(a => a.id === item.agentId);
        if (author?.status === 'OCULTO') return false;
        return isRoot && matchesType;
    });
    const totalPages = Math.ceil(rootNews.length / PAGE_SIZE);
    const displayedNews = rootNews.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

    const loadNews = async (silent = false) => {
        if (!silent || news.length === 0) setLoading(true);
        try {
            const rawData = await fetchNewsFeed();
            // Map raw DB rows (asistencia_visitas) → NewsFeedItem
            const mapped: NewsFeedItem[] = (rawData || []).map((item: any) => {
                const { message, verse, reference, mediaUrl, mediaType } = parseNewsMessage(item.detalle || item.message || '');
                return {
                    id: item.id,
                    agentId: item.agent_id ?? item.agentId,
                    agentName: item.agent_name ?? item.agentName,
                    type: item.tipo ?? item.type,
                    message,
                    verse,
                    reference,
                    mediaUrl,
                    mediaType: (mediaType as any)?.toLowerCase() || undefined,
                    parentId: item.parent_id ?? item.parentId,
                    date: new Date(item.registrado_en ?? item.date ?? Date.now()).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).toUpperCase()
                };
            });
            setNews(mapped);
            setCurrentPage(0);

            if (mapped && mapped.length > 0) {
                const ids = mapped.map(i => i.id);
                const counts = await fetchNewsLikesSupabase(ids);
                setLikesCount(counts);

                const dCounts: Record<string, number> = {};
                mapped.forEach((item: any) => {
                    if (item.dislikesCount !== undefined) dCounts[item.id] = item.dislikesCount;
                });
                setDislikesCount(dCounts);
            }

            const mostLiked = await getMostLikedAgentSupabase();
            if (mostLiked) setMostLikedAgentId(mostLiked.agentId);

            if (currentUser) {
                const userL = await fetchUserLikesSupabase(currentUser.id);
                setUserLikes(userL);
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const handlePublishSocial = async (parentId?: string) => {
        if (!currentUser || !socialMessage.trim() || isPublishing) return;
        const limit = selectedMedia ? 256 : 128;
        if (socialMessage.length > limit && !socialMessage.startsWith('📖')) {
            showAlert({ title: "OPERACIÓN DENEGADA", message: `EL MENSAJE EXCEDE EL LÍMITE TÁCTICO DE ${limit} CARACTERES.`, type: 'ERROR' });
            return;
        }

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
            let finalMessage = socialMessage;

            if (selectedMedia) {
                setIsUploadingMedia(true);
                const uploadRes = await uploadCloudinaryDirect(selectedMedia);
                if (uploadRes.success && uploadRes.url) {
                    const tag = selectedMedia.type.startsWith('video/') ? '[VIDEO]' : '[MEDIA]';
                    finalMessage += ` ${tag}: ${uploadRes.url}`;
                } else {
                    throw new Error(uploadRes.error || "Fallo al subir multimedia.");
                }
            }

            const res = await publishNewsSupabase(currentUser.id, currentUser.name, 'SOCIAL', finalMessage, parentId);
            if (res.success) {
                const messageSnippet = socialMessage;
                const senderName = currentUser.name;

                const mentionMatches = socialMessage.match(/@([\wáéíóúñÁÉÍÓÚÑ._-]+)/g);
                if (mentionMatches) {
                    mentionMatches.forEach(tag => {
                        const cleanTag = tag.slice(1).toLowerCase();
                        // Mejorar matching: ignorar espacios y acentos para encontrar al agente
                        const targetAgent = agents.find(a => {
                            const normalizedName = a.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s/g, '');
                            const normalizedTag = cleanTag.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                            // Coincidencia exacta o contenida (para nombres compuestos)
                            return normalizedName === normalizedTag || normalizedName.includes(normalizedTag) || normalizedTag.includes(normalizedName);
                        });

                        if (targetAgent && targetAgent.id !== currentUser.id) {
                            console.log(`[MENTION] Notificando a agentId: ${targetAgent.id} (${targetAgent.name})`);
                            sendSocialNotification('MENTION', targetAgent.id, {
                                senderName,
                                messageSnippet,
                                senderId: currentUser.id
                            });
                        }
                    });
                }

                if (parentId) {
                    const threadCount = news.filter(n => n.parentId === parentId).length + 1;
                    if (threadCount === 6) {
                        const originalPost = news.find(n => n.id === parentId);
                        if (originalPost && originalPost.agentId !== currentUser.id) {
                            sendSocialNotification('TRENDING', originalPost.agentId, { senderName });
                        }
                    }
                }

                setSocialMessage('');
                setReplyTo(null);
                setSelectedMedia(null);
                setMediaPreview(null);
                loadNews(true);
                if (onActivity) onActivity();
            } else {
                throw new Error(res.error);
            }
        } catch (e: any) {
            showAlert({ title: "FALLO DE TRANSMISIÓN", message: e.message || "NO SE PUDO PUBLICAR.", type: 'ERROR' });
        } finally {
            setIsPublishing(false);
            setIsUploadingMedia(false);
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
                                id="social-input"
                                name="social-input"
                                value={socialMessage}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setSocialMessage(val);
                                    const lastWord = val.split(' ').pop() || '';
                                    if (lastWord.startsWith('@') && lastWord.length > 1) {
                                        const search = lastWord.slice(1).toLowerCase();
                                        const filtered = (agents || []).filter(a =>
                                            a.status !== 'OCULTO' && a.name.toLowerCase().replace(/\s/g, '').includes(search)
                                        );
                                        setMentions(filtered);
                                        setShowMentions(filtered.length > 0);
                                    } else {
                                        setShowMentions(false);
                                    }
                                }}
                                placeholder={selectedMedia ? "Escribe un pie de foto para tu multimedia..." : (isReply ? "Escribe tu respuesta..." : "¿Qué quieres compartir hoy?")}
                                maxLength={selectedMedia ? 256 : 128} // Permitimos más texto si es un post con multimedia
                                className="w-full bg-transparent border-none text-white text-[12px] font-medium placeholder:text-white/20 outline-none resize-none min-h-[60px] no-scrollbar font-montserrat"
                            />

                            {mediaPreview && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="relative w-full aspect-video rounded-xl overflow-hidden mb-2 border border-white/10"
                                >
                                    <button
                                        onClick={() => { setSelectedMedia(null); setMediaPreview(null); }}
                                        className="absolute top-2 right-2 z-10 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80 transition-all border border-white/10"
                                    >
                                        <X size={12} />
                                    </button>
                                    {selectedMedia?.type.startsWith('video/') ? (
                                        <video src={mediaPreview} className="w-full h-full object-cover" muted playsInline />
                                    ) : (
                                        <img src={mediaPreview} className="w-full h-full object-cover" alt="Preview" />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                                    <div className="absolute bottom-2 left-3 flex items-center gap-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                        <span className="text-[8px] font-black text-white uppercase tracking-widest">Multimedia Lista</span>
                                    </div>
                                </motion.div>
                            )}
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

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => mediaInputRef.current?.click()}
                            className={`p-2 rounded-xl border transition-all flex items-center gap-2 ${selectedMedia ? 'border-[#ffb700] bg-[#ffb700]/10 text-[#ffb700]' : 'border-white/10 text-white/40 hover:text-white'}`}
                        >
                            {selectedMedia ? (
                                selectedMedia.type.startsWith('video/') ? <Zap size={16} /> : <Target size={16} />
                            ) : (
                                <Activity size={16} />
                            )}
                            <span className="text-[10px] font-bold uppercase">{selectedMedia ? 'Cambiar Medios' : 'Anexar Medios'}</span>
                        </button>
                        <input
                            type="file"
                            ref={mediaInputRef}
                            className="hidden"
                            accept="image/*,video/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    setSelectedMedia(file);
                                    setMediaPreview(URL.createObjectURL(file));
                                }
                            }}
                        />
                        <span className={`text-[9px] font-black ${socialMessage.length > 110 ? 'text-[#ffb700]' : 'text-white/20'}`}>
                            {socialMessage.length}/128
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        {selectedMedia && (
                            <button
                                onClick={() => {
                                    setSelectedMedia(null);
                                    setMediaPreview(null);
                                }}
                                className="text-red-500/60 hover:text-red-500 text-[10px] font-black uppercase"
                            >
                                Quitar
                            </button>
                        )}
                        <button
                            onClick={() => handlePublishSocial(parentId)}
                            disabled={(!socialMessage.trim() && !selectedMedia) || isPublishing}
                            className="bg-[#ffb700] text-[#001f3f] px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
                        >
                            {isPublishing ? 'Enviando...' : isReply ? 'Responder' : 'Publicar'}
                        </button>
                    </div>
                </div>

                {mediaPreview && (
                    <div className="relative mt-2 rounded-2xl overflow-hidden border border-white/10 aspect-video bg-black">
                        {selectedMedia?.type.startsWith('video/') ? (
                            <video src={mediaPreview} className="w-full h-full object-cover" muted />
                        ) : (
                            <img src={mediaPreview} className="w-full h-full object-cover" alt="Preview" />
                        )}
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-[#ffb700] text-[8px] font-black px-2 py-1 rounded-full uppercase">
                            Vista Previa operativa
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const handleToggleLike = async (noticiaId: string) => {
        if (!currentUser) return;
        const isCurrentlyLiked = userLikes.includes(noticiaId);
        setUserLikes(prev => isCurrentlyLiked ? prev.filter(id => id !== noticiaId) : [...prev, noticiaId]);
        setLikesCount(prev => ({
            ...prev,
            [noticiaId]: Math.max(0, (prev[noticiaId] || 0) + (isCurrentlyLiked ? -1 : 1))
        }));

        const res = await toggleLikeSupabase(noticiaId, currentUser.id);
        if (!res.success) {
            setUserLikes(prev => isCurrentlyLiked ? [...prev, noticiaId] : prev.filter(id => id !== noticiaId));
            setLikesCount(prev => ({
                ...prev,
                [noticiaId]: (prev[noticiaId] || 0) + (isCurrentlyLiked ? 1 : -1)
            }));
            showAlert({ title: "FALLO DE REACCIÓN", message: "NO SE PUDO REGISTRAR TU REACCIÓN.", type: 'ERROR' });
        } else if (res.liked) {
            const post = news.find(n => n.id === noticiaId);
            if (post && post.agentId !== currentUser.id) {
                sendSocialNotification('LIKE', post.agentId, {
                    senderName: currentUser.name,
                    senderId: currentUser.id
                });
            }
            const mostLiked = await getMostLikedAgentSupabase();
            if (mostLiked) setMostLikedAgentId(mostLiked.agentId);
        }
    };

    const handleToggleDislike = async (noticiaId: string) => {
        if (!currentUser) return;
        const isCurrentlyDisliked = userDislikes.includes(noticiaId);
        setUserDislikes(prev => isCurrentlyDisliked ? prev.filter(id => id !== noticiaId) : [...prev, noticiaId]);
        setDislikesCount(prev => ({
            ...prev,
            [noticiaId]: Math.max(0, (prev[noticiaId] || 0) + (isCurrentlyDisliked ? -1 : 1))
        }));

        const res = await toggleDislikeSupabase(noticiaId, currentUser.id);
        if (!res.success) {
            setUserDislikes(prev => isCurrentlyDisliked ? [...prev, noticiaId] : prev.filter(id => id !== noticiaId));
            setDislikesCount(prev => ({
                ...prev,
                [noticiaId]: (prev[noticiaId] || 0) + (isCurrentlyDisliked ? 1 : -1)
            }));
            showAlert({ title: "FALLO DE REACCIÓN", message: "NO SE PUDO REGISTRAR TU REACCIÓN.", type: 'ERROR' });
        } else {
            if (res.disliked) {
                const post = news.find(n => n.id === noticiaId);
                if (post && post.agentId !== currentUser.id) {
                    sendSocialNotification('DISLIKE', post.agentId, {
                        senderName: currentUser.name,
                        senderId: currentUser.id
                    });
                }
            }
            if (res.disliked && (dislikesCount[noticiaId] || 0) + 1 >= 5) {
                setTimeout(() => loadNews(true), 500);
            }
        }
    };

    useEffect(() => {
        loadNews();

        const container = document.getElementById('intel-feed-scroll-container');
        const handleScroll = () => {
            if (container) {
                const atTop = container.scrollTop < 50;
                setIsAtTop(atTop);
                if (atTop) setNewItemsCount(0);
            }
        };
        container?.addEventListener('scroll', handleScroll);

        const channel = supabase.channel('social_realtime_nexus');

        channel.on('postgres_changes', { event: '*', schema: 'public', table: 'asistencia_visitas' }, (payload) => {
            if (payload.eventType === 'INSERT') {
                const item = payload.new;
                const { message, verse, reference, mediaUrl, mediaType } = parseNewsMessage(item.detalle || '');
                const mappedItem: NewsFeedItem = {
                    id: item.id,
                    agentId: item.agent_id,
                    agentName: item.agent_name,
                    type: item.tipo,
                    message: message,
                    verse: verse,
                    reference: reference,
                    mediaUrl: mediaUrl,
                    mediaType: (mediaType as any)?.toLowerCase?.() || 'image',
                    parentId: item.parent_id,
                    date: new Date(item.registrado_en).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).toUpperCase()
                };

                setNews(prev => {
                    if (prev.find(p => p.id === mappedItem.id)) return prev;
                    if (!isAtTop && !mappedItem.parentId) setNewItemsCount(c => c + 1);
                    return [mappedItem, ...prev];
                });
            } else if (payload.eventType === 'DELETE') {
                setNews(prev => prev.filter(p => p.id !== payload.old.id));
            } else if (payload.eventType === 'UPDATE') {
                setNews(prev => prev.map(p => p.id === payload.new.id ? { ...p, message: parseNewsMessage(payload.new.detalle).message } : p));
            }
        });

        channel.on('postgres_changes', { event: '*', schema: 'public', table: 'noticia_likes' }, (payload) => {
            const like = (payload.new as any) || (payload.old as any);
            if (like?.noticia_id && like.agent_id !== currentUser?.id) {
                setLikesCount(prev => ({
                    ...prev,
                    [like.noticia_id]: Math.max(0, (prev[like.noticia_id] || 0) + (payload.eventType === 'INSERT' ? 1 : -1))
                }));
            }
        });

        channel.on('postgres_changes', { event: '*', schema: 'public', table: 'noticia_dislikes' }, (payload) => {
            const dislike = (payload.new as any) || (payload.old as any);
            if (dislike?.noticia_id && dislike.agent_id !== currentUser?.id) {
                setDislikesCount(prev => ({
                    ...prev,
                    [dislike.noticia_id]: Math.max(0, (prev[dislike.noticia_id] || 0) + (payload.eventType === 'INSERT' ? 1 : -1))
                }));
            }
        });

        channel.subscribe();

        return () => {
            container?.removeEventListener('scroll', handleScroll);
            supabase.removeChannel(channel);
        };
    }, [currentUser?.id]);

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
            {!replyTo && renderPostArea()}
            <AnimatePresence>
                {newItemsCount > 0 && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="sticky top-4 z-[60] flex justify-center pointer-events-none">
                        <button onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setNewItemsCount(0); }} className="pointer-events-auto bg-[#ffb700] text-[#001f3f] px-6 py-2 rounded-full shadow-2xl flex items-center gap-2 group hover:scale-105 transition-transform">
                            <RefreshCw size={14} className="animate-spin-slow" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Nuevos Mensajes ({newItemsCount})</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <div id="intel-feed-scroll-container" className="space-y-4">
                <div className="grid grid-cols-1 gap-2 relative">
                    <AnimatePresence mode="popLayout">
                        {displayedNews.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="flex flex-col items-center justify-center py-20 text-center"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 mb-4">
                                    <Activity size={32} className="text-[#ffb700]/50" />
                                </div>
                                <h3 className="text-white/60 font-black tracking-widest text-[12px]">TRANSMISIÓN DESPEJADA</h3>
                                <p className="text-white/40 text-[10px] mt-2 max-w-[220px] mx-auto leading-relaxed">
                                    No hay reportes activos en la frecuencia. Sé el primero en emitir un comunicado a la red Consagrados.
                                </p>
                            </motion.div>
                        )}
                        {displayedNews.map((item, idx) => {
                            const config = TACTICAL_CONFIG[item.type] || { icon: <AlertCircle size={16} />, color: '#9ca3af', label: 'NOTIFICACIÓN' };
                            const agent = agents.find(a => String(a.id) === String(item.agentId));
                            const photoUrl = agent?.photoUrl ? formatDriveUrl(agent.photoUrl) : null;
                            const agentName = agent ? agent.name.split(' ')[0] : 'SISTEMA';

                            return (
                                <div key={item.id} className="relative ml-4">
                                    <motion.div
                                        layout
                                        drag={(userRole === UserRole.DIRECTOR || userRole === UserRole.LEADER) ? "x" : false}
                                        dragConstraints={{ left: -100, right: 0 }}
                                        onDragEnd={(e, info) => {
                                            if (info.offset.x < -60) {
                                                showAlert({
                                                    title: "ELIMINAR NOTICIA", message: "¿Seguro?", type: 'CONFIRM',
                                                    onConfirm: async () => {
                                                        const res = await deleteNewsItemSupabase(item.id);
                                                        if (res.success) { showAlert({ title: "ÉXITO", message: "ELIMINADA", type: 'SUCCESS' }); loadNews(true); }
                                                    }
                                                });
                                            }
                                        }}
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="relative p-6 pt-8 bg-transparent border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="relative shrink-0">
                                                {photoUrl ? (
                                                    <div className="relative">
                                                        <img src={photoUrl} className="w-10 h-10 rounded-xl object-cover border border-white/10" alt="" onClick={() => agent && onAgentClick?.(agent)} />
                                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-lg flex items-center justify-center border border-black/20" style={{ backgroundColor: config.color }}>
                                                            {React.isValidElement(config.icon) ? React.cloneElement(config.icon as React.ReactElement<any>, { size: 10 }) : config.icon}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10" style={{ backgroundColor: `${config.color}15`, color: config.color }}>{config.icon}</div>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0 pt-0.5">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[9px] font-black text-[#ffb700] uppercase hover:underline cursor-pointer" onClick={() => agent && onAgentClick?.(agent)}>{agent ? agentName : config.label}</span>
                                                    {agent && mostLikedAgentId === agent.id && <Trophy size={10} className="text-[#ffb700]" />}
                                                    <span className="text-[8px] text-white/20 font-bold uppercase">• {item.date}</span>
                                                </div>
                                                {item.type === 'BIBLE_SHARE' && item.verse ? (
                                                    <div className="relative mt-2 mb-3 px-6 py-6 bg-gradient-to-br from-[#ffb700]/10 border border-[#ffb700]/20 rounded-3xl overflow-hidden">
                                                        <BookOpen size={100} className="absolute -bottom-6 -right-6 text-[#ffb700]/5" />
                                                        <p className="text-[12px] text-white/90 font-medium leading-relaxed whitespace-pre-wrap font-montserrat">{item.message}</p>

                                                        {item.mediaUrl && (
                                                            <TacticalMedia
                                                                url={item.mediaUrl}
                                                                type={item.mediaType as any}
                                                                onClick={() => item.mediaUrl && item.mediaType && setViewingMedia({ url: item.mediaUrl, type: item.mediaType })}
                                                            />
                                                        )}
                                                        <span className="text-[11px] font-black text-[#ffb700] uppercase mt-2 block">{item.reference}</span>
                                                    </div>
                                                ) : (
                                                    <p className="text-[13px] text-white/90 font-medium">
                                                        {item.message
                                                            .replace(/\[MEDIA\]: \S+/g, '')
                                                            .replace(/\[VIDEO\]: \S+/g, '')
                                                            .split(' ')
                                                            .map((word, i) => word.startsWith('@') ? <span key={i} className="text-[#ffb700] font-black">{word} </span> : word + ' ')}
                                                    </p>
                                                )}

                                                {item.mediaUrl && (
                                                    <TacticalMedia
                                                        url={item.mediaUrl}
                                                        type={item.mediaType as any}
                                                        onClick={() => item.mediaUrl && item.mediaType && setViewingMedia({ url: item.mediaUrl, type: item.mediaType })}
                                                    />
                                                )}

                                                <div className="flex items-center gap-6 mt-4">
                                                    <button onClick={() => handleToggleLike(item.id)} className={`flex items-center gap-2 ${userLikes.includes(item.id) ? 'text-[#ff4d00]' : 'text-white/30 hover:text-[#ff4d00]'}`}>
                                                        <ThumbsUp size={14} fill={userLikes.includes(item.id) ? "currentColor" : "none"} />
                                                        <span className="text-[10px] font-black">{likesCount[item.id] || 0}</span>
                                                    </button>
                                                    <button onClick={() => handleToggleDislike(item.id)} className={`flex items-center gap-2 ${userDislikes.includes(item.id) ? 'text-red-500' : 'text-white/30 hover:text-red-500'}`}>
                                                        <ThumbsDown size={14} />
                                                        <span className="text-[10px] font-black">{dislikesCount[item.id] || 0}</span>
                                                    </button>
                                                    <button onClick={() => setReplyTo(item)} className="text-white/30 hover:text-blue-400 text-[10px] font-black uppercase">Responder</button>
                                                </div>
                                                {replyTo?.id === item.id && <div className="mt-4 border-l-2 border-[#ffb700]/20 pl-4">{renderPostArea(item.id)}</div>}
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <button onClick={() => setSharePreview({ agent, newsItem: item })} className="p-2 text-white/20 hover:text-[#ffb700]"><Share2 size={16} /></button>
                                                {userRole === UserRole.DIRECTOR && (
                                                    <button onClick={() => showAlert({ title: "ELIMINAR", message: "¿?", type: 'CONFIRM', onConfirm: async () => { if ((await deleteNewsItemSupabase(item.id)).success) { loadNews(true); } } })} className="p-2 text-red-500/40 hover:text-red-500"><Trash2 size={14} /></button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="relative">
                                            {(() => {
                                                const comments = news.filter(c => c.parentId === item.id);
                                                if (comments.length === 0) return null;
                                                const showAll = expandedThread === item.id;
                                                const visible = showAll ? comments : comments.slice(0, 5);
                                                return (
                                                    <div className="mt-2 space-y-4">
                                                        <div className="absolute left-[36px] top-[-20px] bottom-10 w-[2px] bg-white/5" />
                                                        {visible.map(c => (
                                                            <div key={c.id} className="relative ml-8 flex items-start gap-3">
                                                                <div className="absolute left-[-16px] top-4 w-4 h-[2px] bg-white/5" />
                                                                <img src={formatDriveUrl(agents.find(a => a.id === c.agentId)?.photoUrl || '', c.agentName || '')} className="w-8 h-8 rounded-lg object-cover" alt="" />
                                                                <div className="flex-1 py-1">
                                                                    <div className="flex items-center gap-2"><span className="text-[9px] font-black text-[#ffb700] uppercase">{c.agentName?.split(' ')[0]}</span><span className="text-[7px] text-white/20">• {c.date}</span></div>
                                                                    <p className="text-[12px] text-white/70">
                                                                        {c.message
                                                                            .replace(/\[MEDIA\]: \S+/g, '')
                                                                            .replace(/\[VIDEO\]: \S+/g, '')
                                                                            .split(' ')
                                                                            .map((w, i) => w.startsWith('@') ? <span key={i} className="text-[#ffb700] font-black">{w} </span> : w + ' ')}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {comments.length > 5 && !showAll && <button onClick={() => setExpandedThread(item.id)} className="ml-11 text-[9px] text-blue-400 font-black uppercase tracking-widest hover:underline">Mostrar más ({comments.length - 5})</button>}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </motion.div>
                                </div>
                            );
                        })}
                    </AnimatePresence >
                </div >
            </div >

            {sharePreview && <AchievementShareCard agent={sharePreview.agent} newsItem={sharePreview.newsItem} onClose={() => setSharePreview(null)} />}

            {/* FULL SCREEN MEDIA VIEWER (TACTICAL UPGRADE) */}
            <AnimatePresence>
                {viewingMedia && (
                    <TacticalMediaPlayer
                        url={viewingMedia.url}
                        type={viewingMedia.type}
                        onClose={() => setViewingMedia(null)}
                        title={news.find(n => n.mediaUrl === viewingMedia.url)?.agentName ? `Briefing de ${news.find(n => n.mediaUrl === viewingMedia.url)?.agentName}` : undefined}
                    />
                )}
            </AnimatePresence>

            <style>{`
                .animate-spin-slow {
                    animation: spin 3s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div >
    );
};

export default IntelFeed;
