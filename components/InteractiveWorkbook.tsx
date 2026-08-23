import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, CheckCircle2, Save, Download, Sparkles, Star, Shield, HelpCircle, PenTool, CheckSquare, RefreshCw, Send, ArrowRight } from 'lucide-react';
import { tacticalSound } from '../utils/soundEffects';
import { supabase } from '../services/supabaseService';

export interface InteractiveSection {
    id: string;
    type: 'READING' | 'FILL_BLANK' | 'OPEN_QUESTION' | 'CHECKLIST' | 'COMMITMENT';
    title: string;
    content?: string;
    verseRef?: string;
    question?: string;
    placeholder?: string;
    options?: string[]; // Para checklist o compromisos
}

export interface WorkbookData {
    lessonId: string;
    courseTitle: string;
    lessonTitle: string;
    sections: InteractiveSection[];
}

interface InteractiveWorkbookProps {
    workbook: WorkbookData;
    agentId: string;
    agentName?: string;
    sedeName?: string;
    xpReward?: number;
    onComplete?: (answers: Record<string, any>) => void | Promise<void>;
    onClose?: () => void;
}

export const InteractiveWorkbook: React.FC<InteractiveWorkbookProps> = ({
    workbook,
    agentId,
    agentName = 'Agente',
    sedeName = 'JESÚS ES EL CENTRO',
    xpReward = 50,
    onComplete,
    onClose
}) => {
    const storageKey = `workbook_answers_${agentId}_${workbook.lessonId}`;
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [activeSectionIndex, setActiveSectionIndex] = useState(0);

    // Cargar respuestas guardadas previamente
    useEffect(() => {
        const loadSavedAnswers = async () => {
            // 1. Intentar desde LocalStorage
            try {
                const local = localStorage.getItem(storageKey);
                if (local) {
                    setAnswers(JSON.parse(local));
                }
            } catch (e) { }

            // 2. Intentar desde Supabase (asistencia_visitas)
            try {
                const { data: guideData } = await supabase
                    .from('asistencia_visitas')
                    .select('detalle')
                    .eq('agent_id', agentId)
                    .eq('tipo', 'GUIA_INTERACTIVA')
                    .order('registrado_en', { ascending: false })
                    .limit(5);

                if (guideData && guideData.length > 0) {
                    for (const row of guideData) {
                        try {
                            const parsed = JSON.parse(row.detalle);
                            if (parsed.lessonId === workbook.lessonId && parsed.answers) {
                                setAnswers(prev => ({ ...parsed.answers, ...prev }));
                                break;
                            }
                        } catch (e) { }
                    }
                }

                // 3. Verificar si ya estaba completada en academy_progress
                const { data: progData } = await supabase
                    .from('academy_progress')
                    .select('is_completed')
                    .eq('agent_id', agentId)
                    .eq('lesson_id', workbook.lessonId)
                    .maybeSingle();

                if (progData?.is_completed) {
                    setIsCompleted(true);
                }
            } catch (e) { }
        };

        loadSavedAnswers();
    }, [agentId, workbook.lessonId]);

    // Guardar respuestas
    const handleAnswerChange = (sectionId: string, value: any) => {
        const updated = { ...answers, [sectionId]: value };
        setAnswers(updated);
        try {
            localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch (e) { }
    };

    const handleSaveProgress = async (silent = false) => {
        setIsSaving(true);
        try {
            localStorage.setItem(storageKey, JSON.stringify(answers));

            // Sincronizar en Supabase en asistencia_visitas
            await supabase
                .from('asistencia_visitas')
                .insert({
                    agent_id: agentId,
                    agent_name: agentName,
                    tipo: 'GUIA_INTERACTIVA',
                    detalle: JSON.stringify({
                        lessonId: workbook.lessonId,
                        courseTitle: workbook.courseTitle,
                        lessonTitle: workbook.lessonTitle,
                        answers: answers,
                        completionPercentage: completionPercentage
                    }),
                    sede_id: 'SEDE-JESUS-ES-EL-CENTRO',
                    registrado_en: new Date().toISOString()
                });

            // Sincronizar en academy_progress
            await supabase
                .from('academy_progress')
                .upsert({
                    agent_id: agentId,
                    lesson_id: workbook.lessonId,
                    course_id: 'CURSO-AMI-01',
                    score: 100,
                    is_completed: isCompleted || completionPercentage >= 80,
                    attempts: 1,
                    completed_at: new Date().toISOString()
                }, { onConflict: 'agent_id,lesson_id' });

            if (!silent) {
                tacticalSound.playReactionPop();
            }
        } catch (e) {
            console.error('Error guardando respuestas de la guía:', e);
        } finally {
            setIsSaving(false);
        }
    };

    // Calcular progreso de llenado
    const totalFillableSections = workbook.sections.filter(s => s.type !== 'READING').length;
    const filledSectionsCount = workbook.sections.filter(s => {
        if (s.type === 'READING') return true;
        const ans = answers[s.id];
        if (!ans) return false;
        if (Array.isArray(ans)) return ans.length > 0;
        if (typeof ans === 'string') return ans.trim().length > 0;
        return true;
    }).length - (workbook.sections.length - totalFillableSections);

    const completionPercentage = totalFillableSections > 0
        ? Math.round((Math.max(0, filledSectionsCount) / totalFillableSections) * 100)
        : 100;

    const handleFinishWorkbook = async () => {
        tacticalSound.playVictoryChime();
        setIsCompleted(true);
        await handleSaveProgress(true);

        if (onComplete) {
            await onComplete(answers);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto my-6 font-montserrat animate-in fade-in duration-500">
            {/* Header del Cuaderno Táctico */}
            <div className="bg-[#001428] border-2 border-[#ffb700]/30 rounded-3xl p-6 mb-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#ffb700]/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-[#ffb700] text-[#001f3f] rounded-2xl shadow-lg font-black">
                            <BookOpen size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[8px] font-black uppercase tracking-[0.25em] text-[#ffb700] font-bebas">
                                    GUÍA TÁCTICA INTERACTIVA 100% OFICIAL
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 text-[8px] font-black font-bebas border border-blue-400/20">
                                    🏛️ {sedeName}
                                </span>
                            </div>
                            <h2 className="text-xl md:text-2xl font-black uppercase text-white font-bebas tracking-wide leading-tight mt-0.5">
                                {workbook.lessonTitle}
                            </h2>
                            <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider">
                                Módulo: {workbook.courseTitle} • Estudiante: <span className="text-white">{agentName}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        <div className="text-right">
                            <span className="text-[8px] font-black uppercase tracking-widest text-white/40 block">PROGRESO DEL CUADERNO</span>
                            <span className="text-lg font-black font-bebas text-[#ffb700]">{completionPercentage}% COMPLETADO</span>
                        </div>

                        <button
                            onClick={() => handleSaveProgress()}
                            disabled={isSaving}
                            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-black uppercase font-bebas flex items-center gap-1.5 transition-all active:scale-95"
                            title="Guardar Respuestas"
                        >
                            <Save size={14} className={isSaving ? "animate-spin" : "text-[#ffb700]"} />
                            {isSaving ? "Guardando..." : "Guardar"}
                        </button>
                    </div>
                </div>

                {/* Barra de Progreso */}
                <div className="w-full h-1.5 bg-white/5 rounded-full mt-4 overflow-hidden border border-white/5">
                    <div
                        className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full transition-all duration-500"
                        style={{ width: `${completionPercentage}%` }}
                    />
                </div>
            </div>

            {/* CUERPO DEL CUADERNO INTERACTIVO (ESTILO HOJA DE TRABAJO IMPRESA CIBER-TÁCTICA) */}
            <div className="space-y-6">
                {workbook.sections.map((section, idx) => {
                    const isAnswered = Boolean(answers[section.id] && (typeof answers[section.id] === 'string' ? answers[section.id].trim() : answers[section.id].length > 0));

                    return (
                        <motion.div
                            key={section.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.08 }}
                            className={`p-6 md:p-8 rounded-3xl border transition-all relative overflow-hidden ${
                                isAnswered
                                    ? 'bg-[#001020]/90 border-green-500/30 shadow-[0_4px_20px_rgba(34,197,94,0.05)]'
                                    : 'bg-[#000d1a]/95 border-white/10 hover:border-white/20'
                            }`}
                        >
                            {/* Número de Sección */}
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                                <div className="flex items-center gap-2.5">
                                    <span className="w-7 h-7 rounded-xl bg-[#ffb700]/10 border border-[#ffb700]/20 text-[#ffb700] font-black text-xs flex items-center justify-center font-bebas">
                                        {idx + 1}
                                    </span>
                                    <div>
                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#ffb700] font-bebas">
                                            {section.type === 'READING' ? 'FUNDAMENTO & LECTURA BÍBLICA' :
                                             section.type === 'FILL_BLANK' ? 'ESPACIO PARA COMPLETAR' :
                                             section.type === 'OPEN_QUESTION' ? 'PREGUNTA DE REFLEXIÓN ABIERTA' :
                                             section.type === 'CHECKLIST' ? 'APLICACIÓN PRÁCTICA & TAREAS' : 'COMPROMISO PERSONAL'}
                                        </span>
                                        <h3 className="text-base font-black uppercase text-white font-bebas tracking-wide leading-tight">
                                            {section.title}
                                        </h3>
                                    </div>
                                </div>

                                {isAnswered && (
                                    <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase text-green-400 font-bebas px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                                        <CheckCircle2 size={12} /> Respondido
                                    </span>
                                )}
                            </div>

                            {/* 1. SECCIÓN DE LECTURA */}
                            {section.type === 'READING' && (
                                <div className="space-y-4">
                                    {section.verseRef && (
                                        <div className="inline-block px-3 py-1 rounded-xl bg-[#ffb700]/10 border border-[#ffb700]/20 text-[#ffb700] text-[9px] font-black uppercase font-bebas">
                                            📖 Pasaje Clave: {section.verseRef}
                                        </div>
                                    )}
                                    <div
                                        className="text-sm md:text-base text-white/80 leading-relaxed font-montserrat prose prose-invert max-w-none"
                                        dangerouslySetInnerHTML={{ __html: section.content || '' }}
                                    />
                                </div>
                            )}

                            {/* 2. ESPACIO PARA COMPLETAR (FILL IN THE BLANK) */}
                            {section.type === 'FILL_BLANK' && (
                                <div className="space-y-3">
                                    <p className="text-sm text-white/90 font-bold font-montserrat">
                                        {section.question}
                                    </p>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={answers[section.id] || ''}
                                            onChange={(e) => handleAnswerChange(section.id, e.target.value)}
                                            placeholder={section.placeholder || "Escribe tu respuesta aquí para completar la guía..."}
                                            className="w-full bg-black/40 border-2 border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#ffb700] transition-all font-montserrat font-medium"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none">
                                            <PenTool size={16} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 3. PREGUNTA DE REFLEXIÓN ABIERTA (TEXTAREA IDÉNTICA AL CUADERNO) */}
                            {section.type === 'OPEN_QUESTION' && (
                                <div className="space-y-3">
                                    <p className="text-sm text-white/90 font-bold font-montserrat leading-snug">
                                        {section.question}
                                    </p>
                                    <div className="relative">
                                        <textarea
                                            rows={4}
                                            value={answers[section.id] || ''}
                                            onChange={(e) => handleAnswerChange(section.id, e.target.value)}
                                            placeholder={section.placeholder || "Escribe tus reflexiones, apuntes y respuestas con total libertad..."}
                                            className="w-full bg-black/40 border-2 border-white/10 rounded-2xl p-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#ffb700] transition-all font-montserrat font-medium resize-y leading-relaxed"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 4. CHECKLIST DE ACCIÓN */}
                            {section.type === 'CHECKLIST' && section.options && (
                                <div className="space-y-2.5">
                                    {section.question && (
                                        <p className="text-sm text-white/90 font-bold font-montserrat mb-3">
                                            {section.question}
                                        </p>
                                    )}
                                    {section.options.map((opt, optIdx) => {
                                        const selectedList: string[] = answers[section.id] || [];
                                        const isChecked = selectedList.includes(opt);

                                        return (
                                            <button
                                                key={optIdx}
                                                type="button"
                                                onClick={() => {
                                                    tacticalSound.playReactionPop();
                                                    const nextList = isChecked
                                                        ? selectedList.filter(o => o !== opt)
                                                        : [...selectedList, opt];
                                                    handleAnswerChange(section.id, nextList);
                                                }}
                                                className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
                                                    isChecked
                                                        ? 'bg-[#ffb700]/15 border-[#ffb700]/40 text-white shadow-md'
                                                        : 'bg-white/[0.02] border-white/10 text-white/70 hover:bg-white/5'
                                                }`}
                                            >
                                                <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 ${
                                                    isChecked ? 'bg-[#ffb700] border-[#ffb700] text-[#001f3f]' : 'border-white/30 bg-transparent'
                                                }`}>
                                                    {isChecked && <CheckCircle2 size={14} className="stroke-[3]" />}
                                                </div>
                                                <span className="text-xs md:text-sm font-medium font-montserrat flex-1">{opt}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* 5. COMPROMISO PERSONAL */}
                            {section.type === 'COMMITMENT' && (
                                <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border border-[#ffb700]/20 space-y-3">
                                    <div className="flex items-center gap-2 text-[#ffb700]">
                                        <Shield size={18} />
                                        <span className="text-xs font-black uppercase font-bebas tracking-wider">Declaración de Consagración</span>
                                    </div>
                                    <p className="text-sm text-white/90 italic font-montserrat">
                                        "{section.question || 'Declaro mi compromiso de poner en práctica lo aprendido en esta lección delante de Dios y de mi liderazgo.'}"
                                    </p>
                                    <input
                                        type="text"
                                        value={answers[section.id] || ''}
                                        onChange={(e) => handleAnswerChange(section.id, e.target.value)}
                                        placeholder="Escribe tu firma o compromiso personal..."
                                        className="w-full bg-black/40 border border-[#ffb700]/30 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#ffb700]"
                                    />
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Footer de Finalización del Cuaderno */}
            <div className="mt-8 p-6 bg-[#001428] border-2 border-[#ffb700]/30 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl">
                <div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-[#ffb700] font-bebas block">RECOMPENSA DE FORMACIÓN</span>
                    <h4 className="text-lg font-black uppercase text-white font-bebas leading-none mt-0.5">
                        +{xpReward} XP al Consolidar Guía
                    </h4>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl text-xs font-black uppercase font-bebas transition-all"
                        >
                            Regresar
                        </button>
                    )}

                    <button
                        onClick={handleFinishWorkbook}
                        disabled={completionPercentage < 100 && !isCompleted}
                        className="flex-1 sm:flex-none px-8 py-3.5 bg-gradient-to-r from-[#ffb700] to-yellow-500 text-[#001f3f] rounded-2xl text-xs font-black uppercase font-bebas tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_10px_30px_rgba(255,183,0,0.3)] disabled:opacity-40 disabled:scale-100 flex items-center justify-center gap-2"
                    >
                        <CheckSquare size={16} />
                        {isCompleted ? "Guía Consolidada ✅" : "Completar & Consolidar Guía"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InteractiveWorkbook;
