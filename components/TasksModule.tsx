import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, Check, Clock, Lock, Trash2, Shield, X, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { UserRole, ServiceTask } from '../types';
import { TASK_AREAS } from '../constants';
import { fetchPromotionStatus } from '../services/sheetsService';
import { fetchTasksSupabase as fetchTasks, createTaskSupabase as createTask, deleteTaskSupabase as deleteTask, submitTaskCompletionSupabase as submitTaskCompletion, verifyTaskSupabase as verifyTask, fetchTaskRecruitsSupabase as fetchTaskRecruits, removeRecruitFromTaskSupabase as removeRecruitFromTask, updateTaskStatusSupabase as updateTaskStatus } from '../services/supabaseService';

interface TasksModuleProps {
    agentId: string;
    agentName: string;
    userRole: UserRole;
    onActivity?: () => void;
}

const RANK_ORDER = ['RECLUTA', 'ACTIVO', 'CONSAGRADO', 'REFERENTE', 'LÍDER'];
const RANK_COLORS: Record<string, string> = { 'RECLUTA': '#6b7280', 'ACTIVO': '#3b82f6', 'CONSAGRADO': '#f59e0b', 'REFERENTE': '#8b5cf6', 'LÍDER': '#ef4444' };

const STATUS_LABELS: Record<string, string> = {
    'SOLICITADO': 'Solicitado - Pendiente Aprobación',
    'EN_PROGRESO': 'En Progreso',
    'ENTREGADO': 'Entregado - Pendiente Verificación',
    'VERIFICADO': 'Completado ✓',
    'RECHAZADO': 'Rechazado ✗'
};

