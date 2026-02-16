import React, { useState, useEffect } from 'react';
import { Shield, ChevronUp, Award, BookOpen, CheckCircle, Lock, Clock, Star, Trophy, ArrowRight } from 'lucide-react';
import { UserRole } from '../types';
import { RANK_CONFIG, PROMOTION_RULES } from '../constants';
import { fetchPromotionStatus, promoteAgentAction } from '../services/sheetsService';

interface PromotionModuleProps {
    agentId: string;
    agentName: string;
    userRole: UserRole;
    onActivity?: () => void;
}

const RANK_ORDER = ['RECLUTA', 'ACTIVO', 'CONSAGRADO', 'REFERENTE', 'LÍDER'];
const RANK_ICONS: Record<string, string> = { 'RECLUTA': '🔰', 'ACTIVO': '⚔️', 'CONSAGRADO': '🛡️', 'REFERENTE': '⭐', 'LÍDER': '👑' };
const RANK_COLORS: Record<string, string> = { 'RECLUTA': '#6b7280', 'ACTIVO': '#3b82f6', 'CONSAGRADO': '#f59e0b', 'REFERENTE': '#8b5cf6', 'LÍDER': '#ef4444' };

const PromotionModule: React.FC<PromotionModuleProps> = ({ agentId, agentName, userRole, onActivity }) => {
    const [loading, setLoading] = useState(true);
    const [promoData, setPromoData] = useState<any>(null);
    const [promoting, setPromoting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetchPromotionStatus(agentId);
            if (res.success) setPromoData(res);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { loadData(); }, [agentId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ffb700]"></div>
            </div>
        );
    }

    if (!promoData) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                <p>No se pudo cargar el estado de promoción.</p>
            </div>
        );
    }

    const currentRank = promoData.rank || 'RECLUTA';
    const rule = PROMOTION_RULES[currentRank];
    const isMaxRank = !rule;

    const xp = promoData.xp || 0;
    const certs = promoData.certificates || 0;
    const tasksCompleted = promoData.tasksCompleted || 0;
    const history = promoData.promotionHistory || [];

    const xpProgress = rule ? Math.min((xp / rule.requiredXp) * 100, 100) : 100;
    const certProgress = rule ? Math.min((certs / rule.requiredCertificates) * 100, 100) : 100;
    const xpMet = rule ? xp >= rule.requiredXp : true;
    const certMet = rule ? certs >= rule.requiredCertificates : true;
    // Exam is manually created by Director in Academy — we count it as a special certificate
    const allMet = xpMet && certMet && !isMaxRank;

    const handlePromote = async () => {
        if (!rule || !allMet) return;
        setPromoting(true);
        try {
            const res = await promoteAgentAction({
                agentId,
                agentName: promoData.agentName || agentName,
                newRank: rule.nextRank,
                xp,
                certificates: certs
            });
            if (res.success) {
                setShowSuccess(true);
                setTimeout(() => { setShowSuccess(false); loadData(); }, 3000);
            }
        } catch (e) { console.error(e); }
        setPromoting(false);
        onActivity?.();
    };

    const currentRankIdx = RANK_ORDER.indexOf(currentRank);

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto animate-in fade-in">
            {/* Header */}
            <div className="text-center space-y-2">
                <div className="text-4xl">{RANK_ICONS[currentRank] || '🔰'}</div>
                <h1 className="font-bebas text-3xl md:text-4xl tracking-wider text-white">SISTEMA DE ASCENSO</h1>
                <p className="text-xs text-gray-400 uppercase tracking-widest">Rango Actual: <span className="font-black" style={{ color: RANK_COLORS[currentRank] }}>{currentRank}</span></p>
            </div>

            {/* Rank Progress Bar */}
            <div className="relative">
                <div className="flex items-center justify-between px-2">
                    {RANK_ORDER.map((rank, idx) => {
                        const isActive = idx <= currentRankIdx;
                        const isCurrent = idx === currentRankIdx;
                        return (
                            <div key={rank} className="flex flex-col items-center z-10 relative">
                                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-lg border-2 transition-all duration-500
                  ${isCurrent ? 'border-[#ffb700] bg-[#ffb700]/20 scale-110 shadow-[0_0_20px_rgba(255,183,0,0.3)]' :
                                        isActive ? 'border-green-500/50 bg-green-500/10' : 'border-white/10 bg-white/5'}`}>
                                    {RANK_ICONS[rank]}
                                </div>
                                <span className={`text-[8px] md:text-[10px] mt-1 font-bold uppercase tracking-wider ${isCurrent ? 'text-[#ffb700]' : isActive ? 'text-green-400' : 'text-gray-600'}`}>
                                    {rank}
                                </span>
                            </div>
                        );
                    })}
                </div>
                {/* Connecting line */}
                <div className="absolute top-5 md:top-6 left-6 right-6 h-0.5 bg-white/10">
                    <div className="h-full bg-gradient-to-r from-green-500 to-[#ffb700] transition-all duration-700"
                        style={{ width: `${(currentRankIdx / (RANK_ORDER.length - 1)) * 100}%` }}></div>
                </div>
            </div>

            {/* Success Animation */}
            {showSuccess && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in">
                    <div className="text-center space-y-4 animate-in zoom-in-50">
                        <div className="text-7xl animate-bounce">{RANK_ICONS[rule?.nextRank || ''] || '🎖️'}</div>
                        <h2 className="font-bebas text-4xl text-[#ffb700] tracking-wider">¡ASCENSO COMPLETADO!</h2>
                        <p className="text-white/70">Ahora eres <span className="font-black text-[#ffb700]">{rule?.nextRank}</span></p>
                    </div>
                </div>
            )}

            {isMaxRank ? (
                <div className="glass-card border border-[#ffb700]/30 rounded-2xl p-6 text-center space-y-3 bg-gradient-to-br from-[#ffb700]/5 to-transparent">
                    <div className="text-5xl">👑</div>
                    <h2 className="font-bebas text-2xl text-[#ffb700] tracking-wider">RANGO MÁXIMO ALCANZADO</h2>
                    <p className="text-sm text-gray-400">Has alcanzado el nivel más alto. ¡Felicidades, Líder!</p>
                </div>
            ) : (
                <>
                    {/* Requirements Title */}
                    <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-widest">
                        <Shield size={14} />
                        <span>Requisitos para ascender a <span className="text-[#ffb700] font-black">{rule?.nextRank}</span></span>
                    </div>

                    {/* 3 Requirement Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* XP Card */}
                        <div className={`glass-card border rounded-2xl p-5 space-y-3 transition-all ${xpMet ? 'border-green-500/30 bg-green-500/5' : 'border-white/10'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Star size={18} className={xpMet ? 'text-green-400' : 'text-gray-500'} />
                                    <span className="text-xs font-bold uppercase tracking-wider text-white/70">Experiencia</span>
                                </div>
                                {xpMet && <CheckCircle size={18} className="text-green-400" />}
                            </div>
                            <div className="text-2xl font-black text-white">{xp} <span className="text-sm text-gray-500">/ {rule?.requiredXp} XP</span></div>
                            <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-700 ${xpMet ? 'bg-green-500' : 'bg-gradient-to-r from-[#ffb700] to-orange-500'}`}
                                    style={{ width: `${xpProgress}%` }}></div>
                            </div>
                            {!xpMet && <p className="text-[10px] text-gray-500">Faltan {(rule?.requiredXp || 0) - xp} XP</p>}
                        </div>

                        {/* Certificates Card */}
                        <div className={`glass-card border rounded-2xl p-5 space-y-3 transition-all ${certMet ? 'border-green-500/30 bg-green-500/5' : 'border-white/10'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Award size={18} className={certMet ? 'text-green-400' : 'text-gray-500'} />
                                    <span className="text-xs font-bold uppercase tracking-wider text-white/70">Certificados</span>
                                </div>
                                {certMet && <CheckCircle size={18} className="text-green-400" />}
                            </div>
                            <div className="text-2xl font-black text-white">{certs} <span className="text-sm text-gray-500">/ {rule?.requiredCertificates}</span></div>
                            <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-700 ${certMet ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'}`}
                                    style={{ width: `${certProgress}%` }}></div>
                            </div>
                            {!certMet && <p className="text-[10px] text-gray-500">Faltan {(rule?.requiredCertificates || 0) - certs} certificados</p>}
                        </div>

                        {/* Tasks Card */}
                        <div className="glass-card border border-white/10 rounded-2xl p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <BookOpen size={18} className={tasksCompleted > 0 ? 'text-blue-400' : 'text-gray-500'} />
                                    <span className="text-xs font-bold uppercase tracking-wider text-white/70">Misiones</span>
                                </div>
                                {tasksCompleted > 0 && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold">{tasksCompleted}</span>}
                            </div>
                            <div className="text-2xl font-black text-white">{tasksCompleted} <span className="text-sm text-gray-500">completadas</span></div>
                            {promoData.tasksPending > 0 && (
                                <div className="flex items-center gap-1.5 text-[10px] text-amber-400">
                                    <Clock size={10} />
                                    <span>{promoData.tasksPending} pendientes de verificación</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Promote Button */}
                    <button
                        onClick={handlePromote}
                        disabled={!allMet || promoting}
                        className={`w-full py-4 rounded-2xl font-black uppercase text-sm tracking-widest transition-all flex items-center justify-center gap-3 
              ${allMet
                                ? 'bg-gradient-to-r from-[#ffb700] to-amber-500 text-[#001f3f] hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,183,0,0.3)] active:scale-95'
                                : 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5'
                            }`}
                    >
                        {promoting ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-current"></div>
                        ) : allMet ? (
                            <>
                                <ChevronUp size={20} />
                                SOLICITAR ASCENSO A {rule?.nextRank}
                                <ArrowRight size={16} />
                            </>
                        ) : (
                            <>
                                <Lock size={16} />
                                COMPLETA LOS REQUISITOS PARA ASCENDER
                            </>
                        )}
                    </button>
                </>
            )}

            {/* Promotion History */}
            {history.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                        <Trophy size={14} />
                        Historial de Ascensos
                    </h3>
                    <div className="space-y-2">
                        {history.map((h: any, i: number) => (
                            <div key={i} className="glass-card border border-white/5 rounded-xl p-3 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#ffb700]/10 flex items-center justify-center text-sm">
                                    {RANK_ICONS[h.to] || '🎖️'}
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-white">{h.from} → <span className="text-[#ffb700]">{h.to}</span></p>
                                    <p className="text-[10px] text-gray-500">{h.date} · {h.xp} XP · {h.certs} certificados</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PromotionModule;
