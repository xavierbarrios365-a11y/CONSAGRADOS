import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Agent } from '../types';
import { Brain, FileText, Users, MessageSquare, Loader2, Send, Upload, RefreshCw, ChevronDown, CheckCircle2, AlertTriangle, Sparkles, Copy, X, Cpu, Zap, BookOpen } from 'lucide-react';
import { getGenAIResult, processAssessmentAI, generateTacticalProfile, generateCommunityIntelReport } from '../services/geminiService';
import { updateAgentAiProfileSupabase, fetchAcademyDataSupabase, syncAcademyToSupabase } from '../services/supabaseService';
import { uploadToCloudinary } from '../services/cloudinaryService';
import { useTacticalAlert } from './TacticalAlert';

interface GeminiCommandCenterProps {
    agents: Agent[];
    currentUser: Agent | null;
    onUpdateNeeded?: () => void | Promise<void>;
}

type TabId = 'EXAM' | 'PROFILES' | 'REPORT' | 'FREEFORM';

const TABS: { id: TabId; label: string; icon: any; desc: string }[] = [
    { id: 'EXAM', label: 'EXÁMENES', icon: FileText, desc: 'Crear evaluaciones IA' },
    { id: 'PROFILES', label: 'PERFILES', icon: Users, desc: 'Regenerar análisis táctico' },
    { id: 'REPORT', label: 'REPORTE', icon: Cpu, desc: 'Inteligencia de la fuerza' },
    { id: 'FREEFORM', label: 'INSTRUCCIÓN', icon: MessageSquare, desc: 'Prompt libre a Gemini' },
];

