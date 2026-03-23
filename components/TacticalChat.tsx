import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Agent, UserRole } from '../types';
import { Send, MessageSquare, X, Shield, Zap, Paperclip, Image, FileText, Play, Check, CheckCheck, Loader2, Download, MoreVertical, Trash2, Pencil, Smile, ChevronLeft, Search, Crown } from 'lucide-react';
import { uploadToCloudinary } from '../services/cloudinaryService';
import { sendPushBroadcast } from '../services/notifyService';
import { supabase } from '../services/supabaseService';
import { useTacticalAlert } from './TacticalAlert';

// Emoji database for reactions
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '💯'];
const EMOJI_CATEGORIES: { [key: string]: string[] } = {
    'Frecuentes': ['😀', '😂', '❤️', '👍', '🙏', '🔥', '💯', '👏', '😍', '🥳', '😎', '🤩'],
    'Caras': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😝', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥'],
    'Gestos': ['👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✌️', '🤞', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪'],
    'Corazones': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💖', '💗', '💓', '💞', '💕', '💟'],
    'Objetos': ['🔥', '💯', '⭐', '🌟', '✨', '💫', '🎉', '🎊', '🏆', '🥇', '🎯', '📖', '📚', '✝️', '⛪', '🕊️', '🙌', '👑', '💎', '🛡️']
};

interface Message {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    timestamp: string; // ISO string de Supabase
    type?: 'text' | 'image' | 'video' | 'document';
    fileUrl?: string;
    fileName?: string;
    reactions?: { [emoji: string]: string[] };
    editedAt?: string;
    storyId?: string;
    storyImageUrl?: string;
    leido?: boolean;
}

interface Props {
    currentUser: Agent;
    agents: Agent[];
    onClose: () => void;
}

interface ContactSummary {
    lastMessage: string;
    lastTimestamp: string;
    unreadCount: number;
}

const StoryPreview: React.FC<{ storyId: string; imageUrl: string }> = ({ storyId, imageUrl }) => {
    const [isActive, setIsActive] = useState<boolean | null>(null);
    useEffect(() => {
        const checkStatus = async () => {
            const { data, error } = await supabase.from('historias').select('id').eq('id', storyId).gt('expires_at', new Date().toISOString()).single();
            setIsActive(!!data && !error);
        };
        checkStatus();
    }, [storyId]);
    if (!isActive) return null;
    return (
        <div className="mb-2 rounded-xl overflow-hidden border border-white/20 bg-black/40 shadow-xl group/story">
            <div className="relative aspect-video">
                <img src={imageUrl} className="w-full h-full object-cover group-hover/story:scale-110 transition-transform duration-700" alt="Historia" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                    <span className="text-[8px] font-black text-white uppercase tracking-widest">Historia Activa</span>
                </div>
            </div>
        </div>
    );
};

