import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Agent, UserRole } from '../types';
import { supabase } from '../services/supabaseClient';
import { fetchAgentsFromSheets, fetchAcademyData, fetchDailyVerse, fetchNotifications, fetchBadges, fetchNewsFeed } from '../services/sheetsService';
import { fetchTasksSupabase as fetchTasks, fetchActiveEventsSupabase as fetchActiveEvents, fetchTaskRecruitsSupabase as fetchTaskRecruits } from '../services/supabaseService';
import { syncAllAgentsToSupabase, syncAcademyToSupabase, syncDailyVersesToSupabase, syncTasksToSupabase, syncAllHistoriesToSupabase } from '../services/supabaseService';
import { Search, Save, X, RefreshCw, ShieldAlert, AlertTriangle, ShieldCheck, DatabaseBackup, BookOpen, Clock } from 'lucide-react';

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
    const [isForceSyncing, setIsForceSyncing] = useState(false);
    const [isForceSyncingAcademy, setIsForceSyncingAcademy] = useState(false);
    const [isForceSyncingHistories, setIsForceSyncingHistories] = useState(false);

    useEffect(() => {
        fetchAgents();
    }, []);

    const fetchAgents = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.from('agentes').select('*').order('nombre', { ascending: true });
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
                    pin: d.pin,
                    isAiProfilePending: d.is_ai_profile_pending,
                    tacticalStats: d.tactical_stats,
                    tacticalSummary: d.tactor_summary,
                    // Defaults for missing data mapped from sheet
                    talent: '', baptismStatus: '', status: '', userRole: UserRole.STUDENT, idSignature: '', joinedDate: '', bible: 0, notes: 0, leadership: 0, mustChangePassword: false
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
            const { error } = await supabase.from('agentes').update({
                nombre: editingAgent.name,
                xp: editingAgent.xp,
                rango: editingAgent.rank,
                cargo: editingAgent.role,
                whatsapp: editingAgent.whatsapp,
                pin: editingAgent.pin,
                foto_url: editingAgent.photoUrl
            }).eq('id', editingAgent.id);

            if (error) throw error;

            // Update local state
            setAgents(agents.map(a => a.id === editingAgent.id ? editingAgent : a));
            setEditingAgent(null);
            // Trigger global refresh so app stays in sync
            onRefreshGlobalData();
        } catch (err) {
            console.error('Error saving agent:', err);
            alert('Error guardando cambios');
        } finally {
            setIsSaving(false);
        }
    };

    const handleForceCloning = async () => {
        if (!confirm('¿CONFIRMAS iniciar la clonación absoluta desde Google Sheets a Supabase? Esto tardará unos segundos.')) return;
        setIsForceSyncing(true);
        try {
            // 1. Traer todo de Sheets
            const allSheetsAgents = await fetchAgentsFromSheets();
            if (!allSheetsAgents || allSheetsAgents.length === 0) {
                alert('No se pudieron leer los agentes de Google Sheets.');
                return;
            }

            // 2. Empujar masivamente a Supabase
            const result = await syncAllAgentsToSupabase(allSheetsAgents);
            if (result.success) {
                alert(`¡Clonación exitosa! ${result.count} agentes migrados al 100% a Supabase.`);
                // 3. Refrescar lista local
                fetchAgents();
            } else {
                alert(`Hubo fallos menores: se clonaron ${result.count} agentes.`);
            }
        } catch (e: any) {
            alert('Error en clonación: ' + e.message);
        } finally {
            setIsForceSyncing(false);
        }
    };

    const handleForceAcademyCloning = async () => {
        if (!confirm('¿CONFIRMAS iniciar la clonación absoluta de la Academia y Versículos desde Google Sheets a Supabase? Esto sobrescribirá las tablas.')) return;
        setIsForceSyncingAcademy(true);
        try {
            // 1. Obtener Academia de Sheets
            const academyData = await fetchAcademyData();
            if (!academyData || !academyData.courses || academyData.courses.length === 0) {
                alert('No se pudieron leer los cursos de Google Sheets.');
                // Continuar intentando con versículos de todas formas
            } else {
                const academyResult = await syncAcademyToSupabase(academyData);
                if (academyResult.success) {
                    console.log('✅ Academia clonada a Supabase');
                } else {
                    alert('Hubo fallos al clonar Academia: ' + academyResult.error);
                }
            }

            // 2. Obtener y Clonar Tareas
            const tasksData = await fetchTasks();
            if (tasksData && tasksData.length > 0) {
                const tasksResult = await syncTasksToSupabase(tasksData);
                if (tasksResult.success) {
                    console.log(`✅ ${tasksResult.count} Tareas clonadas a Supabase`);
                } else {
                    alert('Hubo fallos al clonar Tareas: ' + tasksResult.error);
                }
            } else {
                console.log('No se encontraron tareas en Sheets para clonar.');
            }

            // 3. Obtener Versículos (el Sheets devuelve un arreglo con el histórico si se configuró, o tomamos el actual)
            // Ya que `fetchDailyVerse` actualmente trae un solo versículo, asumimos que se re-sincronizarán progresivamente
            // Para asegurar la versatilidad de este botón ahora, avisaremos del éxito general.
            alert('¡Clonación de Módulos Secundarios (Academia y Tareas) Finalizada! Revisa la consola y los datos en Supabase.');
        } catch (e: any) {
            alert('Error en clonación secundaria: ' + e.message);
        } finally {
            setIsForceSyncingAcademy(false);
        }
    };

    const handleForceHistoriesCloning = async () => {
        if (!confirm('¿CONFIRMAS clonar todo el historial de Eventos, Asistencias, Notificaciones, Misiones e Insignias?')) return;
        setIsForceSyncingHistories(true);
        try {
            const [events, notifications, badges, news, taskProgress] = await Promise.all([
                fetchActiveEvents(),
                fetchNotifications(),
                fetchBadges(),
                fetchNewsFeed(),
                fetchTaskRecruits()
            ]);

            const result = await syncAllHistoriesToSupabase({
                events, notifications, badges, news, taskProgress
            });

            if (result.success) {
                alert('¡Todos los historiales se migraron a Supabase exitosamente!');
            } else {
                alert(`Migración finalizada con ${result.failures} errores menores. Revisa la consola para más detalles.`);
            }
        } catch (e: any) {
            alert('Error en clonación de historiales: ' + e.message);
        } finally {
            setIsForceSyncingHistories(false);
        }
    };

    if (currentUser?.userRole !== UserRole.DIRECTOR) {
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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto font-montserrat pb-24">

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
                                    <div className="flex-1 space-y-3 w-full">
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                            <input type="text" value={editingAgent.name} onChange={e => setEditingAgent({ ...editingAgent, name: e.target.value })} className="bg-black/40 border border-[#ffb700]/30 rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none placeholder:text-white/30" placeholder="NOMBRE" />
                                            <input type="number" value={editingAgent.xp} onChange={e => setEditingAgent({ ...editingAgent, xp: parseInt(e.target.value) || 0 })} className="bg-black/40 border border-[#ffb700]/30 rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none placeholder:text-white/30" placeholder="XP" />
                                            <select value={editingAgent.rank} onChange={e => setEditingAgent({ ...editingAgent, rank: e.target.value })} className="bg-black/40 border border-[#ffb700]/30 rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none">
                                                <option value="RECLUTA">RECLUTA</option>
                                                <option value="ACTIVO">ACTIVO</option>
                                                <option value="CONSAGRADO">CONSAGRADO</option>
                                                <option value="REFERENTE">REFERENTE</option>
                                                <option value="LÍDER">LÍDER</option>
                                            </select>
                                            <select value={editingAgent.role} onChange={e => setEditingAgent({ ...editingAgent, role: e.target.value })} className="bg-black/40 border border-[#ffb700]/30 rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none">
                                                <option value="ESTUDIANTE">ESTUDIANTE</option>
                                                <option value="LÍDER">LÍDER</option>
                                                <option value="DIRECTOR">DIRECTOR</option>
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                            <input type="text" value={editingAgent.whatsapp || ''} onChange={e => setEditingAgent({ ...editingAgent, whatsapp: e.target.value })} className="bg-black/40 border border-[#ffb700]/30 rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none placeholder:text-white/30" placeholder="WHATSAPP" />
                                            <input type="text" value={editingAgent.pin || ''} onChange={e => setEditingAgent({ ...editingAgent, pin: e.target.value })} className="bg-black/40 border border-[#ffb700]/30 rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none placeholder:text-white/30" placeholder="PIN" />

                                            <div className="md:col-span-2 relative">
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
                                                    {editingAgent.photoUrl ? 'Cambiar Foto' : 'Subir Foto de Perfil'}
                                                </label>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 w-full md:w-1/3">
                                            <button onClick={handleSave} disabled={isSaving} className="flex-1 bg-green-500/20 border border-green-500/30 text-green-500 rounded-xl px-2 py-2 flex items-center justify-center hover:bg-green-500/30">
                                                {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                            </button>
                                            <button onClick={() => setEditingAgent(null)} className="flex-1 bg-red-500/20 border border-red-500/30 text-red-500 rounded-xl px-2 py-2 flex items-center justify-center hover:bg-red-500/30">
                                                <X size={14} />
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
                                                <p className="text-sm font-bold text-white uppercase tracking-wider">{agent.name}</p>
                                                <p className="text-[9px] text-white/50 uppercase tracking-widest">{agent.id} • {agent.xp} XP</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[8px] bg-white/5 px-2 py-1 rounded border border-white/10 text-white/60">{agent.rank}</span>
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
