import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, Timestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase-config';
import { Agent, UserRole } from '../types';
import { Send, MessageSquare, X, Shield, Zap, Paperclip, Image, FileText, Play, Check, CheckCheck, Loader2, Download, MoreVertical, Trash2, Pencil, Smile } from 'lucide-react';
import { uploadFile, uploadImage } from '../services/sheetsService';
import { sendPushBroadcast } from '../services/notifyService';
import { compressImage } from '../services/storageUtils';

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
    timestamp: Timestamp;
    type?: 'text' | 'image' | 'video' | 'document';
    fileUrl?: string;
    fileName?: string;
    reactions?: { [emoji: string]: string[] }; // emoji -> array of user IDs
    editedAt?: Timestamp;
}

interface Props {
    currentUser: Agent;
    agents: Agent[];
    onClose: () => void;
}

const TacticalChat: React.FC<Props> = ({ currentUser, agents, onClose }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [editingMsg, setEditingMsg] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [showReactions, setShowReactions] = useState<string | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [emojiCategory, setEmojiCategory] = useState('Frecuentes');
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const editInputRef = useRef<HTMLInputElement>(null);

    const canModerate = currentUser.userRole === UserRole.DIRECTOR || currentUser.userRole === UserRole.LEADER;

    const getAgentPhoto = useCallback((agentId: string) => {
        const agent = agents.find(a => a.id === agentId);
        return agent?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(agent?.name || 'A')}&background=001f3f&color=ffb700&bold=true`;
    }, [agents]);

    const scrollToBottom = useCallback(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, []);

    useEffect(() => {
        const q = query(
            collection(db, 'messages'),
            orderBy('timestamp', 'asc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const msg = change.doc.data();
                    if (msg.senderId !== currentUser.id && document.hidden) {
                        try {
                            new Notification(`Nuevo de ${msg.senderName}`, {
                                body: msg.text,
                                icon: getAgentPhoto(msg.senderId)
                            });
                        } catch (e) { }
                    }
                }
            });

            const msgs: Message[] = [];
            snapshot.forEach((d) => {
                msgs.push({ id: d.id, ...d.data() } as Message);
            });
            setMessages(msgs);
            setTimeout(scrollToBottom, 100);
        });

        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }

        return () => unsubscribe();
    }, [currentUser.id, scrollToBottom, getAgentPhoto]);

    const handleSendMessage = async (e?: React.FormEvent, fileData?: { url: string; type: string; name: string }) => {
        if (e) e.preventDefault();

        const text = newMessage.trim();
        if (!text && !fileData) return;

        try {
            const msgData: any = {
                senderId: currentUser.id,
                senderName: currentUser.name,
                timestamp: serverTimestamp(),
            };

            if (fileData) {
                msgData.type = fileData.type;
                msgData.fileUrl = fileData.url;
                msgData.fileName = fileData.name;
                msgData.text = text || `Archivo: ${fileData.name}`;
            } else {
                msgData.type = 'text';
                msgData.text = text;
            }

            setNewMessage('');
            setShowEmojiPicker(false);
            await addDoc(collection(db, 'messages'), msgData);

            // Disparar Notificación Push Global
            sendPushBroadcast(
                `CHAT GRUPAL: ${msgData.senderName}`,
                msgData.type === 'text' ? msgData.text : '📁 Ha compartido un archivo multimedia'
            ).catch(e => console.log('Push silenciado:', e));

        } catch (e) {
            console.error("❌ ERROR EN TRANSMISIÓN:", e);
            alert("FALLO EN ENCRIPTACIÓN DE MENSAJE");
        }
    };

    const handleEditMessage = async (msgId: string) => {
        if (!editText.trim()) return;
        try {
            await updateDoc(doc(db, 'messages', msgId), {
                text: editText.trim(),
                editedAt: serverTimestamp()
            });
            setEditingMsg(null);
            setEditText('');
        } catch (err) {
            console.error("Error editando mensaje:", err);
            alert("Error al editar mensaje");
        }
    };

    const handleDeleteMessage = async (msgId: string) => {
        if (!window.confirm("¿Eliminar este mensaje?")) return;
        try {
            await deleteDoc(doc(db, 'messages', msgId));
        } catch (err) {
            console.error("Error eliminando mensaje:", err);
            alert("Error al eliminar mensaje");
        }
    };

    const handleReaction = async (msgId: string, emoji: string) => {
        const msg = messages.find(m => m.id === msgId);
        if (!msg) return;

        try {
            const reactions = { ...(msg.reactions || {}) };
            const userList = reactions[emoji] || [];

            if (userList.includes(currentUser.id)) {
                // Remove reaction
                reactions[emoji] = userList.filter(id => id !== currentUser.id);
                if (reactions[emoji].length === 0) delete reactions[emoji];
            } else {
                // Add reaction
                reactions[emoji] = [...userList, currentUser.id];
            }

            await updateDoc(doc(db, 'messages', msgId), { reactions });
            setShowReactions(null);
        } catch (err) {
            console.error("Error con reacción:", err);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            let res;
            const fileType = file.type;

            if (fileType.startsWith('image/')) {
                const base64 = await compressImage(file);
                res = await uploadImage(base64, file);
                if (res.success && res.url) {
                    await handleSendMessage(undefined, { url: res.url, type: 'image', name: file.name });
                }
            } else if (fileType.startsWith('video/')) {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const base64 = (event.target?.result as string).split(',')[1];
                    res = await uploadFile(base64, file);
                    if (res.success && res.url) {
                        await handleSendMessage(undefined, { url: res.url, type: 'video', name: file.name });
                    }
                };
                reader.readAsDataURL(file);
            } else {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const base64 = (event.target?.result as string).split(',')[1];
                    res = await uploadFile(base64, file);
                    if (res.success && res.url) {
                        await handleSendMessage(undefined, { url: res.url, type: 'document', name: file.name });
                    }
                };
                reader.readAsDataURL(file);
            }
        } catch (error) {
            console.error("❌ ERROR CARGANDO ARCHIVO:", error);
            alert("FALLO EN CARGA DE MATERIAL TÁCTICO");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const formatMessageDate = (timestamp: Timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate();
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'HOY';
        if (days === 1) return 'AYER';
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).toUpperCase();
    };



    const insertEmoji = (emoji: string) => {
        setNewMessage(prev => prev + emoji);
        setShowEmojiPicker(false);
    };

    return (
        <div className="fixed bottom-0 right-0 w-full md:bottom-4 md:right-4 md:w-[400px] h-[100dvh] md:h-[600px] bg-[#000c19] border-l md:border border-white/10 md:rounded-[2.5rem] shadow-2xl flex flex-col z-[60] overflow-hidden animate-in slide-in-from-bottom-10 duration-500 ease-out">
            {/* Header: WhatsApp Style with Official Logo */}
            <div className="pt-[max(env(safe-area-inset-top),16px)] pb-4 px-4 bg-[#001f3f] flex items-center justify-between text-white border-b border-white/5 relative z-10 shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full border border-[#ffb700]/30 overflow-hidden bg-white/5 flex items-center justify-center">
                            <Shield className="w-6 h-6 text-[#ffb700] opacity-80" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#001f3f] animate-pulse"></div>
                    </div>
                    <div>
                        <h3 className="font-black text-sm tracking-widest uppercase">CANAL GRUPAL</h3>
                        <p className="text-[9px] text-[#ffb700] uppercase font-bold tracking-widest opacity-80">Conexión Segura: {agents.length} Miembros</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-red-500/20 rounded-xl transition-all text-white/80 hover:text-red-400 border border-white/10 active:scale-95"
                        title="SALIR DEL CANAL"
                    >
                        <X size={22} strokeWidth={3} />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#000c19] scroll-hide relative"
                style={{
                    backgroundImage: 'radial-gradient(#ffffff05 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                }}
                onClick={() => { setActiveMenu(null); setShowReactions(null); }}
            >
                {messages.map((msg, idx) => {
                    const isMe = msg.senderId === currentUser.id;
                    const showDate = idx === 0 || formatMessageDate(msg.timestamp) !== formatMessageDate(messages[idx - 1].timestamp);
                    const showAvatar = !isMe && (idx === messages.length - 1 || messages[idx + 1].senderId !== msg.senderId);
                    const isOwnerOrMod = isMe || canModerate;

                    return (
                        <React.Fragment key={msg.id}>
                            {showDate && (
                                <div className="flex justify-center my-6">
                                    <span className="px-4 py-1.5 bg-[#001f3f]/80 text-[#ffb700] text-[8px] font-black tracking-[0.3em] rounded-full border border-white/5 backdrop-blur-sm">
                                        {formatMessageDate(msg.timestamp)}
                                    </span>
                                </div>
                            )}

                            <div className={`flex items-end gap-2 mb-1 group animate-in slide-in-from-bottom-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                {!isMe && (
                                    <div className="w-8 h-8 rounded-full border border-white/10 overflow-hidden shrink-0 bg-[#001f3f] shadow-lg mb-1">
                                        <img src={getAgentPhoto(msg.senderId)} className="w-full h-full object-cover" alt={msg.senderName} title={msg.senderName} />
                                    </div>
                                )}

                                <div className={`max-w-[80%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                                    {/* Message Bubble */}
                                    <div
                                        className={`relative p-3 rounded-2xl shadow-sm transition-all duration-300 ${isMe
                                            ? 'bg-blue-600 text-white rounded-tr-none hover:bg-blue-500'
                                            : 'bg-white/5 text-slate-200 border border-white/10 rounded-tl-none hover:bg-white/10'}`}
                                        onDoubleClick={(e) => { e.stopPropagation(); setShowReactions(showReactions === msg.id ? null : msg.id); }}
                                        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if (isOwnerOrMod) setActiveMenu(activeMenu === msg.id ? null : msg.id); }}
                                    >

                                        {!isMe && (
                                            <p className="text-[9px] font-black text-[#ffb700] uppercase tracking-tighter mb-1.5 truncate max-w-full">
                                                {msg.senderName}
                                            </p>
                                        )}

                                        {/* File Content */}
                                        {msg.type === 'image' && (
                                            <div className="mb-2 rounded-xl overflow-hidden border border-white/10 bg-black/20">
                                                <img src={msg.fileUrl} className="max-w-full aspect-auto cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => window.open(msg.fileUrl)} alt="Material" />
                                            </div>
                                        )}

                                        {msg.type === 'video' && (
                                            <div className="mb-2 rounded-xl overflow-hidden border border-white/10 bg-black/20 relative group">
                                                <video src={msg.fileUrl} className="max-w-full" controls={false} />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-all cursor-pointer" onClick={() => window.open(msg.fileUrl)}>
                                                    <Play size={32} className="text-white fill-white" />
                                                </div>
                                            </div>
                                        )}

                                        {msg.type === 'document' && (
                                            <div className="mb-2 p-3 rounded-xl bg-black/20 border border-white/5 flex items-center gap-3 cursor-pointer hover:bg-black/40" onClick={() => window.open(msg.fileUrl)}>
                                                <div className="p-2 bg-red-500/20 rounded-lg"><FileText size={20} className="text-red-400" /></div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] font-bold text-white uppercase truncate">{msg.fileName}</p>
                                                    <p className="text-[8px] text-white/40 uppercase tracking-widest">Documento Táctico</p>
                                                </div>
                                                <Download size={16} className="text-[#ffb700]" />
                                            </div>
                                        )}

                                        {/* Edit Mode or Normal Text */}
                                        {editingMsg === msg.id ? (
                                            <div className="flex gap-2">
                                                <input
                                                    ref={editInputRef}
                                                    type="text"
                                                    value={editText}
                                                    onChange={(e) => setEditText(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleEditMessage(msg.id);
                                                        if (e.key === 'Escape') { setEditingMsg(null); setEditText(''); }
                                                    }}
                                                    className="flex-1 bg-black/30 border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#ffb700]"
                                                />
                                                <button onClick={() => handleEditMessage(msg.id)} className="text-[#ffb700] text-[10px] font-black uppercase">OK</button>
                                                <button onClick={() => { setEditingMsg(null); setEditText(''); }} className="text-white/40 text-[10px] font-black uppercase">X</button>
                                            </div>
                                        ) : (
                                            <p className="text-xs leading-relaxed font-medium whitespace-pre-wrap break-words">{msg.text}</p>
                                        )}

                                        <div className={`flex items-center gap-1.5 mt-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <span className="text-[8px] opacity-40 uppercase font-black tracking-widest">
                                                {msg.timestamp ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                                            </span>
                                            {msg.editedAt && <span className="text-[7px] opacity-30 italic">editado</span>}
                                            {isMe && <CheckCheck size={10} className="text-blue-200" />}
                                        </div>

                                        {/* Context Menu (Edit/Delete for owners and moderators) */}
                                        {activeMenu === msg.id && isOwnerOrMod && (
                                            <div className={`absolute top-0 ${isMe ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} ml-2 mr-2 bg-[#001833] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200`}
                                                onClick={(e) => e.stopPropagation()}>
                                                {(isMe || canModerate) && (
                                                    <>
                                                        {isMe && (
                                                            <button
                                                                onClick={() => { setEditingMsg(msg.id); setEditText(msg.text); setActiveMenu(null); }}
                                                                className="w-full flex items-center gap-3 px-5 py-3 text-white/80 hover:bg-white/5 transition-all text-left"
                                                            >
                                                                <Pencil size={14} className="text-blue-400" />
                                                                <span className="text-[10px] font-black uppercase tracking-widest">Editar</span>
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => { handleDeleteMessage(msg.id); setActiveMenu(null); }}
                                                            className="w-full flex items-center gap-3 px-5 py-3 text-red-400 hover:bg-red-500/10 transition-all text-left"
                                                        >
                                                            <Trash2 size={14} />
                                                            <span className="text-[10px] font-black uppercase tracking-widest">Eliminar</span>
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => { setShowReactions(msg.id); setActiveMenu(null); }}
                                                    className="w-full flex items-center gap-3 px-5 py-3 text-white/80 hover:bg-white/5 transition-all text-left"
                                                >
                                                    <Smile size={14} className="text-[#ffb700]" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Reaccionar</span>
                                                </button>
                                            </div>
                                        )}

                                        {/* Reaction Quick Picker */}
                                        {showReactions === msg.id && (
                                            <div className={`absolute -top-12 ${isMe ? 'right-0' : 'left-0'} bg-[#001833] border border-white/10 rounded-full px-3 py-2 flex items-center gap-1 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200`}
                                                onClick={(e) => e.stopPropagation()}>
                                                {REACTION_EMOJIS.map(emoji => (
                                                    <button
                                                        key={emoji}
                                                        onClick={() => handleReaction(msg.id, emoji)}
                                                        className={`text-lg hover:scale-125 transition-transform p-1 rounded-full ${msg.reactions?.[emoji]?.includes(currentUser.id) ? 'bg-[#ffb700]/20' : 'hover:bg-white/10'}`}
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Reactions Display */}
                                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                        <div className={`flex flex-wrap gap-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            {Object.entries(msg.reactions).map(([emoji, users]) => (
                                                users.length > 0 && (
                                                    <button
                                                        key={emoji}
                                                        onClick={() => handleReaction(msg.id, emoji)}
                                                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all ${users.includes(currentUser.id)
                                                            ? 'bg-[#ffb700]/20 border-[#ffb700]/30 text-[#ffb700]'
                                                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
                                                    >
                                                        <span>{emoji}</span>
                                                        <span className="text-[9px] font-black">{users.length}</span>
                                                    </button>
                                                )
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}

                {isUploading && (
                    <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-2xl w-fit animate-pulse mx-auto my-4">
                        <Loader2 size={16} className="animate-spin text-[#ffb700]" />
                        <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">Subiendo Material...</span>
                    </div>
                )}

                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-white/20 gap-4 py-20 translate-y-20">
                        <div className="p-6 rounded-full bg-white/5 border border-white/5">
                            <Shield size={48} className="animate-pulse" />
                        </div>
                        <div className="text-center space-y-1">
                            <p className="text-sm font-black uppercase tracking-[0.5em]">Sector Seguro</p>
                            <p className="text-[8px] font-bold uppercase tracking-widest">Esperando transmisiones del mando...</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Emoji Picker Overlay */}
            {showEmojiPicker && (
                <div className="absolute bottom-[72px] left-0 right-0 bg-[#001224] border-t border-white/10 z-20 animate-in slide-in-from-bottom-4 duration-300">
                    {/* Category tabs */}
                    <div className="flex gap-1 p-2 border-b border-white/5 overflow-x-auto no-scrollbar">
                        {Object.keys(EMOJI_CATEGORIES).map(cat => (
                            <button
                                key={cat}
                                onClick={() => setEmojiCategory(cat)}
                                className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${emojiCategory === cat ? 'bg-[#ffb700] text-[#001f3f]' : 'text-white/40 hover:text-white/60 hover:bg-white/5'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                    {/* Emoji grid */}
                    <div className="grid grid-cols-8 gap-1 p-3 max-h-[200px] overflow-y-auto scroll-hide">
                        {EMOJI_CATEGORIES[emojiCategory].map((emoji, i) => (
                            <button
                                key={`${emoji}-${i}`}
                                onClick={() => insertEmoji(emoji)}
                                className="text-xl p-2 rounded-lg hover:bg-white/10 transition-all active:scale-90"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input: Premium Design */}
            <div className="p-4 md:p-6 bg-[#001f3f] border-t border-white/5 relative z-10">
                <form
                    onSubmit={handleSendMessage}
                    className="flex items-center gap-3"
                >
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="p-3 text-white/60 hover:text-[#ffb700] transition-colors hover:bg-white/5 rounded-full"
                    >
                        <Paperclip size={20} />
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={`p-3 transition-colors hover:bg-white/5 rounded-full ${showEmojiPicker ? 'text-[#ffb700]' : 'text-white/60 hover:text-[#ffb700]'}`}
                    >
                        <Smile size={20} />
                    </button>

                    <div className="flex-1 relative group">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Mensaje seguro..."
                            disabled={isUploading}
                            onFocus={() => setShowEmojiPicker(false)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#ffb700]/50 focus:bg-white/10 transition-all font-medium"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!newMessage.trim() || isUploading}
                        className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-500 hover:shadow-[0_0_15px_rgba(37,99,235,0.4)] disabled:opacity-30 disabled:hover:shadow-none transition-all active:scale-90 flex items-center justify-center"
                    >
                        <Send size={20} className={newMessage.trim() ? "translate-x-0.5 -translate-y-0.5" : ""} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default TacticalChat;