const GeminiCommandCenter: React.FC<GeminiCommandCenterProps> = ({ agents, currentUser, onUpdateNeeded }) => {
    const { showAlert } = useTacticalAlert();
    const [activeTab, setActiveTab] = useState<TabId>('EXAM');

    // Exam State
    const [examInput, setExamInput] = useState('');
    const [examResult, setExamResult] = useState<any>(null);
    const [isProcessingExam, setIsProcessingExam] = useState(false);
    const [examImageBase64, setExamImageBase64] = useState<string | null>(null);
    const [isPublishingExam, setIsPublishingExam] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Profile State
    const [selectedAgentId, setSelectedAgentId] = useState('');
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [isBulkRegenerating, setIsBulkRegenerating] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

    // Report State
    const [globalReport, setGlobalReport] = useState<string | null>(null);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);

    // Freeform State
    const [freeformPrompt, setFreeformPrompt] = useState('');
    const [freeformResult, setFreeformResult] = useState('');
    const [isProcessingFreeform, setIsProcessingFreeform] = useState(false);

    // --- EXAM SECTION ---
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setExamImageBase64(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleProcessExam = async () => {
        if (!examInput && !examImageBase64) return;
        setIsProcessingExam(true);
        setExamResult(null);
        try {
            const result = await processAssessmentAI(examImageBase64 || examInput, !!examImageBase64);
            setExamResult(result);
            showAlert({ title: "IA COMPLETADA", message: "✅ Examen generado exitosamente. Revise el resultado.", type: 'SUCCESS' });
        } catch (err: any) {
            showAlert({ title: "ERROR DE IA", message: `❌ ${err.message}`, type: 'ERROR' });
        } finally {
            setIsProcessingExam(false);
        }
    };

    const handleCopyExamResult = () => {
        if (examResult) {
            navigator.clipboard.writeText(JSON.stringify(examResult, null, 2));
            showAlert({ title: "COPIADO", message: "📋 JSON copiado al portapapeles", type: 'SUCCESS' });
        }
    };

    const handlePublishToAcademy = async () => {
        if (!examResult) return;
        const lessonsCount = examResult.lessons?.length || 0;
        const coursesCount = examResult.courses?.length || 0;
        const confirmed = window.confirm(
            `¿Publicar este contenido en la Academia Táctica?\n\n` +
            `Cursos: ${coursesCount}\n` +
            `Lecciones/Evaluaciones: ${lessonsCount}\n\n` +
            `Esto lo hará visible para todos los agentes.`
        );
        if (!confirmed) return;

        setIsPublishingExam(true);
        try {
            const courses = (examResult.courses || []).map((c: any, i: number) => ({
                id: c.id || `AI_COURSE_${Date.now()}_${i}`,
                title: c.title || 'Curso sin título',
                description: c.description || '',
                badgeReward: c.badgeReward || '',
                xpReward: c.xpReward || 50,
                imageUrl: c.imageUrl || '',
                orderIndex: c.orderIndex || i,
                isActive: true
            }));

            const lessons = (examResult.lessons || []).map((l: any, i: number) => ({
                id: l.id || `AI_LESSON_${Date.now()}_${i}`,
                courseId: l.courseId || l.course_id || courses[0]?.id || `AI_COURSE_${Date.now()}_0`,
                title: l.title || 'Lección sin título',
                embedUrl: l.embedUrl || l.videoUrl || '',
                requiredRole: l.requiredRole || 'STUDENT',
                content: l.content || '',
                questions: l.questions || []
            }));

            // If no courses but has lessons, create a default course
            if (courses.length === 0 && lessons.length > 0) {
                const defaultCourse = {
                    id: `AI_COURSE_${Date.now()}`,
                    title: lessons[0].title || 'Evaluación IA',
                    description: 'Generado por Gemini AI',
                    badgeReward: '',
                    xpReward: 50,
                    imageUrl: '',
                    orderIndex: 99,
                    isActive: true
                };
                courses.push(defaultCourse);
                lessons.forEach((l: any) => { l.courseId = defaultCourse.id; });
            }

            const result = await syncAcademyToSupabase({ courses, lessons });
            if (result.success) {
                showAlert({
                    title: "PUBLICADO EN ACADEMIA",
                    message: `✅ ${courses.length} curso(s) y ${lessons.length} lección(es) inyectados en la Academia Táctica.`,
                    type: 'SUCCESS'
                });
                if (onUpdateNeeded) onUpdateNeeded();
            } else {
                throw new Error(result.error || `${result.failures} fallos al publicar`);
            }
        } catch (err: any) {
            showAlert({ title: "ERROR", message: `❌ Error al publicar: ${err.message}`, type: 'ERROR' });
        } finally {
            setIsPublishingExam(false);
        }
    };

    // --- PROFILE SECTION ---
    const handleRegenerateProfile = async (agentId: string) => {
        const agent = agents.find(a => a.id === agentId);
        if (!agent) return;
        setIsRegenerating(true);
        try {
            const { progress } = await fetchAcademyDataSupabase(agent.id);
            const profile = await generateTacticalProfile(agent, progress);
            if (profile) {
                const res = await updateAgentAiProfileSupabase(agent.id, profile.stats, profile.summary);
                if (res.success) {
                    showAlert({ title: "PERFIL REGENERADO", message: `✅ Perfil de ${agent.name} actualizado`, type: 'SUCCESS' });
                    if (onUpdateNeeded) onUpdateNeeded();
                } else {
                    throw new Error(res.error);
                }
            }
        } catch (err: any) {
            showAlert({ title: "ERROR", message: `❌ ${err.message}`, type: 'ERROR' });
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleBulkRegenerate = async () => {
        const agentsToProcess = agents.filter(a => !a.tacticalStats || !a.tacticalSummary);
        if (agentsToProcess.length === 0) {
            // If all have profiles, regenerate ALL
            const confirmed = window.confirm(`Todos los agentes tienen perfil. ¿Regenerar los ${agents.length} perfiles? Esto usará tokens de IA.`);
            if (!confirmed) return;
            agentsToProcess.push(...agents);
        }

        setIsBulkRegenerating(true);
        setBulkProgress({ current: 0, total: agentsToProcess.length });

        let success = 0;
        let failed = 0;

        for (let i = 0; i < agentsToProcess.length; i++) {
            const agent = agentsToProcess[i];
            setBulkProgress({ current: i + 1, total: agentsToProcess.length });
            try {
                const { progress } = await fetchAcademyDataSupabase(agent.id);
                const profile = await generateTacticalProfile(agent, progress);
                if (profile) {
                    await updateAgentAiProfileSupabase(agent.id, profile.stats, profile.summary);
                    success++;
                }
                // Delay to avoid rate limits
                await new Promise(r => setTimeout(r, 2000));
            } catch {
                failed++;
            }
        }

        setIsBulkRegenerating(false);
        showAlert({
            title: "REGENERACIÓN MASIVA COMPLETADA",
            message: `✅ ${success} perfiles regenerados, ${failed} fallidos`,
            type: failed > 0 ? 'WARNING' : 'SUCCESS'
        });
        if (onUpdateNeeded) onUpdateNeeded();
    };

    // --- REPORT SECTION ---
    const handleGenerateReport = async () => {
        setIsGeneratingReport(true);
        try {
            const report = await generateCommunityIntelReport(agents);
            setGlobalReport(report);
        } catch (err: any) {
            showAlert({ title: "ERROR", message: `❌ ${err.message}`, type: 'ERROR' });
        } finally {
            setIsGeneratingReport(false);
        }
    };

    // --- FREEFORM SECTION ---
    const handleFreeformSubmit = async () => {
        if (!freeformPrompt.trim()) return;
        setIsProcessingFreeform(true);
        setFreeformResult('');
        try {
            const result = await getGenAIResult(freeformPrompt, 'gemini-2.5-flash');
            setFreeformResult(result);
        } catch (err: any) {
            showAlert({ title: "ERROR", message: `❌ ${err.message}`, type: 'ERROR' });
        } finally {
            setIsProcessingFreeform(false);
        }
    };

    const agentsWithoutProfile = agents.filter(a => !a.tacticalStats || !a.tacticalSummary);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-white font-bebas">Centro de Comando Gemini</h2>
                    <p className="text-[9px] text-white/40 uppercase tracking-wider">Interfaz IA Directa — Modelo: gemini-2.5-flash</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-4 gap-1.5">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-center transition-all duration-300
                ${isActive
                                    ? 'bg-gradient-to-b from-purple-500/20 to-purple-900/10 border border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                                    : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]'
                                }`}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-white/30'}`} />
                            <span className={`text-[8px] font-bold uppercase tracking-wider ${isActive ? 'text-purple-300' : 'text-white/30'}`}>
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 backdrop-blur-sm"
                >
                    {/* ===== EXAM TAB ===== */}
                    {activeTab === 'EXAM' && (
                        <div className="space-y-3">
                            <p className="text-[10px] text-white/50 uppercase tracking-wider font-bold flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5" /> Generar Examen / Evaluación con IA
                            </p>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] text-white/60 hover:bg-white/10 transition-all"
                                >
                                    <Upload className="w-3.5 h-3.5" />
                                    {examImageBase64 ? '✅ IMAGEN CARGADA' : 'SUBIR IMAGEN'}
                                </button>
                                {examImageBase64 && (
                                    <button
                                        onClick={() => setExamImageBase64(null)}
                                        className="px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-[9px] text-red-400 hover:bg-red-500/20"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                id="gemini-exam-file"
                                name="gemini-exam-file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageUpload}
                            />

                            {!examImageBase64 && (
                                <textarea
                                    id="gemini-exam-text"
                                    name="gemini-exam-text"
                                    value={examInput}
                                    onChange={e => setExamInput(e.target.value)}
                                    placeholder="Pega aquí el texto del examen, test o encuesta que quieres convertir en formato digital..."
                                    className="w-full h-28 bg-black/30 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/20 resize-none focus:outline-none focus:border-purple-500/50"
                                />
                            )}

                            <button
                                onClick={handleProcessExam}
                                disabled={isProcessingExam || (!examInput && !examImageBase64)}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-600/30 to-blue-600/30 border border-purple-500/30 rounded-xl text-xs font-bold text-white uppercase tracking-wider hover:from-purple-600/50 hover:to-blue-600/50 transition-all disabled:opacity-40"
                            >
                                {isProcessingExam ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> PROCESANDO CON GEMINI...</>
                                ) : (
                                    <><Sparkles className="w-4 h-4" /> GENERAR EXAMEN</>
                                )}
                            </button>

                            {examResult && (
                                <div className="relative bg-black/40 border border-green-500/20 rounded-xl p-3 max-h-60 overflow-auto">
                                    <button
                                        onClick={handleCopyExamResult}
                                        className="absolute top-2 right-2 p-1.5 bg-white/10 rounded-lg hover:bg-white/20"
                                    >
                                        <Copy className="w-3.5 h-3.5 text-white/60" />
                                    </button>
                                    <p className="text-[9px] text-green-400 font-bold uppercase mb-2 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> RESULTADO GENERADO
                                    </p>
                                    <pre className="text-[10px] text-white/70 whitespace-pre-wrap font-mono">
                                        {JSON.stringify(examResult, null, 2).substring(0, 2000)}
                                    </pre>

                                    {/* PUBLISH TO ACADEMY BUTTON */}
                                    <button
                                        onClick={handlePublishToAcademy}
                                        disabled={isPublishingExam}
                                        className="w-full mt-3 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-green-600/30 to-emerald-600/30 border border-green-500/30 rounded-xl text-xs font-bold text-green-300 uppercase tracking-wider hover:from-green-600/50 hover:to-emerald-600/50 transition-all disabled:opacity-40"
                                    >
                                        {isPublishingExam ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> PUBLICANDO EN ACADEMIA...</>
                                        ) : (
                                            <><BookOpen className="w-4 h-4" /> APROBAR Y PUBLICAR EN ACADEMIA</>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ===== PROFILES TAB ===== */}
                    {activeTab === 'PROFILES' && (
                        <div className="space-y-3">
                            <p className="text-[10px] text-white/50 uppercase tracking-wider font-bold flex items-center gap-2">
                                <Users className="w-3.5 h-3.5" /> Regenerar Perfiles Tácticos IA
                            </p>

                            {agentsWithoutProfile.length > 0 && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                    <span className="text-[10px] text-amber-300">
                                        {agentsWithoutProfile.length} agente(s) sin perfil IA: {agentsWithoutProfile.map(a => a.name).join(', ')}
                                    </span>
                                </div>
                            )}

                            {/* Individual */}
                            <div className="flex gap-2">
                                <select
                                    id="gemini-agent-select"
                                    name="gemini-agent-select"
                                    value={selectedAgentId}
                                    onChange={e => setSelectedAgentId(e.target.value)}
                                    className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white appearance-none focus:outline-none focus:border-purple-500/50"
                                >
                                    <option value="">Seleccionar agente...</option>
                                    {agents.map(a => (
                                        <option key={a.id} value={a.id}>
                                            {a.name} {!a.tacticalStats ? '⚠️' : '✅'}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => selectedAgentId && handleRegenerateProfile(selectedAgentId)}
                                    disabled={!selectedAgentId || isRegenerating}
                                    className="px-4 py-2 bg-purple-600/20 border border-purple-500/30 rounded-xl text-[10px] font-bold text-purple-300 hover:bg-purple-600/40 transition-all disabled:opacity-40 flex items-center gap-1.5"
                                >
                                    {isRegenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                    REGENERAR
                                </button>
                            </div>

                            {/* Bulk */}
                            <button
                                onClick={handleBulkRegenerate}
                                disabled={isBulkRegenerating}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-500/20 rounded-xl text-[10px] font-bold text-amber-300 uppercase tracking-wider hover:from-amber-600/40 hover:to-orange-600/40 transition-all disabled:opacity-40"
                            >
                                {isBulkRegenerating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        REGENERANDO {bulkProgress.current}/{bulkProgress.total}...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-4 h-4" />
                                        REGENERACIÓN MASIVA ({agentsWithoutProfile.length > 0 ? `${agentsWithoutProfile.length} SIN PERFIL` : `${agents.length} TOTAL`})
                                    </>
                                )}
                            </button>

                            {isBulkRegenerating && (
                                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                                        initial={{ width: '0%' }}
                                        animate={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                                        transition={{ duration: 0.3 }}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* ===== REPORT TAB ===== */}
                    {activeTab === 'REPORT' && (
                        <div className="space-y-3">
                            <p className="text-[10px] text-white/50 uppercase tracking-wider font-bold flex items-center gap-2">
                                <Cpu className="w-3.5 h-3.5" /> Reporte Estratégico de la Fuerza
                            </p>

                            <button
                                onClick={handleGenerateReport}
                                disabled={isGeneratingReport}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-600/20 to-teal-600/20 border border-cyan-500/20 rounded-xl text-xs font-bold text-cyan-300 uppercase tracking-wider hover:from-cyan-600/40 hover:to-teal-600/40 transition-all disabled:opacity-40"
                            >
                                {isGeneratingReport ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> ANALIZANDO {agents.length} AGENTES...</>
                                ) : (
                                    <><Brain className="w-4 h-4" /> GENERAR REPORTE DE INTELIGENCIA</>
                                )}
                            </button>

                            {globalReport && (
                                <div className="bg-black/40 border border-cyan-500/15 rounded-xl p-4">
                                    <p className="text-[9px] text-cyan-400 font-bold uppercase mb-2 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> REPORTE ESTRATÉGICO
                                    </p>
                                    <div
                                        className="text-xs text-white/70 leading-relaxed prose prose-invert prose-xs max-w-none"
                                        dangerouslySetInnerHTML={{ __html: globalReport }}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* ===== FREEFORM TAB ===== */}
                    {activeTab === 'FREEFORM' && (
                        <div className="space-y-3">
                            <p className="text-[10px] text-white/50 uppercase tracking-wider font-bold flex items-center gap-2">
                                <MessageSquare className="w-3.5 h-3.5" /> Instrucción Libre a Gemini
                            </p>
                            <p className="text-[9px] text-white/30">
                                Escribe cualquier instrucción directa. Gemini responderá según tu prompt.
                            </p>

                            <textarea
                                id="gemini-freeform-input"
                                name="gemini-freeform-input"
                                value={freeformPrompt}
                                onChange={e => setFreeformPrompt(e.target.value)}
                                placeholder="Ejemplo: Genera 10 preguntas sobre el libro de Romanos con opciones múltiples y respuestas correctas..."
                                className="w-full h-28 bg-black/30 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/20 resize-none focus:outline-none focus:border-purple-500/50"
                            />

                            <button
                                onClick={handleFreeformSubmit}
                                disabled={isProcessingFreeform || !freeformPrompt.trim()}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600/30 to-violet-600/30 border border-indigo-500/30 rounded-xl text-xs font-bold text-white uppercase tracking-wider hover:from-indigo-600/50 hover:to-violet-600/50 transition-all disabled:opacity-40"
                            >
                                {isProcessingFreeform ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> GEMINI PROCESANDO...</>
                                ) : (
                                    <><Send className="w-4 h-4" /> ENVIAR A GEMINI</>
                                )}
                            </button>

                            {freeformResult && (
                                <div className="bg-black/40 border border-indigo-500/15 rounded-xl p-4 max-h-80 overflow-auto">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[9px] text-indigo-400 font-bold uppercase flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> RESPUESTA DE GEMINI
                                        </p>
                                        <button
                                            onClick={() => { navigator.clipboard.writeText(freeformResult); showAlert({ title: "COPIADO", message: "📋 Respuesta copiada", type: 'SUCCESS' }); }}
                                            className="p-1 bg-white/10 rounded-lg hover:bg-white/20"
                                        >
                                            <Copy className="w-3 h-3 text-white/50" />
                                        </button>
                                    </div>
                                    <div className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">
                                        {freeformResult}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default GeminiCommandCenter;
