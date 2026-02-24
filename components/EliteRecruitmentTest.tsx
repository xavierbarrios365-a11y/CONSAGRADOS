import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Target, Zap, Brain, ChevronRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface Question {
    id: string;
    type: 'DISC' | 'SITUATIONAL';
    text: string;
    options: {
        id: string;
        text: string;
        value: string; // Para DISC: D, I, S, C. Para SITUATIONAL: peso o categoría.
    }[];
}

const QUESTIONS: Question[] = [
    {
        id: 'liderazgo_avanzado_1',
        type: 'SITUATIONAL',
        text: 'GESTIÓN DE CRISIS: Un fallo en el protocolo de un subordinado compromete la seguridad de la misión. ¿Cuál es su primera acción?',
        options: [
            { id: 'la1_a', text: 'Asumir la responsabilidad total y rectificar el error personalmente.', value: 'D' },
            { id: 'la1_b', text: 'Reunir al equipo para analizar el fallo y delegar la solución.', value: 'I' },
            { id: 'la1_c', text: 'Seguir estrictamente el manual de contingencia sin desviaciones.', value: 'C' },
            { id: 'la1_d', text: 'Proteger la moral del grupo antes de buscar culpables.', value: 'S' }
        ]
    },
    {
        id: 'etica_tactica_1',
        type: 'SITUATIONAL',
        text: 'ÉTICA DE MANDO: Se le sugiere omitir un reporte de falla menor para asegurar el éxito de una promoción regional. ¿Su postura?',
        options: [
            { id: 'et1_a', text: 'La integridad es absoluta; el reporte se envía íntegro.', value: 'C' },
            { id: 'et1_b', text: 'Evalúo si el beneficio del equipo justifica la omisión.', value: 'D' },
            { id: 'et1_c', text: 'Busco una tercera vía que no comprometa la promoción.', value: 'I' },
            { id: 'et1_d', text: 'Consulto con mi superior inmediato para compartir el peso de la decisión.', value: 'S' }
        ]
    },
    {
        id: 'vision_2026_1',
        type: 'SITUATIONAL',
        text: 'DESPLIEGUE ESTRATÉGICO: Identifica un talento crítico en un agente que muestra desinterés por el proyecto. ¿Cómo actúa?',
        options: [
            { id: 'v2026_a', text: 'Asignarle una misión de alto impacto que active su sentido de propósito.', value: 'D' },
            { id: 'v2026_b', text: 'Entablar una relación cercana para entender sus barreras personales.', value: 'I' },
            { id: 'v2026_c', text: 'Mantenerlo en tareas estándar hasta que demuestre compromiso.', value: 'S' },
            { id: 'v2026_d', text: 'Aplicar el reglamento de rendimiento de forma estricta.', value: 'C' }
        ]
    },
    {
        id: 'psicometria_disc_1',
        type: 'DISC',
        text: 'REGLA DE VIDA: Ante un nuevo desafío tecnológico o espiritual, mi tendencia es:',
        options: [
            { id: 'd1_a', text: 'Dominar la materia lo antes posible para liderar el cambio.', value: 'D' },
            { id: 'd1_b', text: 'Inspirar a otros para que lo exploremos juntos.', value: 'I' },
            { id: 'd1_c', text: 'Analizar cada detalle y raíz bíblica antes de proceder.', value: 'C' },
            { id: 'd1_d', text: 'Asegurarme de que el cambio no altere la paz del equipo.', value: 'S' }
        ]
    },
    {
        id: 'resiliencia_1',
        type: 'SITUATIONAL',
        text: 'RECONSTRUCCIÓN DE MORAL: Tras un fracaso operativo evidente, el equipo está desmotivado. ¿Cómo inicia el lunes?',
        options: [
            { id: 'r1_a', text: 'Con un discurso de victoria futura y metas agresivas.', value: 'D' },
            { id: 'r1_b', text: 'Con una jornada de convivencia para sanar heridas.', value: 'I' },
            { id: 'r1_c', text: 'Con un análisis técnico de errores para que no se repitan.', value: 'C' },
            { id: 'r1_d', text: 'Con un tiempo de oración y escucha activa.', value: 'S' }
        ]
    }
];

