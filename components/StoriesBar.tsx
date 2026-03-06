import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, ChevronLeft, ChevronRight, Loader2, Camera } from 'lucide-react';
import { Agent } from '../types';
import { fetchActiveStoriesSupabase, createStorySupabase } from '../services/supabaseService';
import { uploadToCloudinary } from '../services/cloudinaryService';
import { formatDriveUrl } from '../services/storageUtils';

interface Story {
    id: string;
    agent_id: string;
    image_url: string;
    created_at: string;
    agentes: {
        nombre: string;
        foto_url: string;
    };
    vistas: string[];
}

interface StoriesBarProps {
    currentUser: Agent | null;
    onStoryView?: (story: Story) => void;
}

const StoriesBar: React.FC<StoriesBarProps> = ({ currentUser, onStoryView }) => {
    const [stories, setStories] = useState<Story[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedStory, setSelectedStory] = useState<Story | null>(null);
    const [storyIndex, setStoryIndex] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadStories();
    }, []);

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
                const dbRes = await createStorySupabase(currentUser.id, uploadRes.url);
                if (dbRes.success) {
                    await loadStories();
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
    };

    const nextStory = () => {
        const agentStories = (selectedStory as any)?.allStories || [];
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
    }

    return (
        <div className="w-full py-4 bg-transparent overflow-hidden">
            <div className="flex items-center gap-4 px-4 overflow-x-auto no-scrollbar">
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
                                    <span className="text-white text-xs font-bold">{selectedStory.agentes.nombre}</span>
                                </div>
                                <button onClick={() => setSelectedStory(null)} className="text-white">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Indicators */}
                            <div className="absolute top-2 inset-x-2 flex gap-1 z-20">
                                {(selectedStory as any).allStories.map((_: any, idx: number) => (
                                    <div key={idx} className="h-[2px] flex-1 bg-white/20 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full bg-white transition-all duration-[5000ms] ease-linear ${idx < storyIndex ? 'w-full' : idx === storyIndex ? 'w-full' : 'w-0'}`}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Image */}
                            <div className="flex-1 flex items-center justify-center relative">
                                <img
                                    src={(selectedStory as any).allStories[storyIndex].image_url}
                                    className="w-full h-full object-contain"
                                    alt=""
                                />

                                {/* Navigation Zones */}
                                <div className="absolute inset-y-0 left-0 w-1/3" onClick={prevStory} />
                                <div className="absolute inset-y-0 right-0 w-1/3" onClick={nextStory} />
                            </div>

                            {/* Interaction */}
                            <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/60 to-transparent flex items-center gap-4">
                                <div className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-white/50 text-xs">
                                    Enviar mensaje...
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StoriesBar;
