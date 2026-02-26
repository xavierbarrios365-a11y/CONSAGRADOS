import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Check, Clock, Info, ShieldAlert, Target, X, Trash2, CheckCheck, Loader2 } from 'lucide-react';
import { InboxNotification, Agent } from '../types';
import { fetchNotifications, updateNotifPrefs } from '../services/sheetsService';

interface NotificationInboxProps {
    onClose: () => void;
    onTotalReadUpdate: (count: number) => void;
    onRequestPermission?: () => Promise<void>;
    agentId?: string;
    currentUser?: Agent | null;
}

const NotificationInbox: React.FC<NotificationInboxProps> = ({ onClose, onTotalReadUpdate, onRequestPermission, agentId, currentUser }) => {
    const READ_KEY = agentId ? `read_notifications_${agentId}` : 'read_notifications';
    const DELETED_KEY = agentId ? `deleted_notifications_${agentId}` : 'deleted_notifications';

    const [notifications, setNotifications] = useState<InboxNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [readIds, setReadIds] = useState<string[]>(() => {
        try {
            // Prioridad: LocalStorage (más rápido) o datos del Agente
            const saved = localStorage.getItem(READ_KEY);
            if (saved) return JSON.parse(saved);
            return currentUser?.notifPrefs?.read || [];
        } catch { return currentUser?.notifPrefs?.read || []; }
    });
    const [deletedIds, setDeletedIds] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem(DELETED_KEY);
            if (saved) return JSON.parse(saved);
            return currentUser?.notifPrefs?.deleted || [];
        } catch { return currentUser?.notifPrefs?.deleted || []; }
    });
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
        typeof window !== 'undefined' && typeof Notification !== 'undefined' ? Notification.permission : 'default'
    );
    const [isSyncing, setIsSyncing] = useState(false);

    const updateBadge = useCallback((allNotifs: InboxNotification[], readNotifs: string[], delNotifs: string[]) => {
        const visibleNotifs = allNotifs.filter(n => !delNotifs.includes(n.id));
        const unreadCount = visibleNotifs.filter(n => !readNotifs.includes(n.id)).length;
        onTotalReadUpdate(unreadCount);
    }, [onTotalReadUpdate]);

    useEffect(() => {
        loadNotifications();
    }, []);

    // Redundancia: Si LocalStorage está vacío pero el usuario tiene prefs en el backend, sincronizar
    useEffect(() => {
        if (currentUser?.notifPrefs && agentId) {
            const localRead = localStorage.getItem(READ_KEY);
            const localDeleted = localStorage.getItem(DELETED_KEY);

            if (!localRead && currentUser.notifPrefs.read?.length > 0) {
                setReadIds(currentUser.notifPrefs.read);
                localStorage.setItem(READ_KEY, JSON.stringify(currentUser.notifPrefs.read));
            }
            if (!localDeleted && currentUser.notifPrefs.deleted?.length > 0) {
                setDeletedIds(currentUser.notifPrefs.deleted);
                localStorage.setItem(DELETED_KEY, JSON.stringify(currentUser.notifPrefs.deleted));
            }
        }
    }, [currentUser, agentId, READ_KEY, DELETED_KEY]);

    const loadNotifications = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchNotifications();
            if (!Array.isArray(data)) {
                throw new Error('Formato de respuesta inválido');
            }
            setNotifications(data);

            // Sincronizar inmediatamente el contador con lo que hay en LS
            const currentDeleted = JSON.parse(localStorage.getItem(DELETED_KEY) || '[]');
            const currentRead = JSON.parse(localStorage.getItem(READ_KEY) || '[]');
            updateBadge(data, currentRead, currentDeleted);
        } catch (err) {
            console.error("Error cargando inbox:", err);
            setError("Error al cargar transmisiones. Intenta de nuevo.");
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        if (readIds.includes(id)) return;
        const newRead = [...readIds, id];
        setReadIds(newRead);
        localStorage.setItem(READ_KEY, JSON.stringify(newRead));
        updateBadge(notifications, newRead, deletedIds);

        if (agentId) {
            setIsSyncing(true);
            await updateNotifPrefs(agentId, { read: newRead, deleted: deletedIds });
            setIsSyncing(false);
        }
    };

    const deleteNotification = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const newDeleted = [...deletedIds, id];
        setDeletedIds(newDeleted);
        localStorage.setItem(DELETED_KEY, JSON.stringify(newDeleted));
        updateBadge(notifications, readIds, newDeleted);

        if (agentId) {
            setIsSyncing(true);
            await updateNotifPrefs(agentId, { read: readIds, deleted: newDeleted });
            setIsSyncing(false);
        }
    };

    const clearAll = async () => {
        if (window.confirm("⚠️ ¿ESTÁS SEGURO DE ELIMINAR TODAS LAS TRANSMISIONES? ESTA ACCIÓN NO SE PUEDE DESHACER.")) {
            const allIds = notifications.map(n => n.id);
            const newDeleted = Array.from(new Set([...deletedIds, ...allIds]));
            setDeletedIds(newDeleted);
            localStorage.setItem(DELETED_KEY, JSON.stringify(newDeleted));
            updateBadge(notifications, readIds, newDeleted);

            if (agentId) {
                setIsSyncing(true);
                await updateNotifPrefs(agentId, { read: readIds, deleted: newDeleted });
                setIsSyncing(false);
            }
        }
    };

    const getCategoryIcon = (cat: string) => {
        switch (cat) {
            case 'ALERTA': return <ShieldAlert size={18} className="text-red-500" />;
            case 'MISION': return <Target size={18} className="text-[#ffb700]" />;
            default: return <Info size={18} className="text-blue-400" />;
        }
    };

    const formatDate = (isoStr: string) => {
        try {
            const date = new Date(isoStr);
            if (isNaN(date.getTime())) return isoStr;
            return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        } catch {
            return isoStr;
        }
    };

    const visibleNotifications = notifications.filter(n => !deletedIds.includes(n.id));

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-[#001224] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#000c19]">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Bell className="text-[#ffb700]" size={24} />
                            {visibleNotifications.filter(n => !readIds.includes(n.id)).length > 0 && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#000c19] animate-pulse" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tighter">Inbox Táctico</h2>
                            <div className="flex items-center gap-2">
                                <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Comunicados Oficiales</p>
                                {isSyncing && (
                                    <span className="flex items-center gap-1 text-[8px] text-blue-400 font-black animate-pulse">
                                        <Loader2 size={10} className="animate-spin" /> SINCRONIZANDO...
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {visibleNotifications.length > 0 && (
                            <button
                                onClick={clearAll}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all active:scale-95"
                            >
                                <Trash2 size={14} /> Limpiar Todo
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/5 rounded-full transition-colors"
                        >
                            <X className="text-white/60" size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 scroll-hide">
                    {loading ? (
                        <div className="h-40 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ffb700]"></div>
                        </div>
                    ) : error ? (
                        <div className="h-60 flex flex-col items-center justify-center text-center gap-4">
                            <ShieldAlert size={48} className="text-red-500/60" />
                            <p className="text-sm font-black text-red-400 uppercase tracking-widest">{error}</p>
                            <button onClick={loadNotifications} className="px-6 py-3 bg-[#ffb700]/10 border border-[#ffb700]/20 rounded-xl text-[#ffb700] text-[10px] font-black uppercase tracking-widest hover:bg-[#ffb700]/20 transition-all active:scale-95">
                                Reintentar
                            </button>
                        </div>
                    ) : visibleNotifications.length === 0 ? (
                        <div className="h-60 flex flex-col items-center justify-center text-center opacity-30">
                            <ShieldAlert size={48} className="mb-4" />
                            <p className="font-bebas text-2xl uppercase">No hay transmisiones</p>
                            <p className="text-xs uppercase tracking-widest">Espera órdenes del mando central</p>
                        </div>
                    ) : (
                        visibleNotifications.map((msg) => {
                            try {
                                return (
                                    <div
                                        key={msg.id}
                                        onMouseEnter={() => markAsRead(msg.id)}
                                        onClick={() => markAsRead(msg.id)}
                                        className={`group relative p-5 rounded-xl border transition-all duration-300 cursor-pointer ${readIds.includes(msg.id)
                                            ? 'bg-white/2 border-white/5 opacity-70'
                                            : 'bg-gradient-to-br from-[#ffb700]/10 to-transparent border-[#ffb700]/30 shadow-[0_0_20px_rgba(255,183,0,0.1)]'
                                            }`}
                                    >
                                        {!readIds.includes(msg.id) && (
                                            <div className="absolute top-4 right-4 flex items-center gap-1">
                                                <span className="w-2 h-2 bg-[#ffb700] rounded-full animate-ping" />
                                                <span className="text-[9px] font-black text-[#ffb700] uppercase tracking-tighter">NUEVO</span>
                                            </div>
                                        )}

                                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => deleteNotification(e, msg.id)}
                                                className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 active:scale-90 transition-all"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        <div className="flex items-start gap-4">
                                            <div className={`p-3 rounded-lg ${readIds.includes(msg.id) ? 'bg-white/5' : 'bg-[#ffb700]/20'}`}>
                                                {getCategoryIcon(msg.categoria)}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="text-sm font-black text-white uppercase tracking-tight">{msg.titulo || 'Sin título'}</h3>
                                                    <span className="text-[9px] text-[#ffb700]/60 font-bold px-2 py-0.5 rounded bg-[#ffb700]/10 border border-[#ffb700]/20">
                                                        {msg.categoria || 'INFO'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-white/70 leading-relaxed mb-3">{msg.mensaje || ''}</p>
                                                <div className="flex items-center justify-between pr-10 md:pr-0">
                                                    <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-white/30">
                                                        <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(msg.fecha)}</span>
                                                        <span className="flex items-center gap-1"><ShieldAlert size={12} /> {msg.emisor || 'Sistema'}</span>
                                                    </div>
                                                    {readIds.includes(msg.id) && (
                                                        <div className="mt-1 md:mt-0 flex items-center gap-1 text-[9px] text-[#ffb700] font-bold uppercase tracking-widest opacity-60">
                                                            <CheckCheck size={12} /> Leído
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            } catch (renderErr) {
                                console.error("Error renderizando notificación:", msg.id, renderErr);
                                return null;
                            }
                        })
                    )}
                </div>

                {/* Notification Permission Banner */}
                {permissionStatus !== 'granted' && (
                    <div className="mx-4 mb-4 p-4 bg-indigo-600/20 border border-indigo-500/30 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ShieldAlert className="text-indigo-400" size={20} />
                            <div>
                                <p className="text-[10px] font-black text-white uppercase tracking-wider">Notificaciones Desactivadas</p>
                                <p className="text-[8px] text-white/60 uppercase font-bold tracking-widest">Activa las alertas en tiempo real para misiones.</p>
                            </div>
                        </div>
                        <button
                            onClick={async () => {
                                if (onRequestPermission) await onRequestPermission();
                                if (typeof Notification !== 'undefined') setPermissionStatus(Notification.permission);
                            }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95"
                        >
                            {permissionStatus === 'denied' ? 'Cómo Activar' : 'Activar'}
                        </button>
                    </div>
                )}

                {/* Footer */}
                <div className="p-4 bg-[#000c19] border-t border-white/5 flex justify-center">
                    <p className="text-[9px] text-white/20 uppercase font-bold tracking-[0.2em]">Cifrado de Extremo a Extremo — Consagrados Tactic v1.6</p>
                </div>
            </div>
        </div>
    );
};

export default NotificationInbox;
