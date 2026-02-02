import React, { useState } from 'react';
import { saveBulkAcademyData } from '../services/sheetsService';
import { Upload, FileCode, CheckCircle, AlertCircle, Loader2, Save, X, Info, Sparkles, Camera, Image as ImageIcon } from 'lucide-react';
import { processAssessmentAI } from '../services/geminiService';
import { UserRole } from '../types';

interface AcademyStudioProps {
    onSuccess: () => void;
    onCancel: () => void;
}

const AcademyStudio: React.FC<AcademyStudioProps> = ({ onSuccess, onCancel }) => {
    const [bulkJson, setBulkJson] = useState('');
    const [activeTab, setActiveTab] = useState<'BULK' | 'AI'>('BULK');
    const [aiInput, setAiInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleBulkSave = async () => {
        try {
            setError(null);
            const data = JSON.parse(bulkJson);

            if (!data.courses || !data.lessons) {
                throw new Error('El formato JSON debe contener los arrays "courses" y "lessons".');
            }

            setIsSaving(true);
            const res = await saveBulkAcademyData(data);

            if (res.success) {
                setSuccess(true);
                setTimeout(() => {
                    onSuccess();
                }, 1500);
            } else {
                throw new Error(res.error || 'Error al guardar en el servidor');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAIGenerate = async (input: string, isImage: boolean = false) => {
        try {
            setError(null);
            setIsGenerating(true);
            const result = await processAssessmentAI(input, isImage);
            if (result) {
                const fullData = {
                    courses: [],
                    lessons: result.lessons || []
                };
                setBulkJson(JSON.stringify(fullData, null, 2));
                setActiveTab('BULK');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                handleAIGenerate(reader.result as string, true);
            };
            reader.readAsDataURL(file);
        }
    };

    const exampleFormat = `{
  "courses": [
    {
      "id": "CURSO_ID",
      "title": "Misión Táctica",
      "description": "Reporte de Campo",
      "imageUrl": "https://...",
      "requiredLevel": "RECLUTA"
    }
  ],
  "lessons": [
    {
      "id": "LEC_01",
      "courseId": "CURSO_ID",
      "order": 1,
      "title": "Evaluación: Identidad",
      "videoUrl": "Link de YouTube",
      "startTime": 0,
      "endTime": 300,
      "content": "<h1>Reporte de Campo</h1>",
      "questions": [
        {
          "type": "TEXT",
          "question": "¿Cómo aplicarías Génesis 1:27 a Sofía?"
        },
        {
          "type": "MULTIPLE",
          "question": "¿Cuál es la mentalidad?",
          "options": ["A. Esclavo", "B. Hijo"],
          "correctAnswer": "B"
        },
        {
          "type": "DISC",
          "question": "1. Estás en un grupo...",
          "options": ["A", "B", "C", "D"]
        }
      ],
      "xpReward": 50
    }
  ]
}`;

    return (
        <div className="bg-[#001833] border border-[#ffb700]/30 rounded-[2.5rem] p-8 space-y-6 shadow-[0_20px_50px_rgba(255,183,0,0.1)] relative overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                    <FileCode className="text-[#ffb700]" size={24} />
                    <div>
                        <h3 className="text-xl font-bebas text-white uppercase tracking-widest leading-none">Academy Studio: Bulk Importer</h3>
                        <p className="text-[8px] text-[#ffb700] font-black uppercase tracking-widest opacity-60">Automatización de contenido masivo</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
                        <button
                            onClick={() => setActiveTab('BULK')}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'BULK' ? 'bg-[#ffb700] text-[#001f3f]' : 'text-gray-500 hover:text-white'}`}
                        >
                            <FileCode size={14} /> JSON Directo
                        </button>
                        <button
                            onClick={() => setActiveTab('AI')}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'AI' ? 'bg-[#ffb700] text-[#001f3f]' : 'text-gray-500 hover:text-white'}`}
                        >
                            <Sparkles size={14} /> Generador IA
                        </button>
                    </div>
                    <button onClick={onCancel} className="p-2 text-gray-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {activeTab === 'BULK' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-black uppercase tracking-widest">
                            <Info size={14} /> Instrucciones
                        </div>
                        <div className="bg-black/30 rounded-2xl p-4 text-[9px] text-gray-400 font-bold uppercase leading-relaxed space-y-2 border border-white/5">
                            <p>1. Prepara tu curso en formato JSON (puedes usar una IA para generarlo basado en tus textos).</p>
                            <p>2. Soporta 3 tipos de preguntas: <b>TEXT</b> (Abiertas), <b>MULTIPLE</b> (Cerradas) y <b>DISC</b> (Psicométricas).</p>
                            <p>3. El sistema buscará los IDs. Si ya existen, los actualizará. Si no, los creará.</p>
                            <p>4. Usa <b>startTime</b> y <b>endTime</b> (en segundos) para fragmentar videos largos.</p>
                            <p>5. No es necesario llenar "correctAnswer" en preguntas TEXT o DISC.</p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] text-[#ffb700] font-black uppercase tracking-widest ml-2">Formato Requerido:</p>
                            <pre className="bg-black/50 p-4 rounded-2xl text-[8px] text-green-400/80 font-mono overflow-x-auto border border-white/5">
                                {exampleFormat}
                            </pre>
                        </div>
                    </div>

                    <div className="space-y-4 flex flex-col">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-2">Editor JSON</label>
                            <button
                                onClick={() => setBulkJson('')}
                                className="text-[8px] text-red-500 font-black uppercase hover:underline"
                            >
                                Limpiar
                            </button>
                        </div>
                        <textarea
                            value={bulkJson}
                            onChange={(e) => setBulkJson(e.target.value)}
                            placeholder="Pega aquí tu código JSON..."
                            className="flex-1 min-h-[300px] w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-xs text-white font-mono focus:border-[#ffb700] outline-none transition-all scrollbar-thin"
                        />

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400">
                                <AlertCircle size={18} />
                                <p className="text-[9px] font-black uppercase tracking-widest">{error}</p>
                            </div>
                        )}

                        {success && (
                            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3 text-green-400">
                                <CheckCircle size={18} />
                                <p className="text-[9px] font-black uppercase tracking-widest">Contenido desplegado con éxito.</p>
                            </div>
                        )}

                        <button
                            onClick={handleBulkSave}
                            disabled={!bulkJson || isSaving || success}
                            className="w-full bg-[#ffb700] py-5 rounded-2xl text-[#001f3f] font-black uppercase text-[11px] tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 font-bebas"
                        >
                            {isSaving ? (
                                <Loader2 className="animate-spin" size={18} />
                            ) : (
                                <Save size={18} />
                            )}
                            {isSaving ? 'Sincronizando Base de Datos...' : 'Guardar Cambios Masivamente'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-in slide-in-from-bottom-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h4 className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-2">Convertir desde Texto / HTML</h4>
                            <textarea
                                value={aiInput}
                                onChange={(e) => setAiInput(e.target.value)}
                                placeholder="Pega aquí los textos de tu evaluación o guías..."
                                className="w-full h-[300px] bg-black/40 border border-white/10 rounded-2xl p-6 text-[10px] text-white font-bold uppercase focus:border-[#ffb700] outline-none transition-all scrollbar-thin font-montserrat"
                            />
                            <button
                                onClick={() => handleAIGenerate(aiInput)}
                                disabled={!aiInput || isGenerating}
                                className="w-full bg-white/5 border border-white/10 py-5 rounded-2xl text-white font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                            >
                                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-[#ffb700]" />}
                                Procesar Texto con IA
                            </button>
                        </div>

                        <div className="flex flex-col items-center justify-center space-y-6 border-2 border-dashed border-white/10 rounded-[2.5rem] p-10 bg-black/20">
                            <div className="w-20 h-20 rounded-full bg-[#ffb700]/10 flex items-center justify-center text-[#ffb700]">
                                <Camera size={32} />
                            </div>
                            <div className="text-center space-y-2">
                                <h4 className="text-sm font-bebas text-white uppercase tracking-widest">Escaneo de Fotografía</h4>
                                <p className="text-[9px] text-gray-500 font-bold uppercase max-w-[200px] mx-auto">
                                    Tómale una foto a un test en papel o captura una pantalla y la IA lo estructurará.
                                </p>
                            </div>
                            <label className="cursor-pointer bg-[#ffb700] text-[#001f3f] px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center gap-2 font-bebas">
                                <ImageIcon size={16} />
                                Seleccionar Imagen
                                <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                            </label>

                            {isGenerating && (
                                <div className="flex items-center gap-2 animate-pulse text-[#ffb700] text-[8px] font-black uppercase">
                                    <Loader2 size={12} className="animate-spin" />
                                    Analizando imagen con IA...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AcademyStudio;
