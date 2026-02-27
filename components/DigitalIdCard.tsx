
import React, { useState, useRef } from 'react';
import { Agent } from '../types';
import { ShieldCheck, Zap, Star, Fingerprint, UserCheck, Shield, RotateCw, Cake, Waves, Heart, Phone, Sparkles, Loader2, RefreshCw, Award, Share2, Download, Check, X, ArrowUpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TacticalRadar from './TacticalRadar';
import { generateTacticalProfile } from '../services/geminiService';
import { updateAgentAiProfile, fetchAcademyData, updateAgentPoints } from '../services/sheetsService';
import { toPng } from 'html-to-image';
import { formatDriveUrl } from '../services/storageUtils';

import EliteRecruitmentTest from './EliteRecruitmentTest';

interface DigitalIdCardProps {
  agent: Agent;
  onClose?: () => void;
}



const DigitalIdCard: React.FC<DigitalIdCardProps> = ({ agent, onClose }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState<string | null>(null);
  const [backTab, setBackTab] = useState<'QR' | 'INTEL'>('QR');
  const [completedCourses, setCompletedCourses] = useState<string[]>([]);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);

  // Pre-cargar imagen en Base64 para evitar bloqueos de CORS al exportar y mostrar
  React.useEffect(() => {
    const prepareImage = async () => {
      if (!agent?.photoUrl) return;
      const originalUrl = formatDriveUrl(agent.photoUrl);
      try {
        const response = await fetch(originalUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setCapturedPhotoUrl(reader.result as string);
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.error("Error al preparar imagen para DigitalIdCard:", err);
        setCapturedPhotoUrl(originalUrl);
      }
    };
    prepareImage();
  }, [agent?.photoUrl]);

  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  // Load course badges
  React.useEffect(() => {
    const loadBadges = async () => {
      try {
        const data = await fetchAcademyData(agent.id);
        if (data.courses && data.lessons && data.progress) {
          const approved = data.courses.filter((course: any) => {
            const courseLessons = data.lessons.filter((l: any) => l.courseId === course.id);
            if (courseLessons.length === 0) return false;
            return courseLessons.every((l: any) =>
              data.progress.some((p: any) => p.lessonId === l.id && p.status === 'COMPLETADO')
            );
          }).map((c: any) => c.title);
          setCompletedCourses(approved);
        }
      } catch (e) {
        console.error('Error loading badges:', e);
      }
    };
    loadBadges();
  }, [agent.id]);

  const handleAIUpdate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("⚠️ ¿RE-EVALUACIÓN TÁCTICA?\nSe borrará tu perfil actual y deberás completar el test de élite nuevamente para acceder.")) {
      setIsUpdating(true);
      try {
        await updateAgentAiProfile(agent.id, null, null);
        window.location.reload(); // Esto activará el bloqueo global al recargar
      } catch (err) {
        alert("Fallo al resetear perfil.");
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleExport = async (side: 'front' | 'back', mode: 'share' | 'download', e: React.MouseEvent) => {
    e.stopPropagation();
    const targetRef = side === 'front' ? frontRef : backRef;
    if (!targetRef.current || isExporting) return;

    setIsExporting(true);
    try {
      // Dimensiones estándar ID-1 (85.6mm x 53.98mm) -> Ratio 1.58
      // Usaremos 1011x638 para alta resolución nítida
      const dataUrl = await toPng(targetRef.current, {
        cacheBust: true,
        pixelRatio: 3, // Calidad Retina
        backgroundColor: '#000000',
        style: {
          transform: 'scale(1)',
          borderRadius: '40px'
        }
      });

      const fileName = `id_${side}_${agent.id}.png`;

      if (mode === 'share' && navigator.share) {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], fileName, { type: 'image/png' });
        await navigator.share({
          title: `Carnet Consagrados - ${agent.name}`,
          text: `Identidad Táctica del Agente ${agent.id}`,
          files: [file]
        });
      } else {
        const link = document.createElement('a');
        link.download = fileName;
        link.href = dataUrl;
        link.click();
      }

      setExportComplete(side);
      setTimeout(() => setExportComplete(null), 3000);
    } catch (err) {
      console.error('Error exporting card:', err);
      alert('Error al generar la imagen. Intente de nuevo.');
    } finally {
      setIsExporting(false);
    }
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${agent.id}&color=000000&bgcolor=ffffff`;

  return (
    <div className="relative w-full max-w-[320px] mx-auto group">

      {/* Botones de Control Tácticos (Flotantes fuera del carnet) */}
      <div className="absolute -left-16 top-0 bottom-0 flex flex-col justify-center gap-4 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0 hidden md:flex">
        <button
          onClick={(e) => handleExport('front', 'share', e)}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${exportComplete === 'front' ? 'bg-green-500 text-white' : 'bg-black/60 text-white hover:bg-[#ffb700] hover:text-[#001f3f]'} border border-white/10 backdrop-blur-md shadow-2xl overflow-hidden relative shadow-[0_0_20px_rgba(0,0,0,0.5)]`}
          title="Compartir Frontal"
        >
          {isExporting ? <Loader2 size={18} className="animate-spin" /> : exportComplete === 'front' ? <Check size={18} /> : <Share2 size={18} />}
        </button>
        <button
          onClick={(e) => handleExport('front', 'download', e)}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${exportComplete === 'front' ? 'bg-green-500 text-white' : 'bg-black/60 text-white hover:bg-[#ffb700] hover:text-[#001f3f]'} border border-white/10 backdrop-blur-md shadow-2xl overflow-hidden relative shadow-[0_0_20px_rgba(0,0,0,0.5)]`}
          title="Descargar Frontal"
        >
          {isExporting ? <Loader2 size={18} className="animate-spin" /> : exportComplete === 'front' ? <Check size={18} /> : <Download size={18} />}
        </button>
        <button
          onClick={(e) => handleExport('back', 'share', e)}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${exportComplete === 'back' ? 'bg-green-500 text-white' : 'bg-black/60 text-white hover:bg-[#ffb700] hover:text-[#001f3f]'} border border-white/10 backdrop-blur-md shadow-2xl overflow-hidden relative shadow-[0_0_20px_rgba(0,0,0,0.5)]`}
          title="Compartir Dorsal (QR)"
        >
          {isExporting ? <Loader2 size={18} className="animate-spin" /> : exportComplete === 'back' ? <Check size={18} /> : <Share2 size={18} />}
        </button>
        <button
          onClick={(e) => handleExport('back', 'download', e)}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${exportComplete === 'back' ? 'bg-green-500 text-white' : 'bg-black/60 text-white hover:bg-[#ffb700] hover:text-[#001f3f]'} border border-white/10 backdrop-blur-md shadow-2xl overflow-hidden relative shadow-[0_0_20px_rgba(0,0,0,0.5)]`}
          title="Descargar Dorsal (QR)"
        >
          {isExporting ? <Loader2 size={18} className="animate-spin" /> : exportComplete === 'back' ? <Check size={18} /> : <Download size={18} />}
        </button>
      </div>

      <div
        className="relative w-full aspect-[1/1.6] cursor-pointer select-none transition-transform active:scale-[0.98]"
        style={{ perspective: '2000px' }}
      >
        {/* Botón de voltear */}
        <div className="absolute -top-3 -right-3 z-50 bg-blue-600 p-2.5 rounded-full shadow-xl border-2 border-white animate-bounce cursor-pointer hover:bg-blue-500 transition-colors"
          onClick={(e) => { e.stopPropagation(); setIsFlipped(!isFlipped); }}
          title="Voltear Carnet">
          <RotateCw size={14} className="text-white" />
        </div>

        {/* Botón de cierre opcional */}
        {onClose && (
          <div
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="absolute -top-3 -left-3 z-50 bg-red-600 p-2.5 rounded-full shadow-xl border-2 border-white cursor-pointer hover:bg-red-500 transition-colors"
            title="Cerrar Carnet"
          >
            <X size={14} className="text-white" />
          </div>
        )}

        <div
          className={`relative w-full h-full transition-all duration-700 ease-in-out`}
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
          }}
        >
          {/* FRENTE */}
          <div
            ref={frontRef}
            className={`absolute inset-0 bg-[#0a0a0a] rounded-[2.5rem] border-2 border-white/10 shadow-2xl flex flex-col overflow-hidden transition-opacity duration-300 ${isFlipped ? 'opacity-0' : 'opacity-100'}`}
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              zIndex: isFlipped ? 0 : 10,
              transform: 'translateZ(1px)'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-transparent"></div>

            {/* Action Bar Mobile */}
            <div className="absolute top-4 right-4 z-50 flex gap-2 md:hidden">
              <button onClick={(e) => handleExport('front', 'share', e)} className="p-2 bg-black/50 rounded-full text-white border border-white/10 backdrop-blur-sm">
                <Share2 size={14} />
              </button>
              <button onClick={(e) => handleExport('front', 'download', e)} className="p-2 bg-black/50 rounded-full text-white border border-white/10 backdrop-blur-sm">
                <Download size={14} />
              </button>
            </div>

            <div className="p-6 flex justify-between items-start z-10">
              <div>
                <p className="text-[9px] text-[#ffb700] font-black uppercase tracking-[0.3em] mb-1 font-montserrat">CONSAGRADOS 2026</p>
                <h2 className="text-[16px] font-bebas text-white tracking-widest uppercase truncate max-w-[180px]">
                  {agent.name.split(' ')[0]}
                </h2>
              </div>
              <Shield size={22} className="text-[#ffb700] opacity-50" />
            </div>

            <div className="flex flex-col items-center px-6 mt-2">
              <div className="relative mb-3">
                <div className="absolute inset-0 bg-[#ffb700] blur-2xl opacity-10"></div>
                <img
                  src={imgError ? "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png" : (capturedPhotoUrl || formatDriveUrl(agent.photoUrl))}
                  alt={agent.name}
                  onError={() => setImgError(true)}
                  className="relative w-32 h-32 rounded-[2.5rem] object-cover border-2 border-[#ffb700]/30 shadow-2xl grayscale hover:grayscale-0 transition-all duration-700 hover:rotate-2"
                />
              </div>
              <div className="text-center px-4">
                <p className="text-[12px] font-black text-white uppercase tracking-wider leading-tight font-montserrat drop-shadow-lg">{agent.name}</p>
                <span className="inline-block bg-[#ffb700]/15 border border-[#ffb700]/30 px-5 py-1 rounded-full mt-2 shadow-[0_0_15px_rgba(255,183,0,0.1)]">
                  <p className="text-[9px] text-[#ffb700] font-bold uppercase tracking-[0.3em] font-bebas">{agent.rank}</p>
                </span>
              </div>
            </div>

            <div className="flex-1 px-6 py-4 space-y-3 z-10">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5 text-center">
                  <p className="text-[7px] text-white/40 font-black uppercase mb-1">ESTADO</p>
                  <p className="text-[11px] font-black text-green-400 uppercase leading-none">{agent.status}</p>
                </div>
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5 text-center">
                  <p className="text-[7px] text-white/40 font-black uppercase mb-1">XP TÁCTICA</p>
                  <p className="text-[11px] font-black text-[#ffb700] leading-none">{agent.xp} PTS</p>
                </div>
              </div>

              <div className="space-y-1.5 mt-2">
                <InfoItem icon={<UserCheck size={12} />} label="ID CÉDULA" value={agent.id} />
                <InfoItem icon={<Fingerprint size={12} />} label="TALENTO" value={agent.talent} />
                <InfoItem icon={<Cake size={12} />} label="NACIMIENTO" value={agent.birthday || 'N/A'} />
                <InfoItem icon={<Phone size={12} />} label="WHATSAPP" value={agent.whatsapp || 'S/D'} />

                <div className="flex flex-col gap-1.5 border-t border-white/5 pt-2 mt-2">
                  <p className="text-[7px] text-gray-500 font-black uppercase tracking-widest flex items-center gap-1">
                    <Heart size={10} className="text-red-500" /> DIOS
                  </p>
                  <div className="h-12 overflow-y-auto no-scrollbar pr-1">
                    <p className="text-[10px] text-white/80 font-medium italic leading-[1.3]">
                      "{agent.relationshipWithGod || 'PROCESANDO...'}"
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {completedCourses.length > 0 && (
              <div className="px-6 py-2.5 z-10 bg-white/[0.02] border-t border-white/5">
                <div className="flex flex-wrap gap-1.5">
                  {completedCourses.slice(0, 3).map((title, i) => (
                    <span key={i} className="text-[7px] font-black uppercase bg-green-500/10 text-green-400 px-2.5 py-1 rounded-full border border-green-500/10">
                      ✅ {title}
                    </span>
                  ))}
                  {completedCourses.length > 3 && (
                    <span className="text-[7px] font-black text-gray-500 px-2 py-1">+{completedCourses.length - 3}</span>
                  )}
                </div>
              </div>
            )}

            <div className="bg-[#ffb700]/5 p-4 border-t border-white/5 mt-auto">
              <p className="text-[6px] text-[#ffb700]/60 font-medium uppercase tracking-[0.2em] text-center font-bebas leading-relaxed">
                Vivimos en un mundo que celebra lo superficial. Nosotros no somos de ese mundo.
              </p>
            </div>
          </div>

          {/* DORSO */}
          <div
            ref={backRef}
            className={`absolute inset-0 bg-[#000000] rounded-[2.5rem] border-2 border-[#ffb700]/30 shadow-2xl flex flex-col overflow-hidden transition-opacity duration-300 ${isFlipped ? 'opacity-100' : 'opacity-0'}`}
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              zIndex: isFlipped ? 10 : 0,
              transform: 'rotateY(180deg) translateZ(1px)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* TABS MOBILE / EXPORT MOBILE */}
            <div className="absolute top-4 right-4 z-50 flex gap-2 md:hidden">
              <button onClick={(e) => handleExport('back', 'download', e)} className="p-2 bg-[#ffb700]/20 rounded-full text-[#ffb700] border border-[#ffb700]/30 backdrop-blur-sm">
                <Download size={14} />
              </button>
            </div>

            <div className="flex w-full bg-[#111] border-b border-white/5">
              <button
                onClick={() => setBackTab('QR')}
                className={`flex-1 py-5 text-[11px] font-black uppercase tracking-[0.3em] transition-all font-bebas ${backTab === 'QR' ? 'text-[#ffb700] border-b-2 border-[#ffb700] bg-white/5' : 'text-gray-500 hover:text-white'}`}
              >
                CÓDIGO QR
              </button>
              <button
                onClick={() => setBackTab('INTEL')}
                className={`flex-1 py-5 text-[11px] font-black uppercase tracking-[0.3em] transition-all font-bebas ${backTab === 'INTEL' ? 'text-[#ffb700] border-b-2 border-[#ffb700] bg-white/5' : 'text-gray-500 hover:text-white'}`}
              >
                MÉTRICAS
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center p-6 justify-between relative">
              {/* Background watermark logo */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none">
                <Shield size={400} />
              </div>

              {backTab === 'QR' ? (
                <>
                  <div className="text-center mt-4">
                    <h3 className="text-[18px] font-bebas text-white uppercase tracking-[0.4em] mb-2">AUTENTICACIÓN TÁCTICA</h3>
                    <p className="text-[10px] text-[#ffb700] font-black tracking-[1em] uppercase opacity-60">ID AGENTE: {agent.id}</p>
                  </div>

                  <div className="relative p-6">
                    <div className="absolute inset-0 bg-[#ffb700] blur-3xl opacity-10 animate-pulse"></div>
                    <div className="relative p-6 bg-white rounded-[2.5rem] shadow-[0_0_60px_rgba(255,255,255,0.05)] border-4 border-white">
                      <img src={qrUrl} alt="QR" className="w-44 h-44" />
                    </div>
                  </div>

                  <div className="text-center px-6 mb-4">
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.4em] font-montserrat italic leading-relaxed">
                      Escanea para validación de acceso regional
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative w-full flex flex-col items-center mt-2">
                    <div className="mb-4">
                      {agent.tacticalStats ? (
                        <TacticalRadar stats={agent.tacticalStats} size={200} />
                      ) : (
                        <div className="w-[200px] h-[200px] border-2 border-dashed border-[#ffb700]/20 rounded-full flex flex-col items-center justify-center p-6 text-center">
                          <Sparkles size={32} className="text-[#ffb700] mb-3 opacity-30" />
                          <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Métricas Pendientes</p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleAIUpdate}
                      disabled={isUpdating}
                      className="absolute top-0 right-0 bg-[#ffb700] text-[#001f3f] p-3 rounded-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all z-50 flex items-center justify-center border-2 border-[#001f3f]/10"
                    >
                      {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    </button>
                  </div>

                  <div className="w-full bg-[#ffb700]/5 border border-[#ffb700]/20 rounded-3xl p-5 flex-1 overflow-hidden flex flex-col justify-center shadow-inner">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck size={12} className="text-[#ffb700]" />
                      <p className="text-[8px] text-[#ffb700] font-black uppercase tracking-[0.3em]">ANALÍTICA DE CAMPO:</p>
                    </div>
                    <div className="h-24 overflow-y-auto no-scrollbar pr-1">
                      <p className="text-[11px] text-white/90 font-bold leading-relaxed uppercase font-montserrat italic">
                        {agent.tacticalSummary || "A la espera de sincronización con el servidor central para generar reporte estratégico."}
                      </p>
                    </div>
                  </div>
                </>
              )}

              <div className="w-full pt-6 mt-4 border-t border-white/5 flex justify-between items-center opacity-30">
                <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest font-bebas">SISTEMA C26 // V1.0</p>
                <div className="flex items-center gap-1">
                  <Zap size={8} className="text-[#ffb700]" />
                  <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest font-bebas">
                    {agent.lastAiUpdate ? `SYNC: ${new Date(agent.lastAiUpdate).toLocaleDateString()}` : 'SYNC: PENDING'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoItem = ({ icon, label, value }: { icon: any, label: string, value: string }) => (
  <div className="flex items-center gap-3 border-b border-white/5 pb-2">
    <span className="text-[#ffb700] opacity-40 transform scale-90">{icon}</span>
    <div className="flex justify-between w-full items-center">
      <span className="text-[7px] text-gray-500 font-black uppercase tracking-widest">{label}</span>
      <span className="text-[10px] text-white font-bold uppercase truncate max-w-[150px] text-right drop-shadow-sm">{value}</span>
    </div>
  </div>
);

export default DigitalIdCard;
