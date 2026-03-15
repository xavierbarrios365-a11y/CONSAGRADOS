import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, X, Loader2, Zap, Target, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';

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

    // Gestures
    const y = useMotionValue(0);
    const opacity = useTransform(y, [0, 200], [1, 0]);
    const scale = useTransform(y, [0, 200], [1, 0.9]);

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

    const handleSeek = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (videoRef.current) {
            const rect = e.currentTarget.getBoundingClientRect();
            let x = 0;
            if ('clientX' in e) {
                x = e.clientX - rect.left;
            } else if ('touches' in e) {
                x = e.touches[0].clientX - rect.left;
            }
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

    const handleDragEnd = (_: any, info: any) => {
        if (info.offset.y > 150) {
            onClose();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center font-bebas overflow-hidden"
            onMouseMove={handleUserActivity}
            onTouchStart={handleUserActivity}
        >
            {/* Background blur/gradient */}
            <div className="absolute inset-0 bg-[#001f3f]/20 backdrop-blur-3xl z-0" />

            {/* Header - Reponsive padding */}
            <div className="absolute top-0 inset-x-0 p-4 md:p-8 flex items-center justify-between z-50 bg-gradient-to-b from-black/90 to-transparent">
                <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-[#ffb700] rounded-lg md:rounded-xl flex items-center justify-center text-[#001f3f] shadow-[0_0_20px_rgba(255,183,0,0.3)] shrink-0">
                        {type === 'video' ? <Zap size={18} /> : <Target size={18} />}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-white text-base md:text-xl uppercase tracking-widest truncate">{title || (type === 'video' ? 'Transmisión Táctica' : 'Revisión de Inteligencia')}</h3>
                        <p className="text-[#ffb700] text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] opacity-80">Consagrados Network • En Directo</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 md:p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl md:rounded-2xl text-white transition-all active:scale-95"
                >
                    <X size={20} md:size={24} />
                </button>
            </div>

            {/* Media Container - Improved for Mobile Portrait */}
            <motion.div
                style={{ y, opacity, scale }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                onDragEnd={handleDragEnd}
                className="relative w-full h-full md:h-auto md:max-w-5xl md:aspect-video md:rounded-[2.5rem] overflow-hidden md:border border-white/10 shadow-2xl bg-black group flex items-center justify-center z-10"
                onClick={(e) => {
                    e.stopPropagation();
                    if (type === 'video') togglePlay();
                }}
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
                        />

                        <AnimatePresence>
                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-20"
                                >
                                    <Loader2 size={48} className="text-[#ffb700] animate-spin mb-4" />
                                    <span className="text-[10px] text-[#ffb700] font-black uppercase tracking-[0.4em] animate-pulse">Sincronizando...</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <AnimatePresence>
                            {showControls && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    className="absolute bottom-0 inset-x-0 p-6 md:p-10 bg-gradient-to-t from-black/95 via-black/60 to-transparent space-y-4 md:space-y-6 z-30"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* Progress Bar (Thicker for touch) */}
                                    <div
                                        className="relative h-4 w-full flex items-center cursor-pointer group/bar"
                                        onClick={handleSeek}
                                        onTouchStart={handleSeek}
                                    >
                                        <div className="h-1.5 md:h-2 w-full bg-white/10 rounded-full overflow-hidden relative">
                                            <motion.div
                                                className="absolute top-0 left-0 h-full bg-[#ffb700] shadow-[0_0_10px_rgba(255,183,0,0.5)]"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Controls Row */}
                                    <div className="flex items-center justify-between pb-4 md:pb-0">
                                        <div className="flex items-center gap-6 md:gap-8">
                                            <button onClick={togglePlay} className="text-white hover:text-[#ffb700] transition-colors active:scale-90 p-2">
                                                {isPlaying ? <Pause size={32} md:size={40} /> : <Play size={32} md:size={40} fill="currentColor" />}
                                            </button>

                                            <div className="flex items-center gap-4">
                                                <button onClick={toggleMute} className="text-white/60 hover:text-white transition-colors p-2">
                                                    {isMuted ? <VolumeX size={20} md:size={24} /> : <Volume2 size={20} md:size={24} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="px-2 md:px-3 py-1 bg-[#ffb700]/10 border border-[#ffb700]/30 rounded-lg backdrop-blur-md">
                                                <span className="text-[9px] md:text-[10px] text-[#ffb700] font-black uppercase tracking-widest">EN LINEA • 4K</span>
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
                        draggable={false}
                    />
                )}
            </motion.div>

            {/* Footer / Instructions - Native look */}
            <div className="absolute bottom-6 md:bottom-10 flex flex-col items-center gap-2 opacity-40 pointer-events-none z-50">
                <ChevronDown className="animate-bounce text-white" size={20} />
                <p className="text-[8px] md:text-[10px] text-white font-black uppercase tracking-[0.4em] md:tracking-[0.6em]">Desliza hacia abajo para cerrar</p>
            </div>
        </motion.div>
    );
};

export default TacticalMediaPlayer;
