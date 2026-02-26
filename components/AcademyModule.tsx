import React, { useState, useEffect, useRef } from 'react';
import { Course, Lesson, LessonProgress, UserRole, AppView, Agent } from '../types';
import { fetchAcademyData, submitQuizResult, deleteAcademyLesson, deleteAcademyCourse, resetStudentAttempts, uploadImage, saveBulkAcademyData, updateAgentAiProfile } from '../services/sheetsService';
import { fetchAgentsFromSupabase } from '../services/supabaseService';
import { BookOpen, Play, ChevronRight, CheckCircle, GraduationCap, ArrowLeft, Trophy, AlertCircle, Loader2, PlayCircle, Settings, LayoutGrid, Trash2, BrainCircuit, Info, Sparkles, Users, Search, Award, Flame, Star, Target, Image as ImageIcon } from 'lucide-react';
import { processAssessmentAI, getDeepTestAnalysis, generateCourseFinalReport } from '../services/geminiService';
import AcademyStudio from './AcademyStudio';
import TacticalCertificate from './TacticalCertificate';
import TacticalDocument from './TacticalDocument';
import { formatDriveUrl } from './DigitalIdCard';

interface AcademyModuleProps {
    userRole: UserRole;
    agentId: string;
    onActivity?: () => void;
}

