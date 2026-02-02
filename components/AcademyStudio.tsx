import React, { useState } from 'react';
import { saveBulkAcademyData } from '../services/sheetsService';
import { Upload, FileCode, CheckCircle, AlertCircle, Loader2, Save, X, Info, Sparkles, Camera, Image as ImageIcon, Plus, Trash2, ClipboardCopy, PenTool } from 'lucide-react';
import { processAssessmentAI } from '../services/geminiService';
import { UserRole } from '../types';

interface AcademyStudioProps {
    onSuccess: () => void;
    onCancel: () => void;
}

interface ManualQuestion {
    type: 'TEXT' | 'MULTIPLE' | 'DISC';
    question: string;
    options: string[];
    optionCategories?: string[]; // New
    correctAnswer: string;
}

interface ResultMapping {
    category?: string;
    minScore?: number;
    maxScore?: number;
    title: string;
    content: string;
}

const AcademyStudio: React.FC<AcademyStudioProps> = ({ onSuccess, onCancel }) => {
    const [bulkJson, setBulkJson] = useState('');
    const [activeTab, setActiveTab] = useState<'BULK' | 'AI' | 'MANUAL'>('BULK');
    const [aiInput, setAiInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Manual Test Generator State
    const [lessonTitle, setLessonTitle] = useState('');
    const [lessonContent, setLessonContent] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [xpReward, setXpReward] = useState(50);
    const [resultAlgorithm, setResultAlgorithm] = useState<'HIGHEST_CATEGORY' | 'SCORE_PERCENTAGE'>('HIGHEST_CATEGORY');
    const [resultMappings, setResultMappings] = useState<ResultMapping[]>([]);
    const [questions, setQuestions] = useState<ManualQuestion[]>([
        { type: 'MULTIPLE', question: '', options: ['A. ', 'B. ', 'C. ', 'D. '], optionCategories: ['A', 'B', 'C', 'D'], correctAnswer: 'A' }
    ]);
    const [generatedJson, setGeneratedJson] = useState('');

    const addQuestion = () => {
        setQuestions([...questions, { type: 'MULTIPLE', question: '', options: ['A. ', 'B. '], optionCategories: ['A', 'B'], correctAnswer: 'A' }]);
    };

    const removeQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const updateQuestion = (index: number, field: keyof ManualQuestion, value: any) => {
        const updated = [...questions];
        updated[index] = { ...updated[index], [field]: value };
        setQuestions(updated);
    };

    const addOption = (qIndex: number) => {
        const updated = [...questions];
        const nextLetter = String.fromCharCode(65 + updated[qIndex].options.length);
        updated[qIndex].options.push(`${nextLetter}. `);
        setQuestions(updated);
    };

    const updateOption = (qIndex: number, optIndex: number, value: string) => {
        const updated = [...questions];
        updated[qIndex].options[optIndex] = value;
        setQuestions(updated);
    };

    const removeOption = (qIndex: number, optIndex: number) => {
        const updated = [...questions];
        updated[qIndex].options.splice(optIndex, 1);
        setQuestions(updated);
    };

    const updateOptionCategory = (qIndex: number, optIndex: number, value: string) => {
        const updated = [...questions];
        if (!updated[qIndex].optionCategories) updated[qIndex].optionCategories = [];
        updated[qIndex].optionCategories![optIndex] = value;
        setQuestions(updated);
    };

    const addResultMapping = () => {
        setResultMappings([...resultMappings, { title: '', content: '', category: 'D' }]);
    };

    const updateResultMapping = (index: number, field: keyof ResultMapping, value: any) => {
        const updated = [...resultMappings];
        updated[index] = { ...updated[index], [field]: value };
        setResultMappings(updated);
    };

    const removeResultMapping = (index: number) => {
        setResultMappings(resultMappings.filter((_, i) => i !== index));
    };

    const generateManualJson = () => {
        const lessonId = `LEC_${Date.now()}`;
        const lesson = {
            id: lessonId,
            courseId: "CURSO_PLACEHOLDER",
            order: 1,
            title: lessonTitle || "Nueva Lección",
            videoUrl: videoUrl || "",
            content: lessonContent || "<p>Contenido de la lección</p>",
            questions: questions.map(q => ({
                type: q.type,
                question: q.question,
                options: q.type !== 'TEXT' ? q.options.filter(o => o.trim()) : undefined,
                optionCategories: q.type !== 'TEXT' ? q.optionCategories?.slice(0, q.options.length) : undefined,
                correctAnswer: q.type === 'MULTIPLE' ? q.correctAnswer : undefined
            })).filter(q => q.question.trim()),
            xpReward: xpReward,
            resultAlgorithm: resultAlgorithm,
            resultMappings: resultMappings.length > 0 ? resultMappings : undefined
        };

        const fullData = {
            courses: [],
            lessons: [lesson]
        };

        const json = JSON.stringify(fullData, null, 2);
        setGeneratedJson(json);
        return json;
    };

    const copyToClipboard = () => {
        const json = generateManualJson();
        navigator.clipboard.writeText(json);
        setError(null);
    };

    const sendToBulkEditor = () => {
        const json = generateManualJson();
        setBulkJson(json);
        setActiveTab('BULK');
    };

    const handleBulkSave = async () => {
        try {
            setError(null);
            const data = JSON.parse(bulkJson);
            if (!data) throw new Error('El JSON está vacío.');

            // Si es un array directo, lo tratamos como lecciones
            const lessons = Array.isArray(data) ? data : (Array.isArray(data.lessons) ? data.lessons : []);
            const courses = !Array.isArray(data) && Array.isArray(data.courses) ? data.courses : [];

            if (lessons.length === 0 && courses.length === 0) {
                throw new Error('El formato JSON debe contener al menos una lección o un curso.');
            }

            const finalData = { courses, lessons };

            setIsSaving(true);
            const res = await saveBulkAcademyData(finalData);

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
                // If AI returns a raw array, wrap it as lessons
                const lessons = Array.isArray(result) ? result : (result.lessons || []);
                const courses = (!Array.isArray(result) && result.courses) ? result.courses : [];

                const fullData = {
                    courses,
                    lessons
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
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === 'BULK' ? 'bg-[#ffb700] text-[#001f3f]' : 'text-gray-500 hover:text-white'}`}
                        >
                            <FileCode size={12} /> JSON
                        </button>
                        <button
                            onClick={() => setActiveTab('MANUAL')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === 'MANUAL' ? 'bg-[#ffb700] text-[#001f3f]' : 'text-gray-500 hover:text-white'}`}
                        >
                            <PenTool size={12} /> Manual
                        </button>
                        <button
                            onClick={() => setActiveTab('AI')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === 'AI' ? 'bg-[#ffb700] text-[#001f3f]' : 'text-gray-500 hover:text-white'}`}
                        >
                            <Sparkles size={12} /> IA
                        </button>
                    </div>
                    <button onClick={onCancel} className="p-2 text-gray-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-400 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={18} className="shrink-0" />
                    <p className="text-[10px] font-black uppercase tracking-widest">{error}</p>
                </div>
            )}

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
                            <pre className="bg-black/50 p-4 rounded-2xl text-[8px] text-green-400/80 font-mono overflow-x-auto border border-white/5 max-h-[300px] overflow-y-auto">
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
            ) : activeTab === 'MANUAL' ? (
                <div className="space-y-6 animate-in slide-in-from-bottom-4">
                    <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4">
                        <p className="text-[10px] text-green-400 font-black uppercase tracking-widest">
                            💡 Generador Manual: Usa este formulario para crear tests sin necesidad de IA o conocimientos de JSON
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Form Panel */}
                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                            <div className="space-y-3">
                                <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Título de la Lección</label>
                                <input
                                    type="text"
                                    value={lessonTitle}
                                    onChange={(e) => setLessonTitle(e.target.value)}
                                    placeholder="Ej: Evaluación de Identidad"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white focus:border-[#ffb700] outline-none"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">URL del Video (opcional)</label>
                                <input
                                    type="text"
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    placeholder="https://youtube.com/watch?v=..."
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white focus:border-[#ffb700] outline-none"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Contenido / Instrucciones</label>
                                <textarea
                                    value={lessonContent}
                                    onChange={(e) => setLessonContent(e.target.value)}
                                    placeholder="Escribe aquí las instrucciones o contenido de la lección..."
                                    className="w-full h-20 bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white focus:border-[#ffb700] outline-none"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Algoritmo de Resultado</label>
                                <select
                                    value={resultAlgorithm}
                                    onChange={(e) => setResultAlgorithm(e.target.value as any)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white focus:border-[#ffb700] outline-none"
                                >
                                    <option value="HIGHEST_CATEGORY">Categoría más repetida (D,I,S,C)</option>
                                    <option value="SCORE_PERCENTAGE">% de Aciertos (Multirrespuesta)</option>
                                </select>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Mapeo de Resultados (D,I,S,C o %)</label>
                                    <button
                                        onClick={addResultMapping}
                                        className="text-[8px] text-[#ffb700] font-black uppercase hover:underline"
                                    >
                                        + Añadir Mapping
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {resultMappings.map((m, idx) => (
                                        <div key={idx} className="bg-black/20 border border-white/5 rounded-xl p-4 space-y-2 relative group">
                                            <button onClick={() => removeResultMapping(idx)} className="absolute top-2 right-2 text-red-500/50 hover:text-red-500">
                                                <X size={14} />
                                            </button>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Cat (A,B,C,D)"
                                                    value={m.category}
                                                    onChange={(e) => updateResultMapping(idx, 'category', e.target.value)}
                                                    className="w-20 bg-black/40 border border-white/10 rounded-lg p-2 text-[10px] text-white"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Título del Perfil"
                                                    value={m.title}
                                                    onChange={(e) => updateResultMapping(idx, 'title', e.target.value)}
                                                    className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-[10px] text-white"
                                                />
                                            </div>
                                            <textarea
                                                placeholder="Contenido del perfil (Soporta HTML)..."
                                                value={m.content}
                                                onChange={(e) => updateResultMapping(idx, 'content', e.target.value)}
                                                className="w-full h-16 bg-black/40 border border-white/10 rounded-lg p-3 text-[10px] text-white"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <hr className="border-white/10" />

                            <div className="flex items-center justify-between">
                                <h4 className="text-[12px] text-[#ffb700] font-black uppercase tracking-widest">Preguntas</h4>
                                <button
                                    onClick={addQuestion}
                                    className="flex items-center gap-2 px-4 py-2 bg-[#ffb700]/20 border border-[#ffb700]/30 rounded-xl text-[9px] text-[#ffb700] font-black uppercase hover:bg-[#ffb700]/30 transition-all"
                                >
                                    <Plus size={12} /> Añadir Pregunta
                                </button>
                            </div>

                            {questions.map((q, qIndex) => (
                                <div key={qIndex} className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-[#ffb700] font-black uppercase">Pregunta {qIndex + 1}</span>
                                        <button
                                            onClick={() => removeQuestion(qIndex)}
                                            className="p-1 text-red-500 hover:bg-red-500/20 rounded-lg transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    <select
                                        value={q.type}
                                        onChange={(e) => updateQuestion(qIndex, 'type', e.target.value)}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-[10px] text-white font-bold uppercase"
                                    >
                                        <option value="MULTIPLE">Opción Múltiple</option>
                                        <option value="TEXT">Respuesta Abierta</option>
                                        <option value="DISC">Test DISC</option>
                                    </select>

                                    <textarea
                                        value={q.question}
                                        onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                                        placeholder="Escribe la pregunta..."
                                        className="w-full h-16 bg-black/50 border border-white/10 rounded-xl p-3 text-[11px] text-white focus:border-[#ffb700] outline-none"
                                    />

                                    {q.type !== 'TEXT' && (
                                        <div className="space-y-2">
                                            <label className="text-[8px] text-gray-500 font-black uppercase">Opciones y Categorías (A,B,C,D):</label>
                                            {q.options.map((opt, optIndex) => (
                                                <div key={optIndex} className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={opt}
                                                        onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                                                        className="flex-1 bg-black/50 border border-white/10 rounded-lg p-2 text-[10px] text-white focus:border-[#ffb700] outline-none"
                                                    />
                                                    <select
                                                        value={q.optionCategories?.[optIndex] || ''}
                                                        onChange={(e) => updateOptionCategory(qIndex, optIndex, e.target.value)}
                                                        className="w-16 bg-black/50 border border-white/10 rounded-lg p-2 text-[10px] text-[#ffb700] font-bold"
                                                    >
                                                        <option value="A">A</option>
                                                        <option value="B">B</option>
                                                        <option value="C">C</option>
                                                        <option value="D">D</option>
                                                        <option value="">-</option>
                                                    </select>
                                                    {q.options.length > 2 && (
                                                        <button
                                                            onClick={() => removeOption(qIndex, optIndex)}
                                                            className="p-1 text-red-500/50 hover:text-red-500 transition-all"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => addOption(qIndex)}
                                                className="text-[8px] text-[#ffb700] font-black uppercase hover:underline"
                                            >
                                                + Añadir opción
                                            </button>
                                        </div>
                                    )}

                                    {q.type === 'MULTIPLE' && (
                                        <div className="flex items-center gap-2">
                                            <label className="text-[8px] text-gray-500 font-black uppercase">Respuesta Correcta:</label>
                                            <select
                                                value={q.correctAnswer}
                                                onChange={(e) => updateQuestion(qIndex, 'correctAnswer', e.target.value)}
                                                className="bg-black/50 border border-white/10 rounded-lg p-2 text-[10px] text-[#ffb700] font-bold"
                                            >
                                                {q.options.map((_, i) => (
                                                    <option key={i} value={String.fromCharCode(65 + i)}>
                                                        {String.fromCharCode(65 + i)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Preview Panel */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Vista Previa JSON</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={copyToClipboard}
                                        className="flex items-center gap-1 px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[8px] text-white font-black uppercase hover:bg-white/10 transition-all"
                                    >
                                        <ClipboardCopy size={10} /> Copiar
                                    </button>
                                </div>
                            </div>
                            <pre className="bg-black/50 p-4 rounded-2xl text-[9px] text-green-400/80 font-mono overflow-auto border border-white/5 h-[350px]">
                                {generatedJson || generateManualJson()}
                            </pre>

                            <button
                                onClick={sendToBulkEditor}
                                className="w-full bg-[#ffb700] py-4 rounded-2xl text-[#001f3f] font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 font-bebas"
                            >
                                <Save size={16} /> Enviar al Editor y Guardar
                            </button>
                        </div>
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
