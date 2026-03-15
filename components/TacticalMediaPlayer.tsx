import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, X, Loader2, Zap, Target, ChevronDown, Activity } from 'lucide-react';
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
            initial={{ opacity: 0, scale: 0.95, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, scale: 1, backdropFilter: 'blur(40px)' }}
            exit={{ opacity: 0, scale: 1.05, backdropFilter: 'blur(0px)' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[300] bg-black/80 flex flex-col items-center justify-center font-bebas overflow-hidden"
            onMouseMove={handleUserActivity}
            onTouchStart={handleUserActivity}
        >
            {/* Ambient Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vh] bg-[#ffb70010] rounded-full blur-[120px] pointer-events-none" />

            {/* Header - Immersive */}
            <div className="absolute top-0 inset-x-0 p-6 md:p-10 flex items-center justify-between z-50 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
                <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-4"
                >
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-[#ffb700] to-[#ff6b00] rounded-2xl flex items-center justify-center text-[#001f3f] shadow-[0_0_30px_rgba(255,183,0,0.4)] shrink-0">
                        {type === 'video' ? <Zap size={20} className="fill-[#001f3f]/20" /> : <Target size={20} />}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-white text-lg md:text-2xl uppercase tracking-[0.2em] truncate drop-shadow-lg">{title || (type === 'video' ? 'Transmisión Táctica' : 'Revisión de Inteligencia')}</h3>
                        <p className="text-[#ffb700] text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] opacity-90">Consagrados Network • Enlace Cuántico</p>
                    </div>
                </motion.div>
                <button
                    onClick={onClose}
                    className="p-3 bg-white/10 hover:bg-[#ffb700] hover:text-[#001f3f] border border-white/20 rounded-2xl text-white transition-all active:scale-90 shadow-xl"
                >
                    <X size={24} />
                </button>
            </div>

            {/* Media Container - Threads Expansion Feel */}
            <motion.div
                style={{ y, opacity, scale }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                onDragEnd={handleDragEnd}
                className="relative w-full h-full md:h-auto md:max-w-6xl md:aspect-video md:rounded-[3rem] overflow-hidden md:border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] bg-black group flex items-center justify-center z-10"
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
                            className="w-full h-full object-contain md:object-cover"
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
                                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-20"
                                >
                                    <div className="relative">
                                        <Loader2 size={60} className="text-[#ffb700] animate-spin mb-4 opacity-50" />
                                        <Zap size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] text-[#ffb700] animate-pulse" />
                                    </div>
                                    <span className="text-[11px] text-[#ffb700] font-black uppercase tracking-[0.5em] animate-pulse">Sincronizando Frecuencia...</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <AnimatePresence>
                            {showControls && (
                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 30 }}
                                    className="absolute bottom-0 inset-x-0 p-8 md:p-14 bg-gradient-to-t from-black/95 via-black/40 to-transparent space-y-6 md:space-y-8 z-30"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* Progress Bar (Premium Style) */}
                                    <div
                                        className="relative h-6 w-full flex items-center cursor-pointer group/bar"
                                        onClick={handleSeek}
                                        onTouchStart={handleSeek}
                                    >
                                        <div className="h-1.5 md:h-2 w-full bg-white/10 rounded-full overflow-hidden relative">
                                            <motion.div
                                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#ffb700] to-[#ffde59] shadow-[0_0_20px_rgba(255,183,0,0.6)]"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                        <div
                                            className="absolute h-4 w-4 bg-white rounded-full shadow-2xl border-2 border-[#ffb700] opacity-0 group-hover/bar:opacity-100 transition-opacity"
                                            style={{ left: `${progress}%`, transform: 'translateX(-50%)' }}
                                        />
                                    </div>

                                    {/* Controls Row */}
                                    <div className="flex items-center justify-between pb-6 md:pb-0">
                                        <div className="flex items-center gap-8 md:gap-12">
                                            <button onClick={togglePlay} className="text-white hover:text-[#ffb700] transition-transform active:scale-75 p-2">
                                                {isPlaying ? <Pause size={48} /> : <Play size={48} fill="currentColor" />}
                                            </button>

                                            <div className="flex items-center gap-6">
                                                <button onClick={toggleMute} className="text-white/60 hover:text-[#ffb700] transition-colors p-2">
                                                    {isMuted ? <VolumeX size={28} /> : <Volume2 size={28} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="hidden md:flex items-center gap-4">
                                            <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl">
                                                <span className="text-[10px] text-white/60 font-black uppercase tracking-widest flex items-center gap-3">
                                                    <Activity size={12} className="text-[#ffb700]" /> TRANSMISIÓN ENCRIPTADA
                                                </span>
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

            {/* Swipe Indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                className="absolute bottom-8 md:bottom-12 flex flex-col items-center gap-3 pointer-events-none z-50 px-8 text-center"
            >
                <div className="w-12 h-1.5 bg-white/20 rounded-full mb-2" />
                <p className="text-[9px] md:text-[11px] text-white font-black uppercase tracking-[0.5em] leading-relaxed">Desliza para finalizar briefing</p>
            </motion.div>
        </motion.div>
    );
};

export default TacticalMediaPlayer;
