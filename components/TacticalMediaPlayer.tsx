import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, X, Loader2 } from 'lucide-react';

interface TacticalMediaPlayerProps {
    url: string;
    onClose: () => void;
    title?: string;
    type?: 'video' | 'image';
}

const TacticalMediaPlayer: React.FC<TacticalMediaPlayerProps> = ({ url, onClose, type = 'video' }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [showControls, setShowControls] = useState(true);
    const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Gestos de cierre impecables [v2-touch]
    const y = useMotionValue(0);
    const opacity = useTransform(y, [0, 300], [1, 0]);
    const scale = useTransform(y, [0, 300], [1, 0.85]);
    const backdropOpacity = useTransform(y, [0, 300], [0.95, 0]);

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
            setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
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

    const resetControlsTimeout = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, 2500);
    };

    useEffect(() => {
        resetControlsTimeout();
        return () => {
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        };
    }, [isPlaying]);

    const handleDragEnd = (_: any, info: any) => {
        if (info.offset.y > 100 || info.velocity.y > 500) {
            onClose();
        }
    };

    const playerContent = (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden touch-none"
            style={{ backgroundColor: `rgba(0, 0, 0, 0.95)` }}
        >
            {/* Fondo dinámico con desenfoque suave (bokeh) */}
            <motion.div
                style={{ opacity: backdropOpacity }}
                className="absolute inset-0 bg-black/40 backdrop-blur-[60px]"
            />

            {/* Botón Cerrar Ultra-Limpio */}
            <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="absolute top-6 right-6 z-[100] p-2 bg-white/10 hover:bg-white/20 rounded-full text-white/80 transition-all active:scale-90"
            >
                <X size={24} strokeWidth={1.5} />
            </button>

            {/* Contenedor de Media con Gestos Físicos */}
            <motion.div
                style={{ y, opacity, scale }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                onDragEnd={handleDragEnd}
                className="relative w-full max-w-5xl aspect-auto max-h-[85vh] flex items-center justify-center z-10"
                onClick={resetControlsTimeout}
            >
                {type === 'video' ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <video
                            ref={videoRef}
                            src={url}
                            autoPlay
                            playsInline
                            className="w-full h-full max-h-[85vh] object-contain shadow-2xl"
                            onTimeUpdate={handleProgress}
                            onWaiting={() => setIsLoading(true)}
                            onPlaying={() => setIsLoading(false)}
                            onEnded={() => setIsPlaying(false)}
                            onClick={togglePlay}
                        />

                        {/* Loading State Minimalista */}
                        <AnimatePresence>
                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 flex items-center justify-center z-20"
                                >
                                    <Loader2 size={32} className="text-white/40 animate-spin" />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Overlay de Pausa (Visual Feedback) */}
                        <AnimatePresence>
                            {!isPlaying && !isLoading && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.2 }}
                                    className="absolute pointer-events-none"
                                >
                                    <div className="p-6 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                                        <Play size={40} className="text-white fill-white" />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Controles Estilo Threads (Flotantes y Limpios) */}
                        <AnimatePresence>
                            {showControls && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    className="absolute bottom-0 inset-x-0 p-6 md:p-10 flex flex-col gap-6 z-30"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* Barra de Progreso (Sleek) */}
                                    <div className="relative w-full h-8 flex items-center cursor-pointer" onClick={handleSeek}>
                                        <div className="h-[3px] w-full bg-white/20 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-white"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Botones de Función */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-6">
                                            <button onClick={togglePlay} className="text-white transition-transform active:scale-75">
                                                {isPlaying ? <Pause size={28} /> : <Play size={28} fill="white" />}
                                            </button>
                                            <button onClick={toggleMute} className="text-white/80 transition-transform active:scale-75">
                                                {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                                            </button>
                                        </div>

                                        {/* Timestamp Minimalista */}
                                        <div className="text-[10px] text-white/60 font-medium tracking-widest uppercase">
                                            Frecuencia Consagrados • En Línea
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ) : (
                    <img
                        src={url}
                        className="w-full h-full max-h-[85vh] object-contain shadow-2xl"
                        alt="Media content"
                        draggable={false}
                    />
                )}
            </motion.div>

            {/* Indicador de Gesto (Sutil) */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 opacity-20 pointer-events-none">
                <div className="w-8 h-1 bg-white rounded-full" />
                <span className="text-[8px] text-white font-bold uppercase tracking-[0.4em]">Cerrar</span>
            </div>
        </motion.div>
    );

    return createPortal(playerContent, document.body);
};

export default TacticalMediaPlayer;
