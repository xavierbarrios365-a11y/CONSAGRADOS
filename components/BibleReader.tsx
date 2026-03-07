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
    Sparkles,
    X
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
    const [activeTestament, setActiveTestament] = useState<'OT' | 'NT'>('OT');
    const [copiedVerse, setCopiedVerse] = useState<boolean>(false);
    const [selectedVerses, setSelectedVerses] = useState<BibleVerse[]>([]);

    // 0. Cargar Estado Persistente
    useEffect(() => {
        const savedBook = localStorage.getItem('bible_last_book');
        const savedChapter = localStorage.getItem('bible_last_chapter');
        const savedView = localStorage.getItem('bible_last_view');

        if (savedBook && savedChapter && savedView === 'VERSES') {
            try {
                const bookObj = JSON.parse(savedBook);
                setSelectedBook(bookObj);
                setSelectedChapter(parseInt(savedChapter));
                setViewState('VERSES');
                fetchVerses(bookObj.names[0], parseInt(savedChapter));
                // Determine testament to keep tabs synced
                if (books.length > 0) {
                    const bookIdx = books.findIndex(b => b.names[0] === bookObj.names[0]);
                    if (bookIdx >= 39) setActiveTestament('NT');
                }
            } catch (e) {
                console.error("Error restoring bible state", e);
            }
        }
    }, [books.length]); // Wait for books to loaded to find index

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
            const bookSlug = bookName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const res = await fetch(`https://bible-api.deno.dev/api/read/${BIBLE_VERSION}/${bookSlug}/${chapter}`);
            const data = await res.json();
            if (data && data.vers) {
                setVerses(data.vers);
                setViewState('VERSES');
                localStorage.setItem('bible_last_view', 'VERSES');
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
        localStorage.setItem('bible_last_book', JSON.stringify(book));
        localStorage.setItem('bible_last_view', 'CHAPTERS');
    };

    const handleSelectChapter = (chapter: number) => {
        setSelectedChapter(chapter);
        localStorage.setItem('bible_last_chapter', chapter.toString());
        if (selectedBook) {
            fetchVerses(selectedBook.names[0], chapter);
        }
    };

    const handleBack = () => {
        if (viewState === 'VERSES') {
            setViewState('CHAPTERS');
            localStorage.setItem('bible_last_view', 'CHAPTERS');
        }
        else if (viewState === 'CHAPTERS') {
            setViewState('BOOKS');
            localStorage.setItem('bible_last_view', 'BOOKS');
        }
    };

    const getBookName = (book: BibleBook | null) => book?.names[0] || '';

    const toggleVerseSelection = (verse: BibleVerse) => {
        if (selectedVerses.some(v => v.id === verse.id)) {
            setSelectedVerses(selectedVerses.filter(v => v.id !== verse.id));
        } else {
            setSelectedVerses([...selectedVerses, verse].sort((a, b) => a.number - b.number));
        }
    };

    const handleCopySelection = () => {
        if (selectedVerses.length === 0) return;
        const bookName = getBookName(selectedBook);
        const chapter = selectedChapter;

        let textToCopy = "";
        if (selectedVerses.length === 1) {
            textToCopy = `"${selectedVerses[0].verse}" - ${bookName} ${chapter}:${selectedVerses[0].number}`;
        } else {
            const verseNumbers = selectedVerses.map(v => v.number).join(', ');
            const combinedText = selectedVerses.map(v => `${v.number}. ${v.verse}`).join('\n');
            textToCopy = `${bookName} ${chapter}:${verseNumbers}\n\n${combinedText}`;
        }

        navigator.clipboard.writeText(textToCopy + "\n\n(Consagrados 2026)");
        setCopiedVerse(true);
        setTimeout(() => setCopiedVerse(false), 2000);
    };

    const handleWhatsAppShare = () => {
        if (selectedVerses.length === 0 || selectedVerses.length > 2) return;
        const bookName = getBookName(selectedBook);
        const chapter = selectedChapter;

        let shareText = "";
        if (selectedVerses.length === 1) {
            shareText = `📖 *${bookName} ${chapter}:${selectedVerses[0].number}*\n\n"${selectedVerses[0].verse}"`;
        } else {
            shareText = `📖 *${bookName} ${chapter}:${selectedVerses[0].number}-${selectedVerses[1].number}*\n\n1. ${selectedVerses[0].verse}\n2. ${selectedVerses[1].verse}`;
        }

        window.open(`https://wa.me/?text=${encodeURIComponent(shareText + "\n\n_Consagrados 2026_")}`, '_blank');
    };

    const handleStoriesShare = async () => {
        if (!currentUser || selectedVerses.length === 0 || selectedVerses.length > 2) return;
        const confirm = window.confirm(`¿Publicar ${selectedVerses.length} versículo(s) en tus historias?`);
        if (!confirm) return;

        const bookName = getBookName(selectedBook);
        const chapter = selectedChapter;
        const versesText = selectedVerses.map(v => v.verse).join(' ');
        const reference = `${bookName} ${chapter}:${selectedVerses[0].number}${selectedVerses.length > 1 ? '-' + selectedVerses[1].number : ''}`;

        // Formato para Story - Usamos un separador especial para renderizado pro en StoriesBar
        const storyContent = `${versesText} | ${reference}`;

        // Imagen Premium: Fondo Tactical Moody (Biblia/Oscuro)
        const PREMIUM_BIBLE_BG = 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?q=80&w=2073&auto=format&fit=crop';

        const res = await createStorySupabase(currentUser.id, PREMIUM_BIBLE_BG, storyContent);
        if (res.success) {
            alert("✅ Publicado en Historias");
            setSelectedVerses([]);
        } else alert("❌ Error al publicar");
    };

    const handleIntelFeedShare = async () => {
        if (!currentUser || selectedVerses.length === 0 || selectedVerses.length > 2) return;
        const confirm = window.confirm("¿Compartir selección en el Intel Feed?");
        if (!confirm) return;

        const bookName = getBookName(selectedBook);
        const chapter = selectedChapter;
        const versesText = selectedVerses.map(v => v.verse).join(' ');
        const reference = `${bookName} ${chapter}:${selectedVerses[0].number}${selectedVerses.length > 1 ? '-' + selectedVerses[1].number : ''}`;

        // Formato compitible con fetchNewsFeedSupabase parser
        const feedContent = `[BIBLE]: Reflexión Diaria [VERSE]: ${versesText} [REF]: ${reference}`;

        const res = await publishNewsSupabase(currentUser.id, currentUser.name, 'BIBLE_SHARE', feedContent);
        if (res.success) {
            alert("🚀 Compartido en Intel Feed");
            setSelectedVerses([]);
        } else alert("❌ Error al compartir");
    };

    const filteredBooks = books.filter(b => {
        const matchesSearch = b.names.some(n => n.toLowerCase().includes(searchTerm.toLowerCase()));
        if (!matchesSearch) return false;

        // Testament logic: OT is first 39 books, NT is the rest
        const bookIndex = books.findIndex(book => book.names[0] === b.names[0]);
        if (activeTestament === 'OT') return bookIndex < 39;
        return bookIndex >= 39;
    });

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
                            <h1 className="text-3xl font-black uppercase tracking-[0.15em] font-bebas text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/40">Biblia</h1>
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
                    <div className="space-y-4">
                        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 backdrop-blur-md mb-4">
                            <button
                                onClick={() => setActiveTestament('OT')}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTestament === 'OT' ? 'bg-amber-500 text-[#000814] shadow-lg shadow-amber-500/20' : 'text-white/40 hover:text-white'}`}
                            >
                                Antiguo Testamento
                            </button>
                            <button
                                onClick={() => setActiveTestament('NT')}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTestament === 'NT' ? 'bg-amber-500 text-[#000814] shadow-lg shadow-amber-500/20' : 'text-white/40 hover:text-white'}`}
                            >
                                Nuevo Testamento
                            </button>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative group"
                        >
                            <div className="absolute inset-0 bg-amber-500/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity rounded-3xl" />
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-amber-500 transition-colors z-10" size={20} />
                            <input
                                type="text"
                                placeholder="BUSCAR LIBRO..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-black/60 backdrop-blur-xl border border-white/10 rounded-[2rem] py-5 pl-14 pr-6 text-[13px] font-bold tracking-widest outline-none focus:border-amber-500/50 transition-all text-white placeholder:text-white/10 relative z-10 shadow-2xl"
                            />
                        </motion.div>
                    </div>
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
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-32"
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
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            onDragEnd={(e, info) => {
                                if (info.offset.x > 100 && selectedChapter && selectedChapter > 1) {
                                    handleSelectChapter(selectedChapter - 1);
                                } else if (info.offset.x < -100 && selectedChapter && selectedBook && selectedChapter < selectedBook.chapters) {
                                    handleSelectChapter(selectedChapter + 1);
                                }
                            }}
                            className="max-w-3xl mx-auto space-y-12 pb-64"
                        >
                            {verses.map((v, idx) => {
                                const isSelected = selectedVerses.some(sv => sv.id === v.id);
                                return (
                                    <motion.div
                                        key={v.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0, transition: { delay: idx * 0.05 } }}
                                        onClick={() => toggleVerseSelection(v)}
                                        className={`group relative p-4 -mx-4 rounded-3xl transition-all duration-300 cursor-pointer ${isSelected ? 'bg-amber-500/10 border-l-4 border-amber-500 shadow-[inset_0_0_20px_rgba(245,158,11,0.1)]' : 'hover:bg-white/5 border-l-4 border-transparent'}`}
                                    >
                                        <div className="flex gap-6 items-start">
                                            <div className="pt-1.5">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bebas text-lg shadow-[0_0_15px_rgba(245,158,11,0.1)] transition-all duration-300 ${isSelected ? 'bg-amber-500 text-black' : 'bg-amber-500/10 border border-amber-500/20 text-amber-500 group-hover:bg-amber-500/30'}`}>
                                                    {v.number}
                                                </div>
                                            </div>
                                            <div className="flex-1 space-y-4">
                                                {v.study && (
                                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/60 mb-2 font-montserrat">
                                                        {v.study}
                                                    </h4>
                                                )}
                                                <p className={`text-xl md:text-2xl font-montserrat font-medium leading-[1.8] transition-colors ${isSelected ? 'text-white' : 'text-white/80'}`}>
                                                    {v.verse}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}

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

            {/* TACTICAL CAPSULE: BARRA DE ACCIONES ELITE */}
            <AnimatePresence>
                {selectedVerses.length > 0 && (
                    <motion.div
                        initial={{ y: 50, x: '-50%', opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, x: '-50%', opacity: 1, scale: 1 }}
                        exit={{ y: 50, x: '-50%', opacity: 0, scale: 0.9 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-8 left-1/2 z-[100] w-auto pointer-events-none"
                    >
                        <div className="bg-[#0a0a0a]/80 backdrop-blur-3xl border border-white/10 rounded-full px-2 py-2 shadow-[0_20px_40px_rgba(0,0,0,0.6)] flex items-center gap-1.5 pointer-events-auto overflow-hidden ring-1 ring-white/5">
                            {/* Selection Count - Tactical Hex Look */}
                            <div className="flex items-center gap-3 pl-4 pr-3 border-r border-white/5 mr-1">
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-amber-500/20 rounded-full blur group-hover:bg-amber-500/30 transition-all" />
                                    <span className="relative w-8 h-8 bg-amber-500 text-black rounded-lg flex items-center justify-center font-black text-sm tracking-tighter">
                                        {selectedVerses.length}
                                    </span>
                                </div>
                                <div className="hidden md:block">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white leading-none">Protocolo</p>
                                    <p className="text-[7px] font-bold uppercase tracking-widest text-amber-500/60 mt-1">Selección</p>
                                </div>
                            </div>

                            {/* Action Buttons Capsule */}
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={handleCopySelection}
                                    title="Copiar Selección"
                                    className="p-3.5 rounded-full hover:bg-white/10 transition-all group relative overflow-hidden"
                                >
                                    {copiedVerse ? <CheckCircle2 className="text-green-400 scale-110" size={20} /> : <Copy className="text-white/60 group-hover:text-white" size={20} />}
                                    {copiedVerse && <motion.div layoutId="glow" className="absolute inset-0 bg-green-400/10 blur-xl" />}
                                </button>

                                <div className="w-[1px] h-6 bg-white/5 mx-1" />

                                <div className="flex items-center gap-1">
                                    <button
                                        disabled={selectedVerses.length > 2}
                                        onClick={handleWhatsAppShare}
                                        className={`p-3.5 rounded-full transition-all group relative ${selectedVerses.length > 2 ? 'opacity-20 grayscale pointer-events-none' : 'hover:bg-green-500/10'}`}
                                    >
                                        <MessageCircle className="text-green-400/60 group-hover:text-green-400" size={20} />
                                    </button>
                                    <button
                                        disabled={selectedVerses.length > 2}
                                        onClick={handleStoriesShare}
                                        className={`p-3.5 rounded-full transition-all group relative ${selectedVerses.length > 2 ? 'opacity-20 grayscale pointer-events-none' : 'hover:bg-purple-500/10'}`}
                                    >
                                        <Sparkles className="text-purple-400/60 group-hover:text-purple-400" size={20} />
                                    </button>
                                    <button
                                        disabled={selectedVerses.length > 2}
                                        onClick={handleIntelFeedShare}
                                        className={`p-3.5 rounded-full transition-all group relative ${selectedVerses.length > 2 ? 'opacity-20 grayscale pointer-events-none' : 'hover:bg-indigo-500/10'}`}
                                    >
                                        <Zap className="text-indigo-400/60 group-hover:text-indigo-400" size={20} />
                                    </button>
                                </div>

                                <div className="w-[1px] h-6 bg-white/5 mx-1" />

                                <button
                                    onClick={() => setSelectedVerses([])}
                                    className="p-3.5 rounded-full hover:bg-red-500/10 group transition-all"
                                >
                                    <X className="text-white/20 group-hover:text-red-400" size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Limit Warning - Elite HUD Style */}
                        {selectedVerses.length > 2 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                className="mt-3 flex justify-center"
                            >
                                <div className="px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full backdrop-blur-xl flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
                                    <span className="text-[8px] font-black text-amber-500 uppercase tracking-[0.2em]">Restricción: Máx 2 Versículos</span>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

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
