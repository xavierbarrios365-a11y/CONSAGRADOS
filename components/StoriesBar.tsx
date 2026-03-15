import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchActiveStoriesSupabase, createStorySupabase, reactToStorySupabase, sendStoryReplySupabase, markStoryAsSeenSupabase, deleteStorySupabase } from '../services/socialService';
import { Plus, X, ChevronLeft, ChevronRight, Loader2, Camera, Send, Heart, BookOpen, Trash2, User } from 'lucide-react';
import { Agent } from '../types';
import { uploadToCloudinary } from '../services/cloudinaryService';
import { formatDriveUrl } from '../services/storageUtils';
import { supabase } from '../services/supabaseClient';

const STORY_EMOJIS = ['❤️', '🏆', '😂', '😮', '🙏'];

interface Story {
    id: string;
    agent_id: string;
    image_url: string;
    content?: string;
    created_at: string;
    agentes: {
        nombre: string;
        foto_url: string;
    };
    vistas: string[];
    historia_reactions?: {
        id: string;
        agent_id: string;
        agent_name: string;
        emoji: string;
    }[];
}

interface StoryGroup {
    agentId: string;
    name: string;
    photoUrl: string;
    items: Story[];
}

interface ActiveHeart {
    id: number;
    name: string;
    x: number;
}

interface StoriesBarProps {
    currentUser: Agent | null;
    onStoryView?: (story: Story) => void;
}

const STORIES_TIMER_MS = 5000;

