import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import { ShieldCheck, Download, Trash2, User, CreditCard, Phone, MapPin } from 'lucide-react';
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

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resizeCanvas = () => {
            canvas.width = canvas.parentElement?.clientWidth || 0;
            canvas.height = 150;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#0F172A';
        };

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        return () => window.removeEventListener('resize', resizeCanvas);
    }, []);

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
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
                x: (e as React.MouseEvent).nativeEvent.offsetX,
                y: (e as React.MouseEvent).nativeEvent.offsetY
            };
        }
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if ('touches' in e) e.preventDefault();
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
        if ('touches' in e) e.preventDefault();
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

    const generateImage = async () => {
        if (!selectedAgent || !repNombre || !repCedula || !repTelefono) {
            alert('Por favor complete todos los campos y la firma antes de generar.');
            return;
        }

        if (!documentRef.current) return;

        // Ocultar elementos que no deben salir en la imagen
        const buttons = document.querySelectorAll('.no-capture');
        buttons.forEach(b => (b as HTMLElement).style.display = 'none');

        try {
            const canvas = await html2canvas(documentRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            const link = document.createElement('a');
            link.download = `Autorizacion_${selectedAgent.replace(/\s+/g, '_')}.jpg`;
            link.href = canvas.toDataURL('image/jpeg', 0.9);
            link.click();

            alert('¡Documento generado con éxito! Por favor envíe la imagen descargada por WhatsApp.');
        } catch (err) {
            console.error('Error generating image:', err);
            alert('Error al generar la imagen. Intente nuevamente.');
        } finally {
            buttons.forEach(b => (b as HTMLElement).style.display = 'flex');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 p-4 pb-20 flex flex-col items-center">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-2xl"
            >
                <button
                    onClick={onBack}
                    className="mb-4 text-white/60 hover:text-white flex items-center gap-2 transition-colors uppercase text-xs font-bold tracking-widest"
                >
                    ← Volver al Panel
                </button>

                <div
                    ref={documentRef}
                    className="bg-white p-6 rounded-sm border-t-[10px] border-slate-900 shadow-2xl overflow-hidden"
                    style={{ fontFamily: "'Space Mono', monospace" }}
                >
                    {/* Header */}
                    <div className="border-b-2 border-slate-900 pb-4 mb-6">
                        <div className="text-[10px] font-bold text-red-600 tracking-widest mb-1">
                            PROYECTO JUVENIL CONSAGRADOS 2026 - BASE IJELS
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 uppercase leading-none mb-2" style={{ fontFamily: "'Oswald', sans-serif" }}>
                            AUTORIZACIÓN DE DESPLIEGUE OFICIAL
                        </h1>
                        <div className="text-[10px] font-bold text-right text-slate-500">
                            CÓDIGO: MOV-ARAURE-001
                        </div>
                    </div>

                    {/* Body Text */}
                    <p className="text-[11px] leading-relaxed text-slate-800 text-justify mb-6">
                        Certifico que he sido informado de la misión a <strong>Araure (Festival de la Familia)</strong>. Autorizo la movilización de mi representado bajo la custodia del equipo directivo de Consagrados 2026. Hora de salida: 4:00 PM. Retorno: Mismo punto en horas de la noche. Se garantiza transporte y seguridad.
                    </p>

                    {/* Form Fields */}
                    <div className="space-y-4">
                        <div>
                            <label className="flex items-center gap-2 text-[10px] font-bold text-red-600 uppercase mb-2">
                                <User size={12} /> 1. SELECCIONE EL AGENTE CONVOCADO:
                            </label>
                            <select
                                value={selectedAgent}
                                onChange={(e) => setSelectedAgent(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 p-2 text-sm outline-none focus:border-red-600 transition-colors"
                                required
                            >
                                <option value="">Seleccione un agente...</option>
                                {predefinedAgents.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-[10px] font-bold text-red-600 uppercase mb-2">
                                <ShieldCheck size={12} /> 2. NOMBRE Y APELLIDO DEL REPRESENTANTE LEGAL:
                            </label>
                            <input
                                type="text"
                                value={repNombre}
                                onChange={(e) => setRepNombre(e.target.value)}
                                placeholder="Ej: Juan Pérez"
                                className="w-full bg-slate-50 border border-slate-200 p-2 text-sm outline-none focus:border-red-600 transition-colors"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="flex items-center gap-2 text-[10px] font-bold text-red-600 uppercase mb-2">
                                    <CreditCard size={12} /> 3. CÉDULA DE IDENTIDAD:
                                </label>
                                <input
                                    type="text"
                                    value={repCedula}
                                    onChange={(e) => setRepCedula(e.target.value)}
                                    placeholder="V-12345678"
                                    className="w-full bg-slate-50 border border-slate-200 p-2 text-sm outline-none focus:border-red-600 transition-colors"
                                    required
                                />
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-[10px] font-bold text-red-600 uppercase mb-2">
                                    <Phone size={12} /> 4. TELÉFONO DE EMERGENCIA:
                                </label>
                                <input
                                    type="tel"
                                    value={repTelefono}
                                    onChange={(e) => setRepTelefono(e.target.value)}
                                    placeholder="04XX-XXXXXXX"
                                    className="w-full bg-slate-50 border border-slate-200 p-2 text-sm outline-none focus:border-red-600 transition-colors"
                                    required
                                />
                            </div>
                        </div>

                        {/* Signature Area */}
                        <div className="relative border-2 border-dashed border-slate-200 bg-slate-50 rounded-lg overflow-hidden mt-6">
                            <label className="absolute top-2 left-2 text-[10px] font-bold text-red-600 uppercase pointer-events-none">
                                5. DIBUJE SU FIRMA AQUÍ ABAJO:
                            </label>
                            <button
                                onClick={clearSignature}
                                className="no-capture absolute top-2 right-2 flex items-center gap-1 bg-red-600 text-white text-[9px] font-bold py-1 px-2 rounded hover:bg-red-700 transition-colors"
                            >
                                <Trash2 size={10} /> BORRAR
                            </button>
                            <canvas
                                ref={canvasRef}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseOut={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                                className="w-full h-[150px] cursor-crosshair touch-none"
                            />
                        </div>
                    </div>

                    <div className="mt-8 pt-4 border-t border-slate-200 text-center">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                            AUTORIZADO POR: SAHEL BARRIOS (COORD. GENERAL - CONSAGRADOS 2026)
                        </div>
                    </div>
                </div>

                <button
                    onClick={generateImage}
                    className="no-capture mt-6 w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl flex items-center justify-center gap-3 font-black text-lg transition-all shadow-xl active:scale-95"
                    style={{ fontFamily: "'Oswald', sans-serif" }}
                >
                    <Download size={24} />
                    FORJAR Y DESCARGAR AUTORIZACIÓN
                </button>
            </motion.div>
        </div>
    );
};

export default DeploymentAuthorization;
