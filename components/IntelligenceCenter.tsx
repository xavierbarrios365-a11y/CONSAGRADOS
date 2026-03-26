import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Agent, UserRole, AppView, DailyVerse as DailyVerseType } from '../types';
import DailyVerse from './DailyVerse';
import { Search, Users, Activity, Target, Zap, TrendingUp, AlertCircle, ChevronRight, ChevronLeft, MoreVertical, X, Filter, Download, UserPlus, Shield, UserCheck, UserX, Award, Star, Mail, Phone, Calendar, Clock, MapPin, RefreshCw, Plus, Minus, Send, Camera, ArrowUpCircle, AlertTriangle, Gavel, Sparkles, Loader2, MessageSquare, BookOpen, Fingerprint, FileText, Settings, RotateCcw, ChevronUp, Cpu, Brain, Bell, Trash2, Radio, Trophy, CheckCircle2 } from 'lucide-react';
import { supabase } from '../services/supabaseService';
import { formatDriveUrl } from '../services/storageUtils';
import TacticalRadar from './TacticalRadar';
import { compressImage } from '../services/storageUtils';
import { fetchAcademyDataSupabase } from '../services/supabaseService';
import { updateAgentPointsSupabase, deductPercentagePointsSupabase, applyAbsencePenaltiesSupabase, promoteAgentActionSupabase as promoteAgentAction, createEventSupabase as createEvent, fetchActiveEventsSupabase as fetchActiveEvents, deleteEventSupabase as deleteEvent, reconcileXPSupabase, updateAgentAiProfileSupabase, updateAgentTacticalStatsSupabase, getPromotionStatusSupabase, assignAgentToBibleWarGroup, fetchTaskRecruitsSupabase, fetchAllBannersSupabase, createBannerSupabase, toggleBannerStatusSupabase, deleteBannerSupabase, updateAgentPhotoSupabase, updateAgentAiPendingStatusSupabase, getStreakMultiplier } from '../services/supabaseService';
import { uploadToCloudinary } from '../services/cloudinaryService';
import { sendTelegramAlert, sendPushBroadcast } from '../services/notifyService';
import TacticalRanking from './TacticalRanking';
import { generateTacticalProfile, getSpiritualCounseling, generateCommunityIntelReport } from '../services/geminiService';
import { toPng } from 'html-to-image';
import { useTacticalAlert } from './TacticalAlert';
import { RANK_CONFIG, PROMOTION_RULES } from '../constants';
import GeminiCommandCenter from './GeminiCommandCenter';

interface CIUProps {
  agents: Agent[];
  currentUser: Agent | null;
  onUpdateNeeded?: () => void | Promise<void>;

  intelReport?: string;
  setView?: (view: AppView) => void;
  visitorCount?: number;
  onRefreshIntel?: () => void | Promise<void>;

  isRefreshingIntel?: boolean;
  onAgentClick?: (agent: Agent) => void;
  userRole?: UserRole;
  onActivateNotifications?: () => void | Promise<void>;

}

