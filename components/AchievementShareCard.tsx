
import React, { useRef, useState, useEffect } from 'react';
import { Agent, NewsFeedItem } from '../types';
import { ShieldCheck, Award, Share2, Download, X, Flame, Star, Loader2, Target, Trophy, GraduationCap, Shield } from 'lucide-react';
import { toPng } from 'html-to-image';
import { formatDriveUrl } from './DigitalIdCard';

interface AchievementShareCardProps {
    agent?: Agent;
    newsItem?: NewsFeedItem;
    onClose: () => void;
}

const AchievementShareCard: React.FC<AchievementShareCardProps> = ({ agent, newsItem, onClose }) => {
    const exportRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0, scale: 0.3 });

    useEffect(() => {
        const updateScale = () => {
            const isMobile = window.innerWidth <= 768;
            const verticalPadding = isMobile ? 220 : 250; // Más espacio para controles
            const horizontalPadding = isMobile ? 30 : 100;
            const availableHeight = window.innerHeight - verticalPadding;
            const availableWidth = window.innerWidth - horizontalPadding;

            const scaleH = availableHeight / 1920;
            const scaleW = availableWidth / 1080;

            const maxScale = isMobile ? 0.95 : 0.45;
            const finalScale = Math.max(0.1, Math.min(scaleH, scaleW, maxScale));

            setContainerSize({
                width: 1080 * finalScale,
                height: 1920 * finalScale,
                scale: finalScale
            });
        };

        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    const getConfig = () => {
        const type = newsItem?.type || 'RACHA';
        switch (type) {
            case 'RACHA':
                return {
                    title: 'RACHA',
                    titleBottom: 'IMBATIBLE',
                    subtitle: 'DOMINIO CONTINUO',
                    icon: <Flame size={140} className="text-[#ffb700]" />,
                    accent: '#ffb700',
                    bgGradient: 'from-[#001f3f] via-[#000c1a] to-black'
                };
            case 'CURSO_COMPLETADO':
                return {
                    title: 'MISIÓN',
                    titleBottom: 'CUMPLIDA',
                    subtitle: 'CONOCIMIENTO TÁCTICO',
                    icon: <GraduationCap size={140} className="text-[#3b82f6]" />,
                    accent: '#3b82f6',
                    bgGradient: 'from-[#001f3f] via-[#051020] to-black'
                };
            case 'ASCENSO':
                return {
                    title: 'NUEVO',
                    titleBottom: 'RANGO',
                    subtitle: 'LIDERAZGO ELITE',
                    icon: <Shield size={140} className="text-[#f59e0b]" />,
                    accent: '#f59e0b',
                    bgGradient: 'from-[#001f3f] via-[#100a00] to-black'
                };
            default:
                return {
                    title: 'LOGRO',
                    titleBottom: 'ELITE',
                    subtitle: 'OPERACIÓN EXITOSA',
                    icon: <Trophy size={140} className="text-[#ffb700]" />,
                    accent: '#ffb700',
                    bgGradient: 'from-[#001f3f] via-[#000810] to-black'
                };
        }
    };

    const config = getConfig();
    const photoUrl = agent ? formatDriveUrl(agent.photoUrl) : '';
    const OFFICIAL_LOGO = "/logo_white.png";

    const getAgentNameFontSize = (name: string) => {
        const len = name.length;
        if (len <= 10) return '85px';
        if (len <= 15) return '70px';
        if (len <= 20) return '55px';
        if (len <= 25) return '45px';
        return '40px';
    };

    const agentName = agent?.name || 'RECLUTA PRO';
    const nameFontSize = getAgentNameFontSize(agentName);

    const handleShare = async () => {
        if (!exportRef.current) return;
        setIsGenerating(true);
        try {
            const dataUrl = await toPng(exportRef.current, {
                cacheBust: true,
                width: 1080,
                height: 1920,
                pixelRatio: 3,
                backgroundColor: '#001f3f',
                style: {
                    transform: 'none',
                    transformOrigin: 'top left',
                    width: '1080px',
                    height: '1920px',
                    borderRadius: '0'
                }
            });

            const res = await fetch(dataUrl);
            const blob = await res.blob();
            const file = new File([blob], 'logro-consagrados-hd.png', { type: 'image/png' });

            if (navigator.share && navigator.canShare?.({ files: [file] })) {
                await navigator.share({
                    title: 'Consagrados 2026',
                    text: newsItem?.message || '¡Nivel superado!',
                    files: [file],
                });
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'logro-consagrados-pro.png';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        } catch (err) {
            console.error('Error sharing achievement:', err);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black/98 flex flex-col items-center justify-center animate-in fade-in backdrop-blur-3xl overflow-hidden p-4">

            {/* Header Controls (Fixed top layout) */}
            <div className="w-full max-w-4xl flex justify-between items-center px-2 mb-4 shrink-0 relative z-[10000]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#ffb700]/10 flex items-center justify-center border border-[#ffb700]/30 shadow-[0_0_20px_rgba(255,183,0,0.2)]">
                        <Award className="text-[#ffb700]" size={20} />
                    </div>
                    <div className="hidden xs:block">
                        <span className="text-white font-black uppercase tracking-[0.4em] text-[10px] md:text-[14px] font-bebas block leading-none">Command Center</span>
                        <span className="text-[#ffb700] font-black uppercase tracking-[0.2em] text-[6px] md:text-[8px] font-montserrat block mt-1">Soberanía Táctica 2026</span>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleShare}
                        disabled={isGenerating}
                        className="flex items-center gap-2 md:gap-3 px-6 md:px-10 py-3 md:py-4 bg-[#ffb700] text-[#001f3f] font-black uppercase text-[10px] md:text-[12px] tracking-widest rounded-xl md:rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_20px_40px_rgba(255,183,0,0.3)] font-bebas disabled:opacity-50"
                    >
                        {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
                        <span>{navigator.share ? 'COMPARTIR' : 'DESCARGAR'}</span>
                    </button>
                    <button
                        onClick={onClose}
                        className="p-3 md:p-4 bg-white/5 text-white/50 hover:text-white hover:bg-white/10 rounded-xl md:rounded-2xl transition-all border border-white/10"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Content Centered Space */}
            <div className="flex-1 flex items-center justify-center w-full min-h-0">
                {/* Template Container */}
                <div
                    className="relative shadow-[0_80px_250px_rgba(0,0,0,1)] rounded-[50px] overflow-hidden bg-black shrink-0"
                    style={{
                        width: `${containerSize.width}px`,
                        height: `${containerSize.height}px`
                    }}
                >
                    <div
                        ref={exportRef}
                        className={`w-[1080px] h-[1920px] bg-gradient-to-b ${config.bgGradient} relative overflow-hidden flex flex-col items-center origin-top-left shadow-none`}
                        style={{ transform: `scale(${containerSize.scale})` }}
                    >
                        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '120px 120px' }} />
                        <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-[#ffb700]/10 to-transparent" />
                        <div className="absolute inset-0 pointer-events-none z-10 opacity-[0.08]" style={{ background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, .25) 50%), linear-gradient(90deg, rgba(255, 0, 0, .06), rgba(0, 255, 0, .02), rgba(0, 0, 255, .06))', backgroundSize: '100% 2px, 3px 100%' }} />

                        <div className="relative z-20 w-full h-full flex flex-col items-center px-[100px] pt-[80px] pb-[120px]">

                            {/* 1. Logo & Branding */}
                            <div className="w-full flex items-center gap-10 mb-8 shrink-0">
                                <img
                                    src={OFFICIAL_LOGO}
                                    className="w-20 h-20 object-contain"
                                    alt="Logo"
                                />
                                <div className="h-20 w-[3px] bg-gradient-to-b from-transparent via-[#ffb700]/30 to-transparent" />
                                <div className="text-left">
                                    <span className="text-[44px] font-black text-white uppercase tracking-[0.5em] font-bebas leading-none block">Consagrados</span>
                                    <span className="text-[22px] font-black text-[#ffb700] uppercase tracking-[0.6em] font-montserrat block mt-1">Command Center</span>
                                </div>
                            </div>

                            {/* 2. Impact Headlines */}
                            <div className="text-center w-full mt-4 shrink-0">
                                <p className="text-[30px] text-[#ffb700] font-black uppercase tracking-[1em] mb-6 font-montserrat animate-pulse">RESULTADO TÁCTICO</p>
                                <div className="flex flex-col items-center justify-center space-y-2">
                                    <h1 className="text-[150px] font-black text-white uppercase leading-[0.7] tracking-tighter italic font-bebas">
                                        {config.title}
                                    </h1>
                                    <h1 className="text-[120px] font-black text-[#ffb700] uppercase leading-[0.7] tracking-widest font-bebas">
                                        {config.titleBottom}
                                    </h1>
                                </div>
                            </div>

                            {/* 3. Central Medallion */}
                            <div className="relative flex items-center justify-center my-6 shrink-0">
                                <div className="relative w-[380px] h-[380px] bg-black/60 backdrop-blur-3xl border border-white/10 rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-[#ffb700]/20 to-transparent opacity-40" />
                                    <div className="transform scale-[1.05] drop-shadow-[0_0_40px_rgba(255,183,0,0.3)]">
                                        {config.icon}
                                    </div>
                                </div>
                            </div>

                            {/* 4. News Message */}
                            <div className="mt-2 w-full shrink-0">
                                <div className="bg-black/40 backdrop-blur-3xl border border-white/10 p-10 rounded-[40px] relative overflow-hidden">
                                    <div className="absolute left-0 top-0 bottom-0 w-3 bg-[#ffb700]" />
                                    <div className="relative z-10">
                                        <p className="text-[38px] font-black text-white uppercase leading-[1.3] tracking-tight whitespace-pre-wrap">
                                            "{newsItem?.message || 'LOGRO OPERATIVO RECONOCIDO POR SUPERIORIDAD'}"
                                        </p>
                                        <div className="flex items-center gap-6 mt-6">
                                            <ShieldCheck size={32} className="text-[#ffb700]" />
                                            <span className="text-[22px] text-white/30 font-black uppercase tracking-[0.5em] font-montserrat">Protocolo Activo 2026</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 5. ELITE AGENT PROFILE (The real focus - shifted up) */}
                            <div className="mt-auto w-full flex items-center gap-10 bg-white/[0.04] backdrop-blur-3xl p-10 rounded-[50px] border border-white/10 shadow-3xl mb-12 shrink-0 transform -translate-y-10">
                                <div className="relative shrink-0">
                                    <div className="absolute inset-[-12px] border-[4px] border-[#ffb700]/25 rounded-[55px] rotate-3 animate-pulse" />
                                    {photoUrl ? (
                                        <img
                                            src={photoUrl}
                                            crossOrigin="anonymous"
                                            className="w-[250px] h-[250px] rounded-[45px] object-cover border-4 border-white shadow-2xl relative z-10"
                                            alt="Agent"
                                        />
                                    ) : (
                                        <div className="w-[250px] h-[250px] rounded-[45px] bg-[#001f3f] border-4 border-white flex items-center justify-center relative z-10">
                                            <Star size={100} className="text-[#ffb700]" />
                                        </div>
                                    )}
                                </div>

                                <div className="text-left flex-1 min-w-0 pr-4">
                                    <p className="text-[26px] text-[#ffb700] font-black uppercase tracking-[0.4em] mb-4">IDENTIFICACIÓN AGENTE</p>
                                    <h2
                                        className="font-black text-white uppercase font-bebas tracking-widest leading-none mb-10 italic"
                                        style={{ fontSize: nameFontSize }}
                                    >
                                        {agentName}
                                    </h2>

                                    <div className="flex flex-wrap gap-5 items-center">
                                        <div className="inline-flex items-center gap-4 bg-[#ffb700] px-10 py-4 rounded-[30px] shadow-[0_15px_30px_rgba(255,183,0,0.3)]">
                                            <Shield size={26} className="text-[#001f3f]" />
                                            <span className="text-[26px] text-[#001f3f] font-black uppercase tracking-[0.2em] font-bebas leading-none">
                                                {agent?.rank || 'OPERATIVO'}
                                            </span>
                                        </div>

                                        <div className="inline-flex items-center gap-4 bg-white/10 px-10 py-4 rounded-[30px] border border-white/20 backdrop-blur-sm min-w-[200px] justify-center">
                                            <Trophy size={24} className="text-[#ffb700]" />
                                            <p className="text-[26px] text-white font-black uppercase tracking-[0.1em] font-bebas leading-none">
                                                XP: {agent?.xp || '000'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                        <div className="absolute bottom-16 inset-x-0 h-4 bg-gradient-to-r from-transparent via-[#ffb700]/40 to-transparent animate-pulse" />
                        <div className="absolute bottom-8 text-center w-full">
                            <p className="text-[18px] text-white/5 font-black uppercase tracking-[2.2em] font-montserrat">NO PEDIMOS PERMISO PARA SER LUZ</p>
                        </div>
                    </div>
                </div>
            </div>

            <p className="mt-4 text-white/10 text-[8px] font-black uppercase tracking-[1em] text-center shrink-0">Consagrados Command Center • Elite Perfection 2026</p>
        </div>
    );
};

export default AchievementShareCard;
