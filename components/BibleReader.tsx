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
    X,
    Loader2,
    Flame,
    Clock,
    Trophy
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { createStorySupabase, publishNewsSupabase } from '../services/supabaseService';
import { updateAgentPointsSupabase } from '../services/agentService';
import { Agent } from '../types';
import { BIBLE_BOOKS, BibleBookInfo } from '../data/bibleBooks';
import { tacticalSound } from '../utils/soundEffects';

interface BibleVerse {
    number: number;
    verse: string;
    study?: string | null;
    id: number;
}

interface BibleReaderProps {
    currentUser: Agent | null;
}

const BibleReader: React.FC<BibleReaderProps> = ({ currentUser }) => {
    const [selectedBook, setSelectedBook] = useState<BibleBookInfo | null>(null);
    const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
    const [verses, setVerses] = useState<BibleVerse[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewState, setViewState] = useState<'BOOKS' | 'CHAPTERS' | 'VERSES'>('BOOKS');
    const [activeTestament, setActiveTestament] = useState<'OT' | 'NT'>('OT');
    const [copiedVerse, setCopiedVerse] = useState<boolean>(false);
    const [selectedVerses, setSelectedVerses] = useState<BibleVerse[]>([]);
    
    // Motor de Gamificación por Tiempo de Lectura Activa
    const [readingSeconds, setReadingSeconds] = useState(0);
    const [sessionXpEarned, setSessionXpEarned] = useState(0);
    const [xpPopup, setXpPopup] = useState<string | null>(null);

    // Heartbeat de lectura bíblica continua: +10 XP cada 60 segundos
    useEffect(() => {
        if (viewState !== 'VERSES' || !currentUser) return;

        const interval = setInterval(() => {
            setReadingSeconds(prev => {
                const next = prev + 1;
                if (next > 0 && next % 60 === 0) {
                    awardReadingXp();
                }
                return next;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [viewState, currentUser?.id]);

    const awardReadingXp = async () => {
        if (!currentUser) return;
        try {
            const res = await updateAgentPointsSupabase(currentUser.id, 'BIBLIA', 10, 1, currentUser.streakCount || 0);
            if (res.success) {
                setSessionXpEarned(prev => prev + 10);
                tacticalSound.playVictoryChime();
                setXpPopup("+10 XP");
                setTimeout(() => setXpPopup(null), 3000);
            }
        } catch (e) {
            console.error("Error awarding reading XP:", e);
        }
    };

    // 0. Cargar Estado Persistente al Iniciar
    useEffect(() => {
        const savedBookId = localStorage.getItem('bible_last_book_id');
        const savedChapter = localStorage.getItem('bible_last_chapter');
        const savedView = localStorage.getItem('bible_last_view');

        if (savedBookId && savedChapter && savedView === 'VERSES') {
            const foundBook = BIBLE_BOOKS.find(b => b.bookid === parseInt(savedBookId, 10));
            if (foundBook) {
                setSelectedBook(foundBook);
                setSelectedChapter(parseInt(savedChapter, 10));
                setViewState('VERSES');
                fetchVerses(foundBook, parseInt(savedChapter, 10));
                setActiveTestament(foundBook.testament);
            }
        }
    }, []);

    // 1. Cargar Versículos del Capítulo Seleccionado (Bolls Life RVR1960 API)
    const fetchVerses = useCallback(async (book: BibleBookInfo, chapter: number) => {
        setLoading(true);
        try {
            const res = await fetch(`https://bolls.life/get-chapter/RV1960/${book.bookid}/${chapter}/`);
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const data = await res.json();

            if (Array.isArray(data)) {
                const parsedVerses: BibleVerse[] = data.map((v: any) => ({
                    id: v.pk || v.id || v.verse,
                    number: v.verse || v.number,
                    verse: (v.text || v.verse || '').replace(/<[^>]*>/g, '').trim(),
                    study: null
                }));

                setVerses(parsedVerses);
                setViewState('VERSES');
                localStorage.setItem('bible_last_book_id', book.bookid.toString());
                localStorage.setItem('bible_last_chapter', chapter.toString());
                localStorage.setItem('bible_last_view', 'VERSES');
            } else {
                throw new Error("Respuesta inválida");
            }
        } catch (err) {
            console.error('Error fetching verses:', err);
            // Fallback de emergencia en caso de red desconectada
            setVerses([
                {
                    id: 1,
                    number: 1,
                    verse: `No se pudo conectar con el servidor bíblico. Por favor verifica tu conexión a internet o intenta nuevamente.`,
                    study: 'ERROR DE SINCRONIZACIÓN'
                }
            ]);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSelectBook = (book: BibleBookInfo) => {
        tacticalSound.playReactionPop();
        setSelectedBook(book);
        setViewState('CHAPTERS');
        localStorage.setItem('bible_last_book_id', book.bookid.toString());
        localStorage.setItem('bible_last_view', 'CHAPTERS');
    };

    const handleSelectChapter = (chapter: number) => {
        tacticalSound.playReactionPop();
        setSelectedChapter(chapter);
        localStorage.setItem('bible_last_chapter', chapter.toString());
        if (selectedBook) {
            fetchVerses(selectedBook, chapter);
        }
    };

    const handleBack = () => {
        tacticalSound.playReactionPop();
        if (viewState === 'VERSES') {
            setViewState('CHAPTERS');
            localStorage.setItem('bible_last_view', 'CHAPTERS');
        } else if (viewState === 'CHAPTERS') {
            setViewState('BOOKS');
            localStorage.setItem('bible_last_view', 'BOOKS');
        }
    };

    const getBookName = (book: BibleBookInfo | null) => book?.name || '';

    const toggleVerseSelection = (verse: BibleVerse) => {
        tacticalSound.playReactionPop();
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
            textToCopy = `"${selectedVerses[0].verse}" — ${bookName} ${chapter}:${selectedVerses[0].number} (RVR1960)`;
        } else {
            const verseNumbers = selectedVerses.map(v => v.number).join(', ');
            const combinedText = selectedVerses.map(v => `${v.number}. ${v.verse}`).join('\n');
            textToCopy = `${bookName} ${chapter}:${verseNumbers} (RVR1960)\n\n${combinedText}`;
        }

        navigator.clipboard.writeText(textToCopy + "\n\nConsagrados 2026");
        setCopiedVerse(true);
        tacticalSound.playVictoryChime();
        setTimeout(() => setCopiedVerse(false), 2000);
    };

    const handleWhatsAppShare = () => {
        if (selectedVerses.length === 0 || selectedVerses.length > 2) return;
        const bookName = getBookName(selectedBook);
        const chapter = selectedChapter;

        let shareText = "";
        if (selectedVerses.length === 1) {
            shareText = `📖 *${bookName} ${chapter}:${selectedVerses[0].number}* [RVR1960]\n\n"${selectedVerses[0].verse}"`;
        } else {
            shareText = `📖 *${bookName} ${chapter}:${selectedVerses[0].number}-${selectedVerses[1].number}* [RVR1960]\n\n1. ${selectedVerses[0].verse}\n2. ${selectedVerses[1].verse}`;
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
        const storyContent = `${versesText} | ${reference}`;
        const PREMIUM_BIBLE_BG = 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?q=80&w=2073&auto=format&fit=crop';

        const res = await createStorySupabase(currentUser.id, PREMIUM_BIBLE_BG, storyContent);
        if (res.success) {
            tacticalSound.playVictoryChime();
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
        const feedContent = `[BIBLE]: Reflexión Diaria [VERSE]: ${versesText} [REF]: ${reference}`;

        const res = await publishNewsSupabase(currentUser.id, currentUser.name, 'BIBLE_SHARE', feedContent);
        if (res.success) {
            tacticalSound.playVictoryChime();
            alert("🚀 Compartido en Intel Feed");
            setSelectedVerses([]);
        } else alert("❌ Error al compartir");
    };

    // Filtro inteligente de libros: Búsqueda global a través de ambos testamentos
    const cleanSearch = searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    const filteredBooks = BIBLE_BOOKS.filter(b => {
        const nameNorm = b.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const abrevNorm = b.abrev.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const matchesSearch = !cleanSearch || nameNorm.includes(cleanSearch) || abrevNorm.includes(cleanSearch);

        if (!matchesSearch) return false;

        // Si el usuario escribió un término de búsqueda, mostrar TODOS los libros que coincidan
        if (cleanSearch.length > 0) return true;

        // Si no hay búsqueda, filtrar por la pestaña activa
        return activeTestament === 'OT' ? b.testament === 'OT' : b.testament === 'NT';
    });

    return (
        <div className="flex flex-col h-full bg-[#000814] text-white font-montserrat relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

            {/* Header Táctico Premium */}
            <div className="p-6 md:p-8 pb-4 shrink-0 relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <motion.div
                            initial={{ rotate: -10, scale: 0.8 }}
                            animate={{ rotate: 0, scale: 1 }}
                            className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                        >
                            <BookOpen size={20} className="stroke-[2.5]" />
                        </motion.div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl md:text-2xl font-black tracking-wider uppercase font-bebas text-white">
                                    BIBLIA SAGRADA
                                </h1>
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[8px] font-black uppercase text-[#ffb700] font-bebas">
                                    RVR1960
                                </span>
                            </div>
                            <p className="text-[8px] text-white/40 font-bold uppercase tracking-widest">
                                {viewState === 'BOOKS' ? 'CATÁLOGO CANÓNICO' :
                                 viewState === 'CHAPTERS' ? `${selectedBook?.name} • SELECCIONA CAPÍTULO` :
                                 `${selectedBook?.name} ${selectedChapter} • LECTURA TÁCTICA`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {viewState === 'VERSES' && (
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="hidden sm:flex items-center gap-2.5 bg-gradient-to-r from-amber-500/15 to-yellow-500/5 border border-amber-500/30 rounded-2xl px-3.5 py-1.5 backdrop-blur-md shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                            >
                                <Flame className="text-[#ffb700] animate-bounce" size={16} />
                                <div className="text-left">
                                    <p className="text-[7px] text-white/50 font-bold uppercase tracking-widest leading-none">Meditación Consagrada</p>
                                    <p className="text-[11px] font-black text-[#ffb700] font-bebas leading-tight">
                                        {Math.floor(readingSeconds / 60).toString().padStart(2, '0')}:{(readingSeconds % 60).toString().padStart(2, '0')} • +{sessionXpEarned} XP HOY
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {viewState !== 'BOOKS' && (
                            <button
                                onClick={handleBack}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-black uppercase font-bebas flex items-center gap-1.5 transition-all text-white active:scale-95"
                            >
                                <ChevronLeft size={16} /> Volver
                            </button>
                        )}
                    </div>
                </div>

                {/* POPUP FLOTANTE DE XP GANADO */}
                <AnimatePresence>
                    {xpPopup && (
                        <motion.div
                            initial={{ opacity: 0, y: -20, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1.05 }}
                            exit={{ opacity: 0, y: -20, scale: 0.9 }}
                            className="absolute top-20 right-8 z-50 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black font-bebas px-4 py-2 rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.6)] flex items-center gap-2 text-xs uppercase tracking-widest border border-white"
                        >
                            <Sparkles size={16} />
                            ¡{xpPopup} POR LECTURA CONTINUA!
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Filtros y Buscador solo en vista de libros */}
                {viewState === 'BOOKS' && (
                    <div className="space-y-3">
                        {/* Selector de Testamento */}
                        <div className="grid grid-cols-2 gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/10">
                            <button
                                onClick={() => { setActiveTestament('OT'); setSearchTerm(''); }}
                                className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider font-bebas transition-all ${
                                    activeTestament === 'OT' && cleanSearch.length === 0
                                        ? 'bg-[#ffb700] text-[#001f3f] shadow-lg'
                                        : 'text-white/60 hover:text-white'
                                }`}
                            >
                                Antiguo Testamento (39)
                            </button>
                            <button
                                onClick={() => { setActiveTestament('NT'); setSearchTerm(''); }}
                                className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider font-bebas transition-all ${
                                    activeTestament === 'NT' && cleanSearch.length === 0
                                        ? 'bg-[#ffb700] text-[#001f3f] shadow-lg'
                                        : 'text-white/60 hover:text-white'
                                }`}
                            >
                                Nuevo Testamento (27)
                            </button>
                        </div>

                        {/* Buscador de Libros */}
                        <div className="relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar libro (ej. Mateo, Salmos, Génesis, Juan)..."
                                className="w-full bg-black/50 border border-white/10 rounded-2xl py-3.5 pl-11 pr-10 text-xs text-white placeholder-white/30 outline-none focus:border-[#ffb700] transition-all font-montserrat"
                            />
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* CONTENIDO PRINCIPAL: LIBROS / CAPÍTULOS / VERSÍCULOS */}
            <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-32 no-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 space-y-4">
                        <Loader2 size={40} className="animate-spin text-[#ffb700]" />
                        <p className="text-xs font-black uppercase tracking-widest text-white/40 font-bebas">
                            SINCRONIZANDO TEXTO SAGRADO...
                        </p>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        {/* VISTA 1: CATÁLOGO DE LIBROS */}
                        {viewState === 'BOOKS' && (
                            <motion.div
                                key="books"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3"
                            >
                                {filteredBooks.map((book) => (
                                    <button
                                        key={book.bookid}
                                        onClick={() => handleSelectBook(book)}
                                        className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#ffb700]/50 hover:bg-[#ffb700]/10 transition-all text-left group active:scale-95 relative overflow-hidden"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[9px] font-black uppercase text-[#ffb700] font-bebas">
                                                {book.abrev}
                                            </span>
                                            <span className="text-[8px] font-bold text-white/40 uppercase">
                                                {book.testament === 'OT' ? 'AT' : 'NT'}
                                            </span>
                                        </div>
                                        <h3 className="text-sm font-black uppercase text-white font-bebas tracking-wide group-hover:text-[#ffb700] transition-colors truncate">
                                            {book.name}
                                        </h3>
                                        <p className="text-[8px] text-white/40 font-bold uppercase mt-0.5">
                                            {book.chapters} Capítulos
                                        </p>
                                    </button>
                                ))}
                            </motion.div>
                        )}

                        {/* VISTA 2: SELECTOR DE CAPÍTULOS */}
                        {viewState === 'CHAPTERS' && selectedBook && (
                            <motion.div
                                key="chapters"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                            >
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex justify-between items-center">
                                    <div>
                                        <span className="text-[8px] font-black uppercase tracking-widest text-[#ffb700] font-bebas">
                                            LIBRO SELECCIONADO
                                        </span>
                                        <h2 className="text-xl font-black uppercase text-white font-bebas">
                                            {selectedBook.name} ({selectedBook.chapters} Capítulos)
                                        </h2>
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2.5">
                                    {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((cap) => (
                                        <button
                                            key={cap}
                                            onClick={() => handleSelectChapter(cap)}
                                            className="aspect-square rounded-2xl bg-white/[0.04] border border-white/10 hover:border-[#ffb700] hover:bg-[#ffb700] hover:text-[#001f3f] transition-all flex flex-col items-center justify-center font-black text-sm md:text-base font-bebas text-white active:scale-90"
                                        >
                                            {cap}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* VISTA 3: LECTOR DE VERSÍCULOS */}
                        {viewState === 'VERSES' && selectedBook && selectedChapter && (
                            <motion.div
                                key="verses"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="max-w-3xl mx-auto space-y-4"
                            >
                                {/* Barra Superior del Capítulo */}
                                <div className="p-4 rounded-2xl bg-[#001428] border border-[#ffb700]/30 flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-2">
                                        <Book size={18} className="text-[#ffb700]" />
                                        <h2 className="text-lg font-black uppercase text-white font-bebas tracking-wide">
                                            {selectedBook.name} {selectedChapter}
                                        </h2>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            disabled={selectedChapter <= 1}
                                            onClick={() => handleSelectChapter(selectedChapter - 1)}
                                            className="p-2 bg-white/5 hover:bg-white/10 disabled:opacity-20 rounded-xl border border-white/10 text-white"
                                            title="Capítulo Anterior"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <button
                                            disabled={selectedChapter >= selectedBook.chapters}
                                            onClick={() => handleSelectChapter(selectedChapter + 1)}
                                            className="p-2 bg-white/5 hover:bg-white/10 disabled:opacity-20 rounded-xl border border-white/10 text-white"
                                            title="Siguiente Capítulo"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Lista de Versículos */}
                                <div className="space-y-3">
                                    {verses.map((v) => {
                                        const isSelected = selectedVerses.some(sv => sv.id === v.id);

                                        return (
                                            <div
                                                key={v.id}
                                                onClick={() => toggleVerseSelection(v)}
                                                className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                                                    isSelected
                                                        ? 'bg-[#ffb700]/15 border-[#ffb700] shadow-[0_0_20px_rgba(255,183,0,0.15)] text-white'
                                                        : 'bg-white/[0.02] border-white/5 hover:border-white/20 text-white/80 hover:bg-white/[0.04]'
                                                }`}
                                            >
                                                <div className="flex items-start gap-3.5">
                                                    <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 font-bebas ${
                                                        isSelected ? 'bg-[#ffb700] text-[#001f3f]' : 'bg-white/10 text-[#ffb700]'
                                                    }`}>
                                                        {v.number}
                                                    </span>
                                                    <p className="text-sm md:text-base leading-relaxed font-medium font-montserrat flex-1 pt-0.5">
                                                        {v.verse}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>

            {/* BARRA FLOTANTE DE ACCIONES PARA VERSÍCULOS SELECCIONADOS */}
            <AnimatePresence>
                {selectedVerses.length > 0 && (
                    <motion.div
                        initial={{ y: 50, x: '-50%', opacity: 0 }}
                        animate={{ y: 0, x: '-50%', opacity: 1 }}
                        exit={{ y: 50, x: '-50%', opacity: 0 }}
                        className="fixed bottom-8 left-1/2 z-50 bg-[#001428]/95 backdrop-blur-2xl border-2 border-[#ffb700] rounded-full px-5 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex items-center gap-3"
                    >
                        <div className="flex items-center gap-2 pr-3 border-r border-white/10">
                            <span className="w-7 h-7 rounded-full bg-[#ffb700] text-[#001f3f] flex items-center justify-center font-black text-xs font-bebas">
                                {selectedVerses.length}
                            </span>
                            <span className="text-[9px] font-black uppercase text-white font-bebas tracking-wider hidden sm:inline">
                                Seleccionado(s)
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={handleCopySelection}
                                className="p-2.5 rounded-full hover:bg-white/10 text-white transition-all"
                                title="Copiar Versículos"
                            >
                                {copiedVerse ? <CheckCircle2 size={18} className="text-green-400" /> : <Copy size={18} />}
                            </button>

                            <button
                                onClick={handleWhatsAppShare}
                                className="p-2.5 rounded-full hover:bg-green-500/20 text-green-400 transition-all"
                                title="Compartir en WhatsApp"
                            >
                                <MessageCircle size={18} />
                            </button>

                            <button
                                onClick={handleStoriesShare}
                                className="p-2.5 rounded-full hover:bg-purple-500/20 text-purple-400 transition-all"
                                title="Compartir en Historias"
                            >
                                <Sparkles size={18} />
                            </button>

                            <button
                                onClick={handleIntelFeedShare}
                                className="p-2.5 rounded-full hover:bg-amber-500/20 text-[#ffb700] transition-all"
                                title="Compartir en Intel Feed"
                            >
                                <Zap size={18} />
                            </button>

                            <button
                                onClick={() => setSelectedVerses([])}
                                className="p-2.5 rounded-full hover:bg-red-500/20 text-red-400 transition-all ml-1"
                                title="Deseleccionar"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BibleReader;