const TasksModule: React.FC<TasksModuleProps> = ({ agentId, agentName, userRole, onActivity }) => {
    const [tasks, setTasks] = useState<ServiceTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [agentRank, setAgentRank] = useState('RECLUTA');
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [submitting, setSubmitting] = useState<string | null>(null);
    const [newTask, setNewTask] = useState({ title: '', description: '', area: 'SERVICIO', requiredLevel: 'RECLUTA', xpReward: '', maxSlots: '' });
    const [filterArea, setFilterArea] = useState('TODAS');
    const [agentProgress, setAgentProgress] = useState<Record<string, string>>({});
    const [taskRecruits, setTaskRecruits] = useState<Record<string, { agentId: string; agentName: string; date: string; status: string }[]>>({});
    const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

    const isDirector = userRole === UserRole.DIRECTOR;

    const loadData = async () => {
        setLoading(true);
        try {
            const promises: Promise<any>[] = [
                fetchTasks(),
                fetchPromotionStatus(agentId),
                fetchTaskRecruits()
            ];

            const [tasksList, promoStatus, allRecruits] = await Promise.all(promises);

            setTasks(tasksList || []);
            if (promoStatus?.success) {
                setAgentRank(promoStatus.rank || 'RECLUTA');
            }

            // Build recruits map and agent progress map
            const recruitsMap: Record<string, any[]> = {};
            const progressMap: Record<string, string> = {};

            if (allRecruits) {
                for (const r of allRecruits) {
                    if (!recruitsMap[r.taskId]) recruitsMap[r.taskId] = [];
                    recruitsMap[r.taskId].push(r);

                    if (r.agentId === agentId) {
                        progressMap[r.taskId] = r.status;
                    }
                }
            }
            setTaskRecruits(recruitsMap);
            setAgentProgress(progressMap);

        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { loadData(); }, [agentId]);

    const canAccessTask = (task: ServiceTask) => {
        const taskLevelIdx = RANK_ORDER.indexOf(task.requiredLevel);
        const agentLevelIdx = RANK_ORDER.indexOf(agentRank);
        return agentLevelIdx >= taskLevelIdx;
    };

    const handleCreate = async () => {
        if (!newTask.title.trim()) return;
        setCreating(true);
        try {
            const res = await createTask({
                ...newTask,
                xpReward: parseInt(newTask.xpReward) || 0,
                maxSlots: parseInt(newTask.maxSlots) || 0
            });
            if (res.success) {
                setShowCreate(false);
                setNewTask({ title: '', description: '', area: 'SERVICIO', requiredLevel: 'RECLUTA', xpReward: '', maxSlots: '' });
                loadData();
            }
        } catch (e) { console.error(e); }
        setCreating(false);
        onActivity?.();
    };

    const handleDelete = async (taskId: string) => {
        if (!confirm('¿Eliminar esta misión?')) return;
        try {
            await deleteTask(taskId);
            loadData();
        } catch (e) { console.error(e); }
        onActivity?.();
    };

    const handleApply = async (task: ServiceTask) => {
        setSubmitting(task.id);
        try {
            const res = await submitTaskCompletion(task.id, agentId, agentName);
            if (res.success) {
                loadData();
            } else {
                alert('❌ ' + (res.error || 'No se pudo solicitar la misión.'));
            }
        } catch (e) { console.error(e); }
        setSubmitting(null);
        onActivity?.();
    };

    const handleUpdateStatus = async (taskId: string, targetAgentId: string, status: any) => {
        try {
            const mappedStatus = status === 'PENDIENTE' ? 'SOLICITADO' : status === 'EN PROCESO' ? 'EN_PROGRESO' : status;
            const res = await updateTaskStatus({
                taskId,
                agentId: targetAgentId,
                status: mappedStatus
            });
            if (res.success) loadData();
        } catch (e) { console.error(e); }
        onActivity?.();
    };

    const toggleExpand = (taskId: string) => {
        setExpandedTasks(prev => {
            const next = new Set(prev);
            if (next.has(taskId)) next.delete(taskId);
            else next.add(taskId);
            return next;
        });
    };

    const handleVerifyCompletion = async (item: any) => {
        if (!confirm(`¿Verificar y otorgar +${item.xpReward} XP a ${item.agentName}?`)) return;
        try {
            const res = await verifyTask({
                taskId: item.taskId,
                agentId: item.agentId,
                agentName: item.agentName,
                verifiedBy: agentId,
                xpReward: item.xpReward || 5,
                taskTitle: item.taskTitle || ''
            });
            if (res.success) loadData();
            else alert('❌ Fallo al verificar: ' + (res.error || 'Error desconocido'));
        } catch (e) { console.error(e); }
        onActivity?.();
    };

    const handleRemoveRecruit = async (taskId: string, targetAgentId: string) => {
        if (!confirm(`¿Eliminar al agente de esta misión?`)) return;
        try {
            await removeRecruitFromTask(taskId, targetAgentId);
            loadData();
        } catch (e) { console.error(e); }
        onActivity?.();
    };

    const getAreaIcon = (area: string) => {
        const found = TASK_AREAS.find(a => a.value === area);
        return found?.icon || '📋';
    };

    const filteredTasks = filterArea === 'TODAS' ? tasks : tasks.filter(t => t.area === filterArea);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ffb700]"></div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto animate-in fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ffb700]/20 to-amber-600/10 flex items-center justify-center">
                        <ClipboardList size={20} className="text-[#ffb700]" />
                    </div>
                    <div>
                        <h1 className="font-bebas text-2xl md:text-3xl tracking-wider text-white">MISIONES</h1>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">{tasks.length} misiones disponibles</p>
                    </div>
                </div>
                {isDirector && (
                    <button
                        onClick={() => setShowCreate(!showCreate)}
                        className="px-4 py-2.5 rounded-xl bg-[#ffb700]/10 border border-[#ffb700]/30 text-[#ffb700] font-bold text-xs uppercase tracking-wider hover:bg-[#ffb700]/20 transition-all flex items-center gap-2 active:scale-95"
                    >
                        <Plus size={16} />
                        Nueva Misión
                    </button>
                )}
            </div>

            {/* Create Task Form */}
            {showCreate && (
                <div className="glass-card border border-[#ffb700]/20 rounded-2xl p-5 space-y-4 animate-in slide-in-from-top-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Crear Nueva Misión</h3>
                        <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white transition-colors"><X size={18} /></button>
                    </div>
                    <input
                        value={newTask.title}
                        onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                        placeholder="Título de la misión..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:border-[#ffb700]/50 focus:outline-none transition-colors"
                    />
                    <textarea
                        value={newTask.description}
                        onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                        placeholder="Descripción (opcional)..."
                        rows={2}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:border-[#ffb700]/50 focus:outline-none resize-none transition-colors"
                    />
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Área</label>
                            <select
                                value={newTask.area}
                                onChange={e => setNewTask({ ...newTask, area: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-[#ffb700]/50"
                            >
                                {TASK_AREAS.map(a => <option key={a.value} value={a.value}>{a.icon} {a.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Nivel Mínimo</label>
                            <select
                                value={newTask.requiredLevel}
                                onChange={e => setNewTask({ ...newTask, requiredLevel: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-[#ffb700]/50"
                            >
                                {RANK_ORDER.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">XP Recompensa</label>
                            <input
                                type="number"
                                min={1}
                                value={newTask.xpReward}
                                onChange={e => setNewTask({ ...newTask, xpReward: e.target.value })}
                                placeholder="5"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-[#ffb700]/50"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Cupos (0=∞)</label>
                            <input
                                type="number"
                                min={0}
                                value={newTask.maxSlots}
                                onChange={e => setNewTask({ ...newTask, maxSlots: e.target.value })}
                                placeholder="∞"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-[#ffb700]/50"
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleCreate}
                        disabled={creating || !newTask.title.trim() || !newTask.xpReward}
                        className="w-full py-3 rounded-xl bg-[#ffb700] text-[#001f3f] font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    >
                        {creating ? 'Creando...' : 'Crear Misión'}
                    </button>
                </div>
            )}

            {/* Area Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                    onClick={() => setFilterArea('TODAS')}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all
            ${filterArea === 'TODAS' ? 'bg-[#ffb700]/20 text-[#ffb700] border border-[#ffb700]/30' : 'bg-white/5 text-gray-500 border border-white/5 hover:bg-white/10'}`}
                >
                    Todas
                </button>
                {TASK_AREAS.map(area => (
                    <button
                        key={area.value}
                        onClick={() => setFilterArea(area.value)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all
              ${filterArea === area.value ? 'bg-[#ffb700]/20 text-[#ffb700] border border-[#ffb700]/30' : 'bg-white/5 text-gray-500 border border-white/5 hover:bg-white/10'}`}
                    >
                        {area.icon} {area.label}
                    </button>
                ))}
            </div>

            {/* Tasks Grid */}
            {filteredTasks.length === 0 ? (
                <div className="text-center py-16 text-gray-600 space-y-2">
                    <ClipboardList size={40} className="mx-auto opacity-30" />
                    <p className="text-sm">No hay misiones disponibles</p>
                    {isDirector && <p className="text-xs text-gray-700">Haz clic en "Nueva Misión" para crear una</p>}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTasks.map(task => {
                        const accessible = canAccessTask(task);
                        const status = agentProgress[task.id];

                        return (
                            <div
                                key={task.id}
                                className={`glass-card border rounded-2xl p-5 space-y-3 transition-all hover:translate-y-[-2px]
                  ${accessible ? 'border-white/10 hover:border-[#ffb700]/20' : 'border-white/5 opacity-50'}`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{getAreaIcon(task.area)}</span>
                                        <div>
                                            <h3 className="text-sm font-bold text-white leading-tight">{task.title}</h3>
                                            <span className="text-[9px] uppercase tracking-wider font-bold" style={{ color: RANK_COLORS[task.requiredLevel] || '#6b7280' }}>
                                                Nivel: {task.requiredLevel}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-center gap-1.5 bg-[#ffb700]/10 px-2 py-1 rounded-lg">
                                            <span className="text-[10px] font-black text-[#ffb700]">+{task.xpReward}</span>
                                            <span className="text-[8px] text-[#ffb700]/60">XP</span>
                                        </div>
                                        {task.maxSlots > 0 && (
                                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter ${task.currentSlots >= task.maxSlots ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                                                {task.currentSlots}/{task.maxSlots} RECLUTAS
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {task.description && (
                                    <p className="text-xs text-gray-400 leading-relaxed">{task.description}</p>
                                )}

                                {accessible ? (
                                    <div className="space-y-2">
                                        {status ? (
                                            <div className="space-y-2">
                                                <div className={`w-full py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-center border
                                                    ${status === 'VERIFICADO' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                        status === 'RECHAZADO' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                            'bg-[#ffb700]/10 text-[#ffb700] border-[#ffb700]/20'}`}>
                                                    {STATUS_LABELS[status] || status}
                                                </div>

                                                {status === 'EN_PROGRESO' && (
                                                    <button
                                                        onClick={() => handleUpdateStatus(task.id, agentId, 'ENTREGADO')}
                                                        disabled={submitting === task.id}
                                                        className="w-full py-2.5 rounded-xl bg-green-600/20 text-green-400 border border-green-500/30 text-xs font-bold uppercase tracking-wider hover:bg-green-600/40 transition-all active:scale-95 flex items-center justify-center gap-2"
                                                    >
                                                        <Check size={14} /> Marcar como Completado
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleApply(task)}
                                                disabled={submitting === task.id || (task.maxSlots > 0 && task.currentSlots >= task.maxSlots)}
                                                className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95
                                                    ${(task.maxSlots > 0 && task.currentSlots >= task.maxSlots)
                                                        ? 'bg-red-500/10 text-red-500 border border-red-500/20 cursor-not-allowed opacity-50'
                                                        : 'bg-white/5 text-white hover:bg-[#ffb700]/10 hover:text-[#ffb700] border border-white/10 hover:border-[#ffb700]/30'
                                                    }`}
                                            >
                                                {submitting === task.id ? (
                                                    <span className="flex items-center justify-center gap-2">
                                                        <div className="animate-spin rounded-full h-3 w-3 border-t border-current"></div>
                                                        Enviando...
                                                    </span>
                                                ) : (task.maxSlots > 0 && task.currentSlots >= task.maxSlots) ? (
                                                    <span className="flex items-center justify-center gap-2"><X size={14} /> Misión Completa</span>
                                                ) : (
                                                    <span className="flex items-center justify-center gap-2"><ClipboardList size={14} /> Postularme a la Misión</span>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-gray-600 text-xs py-2">
                                        <Lock size={14} />
                                        <span>Requiere nivel <span className="font-bold" style={{ color: RANK_COLORS[task.requiredLevel] }}>{task.requiredLevel}</span></span>
                                    </div>
                                )}

                                {isDirector && (
                                    <div className="space-y-2 pt-1 border-t border-white/5">
                                        <button
                                            onClick={() => toggleExpand(task.id)}
                                            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-cyan-400/70 hover:text-cyan-300 text-[10px] uppercase tracking-wider transition-colors"
                                        >
                                            <Users size={12} />
                                            {(taskRecruits[task.id]?.length || 0)} Reclutas
                                            {expandedTasks.has(task.id) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                        </button>

                                        {expandedTasks.has(task.id) && (
                                            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                                                {(taskRecruits[task.id] || []).length === 0 ? (
                                                    <p className="text-[9px] text-gray-600 text-center py-2 italic">Sin reclutas inscritos</p>
                                                ) : (
                                                    (taskRecruits[task.id] || []).map((r, idx) => (
                                                        <div key={idx} className="bg-white/5 rounded-xl p-3 space-y-2 border border-white/5">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-2 h-2 rounded-full ${r.status === 'VERIFICADO' ? 'bg-green-500' :
                                                                        r.status === 'RECHAZADO' ? 'bg-red-500' :
                                                                            'bg-yellow-500 animate-pulse'}`} />
                                                                    <span className="text-[10px] font-bold text-white">{r.agentName || r.agentId}</span>
                                                                </div>
                                                                <span className={`text-[8px] font-black uppercase tracking-wider ${r.status === 'VERIFICADO' ? 'text-green-500' :
                                                                    r.status === 'RECHAZADO' ? 'text-red-500' :
                                                                        'text-yellow-500'}`}>
                                                                    {r.status}
                                                                </span>
                                                            </div>

                                                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                                {(r.status === 'SOLICITADO' || r.status === 'PENDIENTE') && (
                                                                    <button
                                                                        onClick={() => handleUpdateStatus(task.id, r.agentId, 'EN_PROGRESO')}
                                                                        className="flex-1 py-1.5 px-3 rounded-lg bg-blue-500 text-white text-[9px] font-black uppercase tracking-widest transition-all hover:bg-blue-600 shadow-lg active:scale-95"
                                                                    >
                                                                        Aceptar
                                                                    </button>
                                                                )}

                                                                {(r.status === 'SOLICITADO' || r.status === 'PENDIENTE' || r.status === 'EN_PROGRESO' || r.status === 'ENTREGADO') && (
                                                                    <button
                                                                        onClick={() => handleVerifyCompletion({ taskId: task.id, agentId: r.agentId, agentName: r.agentName, xpReward: task.xpReward, taskTitle: task.title })}
                                                                        className="flex-1 py-1.5 px-3 rounded-lg bg-green-500 text-white text-[9px] font-black uppercase tracking-widest transition-all hover:bg-green-600 shadow-lg active:scale-95 flex items-center justify-center gap-1"
                                                                    >
                                                                        <Check size={10} /> {r.status === 'ENTREGADO' ? 'Verificar' : 'Aprobar Ya'}
                                                                    </button>
                                                                )}

                                                                {r.status !== 'VERIFICADO' && r.status !== 'RECHAZADO' && (
                                                                    <button
                                                                        onClick={() => handleUpdateStatus(task.id, r.agentId, 'RECHAZADO')}
                                                                        className="py-1.5 px-3 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 text-[9px] font-black uppercase tracking-widest transition-all hover:bg-red-500/20"
                                                                    >
                                                                        Rechazar
                                                                    </button>
                                                                )}

                                                                <button
                                                                    onClick={() => handleRemoveRecruit(task.id, r.agentId)}
                                                                    className="p-1.5 rounded-lg bg-white/5 text-gray-500 hover:text-red-400 transition-colors"
                                                                    title="Eliminar de Misión"
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}

                                        <button
                                            onClick={() => handleDelete(task.id)}
                                            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-red-500/40 hover:text-red-400 text-[10px] uppercase tracking-wider transition-colors"
                                        >
                                            <Trash2 size={12} /> Eliminar Misión
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TasksModule;
