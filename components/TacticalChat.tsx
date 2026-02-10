import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase-config';
import { Agent } from '../types';
import { Send, MessageSquare, X, Shield, Zap } from 'lucide-react';

interface Message {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    timestamp: any;
}

interface Props {
    currentUser: Agent;
    onClose: () => void;
}

const TacticalChat: React.FC<Props> = ({ currentUser, onClose }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isOpen, setIsOpen] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const q = query(
            collection(db, 'messages'),
            orderBy('timestamp', 'asc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs: Message[] = [];
            snapshot.forEach((doc) => {
                msgs.push({ id: doc.id, ...doc.data() } as Message);
            });
            setMessages(msgs);
            setTimeout(scrollToBottom, 100);
        });

        return () => unsubscribe();
    }, []);

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            await addDoc(collection(db, 'messages'), {
                text: newMessage,
                senderId: currentUser.id,
                senderName: currentUser.name,
                timestamp: serverTimestamp()
            });
            setNewMessage('');
        } catch (e) {
            console.error("Error enviando mensaje:", e);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
            {/* Header */}
            <div className="p-4 bg-indigo-600 flex items-center justify-between text-white border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                        <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm tracking-tighter">CANAL TÁCTICO</h3>
                        <span className="text-[10px] opacity-80 uppercase font-black">Comunicaciones encriptadas</span>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-[radial-gradient(circle_at_center,_#1e1b4b_0%,_#0f172a_100%)]"
            >
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex flex-col ${msg.senderId === currentUser.id ? 'items-end' : 'items-start'}`}
                    >
                        <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.senderId === currentUser.id
                                ? 'bg-indigo-600 text-white rounded-br-none'
                                : 'bg-slate-800 text-slate-200 border border-indigo-500/20 rounded-bl-none'
                            }`}>
                            <div className="flex items-center gap-1.5 mb-1">
                                {msg.senderId !== currentUser.id && (
                                    <span className="text-[10px] font-black uppercase text-indigo-400">{msg.senderName}</span>
                                )}
                                <Shield className="w-3 h-3 opacity-30" />
                            </div>
                            <p className="leading-relaxed">{msg.text}</p>
                        </div>
                        <span className="text-[9px] text-slate-500 mt-1 uppercase font-bold">
                            {msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                        </span>
                    </div>
                ))}
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2 opacity-50">
                        <Zap className="w-8 h-8" />
                        <p className="text-xs font-bold uppercase tracking-widest text-center px-8">Canal despejado. Esperando transmisiones...</p>
                    </div>
                )}
            </div>

            {/* Input */}
            <form
                onSubmit={handleSendMessage}
                className="p-4 bg-slate-900 border-t border-indigo-500/20"
            >
                <div className="relative flex items-center">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Introduce comando táctico..."
                        className="w-full bg-slate-800 border-none rounded-xl py-3 pl-4 pr-12 text-sm text-white focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="absolute right-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default TacticalChat;
