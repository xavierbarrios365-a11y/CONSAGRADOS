import React, { useState, useEffect } from 'react';
import { Shield, Star, Award, ChevronRight, Loader2 } from 'lucide-react';
import { PROMOTION_RULES } from '../constants';
import { fetchPromotionStatus } from '../services/sheetsService';

interface PromotionProgressCardProps {
    agentId: string;
    currentRank: string;
    onClick: () => void;
}

const PromotionProgressCard: React.FC<PromotionProgressCardProps> = ({ agentId, currentRank, onClick }) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{ xp: number; certificates: number } | null>(null);

    useEffect(() => {
        const loadPromoData = async () => {
            try {
                const res = await fetchPromotionStatus(agentId);
                if (res.success) {
                    setData({
                        xp: res.xp || 0,
                        certificates: res.certificates || 0
                    });
                }
            } catch (e) {
                console.error("Error loading promo data for card:", e);
            } finally {
                setLoading(false);
            }
        };
        loadPromoData();
    }, [agentId]);

    let rule = PROMOTION_RULES[currentRank];
    let isMaxRank = false;

    if (!rule) {
        // Si no hay siguiente rango, buscamos la regla que llevó al rango actual para mostrar el hito
        const lastRuleKey = Object.keys(PROMOTION_RULES).find(key => PROMOTION_RULES[key].nextRank === currentRank);
        if (lastRuleKey) {
            rule = PROMOTION_RULES[lastRuleKey];
            isMaxRank = true;
        } else {
            return null;
        }
    }

    const xp = data?.xp || 0;
    const certs = data?.certificates || 0;

    const xpProgress = Math.min((xp / rule.requiredXp) * 100, 100);
    const certProgress = Math.min((certs / rule.requiredCertificates) * 100, 100);

    const missingXp = Math.max(0, rule.requiredXp - xp);
    const missingCerts = Math.max(0, rule.requiredCertificates - certs);

    const isMet = (missingXp === 0 && missingCerts === 0) || isMaxRank;

    return (
        <div
            onClick={onClick}
            className="relative group overflow-hidden rounded-3xl p-5 bg-white/5 border border-white/10 hover:border-[#ffb700]/40 transition-all duration-500 cursor-pointer active:scale-[0.98]"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-[#ffb700]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

            <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-[#ffb700]/10 text-[#ffb700]">
                            <Shield size={18} />
                        </div>
                        <div>
                            <p className="text-[8px] font-black text-[#ffb700] uppercase tracking-widest">{isMaxRank ? 'ESTADO ACTUAL' : 'OBJETIVO'}: {isMaxRank ? currentRank : rule.nextRank}</p>
                            <h3 className="text-sm font-bebas font-black text-white tracking-widest uppercase">{isMaxRank ? 'HITO DE ASCENSO' : 'PROGRESO DE ASCENSO'}</h3>
                        </div>
                    </div>
                    {loading ? (
                        <Loader2 size={16} className="animate-spin text-gray-500" />
                    ) : (
                        <ChevronRight size={18} className="text-white/20 group-hover:text-[#ffb700] transition-colors" />
                    )}
                </div>

                {!loading && (
                    <div className="space-y-3">
                        {/* Progress Bar Container */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-end">
                                <p className="text-[10px] text-white/70 font-bold">
                                    {isMet ? (
                                        <span className="text-green-400 font-black">¡REQUISITOS COMPLETOS!</span>
                                    ) : (
                                        <>Faltan <span className="text-[#ffb700]">{missingXp} XP</span> / <span className="text-[#ffb700]">{missingCerts} Certificados</span></>
                                    )}
                                </p>
                                <p className="text-[9px] text-white/40 font-black">{Math.round((xpProgress + certProgress) / 2)}%</p>
                            </div>
                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10 p-[1px]">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${isMet ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-gradient-to-r from-[#ffb700] to-orange-500 shadow-[0_0_10px_rgba(255,183,0,0.3)]'}`}
                                    style={{ width: `${(xpProgress + certProgress) / 2}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
                                <Star size={12} className={xp >= rule.requiredXp ? 'text-green-400' : 'text-[#ffb700]'} />
                                <span className="text-[9px] font-bold text-white/60">{xp}/{rule.requiredXp} XP</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
                                <Award size={12} className={certs >= rule.requiredCertificates ? 'text-green-400' : 'text-blue-400'} />
                                <span className="text-[9px] font-bold text-white/60">{certs}/{rule.requiredCertificates} Certs</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PromotionProgressCard;
