import React, { useState, useEffect, useRef } from 'react';
import { Agent } from '../types';
import { getSpiritualCounseling } from '../services/geminiService';
import { Shield, Send, Zap, MessageSquare, X, Loader2, Sparkles, Target } from 'lucide-react';

interface Props {
    currentUser: Agent;
    onClose: () => void;
}

const SpiritualAdvisor: React.FC<Props> = ({ currentUser, onClose }) => {
    const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Mensaje de bienvenida inicial
        setMessages([{
            role: 'ai',
            text: `Buen día, ${currentUser.rank} ${currentUser.name}. El Centro de Mando Espiritual está en línea. ¿Cuál es su reporte de situación o en qué área requiere guía táctica hoy?`
        }]);
    }, [currentUser]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userText = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userText }]);
        setIsLoading(true);

        try {
            const response = await getSpiritualCounseling(currentUser, userText);
            setMessages(prev => [...prev, { role: 'ai', text: response || "SOLICITUD FALLIDA. REINTENTE." }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'ai', text: "ERROR DE CONEXIÓN CON EL CENTRO DE MANDO." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-lg bg-[#000c19] border border-indigo-500/30 rounded-[2.5rem] shadow-2xl flex flex-col h-[600px] overflow-hidden">
                {/* Header */}
                <div className="p-6 bg-gradient-to-r from-indigo-950 to-indigo-800 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-2xl border border-white/20">
                            <Shield className="w-6 h-6 text-indigo-300" />
                        </div>
                        <div>
                            <h2 className="text-white font-bebas text-xl tracking-widest uppercase">Consejero Táctico</h2>
                            <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">Unidad de Inteligencia Espiritual</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all text-white/50 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Chat Area */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-4 rounded-3xl ${msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-br-none shadow-lg'
                                    : 'bg-white/5 border border-white/10 text-slate-200 rounded-bl-none'
                                }`}>
                                {msg.role === 'ai' && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles className="w-3 h-3 text-indigo-400" />
                                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Centro de Mando</span>
                                    </div>
                                )}
                                <p className="text-xs leading-relaxed font-medium">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start animate-pulse">
                            <div className="bg-white/5 border border-white/10 p-4 rounded-3xl rounded-bl-none flex items-center gap-3">
                                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Transmitiendo...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <form onSubmit={handleSend} className="p-6 bg-[#001429] border-t border-white/5">
                    <div className="relative group">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Describa su situación táctica..."
                            className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 pl-6 pr-14 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder:text-slate-600"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="absolute right-2 top-2 bottom-2 px-4 bg-indigo-600 rounded-xl text-white hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all active:scale-95 shadow-lg"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-6 opacity-30">
                        <div className="flex items-center gap-1">
                            <Target size={10} className="text-white" />
                            <span className="text-[8px] text-white font-bold uppercase tracking-tighter">Precisión IA</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Zap size={10} className="text-white" />
                            <span className="text-[8px] text-white font-bold uppercase tracking-tighter">Respuesta Instantánea</span>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SpiritualAdvisor;
