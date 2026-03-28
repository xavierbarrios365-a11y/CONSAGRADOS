import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import { ShieldCheck, Download, Trash2, User, CreditCard, Phone, CheckCircle2, FileText } from 'lucide-react';
import { Agent } from '../types';

interface DeploymentAuthorizationProps {
    onBack: () => void;
    agents: Agent[];
}

const DeploymentAuthorization: React.FC<DeploymentAuthorizationProps> = ({ onBack, agents }) => {
    const [selectedAgent, setSelectedAgent] = useState('');
    const [repNombre, setRepNombre] = useState('');
    const [repCedula, setRepCedula] = useState('');
    const [repTelefono, setRepTelefono] = useState('');
    const [repTutor, setRepTutor] = useState('');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const documentRef = useRef<HTMLDivElement>(null);

    const predefinedAgents = [
        "VALERIA PETIT",
        "JAIHELYER YAIR MEZA CARVAJAL",
        "LORELIS MAVARE",
        "OSCAR CORDERO",
        "DINOSKA CORDERO",
        "PAOLA VALENTINA RODRIGUEZ",
        "LUISANGELIS ALBERLISMAR LINARES ALDAZORA"
    ];

    const STUDENT_TUTOR_MAP: Record<string, string> = {
        "DAIVIS CORDERO": "SAHEL",
        "JAIHELYER YAIR MEZA CARVAJAL": "DAVID JOEL MERCADO",
        "PAOLA VALENTINA RODRIGUEZ TORIN": "JADHEILY CHIRINOS",
        "PAOLA VALENTINA RODRIGUEZ": "JADHEILY CHIRINOS",
        "LUISANGELIS ALBERLISMAR LINARES ALDAZORA": "SOLISBETH BARRIOS",
        "DINOSKA CORDERO": "ANTONELLA CUSATO",
        "DINOSKA (DINOS) CORDERO": "ANTONELLA CUSATO",
        "VALERIA PETIT": "NAILETH GEORGINA TORRES",
        "LORELIS MAVARES": "NAIRELIS MARTINEZ",
        "LORELIS MAVARE": "NAIRELIS MARTINEZ"
    };

    const allAgents = Array.from(new Set([...predefinedAgents, ...agents.map(a => a.name.toUpperCase())])).sort();

    useEffect(() => {
        if (selectedAgent) {
            const tutor = STUDENT_TUTOR_MAP[selectedAgent.toUpperCase()] || '';
            setRepTutor(tutor);
        }
    }, [selectedAgent]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resizeCanvas = () => {
            if (canvas.parentElement) {
                canvas.width = canvas.parentElement.clientWidth;
                canvas.height = 160;
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.strokeStyle = '#0F172A';
            }
        };

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        return () => window.removeEventListener('resize', resizeCanvas);
    }, []);

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        if ('touches' in e) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        } else {
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        }
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if ('touches' in e) {
            // No llamar a e.preventDefault() aquí para permitir scroll si no están sobre el canvas
        }
        setIsDrawing(true);
        const { x, y } = getCoordinates(e);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(x, y);
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        if ('touches' in e) {
            e.preventDefault(); // Bloquear scroll solo mientras dibujan
        }
        const { x, y } = getCoordinates(e);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        canvasRef.current?.getContext('2d')?.closePath();
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    const [isGenerating, setIsGenerating] = useState(false);

    const generatePDF = async () => {
        if (!selectedAgent || !repNombre || !repCedula || !repTelefono) {
            alert('Por favor complete todos los campos y la firma antes de generar.');
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        // Verificar si el canvas está vacío (opcional, pero recomendado)

        setIsGenerating(true);

        try {
            const { jsPDF } = await import('jspdf');
            const { submitAuthorizationSupabase } = await import('../services/authPortalService');

            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pageWidth = doc.internal.pageSize.getWidth();

            // --- DISEÑO OFICIAL DNA CONSAGRADOS ---
            // 1. Fondo Header Navy Profundo
            doc.setFillColor(15, 23, 42); // Navy #0F172A
            doc.rect(0, 0, pageWidth, 55, 'F');

            // 2. Línea de Acento Roja (Glossy look)
            doc.setFillColor(185, 28, 28); // Red #B91212
            doc.rect(0, 55, pageWidth, 2, 'F');

            // 3. Logotipo / Escudo Simbolizado
            doc.setDrawColor(255, 183, 0); // Gold #FFB700
            doc.setLineWidth(1);
            doc.line(pageWidth - 40, 15, pageWidth - 15, 15);
            doc.line(pageWidth - 40, 15, pageWidth - 40, 40);
            doc.line(pageWidth - 40, 40, pageWidth - 27.5, 45);
            doc.line(pageWidth - 15, 15, pageWidth - 15, 40);
            doc.line(pageWidth - 15, 40, pageWidth - 27.5, 45);

            doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
            doc.text("C365", pageWidth - 32, 30);
            doc.setFontSize(6); doc.text("TACTICAL ID", pageWidth - 35, 34);

            // 4. Título Principal (DNA IMPACT)
            doc.setFont("helvetica", "bold"); doc.setFontSize(26); doc.setTextColor(255, 255, 255);
            doc.text("AUTORIZACIÓN TÁCTICA", 20, 25);
            doc.setFontSize(14); doc.setTextColor(255, 183, 0); // Gold
            doc.text("DESPLIEGUE OPERATIVO ARAURE 2026", 20, 35);

            doc.setFontSize(8); doc.setTextColor(148, 163, 184); // Slate-400
            doc.text("COD: MOV-ARAURE-001 | NIVEL DE ACCESO: ELITE", 20, 45);

            // 5. Cuerpo del Documento
            doc.setFillColor(255, 255, 255);
            // No need to fill white, default is white

            // Bloque de Certificación
            doc.setFillColor(241, 245, 249); doc.roundedRect(15, 65, pageWidth - 30, 40, 3, 3, 'F');
            doc.setDrawColor(185, 28, 28); doc.setLineWidth(1.5); doc.line(15, 65, 15, 105);

            doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(30, 41, 59);
            const text = `YO, EL ABAJO FIRMANTE, EN MI CONDICIÓN DE REPRESENTANTE LEGAL, CERTIFICO QUE HE SIDO INFORMADO DE LOS DETALLES DE LA MISIÓN A ARAURE. AUTORIZO FORMALMENTE LA MOVILIZACIÓN DE MI REPRESENTADO BAJO LA CUSTODIA DIRECTA DEL EQUIPO DE CONSAGRADOS 2026. SE GARANTIZA PROTOCOLO DE SEGURIDAD Y LOGÍSTICA TÁCTICA DURANTE TODO EL TRAYECTO.`;
            const splitText = doc.splitTextToSize(text, pageWidth - 45);
            doc.text(splitText, 22, 78);

            // 6. Grid de Datos (Tactical Style)
            let currentY = 120;
            const drawMetric = (label: string, value: string, x: number, y: number, w: number) => {
                doc.setFontSize(7); doc.setTextColor(185, 28, 28); doc.text(label, x, y);
                doc.setFontSize(11); doc.setTextColor(15, 23, 42); doc.text(value.toUpperCase(), x, y + 6);
                doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2); doc.line(x, y + 8, x + w, y + 8);
            };

            drawMetric("01. AGENTE (ESTUDIANTE)", selectedAgent, 20, currentY, (pageWidth / 2) - 30);
            drawMetric("02. TUTOR RESPONSABLE (1:1)", repTutor || "NO ASIGNADO", pageWidth / 2 + 5, currentY, (pageWidth / 2) - 25);

            currentY += 20;
            drawMetric("03. REPRESENTANTE LEGAL", repNombre, 20, currentY, (pageWidth / 2) - 30);
            drawMetric("04. CÉDULA DE IDENTIDAD", repCedula, pageWidth / 2 + 5, currentY, (pageWidth / 2) - 25);

            currentY += 20;
            drawMetric("05. TELÉFONO DE EMERGENCIA", repTelefono, 20, currentY, pageWidth - 40);

            // 7. Área de Firma (The core DNA part)
            currentY += 25;
            doc.setFontSize(8); doc.setTextColor(185, 28, 28); doc.text("➤ 06. CONFIRMACIÓN BIOMÉTRICA (FIRMA DIGITAL)", 20, currentY);

            doc.setDrawColor(15, 23, 42); doc.setLineWidth(0.5);
            doc.rect(20, currentY + 4, pageWidth - 40, 45);
            doc.setFontSize(6); doc.setTextColor(203, 213, 225);
            doc.text("SISTEMA DE CAPTURA DIGITAL - CONSAGRADOS ID", pageWidth / 2, currentY + 30, { align: "center" });

            if (canvas) {
                const sigData = canvas.toDataURL('image/png');
                // Ensure there is drawing (simple check)
                if (sigData.length > 2000) {
                    doc.addImage(sigData, 'PNG', 25, currentY + 7, pageWidth - 50, 39);
                } else {
                    console.warn("Signature might be empty or too small");
                }
            }

            // 8. Footer Premium
            currentY = 255;
            doc.setDrawColor(15, 23, 42); doc.setLineWidth(1); doc.line(pageWidth / 2 - 20, currentY, pageWidth / 2 + 20, currentY);
            doc.setFontSize(10); doc.setTextColor(15, 23, 42);
            doc.text("SAHEL BARRIOS", pageWidth / 2, currentY + 5, { align: "center" });
            doc.setFontSize(7); doc.setTextColor(185, 28, 28);
            doc.text("COORDINADOR GENERAL - CONSAGRADOS 2026", pageWidth / 2, currentY + 9, { align: "center" });

            doc.setFontSize(6); doc.setTextColor(148, 163, 184);
            doc.text("DOCUMENTO GENERADO POR EL NODO CENTRAL DE INTELIGENCIA. VALIDEZ TÁCTICA PARA DESPLIEGUE ARAURE.", pageWidth / 2, 285, { align: "center" });

            // --- GUARDAR Y ENVIAR ---
            // 1. Descargar PDF
            const fileName = `Autorizacion_${selectedAgent.replace(/\s+/g, '_')}_DNA.pdf`;
            doc.save(fileName);

            // 2. Sincronizar con base de datos
            const signatureBase64 = canvas ? canvas.toDataURL('image/png') : '';
            const res = await submitAuthorizationSupabase({
                agent_id: agents.find(a => a.name.toUpperCase() === selectedAgent.toUpperCase())?.id || 'EXTERNAL',
                agent_name: selectedAgent,
                representative_name: repNombre,
                representative_id: repCedula,
                phone: repTelefono,
                signature_data: signatureBase64,
                tutor_name: repTutor
            });

            if (res.success) {
                alert('¡Autorización generada y guardada con éxito! El PDF se ha descargado. Ya no es obligatorio enviarlo por WhatsApp, pero puede hacerlo para confirmar.');
            } else {
                alert('El PDF se generó pero hubo un error al sincronizar con el panel central. Por favor envíe el archivo descargado por WhatsApp.');
            }

        } catch (err) {
            console.error('Error generating PDF:', err);
            alert('Error técnico al generar el PDF. Por favor tome captura de pantalla del formulario lleno y envíelo manualmente.');
        } finally {
            setIsGenerating(false);
        }
    };

    const isPublic = window.location.search.includes('view=autorizacion');

    return (
        <div className="min-h-screen bg-[#020617] p-4 pb-20 flex flex-col items-center relative overflow-x-hidden">
            {/* Background elements for premium feel */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-red-600/10 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[120px] rounded-full"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-2xl z-10"
            >
                <div className="flex justify-between items-center mb-6">
                    <button
                        onClick={onBack}
                        className="text-white/40 hover:text-white flex items-center gap-2 transition-all uppercase text-[10px] font-black tracking-widest"
                    >
                        ← {isPublic ? 'IR A LA WEB OFICIAL' : 'VOLVER AL PANEL'}
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="h-1 w-8 bg-red-600 rounded-full animate-pulse"></div>
                        <span className="text-white/40 text-[8px] font-black uppercase tracking-[0.4em]">Canal Seguro / En Línea</span>
                    </div>
                </div>

                <div
                    ref={documentRef}
                    className="bg-white p-6 md:p-12 rounded-sm border-t-[12px] border-slate-900 shadow-2xl overflow-hidden relative"
                    style={{ fontFamily: "'Space Mono', monospace" }}
                >
                    {/* Watermark style background for the document */}
                    <div className="absolute inset-0 opacity-[0.02] pointer-events-none flex items-center justify-center rotate-[-45deg] scale-150 overflow-hidden select-none">
                        <div className="text-[120px] font-black leading-none text-slate-900 border-y-8 border-slate-900 py-4">
                            CONSAGRADOS
                        </div>
                    </div>

                    {/* Header */}
                    <div className="relative border-b-2 border-slate-900 pb-6 mb-8">
                        <div className="text-[10px] font-black text-red-600 tracking-[0.3em] mb-2">
                            PROYECTO JUVENIL CONSAGRADOS 2026 - BASE IJELS
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 uppercase leading-[0.9] mb-4" style={{ fontFamily: "'Oswald', sans-serif" }}>
                            AUTORIZACIÓN DE DESPLIEGUE OFICIAL
                        </h1>
                        <div className="flex justify-between items-end">
                            <div className="space-y-1">
                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                    ESTADO: EXPEDIENTE OPERATIVO
                                </div>
                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <ShieldCheck size={10} /> AUTENTICACIÓN DIGITAL NIVEL 1
                                </div>
                            </div>
                            <div className="text-[10px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-sm">
                                CÓDIGO: <span className="text-slate-900 font-black">MOV-ARAURE-001</span>
                            </div>
                        </div>
                    </div>

                    {/* Body Text */}
                    <div className="relative mb-10 p-5 bg-slate-50 border-l-[6px] border-red-600 shadow-inner">
                        <p className="text-[13px] leading-relaxed text-slate-800 text-justify font-bold">
                            Certifico que he sido informado de la misión a <span className="text-red-600">Araure (Festival de la Familia)</span>. Autorizo formalmente la movilización de mi representado bajo la custodia del equipo directivo de Consagrados 2026. Hora de salida estimada: 4:00 PM. Retorno: Mismo punto en horas de la noche. Se garantiza transporte, logística y seguridad en todo momento durante el despliegue técnico y espiritual.
                        </p>
                    </div>

                    {/* Form Fields */}
                    <div className="relative space-y-6">
                        <div className="group">
                            <label className="flex items-center gap-2 text-[10px] font-black text-red-600 uppercase mb-2 tracking-widest group-focus-within:translate-x-1 transition-transform">
                                <User size={14} className="text-red-600" /> 1. AGENTE CONVOCADO (ESTUDIANTE):
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedAgent}
                                    onChange={(e) => setSelectedAgent(e.target.value)}
                                    className="w-full bg-slate-100 border-b-2 border-slate-300 p-4 text-sm font-black text-slate-900 outline-none focus:border-red-600 focus:bg-white transition-all appearance-none cursor-pointer"
                                    required
                                >
                                    <option value="">-- SELECCIONE EL NOMBRE DEL AGENTE --</option>
                                    {allAgents.map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>

                                {repTutor && (
                                    <div className="mt-2 flex items-center gap-2 bg-red-600/5 border border-red-600/20 p-3 rounded-xl animate-in fade-in slide-in-from-top-2 duration-500">
                                        <ShieldCheck size={14} className="text-red-600" />
                                        <div className="text-left">
                                            <p className="text-[8px] text-red-600 font-black uppercase tracking-widest leading-none mb-0.5">Tutor Asignado (Líder 1 a 1):</p>
                                            <p className="text-[10px] text-slate-900 font-black uppercase">{repTutor}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="group">
                            <label className="flex items-center gap-2 text-[10px] font-black text-red-600 uppercase mb-2 tracking-widest group-focus-within:translate-x-1 transition-transform">
                                <ShieldCheck size={14} className="text-red-600" /> 2. NOMBRE COMPLETO DEL REPRESENTANTE:
                            </label>
                            <input
                                type="text"
                                value={repNombre}
                                onChange={(e) => setRepNombre(e.target.value)}
                                placeholder="ESCRIBA SU NOMBRE Y APELLIDO"
                                className="w-full bg-slate-100 border-b-2 border-slate-300 p-4 text-sm font-black text-slate-900 outline-none focus:border-red-600 focus:bg-white transition-all placeholder:text-slate-300 placeholder:font-bold"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="group">
                                <label className="flex items-center gap-2 text-[10px] font-black text-red-600 uppercase mb-2 tracking-widest group-focus-within:translate-x-1 transition-transform">
                                    <CreditCard size={14} className="text-red-600" /> 3. NÚMERO DE CÉDULA:
                                </label>
                                <input
                                    type="text"
                                    value={repCedula}
                                    onChange={(e) => setRepCedula(e.target.value)}
                                    placeholder="V-00.000.000"
                                    className="w-full bg-slate-100 border-b-2 border-slate-300 p-4 text-sm font-black text-slate-900 outline-none focus:border-red-600 focus:bg-white transition-all placeholder:text-slate-300"
                                    required
                                />
                            </div>
                            <div className="group">
                                <label className="flex items-center gap-2 text-[10px] font-black text-red-600 uppercase mb-2 tracking-widest group-focus-within:translate-x-1 transition-transform">
                                    <Phone size={14} className="text-red-600" /> 4. TELÉFONO DE EMERGENCIA:
                                </label>
                                <input
                                    type="tel"
                                    value={repTelefono}
                                    onChange={(e) => setRepTelefono(e.target.value)}
                                    placeholder="04XX-XXXXXXX"
                                    className="w-full bg-slate-100 border-b-2 border-slate-300 p-4 text-sm font-black text-slate-900 outline-none focus:border-red-600 focus:bg-white transition-all placeholder:text-slate-300"
                                    required
                                />
                            </div>
                        </div>

                        {/* Signature Area */}
                        <div className="relative mt-10">
                            <label className="flex items-center gap-2 text-[10px] font-black text-red-600 uppercase mb-3 tracking-widest">
                                5. FIRMA DIGITAL DEL REPRESENTANTE:
                            </label>
                            <div className="relative border-2 border-slate-900 bg-slate-50 overflow-hidden shadow-inner group">
                                <button
                                    onClick={clearSignature}
                                    className="no-capture absolute top-4 right-4 flex items-center gap-1 bg-red-600 text-white text-[10px] font-black py-1.5 px-4 rounded-full hover:bg-red-700 transition-all shadow-lg active:scale-95 z-20"
                                >
                                    <Trash2 size={12} /> LIMPIAR FIRMA
                                </button>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                                    <span className="text-[12px] font-black uppercase tracking-[0.6em] text-slate-900">FIRME AQUÍ CON SU DEDO</span>
                                </div>
                                <canvas
                                    ref={canvasRef}
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={stopDrawing}
                                    onMouseOut={stopDrawing}
                                    onTouchStart={startDrawing}
                                    onTouchMove={draw}
                                    onTouchEnd={stopDrawing}
                                    className="w-full h-[180px] cursor-crosshair touch-none relative z-10"
                                />
                                <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none no-capture">
                                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">DIBUJE SU FIRMA SOBRE LA LÍNEA O EN EL ESPACIO BLANCO</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-16 pt-8 border-t-2 border-slate-100 text-center space-y-6">
                        <div className="flex items-center justify-center gap-4 opacity-30">
                            <div className="h-px w-12 bg-slate-900"></div>
                            <div className="text-[10px] font-black text-slate-900 uppercase tracking-[0.4em]">EXPEDIENTE OFICIAL</div>
                            <div className="h-px w-12 bg-slate-900"></div>
                        </div>

                        <div className="inline-block p-4 border-2 border-slate-900 rounded-sm bg-slate-50 shadow-sm">
                            <div className="text-[12px] font-black text-slate-900 uppercase tracking-tight leading-tight mb-1">
                                SAHEL BARRIOS
                            </div>
                            <div className="text-[9px] font-black text-red-600 uppercase tracking-[0.2em]">
                                COORDINADOR GENERAL - CONSAGRADOS 2026
                            </div>
                        </div>

                        <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                            LA PRESENTE AUTORIZACIÓN TIENE VALIDEZ PARA LA MISIÓN ESPECIFICADA. <br />
                            GENERADO DIGITALMENTE A TRAVÉS DEL CENTRO DE MANDO CONSAGRADOS.
                        </div>
                    </div>
                </div>

                <div className="no-capture mt-10 space-y-6">
                    <button
                        onClick={generatePDF}
                        disabled={isGenerating}
                        className="w-full bg-red-600 hover:bg-red-700 text-white py-6 rounded-2xl flex items-center justify-center gap-4 font-black text-2xl transition-all shadow-[0_20px_50px_rgba(220,38,38,0.3)] active:scale-95 group overflow-hidden relative"
                        style={{ fontFamily: "'Oswald', sans-serif" }}
                    >
                        <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out"></div>
                        {isGenerating ? (
                            <div className="flex items-center gap-2">
                                <FileText className="animate-pulse" size={28} />
                                FORJANDO PDF...
                            </div>
                        ) : (
                            <>
                                <FileText size={28} className="group-hover:animate-bounce" />
                                GENERAR AUTORIZACIÓN (PDF)
                            </>
                        )}
                    </button>

                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[2rem] p-6 text-center space-y-3">
                        <div className="flex items-center justify-center gap-2 text-[#25D366]">
                            <CheckCircle2 size={16} />
                            <span className="text-[11px] font-black uppercase tracking-widest">INSTRUCCIÓN DE ENVÍO</span>
                        </div>
                        <p className="text-white/60 text-[11px] font-medium leading-relaxed uppercase tracking-widest">
                            UNA VEZ DESCARGADO EL DOCUMENTO, PUEDE ENVIAR EL <span className="text-white font-black underline">PDF</span> POR WHATSAPP AL DIRECTOR PARA DOBLE CONFIRMACIÓN, AUNQUE YA QUEDARÁ REGISTRADO EN EL SISTEMA.
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default DeploymentAuthorization;
