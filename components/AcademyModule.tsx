import React, { useState, useEffect } from 'react';
import { Course, Lesson, LessonProgress, UserRole, AppView, Agent } from '../types';
import { fetchAcademyData, submitQuizResult, deleteAcademyLesson, deleteAcademyCourse, resetStudentAttempts } from '../services/sheetsService';
import { BookOpen, Play, ChevronRight, CheckCircle, GraduationCap, ArrowLeft, Trophy, AlertCircle, Loader2, PlayCircle, Settings, LayoutGrid, Trash2, BrainCircuit, Info, Sparkles, Users, Search, Award, Flame, Star, Target } from 'lucide-react';
import { processAssessmentAI, getDeepTestAnalysis } from '../services/geminiService';
import { fetchAgentsFromSheets } from '../services/sheetsService';
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
                const agents = await fetchAgentsFromSheets();
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

    const handleResetAttempts = async (aId: string) => {
        if (!confirm(`¿Estás seguro de resetear los intentos para el agente ${aId}?`)) return;
        setIsLoading(true);
        try {
            const res = await resetStudentAttempts(aId);
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

                {showStudio && userRole === UserRole.DIRECTOR ? (
                    <AcademyStudio
                        onSuccess={() => { setShowStudio(false); loadAcademy(); }}
                        onCancel={() => setShowStudio(false)}
                    />
                ) : directorView === 'AUDIT' ? (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
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
                            <div className="flex items-center gap-4 text-[10px] text-gray-500 font-black uppercase">
                                <Users size={16} /> {allAgents.length} Agentes Registrados
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {allAgents.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.id.includes(searchQuery)).map(agent => {
                                const studentProgress = auditProgress.filter(p => String(p.agentId) === String(agent.id));
                                const completedLessonIds = studentProgress.filter(p => p.status === 'COMPLETADO').map((p: any) => p.lessonId);
                                const completedCount = completedLessonIds.length;
                                const percent = lessons.length > 0 ? (completedCount / lessons.length) * 100 : 0;

                                // Per-course completion
                                const courseStats = courses.map(course => {
                                    const courseLessons = lessons.filter(l => l.courseId === course.id);
                                    const completedInCourse = courseLessons.filter(l => completedLessonIds.includes(l.id)).length;
                                    const isComplete = courseLessons.length > 0 && completedInCourse === courseLessons.length;
                                    return { courseId: course.id, title: course.title, isComplete, completedInCourse, total: courseLessons.length };
                                });

                                return (
                                    <div key={agent.id} className="bg-[#3A3A3A]/10 border border-white/5 rounded-3xl p-6 hover:border-[#FFB700]/30 transition-all group">
                                        <div className="flex items-center gap-4 mb-3">
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
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[7px] font-black uppercase text-[#ffb700]">
                                                <span>Progreso General</span>
                                                <span>{Math.round(percent)}%</span>
                                            </div>
                                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-[#ffb700]" style={{ width: `${percent}%` }} />
                                            </div>
                                        </div>
                                        {/* Per-course detail */}
                                        {courseStats.length > 0 && (
                                            <div className="mt-3 space-y-1.5 border-t border-white/5 pt-3">
                                                {courseStats.map(cs => (
                                                    <div key={cs.courseId} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[8px] font-black uppercase ${cs.isComplete ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-gray-500'}`}>
                                                        {cs.isComplete ? <CheckCircle size={10} className="text-green-500 shrink-0" /> : <AlertCircle size={10} className="text-gray-600 shrink-0" />}
                                                        <span className="truncate flex-1">{cs.title}</span>
                                                        <span className="shrink-0">{cs.completedInCourse} de {cs.total}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <button
                                            onClick={() => handleResetAttempts(agent.id)}
                                            className="mt-3 w-full py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[8px] font-black uppercase hover:bg-red-500/20 transition-all"
                                        >
                                            Resetear Intentos
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
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
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDownloadCertificate(course); }}
                                                        className="w-full py-2 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center gap-2 text-green-500 text-[8px] font-black uppercase hover:bg-green-500/20 transition-all"
                                                    >
                                                        <Trophy size={10} /> Certificado Disponible
                                                    </button>
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
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course.id, course.title); }}
                                            className="absolute top-4 right-4 p-2 bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 rounded-xl text-red-400 transition-all opacity-0 group-hover:opacity-100"
                                            title="Eliminar Curso"
                                        >
                                            <Trash2 size={14} />
                                        </button>
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
                        <div className="animate-in slide-in-from-bottom-4">
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
                                                                {quizResult.title || (quizResult.isCorrect ? 'APROBADO' : 'FALLIDO')}
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
                                                            <p>{quizResult.isCorrect ? 'SE HAN VALIDADOS SUS APTITUDES PARA ESTA UNIDAD.' : 'SE REQUIERE REVISIÓN ADICIONAL DE LOS CONCEPTOS OPERATIVOS.'}</p>
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
                                                    </div>
                                                )}
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
