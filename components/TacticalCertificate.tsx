import React, { useRef, useState } from 'react';
import { Shield, CheckCircle, Download, Printer, X, Loader2, Share2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { formatDriveUrl } from '../services/storageUtils';
import { Agent } from '../types';

interface TacticalCertificateProps {
    agent?: Agent;
    agentName?: string;
    courseTitle?: string;
    date?: string;
    onClose: () => void;
}

const OFFICIAL_LOGO = '/logo_white.png';

const TacticalCertificate: React.FC<TacticalCertificateProps> = ({
    agent,
    agentName: agentNameProp,
    courseTitle,
    date,
    onClose
}) => {
    const certificateRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
    const [capturedLogoUrl, setCapturedLogoUrl] = useState<string | null>(null);

    // Pre-cargar imágenes en Base64 para evitar bloqueos de CORS al exportar
    React.useEffect(() => {
        const prepareImages = async () => {
            // 1. Preparar Foto Agente
            if (agent?.photoUrl) {
                const url = formatDriveUrl(agent.photoUrl);
                try {
                    const response = await fetch(url);
                    const blob = await response.blob();
                    const reader = new FileReader();
                    reader.onloadend = () => setCapturedPhotoUrl(reader.result as string);
                    reader.readAsDataURL(blob);
                } catch (err) {
                    console.error("Error al preparar foto para certificado:", err);
                    setCapturedPhotoUrl(url);
                }
            }

            // 2. Preparar Logo
            try {
                const response = await fetch(OFFICIAL_LOGO);
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onloadend = () => setCapturedLogoUrl(reader.result as string);
                reader.readAsDataURL(blob);
            } catch (err) {
                setCapturedLogoUrl(OFFICIAL_LOGO);
            }
        };
        prepareImages();
    }, [agent?.photoUrl]);

    const resolvedName = agentNameProp || agent?.name || 'AGENTE';
    const resolvedCourse = courseTitle || 'OPERACIÓN: TEMPLO BLINDADO';

    const formattedDate = (() => {
        const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
        const now = new Date();
        const activeDate = date || now.toISOString();
        try {
            const cleanDate = activeDate.replace(/[^0-9]/g, '/');
            const parts = cleanDate.split('/').filter(p => p.length > 0);
            if (parts.length >= 3) {
                const d = parseInt(parts[0]);
                const m = parseInt(parts[1]) - 1;
                const y = parseInt(parts[2]);
                if (!isNaN(d) && !isNaN(m) && !isNaN(y) && m >= 0 && m < 12) {
                    return `${d} / ${months[m]} / ${y}`;
                }
            }
            const dObj = new Date(activeDate);
            if (!isNaN(dObj.getTime())) {
                return `${dObj.getDate()} / ${months[dObj.getMonth()]} / ${dObj.getFullYear()}`;
            }
        } catch (e) {
            console.error('Error parsing date:', e);
        }
        return `${now.getDate()} / ${months[now.getMonth()]} / ${now.getFullYear()}`;
    })();

    const handleDownloadImage = async () => {
        if (!certificateRef.current) return;
        setIsDownloading(true);
        try {
            const dataUrl = await toPng(certificateRef.current, {
                cacheBust: true,
                canvasWidth: 3508,
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
            if (navigator.share && navigator.canShare?.({ files: [file] })) {
                await navigator.share({
                    title: '¡Certificación Táctica Obtenida!',
                    text: `He completado con éxito: ${resolvedCourse}`,
                    files: [file]
                });
            } else {
                // Fallback: download
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `certificado-${resolvedName}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        } catch (err) {
            console.error('Error sharing certificate:', err);
        }
    };

    const photoUrl = agent ? formatDriveUrl(agent.photoUrl) : '';

    return (
        <div className="fixed inset-0 z-[200] flex flex-col bg-black/98 backdrop-blur-xl animate-in fade-in">

            {/* ── TOOLBAR: always pinned at top, never hidden ── */}
            <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-white/10 bg-black/60 print:hidden">
                {/* Branding */}
                <div className="flex items-center gap-2">
                    <Shield className="text-[#FFB700] rotate-12" size={20} />
                    <div>
                        <p className="text-white font-black uppercase tracking-[0.3em] text-[11px] font-bebas leading-none">Acreditación Oficial</p>
                        <p className="text-[#FFB700] font-black uppercase tracking-[0.15em] text-[8px] font-montserrat">Soberanía Táctica Original</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={handleShare}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600/20 text-indigo-300 font-black uppercase text-[10px] tracking-widest rounded-xl border border-indigo-500/30 hover:bg-indigo-600/40 active:scale-95 transition-all font-bebas"
                    >
                        <Share2 size={14} />
                        COMPARTIR
                    </button>
                    <button
                        onClick={handleDownloadImage}
                        disabled={isDownloading}
                        className="flex items-center gap-1.5 px-4 py-2 bg-white/5 text-white font-black uppercase text-[10px] tracking-widest rounded-xl border border-white/10 hover:bg-white/20 active:scale-95 transition-all font-bebas disabled:opacity-50"
                    >
                        {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        DESCARGAR
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#FFB700] text-[#001f3f] font-black uppercase text-[10px] tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_4px_15px_rgba(255,183,0,0.4)] font-bebas"
                    >
                        <Printer size={14} />
                        IMPRIMIR
                    </button>
                    <button
                        onClick={onClose}
                        className="flex items-center justify-center p-2 bg-red-600/10 text-red-400 rounded-xl hover:bg-red-600 hover:text-white active:scale-95 transition-all border border-red-600/30"
                        aria-label="Cerrar"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* ── CERTIFICATE: fills remaining space, centered and scaled ── */}
            <div className="flex-1 flex items-center justify-center overflow-hidden p-3">
                <div
                    className="origin-center transition-transform duration-300"
                    style={{
                        transform: `scale(clamp(0.25, ${Math.min(
                            (window.innerWidth - 24) / 842,
                            (window.innerHeight - 120) / 595
                        )}, 1))`,
                    }}
                >
                    <div
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
                        {/* Inner Glowing Border */}
                        <div style={{
                            position: 'absolute', top: '15px', left: '15px',
                            right: '15px', bottom: '15px',
                            border: '2px solid rgba(255, 183, 0, 0.6)', pointerEvents: 'none',
                            boxShadow: 'inset 0 0 40px rgba(255,183,0,0.1), 0 0 20px rgba(255,183,0,0.2)',
                        }} />

                        <div style={{
                            position: 'absolute', top: '25px', left: '25px',
                            right: '25px', bottom: '25px',
                            border: '1px dashed rgba(255, 183, 0, 0.3)', pointerEvents: 'none',
                        }} />

                        {/* Corner decorations */}
                        {[
                            { top: '20px', left: '20px' },
                            { top: '20px', right: '20px' },
                            { bottom: '20px', left: '20px' },
                            { bottom: '20px', right: '20px' },
                        ].map((pos, i) => (
                            <div key={i} style={{
                                position: 'absolute', width: '60px', height: '60px',
                                borderColor: '#FFB700', borderStyle: 'solid',
                                borderWidth: i === 0 ? '4px 0 0 4px' : i === 1 ? '4px 4px 0 0' : i === 2 ? '0 0 4px 4px' : '0 4px 4px 0',
                                boxShadow: i === 0 ? '-5px -5px 15px rgba(255,183,0,0.3)' : i === 1 ? '5px -5px 15px rgba(255,183,0,0.3)' : i === 2 ? '-5px 5px 15px rgba(255,183,0,0.3)' : '5px 5px 15px rgba(255,183,0,0.3)',
                                ...pos
                            }} />
                        ))}

                        {/* Top Watermark / Logo Faded */}
                        <div style={{
                            position: 'absolute', top: '100px', right: '100px',
                            width: '300px', height: '300px', opacity: 0.03, pointerEvents: 'none',
                            backgroundImage: `url(${OFFICIAL_LOGO})`,
                            backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
                            filter: 'drop-shadow(0 0 50px rgba(255,255,255,0.8))'
                        }} />

                        {/* Main content layout */}
                        <div style={{ position: 'absolute', inset: '50px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <img src={capturedLogoUrl || OFFICIAL_LOGO} style={{ height: '45px', objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.3))' }} alt="Logo" />
                                <div>
                                    <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '28px', letterSpacing: '0.5em', color: '#fff', margin: 0, lineHeight: 1, textShadow: '0 0 15px rgba(255,255,255,0.5)' }}>CONSAGRADOS</p>
                                    <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '10px', color: '#FFB700', letterSpacing: '0.4em', margin: 0, fontWeight: 900 }}>COMMAND CENTER 2026</p>
                                </div>
                            </div>

                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.5em', textTransform: 'uppercase', margin: '0 0 15px 0' }}>
                                    CERTIFICADO OFICIAL DE CUMPLIMIENTO TÁCTICO
                                </p>

                                <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '14px', color: '#FFB700', fontStyle: 'italic', margin: '0 0 10px 0' }}>Se otorga y autoriza a:</p>

                                <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '64px', color: '#FFFFFF', letterSpacing: '0.08em', lineHeight: 1, margin: '0 0 15px 0', textShadow: '0px 4px 20px rgba(0,0,0,0.8), 0 0 30px rgba(255,255,255,0.2)' }}>
                                    {resolvedName.toUpperCase()}
                                </p>

                                <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '14px', color: 'rgba(255,255,255,0.8)', margin: '0 0 20px 0', maxWidth: '80%', lineHeight: 1.5 }}>
                                    Por haber demostrado compromiso excepcional, disciplina táctica y haber completado con honores todos los requisitos para la certificación en:
                                </p>

                                <div style={{
                                    background: 'linear-gradient(90deg, transparent, rgba(255,183,0,0.15) 20%, rgba(255,183,0,0.15) 80%, transparent)',
                                    borderTop: '2px solid rgba(255,183,0,0.4)', borderBottom: '2px solid rgba(255,183,0,0.4)',
                                    padding: '15px 40px', width: '100%', maxWidth: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '30px', color: '#FFB700', letterSpacing: '0.15em', margin: 0, textShadow: '0 0 10px rgba(255,183,0,0.5)' }}>
                                        {resolvedCourse.toUpperCase()}
                                    </p>
                                </div>
                            </div>

                            {/* Bottom Strip: Photo, Seals, Dates */}
                            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', padding: '0 20px' }}>

                                {/* Photo & Verification */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                    <div style={{
                                        width: '90px', height: '90px', borderRadius: '50%',
                                        border: '3px solid #FFB700', overflow: 'hidden',
                                        boxShadow: '0 0 25px rgba(255,183,0,0.6)',
                                        background: '#000c1a', position: 'relative'
                                    }}>
                                        {capturedPhotoUrl ? (
                                            <img src={capturedPhotoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Agent" />
                                        ) : (
                                            <Shield style={{ width: '100%', height: '100%', padding: '20px', color: 'rgba(255,183,0,0.5)' }} />
                                        )}
                                        <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)', pointerEvents: 'none' }} />
                                    </div>
                                    <div style={{ textAlign: 'left' }}>
                                        <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '8px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.3em', margin: '0 0 5px 0' }}>ACREDITACIÓN VALIDA</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <CheckCircle style={{ color: '#00FF00' }} size={14} />
                                            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '18px', color: '#00FF00', letterSpacing: '0.2em' }}>AUTÉNTICO</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Seal / Badge */}
                                <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div style={{ width: '80px', height: '80px', border: '2px solid rgba(255,183,0,0.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                        <div style={{ position: 'absolute', inset: '-5px', border: '1px dashed rgba(255,183,0,0.3)', borderRadius: '50%', animation: 'spin 20s linear infinite' }} />
                                        <Shield style={{ color: 'rgba(255,183,0,0.8)' }} size={35} />
                                    </div>
                                    <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '7px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.4em', marginTop: '10px' }}>C26 // SELLO DE EXCELENCIA</p>
                                </div>

                                {/* Signatures and Dates */}
                                <div style={{ display: 'flex', gap: '40px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', paddingBottom: '10px' }}>
                                        <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '18px', color: '#FFFFFF', letterSpacing: '0.2em', margin: 0, borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '5px', minWidth: '120px' }}>
                                            {formattedDate}
                                        </p>
                                        <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '8px', color: '#FFB700', letterSpacing: '0.3em', margin: 0 }}>
                                            FECHA DE EMISIÓN
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', paddingBottom: '10px' }}>
                                        <p style={{ fontFamily: "'Homemade Apple', cursive, serif", fontSize: '20px', color: '#FFFFFF', margin: 0, borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '5px', minWidth: '160px', opacity: 0.9 }}>
                                            Director Sahel
                                        </p>
                                        <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '8px', color: '#FFB700', letterSpacing: '0.3em', margin: 0 }}>
                                            FIRMA AUTORIZADA
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer bar */}
                        <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            height: '36px', background: 'rgba(255,183,0,0.12)',
                            borderTop: '1px solid rgba(255,183,0,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '8px', color: 'rgba(255,183,0,0.5)', letterSpacing: '0.5em', textTransform: 'uppercase', margin: 0 }}>
                                NO PEDIMOS PERMISO PARA SER LUZ • CONSAGRADOS COMMAND CENTER 2026
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print styles and Fonts */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=Homemade+Apple&display=swap');
                @media print {
                    @page { size: A4 landscape; margin: 0; }
                    body > * { display: none !important; }
                    #certificate-content {
                        display: flex !important;
                        position: fixed !important;
                        top: 0 !important; left: 0 !important;
                        width: 297mm !important; height: 210mm !important;
                        margin: 0 !important; padding: 0 !important;
                        transform: none !important;
                        border: 10px solid #FFB700 !important;
                        z-index: 9999999 !important;
                        background-color: #001F3F !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
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
