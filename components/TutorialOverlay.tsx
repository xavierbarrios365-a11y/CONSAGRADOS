import React, { useState, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Check, X, Info, Zap, Target, BookOpen, Trophy } from 'lucide-react';

interface TutorialStep {
    targetId: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const TUTORIAL_STEPS: TutorialStep[] = [
    {
        targetId: 'tutorial-stories',
        title: 'HISTORIAS TÁCTICAS',
        description: 'Mantente al día con lo que comparten otros agentes. ¡Dale like para subir la moral!',
        icon: <Zap className="text-amber-400" />,
        position: 'bottom'
    },
    {
        targetId: 'tutorial-daily-verse',
        title: 'CONSAGRACIÓN DIARIA',
        description: 'Tu racha de lectura bíblica es tu escudo. No dejes que se apague.',
        icon: <BookOpen className="text-blue-400" />,
        position: 'bottom'
    },
    {
        targetId: 'intel-feed-container',
        title: 'INTEL FEED',
        description: 'Aquí verás los logros, ascensos y misiones completadas por todo el escuadrón.',
        icon: <Info className="text-emerald-400" />,
        position: 'top'
    },
    {
        targetId: 'btn-combatir',
        title: 'ARENA DE COMBATE',
        description: 'Afila tus conocimientos bíblicos aquí. Gana XP y demuestra tu rango.',
        icon: <Target className="text-red-500" />,
        position: 'top'
    },
    {
        targetId: 'btn-ranking',
        title: 'CUADRO DE HONOR',
        description: 'El ranking de los mejores. ¿Lograrás llegar a la cima este mes?',
        icon: <Trophy className="text-amber-500" />,
        position: 'top'
    },
    {
        targetId: 'nav-notifications',
        title: 'CENTRO DE ALERTAS',
        description: 'Tus misiones y avisos importantes llegarán aquí directamente.',
        icon: <Zap className="text-blue-400" />,
        position: 'bottom'
    }
];

interface TutorialOverlayProps {
    onComplete: () => void;
}

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [spotlight, setSpotlight] = useState({ top: 0, left: 0, width: 0, height: 0, opacity: 0 });

    const updateSpotlight = () => {
        const step = TUTORIAL_STEPS[currentStep];
        const element = document.getElementById(step.targetId);

        if (element) {
            const rect = element.getBoundingClientRect();
            // Scroll element into view if needed
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Re-calculate after potential scroll
            setTimeout(() => {
                const refreshedRect = element.getBoundingClientRect();
                setSpotlight({
                    top: refreshedRect.top,
                    left: refreshedRect.left,
                    width: refreshedRect.width,
                    height: refreshedRect.height,
                    opacity: 1
                });
            }, 300);
        } else {
            // If element not found (e.g. view not loaded), show in center
            setSpotlight({
                top: window.innerHeight / 2 - 50,
                left: window.innerWidth / 2 - 50,
                width: 100,
                height: 100,
                opacity: 0
            });
        }
    };

    useLayoutEffect(() => {
        updateSpotlight();
        window.addEventListener('resize', updateSpotlight);
        return () => window.removeEventListener('resize', updateSpotlight);
    }, [currentStep]);

    const handleNext = () => {
        if (currentStep < TUTORIAL_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleFinish();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleFinish = () => {
        localStorage.setItem('tutorial_completed', 'true');
        onComplete();
    };

    const step = TUTORIAL_STEPS[currentStep];
    const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;

    return (
        <div className="fixed inset-0 z-[200] overflow-hidden pointer-events-none">
            {/* Dark Overlay with Spotlight Hole */}
            <motion.div
                className="absolute inset-0 bg-black/80 backdrop-blur-[2px] pointer-events-auto"
                style={{
                    clipPath: spotlight.opacity
                        ? `polygon(0% 0%, 0% 100%, ${spotlight.left}px 100%, ${spotlight.left}px ${spotlight.top}px, ${spotlight.left + spotlight.width}px ${spotlight.top}px, ${spotlight.left + spotlight.width}px ${spotlight.top + spotlight.height}px, ${spotlight.left}px ${spotlight.top + spotlight.height}px, ${spotlight.left}px 100%, 100% 100%, 100% 0%)`
                        : 'none'
                }}
            />

            {/* Spotlight Border Glower */}
            <AnimatePresence>
                {spotlight.opacity && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute border-2 border-[#ffb700] rounded-2xl shadow-[0_0_30px_rgba(255,183,0,0.5)] z-10 pointer-events-none"
                        style={{
                            top: spotlight.top - 8,
                            left: spotlight.left - 8,
                            width: spotlight.width + 16,
                            height: spotlight.height + 16
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Tutorial Card */}
            <div className="absolute inset-0 flex items-center justify-center p-6">
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="w-full max-w-sm bg-[#001f3f]/95 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-2xl p-8 space-y-6 pointer-events-auto relative overflow-hidden"
                >
                    {/* Background Glow */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#ffb700]/10 blur-[60px] rounded-full" />

                    {/* Progress Bar */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                        <motion.div
                            className="h-full bg-[#ffb700]"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                        />
                    </div>

                    <div className="flex flex-col items-center text-center space-y-4 pt-2">
                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-lg mb-2">
                            {step.icon}
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-2xl font-bebas text-white tracking-widest uppercase">{step.title}</h3>
                            <p className="text-[10px] text-[#ffb700] font-black uppercase tracking-[0.3em]">Módulo {currentStep + 1} de {TUTORIAL_STEPS.length}</p>
                        </div>
                        <p className="text-xs text-white/70 leading-relaxed font-montserrat">
                            {step.description}
                        </p>
                    </div>

                    <div className="flex items-center gap-3 pt-4">
                        {currentStep > 0 && (
                            <button
                                onClick={handlePrev}
                                className="p-4 bg-white/5 text-white/60 rounded-2xl border border-white/10 hover:bg-white/10 transition-all active:scale-95"
                            >
                                <ChevronLeft size={20} />
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            className="flex-1 py-4 bg-[#ffb700] text-[#001f3f] font-black uppercase tracking-widest rounded-2xl shadow-[0_10px_20px_rgba(255,183,0,0.2)] hover:bg-[#ffb700]/90 transition-all active:scale-95 flex items-center justify-center gap-2 font-bebas"
                        >
                            {currentStep === TUTORIAL_STEPS.length - 1 ? (
                                <>Comenzar Misión <Check size={18} /></>
                            ) : (
                                <>Siguiente <ChevronRight size={18} /></>
                            )}
                        </button>
                    </div>

                    <button
                        onClick={handleFinish}
                        className="absolute top-4 right-4 p-2 text-white/20 hover:text-white transition-colors"
                    >
                        <X size={16} />
                    </button>
                </motion.div>
            </div>

            {/* Scanline Decoration */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,2px_100%] transition-opacity duration-1000" />
        </div>
    );
};

export default TutorialOverlay;
