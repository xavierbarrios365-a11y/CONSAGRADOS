import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, X, Loader2, Zap, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TacticalMediaPlayerProps {
    url: string;
    onClose: () => void;
    title?: string;
    type?: 'video' | 'image';
}

const TacticalMediaPlayer: React.FC<TacticalMediaPlayerProps> = ({ url, onClose, title, type = 'video' }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [showControls, setShowControls] = useState(true);
    const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const togglePlay = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (videoRef.current) {
            if (isPlaying) videoRef.current.pause();
            else videoRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };

    const toggleMute = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleProgress = () => {
        if (videoRef.current) {
            const current = videoRef.current.currentTime;
            const duration = videoRef.current.duration;
            setProgress((current / duration) * 100);
        }
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (videoRef.current) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const clickedValue = (x / rect.width) * 100;
            videoRef.current.currentTime = (clickedValue / 100) * videoRef.current.duration;
        }
    };

    const handleUserActivity = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, 3000);
    };

    useEffect(() => {
        handleUserActivity();
        return () => {
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        };
    }, [isPlaying]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center font-bebas"
            onClick={onClose}
            onMouseMove={handleUserActivity}
            onTouchStart={handleUserActivity}
        >
            {/* Header */}
            <div className="absolute top-0 inset-x-0 p-6 flex items-center justify-between z-50 bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#ffb700] rounded-xl flex items-center justify-center text-[#001f3f] shadow-[0_0_20px_rgba(255,183,0,0.3)]">
                        {type === 'video' ? <Zap size={20} /> : <Target size={20} />}
                    </div>
                    <div>
                        <h3 className="text-white text-xl uppercase tracking-widest">{title || (type === 'video' ? 'Transmisión Táctica' : 'Revisión de Inteligencia')}</h3>
                        <p className="text-[#ffb700] text-[9px] font-black uppercase tracking-[0.3em]">Consagrados Network • En Directo</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white transition-all active:scale-95"
                >
                    <X size={24} />
                </button>
            </div>

            {/* Media Container */}
            <div
                className="relative w-full max-w-5xl aspect-video rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl bg-black group"
                onClick={(e) => e.stopPropagation()}
            >
                {type === 'video' ? (
                    <>
                        <video
                            ref={videoRef}
                            src={url}
                            autoPlay
                            playsInline
                            className="w-full h-full object-contain"
                            onTimeUpdate={handleProgress}
                            onWaiting={() => setIsLoading(true)}
                            onPlaying={() => setIsLoading(false)}
                            onEnded={() => setIsPlaying(false)}
                            onClick={() => togglePlay()}
                        />

                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
                                <Loader2 size={48} className="text-[#ffb700] animate-spin" />
                            </div>
                        )}

                        <AnimatePresence>
                            {showControls && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent space-y-6"
                                >
                                    {/* Progress Bar */}
                                    <div
                                        className="relative h-2 w-full bg-white/10 rounded-full cursor-pointer overflow-hidden group/bar transition-all hover:h-3"
                                        onClick={handleSeek}
                                    >
                                        <div
                                            className="absolute top-0 left-0 h-full bg-[#ffb700] transition-all duration-100"
                                            style={{ width: `${progress}%` }}
                                        />
                                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/bar:opacity-100 transition-opacity" />
                                    </div>

                                    {/* Controls Row */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-6">
                                            <button onClick={togglePlay} className="text-white hover:text-[#ffb700] transition-colors active:scale-90">
                                                {isPlaying ? <Pause size={32} /> : <Play size={32} fill="currentColor" />}
                                            </button>

                                            <div className="flex items-center gap-4">
                                                <button onClick={toggleMute} className="text-white/60 hover:text-white transition-colors">
                                                    {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                                                </button>
                                                {/* Timestamp could go here */}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="px-3 py-1 bg-[#ffb700]/20 border border-[#ffb700]/30 rounded-lg">
                                                <span className="text-[10px] text-[#ffb700] font-black uppercase tracking-widest">4K • HQ</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                ) : (
                    <img
                        src={url}
                        className="w-full h-full object-contain"
                        alt="Visualización táctica"
                    />
                )}
            </div>

            {/* Footer / Instructions */}
            <div className="absolute bottom-8 text-center opacity-30 pointer-events-none">
                <p className="text-[10px] text-white font-black uppercase tracking-[0.5em]">Desliza para cerrar • Consagrados 2026</p>
            </div>
        </motion.div>
    );
};

export default TacticalMediaPlayer;
