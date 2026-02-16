import React, { useRef, useState, useEffect } from 'react';
import { Shield, CheckCircle, Download, X, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { formatDriveUrl } from './DigitalIdCard';

interface TacticalCertificateProps {
    agentName: string;
    courseTitle: string;
    date: string;
    onClose: () => void;
}

const OFFICIAL_LOGO = "1DYDTGzou08o0NIPuCPH9JvYtaNFf2X5f";

const TacticalCertificate: React.FC<TacticalCertificateProps> = ({ agentName, courseTitle, date, onClose }) => {
    const certRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [logoBase64, setLogoBase64] = useState<string | null>(null);
    const [scale, setScale] = useState(1);

    // Responsive scaling logic
    useEffect(() => {
        const updateScale = () => {
            if (typeof window !== 'undefined') {
                const width = window.innerWidth;
                const padding = 32; // p-4 = 16px * 2
                const newScale = Math.min(1, (width - padding) / 842);
                setScale(newScale);
            }
        };
        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    // Pre-fetch logo as base64 to avoid CORS issues during capture
    useEffect(() => {
        const loadLogo = async () => {
            try {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0);
                        setLogoBase64(canvas.toDataURL('image/png'));
                    }
                };
                img.onerror = () => setLogoBase64(null);
                img.src = formatDriveUrl(OFFICIAL_LOGO);
            } catch { setLogoBase64(null); }
        };
        loadLogo();
    }, []);

    const formattedDate = (() => {
        const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
        const now = new Date();
        const getToday = () => `${now.getDate()} / ${months[now.getMonth()]} / ${now.getFullYear()}`;

        try {
            if (!date || typeof date !== 'string' || date.includes('NaN') || date.includes('undefined')) return getToday();

            const cleanDate = date.replace(/[^0-9]/g, '/');
            const parts = cleanDate.split('/').filter(p => p.length > 0);

            if (parts.length >= 3) {
                const d = parseInt(parts[0]);
                const m = parseInt(parts[1]) - 1;
                const y = parseInt(parts[2]);
                if (!isNaN(d) && !isNaN(m) && !isNaN(y) && m >= 0 && m < 12) {
                    return `${d} / ${months[m]} / ${y}`;
                }
            }

            const dObj = new Date(date);
            if (!isNaN(dObj.getTime())) {
                return `${dObj.getDate()} / ${months[dObj.getMonth()]} / ${dObj.getFullYear()}`;
            }
        } catch { /* fallback */ }

        return getToday();
    })();

    const handleDownload = async () => {
        if (!certRef.current) return;
        setIsDownloading(true);
        try {
            const dataUrl = await toPng(certRef.current, {
                cacheBust: true,
                pixelRatio: 3,
                backgroundColor: '#001F3F',
                filter: (node: HTMLElement) => {
                    // Skip images that aren't base64 (external URLs cause CORS errors)
                    if (node instanceof HTMLImageElement && node.src && !node.src.startsWith('data:')) {
                        return false;
                    }
                    return true;
                },
            });

            const link = document.createElement('a');
            link.download = `Certificado_${agentName.replace(/\s+/g, '_')}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Error generating certificate image:', err);
            // Retry without images as absolute fallback
            try {
                const fallbackUrl = await toPng(certRef.current!, {
                    cacheBust: true,
                    pixelRatio: 3,
                    backgroundColor: '#001F3F',
                    filter: (node: HTMLElement) => node.tagName !== 'IMG',
                });
                const link = document.createElement('a');
                link.download = `Certificado_${agentName.replace(/\s+/g, '_')}.png`;
                link.href = fallbackUrl;
                link.click();
            } catch (retryErr) {
                console.error('Retry also failed:', retryErr);
                alert('Error al generar la imagen. Intenta de nuevo.');
            }
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in overflow-y-auto">
            {/* Controls */}
            <div className="fixed top-6 right-6 flex gap-3 z-[110]">
                <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="flex items-center gap-2 px-6 py-3 bg-[#FFB700] text-[#001f3f] font-black uppercase text-[10px] tracking-widest rounded hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,183,0,0.3)] disabled:opacity-50"
                >
                    {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    {isDownloading ? 'Generando...' : 'Descargar Certificado'}
                </button>
                <button
                    onClick={onClose}
                    className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-black uppercase text-[10px] tracking-widest rounded border border-white/10 hover:bg-white/20 transition-all"
                >
                    <X size={14} /> Cerrar
                </button>
            </div>

            {/* Certificate Canvas — This is what gets captured */}
            <div
                ref={certRef}
                style={{
                    width: '842px',
                    height: '595px',
                    backgroundColor: '#001F3F',
                    border: '10px solid #FFB700',
                    position: 'relative',
                    boxSizing: 'border-box',
                    color: '#ffffff',
                    overflow: 'hidden',
                    boxShadow: '0 0 60px rgba(255, 183, 0, 0.15)',
                    backgroundImage: `linear-gradient(rgba(0, 31, 63, 0.95), rgba(0, 31, 63, 0.95)), url('https://www.transparenttextures.com/patterns/carbon-fibre.png')`,
                    fontFamily: "'Roboto', sans-serif",
                    transform: `scale(${scale})`,
                    transformOrigin: 'center center',
                    flexShrink: 0
                }}
            >
                {/* Inner Border */}
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    right: '20px',
                    bottom: '20px',
                    border: '1px solid rgba(255, 183, 0, 0.3)',
                    pointerEvents: 'none',
                }} />

                {/* Watermark Shield */}
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

                {/* Main Content */}
                <div style={{
                    textAlign: 'center',
                    padding: '40px 50px',
                    position: 'relative',
                    zIndex: 2,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    boxSizing: 'border-box',
                }}>
                    {/* Logo Area */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        marginBottom: '8px',
                    }}>
                        {logoBase64 ? (
                            <img
                                src={logoBase64}
                                alt="Logo Consagrados"
                                style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                            />
                        ) : (
                            <Shield size={32} color="#FFB700" />
                        )}
                        <span style={{
                            fontFamily: "'Oswald', sans-serif",
                            color: '#FFB700',
                            fontSize: '1.2rem',
                            letterSpacing: '5px',
                            textTransform: 'uppercase',
                        }}>
                            Consagrados 2026
                        </span>
                    </div>

                    {/* Title */}
                    <p style={{
                        fontWeight: 300,
                        textTransform: 'uppercase',
                        letterSpacing: '8px',
                        margin: '0 0 4px 0',
                        fontSize: '0.8rem',
                        color: 'rgba(255,255,255,0.6)',
                    }}>
                        Acreditación de Aptitud
                    </p>
                    <h1 style={{
                        fontFamily: "'Oswald', sans-serif",
                        fontSize: '3rem',
                        color: '#FFB700',
                        margin: '0 0 20px 0',
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        lineHeight: 1,
                    }}>
                        Certificado de Grado
                    </h1>

                    {/* Body */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        <p style={{
                            fontWeight: 300,
                            marginBottom: '4px',
                            fontSize: '0.85rem',
                            color: 'rgba(255,255,255,0.7)',
                        }}>
                            Se hace constar que el Agente:
                        </p>

                        {/* Recipient Name */}
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
                        }}>
                            {agentName}
                        </div>

                        {/* Mission Detail */}
                        <p style={{
                            fontSize: '0.95rem',
                            maxWidth: '520px',
                            color: 'rgba(255,255,255,0.8)',
                            lineHeight: 1.6,
                            margin: 0,
                        }}>
                            Ha completado satisfactoriamente los protocolos de formación en la{' '}
                            <span style={{
                                color: '#FFB700',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                            }}>
                                {courseTitle}
                            </span>,{' '}
                            demostrando compromiso con la Doctrina de la Excelencia y la Pureza Táctica.
                        </p>
                    </div>

                    {/* Footer — Signatures & Seal */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-around',
                        alignItems: 'flex-end',
                        paddingBottom: '10px',
                    }}>
                        {/* Director Signature */}
                        <div style={{ textAlign: 'center' }}>
                            <p style={{
                                fontFamily: "'Oswald', sans-serif",
                                fontSize: '1rem',
                                color: '#FFB700',
                                margin: '0 0 4px 0',
                                letterSpacing: '1px',
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
                                <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Consagrados 2026</strong>
                            </div>
                        </div>

                        {/* Seal */}
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

                        {/* Date Signature */}
                        <div style={{ textAlign: 'center' }}>
                            <p style={{
                                fontFamily: "'Oswald', sans-serif",
                                fontSize: '1rem',
                                color: '#FFB700',
                                margin: '0 0 4px 0',
                                letterSpacing: '1px',
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

            {/* Font import */}
            <style dangerouslySetInnerHTML={{
                __html: `@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;700&family=Roboto:wght@300;700&display=swap');`
            }} />
        </div>
    );
};


export default TacticalCertificate;
