import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, ChevronLeft, ChevronRight, Loader2, Camera, Send, Heart } from 'lucide-react';
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

const StoriesBar: React.FC<StoriesBarProps> = ({ currentUser, onStoryView }) => {
    const [stories, setStories] = useState<Story[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
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

    // Auto-advance timer (5 seconds)
    useEffect(() => {
        if (selectedStory) {
            timerRef.current = setTimeout(() => {
                nextStory();
            }, 5000);

            return () => {
                if (timerRef.current) clearTimeout(timerRef.current);
            };
        }
    }, [selectedStory, storyIndex]);

    const loadStories = async () => {
        setIsLoading(true);
        const data = await fetchActiveStoriesSupabase();
        // Group stories by agent
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

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser) return;

        setIsUploading(true);
        try {
            const uploadRes = await uploadToCloudinary(file);
            if (uploadRes.success && uploadRes.url) {
                const dbRes = await createStorySupabase(currentUser.id, uploadRes.url, storyContext.trim() || undefined);
                if (dbRes.success) {
                    await loadStories();
                    setStoryContext('');
                }
            }
        } catch (error) {
            console.error("Story upload failed:", error);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
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
                x: Math.random() * 60 - 30 // Random offset
            };
            setActiveHearts(prev => [...prev, newHeart]);
            setTimeout(() => {
                setActiveHearts(prev => prev.filter(h => h.id !== newHeart.id));
            }, 2000);
        }

        // Pause timer while reacting
        if (timerRef.current) clearTimeout(timerRef.current);

        try {
            await reactToStorySupabase(story.id, story.agent_id, currentUser.id, currentUser.name, emoji);
            // Reload stories to reflect the change
            await loadStories();
            // Update the selected story's reactions locally
            setSelectedStory((prev: any) => {
                if (!prev) return prev;
                return { ...prev }; // trigger re-render
            });
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
        // Pause timer
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
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
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
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>
                    <span className="text-[10px] text-white/60 font-medium">Tu historia</span>
                </div>

                {isUploading && (
                    <div className="flex flex-col gap-2 min-w-[150px]">
                        <input
                            type="text"
                            placeholder="Añadir contexto..."
                            value={storyContext}
                            onChange={(e) => setStoryContext(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white outline-none focus:border-[#ffb700]/50"
                        />
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-[#ffb700] animate-pulse w-full" />
                        </div>
                    </div>
                )}

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

            {/* Story Viewer Overlay */}
            <AnimatePresence>
                {selectedStory && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black flex flex-center"
                    >
                        <div className="relative w-full h-full max-w-lg mx-auto bg-black flex flex-col">
                            {/* Header */}
                            <div className="absolute top-0 inset-x-0 p-4 z-10 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={formatDriveUrl(selectedStory.agentes.foto_url, selectedStory.agentes.nombre)}
                                        className="w-8 h-8 rounded-full border border-white/20"
                                        alt=""
                                    />
                                    <div>
                                        <span className="text-white text-xs font-bold">{selectedStory.agentes.nombre}</span>
                                        <div className="flex items-center gap-2">
                                            {getCurrentStory() && (
                                                <p className="text-[9px] text-white/50">{getTimeAgo(getCurrentStory()!.created_at)}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedStory(null)} className="text-white p-2">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Story Context Overlay */}
                            {getCurrentStory()?.content && (
                                <div className="absolute top-20 inset-x-0 px-6 py-4 z-10">
                                    {getCurrentStory()?.content?.includes(' | ') ? (
                                        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden group/bible_story">
                                            {/* Decorative Background Icon */}
                                            <div className="absolute -bottom-6 -right-6 opacity-10 group-hover/bible_story:scale-110 transition-transform duration-1000">
                                                <BookOpen size={120} className="text-[#ffb700] -rotate-12" />
                                            </div>

                                            <div className="relative z-10 space-y-4">
                                                {/* Quote Mark */}
                                                <div className="text-[#ffb700] font-serif text-6xl h-8 leading-none opacity-40">“</div>

                                                <p className="text-white text-base md:text-xl font-medium leading-relaxed italic text-center pr-2">
                                                    {getCurrentStory()?.content?.split(' | ')[0]}
                                                </p>

                                                <div className="flex flex-col items-center gap-2 pt-2">
                                                    <div className="h-px w-12 bg-gradient-to-r from-transparent via-[#ffb700]/40 to-transparent" />
                                                    <span className="text-[10px] font-black text-[#ffb700] uppercase tracking-[0.3em]">
                                                        {getCurrentStory()?.content?.split(' | ')[1]}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-2xl">
                                            <p className="text-white text-xs font-medium leading-relaxed italic text-center">
                                                "{getCurrentStory()?.content}"
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Progress Indicators */}
                            <div className="absolute top-2 inset-x-2 flex gap-1 z-20">
                                {selectedStory.allStories.map((_: any, idx: number) => (
                                    <div key={idx} className="h-[2px] flex-1 bg-white/20 rounded-full overflow-hidden">
                                        <div
                                            ref={idx === storyIndex ? progressRef : undefined}
                                            className={`h-full bg-white rounded-full ${idx < storyIndex ? 'w-full' : idx === storyIndex ? 'animate-progress' : 'w-0'}`}
                                            style={idx === storyIndex ? { animation: 'progress 5s linear forwards' } : {}}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Image */}
                            <div className="flex-1 flex items-center justify-center relative">
                                <img
                                    src={getCurrentStory()?.image_url}
                                    className="w-full h-full object-contain"
                                    alt=""
                                />

                                {/* Navigation Zones */}
                                <div className="absolute inset-y-0 left-0 w-1/3" onClick={prevStory} />
                                <div className="absolute inset-y-0 right-0 w-1/3" onClick={nextStory} />

                                {/* Floating Reaction Summary */}
                                {getStoryReactions().length > 0 && (
                                    <div className="absolute bottom-24 left-4 flex flex-col gap-2 animate-in fade-in">
                                        {getStoryReactions().map(r => (
                                            <div key={r.emoji} className="flex flex-col gap-1">
                                                <div
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border text-xs shadow-lg self-start ${r.myReaction
                                                        ? 'bg-[#ffb700]/30 border-[#ffb700]/40'
                                                        : 'bg-black/40 border-white/10'
                                                        }`}
                                                >
                                                    <span>{r.emoji}</span>
                                                    <span className="text-[10px] font-black text-white">{r.count}</span>
                                                </div>
                                                {/* Mostrar nombres de quienes reaccionaron */}
                                                <div className="flex flex-wrap gap-1 px-1">
                                                    {getCurrentStory()?.historia_reactions?.filter(hr => hr.emoji === r.emoji).slice(0, 3).map((hr, idx) => (
                                                        <span key={hr.id} className="text-[8px] font-bold text-white/60 bg-black/20 px-1.5 py-0.5 rounded">
                                                            {hr.agent_name.split(' ')[0]}
                                                        </span>
                                                    ))}
                                                    {(getCurrentStory()?.historia_reactions?.filter(hr => hr.emoji === r.emoji).length || 0) > 3 && (
                                                        <span className="text-[8px] font-bold text-white/40 italic">
                                                            +{(getCurrentStory()?.historia_reactions?.filter(hr => hr.emoji === r.emoji).length || 0) - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Reaction Animation */}
                                <AnimatePresence>
                                    {reactingEmoji && reactingEmoji !== '❤️' && (
                                        <motion.div
                                            initial={{ scale: 0, opacity: 1 }}
                                            animate={{ scale: 3, opacity: 0, y: -100 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.8 }}
                                            className="absolute inset-0 flex items-center justify-center text-6xl pointer-events-none z-30"
                                        >
                                            {reactingEmoji}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Floating TikTok Hearts */}
                                <AnimatePresence>
                                    {activeHearts.map(heart => (
                                        <motion.div
                                            key={heart.id}
                                            initial={{ y: 0, opacity: 1, scale: 0.5, x: heart.x }}
                                            animate={{ y: -400, opacity: 0, scale: 1.5, x: heart.x + (Math.random() * 40 - 20) }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 1.5, ease: "easeOut" }}
                                            className="absolute bottom-20 right-10 flex flex-col items-center pointer-events-none z-50"
                                        >
                                            <Heart fill="#ff4d00" className="text-[#ff4d00]" size={40} />
                                            <span className="text-[10px] font-black text-white bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/10 mt-1 whitespace-nowrap">
                                                {heart.name}
                                            </span>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>

                            {/* Bottom Interaction Bar */}
                            <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent space-y-3">
                                {/* Emoji Reaction Bar */}
                                <div className="flex items-center justify-center gap-3">
                                    {STORY_EMOJIS.map(emoji => (
                                        <button
                                            key={emoji}
                                            onClick={() => handleReact(emoji)}
                                            disabled={!!reactingEmoji}
                                            className="text-2xl hover:scale-125 active:scale-90 transition-transform disabled:opacity-50"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>

                                {/* Reply Input */}
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                                        onFocus={() => {
                                            if (timerRef.current) clearTimeout(timerRef.current);
                                        }}
                                        placeholder="Responder..."
                                        className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2.5 text-white text-xs placeholder:text-white/40 focus:outline-none focus:border-[#ffb700]/50 transition-all"
                                    />
                                    <button
                                        onClick={handleSendReply}
                                        disabled={!replyText.trim() || isSendingReply}
                                        className="p-2.5 bg-[#ffb700] rounded-full text-black disabled:opacity-30 hover:bg-[#ffb700]/80 active:scale-90 transition-all"
                                    >
                                        {isSendingReply ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Send size={16} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* CSS for progress bar animation */}
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
