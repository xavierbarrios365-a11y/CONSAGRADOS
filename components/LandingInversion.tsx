import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Target, Smartphone, Brain, GraduationCap, CheckCircle2, MessageSquare, Mail, ArrowRight, X } from 'lucide-react';
import { submitInversionLead } from '../services/supabaseService';
import { useTacticalAlert } from './TacticalAlert';

const LandingInversion: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { showAlert } = useTacticalAlert();
    const [showModal, setShowModal] = useState(false);
    const [selectedTier, setSelectedTier] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({ nombre: '', email: '', whatsapp: '' });

    const handleTierClick = (tier: string) => {
        setSelectedTier(tier);
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const result = await submitInversionLead({
            nombre: form.nombre,
            email: form.email,
            whatsapp: form.whatsapp,
            tipoAlianza: selectedTier
        });

        if (result.success) {
            showAlert({ title: 'SOLICITUD ENVIADA', message: 'Un oficial de la directiva se pondrá en contacto pronto.', type: 'SUCCESS' });
            setShowModal(false);
            setForm({ nombre: '', email: '', whatsapp: '' });
        } else {
            showAlert({ title: 'ERROR', message: 'No se pudo procesar la solicitud. Intenta de nuevo.', type: 'ERROR' });
        }
        setIsSubmitting(false);
    };

    return (
        <div className="min-h-screen bg-[#000810] text-white font-sans selection:bg-[#ffb700] selection:text-[#000c19]">
            {/* Blueprint Grid Background */}
            <div className="fixed inset-0 pointer-events-none z-[-1] opacity-20">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,183,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,183,0,0.05)_1px,transparent_1px)] bg-[size:60px_60px]"
                    style={{ maskImage: 'radial-gradient(circle at 50% 50%, black, transparent 80%)' }} />
            </div>

            {/* Nav */}
            <nav className="fixed top-0 left-0 w-full z-[100] bg-[#000810]/80 backdrop-blur-xl border-b border-white/10 py-4">
                <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <img src="/logo_white.png" alt="Logo" className="h-10 drop-shadow-[0_0_8px_rgba(255,183,0,0.3)]" />
                        <span className="font-bebas text-2xl tracking-widest">CONSAGRADOS</span>
                    </div>
                    <button
                        onClick={onBack}
                        className="font-bebas text-lg px-6 py-2 bg-[#ffb700] text-[#000c19] rounded hover:scale-105 transition-transform"
                    >
                        VOLVER AL SISTEMA
                    </button>
                </div>
            </nav>

            {/* Hero */}
            <header className="pt-40 pb-20 px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-5xl mx-auto"
                >
                    <span className="font-mono text-[#ffb700] text-xs tracking-[10px] uppercase mb-8 block">INVERSIÓN ESTRATÉGICA // 2026</span>
                    <h1 className="font-bebas text-7xl md:text-9xl leading-[0.9] mb-8">
                        FORJANDO EL <span className="text-[#ffb700] block mt-4" style={{ WebkitTextStroke: '1px #ffb700', color: 'transparent' }}>CARÁCTER</span> DEL MAÑANA
                    </h1>
                    <p className="text-gray-400 text-lg md:text-2xl max-w-3xl mx-auto font-light leading-relaxed mb-12">
                        Un ecosistema ministerial táctico que fusiona mentoría presencial, inteligencia artificial y gamificación para transformar a la juventud venezolana.
                    </p>
                    <div className="flex flex-wrap justify-center gap-6">
                        <a href="#inversion" className="font-bebas text-xl px-10 py-4 bg-[#ffb700] text-[#000c19] rounded-md hover:shadow-[0_0_30px_rgba(255,183,0,0.4)] transition-all">
                            PLAN DE ALIANZAS
                        </a>
                        <a href="#metodologia" className="font-bebas text-xl px-10 py-4 border border-[#ffb700] text-[#ffb700] rounded-md hover:bg-[#ffb700]/10 transition-all">
                            VER METODOLOGÍA
                        </a>
                    </div>
                </motion.div>
            </header>

            {/* Manifiesto */}
            <section id="proposito" className="py-24 px-6 max-w-7xl mx-auto">
                <div className="grid md:grid-cols-[1.2fr_1fr] gap-20 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="font-bebas text-5xl mb-8">EL <span className="text-[#ffb700]">MANIFIESTO</span> TÁCTICO</h2>
                        <h3 className="text-3xl font-bebas text-[#ffb700] mb-6 leading-tight">EL MUNDO PREMIA LA FRAGILIDAD.<br />NOSOTROS FORJAMOS EL HONOR.</h3>
                        <p className="text-gray-400 text-lg leading-relaxed">
                            En una era de sobre-estimulación y vacío de propósito, Consagrados opera como una unidad de élite para rescatar el potencial de cada agente. No somos un club social; somos un campo de entrenamiento de clase mundial.
                        </p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="bg-white/5 border-l-4 border-[#ffb700] p-10 relative overflow-hidden group"
                    >
                        <Shield className="w-12 h-12 text-[#ffb700] mb-8 opacity-80 group-hover:scale-110 transition-transform" />
                        <p className="text-2xl italic font-serif text-white/90 leading-snug">
                            "No pedimos permiso para ser luz. Vivimos en un mundo que celebra lo superficial, pero nosotros no somos de este mundo."
                        </p>
                        <div className="mt-10 flex items-center gap-4">
                            <div className="h-px w-10 bg-[#ffb700]/50" />
                            <span className="font-mono text-[#ffb700] text-[10px] tracking-widest">DIRECTIVA 01 // AGENCIA TÁCTICA</span>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Engineering Impact */}
            <section id="metodologia" className="py-24 px-6 bg-black/40">
                <div className="max-w-7xl mx-auto">
                    <h2 className="font-bebas text-6xl text-center mb-20 text-white/90">INGENIERÍA DEL <span className="text-[#ffb700]">IMPACTO</span></h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            { icon: Target, title: 'MENTORÍA O.I.A', desc: 'Observación, Interpretación y Aplicación real. Discipulado práctico bajo presión controlada.' },
                            { icon: Smartphone, title: 'APP CONSAGRADOS', desc: 'Gamificación de alto rendimiento. XP y niveles de honor medibles digitalmente.' },
                            { icon: Brain, title: 'RADAR DISC AI', desc: 'Perfilado psicométrico asistido por IA para potenciar dones y neutralizar flaquezas.' },
                            { icon: GraduationCap, title: 'ACADEMIA ÉLITE', desc: 'Formación en oratoria y gestión estratégica para la próxima generación de líderes.' }
                        ].map((item, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                viewport={{ once: true }}
                                className="bg-white/5 border border-white/10 p-10 hover:border-[#ffb700] hover:bg-[#ffb700]/5 transition-all group"
                            >
                                <item.icon className="w-10 h-10 text-[#ffb700] mb-6 group-hover:scale-110 transition-transform" />
                                <h3 className="font-bebas text-2xl mb-4 tracking-wider">{item.title}</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Metrics */}
            <section id="metricas" className="py-24 px-6 max-w-7xl mx-auto">
                <h2 className="font-bebas text-5xl text-center mb-16">TRANSPARENCIA <span className="text-[#ffb700]">REAL</span></h2>
                <div className="grid grid-cols-2 md:grid-cols-4 border border-white/10 divide-x divide-y divide-white/10">
                    {[
                        { val: '$2,410', label: 'PRESUPUESTO ANUAL' },
                        { val: '$80', label: 'INVERSIÓN / AGENTE' },
                        { val: '100%', label: 'AUDITORÍA ABIERTA' },
                        { val: '30', label: 'CUPOS ÉLITE' }
                    ].map((m, idx) => (
                        <div key={idx} className="p-12 text-center bg-black/20">
                            <span className="font-bebas text-5xl text-[#ffb700] block mb-2">{m.val}</span>
                            <span className="font-mono text-[10px] tracking-widest text-gray-500">{m.label}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-16 p-10 border border-dashed border-[#ff3e3e]/30 bg-[#ff3e3e]/5 text-center">
                    <p className="font-mono text-[#ff3e3e] text-xs tracking-[5px] uppercase">
                        CONTROL CORPORATIVO: DATA ENCRIPTADA // GARANTÍA DE RSE PARA SOCIOS // IMPACTO VERIFICABLE
                    </p>
                </div>
            </section>

            {/* Tiers */}
            <section id="inversion" className="py-24 px-6 max-w-7xl mx-auto">
                <h2 className="font-bebas text-6xl text-center mb-20 uppercase">NIVELES DE <span className="text-[#ffb700]">ALIANZA</span></h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    {[
                        { tier: 'PADRINO', title: 'PADRINO TÁCTICO', price: '$80', period: '/ anual', items: ['Beca completa un Agente', 'Acceso a Cuadro de Honor', 'Manual físico incluido'], btn: 'INVERTIR EN LÍDER' },
                        { tier: 'REFERENTE', title: 'NIVEL REFERENTE', price: '$100', period: '/ mensual', items: ['Patrocinio 10 agentes', 'Logo en App Oficial', 'Certificación RSE Auditada'], featured: true, btn: 'ESTABLECER ALIANZA' },
                        { tier: 'COMANDO', title: 'NIVEL COMANDO', price: '$200', period: '/ mensual', items: ['Soporte Infraestructura', 'Presencia Graduaciones', 'Auditoría Personalizada'], btn: 'LIDERAR LA MISIÓN' }
                    ].map((t, idx) => (
                        <motion.div
                            key={idx}
                            whileHover={{ y: -10 }}
                            className={`p-12 flex flex-col relative border ${t.featured ? 'border-[#ffb700] bg-[#ffb700]/5 shadow-[0_20px_60px_rgba(0,0,0,0.8)]' : 'border-white/10 bg-white/5'}`}
                        >
                            {t.featured && <div className="absolute top-4 right-4 bg-[#ffb700] text-[#000c19] px-3 py-1 font-mono text-[10px] font-black">PRIORIDAD</div>}
                            <span className="font-mono text-[#ffb700] text-[10px] tracking-[4px] mb-6">{t.featured ? 'CORPORATIVO / RSE' : 'ESTRATÉGICO'}</span>
                            <h3 className="font-bebas text-4xl mb-8 tracking-wider">{t.title}</h3>
                            <div className="font-bebas text-7xl mb-10 flex items-baseline gap-2">
                                {t.price} <span className="text-xl font-sans text-gray-500">{t.period}</span>
                            </div>
                            <ul className="space-y-4 mb-12 flex-grow">
                                {t.items.map((li, i) => (
                                    <li key={i} className="flex gap-3 text-gray-400 text-sm">
                                        <CheckCircle2 className="w-5 h-5 text-[#ffb700] shrink-0" /> {li}
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={() => handleTierClick(t.tier)}
                                className={`font-bebas text-xl py-4 rounded transition-all ${t.featured ? 'bg-[#ffb700] text-[#000c19]' : 'border border-[#ffb700] text-[#ffb700] hover:bg-[#ffb700]/10'}`}
                            >
                                {t.btn}
                            </button>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="py-32 px-6 border-t border-white/10 bg-[#000408]">
                <div className="max-w-7xl mx-auto text-center">
                    <h2 className="font-bebas text-5xl md:text-7xl mb-12 text-[#ffb700] tracking-widest uppercase">¿LISTO PARA IMPACTAR EL FUTURO?</h2>
                    <p className="text-gray-500 text-xl max-w-2xl mx-auto mb-16 font-light italic">
                        Invierta en el cambio real de la juventud. No financiamos actividades; forjamos líderes.
                    </p>
                    <div className="flex flex-wrap justify-center gap-8 mb-24">
                        <a
                            href="https://wa.me/584245371079"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 font-bebas text-xl px-12 py-5 bg-white/5 border border-white/20 hover:border-[#ffb700] transition-all"
                        >
                            <MessageSquare className="w-6 h-6 text-[#ffb700]" /> WHATSAPP DIRECTO
                        </a>
                        <a
                            href="mailto:consagradosapp@gmail.com"
                            className="flex items-center gap-3 font-bebas text-xl px-12 py-5 bg-white/5 border border-white/20 hover:border-[#ffb700] transition-all"
                        >
                            <Mail className="w-6 h-6 text-[#ffb700]" /> EMAIL DIRECTIVA
                        </a>
                    </div>
                    <div className="grid md:grid-cols-2 text-left pt-20 border-t border-white/5 opacity-60">
                        <div>
                            <img src="/logo_white.png" alt="Logo" className="h-8 mb-6 grayscale brightness-150" />
                            <p className="text-xs text-gray-500 uppercase tracking-widest font-mono">Unidad de Formación Táctica Juvenil // 2026</p>
                        </div>
                        <div className="text-right flex flex-col justify-end">
                            <p className="text-[10px] text-gray-600 font-mono tracking-[4px]">© CONSAGRADOS // VENEZUELA</p>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Modal Form */}
            {showModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-black/90 backdrop-blur-md"
                        onClick={() => setShowModal(false)}
                    />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="relative bg-[#000c19] border border-[#ffb700]/30 p-10 max-w-md w-full rounded-2xl shadow-[0_0_100px_rgba(255,183,0,0.15)]"
                    >
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <h4 className="font-bebas text-3xl text-[#ffb700] mb-2 uppercase">RECLUTAMIENTO DE ALIADO</h4>
                        <p className="text-xs text-gray-500 font-mono mb-8 tracking-widest uppercase">NIVEL: {selectedTier} // SECTOR COMANDO</p>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-mono tracking-widest text-[#ffb700]/50 uppercase">Nombre Completo</label>
                                <input
                                    required
                                    type="text"
                                    value={form.nombre}
                                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 p-4 rounded focus:border-[#ffb700] outline-none text-sm font-sans"
                                    placeholder="Ej. Manuel Benitez"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-mono tracking-widest text-[#ffb700]/50 uppercase">Email de Enlace</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 p-4 rounded focus:border-[#ffb700] outline-none text-sm font-sans"
                                    placeholder="manuel@compania.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-mono tracking-widest text-[#ffb700]/50 uppercase">WhatsApp de Campo</label>
                                <input
                                    required
                                    type="tel"
                                    value={form.whatsapp}
                                    onChange={e => setForm({ ...form, whatsapp: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 p-4 rounded focus:border-[#ffb700] outline-none text-sm font-sans"
                                    placeholder="+58 4XX XXX XX XX"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-[#ffb700] text-[#000c19] font-bebas text-2xl py-5 rounded hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(255,183,0,0.2)]"
                            >
                                {isSubmitting ? 'PROCESANDO...' : <>INICIAR DESPLIEGUE <ArrowRight className="w-6 h-6" /></>}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default LandingInversion;
