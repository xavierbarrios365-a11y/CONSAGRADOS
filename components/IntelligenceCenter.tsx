import React, { useState } from 'react';
import { Agent, UserRole, AppView } from '../types';
import { Shield, Zap, Book, FileText, Star, Activity, Target, RotateCcw, Trash2, Database, AlertCircle, RefreshCw, BookOpen } from 'lucide-react';
import { formatDriveUrl } from './DigitalIdCard';
import { reconstructDatabase } from '../services/sheetsService';

interface CIUProps {
  agents: Agent[];
  currentUser: Agent | null;
  onUpdateNeeded?: () => void;
  intelReport?: string;
  setView?: (view: AppView) => void;
}

const IntelligenceCenter: React.FC<CIUProps> = ({ agents, currentUser, onUpdateNeeded, intelReport, setView }) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agents[0]?.id || '');
  const [isReconstructing, setIsReconstructing] = useState(false);
  const agent = agents.find(a => String(a.id).trim() === String(selectedAgentId).trim()) || agents[0];

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

  return (
    <div className="min-h-full bg-[#001f3f] p-4 md:p-8 animate-in fade-in duration-700">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* PANEL DE CONTROL DE ALTO MANDO */}
        {currentUser?.userRole === UserRole.DIRECTOR && (
          <div className="bg-[#ffb700]/5 border border-[#ffb700]/20 rounded-[2.5rem] p-6 mb-8 backdrop-blur-md">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#ffb700] rounded-2xl shadow-lg">
                  <Shield className="text-[#001f3f]" size={24} />
                </div>
                <div>
                  <h3 className="text-white font-black text-sm uppercase tracking-widest leading-none mb-1 font-bebas">Mando de Operaciones</h3>
                  <p className="text-[9px] text-[#ffb700]/80 font-bold uppercase tracking-[0.2em] font-montserrat">Sincronización de Base de Datos</p>
                </div>
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                {setView && (
                  <button
                    onClick={() => setView(AppView.CONTENT)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-5 bg-white/5 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all border border-white/10 active:scale-95 font-bebas"
                  >
                    <BookOpen size={18} className="text-[#ffb700]" />
                    Gestionar Material
                  </button>
                )}
                <button
                  onClick={handleImportInscriptions}
                  disabled={isReconstructing}
                  className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-5 bg-[#ffb700] text-[#001f3f] text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-[#ffb700]/90 transition-all shadow-xl active:scale-95 disabled:opacity-50 font-bebas"
                >
                  <RefreshCw size={18} className={isReconstructing ? "animate-spin" : ""} />
                  Actualizar Directorio (Auto-Scrape)
                </button>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 px-2">
              <AlertCircle size={10} className="text-[#ffb700]/50" />
              <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest italic font-montserrat">
                Nota: Este botón busca nuevas filas en la pestaña 'INSCRIPCIONES' y las pasa a 'DIRECTORIO_OFICIAL' automáticamente.
              </p>
            </div>
          </div>
        )}

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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* PERFIL DEL AGENTE SELECCIONADO */}
          <div className="lg:col-span-4 space-y-6">
            <div className="relative bg-[#001833] border-2 border-[#ffb700]/20 rounded-[3rem] p-10 flex flex-col items-center text-center shadow-2xl overflow-hidden font-montserrat">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#ffb700] to-transparent opacity-50"></div>

              <div className="relative mb-8 group">
                <div className="absolute inset-0 bg-[#ffb700] rounded-[3.5rem] blur-2xl opacity-10"></div>
                <div className="w-52 h-52 rounded-[3.5rem] border-4 border-white/5 p-2 bg-[#000c19] shadow-inner">
                  <img
                    src={formatDriveUrl(agent.photoUrl)}
                    className="w-full h-full rounded-[2.8rem] object-cover grayscale hover:grayscale-0 transition-all duration-700"
                    onError={(e) => e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}
                  />
                </div>
              </div>

              <div className="space-y-4 z-10 w-full">
                <h2 className="text-3xl font-bebas font-black text-white uppercase tracking-tight leading-none">{agent.name.split(' ')[0]}</h2>
                <div className="inline-flex items-center gap-3 bg-[#ffb700]/10 border border-[#ffb700]/30 px-6 py-2 rounded-xl">
                  <span className="text-[#ffb700] font-black text-[10px] uppercase tracking-[0.3em] font-bebas">{agent.rank}</span>
                </div>
              </div>

              <div className="mt-10 w-full grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-5 rounded-3xl border border-white/5 text-left">
                  <p className="text-[7px] text-white/40 font-black uppercase mb-1">ID AGENTE</p>
                  <p className="text-[10px] font-mono text-[#ffb700] font-bold">{agent.id}</p>
                </div>
                <div className="bg-white/5 p-5 rounded-3xl border border-white/5 text-left">
                  <p className="text-[7px] text-white/40 font-black uppercase mb-1">ESTADO</p>
                  <p className="text-[10px] font-black text-green-400 uppercase flex items-center gap-2 font-bebas">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                    {agent.status}
                  </p>
                </div>
              </div>
            </div>

            {/* REPORTE TÁCTICO DE IA */}
            <div className="bg-[#001833] border border-[#ffb700]/20 rounded-[3rem] p-10 relative overflow-hidden shadow-2xl group font-montserrat">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Activity size={120} className="text-[#ffb700]" />
              </div>

              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-[#ffb700] rounded-full animate-pulse"></div>
                  <h3 className="text-[10px] text-[#ffb700]/80 font-black uppercase tracking-[0.4em] font-bebas">SISTEMA ANALÍTICO V37 // LIVE INTEL</h3>
                </div>

                <div className="bg-black/40 border border-white/5 rounded-2xl p-6 font-mono text-[11px] leading-relaxed text-[#f4f4f4]/80 backdrop-blur-sm shadow-inner">
                  <div className="flex gap-3 items-start">
                    <span className="text-[#ffb700] animate-pulse font-bold mt-1 font-bebas">{" >> "}</span>
                    <p className="whitespace-pre-wrap lowercase tracking-wider">
                      {intelReport || "INICIALIZANDO PROTOCOLOS DE ANÁLISIS... ESPERANDO DATOS NOMINALES."}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center opacity-40">
                  <div className="flex gap-4">
                    <div className="h-1 w-8 bg-[#ffb700]/30 rounded-full"></div>
                    <div className="h-1 w-12 bg-[#ffb700]/30 rounded-full"></div>
                    <div className="h-1 w-4 bg-[#ffb700]/30 rounded-full"></div>
                  </div>
                  <p className="text-[7px] font-black text-white/20 uppercase tracking-widest font-montserrat text-right">ENCRIPTACIÓN NIVEL 7 ACTIVA</p>
                </div>
              </div>
            </div>
          </div>

          {/* PANEL DE MÉTRICAS DETALLADAS */}
          <div className="lg:col-span-8 space-y-6 font-montserrat">
            <div className="bg-[#001833] border border-white/5 rounded-[3rem] p-10 relative overflow-hidden group shadow-2xl">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Zap size={16} className="text-[#ffb700]" />
                    <p className="text-[11px] text-gray-500 font-black uppercase tracking-widest font-bebas">Experiencia Operativa</p>
                  </div>
                  <p className="text-7xl font-bebas font-black text-white tracking-[0.05em] drop-shadow-[0_10px_20px_rgba(255,183,0,0.2)]">
                    {agent.xp} <span className="text-[#ffb700] text-3xl uppercase ml-2">XP</span>
                  </p>
                </div>
              </div>
              <div className="relative h-4 bg-[#000c19] rounded-full overflow-hidden p-0.5 border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-[#ffb700] to-orange-500 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(100, (agent.xp / 1500) * 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard icon={<Book className="text-[#ffb700]" />} label="BIBLIA" value={agent.bible} color="from-[#ffb700] to-orange-600" />
              <MetricCard icon={<FileText className="text-gray-400" />} label="APUNTES" value={agent.notes} color="from-gray-400 to-gray-600" />
              <MetricCard icon={<Star className="text-[#ffb700]" />} label="LIDERAZGO" value={agent.leadership} color="from-[#ffb700] to-orange-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ icon, label, value, color }: { icon: any, label: string, value: number, color: string }) => (
  <div className="bg-[#001833] border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden group hover:border-[#ffb700]/20 transition-colors font-montserrat">
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
          {icon}
        </div>
        <p className="text-[10px] text-white/40 font-black uppercase tracking-widest leading-tight font-bebas">{label}</p>
      </div>
      <div className="flex items-end gap-2">
        <p className="text-5xl font-bebas font-black text-white tracking-[0.05em] drop-shadow-[0_5px_15px_rgba(255,255,255,0.1)]">{value}</p>
        <p className="text-[10px] text-white/20 font-black uppercase mb-2 tracking-widest font-bebas">PTS</p>
      </div>
      <div className="w-full h-2 bg-[#000c19] rounded-full overflow-hidden border border-white/5">
        <div className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-1000`} style={{ width: `${Math.min(100, value)}%` }}></div>
      </div>
    </div>
  </div>
);

export default IntelligenceCenter;