const TacticalChat: React.FC<Props> = ({ currentUser, agents, onClose }) => {
    const isRecluta = (currentUser.rank?.toUpperCase() === 'RECLUTA' || currentUser.rank?.toUpperCase() === 'RECLUTAS') && currentUser.userRole === UserRole.STUDENT;
    const canModerate = currentUser.userRole === UserRole.DIRECTOR || currentUser.userRole === UserRole.LEADER;

    const { showAlert } = useTacticalAlert();
    const [selectedContact, setSelectedContact] = useState<Agent | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [editingMsg, setEditingMsg] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [showReactions, setShowReactions] = useState<string | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [emojiCategory, setEmojiCategory] = useState('Frecuentes');
    const [searchTerm, setSearchTerm] = useState('');
    const [contactSummaries, setContactSummaries] = useState<{ [agentId: string]: ContactSummary }>({});

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const editInputRef = useRef<HTMLInputElement>(null);

    // --- ACCESS RULES ---
    const allowedContacts = agents.filter(a => {
        if (a.id === currentUser.id) return false;
        if (a.status === 'OCULTO' || a.id.includes('TEST')) return false;

        const otherIsLeaderOrDir = a.userRole === UserRole.LEADER || a.userRole === UserRole.DIRECTOR;
        const rankUpper = a.rank?.toUpperCase() || 'RECLUTA';
        const otherIsRecluta = rankUpper === 'RECLUTA' || rankUpper === 'RECLUTAS';

        if (canModerate) {
            // Líderes pueden hablar con Líderes, Activos, Consagrados, Referentes (NO RECLUTAS)
            if (otherIsRecluta && a.userRole !== UserRole.DIRECTOR && a.userRole !== UserRole.LEADER) return false;
            return true;
        } else {
            // Estudiantes (Activo para arriba) SOLO pueden hablar con Líderes/Director
            return otherIsLeaderOrDir;
        }
    }).sort((a, b) => {
        const timeA = contactSummaries[a.id]?.lastTimestamp || '0';
        const timeB = contactSummaries[b.id]?.lastTimestamp || '0';
        return timeB.localeCompare(timeA);
    }).filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const getAgentPhoto = useCallback((agentId: string) => {
        const agent = agents.find(a => a.id === agentId);
        return agent?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(agent?.name || 'A')}&background=001f3f&color=ffb700&bold=true`;
    }, [agents]);

    const scrollToBottom = useCallback(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, []);

    const getRoomId = (otherId: string) => {
        return [currentUser.id, otherId].sort().join('_');
    };

    const [onlineAgents, setOnlineAgents] = useState<Set<string>>(new Set());

    // --- REALTIME PRESENCE ---
    useEffect(() => {
        const channel = supabase.channel('online-agents', {
            config: { presence: { key: currentUser.id } }
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const onlineIds = new Set<string>();
                Object.keys(state).forEach(id => onlineIds.add(id));
                setOnlineAgents(onlineIds);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ online_at: new Date().toISOString(), name: currentUser.name });
                }
            });

        return () => { channel.unsubscribe(); };
    }, [currentUser.id, currentUser.name]);

    // --- FETCH CONTACT SUMMARIES ---
    useEffect(() => {
        if (!currentUser) return;

        const fetchSummaries = async () => {
            const { data: messages, error } = await supabase
                .from('mensajes_privados')
                .select('*')
                .or(`emisor_id.eq.${currentUser.id},receptor_id.eq.${currentUser.id}`)
                .order('created_at', { ascending: false });

            if (!error && messages) {
                const summaries: { [agentId: string]: ContactSummary } = {};
                messages.forEach(m => {
                    const otherId = m.emisor_id === currentUser.id ? m.receptor_id : m.emisor_id;
                    if (!summaries[otherId]) {
                        summaries[otherId] = {
                            lastMessage: m.contenido,
                            lastTimestamp: m.created_at,
                            unreadCount: 0
                        };
                    }
                    if (m.receptor_id === currentUser.id && !m.leido) {
                        summaries[otherId].unreadCount++;
                    }
                });
                setContactSummaries(summaries);
            }
        };

        fetchSummaries();

        // Listen for new messages to update summaries
        const channel = supabase
            .channel('chat-summaries')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'mensajes_privados',
                filter: `receptor_id=eq.${currentUser.id}`
            }, () => {
                fetchSummaries();
            })
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'mensajes_privados',
                filter: `emisor_id=eq.${currentUser.id}`
            }, () => {
                fetchSummaries();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [currentUser.id]);

    // Escuchar mensajes DE LA SALA SELECCIONADA (Realtime Supabase)
    useEffect(() => {
        if (!selectedContact) {
            setMessages([]);
            return;
        }

        const roomId = getRoomId(selectedContact.id);

        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('mensajes_privados')
                .select('*')
                .eq('sala_id', roomId)
                .order('created_at', { ascending: true })
                .limit(100);

            if (!error && data) {
                const formatted = data.map(m => ({
                    id: m.id,
                    text: m.contenido,
                    senderId: m.emisor_id,
                    senderName: agents.find(a => a.id === m.emisor_id)?.name || 'Agente',
                    timestamp: m.created_at,
                    type: m.metadata?.type || 'text',
                    fileUrl: m.metadata?.fileUrl,
                    fileName: m.metadata?.fileName,
                    reactions: m.metadata?.reactions,
                    editedAt: m.metadata?.editedAt,
                    leido: m.leido
                }));
                setMessages(formatted as Message[]);
                setTimeout(scrollToBottom, 100);

                // Marcar como leídos los recibidos
                const unreadIds = data.filter(m => m.receptor_id === currentUser.id && !m.leido).map(m => m.id);
                if (unreadIds.length > 0) {
                    await supabase.from('mensajes_privados').update({ leido: true }).in('id', unreadIds);
                }
            }
        };

        fetchMessages();

        const channel = supabase
            .channel(`room_${roomId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'mensajes_privados',
                filter: `sala_id=eq.${roomId}`
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    const m = payload.new as any;
                    const newMsg: Message = {
                        id: m.id,
                        text: m.contenido,
                        senderId: m.emisor_id,
                        senderName: agents.find(a => a.id === m.emisor_id)?.name || 'Agente',
                        timestamp: m.created_at,
                        type: m.metadata?.type || 'text',
                        fileUrl: m.metadata?.fileUrl,
                        fileName: m.metadata?.fileName,
                        leido: m.leido
                    };
                    setMessages(prev => {
                        if (prev.find(x => x.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    });
                    setTimeout(scrollToBottom, 50);

                    // Marcar como leído si yo soy el receptor
                    if (m.receptor_id === currentUser.id) {
                        supabase.from('mensajes_privados').update({ leido: true }).eq('id', m.id).then();
                    }
                } else if (payload.eventType === 'UPDATE') {
                    const m = payload.new as any;
                    setMessages(prev => prev.map(msg => msg.id === m.id ? { ...msg, leido: m.leido, text: m.contenido, reactions: m.metadata?.reactions } : msg));
                } else if (payload.eventType === 'DELETE') {
                    setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => { channel.unsubscribe(); };
    }, [currentUser.id, selectedContact, agents, scrollToBottom]);

    const handleSendMessage = async (e?: React.FormEvent, fileData?: { url: string; type: string; name: string }) => {
        if (e) e.preventDefault();
        if (!selectedContact) return;

        const text = newMessage.trim();
        if (!text && !fileData) return;

        try {
            const roomId = getRoomId(selectedContact.id);
            const msgData: any = {
                sala_id: roomId,
                emisor_id: currentUser.id,
                receptor_id: selectedContact.id,
                contenido: text || (fileData ? `Archivo: ${fileData.name}` : ''),
                metadata: fileData ? {
                    type: fileData.type,
                    fileUrl: fileData.url,
                    fileName: fileData.name
                } : { type: 'text' }
            };

            setNewMessage('');
            setShowEmojiPicker(false);

            // Guardar en Supabase
            const { error: insertError } = await supabase.from('mensajes_privados').insert(msgData);
            if (insertError) throw insertError;

            // Disparar Notificación Push Directa
            if (selectedContact.fcm_token) {
                sendPushBroadcast(
                    `Mensaje Táctico de ${currentUser.name}`,
                    text || '📁 Ha compartido un material de inteligencia',
                    selectedContact.fcm_token,
                    'chat'
                ).catch(e => console.log('Push ignorado/fallo:', e));
            }

        } catch (e: any) {
            console.error("❌ ERROR EN TRANSMISIÓN TÁCTICA:", e);
            alert("ERROR DE CONEXIÓN: No se pudo transmitir el mensaje al centro de mando.");
        }
    };

    const handleEditMessage = async (msgId: string) => {
        if (!editText.trim()) return;
        try {
            const msg = messages.find(m => m.id === msgId);
            const metadata = { ...(msg?.reactions ? { reactions: msg.reactions } : {}), editedAt: new Date().toISOString() };
            await supabase.from('mensajes_privados').update({ contenido: editText.trim(), metadata }).eq('id', msgId);
            setEditingMsg(null);
            setEditText('');
        } catch (err) {
            console.error("Error editando mensaje:", err);
        }
    };

    const handleDeleteMessage = async (msgId: string) => {
        if (!window.confirm("¿Eliminar este mensaje permanentemente?")) return;
        try {
            await supabase.from('mensajes_privados').delete().eq('id', msgId);
        } catch (err) {
            console.error("Error eliminando mensaje:", err);
        }
    };

    const handleReaction = async (msgId: string, emoji: string) => {
        const msg = messages.find(m => m.id === msgId);
        if (!msg) return;

        try {
            const reactions = { ...(msg.reactions || {}) };
            const userList = reactions[emoji] || [];

            if (userList.includes(currentUser.id)) {
                reactions[emoji] = userList.filter(id => id !== currentUser.id);
                if (reactions[emoji].length === 0) delete reactions[emoji];
            } else {
                reactions[emoji] = [...userList, currentUser.id];
            }

            const metadata = {
                type: msg.type || 'text',
                fileUrl: msg.fileUrl,
                fileName: msg.fileName,
                editedAt: msg.editedAt,
                reactions
            };

            await supabase.from('mensajes_privados').update({ metadata }).eq('id', msgId);
            setShowReactions(null);
        } catch (err) {
            console.error("Error con reacción:", err);
        }
    };

    const insertEmoji = (emoji: string) => {
        setNewMessage(prev => prev + emoji);
        setShowEmojiPicker(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const fileType = file.type;
            const res = await uploadToCloudinary(file);
            if (res.success && res.url) {
                const type = fileType.startsWith('image/') ? 'image' : (fileType.startsWith('video/') ? 'video' : 'document');
                await handleSendMessage(undefined, { url: res.url, type, name: file.name });
            }
        } catch (error) {
            console.error("❌ ERROR CARGANDO ARCHIVO:", error);
            alert("FALLO EN CARGA DE MATERIAL TÁCTICO");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const formatMessageDate = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'HOY';
        if (days === 1) return 'AYER';
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).toUpperCase();
    };

    if (isRecluta) {
        return (
            <div className="fixed inset-0 md:inset-auto md:bottom-20 md:right-6 md:w-[420px] h-[100dvh] md:h-[700px] bg-[#000810]/95 backdrop-blur-2xl border-l md:border border-white/10 md:rounded-[2.5rem] shadow-2xl z-[60] flex flex-col items-center justify-center p-8 animate-in slide-in-from-bottom-10">
                <button onClick={onClose} className="absolute top-6 right-6 p-2 text-white/40 hover:text-white bg-white/5 rounded-full"><X size={24} /></button>
                <div className="w-24 h-24 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6">
                    <Shield size={48} className="text-red-500 animate-pulse" />
                </div>
                <h2 className="text-2xl font-bebas text-white tracking-widest uppercase mb-2">ACCESO DENEGADO</h2>
                <p className="text-center text-white/50 text-[10px] font-bold uppercase tracking-widest leading-relaxed max-w-xs">
                    Las telecomunicaciones de mando directo están restringidas para nivel Recluta. Inicia misiones, completa tu formación y asciende a <b>ACTIVO</b> para desbloquear este canal premium.
                </p>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 md:inset-auto md:bottom-20 md:right-6 md:w-[900px] md:max-w-[calc(100vw-3rem)] h-[100dvh] md:h-[700px] bg-[#000810]/95 backdrop-blur-3xl border-l md:border border-white/10 md:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-row z-[60] overflow-hidden animate-in slide-in-from-bottom-10 duration-500 ease-out">
            {/* Ambient Background */}
            <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
                <div className="absolute top-0 right-[20%] w-[30rem] h-[30rem] bg-[#ffb700]/10 blur-[150px] rounded-full"></div>
            </div>

            {/* LEFTSIDE: Contacts Menu */}
            <div className={`${selectedContact ? 'hidden md:flex' : 'flex'} w-full md:w-[320px] shrink-0 border-r border-white/5 flex flex-col relative z-10 bg-black/40`}>
                <div className="p-6 border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bebas text-2xl tracking-[0.1em] text-white">RED TÁCTICA</h2>
                        <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/60 transition"><X size={18} /></button>
                    </div>
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
                        <input
                            type="text"
                            placeholder="BUSCAR CONTACTO..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-9 pr-4 text-[10px] font-black uppercase tracking-widest text-white focus:border-[#ffb700]/50 focus:outline-none transition-all placeholder:text-white/20"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-1">
                    <p className="px-3 py-2 text-[8px] font-black text-white/30 tracking-[0.2em] uppercase">Comunicaciones Autorizadas ({allowedContacts.length})</p>
                    {allowedContacts.map(agent => (
                        <button
                            key={agent.id}
                            onClick={() => {
                                setSelectedContact(agent);
                                if (contactSummaries[agent.id]?.unreadCount > 0) {
                                    setContactSummaries(prev => ({
                                        ...prev,
                                        [agent.id]: { ...prev[agent.id], unreadCount: 0 }
                                    }));
                                }
                            }}
                            className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all active:scale-95 group overflow-hidden relative ${selectedContact?.id === agent.id ? 'bg-[#ffb700]/10 border border-[#ffb700]/30 shadow-inner' : 'hover:bg-white/5 border border-transparent'}`}
                        >
                            <div className="relative shrink-0">
                                <img src={getAgentPhoto(agent.id)} className="w-12 h-12 rounded-full border border-white/10 object-cover group-hover:scale-110 transition-transform" />
                                {onlineAgents.has(agent.id) && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-black rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)] z-10" />}
                                {agent.userRole === UserRole.DIRECTOR && <Crown size={12} className="absolute -top-1 -right-1 text-[#ffb700] bg-black rounded-full" />}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <div className="flex justify-between items-center mb-0.5">
                                    <p className="text-[11px] font-black text-white uppercase truncate">{agent.name}</p>
                                    {contactSummaries[agent.id]?.lastTimestamp && (
                                        <span className="text-[7px] font-bold text-white/30 uppercase tracking-tighter shrink-0">
                                            {formatMessageDate(contactSummaries[agent.id].lastTimestamp)}
                                        </span>
                                    )}
                                </div>
                                <div className="flex justify-between items-center gap-2">
                                    <p className="text-[9px] font-medium text-white/40 truncate flex-1 lowercase first-letter:uppercase">
                                        {contactSummaries[agent.id]?.lastMessage || `${agent.rank || 'ACTIVO'} • ${agent.userRole}`}
                                    </p>
                                    {contactSummaries[agent.id]?.unreadCount > 0 && (
                                        <span className="h-3.5 min-w-[0.875rem] flex items-center justify-center bg-red-600 text-[7px] font-black text-white px-1 rounded-full shadow-[0_0_8px_rgba(220,38,38,0.4)] shrink-0">
                                            {contactSummaries[agent.id].unreadCount}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </button>
                    ))}
                    {allowedContacts.length === 0 && (
                        <div className="p-6 text-center text-white/20">
                            <Shield size={24} className="mx-auto mb-2 opacity-30" />
                            <p className="text-[9px] font-bold uppercase tracking-widest">NO HAY CONTACTOS DISPONIBLES</p>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHTSIDE: Active Chat */}
            <div className={`${!selectedContact ? 'hidden md:flex md:flex-col md:items-center md:justify-center md:bg-white/[0.01]' : 'flex bg-transparent'} flex-1 flex-col relative w-full h-full z-20`}>
                {!selectedContact ? (
                    <div className="text-center p-8 space-y-4">
                        <div className="w-20 h-20 mx-auto border-2 border-white/5 bg-white/5 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(255,183,0,0.05)]">
                            <MessageSquare size={32} className="text-white/20" />
                        </div>
                        <h2 className="font-bebas text-3xl tracking-[0.15em] text-white/80">COMUNICACIÓN CLASIFICADA</h2>
                        <p className="text-[10px] font-black tracking-widest uppercase text-white/30 max-w-[250px] mx-auto leading-relaxed">SELECCIONE UN AGENTE DEL DIRECTORIO ENCRIPTADO PARA ESTABLECER UN CANAL DIRECTO</p>
                    </div>
                ) : (
                    <>
                        {/* Header Chat */}
                        <div className="h-20 shrink-0 bg-white/[0.03] backdrop-blur-xl border-b border-white/5 flex items-center px-4 md:px-8 gap-4 z-20 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
                            <button onClick={() => setSelectedContact(null)} className="md:hidden p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all text-white/70 active:scale-95">
                                <ChevronLeft size={20} />
                            </button>
                            <img src={getAgentPhoto(selectedContact.id)} className="w-12 h-12 rounded-full border-2 border-[#ffb700]/30 shadow-[0_0_15px_rgba(255,183,0,0.1)] object-cover" />
                            <div className="flex-1">
                                <h2 className="font-bebas text-xl md:text-2xl text-white tracking-[0.1em]">{selectedContact.name}</h2>
                                <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${onlineAgents.has(selectedContact.id) ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-white/20'}`} />
                                    <span className="text-[8px] font-black tracking-widest uppercase text-white/40">{onlineAgents.has(selectedContact.id) ? 'Agente en Línea' : 'Desconectado'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Messages Content */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-4 md:p-8 space-y-3 scroll-hide"
                            onClick={() => { setActiveMenu(null); setShowReactions(null); setShowEmojiPicker(false); }}
                        >
                            {messages.map((msg, idx) => {
                                const isMe = msg.senderId === currentUser.id;
                                const showDate = idx === 0 || formatMessageDate(msg.timestamp) !== formatMessageDate(messages[idx - 1].timestamp);

                                return (
                                    <React.Fragment key={msg.id}>
                                        {showDate && (
                                            <div className="flex justify-center my-6">
                                                <span className="px-4 py-1.5 bg-white/5 text-white/60 border border-white/10 text-[8px] font-black tracking-[0.3em] rounded-full backdrop-blur-sm">
                                                    {formatMessageDate(msg.timestamp)}
                                                </span>
                                            </div>
                                        )}

                                        <div className={`flex flex-col mb-1 group animate-in slide-in-from-bottom-2 ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div
                                                className={`relative p-4 rounded-3xl shadow-lg transition-all duration-300 max-w-[85%] md:max-w-[70%] group/bubble ${isMe
                                                    ? 'bg-gradient-to-br from-[#0f172a] to-[#1e3a8a] text-white rounded-br-md border border-white/10 shadow-[0_10px_30px_rgba(30,58,138,0.3)]'
                                                    : 'bg-white/5 text-slate-100 border border-white/10 rounded-bl-md hover:bg-white/10'}`}
                                                onDoubleClick={(e) => { e.stopPropagation(); setShowReactions(showReactions === msg.id ? null : msg.id); }}
                                                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setActiveMenu(activeMenu === msg.id ? null : msg.id); }}
                                            >
                                                {/* File Renderer (Same as before) */}
                                                {msg.type === 'image' && (
                                                    <div className="mb-2 rounded-2xl overflow-hidden border border-white/10 bg-black/20">
                                                        <img src={msg.fileUrl} className="max-w-full aspect-auto cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => window.open(msg.fileUrl)} alt="Material" />
                                                    </div>
                                                )}
                                                {msg.type === 'document' && (
                                                    <div className="mb-2 p-3 rounded-xl bg-black/20 border border-white/5 flex items-center gap-3 cursor-pointer hover:bg-black/40" onClick={() => window.open(msg.fileUrl)}>
                                                        <div className="p-2 bg-red-500/20 rounded-lg"><FileText size={20} className="text-red-400" /></div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[10px] font-bold text-white uppercase truncate">{msg.fileName}</p>
                                                        </div>
                                                        <Download size={16} className="text-[#ffb700]" />
                                                    </div>
                                                )}

                                                {editingMsg === msg.id ? (
                                                    <div className="flex gap-2 bg-black/40 p-1.5 rounded-xl border border-white/10">
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            value={editText}
                                                            onChange={(e) => setEditText(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleEditMessage(msg.id);
                                                                if (e.key === 'Escape') { setEditingMsg(null); setEditText(''); }
                                                            }}
                                                            className="flex-1 bg-transparent border-none px-2 text-[11px] font-medium text-white outline-none"
                                                        />
                                                        <button onClick={() => handleEditMessage(msg.id)} className="text-[#ffb700] text-[8px] font-black uppercase tracking-widest px-2 hover:bg-white/10 rounded-lg transition-colors">Confirmar</button>
                                                    </div>
                                                ) : (
                                                    <p className="text-[11px] md:text-xs leading-relaxed font-medium whitespace-pre-wrap break-words">{msg.text}</p>
                                                )}

                                                <div className={`flex items-center gap-1.5 mt-2 opacity-50 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    {isMe && (
                                                        <span className="flex items-center">
                                                            {msg.leido ? (
                                                                <CheckCheck size={10} className="text-blue-400" />
                                                            ) : (
                                                                <Check size={10} />
                                                            )}
                                                        </span>
                                                    )}
                                                    <span className="text-[7px] uppercase font-black tracking-widest">
                                                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                                                    </span>
                                                    {msg.editedAt && <span className="text-[7px] italic font-medium">editado</span>}
                                                </div>

                                                {/* Mini quick menu on hover */}
                                                <div className={`absolute top-1/2 -translate-y-1/2 ${isMe ? '-left-12' : '-right-12'} opacity-0 group-hover/bubble:opacity-100 transition-opacity flex flex-col gap-1`}>
                                                    <button onClick={() => setShowReactions(msg.id)} className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/50 hover:bg-[#ffb700]/20 hover:text-[#ffb700] hover:border-[#ffb700]/50 shadow-lg backdrop-blur-md transition-all active:scale-90 relative z-30"><Smile size={14} /></button>
                                                    {isMe && <button onClick={() => setActiveMenu(msg.id)} className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/50 hover:bg-white/20 hover:text-white shadow-lg backdrop-blur-md transition-all active:scale-90 relative z-30"><MoreVertical size={14} /></button>}
                                                </div>

                                                {/* Context Menu Dropdown */}
                                                {activeMenu === msg.id && isMe && (
                                                    <div className={`absolute top-full mt-2 ${isMe ? 'right-0' : 'left-0'} w-36 bg-[#000810]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200`} onClick={(e) => e.stopPropagation()}>
                                                        <button onClick={() => { setEditingMsg(msg.id); setEditText(msg.text); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-4 py-3 text-white/80 hover:bg-white/10 transition-all text-left"><Pencil size={12} className="text-[#38bdf8]" /><span className="text-[9px] font-black uppercase tracking-widest">Editar</span></button>
                                                        <button onClick={() => { handleDeleteMessage(msg.id); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 transition-all text-left"><Trash2 size={12} /><span className="text-[9px] font-black uppercase tracking-widest">Borrar</span></button>
                                                    </div>
                                                )}

                                                {/* Reaction Palette Popover */}
                                                {showReactions === msg.id && (
                                                    <div className={`absolute -top-14 ${isMe ? 'right-0' : 'left-0'} bg-[#000810]/95 backdrop-blur-xl border border-white/10 rounded-full px-4 py-2 flex items-center gap-2 shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-50 animate-in fade-in zoom-in-95 duration-200`} onClick={(e) => e.stopPropagation()}>
                                                        {REACTION_EMOJIS.map(emoji => (
                                                            <button key={emoji} onClick={() => handleReaction(msg.id, emoji)} className={`text-xl hover:scale-125 transition-transform p-1.5 rounded-full ${msg.reactions?.[emoji]?.includes(currentUser.id) ? 'bg-[#ffb700]/20' : 'hover:bg-white/10'}`}>{emoji}</button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Reactions Display */}
                                            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                                <div className={`flex flex-wrap gap-1 mt-1 z-10 ${isMe ? 'justify-end pr-2' : 'justify-start pl-2'}`}>
                                                    {Object.entries(msg.reactions).map(([emoji, users]) => (
                                                        users.length > 0 && (
                                                            <button key={emoji} onClick={() => handleReaction(msg.id, emoji)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all shadow-md backdrop-blur-md border ${users.includes(currentUser.id) ? 'bg-[#ffb700]/10 border-[#ffb700]/40 text-yellow-300' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'}`}>
                                                                <span className="drop-shadow-sm">{emoji}</span>
                                                                <span className="text-[8px] font-black opacity-80">{users.length}</span>
                                                            </button>
                                                        )
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>

                        {/* Emoji Picker Menu */}
                        {showEmojiPicker && (
                            <div className="absolute bottom-24 right-4 md:right-8 bg-[#001224]/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl z-30 w-[280px] md:w-[320px] overflow-hidden animate-in slide-in-from-bottom-5">
                                <div className="flex gap-1 p-3 border-b border-white/5 overflow-x-auto no-scrollbar bg-black/20">
                                    {Object.keys(EMOJI_CATEGORIES).map(cat => (
                                        <button key={cat} onClick={() => setEmojiCategory(cat)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex-1 ${emojiCategory === cat ? 'bg-[#ffb700] text-black shadow-[0_0_15px_rgba(255,183,0,0.3)]' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}>{cat}</button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-2 p-4 max-h-[220px] overflow-y-auto scroll-hide">
                                    {EMOJI_CATEGORIES[emojiCategory].map((emoji, i) => (
                                        <button key={`${emoji}-${i}`} onClick={() => insertEmoji(emoji)} className="text-2xl p-2 rounded-xl hover:bg-white/10 transition-all hover:scale-110 active:scale-95 flex items-center justify-center aspect-square">{emoji}</button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Message Input Bottom Bar */}
                        <div className="shrink-0 p-4 md:p-6 bg-gradient-to-t from-[#000810] to-transparent relative z-20">
                            <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

                                <div className="flex bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-1 shadow-lg shadow-black/50">
                                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="p-3 text-white/50 hover:bg-white/10 hover:text-[#ffb700] transition-colors rounded-2xl active:scale-95"><Paperclip size={18} /></button>
                                    <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-3 transition-colors rounded-2xl active:scale-95 ${showEmojiPicker ? 'bg-white/10 text-[#ffb700]' : 'text-white/50 hover:bg-white/10 hover:text-[#ffb700]'}`}><Smile size={18} /></button>
                                </div>

                                <div className="flex-1 relative group">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder={`MENSAJE A ${selectedContact.name}...`}
                                        disabled={isUploading}
                                        onFocus={() => setShowEmojiPicker(false)}
                                        className="w-full bg-white/[0.03] backdrop-blur-xl border border-white/10 group-focus-within:border-[#ffb700]/30 rounded-3xl py-4 flex-1 px-6 text-xs text-white placeholder:text-white/30 focus:outline-none transition-all font-bold tracking-widest shadow-inner shadow-black/20"
                                    />
                                    {isUploading && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2"><Loader2 size={16} className="text-[#ffb700] animate-spin" /></div>
                                    )}
                                </div>

                                <button type="submit" disabled={!newMessage.trim() || isUploading} className="p-4 bg-gradient-to-br from-[#0f172a] to-blue-900 border border-blue-500/30 text-blue-400 hover:text-white rounded-3xl disabled:opacity-30 disabled:pointer-events-none hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:border-blue-400 transition-all active:scale-95 flex items-center justify-center shrink-0 w-14 h-14"><Send size={20} className="translate-x-0.5" /></button>
                            </form>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default TacticalChat;
