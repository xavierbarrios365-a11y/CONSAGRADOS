import React, { useState, useEffect } from 'react';
import { Course, Lesson, LessonProgress, UserRole, AppView, Agent } from '../types';
import { fetchAcademyData, submitQuizResult, deleteAcademyLesson, deleteAcademyCourse, resetStudentAttempts } from '../services/sheetsService';
import { BookOpen, Play, ChevronRight, CheckCircle, GraduationCap, ArrowLeft, Trophy, AlertCircle, Loader2, PlayCircle, Settings, LayoutGrid, Trash2, BrainCircuit, Info, Sparkles, Users, Search, Award, Flame, Star, Target } from 'lucide-react';
import { processAssessmentAI, getDeepTestAnalysis } from '../services/geminiService';
import { fetchAgentsFromSheets } from '../services/sheetsService';
import AcademyStudio from './AcademyStudio';
import TacticalCertificate from './TacticalCertificate';

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
    const [heartbeatActive, setHeartbeatActive] = useState(false);

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
            if (isAuditFetch) {
                setAuditProgress(data.progress || []);
                const agents = await fetchAgentsFromSheets();
                if (agents) setAllAgents(agents);
            } else {
                setProgress(data.progress || []);
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
        if (!confirm(`¿Eliminar la lección "${title}" ? Esta acción no se puede deshacer.`)) return;
        setIsLoading(true);
        const result = await deleteAcademyLesson(lessonId);
        if (result.success) {
            setLessons(prev => prev.filter(l => l.id !== lessonId));
            if (activeLesson?.id === lessonId) setActiveLesson(null);
        } else {
            alert(`Error: ${result.error} `);
        }
        setIsLoading(false);
    };

    const handleDeleteCourse = async (courseId: string, title: string) => {
        if (!confirm(`¿Eliminar el curso "${title}" y TODAS sus lecciones ? Esta acción no se puede deshacer.`)) return;
        setIsLoading(true);
        const result = await deleteAcademyCourse(courseId);
        if (result.success) {
            setCourses(prev => prev.filter(c => c.id !== courseId));
            setLessons(prev => prev.filter(l => l.courseId !== courseId));
            setSelectedCourse(null);
        } else {
            alert(`Error: ${result.error} `);
        }
        setIsLoading(false);
    };

    const isLessonCompleted = (lessonId: string) => progress.some(p => p.lessonId === lessonId && p.status === 'COMPLETADO');

    const isCourseCompleted = (courseId: string) => {
        const courseLessons = lessons.filter(l => l.courseId === courseId);
        if (courseLessons.length === 0) return false;
        return courseLessons.every(l => isLessonCompleted(l.id));
    };

    const handleDownloadCertificate = (course: Course) => {
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
                loadAcademy(true);
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

        // Logic depending on type
        let newCorrectCount = correctAnswersCount;
        let newDiscScores = { ...discScores };

        if (currentQuestion.type === 'MULTIPLE') {
            const isAnswerCorrect = selectedAnswer?.trim().toUpperCase() === currentQuestion.correctAnswer?.trim().toUpperCase();
            if (isAnswerCorrect) newCorrectCount++;
            setCorrectAnswersCount(newCorrectCount);
        } else if (currentQuestion.type === 'DISC' || currentQuestion.optionCategories) {
            // Extract category (either from optionCategories or from A, B, C, D letter)
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
            // Save answer for context
            setUserAnswers(prev => [...prev, { question: currentQuestion.question, answer: selectedAnswer || textAnswer }]);
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setTextAnswer("");
        } else {
            // Last question, submit result
            const finalAnswers = [...userAnswers, { question: currentQuestion.question, answer: selectedAnswer || textAnswer }];
            setUserAnswers(finalAnswers);
            setQuizState('SUBMITTING');

            let score = 100;
            let profile = undefined;
            let resultTitle = undefined;
            let resultContent = undefined;

            const isDiscOrCategory = activeLesson.questions.some(q => q.type === 'DISC' || q.optionCategories);

            if (isDiscOrCategory) {
                // Determine profile based on categories
                const maxLetter = Object.entries(newDiscScores).reduce((a, b) => b[1] > a[1] ? b : a)[0];

                // Check if we have resultMappings in the lesson
                if (activeLesson.resultMappings && activeLesson.resultMappings.length > 0) {
                    const mapping = activeLesson.resultMappings.find(m => m.category === maxLetter);
                    if (mapping) {
                        resultTitle = mapping.title;
                        resultContent = mapping.content;
                    }
                }

                if (!resultTitle) {
                    const profiles: { [key: string]: string } = {
                        A: 'DIRECTOR (Dominante)',
                        B: 'INFLUYENTE (Entusiasta)',
                        C: 'ESTABLE (Cooperador)',
                        D: 'ANALÍTICO (Preciso)'
                    };
                    profile = profiles[maxLetter] || `Categoría ${maxLetter} `;
                }
            } else if (activeLesson.questions.some(q => q.type === 'MULTIPLE')) {
                const multipleQuestions = activeLesson.questions.filter(q => q.type === 'MULTIPLE');
                score = (newCorrectCount / multipleQuestions.length) * 100;

                // Also check SCORE_PERCENTAGE mappings if exist
                if ((activeLesson.resultAlgorithm === 'SCORE_PERCENTAGE' || !activeLesson.resultAlgorithm) && activeLesson.resultMappings) {
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

    // 1. View: Course List
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
                            <button
                                onClick={() => { setDirectorView('RANKING'); setShowStudio(false); }}
                                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${directorView === 'RANKING' ? 'bg-[#ffb700] text-[#001f3f]' : 'text-gray-500 hover:text-white'}`}
                            >
                                Ranking
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
                                const stats = (() => {
                                    const studentProgress = auditProgress.filter(p => String(p.agentId) === String(agent.id));
                                    const completedCount = studentProgress.filter(p => p.status === 'COMPLETADO').length;
                                    const percent = lessons.length > 0 ? (completedCount / lessons.length) * 100 : 0;
                                    return { completedCount, percent };
                                })();

                                return (
                                    <div key={agent.id} className="bg-[#001833] border border-white/5 rounded-3xl p-6 flex items-center gap-4 hover:border-[#ffb700]/30 transition-all">
                                        <img src={agent.photoUrl || 'https://via.placeholder.com/100'} className="w-12 h-12 rounded-2xl object-cover border border-white/10" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-white uppercase truncate">{agent.name}</p>
                                            <p className="text-[8px] text-gray-500 font-bold uppercase">{agent.id} • {agent.rank}</p>
                                            <div className="mt-2 space-y-1">
                                                <div className="flex justify-between text-[7px] font-black uppercase text-[#ffb700]">
                                                    <span>Progreso Académico</span>
                                                    <span>{Math.round(stats.percent)}%</span>
                                                </div>
                                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                                    <div className="h-full bg-[#ffb700]" style={{ width: `${stats.percent}%` }} />
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleResetAttempts(agent.id)}
                                                className="mt-3 w-full py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[8px] font-black uppercase hover:bg-red-500/20 transition-all"
                                            >
                                                Resetear Intentos
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : directorView === 'RANKING' ? (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="bg-gradient-to-r from-[#ffb700]/10 to-transparent border border-[#ffb700]/20 rounded-[2.5rem] p-8 flex items-center gap-6">
                            <div className="w-16 h-16 bg-[#ffb700] rounded-3xl flex items-center justify-center text-[#001f3f] shadow-[0_0_30px_rgba(255,183,0,0.3)]">
                                <Trophy size={32} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bebas text-white uppercase tracking-widest">Cuadro de Honor Académico</h3>
                                <p className="text-[9px] text-[#ffb700] font-black uppercase tracking-widest opacity-60">Elite de entrenamiento en operaciones tácticas</p>
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/5 rounded-[2.5rem] overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-black/20 border-b border-white/5">
                                    <tr>
                                        <th className="px-8 py-5 text-[9px] font-black text-gray-500 uppercase">Posición</th>
                                        <th className="px-8 py-5 text-[9px] font-black text-gray-500 uppercase">Agente</th>
                                        <th className="px-8 py-5 text-[9px] font-black text-gray-500 uppercase text-center">Unidades</th>
                                        <th className="px-8 py-5 text-[9px] font-black text-gray-500 uppercase text-center">Precisión</th>
                                        <th className="px-8 py-5 text-[9px] font-black text-gray-500 uppercase text-right">Efectividad</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {allAgents.map(agent => {
                                        const studentProgress = auditProgress.filter(p => String(p.agentId) === String(agent.id));
                                        const completed = studentProgress.filter(p => p.status === 'COMPLETADO');
                                        const percent = lessons.length > 0 ? (completed.length / lessons.length) * 100 : 0;
                                        const totalScore = completed.reduce((acc, p) => acc + (p.score || 0), 0);
                                        const accuracy = completed.length > 0 ? totalScore / completed.length : 0;
                                        return { ...agent, percent, accuracy, completedCount: completed.length };
                                    }).sort((a, b) => b.percent - a.percent || b.accuracy - a.accuracy).map((agent, idx) => (
                                        <tr key={agent.id} className="hover:bg-white/5 transition-all group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bebas text-lg ${idx === 0 ? 'bg-[#ffb700] text-[#001f3f]' : idx === 1 ? 'bg-gray-400 text-[#001f3f]' : idx === 2 ? 'bg-orange-800 text-white' : 'bg-white/5 text-gray-500'}`}>
                                                        {idx + 1}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <img src={agent.photoUrl || 'https://via.placeholder.com/100'} className="w-10 h-10 rounded-xl object-cover" />
                                                    <div>
                                                        <p className="text-[10px] font-black text-white uppercase">{agent.name}</p>
                                                        <p className="text-[8px] text-gray-600 font-bold uppercase">{agent.rank}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <span className="text-[10px] font-black text-white font-bebas">{agent.completedCount}/{lessons.length}</span>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <div className="flex items-center justify-center gap-1 text-[10px] font-black text-[#ffb700] font-bebas">
                                                    <Target size={12} />
                                                    {Math.round(agent.accuracy)}%
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="inline-block px-4 py-2 rounded-xl bg-[#ffb700]/10 border border-[#ffb700]/20 text-[#ffb700] text-[10px] font-black font-bebas">
                                                    {Math.round(agent.percent)}% COMPLETO
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
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
                                    className="group relative bg-[#001833] border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-[#ffb700]/40 transition-all shadow-xl hover:-translate-y-1"
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

    // 2. View: Lesson List or Active Lesson
    const courseLessons = lessons.filter(l => l.courseId === selectedCourse.id).sort((a, b) => a.order - b.order);

    return (
        <div className="animate-in fade-in pb-24">
            {/* Header with Back Button */}
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
                {/* Main Content Area */}
                <div className="flex-1 space-y-8">
                    {activeLesson ? (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4">
                            {/* Video Player Placeholder / YouTube */}
                            <div className="aspect-video bg-black rounded-[2rem] border border-white/10 overflow-hidden relative shadow-2xl">
                                {activeLesson.videoUrl ? (
                                    <>
                                        <iframe
                                            id="academy-player"
                                            src={`${(() => {
                                                let url = activeLesson.videoUrl;
                                                let videoId = '';
                                                if (url.includes('youtu.be/')) {
                                                    videoId = url.split('youtu.be/')[1].split(/[?#]/)[0];
                                                } else if (url.includes('watch?v=')) {
                                                    videoId = url.split('watch?v=')[1].split(/[&?#]/)[0];
                                                } else if (url.includes('embed/')) {
                                                    videoId = url.split('embed/')[1].split(/[?#]/)[0];
                                                }

                                                if (videoId) {
                                                    let baseUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0`;
                                                    if (activeLesson.startTime) baseUrl += `&start=${activeLesson.startTime}`;
                                                    if (activeLesson.endTime) baseUrl += `&end=${activeLesson.endTime}`;
                                                    return baseUrl;
                                                }
                                                return url;
                                            })()
                                                } `}
                                            className="w-full h-full"
                                            allowFullScreen
                                            onLoad={() => {
                                                // Reducido a 3 segundos para mejor UX
                                                setTimeout(() => setIsVideoWatched(true), 3000);
                                            }}
                                        ></iframe>
                                        {!isVideoWatched && (
                                            <button
                                                onClick={() => setIsVideoWatched(true)}
                                                className="absolute bottom-4 right-4 bg-black/80 hover:bg-[#ffb700] hover:text-[#001f3f] px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-white/10 transition-all z-10"
                                            >
                                                Omitir Video y Comenzar Test
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

                            {/* Lesson Text */}
                            <div className="space-y-4">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <h3 className="text-2xl font-bebas text-white uppercase tracking-wider">{activeLesson.title}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-[#ffb700] font-black uppercase font-bebas">+{activeLesson.xpReward} XP</span>
                                        {isLessonCompleted(activeLesson.id) && (
                                            <span className="bg-green-500/10 text-green-500 text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-green-500/20">Completado</span>
                                        )}
                                    </div>
                                </div>
                                <div
                                    className="text-[11px] md:text-xs text-gray-400 font-bold uppercase leading-relaxed font-montserrat whitespace-pre-wrap"
                                    dangerouslySetInnerHTML={{ __html: activeLesson.content }}
                                />
                            </div>

                            {/* Quiz Engine */}
                            {activeLesson.questions && activeLesson.questions.length > 0 && (
                                <div className="bg-[#001833] border border-[#ffb700]/20 rounded-[2.5rem] p-8 space-y-6 shadow-[0_20px_40px_rgba(0,0,0,0.3)]">
                                    {isLessonCompleted(activeLesson.id) ? (
                                        <div className="py-10 text-center space-y-6 animate-in zoom-in-95">
                                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto border border-green-500/30">
                                                <CheckCircle className="text-green-500" size={40} />
                                            </div>
                                            <div className="space-y-2">
                                                <h4 className="text-2xl font-bebas text-white uppercase tracking-widest">Lección Completada</h4>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest max-w-xs mx-auto">
                                                    Has superado esta unidad de entrenamiento. El acceso al test ha sido bloqueado para preservar la integridad de tu registro táctico.
                                                </p>
                                            </div>
                                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 inline-block">
                                                <p className="text-[8px] text-[#ffb700] font-black uppercase tracking-widest">Puntaje Registrado: {Math.round(progress.find(p => p.lessonId === activeLesson.id)?.score || 0)}%</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <GraduationCap className="text-[#ffb700]" size={20} />
                                                    <h4 className="text-sm font-bebas text-white uppercase tracking-widest">Desafío Táctico</h4>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[8px] text-gray-500 font-bold uppercase">Intentos: {getLessonAttempts(activeLesson.id)}/2</div>
                                                    {quizState !== 'RESULT' && (
                                                        <span className="text-[10px] text-gray-500 font-bebas">PREGUNTA {currentQuestionIndex + 1} DE {activeLesson.questions.length}</span>
                                                    )}
                                                </div>
                                            </div>

                                            {(!isVideoWatched && activeLesson.videoUrl) && quizState !== 'RESULT' ? (
                                                <div className="py-10 text-center space-y-4">
                                                    <PlayCircle size={40} className="mx-auto text-[#ffb700] animate-pulse" />
                                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest font-bebas">Debes ver el video de entrenamiento antes de iniciar el quiz</p>
                                                </div>
                                            ) : quizState !== 'RESULT' ? (
                                                <>
                                                    <p className="text-sm font-bold text-white font-montserrat uppercase leading-relaxed">
                                                        {activeLesson.questions[currentQuestionIndex].question}
                                                    </p>

                                                    {activeLesson.questions[currentQuestionIndex].type === 'TEXT' ? (
                                                        <textarea
                                                            value={textAnswer}
                                                            onChange={(e) => setTextAnswer(e.target.value)}
                                                            placeholder="Escribe tu reporte táctico aquí..."
                                                            className="w-full h-40 bg-white/5 border border-white/10 rounded-2xl p-5 text-white text-[11px] font-bold uppercase tracking-wider focus:border-[#ffb700]/50 outline-none transition-all font-montserrat"
                                                        />
                                                    ) : (
                                                        <div className="grid grid-cols-1 gap-3">
                                                            {activeLesson.questions[currentQuestionIndex].options.map((option, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    onClick={() => handleAnswerSelect(option)}
                                                                    className={`p-5 rounded-2xl text-left text-[10px] font-black uppercase tracking-widest transition-all border ${selectedAnswer === option
                                                                        ? 'bg-[#ffb700] text-[#001f3f] border-[#ffb700]'
                                                                        : 'bg-white/5 text-gray-400 border-white/5 hover:border-white/20'
                                                                        } font-bebas`}
                                                                >
                                                                    {option}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <button
                                                        onClick={handleNextQuestion}
                                                        disabled={(activeLesson.questions[currentQuestionIndex].type === 'TEXT' ? !textAnswer : !selectedAnswer) || quizState === 'SUBMITTING'}
                                                        className="w-full bg-[#ffb700] py-5 rounded-2xl text-[#001f3f] font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 font-bebas"
                                                    >
                                                        {quizState === 'SUBMITTING' ? (
                                                            <div className="flex items-center justify-center gap-2">
                                                                <Loader2 size={16} className="animate-spin" />
                                                                <span>Verificando...</span>
                                                            </div>
                                                        ) : (
                                                            <span>{currentQuestionIndex < activeLesson.questions.length - 1 ? 'Siguiente Pregunta' : 'Finalizar Evaluación'}</span>
                                                        )}
                                                    </button>
                                                </>
                                            ) : quizResult && (
                                                <div className="space-y-6 animate-in zoom-in-95">
                                                    <div className={`p-6 rounded-2xl border flex items-center gap-4 ${quizResult.isCorrect ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-red-500/20 border-red-500/30 text-red-400'
                                                        }`}>
                                                        {quizResult.isCorrect ? <Trophy size={48} /> : <AlertCircle size={48} />}
                                                        <div>
                                                            <p className="font-bebas text-2xl uppercase leading-none">{quizResult.title || (quizResult.isCorrect ? '¡Misión Cumplida!' : 'Evaluación Fallida')}</p>
                                                            <div className="text-[10px] font-bold uppercase mt-1 space-y-2">
                                                                {quizResult.content ? (
                                                                    <div className="text-white bg-black/20 p-4 rounded-xl border border-white/5 whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: quizResult.content }} />
                                                                ) : quizResult.profile ? (
                                                                    <div className="space-y-4 w-full">
                                                                        <p className="text-white text-[12px] font-bold">Resumen de Perfil: <span className="text-[#ffb700]">{quizResult.profile}</span></p>
                                                                        <div className="grid grid-cols-4 gap-2">
                                                                            {Object.entries(discScores).map(([category, count]) => (
                                                                                <div key={category} className="bg-black/40 border border-white/10 rounded-xl p-3 text-center">
                                                                                    <p className="text-[14px] font-bebas text-[#ffb700]">{category}</p>
                                                                                    <p className="text-[10px] font-black text-white">{count}</p>
                                                                                    <div className="h-1 w-full bg-white/5 rounded-full mt-2 overflow-hidden">
                                                                                        <div
                                                                                            className="h-full bg-[#ffb700]"
                                                                                            style={{ width: `${(count / (activeLesson?.questions.length || 1)) * 100}%` }}
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                        <p className="text-[8px] text-gray-500 uppercase font-black italic">Reporte táctico guardado. Solicita el análisis de IA para obtener el desglose profundo.</p>
                                                                    </div>
                                                                ) : (
                                                                    quizResult.error ? <p>{quizResult.error}</p> : (
                                                                        <div className="space-y-1">
                                                                            <p>
                                                                                {quizResult.isCorrect
                                                                                    ? `Has aprobado con ${Math.round(quizResult.score)}%. Has ganado +${quizResult.xpAwarded} XP Tácticos.`
                                                                                    : `Puntaje: ${Math.round(quizResult.score)}%. Se requiere 100% para aprobar. Intentos restantes: ${2 - getLessonAttempts(activeLesson?.id || '')}`
                                                                                }
                                                                            </p>
                                                                            {activeLesson?.questions.some(q => q.type === 'DISC') && (
                                                                                <div className="grid grid-cols-4 gap-2 mt-4">
                                                                                    {Object.entries(discScores).map(([category, count]) => (
                                                                                        <div key={category} className="bg-black/40 border border-white/10 rounded-xl p-2 text-center">
                                                                                            <p className="text-[12px] font-bebas text-[#ffb700]">{category}: {count}</p>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* AI Analysis Section */}
                                                    <div className="space-y-4">
                                                        {!deepAnalysis ? (
                                                            <button
                                                                onClick={handleDeepAnalysis}
                                                                disabled={isAnalyzingDeeply}
                                                                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-gradient-to-r from-[#ffb700]/10 to-transparent border border-[#ffb700]/30 text-[#ffb700] font-black uppercase text-[10px] tracking-widest hover:bg-[#ffb700]/20 transition-all group"
                                                            >
                                                                {isAnalyzingDeeply ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={18} className="group-hover:scale-110 transition-transform" />}
                                                                {isAnalyzingDeeply ? 'Extrayendo Inteligencia Profunda...' : 'Solicitar Análisis de Perfil con IA'}
                                                            </button>
                                                        ) : (
                                                            <div className="p-6 bg-[#001f3f] border border-[#ffb700]/30 rounded-3xl space-y-4 animate-in fade-in slide-in-from-bottom-4 shadow-inner">
                                                                <div className="flex items-center gap-2 text-[#ffb700]">
                                                                    <Sparkles size={16} />
                                                                    <span className="text-[10px] font-black uppercase tracking-widest">Reporte de Inteligencia Táctica (AI)</span>
                                                                </div>
                                                                <div
                                                                    className="text-[11px] text-gray-300 font-bold uppercase leading-relaxed font-montserrat prose prose-invert max-w-none"
                                                                    dangerouslySetInnerHTML={{ __html: deepAnalysis }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {!quizResult.isCorrect && getLessonAttempts(activeLesson.id) < 2 && (
                                                        <button
                                                            onClick={() => handleLessonSelect(activeLesson)}
                                                            className="w-full bg-white/5 border border-white/10 py-5 rounded-2xl text-white font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all font-bebas"
                                                        >
                                                            Reintentar Desafío
                                                        </button>
                                                    )}

                                                    {getLessonAttempts(activeLesson.id) >= 2 && !quizResult.isCorrect && (
                                                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                                                            <p className="text-[9px] text-red-400 font-black uppercase tracking-widest font-bebas">Acceso Bloqueado. Contacta a un Director.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-20 bg-white/5 rounded-[3rem] border border-white/5">
                            <div className="w-24 h-24 bg-[#ffb700]/10 rounded-full flex items-center justify-center border border-[#ffb700]/20">
                                <Play className="text-[#ffb700]" size={40} />
                            </div>
                            <div className="space-y-2">
                                <p className="text-xl font-bebas text-white uppercase tracking-widest">Listo para el Briefing</p>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest max-w-xs mx-auto">Selecciona una unidad de entrenamiento en el panel lateral para comenzar.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Lesson Selector */}
                <div className="w-full lg:w-80 space-y-4">
                    <div className="flex items-center gap-2 px-2">
                        <GraduationCap size={16} className="text-[#ffb700]" />
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-bebas">Unidades de Despliegue</h4>
                    </div>

                    <div className="space-y-2">
                        {courseLessons.map((lesson, index) => (
                            <div
                                key={lesson.id}
                                className={`group/lesson flex items-center gap-4 p-5 rounded-3xl border cursor-pointer transition-all ${activeLesson?.id === lesson.id
                                    ? 'bg-[#ffb700]/10 border-[#ffb700]/40 ring-1 ring-[#ffb700]'
                                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                                    }`}
                            >
                                <div onClick={() => handleLessonSelect(lesson)} className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${isLessonCompleted(lesson.id)
                                        ? 'bg-green-500/20 border-green-500/40 text-green-500'
                                        : 'bg-black/30 border-white/5 text-gray-600'
                                        }`}>
                                        {isLessonCompleted(lesson.id) ? <CheckCircle size={18} /> : <span className="font-bebas text-lg">0{index + 1}</span>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-[10px] font-black uppercase truncate font-bebas tracking-wide ${activeLesson?.id === lesson.id ? 'text-white' : 'text-gray-400'}`}>
                                            {lesson.title}
                                        </p>
                                        <p className="text-[8px] text-gray-600 font-bold uppercase">
                                            {isLessonCompleted(lesson.id) ? 'Status: Completado' : `Recompensa: +${lesson.xpReward} XP`}
                                        </p>
                                    </div>
                                </div>
                                {userRole === UserRole.DIRECTOR && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteLesson(lesson.id, lesson.title); }}
                                        className="p-2 bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 rounded-xl text-red-400 transition-all opacity-0 group-hover/lesson:opacity-100 shrink-0"
                                        title="Eliminar Lección"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="bg-[#ffb700]/5 border border-[#ffb700]/20 rounded-3xl p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <Trophy className="text-[#ffb700]" size={16} />
                            <h4 className="text-[10px] font-black text-white uppercase tracking-widest font-bebas">Logros del Curso</h4>
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-[8px] font-black uppercase text-gray-500 mb-1">
                                <span>Progreso</span>
                                <span>{Math.round((progress.filter(p => courseLessons.some(cl => cl.id === p.lessonId) && p.status === 'COMPLETADO').length / courseLessons.length) * 100) || 0}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[#ffb700] transition-all duration-1000"
                                    style={{ width: `${(progress.filter(p => courseLessons.some(cl => cl.id === p.lessonId) && p.status === 'COMPLETADO').length / courseLessons.length) * 100 || 0}% ` }}
                                />
                            </div>
                        </div>
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
