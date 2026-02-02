
import React, { useState } from 'react';
import { Agent } from '../types';
import { ShieldCheck, Zap, Star, Fingerprint, UserCheck, Shield, RotateCw, Cake, Waves, Heart, Phone, Sparkles, Loader2 } from 'lucide-react';
import TacticalRadar from './TacticalRadar';
import { generateTacticalProfile } from '../services/geminiService';
import { updateTacticalStats, fetchAcademyData } from '../services/sheetsService';

interface DigitalIdCardProps {
  agent: Agent;
}

export const formatDriveUrl = (url: string) => {
  if (!url || typeof url !== 'string' || url.trim() === '' || url === 'N/A' || url === 'PENDIENTE') {
    return "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";
  }

  // SI YA ES UN ENLACE DIRECTO DE GOOGLE CONTENT (LH3), LO DEJAMOS PASAR
  if (url.includes('googleusercontent.com')) return url;

  // Extraer el ID de Google Drive (cubre múltiples formatos: /d/, open?id=, uc?id=, file/d/)
  const driveRegex = /(?:id=|\/d\/|file\/d\/|open\?id=|uc\?id=)([\w-]{25,100})/;
  const match = url.match(driveRegex);

  let fileId = "";
  if (match && match[1]) {
    fileId = match[1];
  } else if (url.length >= 25 && !url.includes('/') && !url.includes('.') && !url.includes(':')) {
    // Si parece un ID crudo
    fileId = url;
  }

  if (fileId) {
    /** 
     * Estrategia de Renderizado Definitiva:
     * El endpoint 'thumbnail' con 'sz=s1000' es el más permisivo y estable
     * para incrustar imágenes de Google Drive en aplicaciones web modernas.
     */
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=s1000`;
  }

  // Fallback para URLs normales
  if (url.startsWith('http')) return url;

  return "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";
};

const DigitalIdCard: React.FC<DigitalIdCardProps> = ({ agent }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleAIUpdate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUpdating) return;

    setIsUpdating(true);
    try {
      const { progress } = await fetchAcademyData(agent.id);
      const result = await generateTacticalProfile(agent, progress);
      if (result) {
        await updateTacticalStats(agent.id, result.stats, result.summary);
        // Refresh local state if needed (ideally via props/context)
        window.location.reload(); // Simple refresh for now
      }
    } catch (err) {
      console.error("Failed to update tactical profile", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${agent.id}&color=000000&bgcolor=ffffff`;

  return (
    <div
      className="relative w-full max-w-[290px] md:max-w-[320px] aspect-[1/1.6] cursor-pointer group select-none transition-transform active:scale-[0.98]"
      onClick={() => setIsFlipped(!isFlipped)}
      style={{ perspective: '2000px' }}
    >
      <div className="absolute -top-3 -right-3 z-50 bg-blue-600 p-2.5 rounded-full shadow-xl border-2 border-white animate-bounce">
        <RotateCw size={14} className="text-white" />
      </div>

      <div
        className={`relative w-full h-full transition-all duration-700 ease-in-out`}
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
      >

        {/* FRENTE */}
        <div
          className="absolute inset-0 bg-[#0a0a0a] rounded-[2rem] border-2 border-white/10 shadow-2xl flex flex-col overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'translateZ(1px)' // Forzar separación 3D en móviles
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-transparent"></div>

          <div className="p-5 flex justify-between items-start z-10">
            <div>
              <p className="text-[7px] md:text-[8px] text-[#ffb700] font-black uppercase tracking-[0.2em] mb-1 leading-none font-montserrat">CONSAGRADOS 2026</p>
              <h2 className="text-[12px] md:text-sm font-bebas text-white tracking-widest uppercase truncate max-w-[150px]">
                {agent.name.split(' ')[0]}
              </h2>
            </div>
            <Shield size={18} className="text-[#ffb700] opacity-50" />
          </div>

          <div className="flex flex-col items-center px-6 mt-0 md:mt-1">
            <div className="relative mb-2">
              <div className="absolute inset-0 bg-[#ffb700] blur-xl opacity-10"></div>
              <img
                src={imgError ? "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png" : formatDriveUrl(agent.photoUrl)}
                alt={agent.name}
                onError={() => setImgError(true)}
                className="relative w-24 h-24 md:w-28 md:h-28 rounded-3xl object-cover border-2 border-[#ffb700]/30 shadow-lg grayscale hover:grayscale-0 transition-all duration-500"
              />
            </div>
            <div className="text-center px-2">
              <p className="text-[10px] md:text-[11px] font-black text-white uppercase tracking-wider leading-tight font-montserrat">{agent.name}</p>
              <span className="inline-block bg-[#ffb700]/10 border border-[#ffb700]/20 px-3 py-0.5 rounded-full mt-1">
                <p className="text-[7px] text-[#ffb700] font-bold uppercase tracking-[0.2em] font-bebas">{agent.rank}</p>
              </span>
            </div>
          </div>

          <div className="flex-1 px-5 py-3 space-y-2 z-10">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/5 p-2 rounded-xl border border-white/5 text-center">
                <p className="text-[6px] text-white/40 font-black uppercase mb-0.5">ESTADO</p>
                <p className="text-[9px] font-black text-green-400 uppercase leading-none">{agent.status}</p>
              </div>
              <div className="bg-white/5 p-2 rounded-xl border border-white/5 text-center">
                <p className="text-[6px] text-white/40 font-black uppercase mb-0.5">XP TÁCTICA</p>
                <p className="text-[9px] font-black text-[#ffb700] leading-none">{agent.xp} PTS</p>
              </div>
            </div>

            <div className="space-y-1">
              <InfoItem icon={<UserCheck size={10} />} label="ID CÉDULA" value={agent.id} />
              <InfoItem icon={<Fingerprint size={10} />} label="TALENTO" value={agent.talent} />
              <InfoItem icon={<Cake size={10} />} label="NACIMIENTO" value={agent.birthday || 'N/A'} />
              <InfoItem icon={<Phone size={10} />} label="WHATSAPP" value={agent.whatsapp || 'S/D'} />
              <InfoItem icon={<Waves size={10} />} label="BAUTISMO" value={agent.baptismStatus || 'NO'} />

              <div className="flex flex-col gap-1 border-t border-white/5 pt-1 mt-1">
                <p className="text-[6px] text-gray-500 font-black uppercase tracking-widest flex items-center gap-1">
                  <Heart size={8} className="text-red-500" /> RELACIÓN CON DIOS
                </p>
                <p className="text-[8px] text-white font-medium italic leading-tight line-clamp-2">
                  "{agent.relationshipWithGod || 'PENDIENTE'}"
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#ffb700]/5 p-3 border-t border-white/5 flex flex-col items-center mt-auto">
            <p className="text-[5px] text-[#ffb700] font-bold uppercase tracking-widest leading-tight text-center font-bebas">
              No pedimos permiso para ser luz. Vivimos en un mundo que celebra lo superficial y premia lo frágil. Pero nosotros no somos de ese mundo.
            </p>
          </div>
        </div>

        {/* DORSO */}
        <div
          className="absolute inset-0 bg-[#000000] rounded-[2rem] border-2 border-[#ffb700]/30 shadow-2xl flex flex-col items-center p-5 space-y-4"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg) translateZ(1px)'
          }}
        >
          {/* Header compacto */}
          <div className="text-center w-full">
            <h3 className="text-[12px] font-bebas text-white uppercase tracking-[0.3em] mb-1">INTELIGENCIA TÁCTICA</h3>
            <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#ffb700]/30 to-transparent"></div>
          </div>

          {/* Radar Chart */}
          <div className="relative">
            {agent.tacticalStats ? (
              <TacticalRadar stats={agent.tacticalStats} size={160} />
            ) : (
              <div className="w-[160px] h-[160px] border border-dashed border-[#ffb700]/20 rounded-full flex flex-col items-center justify-center p-4 text-center">
                <Sparkles size={24} className="text-[#ffb700] mb-2 opacity-50" />
                <p className="text-[7px] text-gray-500 font-black uppercase tracking-widest">Perfil Psicodigital Pendiente de Análisis</p>
              </div>
            )}

            {/* Update Button */}
            <button
              onClick={handleAIUpdate}
              disabled={isUpdating}
              className="absolute -bottom-2 -right-2 bg-[#ffb700] text-[#001f3f] p-2 rounded-xl shadow-lg hover:scale-110 active:scale-90 transition-all z-50 flex items-center justify-center"
            >
              {isUpdating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            </button>
          </div>

          {/* AI Briefing */}
          <div className="flex-1 w-full bg-[#ffb700]/5 border border-[#ffb700]/10 rounded-2xl p-3 overflow-hidden">
            <p className="text-[6px] text-[#ffb700] font-black uppercase tracking-widest mb-1 flex items-center gap-1">
              <ShieldCheck size={8} /> RESUMEN DE CAMPO:
            </p>
            <p className="text-[8px] text-white font-bold leading-tight uppercase font-montserrat italic">
              {agent.tacticalSummary || "Sin registros de inteligencia recientes. Completa evaluaciones para generar un perfil."}
            </p>
          </div>

          {/* QR & Info Foot */}
          <div className="flex items-center justify-between w-full h-12">
            <div className="text-left">
              <p className="text-[6px] text-gray-500 font-black uppercase tracking-widest ">DOC ID: {agent.id}</p>
              <p className="text-[6px] text-gray-500 font-black uppercase tracking-widest">ACTUALIZADO: {agent.lastAiUpdate ? new Date(agent.lastAiUpdate).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div className="bg-white p-1 rounded-lg">
              <img src={qrUrl} alt="QR" className="w-8 h-8" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const InfoItem = ({ icon, label, value }: { icon: any, label: string, value: string }) => (
  <div className="flex items-center gap-2 border-b border-white/5 pb-1">
    <span className="text-[#ffb700] opacity-40">{icon}</span>
    <div className="flex justify-between w-full items-center">
      <span className="text-[6px] text-gray-500 font-black uppercase tracking-widest">{label}</span>
      <span className="text-[8px] text-white font-bold uppercase truncate max-w-[120px] text-right">{value}</span>
    </div>
  </div>
);

export default DigitalIdCard;
