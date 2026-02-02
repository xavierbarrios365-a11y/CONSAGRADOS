import React, { useState } from 'react';
import { saveBulkAcademyData } from '../services/sheetsService';
import { Upload, FileCode, CheckCircle, AlertCircle, Loader2, Save, X, Info } from 'lucide-react';

interface AcademyStudioProps {
    onSuccess: () => void;
    onCancel: () => void;
}

const AcademyStudio: React.FC<AcademyStudioProps> = ({ onSuccess, onCancel }) => {
    const [bulkJson, setBulkJson] = useState('');
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

    const exampleFormat = `{
  "courses": [
    {
      "id": "CURSO_01",
      "title": "Misión Táctica",
      "description": "Fundamentos de la luz",
      "imageUrl": "https://...",
      "requiredLevel": "RECLUTA"
    }
  ],
  "lessons": [
    {
      "id": "LEC_01",
      "courseId": "CURSO_01",
      "order": 1,
      "title": "Unidad 1: Despliegue",
      "videoUrl": "https://youtube.com/...",
      "content": "Teoría fundamental...",
      "question": "¿Cuál es el objetivo?",
      "options": ["Luz", "Oscuridad", "Neutral", "Ninguna"],
      "correctAnswer": "Luz",
      "xpReward": 50
    }
  ]
}`;

    return (
        <div className="bg-[#001833] border border-[#ffb700]/30 rounded-[2.5rem] p-8 space-y-6 shadow-[0_20px_50px_rgba(255,183,0,0.1)] relative overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <FileCode className="text-[#ffb700]" size={24} />
                    <div>
                        <h3 className="text-xl font-bebas text-white uppercase tracking-widest leading-none">Academy Studio: Bulk Importer</h3>
                        <p className="text-[8px] text-[#ffb700] font-black uppercase tracking-widest opacity-60">Automatización de contenido masivo</p>
                    </div>
                </div>
                <button onClick={onCancel} className="p-2 text-gray-500 hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 font-black uppercase tracking-widest">
                        <Info size={14} /> Instrucciones
                    </div>
                    <div className="bg-black/30 rounded-2xl p-4 text-[9px] text-gray-400 font-bold uppercase leading-relaxed space-y-2 border border-white/5">
                        <p>1. Prepara tu curso en formato JSON (puedes usar una IA para generarlo basado en tus textos).</p>
                        <p>2. Pega el código en el área de la derecha.</p>
                        <p>3. El sistema buscará los IDs. Si ya existen, los actualizará. Si no, los creará.</p>
                        <p>4. No es necesario llenar todas las opciones del quiz si no las usas.</p>
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
        </div>
    );
};

export default AcademyStudio;
