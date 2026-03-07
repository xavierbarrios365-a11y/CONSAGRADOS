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
    names: string[];
    abrev: string;
    chapters: number;
    testament: string;
}

interface BibleVerse {
    number: number;
    verse: string;
    study?: string | null;
    id: number;
}

interface BibleReaderProps {
    currentUser: Agent | null;
}

const BIBLE_VERSION = 'rv1960';

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
                const res = await fetch(`https://bible-api.deno.dev/api/books`);
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
    const fetchVerses = useCallback(async (bookName: string, chapter: number) => {
        try {
            setLoading(true);
            // El API espera el nombre del libro en minúsculas (slug)
            const bookSlug = bookName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const res = await fetch(`https://bible-api.deno.dev/api/read/${BIBLE_VERSION}/${bookSlug}/${chapter}`);
            const data = await res.json();
            // La nueva API devuelve un objeto con la propiedad 'vers'
            if (data && data.vers) {
                setVerses(data.vers);
                setViewState('VERSES');
            }
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
            fetchVerses(selectedBook.names[0], chapter);
        }
    };

    const handleBack = () => {
        if (viewState === 'VERSES') setViewState('CHAPTERS');
        else if (viewState === 'CHAPTERS') setViewState('BOOKS');
    };

    const getBookName = (book: BibleBook | null) => book?.names[0] || '';

    const copyToClipboard = (text: string, verseNum: number) => {
        const fullText = `"${text}" - ${getBookName(selectedBook)} ${selectedChapter}:${verseNum} (Consagrados)`;
        navigator.clipboard.writeText(fullText);
        setCopiedVerse(verseNum);
        setTimeout(() => setCopiedVerse(null), 2000);
    };

    const shareToWhatsApp = (verse: BibleVerse) => {
        const text = `📖 *${getBookName(selectedBook)} ${selectedChapter}:${verse.number}*\n\n"${verse.verse}"\n\n_Consagrados 2026_`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const shareToStories = async (verse: BibleVerse) => {
        if (!currentUser) return;
        const confirm = window.confirm("¿Publicar este versículo en tus historias?");
        if (!confirm) return;

        const content = `📖 ${getBookName(selectedBook)} ${selectedChapter}:${verse.number}\n\n"${verse.verse}"`;
        const res = await createStorySupabase(currentUser.id, 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?q=80&w=2070&auto=format&fit=crop', content);

        if (res.success) alert("✅ Publicado en Historias");
        else alert("❌ Error al publicar");
    };

    const shareToIntelFeed = async (verse: BibleVerse) => {
        if (!currentUser) return;
        const confirm = window.confirm("¿Compartir este versículo en el Intel Feed? (Se ignorará el límite de caracteres)");
        if (!confirm) return;

        const message = `📖 *${getBookName(selectedBook)} ${selectedChapter}:${verse.number}*\n\n"${verse.verse}"`;
        const res = await publishNewsSupabase(currentUser.id, currentUser.name, 'BIBLE_SHARE', message);

        if (res.success) alert("🚀 Compartido en Intel Feed");
        else alert("❌ Error al compartir");
    };

    const filteredBooks = books.filter(b => b.names.some(n => n.toLowerCase().includes(searchTerm.toLowerCase())));

    return (
        <div className="flex flex-col h-full bg-[#000814] text-white font-montserrat relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

            {/* Header Táctico Premium */}
            <div className="p-8 pb-4 shrink-0 relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <motion.div
                            initial={{ rotate: -10, scale: 0.8 }}
                            animate={{ rotate: 0, scale: 1 }}
                            className="p-3 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl shadow-[0_0_20px_rgba(251,191,36,0.2)] border border-white/20"
                        >
                            <BookOpen className="text-[#000814]" size={28} />
                        </motion.div>
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-[0.15em] font-bebas text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/40">Nodo Biblia</h1>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                <p className="text-[9px] text-amber-500/80 font-black uppercase tracking-[0.3em] font-montserrat">Sincronización Divina • RVR1960</p>
                            </div>
                        </div>
                    </div>
                    {viewState !== 'BOOKS' && (
                        <motion.button
                            whileHover={{ scale: 1.05, x: -5 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleBack}
                            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all backdrop-blur-md"
                        >
                            <ChevronLeft size={16} /> Volver Arriba
                        </motion.button>
                    )}
                </div>

                {viewState === 'BOOKS' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative group"
                    >
                        <div className="absolute inset-0 bg-amber-500/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity rounded-3xl" />
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-amber-500 transition-colors z-10" size={20} />
                        <input
                            type="text"
                            placeholder="DESPLEGAR ESCRITURAS (BUSCAR LIBRO)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/60 backdrop-blur-xl border border-white/10 rounded-[2rem] py-5 pl-14 pr-6 text-[13px] font-bold tracking-widest outline-none focus:border-amber-500/50 transition-all text-white placeholder:text-white/10 relative z-10 shadow-2xl"
                        />
                    </motion.div>
                )}

                {selectedBook && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 mt-4"
                    >
                        <div className="h-4 w-[2px] bg-amber-500 rounded-full" />
                        <span className="text-[11px] font-black text-amber-500 uppercase tracking-widest">{getBookName(selectedBook)}</span>
                        {selectedChapter && (
                            <>
                                <ChevronRight className="text-white/20" size={12} />
                                <span className="text-[11px] font-black text-white/60 uppercase tracking-widest">Capítulo {selectedChapter}</span>
                            </>
                        )}
                    </motion.div>
                )}
            </div>

            {/* Area de Contenido - El Core "WOW" */}
            <div className="flex-1 overflow-y-auto p-8 pt-4 no-scrollbar relative z-10">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="h-full flex flex-col items-center justify-center gap-6"
                        >
                            <div className="relative">
                                <div className="w-20 h-20 border-[6px] border-amber-500/10 border-t-amber-500 rounded-full animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <BookOpen className="text-amber-500 animate-pulse" size={24} />
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-[12px] font-black uppercase tracking-[0.4em] text-white/40 animate-pulse bg-gradient-to-r from-transparent via-white/20 to-transparent py-2">Descifrando Pergaminos</p>
                                <p className="text-[8px] font-bold text-amber-500/40 uppercase mt-2 tracking-widest">Accediendo a la Base de Datos Celestial...</p>
                            </div>
                        </motion.div>
                    ) : viewState === 'BOOKS' ? (
                        <motion.div
                            key="books"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-6 pb-32"
                        >
                            {filteredBooks.map((book, idx) => (
                                <motion.button
                                    key={book.names[0]}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0, transition: { delay: idx * 0.01 } }}
                                    whileHover={{ y: -5, scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleSelectBook(book)}
                                    className="relative group h-32 overflow-hidden rounded-[2rem] border border-white/5 hover:border-amber-500/40 transition-all duration-500 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-sm"
                                >
                                    {/* Glass reflection */}
                                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                    <div className="relative p-6 flex items-center gap-5 h-full">
                                        <div className="w-14 h-14 rounded-[1.25rem] bg-white/5 group-hover:bg-amber-500/20 flex items-center justify-center border border-white/10 group-hover:border-amber-500/40 transition-all duration-500 shadow-inner">
                                            <Book className="text-white/20 group-hover:text-amber-500 group-hover:scale-110 transition-all duration-500" size={24} />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-lg font-black uppercase tracking-widest leading-none mb-1 group-hover:text-amber-400 transition-colors">{book.names[0]}</h3>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-bold text-white/30 group-hover:text-amber-500/60 transition-colors uppercase tracking-[0.2em]">{book.chapters} Capítulos</span>
                                            </div>
                                        </div>
                                        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                            <ChevronRight className="text-amber-500" size={20} />
                                        </div>
                                    </div>
                                </motion.button>
                            ))}
                        </motion.div>
                    ) : viewState === 'CHAPTERS' && selectedBook ? (
                        <motion.div
                            key="chapters"
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}
                            className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-10 gap-4 pb-32"
                        >
                            {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((cap) => (
                                <motion.button
                                    key={cap}
                                    whileHover={{ scale: 1.1, backgroundColor: "rgba(245, 158, 11, 0.2)", borderColor: "rgba(245, 158, 11, 0.5)" }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => handleSelectChapter(cap)}
                                    className="aspect-square flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl text-2xl font-bebas tracking-widest transition-all shadow-lg active:shadow-amber-500/20"
                                >
                                    {cap}
                                </motion.button>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="verses"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="max-w-3xl mx-auto space-y-12 pb-64"
                        >
                            {verses.map((v, idx) => (
                                <motion.div
                                    key={v.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0, transition: { delay: idx * 0.05 } }}
                                    className="group relative"
                                >
                                    <div className="flex gap-6 items-start">
                                        <div className="pt-1.5">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bebas text-lg shadow-[0_0_15px_rgba(245,158,11,0.1)] group-hover:bg-amber-500 group-hover:text-black transition-all duration-300">
                                                {v.number}
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            {v.study && (
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/60 mb-2 font-montserrat">
                                                    {v.study}
                                                </h4>
                                            )}
                                            <p className="text-xl md:text-2xl font-montserrat font-medium leading-[1.8] text-white/90 selection:bg-amber-500 selection:text-black">
                                                {v.verse}
                                            </p>

                                            {/* Acciones Premium al Hover */}
                                            <div className="flex flex-wrap gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                                                <button
                                                    onClick={() => copyToClipboard(v.verse, v.number)}
                                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/40 hover:text-white transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-widest backdrop-blur-sm"
                                                >
                                                    {copiedVerse === v.number ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
                                                    {copiedVerse === v.number ? 'Copiado' : 'Copiar'}
                                                </button>
                                                <button
                                                    onClick={() => shareToWhatsApp(v)}
                                                    className="px-4 py-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-xl text-green-500 transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-widest"
                                                >
                                                    <MessageCircle size={14} /> WhatsApp
                                                </button>
                                                <button
                                                    onClick={() => shareToStories(v)}
                                                    className="px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-xl text-purple-500 transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-widest"
                                                >
                                                    <Sparkles size={14} /> Historia
                                                </button>
                                                <button
                                                    onClick={() => shareToIntelFeed(v)}
                                                    className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl text-indigo-500 transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-widest"
                                                >
                                                    <Zap size={14} /> Intel Feed
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute -left-12 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-white/5 to-transparent" />
                                </motion.div>
                            ))}

                            {/* Final del Capítulo - Estética Refinada */}
                            <div className="flex flex-col items-center py-20 opacity-20">
                                <div className="w-px h-24 bg-gradient-to-b from-amber-500 to-transparent mb-6" />
                                <BookOpen className="text-amber-500 mb-4" size={32} />
                                <p className="text-[10px] font-black uppercase tracking-[0.8em] text-center">Fin del Capítulo</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Decorative Bottom / Footer "Aesthetic" */}
            <div className="absolute bottom-0 left-0 w-full p-12 pointer-events-none z-20">
                <div className="flex flex-col items-center">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: 60 }}
                        className="h-[2px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent mb-4"
                    />
                    <p className="text-[9px] font-black tracking-[0.6em] uppercase text-amber-500/40 mix-blend-overlay">Soli Deo Gloria</p>
                    <p className="text-[6px] font-bold tracking-[0.3em] uppercase text-white/10 mt-2">Consagrados Tactical Bible Engine v2.0</p>
                </div>
            </div>
        </div>
    );
};

export default BibleReader;
