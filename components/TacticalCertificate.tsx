
import React, { useRef, useState } from 'react';
import { Shield, CheckCircle, Download, Printer, X, Loader2, Share2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { formatDriveUrl } from './DigitalIdCard';
import { Agent } from '../types';

interface TacticalCertificateProps {
    /** Full agent object (optional - used from profile) */
    agent?: Agent;
    /** Individual fields (used from Academy to avoid crashes) */
    agentName?: string;
    courseTitle?: string;
    date?: string;
    onClose: () => void;
}

const OFFICIAL_LOGO = "/logo_white.png";

const TacticalCertificate: React.FC<TacticalCertificateProps> = ({
    agent,
    agentName: agentNameProp,
    courseTitle,
    date,
    onClose
}) => {
    const certificateRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const resolvedName = agentNameProp || agent?.name || 'USERDEFAULT';
    const resolvedCourse = courseTitle || 'OPERACIÓN: TEMPLO BLINDADO';

    const formattedDate = (() => {
        const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
        const now = new Date();
        const activeDate = date || now.toISOString();

        try {
            const cleanDate = activeDate.replace(/[^0-9]/g, '/');
            const parts = cleanDate.split('/').filter(p => p.length > 0);

            if (parts.length >= 3) {
                let d = parseInt(parts[0]);
                let m = parseInt(parts[1]) - 1;
                let y = parseInt(parts[2]);

                if (!isNaN(d) && !isNaN(m) && !isNaN(y) && m >= 0 && m < 12) {
                    return `${d} / ${months[m]} / ${y}`;
                }
            }

            const dObj = new Date(activeDate);
            if (!isNaN(dObj.getTime())) {
                return `${dObj.getDate()} / ${months[dObj.getMonth()]} / ${dObj.getFullYear()}`;
            }
        } catch (e) {
            console.error("Error parsing date:", e);
        }

        return `${now.getDate()} / ${months[now.getMonth()]} / ${now.getFullYear()}`;
    })();

    const handleDownloadImage = async () => {
        if (!certificateRef.current) return;
        setIsDownloading(true);
        try {
            const dataUrl = await toPng(certificateRef.current, {
                cacheBust: true,
                canvasWidth: 3508, // A4 Landscape at 300 DPI
                canvasHeight: 2480,
                pixelRatio: 1,
                backgroundColor: '#001F3F',
            });

            const link = document.createElement('a');
            link.download = `Certificado-Consagrados-${resolvedName.replace(/\s+/g, '-')}.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Error generating certificate image:', err);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleShare = async () => {
        if (!certificateRef.current) return;
        try {
            const dataUrl = await toPng(certificateRef.current, {
                cacheBust: true,
                canvasWidth: 1080,
                canvasHeight: 760,
                pixelRatio: 1,
                backgroundColor: '#001F3F',
            });

            const response = await fetch(dataUrl);
            const blob = await response.blob();
            const file = new File([blob], `certificado-${resolvedName}.png`, { type: 'image/png' });

            if (navigator.share) {
                await navigator.share({
                    title: '¡Certificación Táctica Obtenida!',
                    text: `He completado con éxito: ${resolvedCourse}`,
                    files: [file]
                });
            } else {
                alert("La función de compartir no está disponible en este navegador. Usa el botón de DESCARGAR HD.");
            }
        } catch (err) {
            console.error('Error sharing certificate:', err);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex flex-col bg-black/98 backdrop-blur-xl animate-in fade-in">

            {/* ── ACTION BAR – always visible at the top ── */}
            <div className="w-full flex-shrink-0 flex flex-wrap justify-between items-center gap-3 px-4 py-3 print:hidden border-b border-white/5 bg-black/40">
                {/* Brand */}
                <div className="flex items-center gap-2">
                    <Shield className="text-[#FFB700] rotate-12" size={22} />
                    <div className="flex flex-col">
                        <span className="text-white font-black uppercase tracking-[0.3em] text-[11px] font-bebas leading-none">Acreditación Oficial</span>
                        <span className="text-[#FFB700] font-black uppercase tracking-[0.15em] text-[8px] font-montserrat">Soberanía Táctica Original</span>
                    </div>
                </div>
                {/* Buttons */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={handleShare}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600/20 text-indigo-400 font-black uppercase text-[10px] tracking-widest rounded-xl border border-indigo-500/30 hover:bg-indigo-600/40 active:scale-95 transition-all font-bebas shadow-lg"
                    >
                        <Share2 size={15} />
                        COMPARTIR
                    </button>
                    <button
                        onClick={handleDownloadImage}
                        disabled={isDownloading}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-white/5 text-white font-black uppercase text-[10px] tracking-widest rounded-xl border border-white/10 hover:bg-white/20 active:scale-95 transition-all font-bebas disabled:opacity-50 shadow-lg"
                    >
                        {isDownloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                        DESCARGAR HD
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-[#FFB700] text-[#001f3f] font-black uppercase text-[10px] tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_8px_20px_rgba(255,183,0,0.4)] font-bebas"
                    >
                        <Printer size={15} />
                        IMPRIMIR
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2.5 bg-red-600/10 text-red-500 rounded-xl hover:bg-red-600 hover:text-white active:scale-95 transition-all border border-red-600/30"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* ── CERTIFICATE – scales to fill remaining space ── */}
            <div className="flex-1 flex items-center justify-center overflow-hidden p-4">
                <div className="relative shadow-[0_40px_100px_rgba(0,0,0,1)] rounded-lg overflow-visible"
                    style={{
                        /* Scale to fit: certificate is 842×595, keep aspect ratio */
                        maxWidth: '100%',
                        maxHeight: '100%',
                        transform: 'scale(var(--cert-scale, 1))',
                        transformOrigin: 'center center'
                    }}
                >
                    ref={certificateRef}
                    id="certificate-content"
                    style={{
                        width: '842px',
                        height: '595px',
                        backgroundColor: '#001F3F',
                        border: '10px solid #FFB700',
                        position: 'relative',
                        boxSizing: 'border-box',
                        color: '#ffffff',
                        overflow: 'hidden',
                        backgroundImage: `linear-gradient(rgba(0, 31, 63, 0.95), rgba(0, 31, 63, 0.95)), url('https://www.transparenttextures.com/patterns/carbon-fibre.png')`,
                        fontFamily: "'Roboto', sans-serif",
                    }}
                >
                    {/* Original Inner Border */}
                    <div style={{
                        position: 'absolute',
                        top: '20px',
                        left: '20px',
                        right: '20px',
                        bottom: '20px',
                        border: '1px solid rgba(255, 183, 0, 0.3)',
                        pointerEvents: 'none',
                    }} />

                    {/* Original Watermark Shield */}
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        opacity: 0.03,
                        pointerEvents: 'none',
                        zIndex: 1,
                    }}>
                        <Shield size={400} color="#FFB700" strokeWidth={0.5} />
                    </div>

                    <div style={{
                        textAlign: 'center',
                        padding: '40px 50px',
                        position: 'relative',
                        zIndex: 2,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                    }}>
                        {/* Original Logo Area */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            marginBottom: '8px',
                        }}>
                            <img
                                src={OFFICIAL_LOGO}
                                alt="Logo Consagrados"
                                style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                            />
                            <span style={{
                                fontFamily: "'Oswald', sans-serif",
                                color: '#FFB700',
                                fontSize: '1.2rem',
                                letterSpacing: '5px',
                                textTransform: 'uppercase',
                                fontWeight: 700,
                            }}>
                                CONSAGRADOS 2026
                            </span>
                        </div>

                        {/* Original Title */}
                        <p style={{
                            fontWeight: 300,
                            textTransform: 'uppercase',
                            letterSpacing: '8px',
                            margin: '0 0 4px 0',
                            fontSize: '0.8rem',
                            color: 'rgba(255,255,255,0.6)',
                        }}>
                            ACREDITACIÓN DE APTITUD TÁCTICA
                        </p>
                        <h1 style={{
                            fontFamily: "'Oswald', sans-serif",
                            fontSize: '3rem',
                            color: '#FFB700',
                            margin: '0 0 20px 0',
                            textTransform: 'uppercase',
                            letterSpacing: '2px',
                            lineHeight: 1,
                            fontWeight: 700,
                        }}>
                            CERTIFICADO DE GRADO
                        </h1>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                            <p style={{
                                fontWeight: 300,
                                marginBottom: '4px',
                                fontSize: '0.85rem',
                                color: 'rgba(255,255,255,0.7)',
                            }}>
                                Se hace constar que el Agente:
                            </p>

                            <div style={{
                                fontFamily: "'Oswald', sans-serif",
                                fontSize: '2.6rem',
                                color: '#ffffff',
                                borderBottom: '2px solid #FFB700',
                                display: 'inline-block',
                                padding: '0 40px 6px 40px',
                                marginBottom: '16px',
                                letterSpacing: '2px',
                                lineHeight: 1.1,
                                textTransform: 'uppercase',
                                fontWeight: 700,
                            }}>
                                {resolvedName}
                            </div>

                            <p style={{
                                fontSize: '0.95rem',
                                maxWidth: '520px',
                                color: 'rgba(255,255,255,0.8)',
                                lineHeight: 1.6,
                                margin: 0,
                                textAlign: 'center',
                            }}>
                                Ha completado satisfactoriamente los protocolos de formación en la{' '}
                                <span style={{
                                    color: '#FFB700',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase',
                                }}>
                                    {resolvedCourse}
                                </span>,{' '}
                                demostrando compromiso con la Doctrina de la Excelencia y la Pureza Táctica.
                            </p>
                        </div>

                        {/* Original Footer Area */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-around',
                            alignItems: 'flex-end',
                            paddingBottom: '10px',
                        }}>
                            <div style={{ textAlign: 'center' }}>
                                <p style={{
                                    fontFamily: "'Oswald', sans-serif",
                                    fontSize: '1rem',
                                    color: '#FFB700',
                                    margin: '0 0 4px 0',
                                    letterSpacing: '1px',
                                    fontWeight: 700,
                                }}>
                                    Sahel Xavier Barrios M.
                                </p>
                                <div style={{
                                    borderTop: '1px solid #FFB700',
                                    width: '200px',
                                    paddingTop: '8px',
                                    fontSize: '0.7rem',
                                    color: 'rgba(255,255,255,0.5)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '2px',
                                }}>
                                    Comandante en Jefe<br />
                                    <strong style={{ color: 'rgba(255,255,255,0.7)' }}>CONSAGRADOS 2026</strong>
                                </div>
                            </div>

                            <div style={{
                                width: '90px',
                                height: '90px',
                                border: '2px solid #FFB700',
                                borderRadius: '50%',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                background: 'rgba(255, 183, 0, 0.08)',
                                color: '#FFB700',
                                fontSize: '0.6rem',
                                fontWeight: 'bold',
                                textAlign: 'center',
                                transform: 'rotate(-15deg)',
                                letterSpacing: '1px',
                                lineHeight: 1.4,
                                flexShrink: 0,
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                    <CheckCircle size={16} />
                                    <span>PROYECTO<br />APROBADO<br />2026</span>
                                </div>
                            </div>

                            <div style={{ textAlign: 'center' }}>
                                <p style={{
                                    fontFamily: "'Oswald', sans-serif",
                                    fontSize: '1rem',
                                    color: '#FFB700',
                                    margin: '0 0 4px 0',
                                    letterSpacing: '1px',
                                    fontWeight: 700,
                                }}>
                                    {formattedDate}
                                </p>
                                <div style={{
                                    borderTop: '1px solid #FFB700',
                                    width: '200px',
                                    paddingTop: '8px',
                                    fontSize: '0.7rem',
                                    color: 'rgba(255,255,255,0.5)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '2px',
                                }}>
                                    Fecha de Emisión<br />
                                    <strong style={{ color: 'rgba(255,255,255,0.7)' }}>#NOESPORVISTA</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <p className="mt-12 text-white/30 text-[12px] font-black uppercase tracking-[0.8em] print:hidden">Elite Command Defense Protocol • v1000 Original Restoration</p>

            {/* Print Engine Implementation */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;700&family=Roboto:wght@300;700&display=swap');
                @media print {
                    @page {
                        size: A4 landscape;
                        margin: 0;
                    }
                    html, body {
                        width: 297mm;
                        height: 210mm;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: hidden;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    body > * {
                        display: none !important;
                    }
                    #certificate-content {
                        display: flex !important;
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 297mm !important;
                        height: 210mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        transform: none !important;
                        border: 10px solid #FFB700 !important;
                        z-index: 9999999 !important;
                        background-color: #001F3F !important;
                        background-image: linear-gradient(rgba(0, 31, 63, 0.95), rgba(0, 31, 63, 0.95)), url('https://www.transparenttextures.com/patterns/carbon-fibre.png') !important;
                    }
                    #certificate-content * {
                        visibility: visible !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}} />
        </div>
    );
};

export default TacticalCertificate;