const StoriesBar: React.FC<StoriesBarProps> = ({ currentUser, onStoryView }) => {
    const [stories, setStories] = useState<StoryGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    // Preview / Pre-upload State
    const [previewFile, setPreviewFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    const [selectedStoryGroup, setSelectedStoryGroup] = useState<{ agentId: string, index: number } | null>(null);
    const [storyContext, setStoryContext] = useState('');
    const [replyText, setReplyText] = useState('');
    const [isSendingReply, setIsSendingReply] = useState(false);
    const [showReactions, setShowReactions] = useState(false);
    const [reactingEmoji, setReactingEmoji] = useState<string | null>(null);
    const [activeHearts, setActiveHearts] = useState<ActiveHeart[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const progressRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!currentUser?.id) return;
        loadStories();
        const channel = supabase
            .channel('stories-track')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_stories' }, () => {
                loadStories();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [currentUser?.id]);

    // Auto-advance timer
    useEffect(() => {
        if (selectedStoryGroup && !isSendingReply) {
            timerRef.current = setTimeout(() => {
                nextStory();
            }, STORIES_TIMER_MS);

            return () => {
                if (timerRef.current) clearTimeout(timerRef.current);
            };
        }
    }, [selectedStoryGroup, selectedStoryGroup?.index, isSendingReply]);

    const loadStories = async () => {
        if (!currentUser) return;
        setIsLoading(true);
        const data = await fetchActiveStoriesSupabase();
        const grouped = data.reduce((acc: { [key: string]: StoryGroup }, story: Story) => {
            if (!acc[story.agent_id]) {
                acc[story.agent_id] = {
                    agentId: story.agent_id,
                    name: story.agentes?.nombre || 'Agente',
                    photoUrl: story.agentes?.foto_url || '',
                    items: [story]
                };
            } else {
                acc[story.agent_id].items.push(story);
            }
            return acc;
        }, {} as { [key: string]: StoryGroup });

        // Convertir a array y ordenar: No vistas primero (basado en vistas de cada historia)
        const sortedGroups = (Object.values(grouped) as StoryGroup[]).sort((a: StoryGroup, b: StoryGroup) => {
            const aHasUnseen = a.items.some((s: Story) => !s.vistas?.includes(currentUser.id));
            const bHasUnseen = b.items.some((s: Story) => !s.vistas?.includes(currentUser.id));

            if (aHasUnseen && !bHasUnseen) return -1;
            if (!aHasUnseen && bHasUnseen) return 1;
            return 0;
        });

        setStories(sortedGroups);
        setIsLoading(false);
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser) return;

        setPreviewFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setShowPreview(true);
        setStoryContext('');
    };

    const handleConfirmUpload = async () => {
        if (!previewFile || !currentUser || isUploading) return;

        setIsUploading(true);
        try {
            const uploadRes = await uploadToCloudinary(previewFile);
            if (uploadRes.success && uploadRes.url) {
                const dbRes = await createStorySupabase(currentUser.id, uploadRes.url, storyContext.trim() || undefined);
                if (dbRes.success) {
                    await loadStories();
                    setShowPreview(false);
                    setPreviewFile(null);
                    setPreviewUrl(null);
                } else {
                    alert("ERROR AL GUARDAR HISTORIA: " + dbRes.error);
                }
            } else {
                alert("ERROR AL SUBIR ARCHIVO: " + uploadRes.error);
            }
        } catch (error: any) {
            console.error("Story upload failed:", error);
            alert("FALLA TÁCTICA: " + (error.message || "Error desconocido"));
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const closePreview = () => {
        setShowPreview(false);
        setPreviewFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
    };

    const openStory = (agentGroup: StoryGroup) => {
        setSelectedStoryGroup({ agentId: agentGroup.agentId, index: 0 });
        setReplyText('');
        setShowReactions(false);

        // Marcar como vista la primera historia del grupo
        if (currentUser && agentGroup.items?.[0]) {
            markStoryAsSeenSupabase(agentGroup.items[0].id, currentUser.id);
        }
    };

    const nextStory = () => {
        if (!selectedStoryGroup) return;
        const currentGroup = stories.find(g => g.agentId === selectedStoryGroup.agentId);
        if (!currentGroup) return;

        if (selectedStoryGroup.index < currentGroup.items.length - 1) {
            setSelectedStoryGroup({ ...selectedStoryGroup, index: selectedStoryGroup.index + 1 });
            if (currentUser && currentGroup.items[selectedStoryGroup.index + 1]) {
                markStoryAsSeenSupabase(currentGroup.items[selectedStoryGroup.index + 1].id, currentUser.id);
            }
        } else {
            const nextGroupIdx = stories.findIndex(g => g.agentId === selectedStoryGroup.agentId) + 1;
            if (nextGroupIdx < stories.length) {
                setSelectedStoryGroup({ agentId: stories[nextGroupIdx].agentId, index: 0 });
                if (currentUser && stories[nextGroupIdx].items[0]) {
                    markStoryAsSeenSupabase(stories[nextGroupIdx].items[0].id, currentUser.id);
                }
            } else {
                setSelectedStoryGroup(null);
            }
        }
    };

    const prevStory = () => {
        if (!selectedStoryGroup) return;
        const currentGroup = stories.find(g => g.agentId === selectedStoryGroup.agentId);
        if (!currentGroup) return;

        if (selectedStoryGroup.index > 0) {
            setSelectedStoryGroup({ ...selectedStoryGroup, index: selectedStoryGroup.index - 1 });
        } else {
            const prevGroupIdx = stories.findIndex(g => g.agentId === selectedStoryGroup.agentId) - 1;
            if (prevGroupIdx >= 0) {
                const prevGroup = stories[prevGroupIdx];
                setSelectedStoryGroup({ agentId: prevGroup.agentId, index: prevGroup.items.length - 1 });
            } else {
                setSelectedStoryGroup(null);
            }
        }
    };

    const getCurrentStory = (): Story | null => {
        if (!selectedStoryGroup) return null;
        const group = stories.find(g => g.agentId === selectedStoryGroup.agentId);
        return group?.items[selectedStoryGroup.index] || null;
    };

    const handleReact = async (emoji: string) => {
        const story = getCurrentStory();
        if (!story || !currentUser || reactingEmoji) return;

        setReactingEmoji(emoji);
        if (emoji === '❤️') {
            const newHeart = {
                id: Date.now(),
                name: currentUser.name.split(' ')[0],
                x: Math.random() * 60 - 30
            };
            setActiveHearts(prev => [...prev, newHeart]);
            setTimeout(() => {
                setActiveHearts(prev => prev.filter(h => h.id !== newHeart.id));
            }, 2000);
        }

        if (timerRef.current) clearTimeout(timerRef.current);

        try {
            await reactToStorySupabase(story.id, story.agent_id, currentUser.id, currentUser.name, emoji);
            await loadStories();
            setSelectedStoryGroup((prev: any) => prev ? { ...prev } : prev); // Trigger re-render to update reactions
        } catch (e) {
            console.error("Error reacting:", e);
        } finally {
            setReactingEmoji(null);
            setShowReactions(false);
        }
    };

    const handleSendReply = async () => {
        const story = getCurrentStory();
        if (!story || !currentUser || !replyText.trim() || isSendingReply) return;

        setIsSendingReply(true);
        if (timerRef.current) clearTimeout(timerRef.current);

        try {
            await sendStoryReplySupabase(
                story.agent_id, story.agentes?.nombre || 'Agente',
                currentUser.id, currentUser.name,
                replyText.trim(),
                story.id,
                story.image_url
            );
            setReplyText('');
        } catch (e) {
            console.error("Error sending reply:", e);
        } finally {
            setIsSendingReply(false);
        }
    };

    const getStoryReactions = (): { emoji: string; count: number; myReaction: boolean }[] => {
        const story = getCurrentStory();
        if (!story?.historia_reactions || story.historia_reactions.length === 0) return [];

        const emojiMap: { [key: string]: { count: number; myReaction: boolean } } = {};
        for (const r of story.historia_reactions) {
            if (!emojiMap[r.emoji]) emojiMap[r.emoji] = { count: 0, myReaction: false };
            emojiMap[r.emoji].count++;
            if (r.agent_id === currentUser?.id) emojiMap[r.emoji].myReaction = true;
        }

        return Object.entries(emojiMap).map(([emoji, data]) => ({ emoji, ...data }));
    };

    const getTimeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Ahora';
        if (mins < 60) return `${mins}m`;
        const hrs = Math.floor(mins / 60);
        return `${hrs}h`;
    };

    const currentStory = getCurrentStory();
    const currentStoryGroup = selectedStoryGroup ? stories.find(g => g.agentId === selectedStoryGroup.agentId) : null;

    return (
        <div className="bg-transparent overflow-hidden">
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1 text-montserrat">
                {/* My Story / Upload Button */}
                {currentUser && (
                    <div className="flex flex-col items-center gap-1.5 scroll-ml-6 first:ml-4">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#ffb700] to-orange-500 p-[2px] active:scale-95 transition-all shadow-[0_0_15px_rgba(255,183,0,0.2)] group relative"
                        >
                            <div className="w-full h-full rounded-[1.4rem] bg-[#001f3f] flex items-center justify-center border border-white/10 group-hover:bg-[#002a54] transition-colors overflow-hidden">
                                {isUploading ? (
                                    <Loader2 className="animate-spin text-[#ffb700]" size={24} />
                                ) : (
                                    currentUser.photoUrl ? (
                                        <img src={formatDriveUrl(currentUser.photoUrl)} className="w-full h-full object-cover opacity-50 contrast-125" alt="Tu historia" />
                                    ) : (
                                        <User size={24} className="text-white/20" />
                                    )
                                )}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/0 transition-colors">
                                    <Plus className="text-white" size={24} />
                                </div>
                            </div>
                        </button>
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest font-bebas">Tu Historia</span>
                    </div>
                )}

                {/* Other Stories */}
                {stories.map((group: StoryGroup) => {
                    const hasUnseen = group.items.some(it => !(it.vistas || []).includes(currentUser?.id || ''));
                    return (
                        <button
                            key={group.agentId}
                            onClick={() => openStory(group)}
                            className="flex flex-col items-center gap-1.5 active:scale-95 transition-all"
                        >
                            <div className={`w-16 h-16 rounded-3xl p-[2px] ${hasUnseen ? 'bg-gradient-to-tr from-[#ffb700] to-[#ffb700] shadow-[0_0_15px_rgba(255,183,0,0.3)] anim-gradient-orbit' : 'bg-white/10'}`}>
                                <div className="w-full h-full rounded-[1.4rem] bg-[#0c1427] p-0.5 overflow-hidden">
                                    <img
                                        src={formatDriveUrl(group.photoUrl)}
                                        className="w-full h-full rounded-[1.2rem] object-cover"
                                        alt={group.name}
                                        onError={(e) => {
                                            const target = e.currentTarget as HTMLImageElement;
                                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(group.name)}&background=1A1A1A&color=FFB700&size=200&bold=true`;
                                        }}
                                    />
                                </div>
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest font-bebas ${hasUnseen ? 'text-white' : 'text-white/40'}`}>
                                {group.name.split(' ')[0]}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* PRE-UPLOAD PREVIEW MODAL */}
            <AnimatePresence>
                {showPreview && previewUrl && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed inset-0 z-[150] bg-black/95 flex items-center justify-center p-4"
                    >
                        <div className="relative w-full max-w-sm aspect-[9/16] bg-[#001f3f] rounded-[40px] border border-white/10 overflow-hidden shadow-2xl flex flex-col">
                            {/* Close */}
                            <button onClick={closePreview} className="absolute top-6 right-6 z-20 bg-black/50 p-2 rounded-full text-white/80 transition-all hover:scale-110 active:scale-95">
                                <X size={20} />
                            </button>

                            {/* Header Aspect Ratio Info */}
                            <div className="absolute top-8 left-0 right-0 text-center pointer-events-none z-10">
                                <span className="bg-[#ffb700] text-[#001f3f] text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                                    Vista Previa Táctica (9:16)
                                </span>
                            </div>

                            {/* Image Preview Container */}
                            <div className="flex-1 relative bg-black flex overflow-hidden">
                                <img
                                    src={previewUrl}
                                    className="w-full h-full object-cover"
                                    alt="Preview"
                                />
                                {/* Caption Overlay */}
                                <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black to-transparent">
                                    <textarea
                                        autoFocus
                                        placeholder="Escribe un pie de foto..."
                                        value={storyContext}
                                        onChange={(e) => setStoryContext(e.target.value)}
                                        className="w-full bg-black/40 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-[#ffb700] transition-colors resize-none mb-6 min-h-[80px]"
                                    />
                                    <button
                                        onClick={handleConfirmUpload}
                                        disabled={isUploading}
                                        className="w-full bg-[#ffb700] text-[#001f3f] py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                                    >
                                        {isUploading ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                Subiendo...
                                            </>
                                        ) : (
                                            <>
                                                <Camera size={18} />
                                                Publicar Historia
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Story Viewer Overlay */}
            <AnimatePresence>
                {selectedStoryGroup && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
                    >
                        <div className="relative w-full h-full max-w-lg mx-auto bg-black flex flex-col font-montserrat">
                            {/* Header */}
                            <div className="absolute top-0 inset-x-0 p-4 z-30 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between pt-8 pointer-events-none">
                                <div className="flex items-center gap-3 pointer-events-auto">
                                    <img
                                        src={formatDriveUrl(currentStoryGroup?.photoUrl || '')}
                                        className="w-10 h-10 rounded-full border-2 border-[#ffb700]/50 object-cover shadow-lg"
                                        alt=""
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-white text-xs font-black uppercase tracking-wide drop-shadow-md">{currentStoryGroup?.name || 'Agente'}</span>
                                        {currentStory && (
                                            <p className="text-[9px] text-[#ffb700] font-black uppercase tracking-wider">{getTimeAgo(currentStory.created_at)}</p>
                                        )}
                                    </div>
                                    {currentUser?.id === currentStoryGroup?.agentId && (
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                const story = getCurrentStory();
                                                if (story && window.confirm('¿ELIMINAR ESTA HISTORIA?')) {
                                                    const res = await deleteStorySupabase(story.id);
                                                    if (res.success) {
                                                        loadStories();
                                                        setSelectedStoryGroup(null);
                                                    }
                                                }
                                            }}
                                            className="ml-4 p-2 bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 rounded-xl text-red-400 transition-all pointer-events-auto"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                                <button onClick={() => setSelectedStoryGroup(null)} className="text-white/80 p-2 pointer-events-auto hover:scale-110 active:scale-95 transition-transform">
                                    <X className="w-8 h-8 drop-shadow-lg" />
                                </button>
                            </div>

                            {/* Story Context Overlay (Pie de foto) */}
                            {getCurrentStory()?.content && (
                                <div className="absolute top-24 inset-x-0 px-6 py-4 z-20 animate-in fade-in slide-in-from-top-4 duration-500">
                                    <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl">
                                        <p className="text-white text-[13px] font-medium leading-relaxed italic text-center drop-shadow-sm">
                                            "{getCurrentStory()?.content}"
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Progress Indicators */}
                            <div className="absolute top-4 inset-x-4 flex gap-1.5 z-20">
                                {currentStoryGroup?.items.map((_: any, idx: number) => (
                                    <div key={idx} className="h-[3px] flex-1 bg-white/20 rounded-full overflow-hidden shadow-sm">
                                        <div
                                            className={`h-full bg-[#ffb700] rounded-full ${idx < (selectedStoryGroup?.index || 0) ? 'w-full' : idx === (selectedStoryGroup?.index || 0) ? '' : 'w-0'}`}
                                            style={idx === (selectedStoryGroup?.index || 0) ? { animation: `progress ${STORIES_TIMER_MS}ms linear forwards` } : {}}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Image Container */}
                            <div className="flex-1 flex items-center justify-center relative bg-black overflow-hidden">
                                <img
                                    src={currentStory?.image_url}
                                    className="w-full h-full object-cover"
                                    alt=""
                                />

                                {/* Navigation Zones */}
                                <div className="absolute inset-y-0 left-0 w-1/4 cursor-pointer" onClick={prevStory} />
                                <div className="absolute inset-y-0 right-0 w-1/4 cursor-pointer" onClick={nextStory} />

                                {/* Floating Reaction Summary */}
                                {getStoryReactions().length > 0 && (
                                    <div className="absolute bottom-32 left-6 flex flex-col gap-2.5 animate-in fade-in slide-in-from-left-4 duration-500">
                                        {getStoryReactions().map(r => (
                                            <div key={r.emoji} className="flex flex-col gap-1.5">
                                                <div
                                                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full backdrop-blur-xl border shadow-xl self-start transition-all ${r.myReaction
                                                        ? 'bg-[#ffb700]/40 border-[#ffb700]/50 scale-110'
                                                        : 'bg-black/60 border-white/20'
                                                        }`}
                                                >
                                                    <span className="text-lg">{r.emoji}</span>
                                                    <span className="text-[11px] font-black text-white">{r.count}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Bottom Interaction Bar */}
                            <div className="absolute bottom-0 inset-x-0 p-6 pb-12 bg-gradient-to-t from-black via-black/60 to-transparent space-y-4">
                                {/* Emoji Reaction Bar */}
                                <div className="flex items-center justify-center gap-6">
                                    {STORY_EMOJIS.map(emoji => (
                                        <button
                                            key={emoji}
                                            onClick={() => handleReact(emoji)}
                                            disabled={!!reactingEmoji}
                                            className="text-3xl hover:scale-125 active:scale-95 transition-all drop-shadow-lg disabled:opacity-50"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>

                                {/* Reply Input */}
                                <div className="flex items-center gap-3">
                                    <input
                                        type="text"
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                                        onFocus={() => {
                                            if (timerRef.current) clearTimeout(timerRef.current);
                                        }}
                                        placeholder="Envía un comando..."
                                        className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-3.5 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-[#ffb700]/50 transition-all shadow-inner"
                                    />
                                    <button
                                        onClick={handleSendReply}
                                        disabled={!replyText.trim() || isSendingReply}
                                        className="p-3.5 bg-[#ffb700] rounded-2xl text-[#001f3f] disabled:opacity-30 hover:bg-[#ffb700]/80 active:scale-90 transition-all shadow-xl"
                                    >
                                        {isSendingReply ? (
                                            <Loader2 size={20} className="animate-spin" />
                                        ) : (
                                            <Send size={20} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                @keyframes progress {
                    from { width: 0%; }
                    to { width: 100%; }
                }
            `}</style>
        </div>
    );
};

export default StoriesBar;