interface EliteRecruitmentTestProps {
    onComplete: (results: any, awardedXp: number) => Promise<void>;
    agentName: string;
}

const EliteRecruitmentTest: React.FC<EliteRecruitmentTestProps> = ({ onComplete, agentName }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFinished, setIsFinished] = useState(false);

    const XP_PER_QUESTION = 5;

    const handleSelect = (questionId: string, value: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
        if (currentStep < QUESTIONS.length - 1) {
            setTimeout(() => setCurrentStep(prev => prev + 1), 300);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const awardedXp = Object.keys(answers).length * XP_PER_QUESTION;
            await onComplete(answers, awardedXp);
            setIsFinished(true);
        } catch (err) {
            console.error("Error submitting test:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const progress = ((currentStep + 1) / QUESTIONS.length) * 100;

    if (isFinished) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                    <CheckCircle2 className="text-green-500" size={40} />
                </div>
                <div className="space-y-2">
                    <h3 className="text-2xl font-bebas text-white uppercase tracking-widest">EVALUACIÓN COMPLETADA</h3>
                    <p className="text-[10px] text-white/50 font-montserrat uppercase tracking-[0.2em] max-w-xs mx-auto">
                        Tus respuestas han sido enviadas al Núcleo de Inteligencia para el re-perfilado táctico.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-xl mx-auto bg-[#001f3f]/80 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-[#ffb700]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                />
            </div>

            <div className="p-8 space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#ffb700]/10 rounded-xl border border-[#ffb700]/20">
                            <Brain className="text-[#ffb700]" size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] text-[#ffb700] font-black uppercase tracking-[0.3em] font-bebas">Protocolo de Evaluación</p>
                            <h4 className="text-white font-black text-lg uppercase tracking-widest font-bebas">Agente: {agentName}</h4>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[14px] font-bebas text-white/40">{currentStep + 1} / {QUESTIONS.length}</span>
                    </div>
                </div>

                {/* Question */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="space-y-2">
                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${QUESTIONS[currentStep].type === 'DISC' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-orange-500/10 border-orange-500/30 text-orange-400'}`}>
                                {QUESTIONS[currentStep].type === 'DISC' ? 'PERFIL DINÁMICO' : 'CASO SITUACIONAL'}
                            </span>
                            <h3 className="text-xl font-bold text-white font-montserrat leading-tight">
                                {QUESTIONS[currentStep].text}
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {QUESTIONS[currentStep].options.map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => handleSelect(QUESTIONS[currentStep].id, opt.value)}
                                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left group ${answers[QUESTIONS[currentStep].id] === opt.value ? 'bg-[#ffb700] border-transparent scale-[1.02] shadow-[0_0_20px_rgba(255,183,0,0.2)]' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                >
                                    <span className={`text-[12px] font-bold uppercase tracking-wide leading-tight ${answers[QUESTIONS[currentStep].id] === opt.value ? 'text-[#001f3f]' : 'text-white'}`}>
                                        {opt.text}
                                    </span>
                                    <ChevronRight size={18} className={answers[QUESTIONS[currentStep].id] === opt.value ? 'text-[#001f3f]' : 'text-white/20 group-hover:text-white transition-colors'} />
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Footer */}
                {currentStep === QUESTIONS.length - 1 && answers[QUESTIONS[currentStep].id] && (
                    <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black uppercase tracking-[0.3em] rounded-2xl shadow-xl hover:shadow-indigo-500/40 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Target size={20} />}
                        Finalizar Evaluación
                    </motion.button>
                )}
            </div>

            {/* Decorative Scanline */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,2px_100%]"></div>
        </div>
    );
};

export default EliteRecruitmentTest;
