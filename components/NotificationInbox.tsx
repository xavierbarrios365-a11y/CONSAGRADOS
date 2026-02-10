import React, { useState, useEffect } from 'react';
import { Bell, Check, Clock, Info, ShieldAlert, Target, X } from 'lucide-react';
import { InboxNotification } from '../types';
import { fetchNotifications } from '../services/sheetsService';

interface NotificationInboxProps {
    onClose: () => void;
    onTotalReadUpdate: (count: number) => void;
}

const NotificationInbox: React.FC<NotificationInboxProps> = ({ onClose, onTotalReadUpdate }) => {
    const [notifications, setNotifications] = useState<InboxNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [readIds, setReadIds] = useState<string[]>([]);

    useEffect(() => {
        // Cargar IDs leídos de localStorage
        const saved = localStorage.getItem('read_notifications');
        if (saved) setReadIds(JSON.parse(saved));

        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        setLoading(true);
        try {
            const data = await fetchNotifications();
            setNotifications(data);
            updateBadge(data, readIds);
        } catch (error) {
            console.error("Error cargando inbox:", error);
        } finally {
            setLoading(false);
        }
    };

    const updateBadge = (allNotifs: InboxNotification[], readNotifs: string[]) => {
        const unreadCount = allNotifs.filter(n => !readNotifs.includes(n.id)).length;
        onTotalReadUpdate(unreadCount);
    };

    const markAsRead = (id: string) => {
        if (readIds.includes(id)) return;
        const newRead = [...readIds, id];
        setReadIds(newRead);
        localStorage.setItem('read_notifications', JSON.stringify(newRead));
        updateBadge(notifications, newRead);
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
            return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        } catch {
            return isoStr;
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-[#001224] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#000c19]">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Bell className="text-[#ffb700]" size={24} />
                            {notifications.filter(n => !readIds.includes(n.id)).length > 0 && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#000c19] animate-pulse" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tighter">Inbox Táctico</h2>
                            <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Comunicados Oficiales</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-full transition-colors"
                    >
                        <X className="text-white/60" size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 scroll-hide">
                    {loading ? (
                        <div className="h-40 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ffb700]"></div>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="h-60 flex flex-col items-center justify-center text-center opacity-30">
                            <ShieldAlert size={48} className="mb-4" />
                            <p className="font-bebas text-2xl uppercase">No hay transmisiones</p>
                            <p className="text-xs uppercase tracking-widest">Espera órdenes del mando central</p>
                        </div>
                    ) : (
                        notifications.map((msg) => (
                            <div
                                key={msg.id}
                                onMouseEnter={() => markAsRead(msg.id)}
                                className={`group relative p-5 rounded-xl border transition-all duration-300 ${readIds.includes(msg.id)
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

                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-lg ${readIds.includes(msg.id) ? 'bg-white/5' : 'bg-[#ffb700]/20'}`}>
                                        {getCategoryIcon(msg.categoria)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-sm font-black text-white uppercase tracking-tight">{msg.titulo}</h3>
                                            <span className="text-[9px] text-[#ffb700]/60 font-bold px-2 py-0.5 rounded bg-[#ffb700]/10 border border-[#ffb700]/20">
                                                {msg.categoria}
                                            </span>
                                        </div>
                                        <p className="text-xs text-white/70 leading-relaxed mb-3">{msg.mensaje}</p>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-white/30">
                                                <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(msg.fecha)}</span>
                                                <span className="flex items-center gap-1"><ShieldAlert size={12} /> {msg.emisor}</span>
                                            </div>
                                            {readIds.includes(msg.id) && (
                                                <div className="flex items-center gap-1 text-[9px] text-green-500 font-bold uppercase tracking-widest">
                                                    <Check size={12} /> Leído
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-[#000c19] border-t border-white/5 flex justify-center">
                    <p className="text-[9px] text-white/20 uppercase font-bold tracking-[0.2em]">Cifrado de Extremo a Extremo — Consagrados Tactic v1.6</p>
                </div>
            </div>
        </div>
    );
};

export default NotificationInbox;
