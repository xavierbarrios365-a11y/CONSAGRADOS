import React, { useState } from 'react';
import { Agent, UserRole, AppView, DailyVerse as DailyVerseType } from '../types';
import DailyVerse from './DailyVerse';
import { Shield, Zap, Book, FileText, Star, Activity, Target, RotateCcw, Trash2, Database, AlertCircle, RefreshCw, BookOpen, ShieldAlert, AlertTriangle, Plus, Minus, Gavel, Camera, UploadCloud, Loader2, Sparkles, Trophy, Send, ChevronRight, Users, Search, Crown, Radio, Bell } from 'lucide-react';
import { formatDriveUrl } from './DigitalIdCard';
import TacticalRadar from './TacticalRadar';
import { generateTacticalProfile } from '../services/geminiService';
import { reconstructDatabase, uploadImage, updateAgentPhoto, updateAgentPoints, deductPercentagePoints, sendAgentCredentials, bulkSendCredentials, broadcastNotification } from '../services/sheetsService';
import TacticalRanking from './TacticalRanking';

interface CIUProps {
  agents: Agent[];
  currentUser: Agent | null;
  onUpdateNeeded?: () => void;
  intelReport?: string;
  setView?: (view: AppView) => void;
  visitorCount?: number;
  onRefreshIntel?: () => void;
  isRefreshingIntel?: boolean;
  onAgentClick?: (agent: Agent) => void;
  userRole?: UserRole;
}

