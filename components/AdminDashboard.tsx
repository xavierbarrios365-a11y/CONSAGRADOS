import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Agent, UserRole } from '../types';
import { supabase } from '../services/supabaseClient';
import { Search, Save, X, RefreshCw, ShieldAlert, AlertTriangle, ShieldCheck, DatabaseBackup, BookOpen, Clock, Users, Flame } from 'lucide-react';

interface AdminDashboardProps {
    currentUser: Agent | null;
    onClose: () => void;
    onRefreshGlobalData: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onClose, onRefreshGlobalData }) => {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchAgents();
    }, []);

    const fetchAgents = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('agentes')
                .select('id, nombre, xp, rango, cargo, foto_url, is_ai_profile_pending, tactical_stats, tactor_summary, pin, whatsapp, birthday, status, user_role, talent, baptism_status, relationship_with_god, streak_count, cedula, email, telegram, redes_sociales, sede_id')
                .order('nombre', { ascending: true });
            if (error) throw error;

            if (data) {
                const mappedAgentes: Agent[] = data.map((d: any) => ({
                    id: d.id,
                    name: d.nombre,
                    xp: d.xp,
                    rank: d.rango,
                    role: d.cargo,
                    whatsapp: d.whatsapp,
                    photoUrl: d.foto_url,
                    // Mapeo detallado de campos adicionales
                    birthday: d.birthday || '',
                    status: d.status || 'ACTIVO',
                    userRole: d.user_role || UserRole.STUDENT,
                    talent: d.talent || '',
                    baptismStatus: d.baptism_status || 'NO',
                    relationshipWithGod: d.relationship_with_god || '',
                    pin: d.pin || '',
                    // Campos de identidad
                    cedula: d.cedula || '',
                    email: d.email || '',
                    telegram: d.telegram || '',
                    redesSociales: d.redes_sociales || '',
                    sedeId: d.sede_id || '',
                    // Defaults for remaining structure
                    idSignature: `V37-SIG-${d.id}`,
                    joinedDate: d.joined_date || '',
                    streakCount: d.streak_count || 0,
                    bible: d.bible || 0,
                    notes: d.notes || 0,
                    leadership: d.leadership || 0,
                    mustChangePassword: d.must_change_password || false
                }));
                setAgents(mappedAgentes);
            }
        } catch (err) {
            console.error('Error fetching agents for admin:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!editingAgent) return;
        setIsSaving(true);
        try {
            const updatePayload: any = {
                nombre: editingAgent.name || null,
                xp: editingAgent.xp ?? 0,
                rango: editingAgent.rank || null,
                cargo: editingAgent.role || null,
                whatsapp: editingAgent.whatsapp || null,
                pin: editingAgent.pin || null,
                foto_url: editingAgent.photoUrl || null,
                birthday: editingAgent.birthday || null,
                status: editingAgent.status || null,
                user_role: editingAgent.userRole || null,
                talent: editingAgent.talent || null,
                baptism_status: editingAgent.baptismStatus || null,
                relationship_with_god: editingAgent.relationshipWithGod || null,
                streak_count: editingAgent.streakCount ?? null,
                sede_id: editingAgent.sedeId || 'SEDE-JESUS-ES-EL-CENTRO'
            };
            if (editingAgent.cedula) updatePayload.cedula = editingAgent.cedula;
            if (editingAgent.email) updatePayload.email = editingAgent.email;
            if (editingAgent.telegram) updatePayload.telegram = editingAgent.telegram;
            if (editingAgent.redesSociales) updatePayload.redes_sociales = editingAgent.redesSociales;

            const { error } = await supabase.from('agentes').update(updatePayload).eq('id', editingAgent.id);
            if (error) throw error;

            // Update local state
            setAgents(agents.map(a => a.id === editingAgent.id ? editingAgent : a));
            setEditingAgent(null);
            // Trigger global refresh so app stays in sync
            onRefreshGlobalData();
        } catch (err: any) {
            console.error('Error saving agent:', err);
            alert(`Error guardando cambios: ${err.message || 'Error desconocido'}`);
        } finally {
            setIsSaving(false);
        }
    };


    const isDirectorOrHigher = currentUser?.userRole === UserRole.DIRECTOR || currentUser?.userRole === UserRole.DIRECTOR_GENERAL || currentUser?.id === 'CON-1011';
    if (!isDirectorOrHigher) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center animate-in slide-in-from-bottom-4">
                <ShieldAlert size={64} className="text-red-500 mb-4 animate-pulse" />
                <h2 className="text-2xl font-black text-white font-bebas uppercase tracking-widest mb-2">ACCESO DENEGADO</h2>
                <p className="text-[10px] text-white/60 font-montserrat uppercase tracking-wider">Autorización de nivel DIRECTOR requerida.</p>
                <button onClick={onClose} className="mt-8 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                    Cerrar
                </button>
            </div>
        );
    }

    const filteredAgents = agents.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.id.includes(searchQuery));

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto font-montserrat pb-10">

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-black text-white font-bebas uppercase tracking-widest flex items-center gap-3">
                        <ShieldCheck className="text-[#ffb700]" /> COMANDO CENTRAL
                    </h2>
                    <p className="text-[10px] text-[#ffb700]/70 uppercase tracking-widest font-bold">Nivel de Acceso: DIRECTOR</p>
                </div>
                <button onClick={onClose} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-all">
                    <X size={20} className="text-white" />
                </button>
            </div>

            <div className="bg-[#001833] border border-[#ffb700]/30 rounded-3xl p-6 shadow-[0_0_30px_rgba(255,183,0,0.05)]">
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                        <input
                            type="text"
                            placeholder="BUSCAR AGENTE TÁCTICO..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-[12px] text-white font-bold uppercase tracking-wider placeholder:text-white/20 focus:outline-none focus:border-[#ffb700]/50 transition-all font-montserrat"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={fetchAgents} className="px-6 py-4 bg-white/5 border border-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-all">
                            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} /> REFRESCAR BD
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center p-12">
                        <RefreshCw size={32} className="text-[#ffb700] animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                        {filteredAgents.map(agent => (
                            <div key={agent.id} className="p-4 bg-black/20 border border-white/5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">

                                {editingAgent?.id === agent.id ? (
                                    <div className="flex-1 space-y-4 w-full">
                                        {/* HEADER CON ID DEL AGENTE */}
                                        <div className="flex items-center gap-3 pb-2 border-b border-[#ffb700]/20">
                                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">ID:</span>
                                            <span className="text-xs font-black text-[#ffb700] font-bebas tracking-wider">{editingAgent.id}</span>
                                        </div>

                                        {/* FILA 1: DATOS BÁSICOS */}
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                            <div>
                                                <label className="text-[8px] font-black text-[#ffb700] uppercase tracking-widest block mb-1">📛 Nombre Completo</label>
                                                <input type="text" value={editingAgent.name} onChange={e => setEditingAgent({ ...editingAgent, name: e.target.value })} className="w-full bg-black/40 border border-[#ffb700]/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ffb700]" />
                                            </div>
                                            <div>
                                                <label className="text-[8px] font-black text-[#ffb700] uppercase tracking-widest block mb-1">⭐ Puntos XP</label>
                                                <input type="number" value={editingAgent.xp} onChange={e => setEditingAgent({ ...editingAgent, xp: parseInt(e.target.value) || 0 })} className="w-full bg-black/40 border border-[#ffb700]/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ffb700]" />
                                            </div>
                                            <div>
                                                <label className="text-[8px] font-black text-[#ffb700] uppercase tracking-widest block mb-1">🎖️ Rango</label>
                                                <select value={editingAgent.rank} onChange={e => setEditingAgent({ ...editingAgent, rank: e.target.value })} className="w-full bg-black/40 border border-[#ffb700]/30 rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none focus:border-[#ffb700]">
                                                    <option value="RECLUTA">RECLUTA</option>
                                                    <option value="ACTIVO">ACTIVO</option>
                                                    <option value="CONSAGRADO">CONSAGRADO</option>
                                                    <option value="REFERENTE">REFERENTE</option>
                                                    <option value="LÍDER">LÍDER</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[8px] font-black text-[#ffb700] uppercase tracking-widest block mb-1">👤 Cargo / Rol</label>
                                                <select value={editingAgent.role} onChange={e => setEditingAgent({ ...editingAgent, role: e.target.value })} className="w-full bg-black/40 border border-[#ffb700]/30 rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none focus:border-[#ffb700]">
                                                    <option value="ESTUDIANTE">ESTUDIANTE</option>
                                                    <option value="LÍDER">LÍDER</option>
                                                    <option value="DIRECTOR">DIRECTOR</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* FILA 2: CONTACTO Y ACCESO */}
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                            <div>
                                                <label className="text-[8px] font-black text-green-400 uppercase tracking-widest block mb-1">📱 WhatsApp</label>
                                                <input type="text" value={editingAgent.whatsapp || ''} onChange={e => setEditingAgent({ ...editingAgent, whatsapp: e.target.value })} className="w-full bg-black/40 border border-green-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-green-500" />
                                            </div>
                                            <div>
                                                <label className="text-[8px] font-black text-red-400 uppercase tracking-widest block mb-1">🔑 PIN / Contraseña</label>
                                                <input type="text" value={editingAgent.pin || ''} onChange={e => setEditingAgent({ ...editingAgent, pin: e.target.value })} className="w-full bg-black/40 border border-red-500/30 rounded-xl px-3 py-2 text-xs text-red-300 font-bold focus:outline-none focus:border-red-500" />
                                            </div>
                                            <div>
                                                <label className="text-[8px] font-black text-white/60 uppercase tracking-widest block mb-1">🎂 Cumpleaños</label>
                                                <input type="text" value={editingAgent.birthday || ''} onChange={e => setEditingAgent({ ...editingAgent, birthday: e.target.value })} className="w-full bg-black/40 border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/40" placeholder="YYYY-MM-DD" />
                                            </div>
                                            <div>
                                                <label className="text-[8px] font-black text-white/60 uppercase tracking-widest block mb-1">📊 Estado</label>
                                                <select value={editingAgent.status} onChange={e => setEditingAgent({ ...editingAgent, status: e.target.value as any })} className="w-full bg-black/40 border border-white/20 rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none focus:border-white/40">
                                                    <option value="ACTIVO">ACTIVO</option>
                                                    <option value="INACTIVO">INACTIVO</option>
                                                    <option value="SANCIONADO">SANCIONADO</option>
                                                    <option value="OCULTO">OCULTO (PERFIL TEST)</option>
                                                    <option value="ELIMINADO">ELIMINADO</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* FILA 3: PERFIL ESPIRITUAL */}
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                            <div>
                                                <label className="text-[8px] font-black text-purple-400 uppercase tracking-widest block mb-1">🎯 Talento</label>
                                                <input type="text" value={editingAgent.talent || ''} onChange={e => setEditingAgent({ ...editingAgent, talent: e.target.value })} className="w-full bg-black/40 border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500" />
                                            </div>
                                            <div>
                                                <label className="text-[8px] font-black text-purple-400 uppercase tracking-widest block mb-1">💧 Bautismo</label>
                                                <select value={editingAgent.baptismStatus} onChange={e => setEditingAgent({ ...editingAgent, baptismStatus: e.target.value as any })} className="w-full bg-black/40 border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none focus:border-purple-500">
                                                    <option value="SI">SI BAUTIZADO</option>
                                                    <option value="NO">NO BAUTIZADO</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[8px] font-black text-purple-400 uppercase tracking-widest block mb-1">🙏 Relación con Dios</label>
                                                <input type="text" value={editingAgent.relationshipWithGod || ''} onChange={e => setEditingAgent({ ...editingAgent, relationshipWithGod: e.target.value })} className="w-full bg-black/40 border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500" />
                                            </div>
                                            <div>
                                                <label className="text-[8px] font-black text-white/60 uppercase tracking-widest block mb-1">📸 Foto de Perfil</label>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    id={`avatar-upload-${editingAgent.id}`}
                                                    className="hidden"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        setIsSaving(true);
                                                        try {
                                                            const fileExt = file.name.split('.').pop();
                                                            const fileName = `${editingAgent.id}-${Math.random()}.${fileExt}`;
                                                            const { data, error } = await supabase.storage.from('avatars').upload(fileName, file);
                                                            if (error) {
                                                                throw error;
                                                            }
                                                            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
                                                            setEditingAgent({ ...editingAgent, photoUrl: publicUrl });
                                                        } catch (err: any) {
                                                            alert('Error subiendo imagen. Verifica si el bucket "avatars" existe en Supabase y es público.');
                                                        } finally {
                                                            setIsSaving(false);
                                                        }
                                                    }}
                                                />
                                                <label htmlFor={`avatar-upload-${editingAgent.id}`} className="flex items-center justify-center gap-2 w-full bg-white/5 border border-white/10 hover:bg-[#ffb700]/20 hover:text-[#ffb700] hover:border-[#ffb700]/50 transition-all rounded-xl px-3 py-2 text-xs text-white cursor-pointer uppercase font-bold tracking-wider">
                                                    {editingAgent.photoUrl ? '📷 Cambiar Foto' : '📷 Subir Foto'}
                                                </label>
                                            </div>
                                        </div>

                                        {/* FILA 4: IDENTIDAD (CÉDULA, EMAIL, ETC.) */}
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 border-t border-cyan-500/20 pt-3">
                                            <div>
                                                <label className="text-[8px] font-black text-cyan-400 uppercase tracking-widest block mb-1">🪪 Cédula de Identidad</label>
                                                <input type="text" value={editingAgent.cedula || ''} onChange={e => setEditingAgent({ ...editingAgent, cedula: e.target.value })} className="w-full bg-black/40 border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-cyan-300 focus:outline-none focus:border-cyan-500" />
                                            </div>
                                            <div>
                                                <label className="text-[8px] font-black text-cyan-400 uppercase tracking-widest block mb-1">📧 Correo Electrónico</label>
                                                <input type="email" value={editingAgent.email || ''} onChange={e => setEditingAgent({ ...editingAgent, email: e.target.value })} className="w-full bg-black/40 border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-cyan-300 focus:outline-none focus:border-cyan-500" />
                                            </div>
                                            <div>
                                                <label className="text-[8px] font-black text-cyan-400 uppercase tracking-widest block mb-1">✈️ Telegram</label>
                                                <input type="text" value={editingAgent.telegram || ''} onChange={e => setEditingAgent({ ...editingAgent, telegram: e.target.value })} className="w-full bg-black/40 border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-cyan-300 focus:outline-none focus:border-cyan-500" />
                                            </div>
                                            <div>
                                                <label className="text-[8px] font-black text-cyan-400 uppercase tracking-widest block mb-1">🌐 Redes Sociales</label>
                                                <input type="text" value={editingAgent.redesSociales || ''} onChange={e => setEditingAgent({ ...editingAgent, redesSociales: e.target.value })} className="w-full bg-black/40 border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-cyan-300 focus:outline-none focus:border-cyan-500" />
                                            </div>
                                        </div>

                                        {/* FILA 5: RACHA */}
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 border-t border-orange-500/20 pt-3">
                                            <div>
                                                <label className="text-[8px] font-black text-orange-400 uppercase tracking-widest block mb-1">🔥 Días de Racha</label>
                                                <div className="relative">
                                                    <Flame size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500" />
                                                    <input type="number" min="0" value={editingAgent.streakCount ?? 0} onChange={e => setEditingAgent({ ...editingAgent, streakCount: parseInt(e.target.value) || 0 })} className="w-full bg-black/40 border border-orange-500/30 rounded-xl pl-8 pr-3 py-2 text-xs text-orange-400 font-bold focus:outline-none focus:border-orange-500" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* BOTONES GUARDAR / CANCELAR */}
                                        <div className="flex gap-2 w-full md:w-1/3 pt-2">
                                            <button onClick={handleSave} disabled={isSaving} className="flex-1 bg-green-500/20 border border-green-500/30 text-green-500 rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 hover:bg-green-500/30 text-xs font-bold uppercase tracking-wider">
                                                {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                                Guardar
                                            </button>
                                            <button onClick={() => setEditingAgent(null)} className="flex-1 bg-red-500/20 border border-red-500/30 text-red-500 rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 hover:bg-red-500/30 text-xs font-bold uppercase tracking-wider">
                                                <X size={14} />
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-[#ffb700]/10 border border-[#ffb700]/30 flex items-center justify-center text-[#ffb700] text-xs font-black">
                                                {agent.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white tracking-wider">{agent.name}</p>
                                                <p className="text-[9px] text-white/50 uppercase tracking-widest">{agent.id} • {agent.xp} XP</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[8px] bg-white/5 px-2 py-1 rounded border border-white/10 text-white/60">{agent.rank}</span>
                                            {agent.status === 'OCULTO' ? (
                                                <button
                                                    onClick={async () => {
                                                        const { error } = await supabase.from('agentes').update({ status: 'ACTIVO' }).eq('id', agent.id);
                                                        if (!error) fetchAgents();
                                                    }}
                                                    className="px-4 py-2 bg-green-500/10 border border-green-500/30 text-green-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-green-500/20 transition-all"
                                                >
                                                    RESTAURAR
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={async () => {
                                                        if (confirm(`¿Ocultar perfil de ${agent.name}? Se eliminará de todos los rankings y el chat global.`)) {
                                                            const { error } = await supabase.from('agentes').update({ status: 'OCULTO' }).eq('id', agent.id);
                                                            if (!error) fetchAgents();
                                                        }
                                                    }}
                                                    className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
                                                >
                                                    OCULTAR
                                                </button>
                                            )}
                                            <button onClick={() => setEditingAgent(agent)} className="px-4 py-2 bg-[#ffb700]/10 border border-[#ffb700]/30 text-[#ffb700] rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#ffb700]/20 transition-all">
                                                EDITAR
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                        {filteredAgents.length === 0 && (
                            <div className="text-center p-8 text-white/40 text-[10px] font-black uppercase tracking-widest">
                                NINGÚN AGENTE COINCIDE CON LA BÚSQUEDA
                            </div>
                        )}
                    </div>
                )}
            </div>


            <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-6">
                <h3 className="text-lg font-bebas text-red-500 uppercase flex items-center gap-2 mb-2"><AlertTriangle size={16} /> PRECAUCIÓN DE COMANDO</h3>
                <p className="text-[10px] text-red-500/70 font-montserrat uppercase leading-relaxed tracking-wide">
                    Cualquier modificación realizada en este panel se sincronizará automáticamente con la Base de Datos Central y alterará el estatus del agente en tiempo real.
                    Al no usar Google Sheets, los datos editados aquí reemplazan el origen de la inteligencia.
                </p>
            </div>
        </motion.div>
    );
};

export default AdminDashboard;
