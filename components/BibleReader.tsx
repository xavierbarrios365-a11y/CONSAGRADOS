import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Book,
    ChevronRight,
    ChevronLeft,
    Share2,
    MessageCircle,
    Zap,
    Search,
    BookOpen,
    ArrowRight,
    Copy,
    CheckCircle2,
    ExternalLink,
    Sparkles
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { createStorySupabase, publishNewsSupabase } from '../services/supabaseService';
import { Agent } from '../types';

interface BibleBook {
    pk: number;
    name: string;
    chapters: number;
}

interface BibleVerse {
    pk: number;
    verse: number;
    text: string;
}

interface BibleReaderProps {
    currentUser: Agent | null;
}

const BIBLE_VERSION = 'RVR1960';

const BibleReader: React.FC<BibleReaderProps> = ({ currentUser }) => {
    const [books, setBooks] = useState<BibleBook[]>([]);
    const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
    const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
    const [verses, setVerses] = useState<BibleVerse[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewState, setViewState] = useState<'BOOKS' | 'CHAPTERS' | 'VERSES'>('BOOKS');
    const [copiedVerse, setCopiedVerse] = useState<number | null>(null);
    const [sharingVerse, setSharingVerse] = useState<BibleVerse | null>(null);

    // 1. Cargar Libros
    useEffect(() => {
        const fetchBooks = async () => {
            try {
                setLoading(true);
                const res = await fetch(`https://bolls.life/get-books/${BIBLE_VERSION}/`);
                const data = await res.json();
                setBooks(data);
            } catch (err) {
                console.error('Error fetching books:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchBooks();
    }, []);

    // 2. Cargar Versículos
    const fetchVerses = useCallback(async (bookPk: number, chapter: number) => {
        try {
            setLoading(true);
            const res = await fetch(`https://bolls.life/get-text/${BIBLE_VERSION}/${bookPk}/${chapter}/`);
            const data = await res.json();
            setVerses(data);
            setViewState('VERSES');
        } catch (err) {
            console.error('Error fetching verses:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSelectBook = (book: BibleBook) => {
        setSelectedBook(book);
        setViewState('CHAPTERS');
    };

    const handleSelectChapter = (chapter: number) => {
        setSelectedChapter(chapter);
        if (selectedBook) {
            fetchVerses(selectedBook.pk, chapter);
        }
    };

    const handleBack = () => {
        if (viewState === 'VERSES') setViewState('CHAPTERS');
        else if (viewState === 'CHAPTERS') setViewState('BOOKS');
    };

    const copyToClipboard = (text: string, verseNum: number) => {
        const fullText = `"${text}" - ${selectedBook?.name} ${selectedChapter}:${verseNum} (Consagrados)`;
        navigator.clipboard.writeText(fullText);
        setCopiedVerse(verseNum);
        setTimeout(() => setCopiedVerse(null), 2000);
    };

    const shareToWhatsApp = (verse: BibleVerse) => {
        const text = `📖 *${selectedBook?.name} ${selectedChapter}:${verse.verse}*\n\n"${verse.text}"\n\n_Consagrados 2026_`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const shareToStories = async (verse: BibleVerse) => {
        if (!currentUser) return;
        const confirm = window.confirm("¿Publicar este versículo en tus historias?");
        if (!confirm) return;

        const content = `📖 ${selectedBook?.name} ${selectedChapter}:${verse.verse}\n\n"${verse.text}"`;
        const res = await createStorySupabase(currentUser.id, 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?q=80&w=2070&auto=format&fit=crop', content);

        if (res.success) alert("✅ Publicado en Historias");
        else alert("❌ Error al publicar");
    };

    const shareToIntelFeed = async (verse: BibleVerse) => {
        if (!currentUser) return;
        const confirm = window.confirm("¿Compartir este versículo en el Intel Feed? (Se ignorará el límite de caracteres)");
        if (!confirm) return;

        const message = `📖 *${selectedBook?.name} ${selectedChapter}:${verse.verse}*\n\n"${verse.text}"`;
        const res = await publishNewsSupabase(currentUser.id, currentUser.name, 'BIBLE_SHARE', message);

        if (res.success) alert("🚀 Compartido en Intel Feed");
        else alert("❌ Error al compartir");
    };

    const filteredBooks = books.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="flex flex-col h-full bg-transparent text-white font-montserrat">
            {/* Header Táctico */}
            <div className="p-6 pb-2 shrink-0">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/20 rounded-xl border border-amber-500/30">
                            <BookOpen className="text-amber-500" size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-widest font-bebas">Nodo Biblia</h1>
                            <p className="text-[8px] text-amber-500/60 font-black uppercase tracking-[0.2em]">Escrituras Sagradas • RVR1960</p>
                        </div>
                    </div>
                    {viewState !== 'BOOKS' && (
                        <button
                            onClick={handleBack}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95"
                        >
                            <ChevronLeft size={14} /> Volver
                        </button>
                    )}
                </div>

                {viewState === 'BOOKS' && (
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-amber-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="BUSCAR LIBRO..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-[12px] font-black tracking-widest outline-none focus:border-amber-500/50 transition-all"
                        />
                    </div>
                )}

                {selectedBook && (
                    <div className="flex items-center gap-2 mt-2">
                        <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded text-[9px] font-black text-amber-500 uppercase">{selectedBook.name}</span>
                        {selectedChapter && <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[9px] font-black text-white/60 uppercase">Capítulo {selectedChapter}</span>}
                    </div>
                )}
            </div>

            {/* Area de Contenido */}
            <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="h-full flex flex-col items-center justify-center gap-4 text-amber-500/30"
                        >
                            <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Sincronizando Manuscritos...</p>
                        </motion.div>
                    ) : viewState === 'BOOKS' ? (
                        <motion.div
                            key="books"
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                            className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-3 pb-20"
                        >
                            {filteredBooks.map((book) => (
                                <button
                                    key={book.pk}
                                    onClick={() => handleSelectBook(book)}
                                    className="aspect-square flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/30 rounded-2xl transition-all group active:scale-95"
                                >
                                    <Book className="text-white/20 group-hover:text-amber-500 transition-colors" size={20} />
                                    <span className="text-[10px] font-black uppercase text-center px-2 leading-tight">{book.name}</span>
                                    <span className="text-[7px] text-white/30 font-bold">{book.chapters} Caps</span>
                                </button>
                            ))}
                        </motion.div>
                    ) : viewState === 'CHAPTERS' && selectedBook ? (
                        <motion.div
                            key="chapters"
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}
                            className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 pb-20"
                        >
                            {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((cap) => (
                                <button
                                    key={cap}
                                    onClick={() => handleSelectChapter(cap)}
                                    className="aspect-square flex items-center justify-center bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/50 rounded-xl text-lg font-bebas tracking-widest transition-all active:scale-90"
                                >
                                    {cap}
                                </button>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="verses"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="space-y-6 pb-40"
                        >
                            {verses.map((v) => (
                                <div key={v.pk} className="group relative">
                                    <div className="flex gap-4">
                                        <span className="text-sm font-bebas text-amber-500/40 mt-1 shrink-0">{v.verse}</span>
                                        <p className="text-lg font-montserrat leading-relaxed text-white/90">
                                            {v.text}
                                        </p>
                                    </div>

                                    {/* Acciones de Versículo */}
                                    <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => copyToClipboard(v.text, v.verse)}
                                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all flex items-center gap-2 text-[8px] font-black uppercase tracking-widest"
                                        >
                                            {copiedVerse === v.verse ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
                                            {copiedVerse === v.verse ? 'Copiado' : 'Copiar'}
                                        </button>
                                        <button
                                            onClick={() => shareToWhatsApp(v)}
                                            className="p-2 bg-green-500/10 hover:bg-green-500/20 rounded-lg text-green-500 transition-all flex items-center gap-2 text-[8px] font-black uppercase tracking-widest"
                                        >
                                            <MessageCircle size={14} /> WhatsApp
                                        </button>
                                        <button
                                            onClick={() => shareToStories(v)}
                                            className="p-2 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg text-purple-500 transition-all flex items-center gap-2 text-[8px] font-black uppercase tracking-widest"
                                        >
                                            <Sparkles size={14} /> Historia
                                        </button>
                                        <button
                                            onClick={() => shareToIntelFeed(v)}
                                            className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg text-indigo-500 transition-all flex items-center gap-2 text-[8px] font-black uppercase tracking-widest"
                                        >
                                            <Zap size={14} /> Intel Feed
                                        </button>
                                    </div>
                                    <div className="h-[1px] w-full bg-gradient-to-r from-white/5 via-white/1 to-transparent mt-6" />
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Decorative Bottom */}
            <div className="p-10 pointer-events-none">
                <div className="flex flex-col items-center opacity-10">
                    <div className="w-12 h-1 bg-amber-500 rounded-full mb-2" />
                    <p className="text-[8px] font-black tracking-[0.5em] uppercase">Soli Deo Gloria</p>
                </div>
            </div>
        </div>
    );
};

export default BibleReader;
