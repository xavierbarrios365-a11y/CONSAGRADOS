import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, ChevronLeft, ChevronRight, Loader2, Camera, Send, Heart, BookOpen } from 'lucide-react';
import { Agent } from '../types';
import { fetchActiveStoriesSupabase, createStorySupabase, reactToStorySupabase, sendStoryReplySupabase } from '../services/supabaseService';
import { uploadToCloudinary } from '../services/cloudinaryService';
import { formatDriveUrl } from '../services/storageUtils';

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
    const [stories, setStories] = useState<Story[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    // Preview / Pre-upload State
    const [previewFile, setPreviewFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    const [selectedStory, setSelectedStory] = useState<any | null>(null);
    const [storyIndex, setStoryIndex] = useState(0);
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
        loadStories();
    }, []);

    // Auto-advance timer
    useEffect(() => {
        if (selectedStory && !isSendingReply) {
            timerRef.current = setTimeout(() => {
                nextStory();
            }, STORIES_TIMER_MS);

            return () => {
                if (timerRef.current) clearTimeout(timerRef.current);
            };
        }
    }, [selectedStory, storyIndex, isSendingReply]);

    const loadStories = async () => {
        setIsLoading(true);
        const data = await fetchActiveStoriesSupabase();
        const grouped = data.reduce((acc: any, story: Story) => {
            if (!acc[story.agent_id]) {
                acc[story.agent_id] = {
                    ...story,
                    allStories: [story]
                };
            } else {
                acc[story.agent_id].allStories.push(story);
            }
            return acc;
        }, {});

        setStories(Object.values(grouped));
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
                }
            }
        } catch (error) {
            console.error("Story upload failed:", error);
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

    const openStory = (agentStories: any) => {
        setSelectedStory(agentStories);
        setStoryIndex(0);
        setReplyText('');
        setShowReactions(false);
    };

    const nextStory = () => {
        const agentStories = selectedStory?.allStories || [];
        if (storyIndex < agentStories.length - 1) {
            setStoryIndex(storyIndex + 1);
        } else {
            setSelectedStory(null);
        }
    };

    const prevStory = () => {
        if (storyIndex > 0) {
            setStoryIndex(storyIndex - 1);
        }
    };

    const getCurrentStory = (): Story | null => {
        return selectedStory?.allStories?.[storyIndex] || null;
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
            setSelectedStory((prev: any) => prev ? { ...prev } : prev);
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
                story.agent_id, story.agentes.nombre,
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

    return (
        <div className="bg-transparent overflow-hidden">
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1 text-montserrat">
                {/* My Story / Upload Button */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                    <div
                        onClick={handleUploadClick}
                        className="relative w-16 h-16 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-[#ffb700] transition-colors group"
                    >
                        {isUploading ? (
                            <Loader2 className="w-6 h-6 text-[#ffb700] animate-spin" />
                        ) : (
                            <>
                                <img
                                    src={formatDriveUrl(currentUser?.photoUrl, currentUser?.name)}
                                    className="w-14 h-14 rounded-full object-cover opacity-50 group-hover:opacity-100 transition-opacity"
                                    alt="Tu historia"
                                />
                                <div className="absolute bottom-0 right-0 bg-[#ffb700] rounded-full p-1 border-2 border-[#001f3f]">
                                    <Plus className="w-3 h-3 text-[#001f3f]" />
                                </div>
                            </>
                        )}
                        <input
                            id="story-file-input"
                            name="story-file-input"
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>
                    <span className="text-[10px] text-white/60 font-medium tracking-tight">Tu historia</span>
                </div>

                {/* Other Stories */}
                {stories.map((agentGroup: any) => (
                    <div
                        key={agentGroup.agent_id}
                        className="flex flex-col items-center gap-1 shrink-0 cursor-pointer"
                        onClick={() => openStory(agentGroup)}
                    >
                        <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-[#ffb700] to-[#ff4d00]">
                            <div className="p-[2px] bg-[#001f3f] rounded-full">
                                <img
                                    src={formatDriveUrl(agentGroup.agentes.foto_url, agentGroup.agentes.nombre)}
                                    className="w-14 h-14 rounded-full object-cover"
                                    alt={agentGroup.agentes.nombre}
                                />
                            </div>
                        </div>
                        <span className="text-[10px] text-white/80 font-medium truncate w-16 text-center">
                            {agentGroup.agentes.nombre.split(' ')[0]}
                        </span>
                    </div>
                ))}
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
                {selectedStory && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black flex flex-center"
                    >
                        <div className="relative w-full h-full max-w-lg mx-auto bg-black flex flex-col font-montserrat">
                            {/* Header */}
                            <div className="absolute top-0 inset-x-0 p-4 z-10 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between pointer-events-none pt-8">
                                <div className="flex items-center gap-3 pointer-events-auto">
                                    <img
                                        src={formatDriveUrl(selectedStory.agentes.foto_url, selectedStory.agentes.nombre)}
                                        className="w-10 h-10 rounded-full border-2 border-[#ffb700]/50 object-cover shadow-lg"
                                        alt=""
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-white text-xs font-black uppercase tracking-wide drop-shadow-md">{selectedStory.agentes.nombre}</span>
                                        {getCurrentStory() && (
                                            <p className="text-[9px] text-[#ffb700] font-black uppercase tracking-wider">{getTimeAgo(getCurrentStory()!.created_at)}</p>
                                        )}
                                    </div>
                                </div>
                                <button onClick={() => setSelectedStory(null)} className="text-white/80 p-2 pointer-events-auto hover:scale-110 active:scale-95 transition-transform">
                                    <X className="w-8 h-8 drop-shadow-lg" />
                                </button>
                            </div>

                            {/* Story Context Overlay (Pie de foto) */}
                            {getCurrentStory()?.content && (
                                <div className="absolute top-24 inset-x-0 px-6 py-4 z-10 animate-in fade-in slide-in-from-top-4 duration-500">
                                    <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl">
                                        <p className="text-white text-[13px] font-medium leading-relaxed italic text-center drop-shadow-sm">
                                            "{getCurrentStory()?.content}"
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Progress Indicators */}
                            <div className="absolute top-4 inset-x-4 flex gap-1.5 z-20">
                                {selectedStory.allStories.map((_: any, idx: number) => (
                                    <div key={idx} className="h-[3px] flex-1 bg-white/20 rounded-full overflow-hidden shadow-sm">
                                        <div
                                            ref={idx === storyIndex ? progressRef : undefined}
                                            className={`h-full bg-[#ffb700] rounded-full ${idx < storyIndex ? 'w-full' : idx === storyIndex ? '' : 'w-0'}`}
                                            style={idx === storyIndex ? { animation: `progress ${STORIES_TIMER_MS}ms linear forwards` } : {}}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Image Container Enfoced to 9:16 visually */}
                            <div className="flex-1 flex items-center justify-center relative bg-black overflow-hidden">
                                <img
                                    src={getCurrentStory()?.image_url}
                                    className="w-full h-full object-cover" // FORCED 9:16 (Story format)
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
        </div >
    );
};

export default StoriesBar;