const AcademyModule: React.FC<AcademyModuleProps> = ({ userRole, agentId, onActivity }) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [progress, setProgress] = useState<LessonProgress[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
    const [showStudio, setShowStudio] = useState(false);
    const [directorView, setDirectorView] = useState<'CONTENT' | 'AUDIT' | 'RANKING'>('CONTENT');
    const [allAgents, setAllAgents] = useState<Agent[]>([]);
    const [auditProgress, setAuditProgress] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [certificateData, setCertificateData] = useState<{ agentName: string, courseTitle: string, date: string } | null>(null);

    // Quiz State
    const [quizState, setQuizState] = useState<'IDLE' | 'STARTED' | 'SUBMITTING' | 'RESULT'>('IDLE');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [textAnswer, setTextAnswer] = useState<string>("");
    const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
    const [discScores, setDiscScores] = useState<{ [key: string]: number }>({ A: 0, B: 0, C: 0, D: 0 });
    const [quizResult, setQuizResult] = useState<{ isCorrect: boolean, xpAwarded: number, score: number, error?: string, profile?: string, title?: string, content?: string } | null>(null);
    const [userAnswers, setUserAnswers] = useState<any[]>([]);
    const [deepAnalysis, setDeepAnalysis] = useState<string | null>(null);
    const [isAnalyzingDeeply, setIsAnalyzingDeeply] = useState(false);
    const [isVideoWatched, setIsVideoWatched] = useState(false);
    const [uploadingCourseId, setUploadingCourseId] = useState<string | null>(null);
    const [selectedAuditCourseId, setSelectedAuditCourseId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadAcademy();
    }, [agentId]);

    // Session Heartbeat while lesson is active
    useEffect(() => {
        if (!activeLesson || !onActivity) return;

        const interval = setInterval(() => {
            onActivity();
        }, 120000); // Pulse every 2 minutes

        return () => clearInterval(interval);
    }, [activeLesson, onActivity]);

    const loadAcademy = async (isAuditFetch = false) => {
        setIsLoading(true);
        try {
            const data = await fetchAcademyData((userRole === UserRole.DIRECTOR && isAuditFetch) ? undefined : agentId);
            setCourses(data.courses || []);
            setLessons(data.lessons || []);

            // Fix: setProgress must be called even if allAgents is being loaded
            if (isAuditFetch) {
                setAuditProgress(data.progress || []);
            } else {
                setProgress(data.progress || []);
            }

            // Load all agents if missing (needed for certificates and audit)
            if (!allAgents.length) {
                const agents = await fetchAgentsFromSupabase();
                if (agents) setAllAgents(agents);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (directorView !== 'CONTENT') {
            loadAcademy(true);
        }
    }, [directorView]);

    const handleDeleteLesson = async (lessonId: string, title: string) => {
        if (!confirm(`¿Eliminar la lección "${title}"? Esta acción no se puede deshacer.`)) return;
        setIsLoading(true);
        const result = await deleteAcademyLesson(lessonId);
        if (result.success) {
            setLessons(prev => prev.filter(l => l.id !== lessonId));
            if (activeLesson?.id === lessonId) setActiveLesson(null);
        } else {
            alert(`Error: ${result.error}`);
        }
        setIsLoading(false);
    };

    const handleDeleteCourse = async (courseId: string, title: string) => {
        if (!confirm(`¿Eliminar el curso "${title}" y TODAS sus lecciones? Esta acción no se puede deshacer.`)) return;
        setIsLoading(true);
        const result = await deleteAcademyCourse(courseId);
        if (result.success) {
            setCourses(prev => prev.filter(c => c.id !== courseId));
            setLessons(prev => prev.filter(l => l.courseId !== courseId));
            setSelectedCourse(null);
        } else {
            alert(`Error: ${result.error}`);
        }
        setIsLoading(false);
    };

    const handleEditCourseImage = async (e: React.ChangeEvent<HTMLInputElement>, courseId: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingCourseId(courseId);
        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const res = await uploadImage(reader.result as string, file);
                if (res.success && res.url) {
                    const course = courses.find(c => c.id === courseId);
                    if (course) {
                        const updatedCourse = { ...course, imageUrl: res.url };
                        const updateRes = await saveBulkAcademyData({ courses: [updatedCourse], lessons: [] });
                        if (updateRes.success) {
                            setCourses(prev => prev.map(c => c.id === courseId ? updatedCourse : c));
                        } else {
                            alert("Error al actualizar metadatos del curso: " + updateRes.error);
                        }
                    }
                } else {
                    alert("Error al subir imagen: " + res.error);
                }
                setUploadingCourseId(null);
            };
            reader.readAsDataURL(file);
        } catch (err: any) {
            alert("Error: " + err.message);
            setUploadingCourseId(null);
        }
    };

    const isLessonCompleted = (lessonId: string) => progress.some(p => p.lessonId === lessonId && p.status === 'COMPLETADO');
    const hasAnyProgress = (lessonId: string) => progress.some(p => p.lessonId === lessonId);

    const isCourseCompleted = (courseId: string) => {
        const courseLessons = lessons.filter(l => l.courseId === courseId);
        if (courseLessons.length === 0) return false;
        return courseLessons.every(l => isLessonCompleted(l.id));
    };

    const handleDownloadCertificate = (course: Course) => {
        console.log("🎓 Generando certificado para:", course.title);
        const agentName = allAgents.find(a => a.id === agentId)?.name || agentId;
        setCertificateData({
            agentName,
            courseTitle: course.title,
            date: new Date().toLocaleDateString('es-VE', { timeZone: 'America/Caracas' })
        });
    };

    const handleResetAttempts = async (aId: string, courseId?: string, lessonId?: string) => {
        let confirmMsg = "";
        if (lessonId) {
            confirmMsg = `¿Estás seguro de resetear los intentos de esta LECCIÓN para el agente ${aId}?`;
        } else if (courseId) {
            confirmMsg = `¿Estás seguro de resetear los intentos de este CURSO para el agente ${aId}?`;
        } else {
            confirmMsg = `¿Estás seguro de resetear TODOS los intentos para el agente ${aId}?`;
        }

        if (!confirm(confirmMsg)) return;
        setIsLoading(true);
        try {
            const res = await resetStudentAttempts(aId, courseId, lessonId);
            if (res.success) {
                alert("Reseteo exitoso. El agente puede re-intentar las evaluaciones.");
                // Refrescar tanto la auditoría como el progreso actual (si es el mismo usuario)
                await loadAcademy(true);
                if (aId === agentId) {
                    await loadAcademy(false);
                    setQuizState('IDLE');
                    setCurrentQuestionIndex(0);
                    setQuizResult(null);
                }
            } else {
                alert("Error al resetear: " + res.error);
            }
        } catch (err: any) {
            alert("Error: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLessonSelect = (lesson: Lesson) => {
        setActiveLesson(lesson);
        setQuizState('IDLE');
        setCurrentQuestionIndex(0);
        setSelectedAnswer(null);
        setTextAnswer("");
        setCorrectAnswersCount(0);
        setDiscScores({ A: 0, B: 0, C: 0, D: 0 });
        setQuizResult(null);
        setUserAnswers([]);
        setDeepAnalysis(null);
        setIsVideoWatched(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const getLessonAttempts = (lessonId: string) => progress.find(p => p.lessonId === lessonId)?.attempts || 0;

    const handleAnswerSelect = (option: string) => {
        if (quizState === 'RESULT' || quizState === 'SUBMITTING') return;
        setSelectedAnswer(option);
    };

    const handleNextQuestion = async () => {
        if (!activeLesson) return;
        const currentQuestion = activeLesson.questions[currentQuestionIndex];

        if (currentQuestion.type === 'MULTIPLE' && !selectedAnswer) return;
        if (currentQuestion.type === 'DISC' && !selectedAnswer) return;
        if (currentQuestion.type === 'TEXT' && !textAnswer) return;

        let newCorrectCount = correctAnswersCount;
        let newDiscScores = { ...discScores };

        if (currentQuestion.type === 'MULTIPLE' || (!currentQuestion.type && currentQuestion.correctAnswer)) {
            // --- COMPARACIÓN DEFINITIVA ---
            // selectedAnswer = texto completo de la opción elegida (ej: "Dejarlo ir sin confrontarlo")
            // correctAnswer = puede ser: "B", "B.", "B. Texto", o el texto completo
            const sel = (selectedAnswer || "").trim();
            const correct = (currentQuestion.correctAnswer || "").trim();
            const correctUpper = correct.toUpperCase();

            // Obtener el índice de la opción seleccionada en el array de opciones
            const selIdx = currentQuestion.options.findIndex((o: string) => o.trim() === sel);
            const selLetter = selIdx >= 0 ? String.fromCharCode(65 + selIdx) : ""; // A, B, C, D

            // Determinar si la respuesta es correcta
            let isAnswerCorrect = false;

            // Caso 1: correctAnswer es solo una letra (A, B, C, D)
            if (/^[A-D]\.?$/i.test(correctUpper)) {
                isAnswerCorrect = selLetter === correctUpper.charAt(0);
            }
            // Caso 2: correctAnswer empieza con letra + punto (ej: "B. Texto...")
            else if (/^[A-D]\.\s/i.test(correctUpper)) {
                isAnswerCorrect = selLetter === correctUpper.charAt(0);
            }
            // Caso 3: correctAnswer es el texto completo de la opción
            else {
                isAnswerCorrect = sel.toUpperCase() === correctUpper || selLetter === correctUpper;
            }

            if (isAnswerCorrect) newCorrectCount++;
            setCorrectAnswersCount(newCorrectCount);
        } else if (currentQuestion.type === 'DISC' || currentQuestion.optionCategories) {
            let category = '';
            if (currentQuestion.optionCategories) {
                const optIdx = currentQuestion.options.findIndex(o => o === selectedAnswer);
                category = currentQuestion.optionCategories[optIdx];
            } else {
                category = selectedAnswer?.split('.')[0].trim().toUpperCase() || selectedAnswer?.trim().toUpperCase().charAt(0);
            }

            if (category && ['A', 'B', 'C', 'D'].includes(category)) {
                newDiscScores[category] = (newDiscScores[category] || 0) + 1;
                setDiscScores(newDiscScores);
            }
        }

        if (currentQuestionIndex < activeLesson.questions.length - 1) {
            setUserAnswers(prev => [...prev, { question: currentQuestion.question, answer: selectedAnswer || textAnswer }]);
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setTextAnswer("");
        } else {
            const finalAnswers = [...userAnswers, { question: currentQuestion.question, answer: selectedAnswer || textAnswer }];
            setUserAnswers(finalAnswers);
            setQuizState('SUBMITTING');

            let score = 100;
            let profile: string | undefined = undefined;
            let resultTitle: string | undefined = undefined;
            let resultContent: string | undefined = undefined;

            const isDiscType = activeLesson.questions.some(q => q.type === 'DISC');
            const hasCategories = activeLesson.questions.some(q => q.optionCategories);
            const useCategoryLogic = activeLesson.resultAlgorithm === 'HIGHEST_CATEGORY' || (isDiscType && !activeLesson.resultAlgorithm);

            if (useCategoryLogic) {
                const maxLetter = Object.entries(newDiscScores).reduce((a, b) => b[1] > a[1] ? b : a)[0];
                score = 100; // Completion score for profile tests

                if (activeLesson.resultMappings && activeLesson.resultMappings.length > 0) {
                    const mapping = activeLesson.resultMappings.find(m => m.category === maxLetter);
                    if (mapping) {
                        resultTitle = mapping.title;
                        resultContent = mapping.content;
                    }
                }

                if (!resultTitle) {
                    const profiles: { [key: string]: string } = {
                        A: 'PERFIL D - EL COMANDANTE',
                        B: 'PERFIL I - EL EMBAJADOR',
                        C: 'PERFIL S - EL GUARDIÁN',
                        D: 'PERFIL C - EL ESTRATEGA'
                    };
                    profile = profiles[maxLetter] || `Categoría ${maxLetter}`;
                    resultTitle = profile;
                    resultContent = `<p>Has sido identificado como <strong>${profile}</strong> basándose en tus respuestas tácticas.</p><p>Solicita un análisis profundo con IA para obtener tu reporte detallado.</p>`;
                }
            } else {
                // Default to SCORE_PERCENTAGE logic
                // Contar todas las preguntas que tienen respuesta correcta (MULTIPLE o sin tipo)
                const gradableQuestions = activeLesson.questions.filter(q => q.type === 'MULTIPLE' || (!q.type && q.correctAnswer) || (q.correctAnswer && q.type !== 'TEXT' && q.type !== 'DISC'));
                if (gradableQuestions.length > 0) {
                    score = (newCorrectCount / gradableQuestions.length) * 100;
                } else {
                    score = 100; // Text-only or other types default to completion
                }

                if (activeLesson.resultMappings && activeLesson.resultMappings.length > 0) {
                    const sortedMappings = [...activeLesson.resultMappings].sort((a, b) => (b.minScore || 0) - (a.minScore || 0));
                    const mapping = sortedMappings.find(m =>
                        (m.minScore === undefined || score >= m.minScore) &&
                        (m.maxScore === undefined || score <= m.maxScore)
                    );
                    if (mapping) {
                        resultTitle = mapping.title;
                        resultContent = mapping.content;
                    }
                }

                // --- FALLBACK TÁCTICO: RANGOS OFICIALES PDF ---
                if (!resultTitle) {
                    if (score >= 81) {
                        resultTitle = "RANGO: FUERZA ESPECIAL";
                        resultContent = "<strong>AMOR DE COMBATE.</strong> Entiende que la lealtad es sacrificio y verdad. Está listo para liderar a otros.";
                    } else if (score >= 51) {
                        resultTitle = "RANGO: SOLDADO";
                        resultContent = "<strong>AMOR EN PROCESO.</strong> Entiende los conceptos pero le cuesta el sacrificio. Es buen material, solo necesita práctica bajo presión.";
                    } else {
                        resultTitle = "RANGO: CIVIL";
                        resultContent = "<strong>AMOR EMOCIONAL.</strong> Tu lealtad depende de cómo te sientes ese día. Necesitas fundamentar tu identidad en Cristo urgentemente.";
                    }
                }
            }

            const result = await submitQuizResult(agentId, activeLesson.id, score);

            setQuizResult({
                isCorrect: result.isCorrect,
                xpAwarded: result.xpAwarded,
                score: score,
                error: result.success === false ? result.error : undefined,
                profile: profile,
                title: resultTitle,
                content: resultContent
            });

            if (result.isCorrect) {
                setProgress(prev => [...prev.filter(p => p.lessonId !== activeLesson.id), {
                    lessonId: activeLesson.id,
                    status: 'COMPLETADO',
                    score: score,
                    date: new Date().toISOString(),
                    attempts: getLessonAttempts(activeLesson.id) + 1
                }]);
            } else {
                setProgress(prev => [...prev.filter(p => p.lessonId !== activeLesson.id), {
                    lessonId: activeLesson.id,
                    status: 'FALLIDO',
                    score: score,
                    date: new Date().toISOString(),
                    attempts: getLessonAttempts(activeLesson.id) + 1
                }]);
            }
            setQuizState('RESULT');
        }
    };

    const handleDeepAnalysis = async () => {
        if (!activeLesson || !quizResult) return;
        setIsAnalyzingDeeply(true);
        try {
            const analysis = await getDeepTestAnalysis(
                activeLesson.title,
                userAnswers,
                quizResult.title || quizResult.profile
            );
            setDeepAnalysis(analysis);
        } catch (err) {
            console.error(err);
        } finally {
            setIsAnalyzingDeeply(false);
        }
    };

    const handleCourseFinalReport = async (course: Course) => {
        if (!course) return;
        setIsAnalyzingDeeply(true);
        try {
            const agent = allAgents.find(a => a.id === agentId);
            if (!agent) return;

            // Recopilar datos de progreso para todas las lecciones de este curso
            const courseLessons = lessons.filter(l => l.courseId === course.id);
            const courseProgress = progress.filter(p => courseLessons.some(cl => cl.id === p.lessonId));

            const detailedProgress = courseLessons.map(l => {
                const p = courseProgress.find(cp => cp.lessonId === l.id);
                return {
                    leccion: l.title,
                    intentos: p?.attempts || 0,
                    estado: p?.status || 'PENDIENTE',
                    score: p?.score || 0
                };
            });

            const report = await generateCourseFinalReport(agent, course, detailedProgress);
            if (report) {
                setDeepAnalysis(report);
                // Persistencia: Guardar en el perfil del agente
                await updateAgentAiProfile(agent.id, agent.tacticalStats || {}, report);
                alert("✅ REPORTE TÁCTICO INTEGRADO EN TU EXPEDIENTE.");
            }
        } catch (err) {
            console.error("Error al generar reporte final:", err);
            alert("❌ FALLO EN LA CONSOLIDACIÓN DE INTELIGENCIA.");
        } finally {
            setIsAnalyzingDeeply(false);
        }
    };


    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="text-[#ffb700] animate-spin" size={40} />
                <p className="text-[10px] text-[#ffb700] font-black uppercase tracking-[0.3em] font-bebas animate-pulse">Sincronizando Academia...</p>
            </div>
        );
    }

    if (!selectedCourse) {
        return (
            <div className="p-6 md:p-10 space-y-8 animate-in fade-in pb-24 max-w-5xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="text-left space-y-2">
                        <h2 className="text-2xl md:text-4xl font-bebas text-white uppercase tracking-widest leading-none">Academia Táctica</h2>
                        <p className="text-[8px] md:text-[10px] text-[#ffb700] font-black uppercase tracking-[0.3em] opacity-60 font-montserrat">Forjando la mente para el despliegue</p>
                    </div>

                    {userRole === UserRole.DIRECTOR && (
                        <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
                            <button
                                onClick={() => { setDirectorView('CONTENT'); setShowStudio(false); }}
                                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${directorView === 'CONTENT' && !showStudio ? 'bg-[#ffb700] text-[#001f3f]' : 'text-gray-500 hover:text-white'}`}
                            >
                                Contenido
                            </button>
                            <button
                                onClick={() => { setDirectorView('AUDIT'); setShowStudio(false); }}
                                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${directorView === 'AUDIT' ? 'bg-[#ffb700] text-[#001f3f]' : 'text-gray-500 hover:text-white'}`}
                            >
                                Auditoría
                            </button>
                            <div className="w-px h-4 bg-white/10 mx-2 self-center" />
                            <button
                                onClick={() => setShowStudio(!showStudio)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${showStudio ? 'bg-[#ffb700] text-[#001f3f]' : 'text-gray-500 hover:text-white'}`}
                            >
                                {showStudio ? <ArrowLeft size={12} /> : <LayoutGrid size={12} />}
                                Studio
                            </button>
                        </div>
                    )}
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                        const cId = fileInputRef.current?.getAttribute('data-course-id');
                        if (cId) handleEditCourseImage(e, cId);
                    }}
                />

                {showStudio && userRole === UserRole.DIRECTOR ? (
                    <AcademyStudio
                        onSuccess={() => { setShowStudio(false); loadAcademy(); }}
                        onCancel={() => setShowStudio(false)}
                    />
                ) : directorView === 'AUDIT' ? (
                    <div className="space-y-6 animate-in fade-in">
                        {!selectedAuditCourseId ? (
                            <>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-bebas text-white uppercase tracking-wider">Auditoría por Curso</h3>
                                    <div className="flex items-center gap-4 text-[10px] text-gray-500 font-black uppercase">
                                        <BookOpen size={16} /> {courses.length} Cursos Activos
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {courses.map(course => {
                                        const courseLessons = lessons.filter(l => l.courseId === course.id);
                                        const completions = auditProgress.filter(p => p.status === 'COMPLETADO' && courseLessons.some(cl => cl.id === p.lessonId)).length;

                                        return (
                                            <div
                                                key={course.id}
                                                onClick={() => setSelectedAuditCourseId(course.id)}
                                                className="bg-[#3A3A3A]/10 border border-white/5 rounded-3xl p-6 hover:border-[#FFB700]/30 transition-all cursor-pointer group"
                                            >
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="p-3 bg-[#ffb700]/10 rounded-2xl">
                                                        <GraduationCap className="text-[#ffb700]" size={24} />
                                                    </div>
                                                    <ChevronRight className="text-gray-600 group-hover:text-white transition-all" size={20} />
                                                </div>
                                                <h4 className="text-sm font-black text-white uppercase mb-1">{course.title}</h4>
                                                <p className="text-[8px] text-gray-500 font-bold uppercase mb-4">{courseLessons.length} Lecciones • {completions} Completadas</p>
                                                <button className="w-full py-2 bg-white/5 border border-white/10 rounded-xl text-[8px] font-black uppercase hover:bg-white/10 transition-all">
                                                    Auditar Agentes
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-4 mb-6">
                                    <button
                                        onClick={() => setSelectedAuditCourseId(null)}
                                        className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 text-white transition-all"
                                    >
                                        <ArrowLeft size={16} />
                                    </button>
                                    <div>
                                        <h3 className="text-xl font-bebas text-white uppercase tracking-wider">
                                            {courses.find(c => c.id === selectedAuditCourseId)?.title}
                                        </h3>
                                        <p className="text-[8px] text-[#ffb700] font-black uppercase tracking-widest">Auditoría Detallada de Agentes</p>
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
                                    <div className="relative w-full md:w-96">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Buscar agente por nombre o ID..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-[10px] text-white font-bold uppercase focus:border-[#ffb700]/50 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {allAgents
                                        .filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.id.includes(searchQuery))
                                        .map(agent => {
                                            const courseLessons = lessons.filter(l => l.courseId === selectedAuditCourseId);
                                            const studentProgress = auditProgress.filter(p => String(p.agentId) === String(agent.id) && courseLessons.some(cl => cl.id === p.lessonId));
                                            const completedCount = studentProgress.filter(p => p.status === 'COMPLETADO').length;
                                            const percent = courseLessons.length > 0 ? (completedCount / courseLessons.length) * 100 : 0;

                                            return (
                                                <div key={agent.id} className="bg-[#3A3A3A]/10 border border-white/5 rounded-3xl p-6 hover:border-[#FFB700]/30 transition-all group">
                                                    <div className="flex items-center gap-4 mb-4">
                                                        <img
                                                            src={formatDriveUrl(agent.photoUrl)}
                                                            className="w-12 h-12 rounded-2xl object-cover border border-white/10 grayscale group-hover:grayscale-0 transition-all"
                                                            onError={(e) => {
                                                                e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";
                                                                e.currentTarget.className = "w-12 h-12 rounded-2xl object-cover border border-white/10 opacity-20";
                                                            }}
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[10px] font-black text-white uppercase truncate">{agent.name}</p>
                                                            <p className="text-[8px] text-gray-500 font-bold uppercase">{agent.id} • {agent.rank}</p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3 mb-4">
                                                        <div className="flex justify-between text-[7px] font-black uppercase text-[#ffb700]">
                                                            <span>Progreso en Curso</span>
                                                            <span>{Math.round(percent)}%</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                            <div className="h-full bg-[#ffb700]" style={{ width: `${percent}%` }} />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                                        {courseLessons.map(lesson => {
                                                            const prog = studentProgress.find(p => p.lessonId === lesson.id);
                                                            return (
                                                                <div key={lesson.id} className="flex items-center justify-between p-3 rounded-2xl bg-black/30 border border-white/5 group/lesson">
                                                                    <div className="flex flex-col min-w-0">
                                                                        <span className="text-[9px] text-white font-black uppercase truncate tracking-wide">{lesson.title}</span>
                                                                        <span className="text-[7px] text-gray-500 font-bold uppercase">Intentos: {prog?.attempts || 0}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        {prog?.status === 'COMPLETADO' ? (
                                                                            <CheckCircle size={14} className="text-green-500" />
                                                                        ) : prog?.status === 'FALLIDO' ? (
                                                                            <AlertCircle size={14} className="text-red-500" />
                                                                        ) : (
                                                                            <div className="w-3.5 h-3.5 rounded-full border border-white/10" />
                                                                        )}
                                                                        {(prog?.status === 'COMPLETADO' || prog?.status === 'FALLIDO') && (
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); handleResetAttempts(agent.id, undefined, lesson.id); }}
                                                                                className="p-2 bg-red-500/10 hover:bg-red-500/30 text-red-500 rounded-xl transition-all"
                                                                                title="Resetear esta lección"
                                                                            >
                                                                                <Trash2 size={12} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    <div className="pt-4 border-t border-white/5 mt-4">
                                                        <button
                                                            onClick={() => handleResetAttempts(agent.id, selectedAuditCourseId!)}
                                                            className="w-full py-2 bg-white/5 border border-white/10 rounded-xl text-gray-500 text-[8px] font-black uppercase hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <Trash2 size={12} /> Resetear TODO el Curso
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.length === 0 ? (
                            <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[2.5rem]">
                                <GraduationCap className="mx-auto text-gray-800 mb-4" size={48} />
                                <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest font-bebas">No hay cursos disponibles en el servidor</p>
                            </div>
                        ) : (
                            courses.map(course => (
                                <div
                                    key={course.id}
                                    className="group relative bg-[#001f3f] border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-[#ffb700]/40 transition-all shadow-xl hover:-translate-y-1"
                                >
                                    <div onClick={() => setSelectedCourse(course)} className="cursor-pointer">
                                        <div className="h-40 bg-gray-900 relative">
                                            {course.imageUrl ? (
                                                <img src={course.imageUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-white/5">
                                                    <BookOpen size={40} className="text-gray-700" />
                                                </div>
                                            )}
                                            <div className="absolute top-4 left-4">
                                                <span className="text-[8px] font-black bg-[#ffb700] text-[#001f3f] px-3 py-1 rounded-full uppercase tracking-widest font-bebas">
                                                    {course.requiredLevel}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-6 space-y-3">
                                            <h3 className="text-lg font-bebas text-white uppercase tracking-wider">{course.title}</h3>
                                            <p className="text-[9px] text-gray-500 font-bold uppercase leading-relaxed line-clamp-2">
                                                {course.description}
                                            </p>
                                            <div className="flex flex-col gap-3 pt-2">
                                                {isCourseCompleted(course.id) && (
                                                    <div className="flex flex-col gap-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDownloadCertificate(course); }}
                                                            className="w-full py-2 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center gap-2 text-green-500 text-[8px] font-black uppercase hover:bg-green-500/20 transition-all"
                                                        >
                                                            <Trophy size={10} /> Certificado Disponible
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleCourseFinalReport(course); }}
                                                            className="w-full py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center gap-2 text-indigo-400 text-[8px] font-black uppercase hover:bg-indigo-500/20 transition-all"
                                                        >
                                                            {isAnalyzingDeeply ? <Loader2 size={10} className="animate-spin" /> : <BrainCircuit size={10} />}
                                                            Generar Reporte de Comando
                                                        </button>
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <BookOpen size={12} className="text-[#ffb700]" />
                                                        <span className="text-[8px] text-[#ffb700] font-black uppercase">
                                                            {lessons.filter(l => l.courseId === course.id).length} Lecciones
                                                        </span>
                                                    </div>
                                                    <ChevronRight size={16} className="text-gray-600 group-hover:text-white transition-all transform group-hover:translate-x-1" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {userRole === UserRole.DIRECTOR && (
                                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    fileInputRef.current?.setAttribute('data-course-id', course.id);
                                                    fileInputRef.current?.click();
                                                }}
                                                className="p-2 bg-[#ffb700]/20 hover:bg-[#ffb700]/40 border border-[#ffb700]/30 rounded-xl text-[#ffb700] transition-all"
                                                title="Cambiar Portada"
                                                disabled={uploadingCourseId === course.id}
                                            >
                                                {uploadingCourseId === course.id ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course.id, course.title); }}
                                                className="p-2 bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 rounded-xl text-red-400 transition-all"
                                                title="Eliminar Curso"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        );
    }

    const courseLessons = lessons.filter(l => l.courseId === selectedCourse.id).sort((a, b) => a.order - b.order);

    return (
        <div className="animate-in fade-in pb-24">
            <div className="bg-[#000c19]/50 border-b border-white/5 p-6 backdrop-blur-xl sticky top-0 z-20">
                <div className="max-w-5xl mx-auto flex items-center gap-4">
                    <button
                        onClick={() => { setSelectedCourse(null); setActiveLesson(null); }}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 text-white transition-all"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bebas text-white uppercase tracking-wider">{selectedCourse.title}</h2>
                        <p className="text-[7px] text-[#ffb700] font-black uppercase tracking-[0.2em]">{courseLessons.length} Unidades de Entrenamiento</p>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto p-6 md:p-10 flex flex-col lg:flex-row gap-10">
                <div className="flex-1 space-y-8">
                    {activeLesson ? (
                        <div key={activeLesson.id} className="animate-in slide-in-from-bottom-4">
                            <div className="aspect-video bg-black rounded-[2rem] border border-white/10 overflow-hidden relative shadow-2xl mb-10">
                                {activeLesson.videoUrl ? (
                                    <>
                                        <iframe
                                            id="academy-player"
                                            src={`${(() => {
                                                let url = activeLesson.videoUrl;
                                                let videoId = '';
                                                if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split(/[?#]/)[0];
                                                else if (url.includes('watch?v=')) videoId = url.split('watch?v=')[1].split(/[&?#]/)[0];
                                                else if (url.includes('embed/')) videoId = url.split('embed/')[1].split(/[?#]/)[0];
                                                if (videoId) {
                                                    let b = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0`;
                                                    if (activeLesson.startTime) b += `&start=${activeLesson.startTime}`;
                                                    if (activeLesson.endTime) b += `&end=${activeLesson.endTime}`;
                                                    return b;
                                                }
                                                return url;
                                            })()}`}
                                            className="w-full h-full"
                                            allowFullScreen
                                            onLoad={() => setTimeout(() => setIsVideoWatched(true), 3000)}
                                        ></iframe>
                                        {!isVideoWatched && (
                                            <button
                                                onClick={() => setIsVideoWatched(true)}
                                                className="absolute bottom-4 right-4 bg-black/80 hover:bg-[#ffb700] hover:text-[#001f3f] px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-white/10 transition-all z-10"
                                            >
                                                Omitir Video
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                                        <PlayCircle size={64} className="text-[#ffb700] opacity-20" />
                                        <p className="text-[10px] text-gray-600 font-bebas uppercase tracking-widest">Sin video asignado</p>
                                    </div>
                                )}
                            </div>

                            <TacticalDocument
                                title={activeLesson.title}
                                content={activeLesson.content}
                                xpReward={activeLesson.xpReward}
                                agentName={allAgents.find(a => a.id === agentId)?.name}
                                status={isLessonCompleted(activeLesson.id) ? 'COMPLETADO' : (getLessonAttempts(activeLesson.id) >= 2 ? 'FALLIDO' : 'PENDIENTE')}
                            >
                                {activeLesson.questions && activeLesson.questions.length > 0 && (
                                    <div className="space-y-10 py-6">
                                        {isLessonCompleted(activeLesson.id) && quizState !== 'RESULT' ? (
                                            <div className="py-10 text-center space-y-6">
                                                <div className="w-20 h-20 bg-green-700/10 border-green-700/30 rounded-full flex items-center justify-center mx-auto border-2">
                                                    <CheckCircle className="text-green-700" size={40} />
                                                </div>
                                                <div className="space-y-1">
                                                    <h4 className="text-xl font-bold text-black uppercase tracking-widest">REGISTRO APROBADO</h4>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                        LOS DATOS DE ESTA EVALUACIÓN YA HAN SIDO ASENTADOS EN EL REGISTRO CENTRAL.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : getLessonAttempts(activeLesson.id) >= 2 && quizState !== 'RESULT' ? (
                                            <div className="py-10 text-center space-y-6">
                                                <div className="w-20 h-20 bg-red-700/10 border-red-700/30 rounded-full flex items-center justify-center mx-auto border-2">
                                                    <AlertCircle className="text-red-700" size={40} />
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="space-y-1">
                                                        <h4 className="text-xl font-bold text-black uppercase tracking-widest">ACCESO DENEGADO</h4>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                            EXCESO DE INTENTOS FALLIDOS. EVALUACIÓN CERRADA POR SEGURIDAD.
                                                        </p>
                                                    </div>
                                                    {userRole === UserRole.DIRECTOR && (
                                                        <button
                                                            onClick={() => handleResetAttempts(agentId)}
                                                            className="px-6 py-2 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-sm hover:bg-gray-800 transition-all"
                                                        >
                                                            Resetear mis intentos (Modo Director)
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ) : quizState !== 'RESULT' ? (
                                            <div className="space-y-8">
                                                <div className="flex items-center justify-between border-b-2 border-black/5 pb-2">
                                                    <span className="text-[14px] font-black text-black uppercase tracking-widest italic">PREGUNTA {currentQuestionIndex + 1} DE {activeLesson.questions.length}</span>
                                                    <div className="text-[9px] font-bold text-gray-400">INTENTOS: {getLessonAttempts(activeLesson.id)}/2</div>
                                                </div>

                                                <div className="space-y-6">
                                                    <p className="text-[16px] font-black leading-tight text-black border-l-4 border-black pl-4">
                                                        {activeLesson.questions[currentQuestionIndex].question}
                                                    </p>

                                                    {activeLesson.questions[currentQuestionIndex].type === 'TEXT' ? (
                                                        <textarea
                                                            value={textAnswer}
                                                            onChange={(e) => setTextAnswer(e.target.value)}
                                                            placeholder="Escriba su reporte aquí..."
                                                            className="w-full h-48 bg-black/5 border-2 border-black/10 rounded-sm p-5 text-black text-[12px] font-bold uppercase outline-none focus:border-black transition-all"
                                                        />
                                                    ) : (
                                                        <div className="grid grid-cols-1 gap-4">
                                                            {activeLesson.questions[currentQuestionIndex].options.map((option, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    onClick={() => handleAnswerSelect(option)}
                                                                    className={`group flex items-center gap-4 p-5 rounded-sm border-2 text-left transition-all ${selectedAnswer === option
                                                                        ? 'bg-black text-white border-black'
                                                                        : 'bg-white text-black border-black/10 hover:border-black/30'
                                                                        }`}
                                                                >
                                                                    <span className={`w-8 h-8 flex items-center justify-center font-black text-xs border-2 ${selectedAnswer === option ? 'border-white/40' : 'border-black/20'}`}>
                                                                        {String.fromCharCode(65 + idx)}
                                                                    </span>
                                                                    <span className="text-[11px] font-bold uppercase tracking-wide">{option}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <button
                                                        onClick={handleNextQuestion}
                                                        disabled={(activeLesson.questions[currentQuestionIndex].type === 'TEXT' ? !textAnswer : !selectedAnswer) || quizState === 'SUBMITTING'}
                                                        className="w-full bg-black py-5 shadow-[5px_5px_0px_rgba(0,0,0,0.2)] text-white font-black uppercase text-[12px] tracking-[0.3em] active:translate-y-1 active:shadow-none transition-all disabled:opacity-30 disabled:pointer-events-none"
                                                    >
                                                        {quizState === 'SUBMITTING' ? <Loader2 size={16} className="animate-spin mx-auto" /> : (currentQuestionIndex < activeLesson.questions.length - 1 ? 'Siguiente Pregunta' : 'Finalizar Reporte')}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : quizResult && (
                                            <div className="space-y-8">
                                                <div className={`p-8 border-4 border-dashed rounded-sm ${quizResult.isCorrect ? 'border-green-700/50 bg-green-700/5' : 'border-red-700/50 bg-red-700/5'}`}>
                                                    <div className="flex items-center gap-6 mb-6">
                                                        {quizResult.isCorrect ? <CheckCircle className="text-green-700" size={60} /> : <AlertCircle className="text-red-700" size={60} />}
                                                        <div>
                                                            <h4 className="text-3xl font-black text-black uppercase tracking-tighter leading-none mb-1">
                                                                {quizResult.title || (quizResult.isCorrect ? 'CERTIFICADO APROBADO (CONSAGRADO)' : 'CERTIFICADO RECHAZADO')}
                                                            </h4>
                                                            <div className="text-[12px] font-bold uppercase text-gray-500">
                                                                PUNTAJE: {Math.round(quizResult.score)}% | RECOMPENSA: +{quizResult.xpAwarded} XP
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="text-[12px] font-bold uppercase leading-relaxed text-gray-800 bg-white/50 p-4 border border-black/5 rounded-sm">
                                                        {quizResult.content ? (
                                                            <div dangerouslySetInnerHTML={{ __html: quizResult.content }} />
                                                        ) : (
                                                            <p>{quizResult.isCorrect ? 'SUS APTITUDES HAN SIDO VALIDADAS. HA ALCANZADO EL GRADO DE CONSAGRADO.' : 'PUNTAJE INSUFICIENTE. SE REQUIERE REVISIÓN ADICIONAL DE LOS CONCEPTOS OPERATIVOS.'}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2 border-b-2 border-black/10 pb-1">
                                                        <Info size={14} />
                                                        <span className="text-[10px] font-black uppercase">DESGLOSE DE RESPUESTAS</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {userAnswers.map((ua, i) => (
                                                            <div key={i} className="bg-black/5 border border-black/10 p-4 rounded-sm space-y-1">
                                                                <p className="text-[10px] text-gray-500 font-bold uppercase leading-tight line-clamp-1">{i + 1}. {ua.question}</p>
                                                                <p className="text-[11px] text-black font-black uppercase">R: {ua.answer}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {userRole === UserRole.DIRECTOR && (
                                                    <div className="space-y-4 pt-6">
                                                        {/* Ocultado por solicitud de reporte consolidado al final del curso
                                                        {!deepAnalysis ? (
                                                            <button
                                                                onClick={handleDeepAnalysis}
                                                                disabled={isAnalyzingDeeply}
                                                                className="w-full flex items-center justify-center gap-3 py-4 bg-white border-2 border-black text-black font-black uppercase text-[11px] tracking-widest hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none"
                                                            >
                                                                {isAnalyzingDeeply ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={18} />}
                                                                AUDITORÍA DE INTELIGENCIA (IA)
                                                            </button>
                                                        ) : (
                                                            <div className="p-8 bg-black text-white rounded-sm space-y-6 animate-in slide-in-from-bottom-2">
                                                                <div className="flex items-center gap-3 text-[#ffb700] border-b border-white/20 pb-2">
                                                                    <Sparkles size={20} />
                                                                    <h5 className="text-xl font-black uppercase italic tracking-tighter">ANÁLISIS PROFUNDO IA</h5>
                                                                </div>
                                                                <div className="text-[12px] font-bold uppercase leading-relaxed prose prose-invert max-w-none text-gray-300" dangerouslySetInnerHTML={{ __html: deepAnalysis }} />
                                                            </div>
                                                        )}
                                                        */}
                                                    </div>
                                                )}

                                                {/* Botón Volver a Intentar (Solo si falló y quedan intentos) */}
                                                {!quizResult.isCorrect && getLessonAttempts(activeLesson.id) < 2 && (
                                                    <div className="pt-4">
                                                        <button
                                                            onClick={async () => {
                                                                // Solo reseteamos estado local para que pueda re-hacerlo
                                                                setQuizState('IDLE');
                                                                setCurrentQuestionIndex(0);
                                                                setSelectedAnswer(null);
                                                                setTextAnswer("");
                                                                setQuizResult(null);
                                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                                            }}
                                                            className="w-full py-4 bg-black text-white font-black uppercase text-[11px] tracking-widest rounded-sm hover:bg-gray-900 transition-all border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none mb-4"
                                                        >
                                                            VOLVER A INTENTAR EVALUACIÓN
                                                        </button>
                                                        <p className="text-[9px] text-gray-500 font-bold uppercase text-center tracking-widest">
                                                            PUNTAJE MÍNIMO REQUERIDO: 75%
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Botón Siguiente Lección */}
                                                {(() => {
                                                    const currentIndex = courseLessons.findIndex(l => l.id === activeLesson.id);
                                                    const nextLesson = courseLessons[currentIndex + 1];
                                                    if (nextLesson) {
                                                        return (
                                                            <div className="pt-8 mt-8 border-t-2 border-dashed border-black/10">
                                                                <button
                                                                    onClick={() => handleLessonSelect(nextLesson)}
                                                                    className="w-full py-6 bg-[#ffb700] hover:bg-[#e6a500] text-[#001f3f] font-black uppercase text-[12px] tracking-[0.4em] rounded-sm transition-all shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:-translate-y-1 active:translate-y-1 active:shadow-none flex items-center justify-center gap-4 group"
                                                                >
                                                                    CONTINUAR A LA SIGUIENTE LECCIÓN
                                                                    <ChevronRight size={20} className="group-hover:translate-x-2 transition-transform" />
                                                                </button>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </TacticalDocument>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-20 bg-white/5 rounded-[3rem] border border-white/5">
                            <div className="w-24 h-24 bg-[#ffb700]/10 rounded-full flex items-center justify-center border border-[#ffb700]/20"><Play className="text-[#ffb700]" size={40} /></div>
                            <div className="space-y-2">
                                <p className="text-xl font-bebas text-white uppercase tracking-widest">Listo para el Briefing</p>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest max-w-xs mx-auto">Selecciona una unidad de entrenamiento.</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="w-full lg:w-80 space-y-4">
                    <div className="flex items-center gap-2 px-2">
                        <GraduationCap size={16} className="text-[#ffb700]" />
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-bebas">Unidades</h4>
                    </div>
                    <div className="space-y-2">
                        {courseLessons.map((lesson, index) => (
                            <div key={lesson.id} onClick={() => handleLessonSelect(lesson)} className={`flex items-center gap-4 p-5 rounded-3xl border cursor-pointer transition-all ${activeLesson?.id === lesson.id ? 'bg-[#ffb700]/10 border-[#ffb700]/40 ring-1 ring-[#ffb700]' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${isLessonCompleted(lesson.id) ? 'bg-green-500/20 border-green-500/40 text-green-500' : 'bg-black/30 border-white/5 text-gray-600'}`}>{isLessonCompleted(lesson.id) ? <CheckCircle size={18} /> : <span className="font-bebas text-lg">0{index + 1}</span>}</div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-[10px] font-black uppercase truncate font-bebas tracking-wide ${activeLesson?.id === lesson.id ? 'text-white' : 'text-gray-400'}`}>{lesson.title}</p>
                                    <p className="text-[8px] text-gray-600 font-bold uppercase">{isLessonCompleted(lesson.id) ? 'Completado' : `+${lesson.xpReward} XP`}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-[#ffb700]/5 border border-[#ffb700]/20 rounded-[2rem] p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <Trophy className="text-[#ffb700]" size={16} />
                            <h4 className="text-[10px] font-black text-white uppercase tracking-widest font-bebas">Logros</h4>
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-[8px] font-black uppercase text-gray-500 mb-1">
                                <span>Progreso</span>
                                <span>{Math.round((progress.filter(p => courseLessons.some(cl => cl.id === p.lessonId) && p.status === 'COMPLETADO').length / courseLessons.length) * 100) || 0}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-[#ffb700] transition-all duration-1000" style={{ width: `${(progress.filter(p => courseLessons.some(cl => cl.id === p.lessonId) && p.status === 'COMPLETADO').length / courseLessons.length) * 100 || 0}%` }} />
                            </div>
                        </div>

                        {selectedCourse && isCourseCompleted(selectedCourse.id) && (
                            <button onClick={() => handleDownloadCertificate(selectedCourse)} className="w-full py-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center gap-3 text-green-500 text-[10px] font-black uppercase hover:bg-green-500/20 transition-all shadow-[0_0_20px_rgba(34,197,94,0.1)] group">
                                <Trophy size={16} className="group-hover:scale-110 transition-transform" /> Ver Certificado
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {certificateData && (
                <TacticalCertificate
                    agentName={certificateData.agentName}
                    courseTitle={certificateData.courseTitle}
                    date={certificateData.date}
                    onClose={() => setCertificateData(null)}
                />
            )}
        </div>
    );
};

export default AcademyModule;
