import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Plus, Edit3, Trash2, Shield, User, Calendar, BookMarked, Sparkles, CheckCircle2, Lock, Eye, Search, Share2, Copy, MessageSquare, Award } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { Agent, UserRole } from '../types';
import { tacticalSound } from '../utils/soundEffects';

interface SharedNoteData {
  titulo: string;
  clase: string;
  versiculos?: string;
  contenido: string;
  puntosClave?: string[];
  esOficial?: boolean;
}

export interface SharedNoteItem {
  id: string;
  agent_id: string;
  agent_name: string;
  tipo: string;
  detalle: string; // JSON string of SharedNoteData
  registrado_en: string;
  sede_id?: string;
  parsedData?: SharedNoteData;
}

interface SharedClassNotesProps {
  currentUser: Agent;
  onActivity?: () => void;
}

export const SharedClassNotes: React.FC<SharedClassNotesProps> = ({ currentUser, onActivity }) => {
  const [notes, setNotes] = useState<SharedNoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'OFICIALES' | 'MIS_NOTAS'>('ALL');
  
  // Modal editor state
  const [showEditor, setShowEditor] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form fields
  const [titulo, setTitulo] = useState('');
  const [clase, setClase] = useState('');
  const [versiculos, setVersiculos] = useState('');
  const [contenido, setContenido] = useState('');
  const [puntosClaveInput, setPuntosClaveInput] = useState('');
  const [esOficial, setEsOficial] = useState(false);

  const isDirectorOrLeader = currentUser.userRole === UserRole.DIRECTOR || 
                             currentUser.userRole === UserRole.DIRECTOR_GENERAL || 
                             currentUser.userRole === UserRole.LEADER;

  useEffect(() => {
    loadNotes();

    // Suscripción Realtime para notas en vivo durante la clase
    const channel = supabase
      .channel('shared-notes-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'asistencia_visitas',
        filter: `tipo=eq.APUNTES_CLASE`
      }, () => {
        loadNotes(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadNotes = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('asistencia_visitas')
        .select('*')
        .eq('tipo', 'APUNTES_CLASE')
        .order('registrado_en', { ascending: false })
        .limit(60);

      if (error) throw error;

      const parsedNotes: SharedNoteItem[] = (data || []).map((item: any) => {
        let parsed: SharedNoteData = {
          titulo: 'Apuntes de Clase',
          clase: 'General',
          contenido: item.detalle || ''
        };
        try {
          if (item.detalle && item.detalle.startsWith('{')) {
            parsed = JSON.parse(item.detalle);
          }
        } catch {
          parsed.contenido = item.detalle;
        }
        return {
          ...item,
          parsedData: parsed
        };
      });

      setNotes(parsedNotes);
    } catch (err) {
      console.error('Error cargando apuntes compartidos:', err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingNoteId(null);
    setTitulo('');
    setClase('');
    setVersiculos('');
    setContenido('');
    setPuntosClaveInput('');
    setEsOficial(isDirectorOrLeader);
    setShowEditor(true);
    tacticalSound.playClick();
  };

  const handleOpenEdit = (note: SharedNoteItem) => {
    const data = note.parsedData;
    setEditingNoteId(note.id);
    setTitulo(data?.titulo || '');
    setClase(data?.clase || '');
    setVersiculos(data?.versiculos || '');
    setContenido(data?.contenido || '');
    setPuntosClaveInput((data?.puntosClave || []).join('\n'));
    setEsOficial(data?.esOficial || false);
    setShowEditor(true);
    tacticalSound.playClick();
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !contenido.trim()) {
      alert('Por favor completa el título y el contenido de los apuntes.');
      return;
    }

    setIsSaving(true);
    try {
      const puntosList = puntosClaveInput
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      const notePayload: SharedNoteData = {
        titulo: titulo.trim(),
        clase: clase.trim() || 'Clase General',
        versiculos: versiculos.trim() || undefined,
        contenido: contenido.trim(),
        puntosClave: puntosList.length > 0 ? puntosList : undefined,
        esOficial: isDirectorOrLeader ? esOficial : false
      };

      if (editingNoteId) {
        // Actualizar nota existente
        const { error } = await supabase
          .from('asistencia_visitas')
          .update({
            detalle: JSON.stringify(notePayload),
            registrado_en: new Date().toISOString()
          })
          .eq('id', editingNoteId);

        if (error) throw error;
        tacticalSound.playVictoryChime();
      } else {
        // Crear nueva nota
        const { error } = await supabase
          .from('asistencia_visitas')
          .insert({
            agent_id: currentUser.id,
            agent_name: currentUser.name,
            tipo: 'APUNTES_CLASE',
            detalle: JSON.stringify(notePayload),
            sede_id: currentUser.sedeId || 'SEDE-JESUS-ES-EL-CENTRO',
            registrado_en: new Date().toISOString()
          });

        if (error) throw error;
        tacticalSound.playVictoryChime();

        // Si es un estudiante, otorgar XP por tomar apuntes
        if (currentUser.userRole === UserRole.STUDENT) {
          try {
            await supabase.rpc('update_agent_points_secure', {
              p_agent_id: currentUser.id,
              p_type: 'APUNTES',
              p_amount: 1,
              p_streak_count: 0
            });
            if (onActivity) onActivity();
          } catch { /* no-op */ }
        }
      }

      setShowEditor(false);
      loadNotes();
    } catch (err: any) {
      console.error('Error guardando apuntes:', err);
      alert('Error guardando los apuntes: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar estos apuntes compartidos?')) return;
    try {
      const { error } = await supabase
        .from('asistencia_visitas')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
      setNotes(prev => prev.filter(n => n.id !== noteId));
      tacticalSound.playTrash();
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  const handleCopyNote = (note: SharedNoteItem) => {
    const data = note.parsedData;
    const text = `📖 APUNTES DE CLASE: ${data?.titulo?.toUpperCase()}\n👤 Autor: ${note.agent_name}\n📚 Clase: ${data?.clase}\n${data?.versiculos ? `📍 Citas Bíblicas: ${data.versiculos}\n` : ''}\n📝 CONTENIDO:\n${data?.contenido}\n\n📲 Consagrados 2026`;
    navigator.clipboard.writeText(text);
    setCopiedId(note.id);
    tacticalSound.playReactionPop();
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredNotes = notes.filter(n => {
    const data = n.parsedData;
    const matchesSearch = 
      n.agent_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      data?.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      data?.clase.toLowerCase().includes(searchQuery.toLowerCase()) ||
      data?.contenido.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (data?.versiculos && data.versiculos.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (activeFilter === 'OFICIALES') return data?.esOficial;
    if (activeFilter === 'MIS_NOTAS') return n.agent_id === currentUser.id;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header del Muro de Apuntes */}
      <div className="bg-gradient-to-r from-[#001428] via-[#001f3f] to-[#001428] border border-white/10 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
          <BookOpen size={200} className="text-white" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-[#ffb700]/10 border border-[#ffb700]/30 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-[#ffb700] font-bebas flex items-center gap-1.5">
                <Sparkles size={12} /> Espacio Colaborativo en Vivo
              </span>
              <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-cyan-300 font-bebas flex items-center gap-1.5">
                <Eye size={12} /> Lectura Abierta • Escritura Autorizada
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black uppercase text-white font-bebas tracking-wider leading-none">
              Anotaciones de Clases Compartidas
            </h2>
            <p className="text-xs text-white/60 font-montserrat mt-2 max-w-2xl leading-relaxed">
              Muro interactivo donde los estudiantes y maestros suben sus apuntes de doctrina y prédicas. Los líderes y autores pueden editar sus notas; todos los demás agentes tienen acceso de estudio en vivo.
            </p>
          </div>

          <button
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2.5 px-6 py-4 bg-[#ffb700] hover:bg-[#ffa000] text-[#001f3f] font-black font-bebas text-sm uppercase tracking-widest rounded-2xl shadow-[0_0_25px_rgba(255,183,0,0.3)] hover:scale-105 active:scale-95 transition-all self-start md:self-auto"
          >
            <Plus size={18} strokeWidth={3} />
            {isDirectorOrLeader ? 'Publicar Apunte de Clase' : 'Subir Mis Apuntes'}
          </button>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-white/5">
          <div className="sm:col-span-2 relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por tema, versículo, clase o autor..."
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#ffb700] font-montserrat"
            />
          </div>

          <div className="flex gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider font-bebas transition-all ${
                activeFilter === 'ALL' ? 'bg-[#ffb700] text-[#001f3f]' : 'text-white/40 hover:text-white'
              }`}
            >
              Todos ({notes.length})
            </button>
            <button
              onClick={() => setActiveFilter('OFICIALES')}
              className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider font-bebas transition-all ${
                activeFilter === 'OFICIALES' ? 'bg-[#ffb700] text-[#001f3f]' : 'text-white/40 hover:text-white'
              }`}
            >
              ⭐ Oficiales
            </button>
            <button
              onClick={() => setActiveFilter('MIS_NOTAS')}
              className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider font-bebas transition-all ${
                activeFilter === 'MIS_NOTAS' ? 'bg-[#ffb700] text-[#001f3f]' : 'text-white/40 hover:text-white'
              }`}
            >
              👤 Mis Notas
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Apuntes */}
      {isLoading ? (
        <div className="p-12 text-center">
          <div className="w-10 h-10 border-4 border-[#ffb700]/20 border-t-[#ffb700] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-white/40 uppercase tracking-widest font-bebas">Sincronizando notas en vivo...</p>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="p-12 text-center bg-black/20 border border-white/5 rounded-3xl">
          <BookMarked size={48} className="text-white/20 mx-auto mb-3" />
          <h3 className="text-lg font-black uppercase text-white font-bebas tracking-wide">No hay anotaciones aún</h3>
          <p className="text-xs text-white/40 font-montserrat mt-1">Sé el primero en subir los apuntes de la clase de hoy.</p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-xs font-bebas uppercase tracking-wider transition-all"
          >
            + Escribir Apuntes
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNotes.map((note) => {
            const data = note.parsedData;
            const canEdit = isDirectorOrLeader || note.agent_id === currentUser.id;
            const isAuthor = note.agent_id === currentUser.id;

            return (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 rounded-3xl border transition-all flex flex-col justify-between ${
                  data?.esOficial
                    ? 'bg-gradient-to-b from-[#001933] to-[#000d1a] border-[#ffb700]/30 shadow-[0_4px_25px_rgba(255,183,0,0.08)]'
                    : isAuthor
                    ? 'bg-[#001222] border-cyan-500/30'
                    : 'bg-black/30 border-white/10 hover:border-white/20'
                }`}
              >
                <div>
                  {/* Top Bar: Autor, Fecha y Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black font-bebas ${
                        data?.esOficial 
                          ? 'bg-[#ffb700] text-[#001f3f]' 
                          : 'bg-white/10 text-white'
                      }`}>
                        {data?.esOficial ? <Shield size={14} /> : <User size={14} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white font-montserrat">
                            {note.agent_name}
                          </span>
                          {data?.esOficial && (
                            <span className="text-[8px] font-black uppercase text-[#ffb700] bg-[#ffb700]/10 border border-[#ffb700]/30 px-1.5 py-0.5 rounded font-bebas">
                              OFICIAL MAESTRO
                            </span>
                          )}
                          {isAuthor && !data?.esOficial && (
                            <span className="text-[8px] font-black uppercase text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-1.5 py-0.5 rounded font-bebas">
                              TÚ
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-white/40 flex items-center gap-1 font-montserrat">
                          <Calendar size={10} /> {new Date(note.registrado_en).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Badge de Clase */}
                    <span className="text-[9px] font-bold text-white/60 bg-white/5 border border-white/10 px-2 py-1 rounded-lg font-montserrat max-w-[120px] truncate">
                      {data?.clase}
                    </span>
                  </div>

                  {/* Título de los apuntes */}
                  <h3 className="text-lg font-black uppercase text-white font-bebas tracking-wide mb-2 leading-tight">
                    {data?.titulo}
                  </h3>

                  {/* Versículos / Pasajes Clave */}
                  {data?.versiculos && (
                    <div className="mb-3 inline-flex items-center gap-1.5 px-3 py-1 bg-[#ffb700]/10 border border-[#ffb700]/20 rounded-xl text-[10px] font-black text-[#ffb700] uppercase font-bebas">
                      <BookMarked size={12} /> {data.versiculos}
                    </div>
                  )}

                  {/* Puntos Clave del Bosquejo */}
                  {data?.puntosClave && data.puntosClave.length > 0 && (
                    <div className="mb-4 bg-black/40 border border-white/5 rounded-2xl p-3 space-y-1.5">
                      <span className="text-[8px] font-black uppercase tracking-widest text-[#ffb700] font-bebas block mb-1">
                        📌 Puntos Clave de la Clase:
                      </span>
                      {data.puntosClave.map((punto, pIdx) => (
                        <div key={pIdx} className="flex items-start gap-2 text-xs text-white/80 font-montserrat">
                          <span className="text-[#ffb700] font-bold text-[10px]">•</span>
                          <span>{punto}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Contenido / Reflexión de la clase */}
                  <p className="text-xs text-white/70 font-montserrat leading-relaxed whitespace-pre-line mb-4 line-clamp-6">
                    {data?.contenido}
                  </p>
                </div>

                {/* Footer de Acciones y Permisos */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyNote(note)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/70 hover:text-white text-[10px] font-bebas uppercase tracking-wider flex items-center gap-1.5 transition-all"
                    >
                      <Copy size={12} />
                      {copiedId === note.id ? '¡Copiado!' : 'Copiar'}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {canEdit ? (
                      <>
                        <button
                          onClick={() => handleOpenEdit(note)}
                          className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-xl text-[10px] font-bebas uppercase tracking-wider flex items-center gap-1.5 transition-all"
                          title="Editar tus apuntes"
                        >
                          <Edit3 size={12} /> Editar
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl transition-all"
                          title="Eliminar apuntes"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-white/30 bg-white/5 px-2.5 py-1 rounded-lg font-montserrat">
                        <Lock size={10} /> Solo Lectura
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal Editor de Apuntes */}
      <AnimatePresence>
        {showEditor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#001020] border border-white/15 rounded-3xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#ffb700]/10 border border-[#ffb700]/30 flex items-center justify-center text-[#ffb700]">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase text-white font-bebas tracking-wide">
                      {editingNoteId ? 'Editar Anotaciones de Clase' : 'Subir Nuevos Apuntes de Clase'}
                    </h3>
                    <p className="text-[10px] text-white/50 font-montserrat">
                      {isDirectorOrLeader ? 'Modo de Mando: Puedes publicar apuntes oficiales del maestro.' : 'Tus apuntes serán visibles para el grupo de estudio.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditor(false)}
                  className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveNote} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-[#ffb700] font-bebas block mb-1.5">
                      📖 Título del Tema / Prédica *
                    </label>
                    <input
                      type="text"
                      required
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      placeholder="Ej: El Poder de la Oración de Fe"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#ffb700] font-montserrat"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-[#ffb700] font-bebas block mb-1.5">
                      📚 Nombre de la Clase / Módulo
                    </label>
                    <input
                      type="text"
                      value={clase}
                      onChange={(e) => setClase(e.target.value)}
                      placeholder="Ej: Clase 01 - Fundamentos"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#ffb700] font-montserrat"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#ffb700] font-bebas block mb-1.5">
                    📍 Citas Bíblicas / Pasajes Clave
                  </label>
                  <input
                    type="text"
                    value={versiculos}
                    onChange={(e) => setVersiculos(e.target.value)}
                    placeholder="Ej: Hebreos 11:1, Santiago 1:5-8, Efesios 6:10-18"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#ffb700] font-montserrat"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#ffb700] font-bebas block mb-1.5">
                    📌 Puntos Principales del Bosquejo (1 por línea)
                  </label>
                  <textarea
                    rows={3}
                    value={puntosClaveInput}
                    onChange={(e) => setPuntosClaveInput(e.target.value)}
                    placeholder="1. La fe no es pasiva, es acción.\n2. La oración sin dudar abre cielos.\n3. Perseverancia diaria en la palabra."
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#ffb700] font-montserrat leading-relaxed"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#ffb700] font-bebas block mb-1.5">
                    📝 Contenido de Apuntes, Explicación y Aplicación *
                  </label>
                  <textarea
                    rows={6}
                    required
                    value={contenido}
                    onChange={(e) => setContenido(e.target.value)}
                    placeholder="Escribe aquí las enseñanzas clave, notas tomadas durante la clase, revelaciones y tu aplicación personal..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#ffb700] font-montserrat leading-relaxed resize-y"
                  />
                </div>

                {isDirectorOrLeader && (
                  <div className="flex items-center gap-3 p-4 bg-[#ffb700]/10 border border-[#ffb700]/30 rounded-2xl">
                    <input
                      type="checkbox"
                      id="oficialToggle"
                      checked={esOficial}
                      onChange={(e) => setEsOficial(e.target.checked)}
                      className="w-4 h-4 rounded text-[#ffb700] focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="oficialToggle" className="text-xs text-white font-bold font-montserrat cursor-pointer">
                      ⭐ Marcar como "Apunte Oficial del Maestro / Mando Central"
                    </label>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowEditor(false)}
                    className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-bebas text-sm uppercase tracking-wider transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-3.5 bg-[#ffb700] hover:bg-[#ffa000] text-[#001f3f] font-black font-bebas text-sm uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(255,183,0,0.3)] transition-all flex items-center justify-center gap-2"
                  >
                    {isSaving ? 'Guardando...' : editingNoteId ? 'Actualizar Apuntes' : 'Publicar en el Muro'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SharedClassNotes;