const IntelligenceCenter: React.FC<CIUProps> = ({ agents, currentUser, onUpdateNeeded, intelReport, setView, visitorCount, onRefreshIntel, isRefreshingIntel, onAgentClick, userRole }) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>(currentUser?.id || agents[0]?.id || '');
  const [isReconstructing, setIsReconstructing] = useState(false);
  const [isUpdatingPoints, setIsUpdatingPoints] = useState(false);
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [broadcastData, setBroadcastData] = useState({ title: '', message: '' });
  const [photoStatus, setPhotoStatus] = useState<'IDLE' | 'UPLOADING' | 'SAVING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const agent = agents.find(a => String(a.id).trim() === String(selectedAgentId).trim()) || agents[0];

  const totalAgents = agents.length;
  const totalLeaders = agents.filter(a => a.userRole === UserRole.LEADER || a.userRole === UserRole.DIRECTOR).length;

  const getLevelInfo = (xp: number) => {
    if (xp < 300) return { current: 'RECLUTA', next: 'ACTIVO', target: 300, level: 0 };
    if (xp < 500) return { current: 'ACTIVO', next: 'CONSAGRADO', target: 500, level: 1 };
    if (xp < 700) return { current: 'CONSAGRADO', next: 'REFERENTE', target: 700, level: 2 };
    if (xp < 1000) return { current: 'REFERENTE', next: 'LÍDER', target: 1000, level: 3 };
    return { current: 'LÍDER', next: 'MAX', target: 1000, level: 4 };
  };

  const handleBroadcast = async () => {
    if (!broadcastData.title || !broadcastData.message) return;
    if (!window.confirm("⚠️ ¿TRANSMITIR COMUNICADO MASIVO?\n\nEsta notificación llegará a todos los agentes vía Push y Telegram.")) return;

    setIsSendingBroadcast(true);
    try {
      const res = await broadcastNotification(broadcastData.title, broadcastData.message);
      if (res.success) {
        alert("✅ TRANSMISIÓN COMPLETADA");
        setBroadcastData({ title: '', message: '' });
      } else {
        alert("❌ ERROR: " + res.error);
      }
    } catch (err) {
      alert("❌ FALLO DE CONEXIÓN");
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const levelInfo = agent ? getLevelInfo(agent.xp) : null;
  const isProspectoAscender = levelInfo && agent.xp >= (levelInfo.target - 50) && agent.xp < levelInfo.target;

  if (!agent) return <div className="p-10 text-center font-bebas text-[#ffb700] animate-pulse uppercase tracking-widest">Inicializando Nodo de Inteligencia...</div>;

  const handleImportInscriptions = async () => {
    if (!window.confirm("¿IMPORTAR NUEVAS INSCRIPCIONES? El sistema buscará en la hoja de 'Inscripciones' y añadirá nuevos agentes al Directorio oficial.")) return;
    setIsReconstructing(true);
    const res = await reconstructDatabase();
    setIsReconstructing(false);
    if (res.success) {
      alert(`PROCESO COMPLETADO: Se han importado ${res.newAgents || 0} nuevos agentes. El Directorio ha sido actualizado.`);
      if (onUpdateNeeded) onUpdateNeeded();
    } else {
      alert(`ERROR: No se pudo completar la operación. ${res.error || ''}`);
    }
  };

  const handlePhotoUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !agent) return;

    setPhotoStatus('UPLOADING');
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const base64 = await base64Promise;
      const uploadResult = await uploadImage(base64, file);

      if (uploadResult.success && uploadResult.url) {
        setPhotoStatus('SAVING');
        const updateResult = await updateAgentPhoto(agent.id, uploadResult.url);
        if (updateResult.success) {
          setPhotoStatus('SUCCESS');
          if (onUpdateNeeded) onUpdateNeeded();
          setTimeout(() => setPhotoStatus('IDLE'), 3000);
        } else {
          throw new Error(updateResult.error || "Error al actualizar registro");
        }
      } else {
        throw new Error(uploadResult.error || "Error al subir imagen");
      }
    } catch (err: any) {
      alert(`ERROR: ${err.message}`);
      setPhotoStatus('ERROR');
      setTimeout(() => setPhotoStatus('IDLE'), 3000);
    }
  };

  const handleUpdatePoints = async (type: 'BIBLIA' | 'APUNTES' | 'LIDERAZGO', points: number) => {
    if (!agent) return;
    const absPoints = Math.abs(points);
    if (points < 0 && !window.confirm(`🚨 ¿APLICAR SANCIÓN DE ${absPoints} PUNTOS A ${agent.name}?`)) return;

    setIsUpdatingPoints(true);
    try {
      const res = await updateAgentPoints(agent.id, type, points);
      if (res.success) {
        if (onUpdateNeeded) onUpdateNeeded();
      } else {
        alert("ERROR: Fallo en protocolo de puntos.");
      }
    } catch (err) {
      alert("FALLO TÁCTICO DE CONEXIÓN");
    } finally {
      setIsUpdatingPoints(false);
    }
  };

  const handlePercentageDeduction = async (percentage: number) => {
    if (!agent) return;
    if (!window.confirm(`🚨 ¡ALERTA DE SEGURIDAD! 🚨\n\n¿CONFIRMA LA EXPULSIÓN DE ${agent.name}?\nSe le descontará el ${percentage}% de TODOS sus puntos acumulados.`)) return;

    setIsUpdatingPoints(true);
    try {
      const res = await deductPercentagePoints(agent.id, percentage);
      if (res.success) {
        if (onUpdateNeeded) onUpdateNeeded();
      } else {
        alert("FALLO EN PROTOCOLO DE EXPULSIÓN");
      }
    } catch (err) {
      alert("FALLO TÁCTICO DE CONEXIÓN");
    } finally {
      setIsUpdatingPoints(false);
    }
  };

  return (
    <div className="min-h-full bg-[#001f3f] p-4 md:p-6 animate-in fade-in duration-700">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* PANEL DE CONTROL DE ALTO MANDO */}
        {userRole === UserRole.DIRECTOR && (
          <div className="bg-[#ffb700]/5 border border-[#ffb700]/20 rounded-3xl p-5 mb-6 backdrop-blur-md space-y-5">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#ffb700] rounded-2xl shadow-lg">
                  <Shield className="text-[#001f3f]" size={24} />
                </div>
                <div>
                  <h3 className="text-white font-black text-sm uppercase tracking-widest leading-none mb-1 font-bebas">Command Center: Alto Mando</h3>
                  <p className="text-[9px] text-[#ffb700]/80 font-bold uppercase tracking-[0.2em] font-montserrat">Protocolo de Notificaciones y Sincronización</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                {setView && (
                  <button
                    onClick={() => setView(AppView.CONTENT)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-white/5 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all border border-white/10 active:scale-95 font-bebas"
                  >
                    <BookOpen size={16} className="text-[#ffb700]" />
                    Material
                  </button>
                )}
                <button
                  onClick={async () => {
                    if (window.confirm("🚨 ¡ALERTA DE SEGURIDAD! 🚨\n\n¿Estás seguro de realizar una PURGA TOTAL?\nEsto cerrará tu sesión, borrará el caché del navegador y forzará la descarga de la última versión del sistema.\n\nUsa esto solo si detectas errores persistentes.")) {
                      try {
                        if ('caches' in window) {
                          const cacheNames = await caches.keys();
                          await Promise.all(cacheNames.map(name => caches.delete(name)));
                        }
                        if ('serviceWorker' in navigator) {
                          const registrations = await navigator.serviceWorker.getRegistrations();
                          await Promise.all(registrations.map(reg => reg.unregister()));
                        }
                        const remembered = localStorage.getItem('remembered_user');
                        localStorage.clear();
                        if (remembered) localStorage.setItem('remembered_user', remembered);
                        window.location.reload();
                      } catch (err) {
                        alert("FALLO EN PURGA: Intente manualmente.");
                      }
                    }
                  }}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500/20 transition-all shadow-xl active:scale-95 font-bebas"
                >
                  <Trash2 size={16} />
                  Purga de Emergencia
                </button>
                <button
                  onClick={handleImportInscriptions}
                  disabled={isReconstructing}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-[#ffb700] text-[#001f3f] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#ffb700]/90 transition-all shadow-xl active:scale-95 disabled:opacity-50 font-bebas"
                >
                  <RefreshCw size={16} className={isReconstructing ? "animate-spin" : ""} />
                  Sincronizar DB
                </button>
              </div>
            </div>

            {/* FRECUENCIA DE MANDO: NOTIFICACIONES MASIVAS */}
            <div className="p-4 bg-[#001f3f]/50 rounded-2xl border border-white/5 space-y-4">
              <div className="flex items-center gap-2">
                <Radio className="text-[#ffb700]" size={16} />
                <h4 className="text-white font-black uppercase tracking-widest text-[10px] font-bebas">FRECUENCIA DE MANDO: COMUNICADOS GLOBALES</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-3">
                  <input
                    type="text"
                    placeholder="TÍTULO DEL AVISO..."
                    value={broadcastData.title}
                    onChange={(e) => setBroadcastData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-[#000c19] border border-white/10 rounded-xl py-3 px-4 text-white text-[10px] font-bold uppercase outline-none focus:border-[#ffb700] font-bebas tracking-wider"
                  />
                </div>
                <div className="md:col-span-6">
                  <input
                    type="text"
                    placeholder="MENSAJE PARA TODOS LOS AGENTES..."
                    value={broadcastData.message}
                    onChange={(e) => setBroadcastData(prev => ({ ...prev, message: e.target.value }))}
                    className="w-full bg-[#000c19] border border-white/10 rounded-xl py-3 px-4 text-white text-[10px] font-bold uppercase outline-none focus:border-[#ffb700] font-bebas tracking-wider"
                  />
                </div>
                <div className="md:col-span-3">
                  <button
                    onClick={handleBroadcast}
                    disabled={isSendingBroadcast || !broadcastData.title || !broadcastData.message}
                    className="w-full h-full bg-[#ffb700] text-[#001f3f] rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-[#ffb700]/90 disabled:opacity-50 transition-all py-3 px-6"
                  >
                    {isSendingBroadcast ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    Transmitir Comunicado
                  </button>
                </div>
              </div>
              <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest pl-2">
                📢 Esta transmisión se enviará vía OneSignal (Push) y Telegram simultáneamente.
              </p>
            </div>
          </div>
        )}

        {/* Global Stats Summary */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-[#001833] border border-white/5 p-3 rounded-xl text-center">
            <p className="text-[6px] text-gray-500 font-black uppercase mb-1 font-bebas">TOTAL AGENTES</p>
            <p className="text-lg font-bebas font-black text-white">{totalAgents}</p>
          </div>
          <div className="bg-[#001833] border border-white/5 p-3 rounded-xl text-center">
            <p className="text-[6px] text-gray-500 font-black uppercase mb-1 font-bebas">TOTAL LÍDERES</p>
            <p className="text-lg font-bebas font-black text-[#ffb700]">{totalLeaders}</p>
          </div>
          <div className="bg-[#001833] border border-white/5 p-3 rounded-xl text-center">
            <p className="text-[6px] text-gray-500 font-black uppercase mb-1 font-bebas">RADAR (VISITAS)</p>
            <p className="text-lg font-bebas font-black text-orange-500">{visitorCount || 0}</p>
          </div>
        </div>

        {/* Header Táctico */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/10 pb-6 gap-4 font-montserrat">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-4xl font-bebas font-bold text-white tracking-widest flex items-center gap-4">
              <div className="p-2 bg-[#ffb700]/10 border border-[#ffb700]/30 rounded-lg">
                <Target className="text-[#ffb700]" size={28} />
              </div>
              NODO DE INTELIGENCIA
            </h1>
            <p className="text-[10px] text-[#ffb700]/70 font-black uppercase tracking-[0.5em] opacity-70">Unified Intelligence Center // Consagrados 2026</p>
          </div>

          <div className="w-full lg:w-96">
            {/* Versículo movido al HOME según requerimiento táctico */}
          </div>


          <div className="flex flex-col md:flex-row items-end gap-3 w-full md:w-auto">
            <div className="w-full md:w-72">
              <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest mb-1 ml-2">Seleccionar Agente</p>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full bg-[#ffb700]/5 border border-[#ffb700]/20 rounded-xl px-5 py-4 text-white font-black text-xs focus:border-[#ffb700] outline-none cursor-pointer hover:bg-[#ffb700]/10 appearance-none font-bebas"
              >
                {agents.map(a => (
                  <option key={a.id} value={a.id} className="bg-[#001f3f] text-white font-bebas">{a.name} [{a.id}]</option>
                ))}
              </select>
            </div>

            {userRole === UserRole.DIRECTOR && (
              <button
                onClick={async () => {
                  const confirmSend = window.confirm("⚠️ TRANSMISIÓN DE SEGURIDAD\n\n¿Deseas enviar las credenciales actuales de este agente al Telegram táctico?");
                  if (confirmSend) {
                    const res = await sendAgentCredentials(selectedAgentId);
                    if (res.success) alert("✅ TRANSMISIÓN EXITOSA");
                    else alert("❌ FALLO EN TRANSMISIÓN: " + res.error);
                  }
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
                <div className="w-32 h-32 rounded-2xl border-2 border-white/5 p-1 bg-[#000c19] shadow-inner relative overflow-hidden">
                  <img
                    src={formatDriveUrl(agent.photoUrl)}
                    className="w-full h-full rounded-xl object-cover grayscale hover:grayscale-0 transition-all duration-700"
                    onError={(e) => {
                      e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";
                      e.currentTarget.className = "w-full h-full object-cover opacity-20";
                    }}
                  />

                  {isProspectoAscender && (
                    <div className="absolute top-4 -right-4 bg-orange-500 text-white text-[8px] font-black py-1 px-4 rotate-45 shadow-lg border border-white/20 z-20 animate-pulse">
                      PROSPECTO ASCENDER
                    </div>
                  )}

                  {userRole === UserRole.DIRECTOR && (
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
                  {isProspectoAscender && (
                    <p className="text-[8px] text-orange-400 font-black uppercase tracking-widest animate-pulse">Faltan {levelInfo.target - agent.xp} XP para subir de nivel</p>
                  )}
                </div>
              </div>

              <div className="mt-8 w-full grid grid-cols-2 gap-3">
                <div className="bg-[#3A3A3A]/20 p-4 rounded-2xl border border-white/5 text-left">
                  <p className="text-[6px] text-white/40 font-black uppercase mb-1">ID AGENTE</p>
                  <p className="text-[9px] font-mono text-[#FFB700] font-bold">{agent.id}</p>
                </div>
                <div className="bg-[#3A3A3A]/20 p-4 rounded-2xl border border-white/5 text-left">
                  <p className="text-[6px] text-white/40 font-black uppercase mb-1">ACCESO</p>
                  <p className="text-[9px] font-black text-blue-400 uppercase truncate font-bebas">
                    {agent.accessLevel || 'ESTUDIANTE'}
                  </p>
                </div>
              </div>

              {/* RADAR TÁCTICO IN-CENTER */}
              <div className="mt-8 p-6 bg-gradient-to-b from-white/5 to-transparent rounded-[2.5rem] border border-white/5 w-full flex flex-col items-center">
                <p className="text-[7px] text-[#ffb700] font-black uppercase tracking-[0.3em] mb-4 font-bebas">Análisis Psicométrico Directivo</p>
                {agent.tacticalStats ? (
                  <TacticalRadar stats={agent.tacticalStats} size={180} />
                ) : (
                  <div className="py-10 text-center opacity-30">
                    <Sparkles size={32} className="mx-auto mb-2" />
                    <p className="text-[8px] font-black uppercase tracking-widest">Esperando Sincronización de IA</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ESTADÍSTICAS Y ACCIONES */}
          <div className="lg:col-span-8 space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <MetricCard
                icon={<Zap className="text-[#ffb700]" size={16} />}
                label="COMPROMISO"
                value={agent.bible}
                color="from-[#ffb700] to-orange-600"
                onAdjust={(val) => handleUpdatePoints('BIBLIA', val)}
                disabled={isUpdatingPoints}
              />
              <MetricCard
                icon={<Star className="text-blue-400" size={16} />}
                label="SERVICIO"
                value={agent.notes}
                color="from-blue-400 to-blue-600"
                onAdjust={(val) => handleUpdatePoints('APUNTES', val)}
                disabled={isUpdatingPoints}
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

            {userRole === UserRole.DIRECTOR && (
              <div className="p-5 bg-blue-950/10 border border-blue-500/10 rounded-2xl space-y-3 mt-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="text-blue-500" size={14} />
                    <h4 className="text-white font-black uppercase tracking-widest text-[9px] font-bebas">COMANDO DE OPERACIONES</h4>
                  </div>
                  <p className="text-[8px] text-blue-400/50 font-bold uppercase tracking-widest">Procedimiento Seguro</p>
                </div>
                <button
                  onClick={async () => {
                    const safetyKey = prompt("⚠️ PROTOCOLO DE SEGURIDAD\n\nPara iniciar la transmisión masiva, escribe 'TRANSMITIR':");
                    if (safetyKey === 'TRANSMITIR') {
                      const res = await bulkSendCredentials();
                      if (res.success) alert(`✅ TRANSMISIÓN COMPLETADA\n\nSe enviaron ${res.count} credenciales.`);
                      else alert("❌ FALLO EN TRANSMISIÓN: " + (res.error || "Error desconocido"));
                    }
                  }}
                  className="w-full bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-blue-400 py-3 rounded-xl font-black uppercase text-[8px] tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                >
                  <Send size={12} /> Iniciar Transmisión Masiva
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ icon, label, value, color, onAdjust, disabled }: { icon: any, label: string, value: number, color: string, onAdjust?: (val: number) => void, disabled?: boolean }) => (
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
          onClick={(e) => { e.stopPropagation(); onAdjust?.(-5); }}
          disabled={disabled}
          className="flex-1 py-3 flex items-center justify-center bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 hover:bg-red-500/20 active:scale-95 transition-all text-[8px] font-black uppercase tracking-widest gap-2"
        >
          <Minus size={12} /> Descontar
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onAdjust?.(5); }}
          disabled={disabled}
          className="flex-1 py-3 flex items-center justify-center bg-green-500/10 border border-green-500/20 rounded-xl text-green-500 hover:bg-green-500/20 active:scale-95 transition-all text-[8px] font-black uppercase tracking-widest gap-2"
        >
          <Plus size={12} /> Sumar
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