const IntelligenceCenter: React.FC<CIUProps> = ({ agents, currentUser, onUpdateNeeded, intelReport, setView, visitorCount, onRefreshIntel, isRefreshingIntel, onAgentClick, userRole, onActivateNotifications }) => {
  const { showAlert } = useTacticalAlert();
  const [selectedAgentId, setSelectedAgentId] = useState<string>(currentUser?.id || agents[0]?.id || '');
  const [isReconstructing, setIsReconstructing] = useState(false);
  const [isUpdatingPoints, setIsUpdatingPoints] = useState(false);
  const [isReconcilingXP, setIsReconcilingXP] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isGeneratingGlobalReport, setIsGeneratingGlobalReport] = useState(false);
  const [globalReport, setGlobalReport] = useState<string | null>(null);
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [broadcastData, setBroadcastData] = useState({ title: '', message: '' });
  const [photoStatus, setPhotoStatus] = useState<'IDLE' | 'UPLOADING' | 'SAVING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [promoData, setPromoData] = useState<{ xp: number; certificates: number } | null>(null);
  const [isLoadingPromo, setIsLoadingPromo] = useState(false);
  const [onlineAgencies, setOnlineAgencies] = useState<Record<string, boolean>>({});
  const [activeEvents, setActiveEvents] = useState<any[]>([]);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '', description: '' });
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(5);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [showPsychoEdit, setShowPsychoEdit] = useState(false);
  const [tempPsychoStats, setTempPsychoStats] = useState({
    liderazgo: 0,
    servicio: 0,
    analisis: 0,
    potencial: 0,
    adaptabilidad: 0
  });

  const [banners, setBanners] = useState<any[]>([]);
  const [isCreatingBanner, setIsCreatingBanner] = useState(false);
  const [newBanner, setNewBanner] = useState({ titulo: '', subtitulo: '', imagen_url: '', cta_label: '', cta_link: '', tipo: 'EVENTO' });
  const [showBannerManager, setShowBannerManager] = useState(false);

  React.useEffect(() => {
    const currentAgent = agents.find(a => String(a.id).trim() === String(selectedAgentId).trim()) || agents[0];
    if (currentAgent?.tacticalStats) {
      setTempPsychoStats({
        liderazgo: currentAgent.tacticalStats.liderazgo || 0,
        servicio: currentAgent.tacticalStats.servicio || 0,
        analisis: currentAgent.tacticalStats.analisis || 0,
        potencial: currentAgent.tacticalStats.potencial || 0,
        adaptabilidad: currentAgent.tacticalStats.adaptabilidad || 0
      });
    } else {
      setTempPsychoStats({ liderazgo: 0, servicio: 0, analisis: 0, potencial: 0, adaptabilidad: 0 });
    }
  }, [selectedAgentId, showPsychoEdit, agents]);

  React.useEffect(() => {
    if (!currentUser) return;

    const channel = supabase.channel('global-presence', {
      config: { presence: { key: currentUser.id } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlineMap: Record<string, boolean> = {};
        Object.keys(state).forEach(id => { onlineMap[id] = true; });
        setOnlineAgencies(onlineMap);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            online_at: new Date().toISOString(),
            user_id: currentUser.id,
            name: currentUser.name
          });
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [currentUser]);

  const handleSavePsychoStats = async () => {
    setIsUpdatingPoints(true);
    try {
      const res = await updateAgentTacticalStatsSupabase(selectedAgentId, tempPsychoStats);
      if (res.success) {
        showAlert({ title: "PERFIL ACTUALIZADO", message: "Estadísticas psicométricas guardadas.", type: 'SUCCESS' });
        setShowPsychoEdit(false);
        if (onUpdateNeeded) await onUpdateNeeded();
      } else {
        showAlert({ title: "ERROR TÁCTICO", message: "Error al actualizar estadísticas.", type: 'ERROR' });
      }
    } catch (e) {
      console.error(e);
      showAlert({ title: "ERROR TÁCTICO", message: "Fallo de conexión.", type: 'ERROR' });
    } finally {
      setIsUpdatingPoints(false);
    }
  };

  React.useEffect(() => {
    const loadPromoData = async () => {
      if (!selectedAgentId) return;
      setIsLoadingPromo(true);
      try {
        const res = await getPromotionStatusSupabase(selectedAgentId);
        if (res.success) {
          setPromoData({
            xp: res.xp || 0,
            certificates: res.certificates || 0
          });
        }
      } catch (e) {
        console.error("Error loading promo data for intelligence center:", e);
      } finally {
        setIsLoadingPromo(false);
      }
    };
    loadPromoData();
  }, [selectedAgentId]);

  React.useEffect(() => {
    const channel = supabase.channel('global-presence');

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const presenceMap: Record<string, boolean> = {};
        Object.keys(state).forEach(key => {
          presenceMap[key] = true;
        });
        setOnlineAgencies(presenceMap);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlineAgencies(prev => ({ ...prev, [key]: true }));
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineAgencies(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  React.useEffect(() => {
    if (userRole === UserRole.DIRECTOR) {
      loadEvents();
      loadBanners();
    }
  }, [userRole]);

  const loadBanners = async () => {
    const data = await fetchAllBannersSupabase();
    setBanners(data);
  };

  const loadEvents = async () => {
    try {
      const events = await fetchActiveEvents();
      setActiveEvents(events);
    } catch (e) {
      console.error("Error loading events:", e);
    }
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.date) return;
    setIsCreatingEvent(true);
    try {
      const res = await createEvent(newEvent);
      if (res.success) {
        showAlert({ title: "ÉXITO", message: "✅ EVENTO CREADO EXITOSAMENTE", type: 'SUCCESS' });
        setNewEvent({ title: '', date: '', time: '', description: '' });
        loadEvents();
      } else {
        showAlert({ title: "ERROR DE SERVIDOR", message: "❌ " + (res.error || "Fallo desconocido al crear evento."), type: 'ERROR' });
      }
    } catch (e) {
      showAlert({ title: "ERROR", message: "❌ FALLO AL CREAR EVENTO", type: 'ERROR' });
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    showAlert({
      title: "ELIMINAR EVENTO",
      message: "¿Seguro que deseas eliminar este evento?",
      type: 'CONFIRM',
      onConfirm: async () => {
        try {
          const res = await deleteEvent(id);
          if (res.success) {
            loadEvents();
          } else {
            showAlert({ title: "ERROR DE SERVIDOR", message: "❌ " + (res.error || "Fallo desconocido al eliminar evento."), type: 'ERROR' });
          }
        } catch (e) {
          showAlert({ title: "ERROR", message: "❌ FALLO AL ELIMINAR", type: 'ERROR' });
        }
      }
    });
  };

  const handleCreateBanner = async () => {
    if (!newBanner.titulo) return;
    setIsCreatingBanner(true);
    try {
      const res = await createBannerSupabase(newBanner);
      if (res.success) {
        showAlert({ title: "ÉXITO", message: "✅ BANNER PUBLICADO EN LA WEB", type: 'SUCCESS' });
        setNewBanner({ titulo: '', subtitulo: '', imagen_url: '', cta_label: '', cta_link: '', tipo: 'EVENTO' });
        loadBanners();
      } else {
        showAlert({ title: "ERROR", message: "❌ FALLO AL PUBLICAR BANNER", type: 'ERROR' });
      }
    } catch (e) {
      showAlert({ title: "ERROR", message: "❌ FALLO TÁCTICO", type: 'ERROR' });
    } finally {
      setIsCreatingBanner(false);
    }
  };

  const handleToggleBanner = async (id: string, active: boolean) => {
    const res = await toggleBannerStatusSupabase(id, active);
    if (res.success) loadBanners();
  };

  const handleDeleteBanner = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar este banner de la web?")) return;
    const res = await deleteBannerSupabase(id);
    if (res.success) loadBanners();
  };

  const agent = agents.find(a => String(a.id).trim() === String(selectedAgentId).trim()) || agents[0];

  const totalAgents = agents.length;
  const totalLeaders = agents.filter(a => a.userRole === UserRole.LEADER || a.userRole === UserRole.DIRECTOR).length;

  const getLevelInfo = (xp: number) => {
    const ranks = Object.entries(RANK_CONFIG).sort((a, b) => a[1].minXp - b[1].minXp);
    let currentRank = 'RECLUTA';
    let nextRank = 'ACTIVO';
    let targetXp = 300;

    // Encontrar el rango actual
    const rankEntry = [...ranks].reverse().find(([_, config]) => xp >= config.minXp);
    if (rankEntry) {
      currentRank = rankEntry[0];
      const index = ranks.findIndex(r => r[0] === currentRank);
      if (ranks[index + 1]) {
        nextRank = ranks[index + 1][0];
        targetXp = ranks[index + 1][1].minXp;
      } else {
        nextRank = 'MAX';
        targetXp = rankEntry[1].minXp;
      }
    }

    return { current: currentRank, next: nextRank, target: targetXp };
  };

  const getPromotionStatus = (a: Agent): 'APTO' | 'PROXIMAMENTE' | 'NONE' => {
    const rule = PROMOTION_RULES[(a.rank || 'RECLUTA').toUpperCase()];
    if (!rule) return 'NONE';
    if (a.xp >= rule.requiredXp) return 'APTO';
    if (a.xp >= rule.requiredXp * 0.9) return 'PROXIMAMENTE';
    return 'NONE';
  };

  const currentPromotionStatus = getPromotionStatus(agent);
  const isProspectoAscender = currentPromotionStatus === 'PROXIMAMENTE';
  const isAptoTotal = currentPromotionStatus === 'APTO';
  const levelInfo = getLevelInfo(agent.xp);

  const handleBroadcast = async () => {
    if (!broadcastData.title || !broadcastData.message) return;

    showAlert({
      title: "TRANSMISIÓN MASIVA",
      message: "⚠️ ¿TRANSMITIR COMUNICADO MASIVO?\n\nEsta notificación llegará a todos los agentes vía Push y Telegram.",
      type: 'CONFIRM',
      onConfirm: async () => {
        setIsSendingBroadcast(true);
        try {
          const success = await sendPushBroadcast(broadcastData.title, broadcastData.message);
          if (success) {
            showAlert({ title: "ÉXITO", message: "✅ TRANSMISIÓN COMPLETADA", type: 'SUCCESS' });
            setBroadcastData({ title: '', message: '' });
          } else {
            showAlert({ title: "ERROR", message: "❌ ERROR AL TRANSMITIR", type: 'ERROR' });
          }
        } catch (err) {
          showAlert({ title: "ERROR", message: "❌ FALLO DE CONEXIÓN", type: 'ERROR' });
        } finally {
          setIsSendingBroadcast(false);
        }
      }
    });
  };

  const handleGenerateAiProfile = async () => {
    if (!agent) return;
    setIsGeneratingAi(true);
    try {
      const { progress } = await fetchAcademyDataSupabase(agent.id);
      const aiProfile = await generateTacticalProfile(agent, progress);
      if (aiProfile) {
        const res = await updateAgentAiProfileSupabase(agent.id, aiProfile.stats, aiProfile.summary);
        if (res.success) {
          showAlert({ title: "SINCRONIZACIÓN", message: "✅ SINCRONIZACIÓN IA COMPLETADA", type: 'SUCCESS' });
          if (onUpdateNeeded) onUpdateNeeded();
        } else {
          showAlert({ title: "ERROR", message: "❌ ERROR AL GUARDAR PERFIL: " + res.error, type: 'ERROR' });
        }
      }
    } catch (err: any) {
      console.error("AI Error:", err);
      showAlert({ title: "ERROR DE IA", message: "❌ ERROR DE IA: " + (err.message || "Fallo en la conexión con el núcleo neuronal."), type: 'ERROR' });
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleGenerateGlobalReport = async () => {
    if (!agents || agents.length === 0) return;
    setIsGeneratingGlobalReport(true);
    try {
      const report = await generateCommunityIntelReport(agents);
      setGlobalReport(report);
    } catch (err: any) {
      console.error("Global AI Report Error:", err);
      showAlert({ title: "FALLO ESTRATÉGICO", message: "❌ FALLO EN LA CONSOLIDACIÓN ESTRATÉGICA.", type: 'ERROR' });
    } finally {
      setIsGeneratingGlobalReport(false);
    }
  };



  const handlePhotoUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !agent) return;

    setPhotoStatus('UPLOADING');
    try {
      const compressed = await compressImage(file);
      const uploadResult = await uploadToCloudinary(compressed);
      if (uploadResult.success && uploadResult.url) {
        setPhotoStatus('SAVING');
        const updateResult = await updateAgentPhotoSupabase(agent.id, uploadResult.url);
        if (updateResult.success) {
          setPhotoStatus('SUCCESS');
          if (onUpdateNeeded) onUpdateNeeded();
          setTimeout(() => setPhotoStatus('IDLE'), 2000);
        } else {
          throw new Error(updateResult.error || "Error al actualizar registro");
        }
      } else {
        throw new Error(uploadResult.error || "Error al subir imagen");
      }
    } catch (err: any) {
      showAlert({ title: "ERROR DE CARGA", message: `ERROR: ${err.message}`, type: 'ERROR' });
      setPhotoStatus('ERROR');
      setTimeout(() => setPhotoStatus('IDLE'), 3000);
    }
  };

  const handleUpdatePoints = async (type: 'BIBLIA' | 'APUNTES' | 'LIDERAZGO', points: number) => {
    if (!agent) return;
    const absPoints = Math.abs(points);

    const executeUpdate = async () => {
      setIsUpdatingPoints(true);
      try {
        const res = await updateAgentPointsSupabase(agent.id, type, points, 1.0, agent.streakCount || 0);
        if (res.success) {
          // NOTIFICACIÓN TELEGRAM (ONLY TELEGRAM)
          try {
            const currentMultiplier = getStreakMultiplier(agent.streakCount || 0);
            const totalXpAdjusted = Math.round(points * currentMultiplier);
            const emoji = points > 0 ? '🔥' : '⚖️';
            const action = points > 0 ? 'ganado' : 'perdido';
            const msg = `${emoji} [CONTROL TÁCTICO]: <b>${agent.name}</b> ha ${action} <b>${absPoints}</b> puntos en <b>${type}</b> (Total XP: <b>${totalXpAdjusted > 0 ? '+' : ''}${totalXpAdjusted}</b>).`;
            await sendTelegramAlert(msg);
          } catch (telErr) {
            console.error("Error notificando actualización de puntos a Telegram:", telErr);
          }

          showAlert({
            title: "PUNTOS ACTUALIZADOS",
            message: `✅ SE HAN ${points > 0 ? 'SUMADO' : 'RESTADO'} ${absPoints} PUNTOS A ${agent.name.toUpperCase()}.\n\nTipo: ${type}\nNuevo Total Aprox: ${agent.xp + Math.round(points * getStreakMultiplier(agent.streakCount || 0))} XP`,
            type: 'SUCCESS'
          });
          if (onUpdateNeeded) onUpdateNeeded();
        } else {
          showAlert({ title: "ERROR", message: "❌ ERROR: " + (res.error || "Fallo en protocolo de puntos."), type: 'ERROR' });
        }
      } catch (err: any) {
        showAlert({ title: "FALLO DE CONEXIÓN", message: "⚠️ FALLO TÁCTICO DE CONEXIÓN: " + (err.message || "Error desconocido."), type: 'ERROR' });
      } finally {
        setIsUpdatingPoints(false);
      }
    };

    if (points < 0) {
      showAlert({
        title: "SANCIÓN TÁCTICA",
        message: `🚨 ¿APLICAR SANCIÓN DE ${absPoints} PUNTOS A ${agent.name}?`,
        type: 'CONFIRM',
        onConfirm: executeUpdate
      });
    } else {
      executeUpdate();
    }
  };

  const handlePercentageDeduction = async (percentage: number) => {
    if (!agent) return;

    showAlert({
      title: "ALERTA DE SEGURIDAD",
      message: `🚨 ¡ALERTA DE SEGURIDAD! 🚨\n\n¿CONFIRMA LA EXPULSIÓN DE ${agent.name}?\nSe le descontará el ${percentage}% de TODOS sus puntos acumulados.`,
      type: 'CONFIRM',
      onConfirm: async () => {
        setIsUpdatingPoints(true);
        try {
          const res = await deductPercentagePointsSupabase(agent.id, percentage);
          if (res.success) {
            showAlert({ title: "EXPULSIÓN COMPLETADA", message: `☠️ EXPULSIÓN COMPLETADA: -${percentage}% Puntos.`, type: 'SUCCESS' });
            if (onUpdateNeeded) onUpdateNeeded();
          } else {
            showAlert({ title: "ERROR", message: "❌ ERROR: " + (res.error || "Fallo en protocolo de expulsión."), type: 'ERROR' });
          }
        } catch (err: any) {
          showAlert({ title: "FALLO DE CONEXIÓN", message: "⚠️ FALLO TÁCTICO DE CONEXIÓN: " + (err.message || "Error desconocido."), type: 'ERROR' });
        } finally {
          setIsUpdatingPoints(false);
        }
      }
    });
  };

  const handleReconcileXP = async () => {
    showAlert({
      title: "RECONCILIACIÓN XP",
      message: "🚨 ¿CONFIRMAR RECONSTRUCCIÓN DE PUNTOS?\n\nEsta acción buscará la asistencia de hoy y asignará +10 XP en cada categoría a los agentes que no los recibieron.",
      type: 'CONFIRM',
      onConfirm: async () => {
        setIsReconcilingXP(true);
        try {
          const res = await reconcileXPSupabase();
          if (res.success) {
            const names = res.updatedNames && res.updatedNames.length > 0 ? res.updatedNames.join(', ') : 'Ninguno';
            const ids = res.foundIds?.length || 0;
            showAlert({
              title: "CONCILIACIÓN EXITOSA",
              message: `✅ CONCILIACIÓN COMPLETADA\n🔍 IDs encontrados: ${ids}\n✅ Agentes actualizados: ${res.count}\n📋 Nombres: ${names}`,
              type: 'SUCCESS'
            });
            if (onUpdateNeeded) await onUpdateNeeded();
            if (onUpdateNeeded) onUpdateNeeded();
          } else {
            showAlert({ title: "FALLO DE CONCILIACIÓN", message: "❌ FALLO: " + (res.error || "Error desconocido."), type: 'ERROR' });
          }
        } catch (err: any) {
          showAlert({ title: "ERROR", message: "⚠️ FALLO TÁCTICO DE CONEXIÓN: " + err.message, type: 'ERROR' });
        } finally {
          setIsReconcilingXP(false);
        }
      }
    });
  };

  const handleTestNotification = async () => {
    if (!currentUser) return;
    setIsSendingBroadcast(true);
    try {
      const success = await sendPushBroadcast("PRUEBA DE SISTEMA", `Hola ${currentUser.name}, esta es una transmisión de prueba para verificar tu canal de notificaciones.`);
      if (success) {
        showAlert({ title: "PRUEBA ENVIADA", message: "✅ PRUEBA ENVIADA. Verifica tu bandeja de notificaciones.", type: 'SUCCESS' });
      }
    } catch (err) {
      showAlert({ title: "ERROR", message: "❌ FALLO EN EL TEST", type: 'ERROR' });
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  return (
    <div className="min-h-full bg-[#000810] p-4 md:p-6 animate-in fade-in duration-700 relative overflow-hidden">
      {/* Overlay de Scanlines específico para la Terminal */}
      <div className="absolute inset-0 pointer-events-none z-50 opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,4px_100%]"></div>

      <style>{`
        @keyframes glitch-tactic {
          0% { transform: translate(0); text-shadow: none; }
          20% { transform: translate(-2px, 2px); text-shadow: 2px 0 #ffb700, -2px 0 #00e5ff; }
          40% { transform: translate(-2px, -2px); text-shadow: -2px 0 #ffb700, 2px 0 #00e5ff; }
          60% { transform: translate(2px, 2px); text-shadow: 2px 0 #ffb700, -2px 0 #00e5ff; }
          80% { transform: translate(2px, -2px); text-shadow: -2px 0 #ffb700, 2px 0 #00e5ff; }
          100% { transform: translate(0); text-shadow: none; }
        }
        .glitch-hover:hover {
          animation: glitch-tactic 0.3s infinite;
        }
        .scanline-terminal {
          width: 100%;
          height: 2px;
          background: rgba(255, 183, 0, 0.1);
          position: absolute;
          top: 0;
          left: 0;
          z-index: 40;
          animation: scanline-move 8s linear infinite;
        }
        @keyframes scanline-move {
          0% { top: 0; }
          100% { top: 100%; }
        }
      `}</style>

      <div className="scanline-terminal"></div>

      <div className="max-w-7xl mx-auto space-y-6 relative z-10">

        {/* PANEL DE CONTROL DE ALTO MANDO */}
        {userRole === UserRole.DIRECTOR && (
          <div className="bg-[#ffb700]/5 border border-[#ffb700]/20 rounded-3xl p-5 mb-6 backdrop-blur-md space-y-5">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#ffb700] rounded-2xl shadow-lg">
                  <Target className="text-[#001f3f]" size={24} />
                </div>
                <div>
                  <h3 className="text-white font-black text-sm uppercase tracking-widest leading-none mb-1 font-bebas">Command Center: Alto Mando</h3>
                  <p className="text-[9px] text-[#ffb700]/80 font-bold uppercase tracking-[0.2em] font-montserrat">Protocolo de Notificaciones y Sincronización</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                {setView && (
                  <button
                    onClick={() => setView(AppView.ADMIN)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-purple-500/10 text-purple-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-purple-500/20 transition-all border border-purple-500/20 active:scale-95 font-bebas shadow-xl"
                  >
                    <Settings size={16} />
                    Panel ADMIN
                  </button>
                )}
              </div>
            </div>


            {/* AVISO TÁCTICO (BROADCAST) */}
            <div className="bg-black/20 rounded-2xl p-4 border border-white/5 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Radio size={14} className="text-[#ffb700] animate-pulse" />
                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest font-bebas">Nueva Transmisión Masiva</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-3">
                  <input
                    type="text"
                    placeholder="TÍTULO..."
                    value={broadcastData.title}
                    onChange={(e) => setBroadcastData({ ...broadcastData, title: e.target.value.toUpperCase() })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white focus:outline-none focus:border-[#ffb700]/50 font-bebas"
                  />
                </div>
                <div className="md:col-span-6">
                  <input
                    type="text"
                    placeholder="MENSAJE TÁCTICO..."
                    value={broadcastData.message}
                    onChange={(e) => setBroadcastData({ ...broadcastData, message: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white focus:outline-none focus:border-[#ffb700]/50 font-montserrat"
                  />
                </div>
                <div className="md:col-span-3">
                  <button
                    onClick={handleBroadcast}
                    disabled={isSendingBroadcast || !broadcastData.title || !broadcastData.message}
                    className="w-full h-full flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-indigo-500 transition-all disabled:opacity-50 font-bebas"
                  >
                    {isSendingBroadcast ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Transmitir
                  </button>
                </div>
              </div>
            </div>

            {/* EVENT MANAGER */}
            <div className="bg-indigo-900/10 rounded-2xl p-4 border border-indigo-500/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star size={14} className="text-yellow-400" />
                  <span className="text-[10px] font-black text-white/60 uppercase tracking-widest font-bebas">Gestor de Eventos Tácticos</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="NOMBRE DEL EVENTO..."
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value.toUpperCase() })}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white focus:outline-none focus:border-yellow-500/50 font-bebas"
                />
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white focus:outline-none focus:border-yellow-500/50"
                />
                <input
                  type="time"
                  value={newEvent.time}
                  onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white focus:outline-none focus:border-yellow-500/50"
                />
                <button
                  onClick={handleCreateEvent}
                  disabled={isCreatingEvent || !newEvent.title || !newEvent.date}
                  className="flex items-center justify-center gap-2 px-6 py-2 bg-yellow-600 text-[#001f3f] text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-yellow-500 transition-all disabled:opacity-50 font-bebas"
                >
                  {isCreatingEvent ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Crear Evento
                </button>
              </div>

              {activeEvents.length > 0 && (
                <div className="mt-4 space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {activeEvents.map((evt) => (
                    <div key={evt.id} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-white uppercase font-bebas">{evt.titulo}</span>
                        <span className="text-[8px] text-white/40 font-bold uppercase">{evt.fecha} @ {evt.hora || 'S/H'}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteEvent(evt.id)}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}


        {/* Global Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-[#001833] border border-white/5 p-4 rounded-3xl text-center shadow-lg">
            <p className="text-[7px] text-white/40 font-black uppercase mb-1 tracking-[0.2em] font-bebas">AGENTES OPERATIVOS</p>
            <p className="text-2xl font-bebas font-black text-white leading-none">{totalAgents}</p>
          </div>
          <div className="bg-[#001833] border border-white/5 p-4 rounded-3xl text-center shadow-lg border-b-[#ffb700]/30">
            <p className="text-[7px] text-white/40 font-black uppercase mb-1 tracking-[0.2em] font-bebas">PERSONAL DE MANDO</p>
            <p className="text-2xl font-bebas font-black text-[#ffb700] leading-none">{totalLeaders}</p>
          </div>
          <div className="bg-[#001833] border border-white/5 p-4 rounded-3xl text-center shadow-lg cursor-pointer hover:border-blue-400/30 transition-all group" onClick={() => setView?.(AppView.VISITOR as any)}>
            <p className="text-[7px] text-white/40 font-black uppercase mb-1 tracking-[0.2em] font-bebas group-hover:text-blue-400 transition-colors">INTELIGENCIA EXTERNA</p>
            <p className="text-2xl font-bebas font-black text-blue-400 leading-none">{visitorCount || 0}</p>
            <div className="mt-3 flex flex-col gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setView?.(AppView.VISITOR as any); }}
                className="flex items-center justify-center gap-1 w-full px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-[7px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all active:scale-95"
              >
                <Plus size={10} /> Registro de Visita
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setView?.(AppView.SCANNER as any); }}
                className="flex items-center justify-center gap-1 w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white/60 text-[7px] font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
              >
                <Camera size={10} /> Activar Escáner
              </button>
            </div>
          </div>
          {/* RADAR DE DESERCIÓN - RESUMEN */}
          <div
            className="bg-[#001833] border border-red-500/20 p-4 rounded-3xl text-center shadow-lg cursor-pointer hover:border-red-500/40 transition-all group"
            onClick={() => setView?.(AppView.VISITOR as any)}
          >
            <p className="text-[7px] text-white/40 font-black uppercase mb-1 tracking-[0.2em] font-bebas group-hover:text-red-400 transition-colors">INTELIGENCIA DE DESERCIÓN</p>
            {(() => {
              const riskCount = agents.filter(a => {
                if (!a.lastAttendance || a.lastAttendance === 'N/A') return false;
                const parts = a.lastAttendance.split('/');
                const lastDate = parts.length === 3 ? new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])) : new Date(a.lastAttendance);
                if (isNaN(lastDate.getTime())) return false;
                const diffDays = Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
                return diffDays >= 14;
              }).length;
              return (
                <div className="flex flex-col items-center">
                  <p className={`text-2xl font-bebas font-black leading-none ${riskCount > 0 ? 'text-red-500 animate-pulse' : 'text-gray-600'}`}>
                    {riskCount}
                  </p>
                  <p className="text-[6px] text-white/20 font-bold uppercase mt-1">En Riesgo</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onRefreshIntel) onRefreshIntel();
                    }}
                    className="mt-3 flex items-center justify-center gap-1 w-full px-3 py-2 bg-indigo-600 border border-indigo-400 rounded-xl text-white text-[7px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-900/40"
                  >
                    <RefreshCw size={10} className={isRefreshingIntel ? 'animate-spin' : ''} /> Escanear Inasistencias
                  </button>
                  {userRole === UserRole.DIRECTOR && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleReconcileXP(); }}
                      disabled={isReconcilingXP}
                      className="mt-2 flex items-center justify-center gap-1 w-full px-3 py-2 bg-orange-600/20 border border-orange-500/40 rounded-xl text-orange-400 text-[6px] font-black uppercase tracking-widest hover:bg-orange-600/30 transition-all active:scale-95"
                    >
                      <Zap size={10} className={isReconcilingXP ? 'animate-pulse' : ''} /> {isReconcilingXP ? 'CONCILIANDO...' : 'Recuperar Puntos Hoy'}
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* RADAR DE APTOS PARA ASCENSO - Solo Directores */}
        {userRole === UserRole.DIRECTOR && (() => {
          const aptosAgents = agents.filter(a => {
            if (a.userRole === UserRole.LEADER || a.userRole === UserRole.DIRECTOR) return false;
            return getPromotionStatus(a) === 'APTO';
          });

          const proximosAgents = agents.filter(a => {
            if (a.userRole === UserRole.LEADER || a.userRole === UserRole.DIRECTOR) return false;
            return getPromotionStatus(a) === 'PROXIMAMENTE';
          });

          if (aptosAgents.length === 0 && proximosAgents.length === 0) return null;

          return (
            <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-3xl p-4 mb-3 backdrop-blur-md space-y-3 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                    <ArrowUpCircle className="text-emerald-400" size={20} />
                  </div>
                  <div>
                    <h3 className="text-white font-black text-sm uppercase tracking-widest leading-none mb-1 font-bebas">Radar de Ascenso</h3>
                    <p className="text-[9px] text-emerald-400/80 font-bold uppercase tracking-[0.2em] font-montserrat">
                      {aptosAgents.length} APTOS // {proximosAgents.length} PRÓXIMAMENTE
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-500 text-[#001f3f] font-black text-lg px-3 py-1 rounded-xl font-bebas">{aptosAgents.length}</span>
                  {proximosAgents.length > 0 && <span className="bg-blue-600 text-white font-black text-xs px-2 py-1 rounded-lg font-bebas">{proximosAgents.length}</span>}
                </div>
              </div>

              <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {/* APTOS */}
                {aptosAgents.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[7px] text-emerald-500/60 font-black uppercase tracking-[0.3em] mb-1">Listos para Acción</p>
                    {aptosAgents.map(a => {
                      const rule = PROMOTION_RULES[(a.rank || 'RECLUTA').toUpperCase()];
                      return (
                        <div
                          key={a.id}
                          className="flex items-center justify-between bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/20 hover:border-emerald-500/40 transition-all group cursor-pointer"
                          onClick={() => {
                            setSelectedAgentId(a.id);
                            window.scrollTo({ top: 600, behavior: 'smooth' });
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={formatDriveUrl(a.photoUrl)}
                              className="w-10 h-10 rounded-xl object-cover border border-white/10 grayscale group-hover:grayscale-0 transition-all"
                              onError={(e) => {
                                const target = e.currentTarget as HTMLImageElement;
                                if (!target.src.includes('ui-avatars.com')) {
                                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(a.name || 'Agente')}&background=1A1A1A&color=FFB700&size=200&bold=true`;
                                }
                              }}
                            />
                            <div>
                              <p className="text-[11px] font-black text-white uppercase tracking-wider font-bebas">{a.name}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] font-bold text-white/40 uppercase">{a.rank || 'RECLUTA'}</span>
                                <ChevronRight size={8} className="text-emerald-400" />
                                <span className="text-[8px] font-bold text-emerald-400 uppercase">{rule?.nextRank}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-[10px] font-black text-[#ffb700] font-bebas">{a.xp} XP</p>
                              <p className="text-[7px] text-white/30 font-bold uppercase">Meta: {rule?.requiredXp}</p>
                            </div>
                            <div className="bg-emerald-500/20 border border-emerald-500/30 p-2 rounded-lg">
                              <ArrowUpCircle size={14} className="text-emerald-400" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* PROXIMAMENTE */}
                {proximosAgents.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[7px] text-blue-500/60 font-black uppercase tracking-[0.3em] mb-1">Próximos al Punto Crítico</p>
                    {proximosAgents.map(a => {
                      const rule = PROMOTION_RULES[(a.rank || 'RECLUTA').toUpperCase()];
                      return (
                        <div
                          key={a.id}
                          className="flex items-center justify-between bg-blue-600/5 p-3 rounded-xl border border-blue-500/10 hover:border-blue-500/30 transition-all group cursor-pointer"
                          onClick={() => {
                            setSelectedAgentId(a.id);
                            window.scrollTo({ top: 600, behavior: 'smooth' });
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={formatDriveUrl(a.photoUrl)}
                              className="w-10 h-10 rounded-xl object-cover border border-white/10 grayscale group-hover:grayscale-0 transition-all opacity-60"
                              onError={(e) => {
                                const target = e.currentTarget as HTMLImageElement;
                                if (!target.src.includes('ui-avatars.com')) {
                                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(a.name || 'Agente')}&background=1A1A1A&color=FFB700&size=200&bold=true`;
                                }
                              }}
                            />
                            <div>
                              <p className="text-[11px] font-black text-white/80 uppercase tracking-wider font-bebas">{a.name}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] font-bold text-white/30 uppercase">{a.rank || 'RECLUTA'}</span>
                                <ChevronRight size={8} className="text-blue-400/50" />
                                <span className="text-[8px] font-bold text-blue-400/50 uppercase">{rule?.nextRank}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-[10px] font-black text-blue-400 font-bebas">{a.xp} XP</p>
                              <p className="text-[7px] text-white/20 font-bold uppercase">Faltan: {rule ? rule.requiredXp - a.xp : 0}</p>
                            </div>
                            <div className="bg-blue-600/10 border border-blue-500/20 p-2 rounded-lg">
                              <Target size={14} className="text-blue-400" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <p className="text-[8px] text-emerald-400/40 font-bold uppercase tracking-widest text-center mt-2">
                ⚠ Estos agentes cumplen los requisitos de XP. Verificar certificados y programar examen de ascenso.
              </p>
            </div>
          );
        })()}

        {/* Header Táctico */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/10 pb-4 gap-3 font-montserrat">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bebas font-bold text-white tracking-widest flex items-center gap-3 glitch-hover cursor-default">
              <div className="p-2 bg-[#ffb700]/10 border border-[#ffb700]/30 rounded-lg shadow-[0_0_15px_rgba(255,183,0,0.2)]">
                <Target className="text-[#ffb700]" size={24} />
              </div>
              NODO DE <span className="text-[#ffb700]">INTELIGENCIA</span>
            </h1>
            <p className="text-[9px] text-[#ffb700]/70 font-black uppercase tracking-[0.4em] opacity-70 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
              Live Tactical Feed // Consagrados 2026
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-end gap-2 w-full md:w-auto">
            <div className="w-full md:w-64">
              <p className="text-[7px] text-gray-600 font-black uppercase tracking-widest mb-1 ml-2">Seleccionar Agente</p>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full bg-[#ffb700]/5 border border-[#ffb700]/20 rounded-xl px-4 py-3 text-white font-black text-[10px] focus:border-[#ffb700] outline-none cursor-pointer hover:bg-[#ffb700]/10 appearance-none font-bebas"
              >
                {agents.map(a => (
                  <option key={a.id} value={a.id} className="bg-[#001f3f] text-white font-bebas">
                    {onlineAgencies[a.id] ? '🟢 ' : ''}{a.name} [{a.id}]
                  </option>
                ))}
              </select>
            </div>

            {userRole === UserRole.DIRECTOR && (
              <button
                onClick={async () => {
                  showAlert({
                    title: "TRANSMISIÓN DE SEGURIDAD",
                    message: "⚠️ ¿Deseas enviar las credenciales actuales de este agente al Telegram táctico?",
                    type: 'CONFIRM',
                    onConfirm: async () => {
                      const loginUrl = window.location.origin;
                      const msg = `🔐 <b>CREDENCIALES TÁCTICAS</b>\n\nAgente: <b>${agent.name}</b>\n\n<b>• URL:</b> ${loginUrl}\n<b>• ID:</b> <code>${agent.id}</code>\n<b>• PIN:</b> <code>${agent.pin}</code>\n\n<i>Entrega esta información al agente para restablecer su acceso al TACTOR.</i>`;
                      const success = await sendTelegramAlert(msg);
                      if (success) showAlert({ title: "ÉXITO", message: "✅ CREDENCIALES ENVIADAS A TELEGRAM", type: 'SUCCESS' });
                      else showAlert({ title: "ERROR", message: "❌ FALLO AL CONECTAR CON TELEGRAM", type: 'ERROR' });
                    }
                  });
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-xl border border-blue-400/30 transition-all flex items-center gap-2 group shadow-lg shadow-blue-900/20"
                title="Enviar Credenciales a Telegram"
              >
                <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                <span className="text-[9px] font-black uppercase tracking-widest md:hidden lg:inline">Enviar Creds</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* PERFIL DEL AGENTE SELECCIONADO */}
          <div className="lg:col-span-4 space-y-6">
            <div className="relative bg-[#001833] border border-white/10 rounded-3xl p-6 flex flex-col items-center text-center shadow-xl overflow-hidden font-montserrat">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#ffb700] to-transparent opacity-30"></div>

              <div className="relative mb-6 group">
                <div className="absolute inset-0 bg-[#ffb700] rounded-2xl blur-xl opacity-10"></div>
                {onlineAgencies[agent.id] && (
                  <div className="absolute -top-1 -right-1 z-20 flex items-center gap-1.5 bg-green-500 text-white text-[8px] font-black px-2 py-1 rounded-full animate-pulse shadow-lg shadow-green-900/50">
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    ONLINE
                  </div>
                )}
                <div className="w-32 h-32 rounded-2xl border-2 border-white/5 p-1 bg-[#000c19] shadow-inner relative overflow-hidden">
                  <img
                    src={formatDriveUrl(agent.photoUrl)}
                    className="w-full h-full rounded-xl object-cover grayscale hover:grayscale-0 transition-all duration-700"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      if (!target.src.includes('ui-avatars.com')) {
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name || 'Agente')}&background=1A1A1A&color=FFB700&size=200&bold=true`;
                        target.className = "w-full h-full object-cover opacity-80";
                      }
                    }}
                  />

                  {isProspectoAscender && (
                    <div className="absolute top-4 -right-4 bg-orange-500 text-white text-[8px] font-black py-1 px-4 rotate-45 shadow-lg border border-white/20 z-20 animate-pulse">
                      PROSPECTO ASCENDER
                    </div>
                  )}

                  {(userRole === UserRole.DIRECTOR || agent.id === currentUser?.id) && (
                    <>
                      <div
                        onClick={() => photoStatus === 'IDLE' && fileInputRef.current?.click()}
                        className={`absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer group`}
                      >
                        {photoStatus === 'IDLE' ? (
                          <>
                            <Camera className="text-[#ffb700] mb-2 group-hover:scale-110 transition-transform" size={32} />
                            <p className="text-[9px] text-white font-black uppercase tracking-widest">Cambiar Foto</p>
                          </>
                        ) : (
                          <div className="flex flex-col items-center">
                            <Loader2 className="text-[#ffb700] animate-spin mb-2" size={32} />
                            <p className="text-[9px] text-white font-black uppercase tracking-widest">
                              {photoStatus === 'UPLOADING' ? 'Subiendo...' : 'Guardando...'}
                            </p>
                          </div>
                        )}
                      </div>
                      {/* Mobile tap target — always visible */}
                      <button
                        onClick={() => photoStatus === 'IDLE' && fileInputRef.current?.click()}
                        className="absolute bottom-2 right-2 z-20 bg-[#ffb700] p-2 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-transform md:hidden"
                      >
                        <Camera size={16} className="text-black" />
                      </button>
                    </>
                  )}
                  <input type="file" ref={fileInputRef} onChange={handlePhotoUpdate} className="hidden" accept="image/*" />
                </div>
              </div>

              <div className="space-y-4 z-10 w-full">
                <h2 className="text-2xl font-bebas font-black text-white uppercase tracking-tight leading-none">{agent.name}</h2>
                <div className="flex flex-col items-center gap-2">
                  <div className="inline-flex items-center gap-3 bg-[#FFB700]/10 border border-[#FFB700]/30 px-6 py-2 rounded-xl">
                    <span className="text-[#FFB700] font-black text-[10px] uppercase tracking-[0.3em] font-bebas">{levelInfo?.current}</span>
                  </div>
                  {(() => {
                    const status = getPromotionStatus(agent);
                    if (status === 'APTO') return (
                      <div className="mt-2 bg-emerald-500 text-[#001f3f] font-black text-[10px] px-4 py-1.5 rounded-full animate-bounce shadow-lg shadow-emerald-900/40 font-bebas flex items-center gap-2">
                        <ArrowUpCircle size={12} />
                        APTO PARA ASCENSO
                      </div>
                    );
                    if (status === 'PROXIMAMENTE') return (
                      <div className="mt-2 bg-blue-600 text-white font-black text-[10px] px-4 py-1.5 rounded-full animate-pulse shadow-lg shadow-blue-900/40 font-bebas flex items-center gap-2 uppercase tracking-widest">
                        <Target size={12} />
                        Próximamente al Ascenso
                      </div>
                    );
                    return null;
                  })()}
                  {(() => {
                    const lastDate = agent.lastAttendance ? new Date(agent.lastAttendance) : null;
                    if (lastDate) {
                      const diffDays = Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
                      if (diffDays >= 21) {
                        return (
                          <div className="flex items-center gap-1.5 bg-red-600/20 border border-red-500/30 px-4 py-1.5 rounded-full mt-1 animate-pulse">
                            <AlertCircle size={10} className="text-red-500" />
                            <span className="text-red-500 font-black text-[7px] uppercase tracking-widest">PELIGRO DE DESERCIÓN</span>
                          </div>
                        );
                      }
                    }
                    return null;
                  })()}
                </div>

                <div className="bg-indigo-950/20 border border-indigo-500/10 rounded-2xl p-4 mt-2">
                  <p className="text-[7px] text-indigo-400 font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Sparkles size={10} /> Resumen Táctico de IA
                  </p>
                  <p className="text-[9px] text-slate-300 italic leading-relaxed">
                    {agent.tacticalSummary || '"Sin análisis táctico reciente. Solicite actualización."'}
                  </p>
                  {userRole === UserRole.DIRECTOR && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handleGenerateAiProfile}
                        disabled={isGeneratingAi}
                        className="flex-1 py-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-[8px] font-black uppercase tracking-[0.2em] rounded-lg hover:bg-indigo-600/40 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isGeneratingAi ? <Loader2 size={12} className="animate-spin mx-auto" /> : 'Sincronizar IA'}
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (window.confirm(`⚠️ ¿ACTIVAR RE-EVALUACIÓN ÉLITE PARA ${agent.name.toUpperCase()}?\n\nEl agente deberá completar el test táctico la próxima vez que inicie sesión, pero conservará su perfil actual hasta completar el nuevo.`)) {
                            const res = await updateAgentAiPendingStatusSupabase(agent.id, true);
                            if (res.success) {
                              showAlert({ title: "ÉXITO", message: "✅ RE-EVALUACIÓN ACTIVADA.", type: 'SUCCESS' });
                              if (onUpdateNeeded) onUpdateNeeded();
                            }
                          }
                        }}
                        className="flex-1 py-2 bg-amber-600/20 border border-amber-500/30 text-amber-300 text-[8px] font-black uppercase tracking-[0.2em] rounded-lg hover:bg-amber-600/40 transition-all active:scale-95"
                        title="Programar Re-evaluación"
                      >
                        <Brain size={12} className="mx-auto" />
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (window.confirm(`⚠️ ¿FORZAR RE-INICIO TOTAL DE PERFIL PARA ${agent.name.toUpperCase()}?\n\n¡ALERTA! Esto BORRARÁ el perfil actual de inmediato.`)) {
                            const res = await updateAgentAiProfileSupabase(agent.id, null, null);
                            if (res.success) {
                              alert("✅ PERFIL RESETEADO. TEST REQUERIDO DE INMEDIATO.");
                              if (onUpdateNeeded) onUpdateNeeded();
                            }
                          }
                        }}
                        className="p-2 bg-red-600/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-600/40 transition-all active:scale-95"
                        title="Borrar Perfil Actual"
                      >
                        <RotateCcw size={12} />
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (window.confirm(`⚠️ ¿OCULTAR PERFIL DE ${agent.name.toUpperCase()}?\n\nEste perfil ya no será visible en rankings ni en el directorio global para estudiantes.`)) {
                            try {
                              const { supabase } = await import('../services/supabaseService');
                              const { error } = await supabase.from('agentes').update({ status: 'OCULTO' }).eq('id', agent.id);
                              if (!error) {
                                alert("✅ PERFIL OCULTADO EXITOSAMENTE.");
                                if (onUpdateNeeded) onUpdateNeeded();
                              }
                            } catch (e) { }
                          }
                        }}
                        className="p-2 bg-zinc-600/20 border border-zinc-500/30 text-zinc-400 rounded-lg hover:bg-zinc-600/40 transition-all active:scale-95"
                        title="Ocultar Perfil (Test)"
                      >
                        Ocultar
                      </button>
                      <button
                        onClick={() => showAlert({ title: "ANÁLISIS VERIFICADO", message: "✅ Perfil verificado por el Director. Análisis fijado como 'Real'.", type: 'SUCCESS' })}
                        className="flex-1 py-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-[8px] font-black uppercase tracking-[0.2em] rounded-lg hover:bg-indigo-600/40 transition-all active:scale-95 flex items-center justify-center gap-2"
                        title="Verificar y Aprobar Análisis (Sin XP)"
                      >
                        <CheckCircle2 size={12} />
                        Aprobar Análisis
                      </button>
                    </div>
                  )}
                </div>

                {/* VISUALIZACIÓN DE PROGRESO DE ASCENSO - SOLICITADO POR DIRECTOR */}
                {(() => {
                  const currentRank = (agent.rank || 'RECLUTA').toUpperCase();
                  let rule = PROMOTION_RULES[currentRank];
                  let isMaxRank = !rule;
                  let targetRank = rule?.nextRank || 'MAX';

                  if (isMaxRank) {
                    const lastRuleKey = Object.keys(PROMOTION_RULES).find(key => PROMOTION_RULES[key].nextRank === agent.rank);
                    if (lastRuleKey) rule = PROMOTION_RULES[lastRuleKey];
                  }

                  if (!rule) return null;

                  const xp = promoData?.xp || agent.xp || 0;
                  const certs = promoData?.certificates || 0;
                  const xpMet = xp >= rule.requiredXp;
                  const certMet = certs >= rule.requiredCertificates;
                  const xpProgress = Math.min((xp / rule.requiredXp) * 100, 100);
                  const certProgress = Math.min((certs / rule.requiredCertificates) * 100, 100);
                  const totalProgress = Math.round((xpProgress + certProgress) / 2);

                  const handlePromoteAgent = async () => {
                    if (!xpMet || !certMet) return;
                    const confirmPromote = window.confirm(`⚠️ PROTOCOLO DE ASCENSO\n\n¿Deseas ascender oficialmente a ${agent.name} al rango de ${targetRank.toUpperCase()}?`);
                    if (confirmPromote) {
                      setIsLoadingPromo(true);
                      try {
                        const res = await promoteAgentAction(agent.id, targetRank);
                        if (res.success) {
                          alert(`✅ ASCENSO EXITOSO: ${agent.name} ahora es ${targetRank}`);
                          onUpdateNeeded?.();
                        } else {
                          alert(`❌ ERROR EN ASCENSO: ${res.error}`);
                        }
                      } catch (e) {
                        alert("❌ FALLO CRÍTICO EN PROTOCOLO");
                      } finally {
                        setIsLoadingPromo(false);
                      }
                    }
                  };

                  return (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mt-4 text-left space-y-4 shadow-inner relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-3 opacity-5">
                        <ArrowUpCircle size={40} className="text-[#ffb700]" />
                      </div>

                      <div className="flex items-center justify-between relative z-10">
                        <div>
                          <p className="text-[7px] text-[#ffb700] font-black uppercase tracking-[0.2em] mb-0.5">Estado de Ascenso</p>
                          <h4 className="text-[12px] font-bebas font-black text-white tracking-widest uppercase">
                            {isMaxRank ? 'HITO MÁXIMO ALCANZADO' : `OBJETIVO: ${targetRank}`}
                          </h4>
                        </div>
                        <div className="text-right">
                          <p className="text-[14px] font-bebas font-black text-white leading-none">{totalProgress}%</p>
                          <p className="text-[6px] text-white/30 font-bold uppercase">Consumado</p>
                        </div>
                      </div>

                      <div className="space-y-3 relative z-10">
                        {/* XP Progress */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[8px] font-bold uppercase">
                            <span className="text-white/50">Experiencia Táctica</span>
                            <span className={xpMet ? 'text-green-400' : 'text-[#ffb700]'}>
                              {xp} / {rule.requiredXp} XP
                              {xpMet && " ✓"}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                            <div
                              className={`h-full transition-all duration-1000 ${xpMet ? 'bg-green-500' : 'bg-gradient-to-r from-[#ffb700] to-orange-500'}`}
                              style={{ width: `${xpProgress}%` }}
                            />
                          </div>
                        </div>

                        {/* Certificates Progress */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[8px] font-bold uppercase">
                            <span className="text-white/50">Certificados Academia</span>
                            <span className={certMet ? 'text-green-400' : 'text-blue-400'}>
                              {certs} / {rule.requiredCertificates}
                              {certMet && " ✓"}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                            <div
                              className={`h-full transition-all duration-1000 ${certMet ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}
                              style={{ width: `${certProgress}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {!isMaxRank && xpMet && certMet && (
                        <div className="space-y-2">
                          <div className="bg-green-500/10 border border-green-500/20 p-2 rounded-lg flex items-center gap-2 animate-pulse mt-1">
                            <Trophy size={14} className="text-green-400" />
                            <p className="text-[8px] text-green-400 font-black uppercase tracking-widest">Apto para examen de ascenso</p>
                          </div>

                          {userRole === UserRole.DIRECTOR && (
                            <button
                              onClick={handlePromoteAgent}
                              disabled={isLoadingPromo}
                              className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-green-900/30 flex items-center justify-center gap-2 transition-all active:scale-95 border border-white/10"
                            >
                              {isLoadingPromo ? <Loader2 size={14} className="animate-spin" /> : <ChevronUp size={14} />}
                              Ejecutar Ascenso Táctico
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="mt-4 w-full grid grid-cols-2 gap-2">
                <div className="bg-[#3A3A3A]/20 p-3 rounded-2xl border border-white/5 text-left">
                  <p className="text-[6px] text-white/40 font-black uppercase mb-1">ID AGENTE</p>
                  <p className="text-[9px] font-mono text-[#FFB700] font-bold">{agent.id}</p>
                </div>
                <div className="bg-[#3A3A3A]/20 p-3 rounded-2xl border border-white/5 text-left">
                  <p className="text-[6px] text-white/40 font-black uppercase mb-1">ACCESO</p>
                  <p className="text-[9px] font-black text-blue-400 uppercase truncate font-bebas">
                    {agent.role || 'ESTUDIANTE'}
                  </p>
                </div>
              </div>

              {/* RADAR TÁCTICO IN-CENTER */}
              <div className="mt-4 p-4 bg-gradient-to-b from-white/5 to-transparent rounded-[2rem] border border-white/5 w-full flex flex-col items-center">
                <div className="w-full flex justify-between items-center mb-4 px-2">
                  <p className="text-[7px] text-[#ffb700] font-black uppercase tracking-[0.3em] font-bebas">Análisis Psicométrico Directivo</p>
                  {(currentUser?.userRole === UserRole.DIRECTOR || currentUser?.userRole === UserRole.LEADER) && (
                    <button
                      onClick={() => setShowPsychoEdit(!showPsychoEdit)}
                      className={`p-1.5 rounded-lg transition-colors ${showPsychoEdit ? 'bg-[#ffb700] text-[#001f3f]' : 'bg-white/10 text-[#ffb700] hover:bg-white/20'}`}
                    >
                      <Settings size={12} />
                    </button>
                  )}
                </div>

                {showPsychoEdit ? (
                  <div className="w-full space-y-3 bg-[#001f3f]/50 p-4 rounded-xl border border-[#ffb700]/30 shadow-inner">
                    {['liderazgo', 'servicio', 'analisis', 'potencial', 'adaptabilidad'].map((trait) => (
                      <div key={trait} className="flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/70">{trait}</span>
                          <span className="text-[10px] font-black text-[#ffb700]">{tempPsychoStats[trait as keyof typeof tempPsychoStats]} / 100</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setTempPsychoStats(prev => ({ ...prev, [trait]: Math.max(0, prev[trait as keyof typeof tempPsychoStats] - 5) }))}
                            className="p-1.5 bg-red-500/20 text-red-400 rounded-md hover:bg-red-500/30"
                          ><Minus size={12} /></button>
                          <input
                            type="range"
                            min="0" max="100" step="5"
                            value={tempPsychoStats[trait as keyof typeof tempPsychoStats]}
                            onChange={(e) => setTempPsychoStats(prev => ({ ...prev, [trait]: parseInt(e.target.value) }))}
                            className="flex-1 accent-[#ffb700]"
                          />
                          <button
                            onClick={() => setTempPsychoStats(prev => ({ ...prev, [trait]: Math.min(100, prev[trait as keyof typeof tempPsychoStats] + 5) }))}
                            className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-md hover:bg-emerald-500/30"
                          ><Plus size={12} /></button>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={handleSavePsychoStats}
                      disabled={isUpdatingPoints}
                      className="w-full mt-4 py-2 bg-[#ffb700] text-[#001f3f] font-black text-[10px] uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 font-bebas"
                    >
                      {isUpdatingPoints ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                      GUARDAR PERFIL
                    </button>
                  </div>
                ) : (
                  agent.tacticalStats ? (
                    <TacticalRadar stats={agent.tacticalStats} size={180} />
                  ) : (
                    <div className="py-10 text-center opacity-30">
                      <Sparkles size={32} className="mx-auto mb-2" />
                      <p className="text-[8px] font-black uppercase tracking-widest">Esperando Sincronización de IA o Ingreso Manual</p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          {/* ESTADÍSTICAS Y ACCIONES */}
          <div className="lg:col-span-8 space-y-4">
            {/* SELECTOR DE MONTO DE AJUSTE */}
            <div className="bg-[#001833] border border-[#ffb700]/20 rounded-2xl p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#ffb700]/10 rounded-lg">
                  <Star className="text-[#ffb700]" size={16} />
                </div>
                <div>
                  <p className="text-[8px] text-white/40 font-black uppercase tracking-widest font-bebas">Monto de Operación</p>
                  <p className="text-[10px] text-white font-bold uppercase font-montserrat">XP a Sumar/Restar</p>
                </div>
              </div>
              <div className="flex items-center bg-black/40 rounded-xl border border-white/10 p-1">
                <button
                  onClick={() => setAdjustmentAmount(Math.max(1, adjustmentAmount - 1))}
                  className="p-2 text-white/40 hover:text-white transition-colors"
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 bg-transparent text-center text-white font-black font-bebas text-lg outline-none"
                />
                <button
                  onClick={() => setAdjustmentAmount(adjustmentAmount + 1)}
                  className="p-2 text-white/40 hover:text-white transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <MetricCard
                icon={<Zap className="text-[#ffb700]" size={16} />}
                label="COMPROMISO"
                value={agent.bible}
                color="from-[#ffb700] to-orange-600"
                onAdjust={(val) => handleUpdatePoints('BIBLIA', val)}
                disabled={isUpdatingPoints}
                adjustmentAmount={adjustmentAmount}
              />
              <MetricCard
                icon={<Star className="text-blue-400" size={16} />}
                label="SERVICIO"
                value={agent.notes}
                color="from-blue-400 to-blue-600"
                onAdjust={(val) => handleUpdatePoints('APUNTES', val)}
                disabled={isUpdatingPoints}
                adjustmentAmount={adjustmentAmount}
              />
            </div>

            {/* PANEL DE SANCIONES */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-[2.5rem] p-6 relative overflow-hidden group shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <Gavel className="text-red-500" size={20} />
                </div>
                <div>
                  <h3 className="text-white font-black text-[10px] uppercase tracking-widest font-bebas">Protocolo Disciplinario</h3>
                  <p className="text-[7px] text-red-500/70 font-bold uppercase tracking-widest font-montserrat">Sanciones por Inconducta o Inasistencia</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SanctionOption
                  label="Protocolo"
                  sub="Falla técnica de conducta"
                  pts="-5"
                  onClick={() => handleUpdatePoints('LIDERAZGO', -5)}
                  disabled={isUpdatingPoints}
                />
                <SanctionOption
                  label="No Participó"
                  sub="Sin aportes en clase"
                  pts="-2"
                  onClick={() => handleUpdatePoints('LIDERAZGO', -2)}
                  disabled={isUpdatingPoints}
                />
                <SanctionOption
                  label="Indisciplina"
                  sub="Falta de respeto o orden"
                  pts="-5"
                  onClick={() => handleUpdatePoints('LIDERAZGO', -5)}
                  disabled={isUpdatingPoints}
                />
                <SanctionOption
                  label="Expulsión"
                  sub="Sanción Definitiva"
                  pts="-50%"
                  isCritical
                  onClick={() => handlePercentageDeduction(50)}
                  disabled={isUpdatingPoints}
                />
              </div>
            </div>


            {/* GESTIÓN DE BANNERS ESTRATÉGICOS */}
            {userRole === UserRole.DIRECTOR && (
              <div className="bg-[#ffb700]/5 border border-[#ffb700]/20 rounded-[2.5rem] p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-500/10 rounded-xl">
                      <Radio className="text-amber-500 animate-pulse" size={24} />
                    </div>
                    <div>
                      <h3 className="text-white font-black text-lg uppercase tracking-widest font-bebas">Banners de Web Pública</h3>
                      <p className="text-[8px] text-amber-500/60 font-black uppercase tracking-[0.3em] font-montserrat">Inyección de información en tiempo real</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowBannerManager(!showBannerManager)}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600/20 border border-amber-500/30 text-amber-500 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-600/30 transition-all font-bebas"
                  >
                    {showBannerManager ? 'Cerrar Gestor' : 'Nuevo Banner'}
                  </button>
                </div>

                {showBannerManager && (
                  <div className="bg-black/20 p-5 rounded-2xl border border-white/5 space-y-4 animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[7px] text-white/40 font-black uppercase ml-2">Título del Banner</label>
                        <input
                          type="text"
                          placeholder="EJ: NUEVA FRANELA CONSAGRADOS"
                          value={newBanner.titulo}
                          onChange={(e) => setNewBanner({ ...newBanner, titulo: e.target.value.toUpperCase() })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] text-white font-bold outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[7px] text-white/40 font-black uppercase ml-2">Subtítulo / Info</label>
                        <input
                          type="text"
                          placeholder="EJ: OBTÉN LA TUYA EN EL COMANDO"
                          value={newBanner.subtitulo}
                          onChange={(e) => setNewBanner({ ...newBanner, subtitulo: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] text-white outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[7px] text-white/40 font-black uppercase ml-2">URL de Imagen (Opcional)</label>
                        <input
                          type="text"
                          placeholder="https://..."
                          value={newBanner.imagen_url}
                          onChange={(e) => setNewBanner({ ...newBanner, imagen_url: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] text-white outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[7px] text-white/40 font-black uppercase ml-2">Texto Botón</label>
                          <input
                            type="text"
                            placeholder="VER INFO"
                            value={newBanner.cta_label}
                            onChange={(e) => setNewBanner({ ...newBanner, cta_label: e.target.value.toUpperCase() })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] text-white font-bold outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[7px] text-white/40 font-black uppercase ml-2">Link Botón</label>
                          <input
                            type="text"
                            placeholder="https://..."
                            value={newBanner.cta_link}
                            onChange={(e) => setNewBanner({ ...newBanner, cta_link: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] text-white outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleCreateBanner}
                      disabled={isCreatingBanner || !newBanner.titulo}
                      className="w-full py-4 bg-amber-600 text-[#001f3f] text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-amber-500 transition-all font-bebas shadow-lg shadow-amber-900/20 active:scale-95"
                    >
                      {isCreatingBanner ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Publicar en Web Pública'}
                    </button>
                  </div>
                )}

                {banners.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {banners.map((b) => (
                      <div key={b.id} className="bg-black/40 border border-white/5 p-4 rounded-2xl flex items-center justify-between group hover:border-[#ffb700]/30 transition-all">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${b.activo ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                          <div>
                            <p className="text-[10px] font-black text-white uppercase font-bebas">{b.titulo}</p>
                            <p className="text-[7px] text-white/40 font-bold uppercase">{b.tipo}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleBanner(b.id, !b.activo)}
                            className={`p-2 rounded-lg transition-all ${b.activo ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}
                            title={b.activo ? 'Desactivar' : 'Activar'}
                          >
                            {b.activo ? <X size={14} /> : <UserCheck size={14} />}
                          </button>
                          <button
                            onClick={() => handleDeleteBanner(b.id)}
                            className="p-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ===== GEMINI COMMAND CENTER (Director Only) ===== */}
        {(userRole === UserRole.DIRECTOR || currentUser?.userRole === UserRole.DIRECTOR) && (
          <GeminiCommandCenter
            agents={agents}
            currentUser={currentUser}
            onUpdateNeeded={onUpdateNeeded}
          />
        )}

      </div>
    </div >
  );
};

const MetricCard = ({ icon, label, value, color, onAdjust, disabled, adjustmentAmount = 5 }: { icon: any, label: string, value: number, color: string, onAdjust?: (val: number) => void, disabled?: boolean, adjustmentAmount?: number }) => (
  <div className="bg-[#001833] border border-white/5 p-4 rounded-2xl relative overflow-hidden group hover:border-[#ffb700]/20 transition-colors font-montserrat">
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white/5 rounded-lg border border-white/5">
            {icon}
          </div>
          <p className="text-[8px] text-white/40 font-black uppercase tracking-widest leading-tight font-bebas">{label}</p>
        </div>
        <p className="text-2xl font-bebas font-black text-white tracking-tight leading-none">{value}</p>
      </div>

      <div className="w-full h-1 bg-[#000c19] rounded-full overflow-hidden border border-white/5">
        <div className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-1000`} style={{ width: `${Math.min(100, value)}%` }}></div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={(e) => { e.stopPropagation(); onAdjust?.(-adjustmentAmount); }}
          disabled={disabled}
          className="flex-1 py-3 flex items-center justify-center bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 hover:bg-red-500/20 active:scale-95 transition-all text-[8px] font-black uppercase tracking-widest gap-2"
        >
          <Minus size={12} /> {adjustmentAmount}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onAdjust?.(adjustmentAmount); }}
          disabled={disabled}
          className="flex-1 py-3 flex items-center justify-center bg-green-500/10 border border-green-500/20 rounded-xl text-green-500 hover:bg-green-500/20 active:scale-95 transition-all text-[8px] font-black uppercase tracking-widest gap-2"
        >
          <Plus size={12} /> {adjustmentAmount}
        </button>
      </div>
    </div>
  </div>
);

const SanctionOption = ({ label, sub, pts, onClick, disabled, isCritical }: { label: string, sub: string, pts: string, onClick: () => void, disabled?: boolean, isCritical?: boolean }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`p-4 rounded-2xl border flex flex-col items-center text-center transition-all active:scale-95 disabled:opacity-50 ${isCritical ? 'bg-red-600/10 border-red-500/40 hover:bg-red-600/20' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
  >
    <div className={`text-[12px] font-black mb-1 font-bebas ${isCritical ? 'text-red-500' : 'text-white'}`}>{label}</div>
    <div className="text-[7px] text-white/40 font-bold uppercase tracking-widest mb-2 font-montserrat">{sub}</div>
    <div className={`text-[10px] font-black font-bebas ${isCritical ? 'text-red-500' : 'text-red-400'}`}>{pts}</div>
  </button>
);

const CIUModule = IntelligenceCenter;
export default CIUModule;