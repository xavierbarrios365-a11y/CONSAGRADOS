import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield, Target, Smartphone, Brain, GraduationCap, CheckCircle2,
    MessageSquare, Mail, ArrowRight, X, ChevronRight, Menu,
    MapPin, Users, Zap, BookOpen, BarChart3, Lock,
    ChevronDown
} from 'lucide-react';
import { AppView } from '../types';
import { fetchActiveBannersSupabase } from '../services/supabaseService';

interface PublicWebsiteProps {
    onLoginClick: () => void;
    onInvestmentClick: () => void;
}

const PublicWebsite: React.FC<PublicWebsiteProps> = ({ onLoginClick, onInvestmentClick }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeSection, setActiveSection] = useState('inicio');
    const [scrolled, setScrolled] = useState(false);
    const [activeBanners, setActiveBanners] = useState<any[]>([]);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        loadBanners();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const loadBanners = async () => {
        const data = await fetchActiveBannersSupabase();
        setActiveBanners(data);
    };

    const navLinks = [
        { id: 'inicio', label: 'INICIO' },
        { id: 'adn', label: 'NUESTRO ADN' },
        { id: 'programa', label: 'EL PROGRAMA' },
        { id: 'academia', label: 'LA ACADEMIA APP' },
        { id: 'socios', label: 'SOCIOS E INVERSORES' },
        { id: 'contacto', label: 'CONTACTO' },
    ];

    const scrollTo = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            const offset = 80;
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = el.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
        setIsMenuOpen(false);
        setActiveSection(id);
    };

    return (
        <div className="min-h-screen bg-[#0F172A] text-white font-sans selection:bg-[#d97706] selection:text-white overflow-x-hidden">
            {/* Blueprint Grid Background */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-10">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(217,119,6,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(217,119,6,0.1)_1px,transparent_1px)] bg-[size:50px_50px]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,#0F172A_80%)]" />
            </div>

            {/* Navigation */}
            <nav className={`fixed top-0 left-0 w-full z-[100] transition-all duration-500 ${scrolled ? 'bg-[#0F172A]/90 backdrop-blur-md py-3 border-b border-white/10 shadow-2xl' : 'bg-transparent py-8 lg:py-6'}`}>
                <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
                    <div className="flex items-center gap-3 cursor-pointer group" onClick={() => scrollTo('inicio')}>
                        <img src="/logo_white.png" alt="Logo" className="h-10 group-hover:scale-110 transition-transform duration-500" />
                        <div className="flex flex-col">
                            <span className="font-bebas text-2xl tracking-[0.2em] leading-none">CONSAGRADOS</span>
                            <span className="font-mono text-[8px] text-[#d97706] tracking-[0.4em] opacity-80">COMMAND CENTER</span>
                        </div>
                    </div>

                    {/* Desktop Nav */}
                    <div className="hidden lg:flex items-center gap-8">
                        {navLinks.map(link => (
                            <button
                                key={link.id}
                                onClick={() => scrollTo(link.id)}
                                className={`font-mono text-[10px] tracking-[0.2em] transition-all hover:text-[#d97706] ${activeSection === link.id ? 'text-[#d97706]' : 'text-white/60'}`}
                            >
                                {link.label}
                            </button>
                        ))}
                        <button
                            onClick={onLoginClick}
                            className="font-bebas text-lg px-6 py-2 bg-[#b91c1c] hover:bg-[#b91c1c]/90 text-white rounded transition-all hover:shadow-[0_0_20px_rgba(185,28,28,0.4)]"
                        >
                            ACCESO AGENTES
                        </button>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button className="lg:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        {isMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>
            </nav>

            {/* Mobile Nav Overlay */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: '100%' }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: '100%' }}
                        className="fixed inset-0 z-[90] bg-[#0F172A] pt-32 px-10 flex flex-col gap-8"
                    >
                        {navLinks.map(link => (
                            <button
                                key={link.id}
                                onClick={() => scrollTo(link.id)}
                                className="font-bebas text-4xl text-left tracking-widest hover:text-[#d97706]"
                            >
                                {link.label}
                            </button>
                        ))}
                        <button
                            onClick={onLoginClick}
                            className="mt-4 font-bebas text-2xl py-4 bg-[#b91c1c] text-white rounded w-full"
                        >
                            ACCESO AGENTES
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <main className="relative z-10 font-roboto">

                {/* PAGE 1: INICIO */}
                <section id="inicio" className="min-h-screen flex items-center justify-center pt-32 lg:pt-20">
                    <div className="max-w-7xl mx-auto px-6 w-full text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            viewport={{ once: true }}
                        >
                            {/* BANNERS ESTRATÉGICOS DINÁMICOS */}
                            <AnimatePresence>
                                {activeBanners.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="mb-10 max-w-2xl mx-auto"
                                    >
                                        {activeBanners.map((banner, idx) => (
                                            <div key={banner.id || idx} className="bg-[#d97706]/10 border border-[#d97706]/30 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-sm">
                                                <div className="flex items-center gap-4 text-left">
                                                    <div className="w-12 h-12 bg-[#d97706] rounded-xl flex items-center justify-center shrink-0">
                                                        <Zap className="text-[#0F172A]" size={24} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bebas text-xl tracking-widest text-[#d97706]">{banner.titulo}</h4>
                                                        <p className="text-[10px] text-white/60 font-mono uppercase tracking-wider">{banner.subtitulo}</p>
                                                    </div>
                                                </div>
                                                {banner.cta_link && (
                                                    <a
                                                        href={banner.cta_link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-6 py-2 bg-[#d97706] text-[#0F172A] font-bebas text-sm rounded-lg hover:bg-[#d97706]/80 transition-all flex items-center gap-2"
                                                    >
                                                        {banner.cta_label || 'VER MÁS'} <ArrowRight size={14} />
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <span className="font-mono text-[#d97706] text-[10px] lg:text-xs tracking-[5px] lg:tracking-[10px] uppercase mb-8 block">TURÉN // VENEZUELA // 2026</span>
                            <h1 className="font-oswald text-5xl md:text-7xl lg:text-9xl font-bold uppercase leading-[1] lg:leading-[0.85] mb-8">
                                FORJANDO LA <br />
                                <span className="text-transparent" style={{ WebkitTextStroke: '2px white' }}>PRÓXIMA </span>
                                GENERACIÓN
                            </h1>
                            <p className="text-white/60 text-lg md:text-2xl max-w-3xl mx-auto font-light leading-relaxed mb-12">
                                No entretenemos audiencias; entrenamos agentes de cambio. Un ecosistema educativo y espiritual de 52 semanas respaldado por gamificación, inteligencia artificial y discipulado táctico.
                            </p>
                            <div className="flex flex-wrap justify-center gap-4 lg:gap-6">
                                <button
                                    onClick={onLoginClick}
                                    className="lg:hidden w-full font-bebas text-xl px-12 py-5 bg-[#b91c1c] text-white rounded flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(185,28,28,0.3)]"
                                >
                                    ACCESO AGENTES <ArrowRight size={20} />
                                </button>
                                <button
                                    onClick={() => scrollTo('programa')}
                                    className="font-bebas text-xl px-12 py-5 bg-white/10 lg:bg-[#b91c1c] text-white rounded hover:shadow-[0_0_30px_rgba(185,28,28,0.4)] transition-all flex items-center gap-3 justify-center"
                                >
                                    VER EL PROGRAMA <ChevronRight size={20} />
                                </button>
                                <button
                                    onClick={onInvestmentClick}
                                    className="font-bebas text-xl px-12 py-5 border border-white/20 text-white rounded hover:bg-white/5 transition-all text-center"
                                >
                                    CONVERTIRSE EN SOCIO
                                </button>
                            </div>
                        </motion.div>

                        {/* Down Arrow */}
                        <motion.div
                            animate={{ y: [0, 10, 0] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="mt-24 cursor-pointer"
                            onClick={() => scrollTo('adn')}
                        >
                            <ChevronDown className="mx-auto text-white/30" size={32} />
                        </motion.div>
                    </div>
                </section>

                {/* Problem/Solution */}
                <section className="py-20 lg:py-32 bg-white/5 border-y border-white/5">
                    <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 lg:gap-20">
                        <div className="space-y-6 lg:space-y-8">
                            <h2 className="font-oswald text-4xl uppercase tracking-tighter shadow-sm">EL SISTEMA TRADICIONAL <span className="text-[#b91c1c]">ESTÁ FALLANDO</span></h2>
                            <p className="text-white/50 text-base lg:text-xl leading-relaxed">
                                Los jóvenes hoy están sobre-estimulados digitalmente pero vacíos de propósito. La religión les ofrece reglas; el mundo les ofrece fragilidad.
                            </p>
                        </div>
                        <div className="space-y-6 lg:space-y-8 border-l-2 border-[#d97706] pl-6 lg:pl-20">
                            <h2 className="font-oswald text-4xl uppercase tracking-tighter text-[#d97706]">LA SOLUCIÓN: <span className="text-white">CONSAGRADOS 2026</span></h2>
                            <p className="text-white/80 text-base lg:text-xl leading-relaxed">
                                Un campo de entrenamiento integral para jóvenes de 12 a 18 años. Operamos en la intersección donde la verdad innegociable se encuentra con la aplicación práctica de la vida real.
                            </p>
                        </div>
                    </div>
                </section>

                {/* The 3 Pillars Icons */}
                <section className="py-32 max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
                        {[
                            { icon: MapPin, title: 'TERRENO FÍSICO', desc: 'Discipulado profundo y dinámicas de alto impacto.' },
                            { icon: Smartphone, title: 'TERRENO DIGITAL', desc: 'Gamificación de hábitos mediante la App Academia.' },
                            { icon: Brain, title: 'MENTORÍA TÁCTICA', desc: 'IA y Radar Psicométrico (DISC) para formación personalizada.' }
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.2 }}
                                className="space-y-4 group"
                            >
                                <div className="w-20 h-20 bg-[#d97706]/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-[#d97706]/20 transition-all border border-[#d97706]/20">
                                    <item.icon className="text-[#d97706]" size={32} />
                                </div>
                                <h3 className="font-bebas text-2xl tracking-widest">{item.title}</h3>
                                <p className="text-white/40 text-sm px-10">{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* PAGE 2: NUESTRO ADN */}
                <section id="adn" className="py-20 lg:py-40 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#d97706]/5 blur-[150px] rounded-full" />
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="grid md:grid-cols-[1fr_1.5fr] gap-12 lg:gap-20">
                            <div>
                                <h2 className="font-oswald text-5xl lg:text-6xl uppercase mb-8 lg:mb-12">NUESTRO <span className="text-[#d97706]">ADN</span></h2>
                                <div className="space-y-12">
                                    <div>
                                        <span className="font-mono text-[#d97706] text-xs uppercase tracking-[0.5em] mb-4 block">MISION</span>
                                        <p className="text-white/70 text-lg">Desmantelar la mediocridad juvenil a través de una mentoría de alto impacto, forjando carácter e identidad.</p>
                                    </div>
                                    <div>
                                        <span className="font-mono text-[#d97706] text-xs uppercase tracking-[0.5em] mb-4 block">VISION</span>
                                        <p className="text-white/70 text-lg">Ser el "Faro sobre la Roca": La referencia indiscutible de formación de carácter en el mundo hispano.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/5 p-12 md:p-20 border-l border-white/10 relative">
                                <Shield className="absolute top-10 right-10 text-white/5" size={150} />
                                <h3 className="font-oswald text-4xl uppercase mb-10">NUESTRA <span className="text-[#d97706]">FILOSOFÍA</span></h3>
                                <p className="text-2xl md:text-3xl font-light italic leading-snug text-white/90">
                                    "No pedimos permiso para ser luz. Vivimos en un mundo que celebra lo superficial, pero nosotros elegimos el camino del carácter. Aquí no venimos a ser entretenidos; venimos a descubrir quiénes somos realmente."
                                </p>
                                <div className="mt-12 h-px w-20 bg-[#d97706]" />
                                <p className="mt-8 font-mono text-[#d97706] text-xs uppercase tracking-widest">PROPÓSITO Y CARÁCTER</p>
                            </div>
                        </div>

                        {/* Theology Section */}
                        <div className="mt-40 grid md:grid-cols-2 gap-20 items-center">
                            <div className="order-2 md:order-1">
                                {/* Placeholder logo watermark */}
                                <div className="w-full max-w-sm mx-auto opacity-10 font-bebas text-8xl text-center border-4 border-white p-10 rotate-12">CONSAGRADOS</div>
                            </div>
                            <div className="order-1 md:order-2 space-y-8">
                                <h2 className="font-oswald text-5xl italic uppercase">TEOLOGÍA: <span className="text-[#b91c1c]">GRACIA RADICAL</span></h2>
                                <p className="text-white/60 text-lg leading-relaxed">
                                    Entendemos que nuestra conducta es el resultado de una identidad sana. Si alguien tropieza, no lo juzgamos; activamos un protocolo de apoyo y restauración. En Consagrados, el acompañamiento siempre va antes que la crítica.
                                </p>
                                <div className="p-6 border border-[#b91c1c]/30 bg-[#b91c1c]/5 rounded-xl">
                                    <p className="text-[#ff6b6b] font-mono text-sm tracking-tighter">
                                        Predicamos un Evangelio que confronta el pecado pero abraza a la persona con gracia inquebrantable.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* PAGE 3: EL PROGRAMA (52 SEMANAS) */}
                <section id="programa" className="py-20 lg:py-40 bg-[#0A101F]">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="text-center mb-16 lg:mb-24">
                            <h2 className="font-oswald text-5xl lg:text-6xl uppercase mb-6 italic">EL <span className="text-[#d97706]">PROGRAMA</span> ANUAL</h2>
                            <p className="text-white/40 max-w-2xl mx-auto">Un año de transformación dividido en 4 operaciones tácticas. Sin improvisación.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { q: 'Q1', title: 'IDENTIDAD', desc: 'Ene-Mar // Destrucción de etiquetas falsas. ¿Quién soy realmente?', color: 'border-blue-500' },
                                { q: 'Q2', title: 'RESTAURACIÓN', desc: 'Abr-Jun // Sanidad interior, manejo de la ira y pureza.', color: 'border-red-500' },
                                { q: 'Q3', title: 'PROPÓSITO', desc: 'Jul-Sep // Talento, vocación y Perfilado de Personalidad DISC.', color: 'border-yellow-500' },
                                { q: 'Q4', title: 'LIDERAZGO', desc: 'Oct-Dic // Transición de consumidores a productores de fe.', color: 'border-[#d97706]' }
                            ].map((stat, i) => (
                                <div key={i} className={`bg-white/5 p-10 border-t-4 ${stat.color} hover:bg-white/10 transition-all group`}>
                                    <span className="font-mono text-xs text-white/30 block mb-2">{stat.q}</span>
                                    <h3 className="font-bebas text-3xl mb-4 group-hover:text-[#d97706] transition-colors">{stat.title}</h3>
                                    <p className="text-white/40 text-sm leading-relaxed">{stat.desc}</p>
                                </div>
                            ))}
                        </div>

                        {/* Operation Bases */}
                        <div className="mt-40 grid md:grid-cols-3 gap-10">
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-[#d97706] flex items-center justify-center text-[#0F172A] font-bebas text-2xl">01</div>
                                    <h4 className="font-bebas text-3xl uppercase">DOMINGOS DE PROFUNDIDAD</h4>
                                </div>
                                <p className="text-white/50 text-sm leading-relaxed">
                                    El Cuartel Teórico (9:00 AM). Utilizamos la metodología O.I.A. (Observación, Interpretación, Aplicación) para enseñar a los jóvenes a pensar críticamente.
                                </p>
                            </div>
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-[#b91c1c] flex items-center justify-center text-white font-bebas text-2xl">02</div>
                                    <h4 className="font-bebas text-3xl uppercase">SÁBADOS DE EXPERIENCIA</h4>
                                </div>
                                <p className="text-white/50 text-sm leading-relaxed">
                                    El Campo de Pruebas (4:00 PM). Fe sudada. Dinámicas físicas, talleres prácticos y trabajo coordinado en equipo.
                                </p>
                            </div>
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white flex items-center justify-center text-[#0F172A] font-bebas text-2xl shrink-0">03</div>
                                    <h4 className="font-bebas text-3xl uppercase">MENTORÍA PERSONALIZADA</h4>
                                </div>
                                <p className="text-white/50 text-sm leading-relaxed">
                                    Espacios de conexión íntima en grupos de 3 a 5 jóvenes para apoyo mutuo, guía personal y construcción de amistades sólidas basadas en valores.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* PAGE 4: LA ACADEMIA APP */}
                <section id="academia" className="py-20 lg:py-40 bg-black relative">
                    <div className="absolute inset-0 bg-blue-900/10 mix-blend-overlay" />
                    <div className="max-w-7xl mx-auto px-6 relative">
                        <div className="max-w-3xl mb-16 lg:mb-24">
                            <h2 className="font-oswald text-5xl lg:text-7xl uppercase italic leading-[1.1] lg:leading-tight mb-8">LA <span className="text-[#d97706]">MISIÓN</span> NO TERMINA EL DOMINGO</h2>
                            <p className="text-white/60 text-xl leading-relaxed">
                                Para conectar el aprendizaje del fin de semana con la vida diaria, desarrollamos una plataforma de gamificación educativa. Las rutinas espirituales se convierten en misiones.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-32 items-center">
                            <div className="space-y-16">
                                {[
                                    { icon: Zap, title: 'ACTIVIDAD & RACHAS', desc: 'Lectura diaria y desafíos que otorgan Puntos de Experiencia (XP).' },
                                    { icon: BookOpen, title: 'CURSOS Y TALLERES', desc: 'Módulos de aprendizaje con trivias interactivas.' },
                                    { icon: BarChart3, title: 'PERFIL DE TALENTOS', desc: 'Descubre tu estilo de personalidad con el Radar Psicométrico.' }
                                ].map((feature, i) => (
                                    <div key={i} className="flex gap-8 group">
                                        <div className="shrink-0 w-16 h-16 bg-white/5 border border-white/10 flex items-center justify-center text-[#d97706] group-hover:bg-[#d97706] group-hover:text-white transition-all">
                                            <feature.icon size={28} />
                                        </div>
                                        <div>
                                            <h4 className="font-bebas text-2xl tracking-widest mb-2">{feature.title}</h4>
                                            <p className="text-white/40 text-sm">{feature.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="relative">
                                {/* Mockup visual representation of phone/app flow */}
                                <div className="relative z-10 p-10 bg-[#0F172A] border border-[#d97706]/30 rounded-3xl backdrop-blur-3xl shadow-2xl">
                                    <div className="flex justify-between items-end mb-8 gap-4 overflow-hidden">
                                        <div className="min-w-0">
                                            <span className="font-mono text-[10px] text-[#d97706] truncate block">STATUS: ACTIVO</span>
                                            <h5 className="font-bebas text-3xl md:text-4xl truncate">AGENTE_01</h5>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="font-mono text-[10px] text-white/40 tracking-widest block">RANK</span>
                                            <div className="text-[#d97706] font-bebas text-2xl md:text-3xl italic">GRADUADO</div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="h-2 bg-white/10 w-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                whileInView={{ width: '70%' }}
                                                className="h-full bg-[#d97706]"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-white/5 border border-white/5 text-center">
                                                <span className="block font-mono text-[8px] opacity-40 uppercase">Global Ranking</span>
                                                <span className="font-bebas text-2xl text-[#d97706]">#12</span>
                                            </div>
                                            <div className="p-4 bg-white/5 border border-white/5 text-center">
                                                <span className="block font-mono text-[8px] opacity-40 uppercase">Total XP</span>
                                                <span className="font-bebas text-2xl text-white">1,450</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Glow effect */}
                                <div className="absolute inset-0 bg-[#d97706]/20 blur-[100px] -z-10" />
                            </div>
                        </div>

                        {/* Ranks showcase */}
                        <div className="mt-40">
                            <h4 className="font-bebas text-4xl mb-12 uppercase tracking-widest text-center">SISTEMA DE <span className="text-[#d97706]">ASCENSOS</span></h4>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 lg:gap-4 px-2">
                                {[
                                    { rank: 'RECLUTA', xp: '0 XP', color: 'border-white/10' },
                                    { rank: 'ACTIVO', xp: '300 XP', color: 'border-white/20' },
                                    { rank: 'MIEMBRO', xp: '500 XP', color: 'border-[#d97706]/50' },
                                    { rank: 'REFERENTE', xp: '700 XP', color: 'border-[#d97706]' },
                                    { rank: 'LÍDER', xp: '1000 XP', color: 'border-[#b91c1c] shadow-[0_0_20px_rgba(185,28,28,0.3)]' }
                                ].map((r, i) => (
                                    <div key={i} className={`p-4 lg:p-8 text-center bg-white/5 border ${r.color} flex flex-col justify-center min-w-0`}>
                                        <h5 className="font-bebas text-lg lg:text-2xl mb-1 truncate">{r.rank}</h5>
                                        <span className="font-mono text-[8px] lg:text-[10px] text-white/30">{r.xp}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="text-center mt-12 mb-16">
                                <p className="text-white/40 text-[10px] font-mono uppercase tracking-[5px]">EL RANGO REQUIERE CARÁCTER VALIDADO EN EL TERRENO REAL</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* PAGE 5: SOCIOS E INVERSORES */}
                <section id="socios" className="py-20 lg:py-40 border-y border-white/10">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
                            <div>
                                <h2 className="font-oswald text-5xl lg:text-6xl uppercase italic leading-[1.1] lg:leading-[0.9] mb-10">INVIERTA EN <span className="text-[#d97706]">LÍDERES</span>, <br className="hidden lg:block" /> NO EN ESTADÍSTICAS.</h2>
                                <p className="text-white/50 text-lg lg:text-xl leading-relaxed mb-12">
                                    Consagrados 2026 es un laboratorio de innovación social y espiritual. Su empresa puede ser el motor financiero que garantice la transformación de 30 jóvenes.
                                </p>

                                <div className="grid grid-cols-2 gap-8 mb-12">
                                    <div className="p-8 bg-[#d97706]/5 border-l-2 border-[#d97706]">
                                        <span className="font-bebas text-4xl block mb-2">$2,410</span>
                                        <span className="font-mono text-[10px] uppercase opacity-40">Presupuesto Anual</span>
                                    </div>
                                    <div className="p-8 bg-[#b91c1c]/5 border-l-2 border-[#b91c1c]">
                                        <span className="font-bebas text-4xl block mb-2">$80-120</span>
                                        <span className="font-mono text-[10px] uppercase opacity-40">Beca / Agente</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-4">
                                    <button onClick={onInvestmentClick} className="font-bebas text-xl px-12 py-5 bg-[#d97706] text-white rounded flex items-center gap-3">
                                        PLAN DE ALIANZAS <ArrowRight size={20} />
                                    </button>
                                    <button className="font-bebas text-xl px-12 py-5 border border-white/20 text-white/60 rounded hover:bg-white/5">
                                        DESCARGAR DOSSIER PDF
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-8 bg-white/5 p-12 border border-white/10">
                                <h3 className="font-oswald text-2xl uppercase tracking-widest text-white/80 border-b border-white/10 pb-4">TRANSPARENCIA CORPORATIVA</h3>
                                <ul className="space-y-6">
                                    <li className="flex gap-4">
                                        <CheckCircle2 className="shrink-0 text-[#d97706]" size={24} />
                                        <div>
                                            <h6 className="font-bebas text-lg tracking-wider">AUDITORÍA TOTAL</h6>
                                            <p className="text-white/40 text-sm">Todo fondo es auditado y destinado estrictamente a la logística de formación.</p>
                                        </div>
                                    </li>
                                    <li className="flex gap-4">
                                        <CheckCircle2 className="shrink-0 text-[#d97706]" size={24} />
                                        <div>
                                            <h6 className="font-bebas text-lg tracking-wider">PROTECCIÓN DE DATA</h6>
                                            <p className="text-white/40 text-sm">Protocolos de encriptación y privacidad total de la data de menores.</p>
                                        </div>
                                    </li>
                                    <li className="flex gap-4">
                                        <CheckCircle2 className="shrink-0 text-[#d97706]" size={24} />
                                        <div>
                                            <h6 className="font-bebas text-lg tracking-wider">REPORTES DE IMPACTO</h6>
                                            <p className="text-white/40 text-sm">Emisión semestral de resultados corporativos RSE.</p>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* PAGE 6: CONTACTO Y EQUIPO */}
                <section id="contacto" className="py-40">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="grid md:grid-cols-[1.5fr_1fr] gap-32">

                            {/* Team */}
                            <div>
                                <h2 className="font-oswald text-5xl uppercase italic mb-20 text-[#d97706]">LA CADENA DE MANDO</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-16">
                                    {[
                                        { name: 'SAHEL BARRIOS', role: 'CORD. GENERAL & ESTRATEGA' },
                                        { name: 'JADHEILY CHIRINOS', role: 'ADMIN. ECOSISTEMA E IDENTIDAD' },
                                        { name: 'NAILET TORRES', role: 'DOCENCIA & LOGÍSTICA' },
                                        { name: 'ANTONELLA CUSATO', role: 'DINÁMICAS & EVIDENCIA VISUAL' },
                                        { name: 'SOLISBETH BARRIOS', role: 'IDENTIDAD VISUAL & PASTORAL' }
                                    ].map((member, i) => (
                                        <div key={i} className="group cursor-default">
                                            <h4 className="font-bebas text-3xl mb-1 group-hover:text-[#d97706] transition-colors">{member.name}</h4>
                                            <div className="w-12 h-1 bg-[#d97706]/40 mb-3 group-hover:w-full transition-all duration-700" />
                                            <span className="font-mono text-[8px] text-white/30 tracking-[3px] uppercase">{member.role}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="space-y-16">
                                <h2 className="font-oswald text-5xl uppercase italic mb-10 text-white/90 shrink-0">CUARTEL GENERAL</h2>
                                <div className="space-y-8">
                                    <div className="flex gap-6 items-start">
                                        <MapPin size={32} className="text-[#d97706] shrink-0" />
                                        <div>
                                            <span className="font-mono text-[10px] text-white/30 tracking-widest block mb-2 uppercase">UBICACIÓN</span>
                                            <p className="text-xl font-oswald leading-snug">Iglesia Jesucristo es el Señor, <br /> Turén, Estado Portuguesa, Venezuela.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-6 items-start underline decoration-[#d97706]/30 hover:decoration-[#d97706] transition-all">
                                        <Mail size={32} className="text-[#d97706] shrink-0" />
                                        <div>
                                            <span className="font-mono text-[10px] text-white/30 tracking-widest block mb-2 uppercase">ENLACE DIRECTO</span>
                                            <a href="mailto:consagradosapp@gmail.com" className="text-xl">consagradosapp@gmail.com</a>
                                        </div>
                                    </div>
                                    <div className="flex gap-6 items-start">
                                        <MessageSquare size={32} className="text-[#d97706] shrink-0" />
                                        <div>
                                            <span className="font-mono text-[10px] text-white/30 tracking-widest block mb-2 uppercase">TERMINAL TÁCTICA</span>
                                            <a href="https://wa.me/584245371079" className="text-xl font-oswald tracking-widest">+58 424-5371079</a>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={onLoginClick}
                                    className="w-full py-6 border-2 border-[#b91c1c] text-[#ff6b6b] font-bebas text-2xl uppercase tracking-[10px] hover:bg-[#b91c1c] hover:text-white transition-all shadow-[0_0_30px_rgba(185,28,28,0.2)]"
                                >
                                    ACCESO LOGIN
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

            </main>

            <footer className="bg-black py-20 border-t border-white/5 relative z-10">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
                    <div className="flex items-center gap-4">
                        <div className="font-bebas text-2xl lg:text-3xl text-white tracking-widest border border-white/20 p-2">CONSAGRADOS</div>
                        <div className="font-bebas text-lg lg:text-xl text-white/30 tracking-widest">ECOSISTEMA // 2026</div>
                    </div>
                    <div className="text-center md:text-right">
                        <p className="font-mono text-[8px] lg:text-[9px] text-white/20 uppercase tracking-[2px] lg:tracking-[4px] leading-relaxed">ESTE ARCHIVO ES PROPIEDAD DEL COMANDO TÁCTICO // TODOS LOS DERECHOS RESERVADOS</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default PublicWebsite;
