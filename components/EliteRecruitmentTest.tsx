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
        id: 'liderazgo_estrat_1',
        type: 'SITUATIONAL',
        text: 'PRIORIZACIÓN: Tienes recursos limitados y tres frentes abiertos: una crisis de moral en tu equipo, un fallo técnico en el sistema y una petición urgente de tu superior. ¿Cómo procedes?',
        options: [
            { id: 'le1_a', text: 'Establezco un mando de crisis: atiendo lo técnico y delego la moral.', value: 'D' },
            { id: 'le1_b', text: 'Reúno al equipo: su unidad resolverá lo técnico y la urgencia después.', value: 'I' },
            { id: 'le1_c', text: 'Sigo el protocolo de jerarquía: lo que el superior pida es la prioridad.', value: 'C' },
            { id: 'le1_d', text: 'Mantengo la calma y analizo el impacto a largo plazo de cada fallo.', value: 'S' }
        ]
    },
    {
        id: 'integridad_1',
        type: 'SITUATIONAL',
        text: 'INTEGRIDAD: Detectas que un colega de igual rango está manipulando sus reportes de XP para ascender. Se te pide no decir nada por "lealtad".',
        options: [
            { id: 'in1_a', text: 'Lo confronto directamente y le exijo que informe a superiores.', value: 'D' },
            { id: 'in1_b', text: 'Trato de convencerlo de que el proyecto es más importante que un rango.', value: 'I' },
            { id: 'in1_c', text: 'Informo de inmediato por los canales oficiales; la regla es la regla.', value: 'C' },
            { id: 'in1_d', text: 'Busco consejo de un mentor antes de tomar una decisión que afecte al grupo.', value: 'S' }
        ]
    },
    {
        id: 'adaptabilidad_2',
        type: 'SITUATIONAL',
        text: 'CAMBIO DE RUMBO: El servidor central cambia el protocolo de seguridad de la noche a la mañana, invalidando tu trabajo de un mes.',
        options: [
            { id: 'ad2_a', text: 'Lidero la transición al nuevo sistema antes que nadie.', value: 'D' },
            { id: 'ad2_b', text: 'Motivo al equipo para ver esto como una oportunidad de mejora.', value: 'I' },
            { id: 'ad2_c', text: 'Estudio el nuevo manual hasta dominar cada coma del cambio.', value: 'C' },
            { id: 'ad2_d', text: 'Acepto el cambio con paciencia y sigo el ritmo del grupo.', value: 'S' }
        ]
    },
    {
        id: 'disc_avanzado_1',
        type: 'DISC',
        text: 'CUALIDAD DOMINANTE: Si tuvieras que definir tu aporte principal al equipo de Consagrados 2026, sería:',
        options: [
            { id: 'da1_a', text: 'La ejecución implacable y el cumplimiento de objetivos.', value: 'D' },
            { id: 'da1_b', text: 'La capacidad de inspirar y conectar a los miembros.', value: 'I' },
            { id: 'da1_c', text: 'La precisión técnica, el orden y la excelencia bíblica.', value: 'C' },
            { id: 'da1_d', text: 'La estabilidad, el servicio constante y el apoyo fiel.', value: 'S' }
        ]
    },
    {
        id: 'etica_lider_2',
        type: 'SITUATIONAL',
        text: 'GESTIÓN DE TALENTOS: Tienes un agente muy talentoso pero arrogante que genera conflictos. ¿Qué estrategia usas?',
        options: [
            { id: 'el2_a', text: 'Le asigno un reto solitario donde su éxito dependa de otros.', value: 'D' },
            { id: 'el2_b', text: 'Hago que sea mentor de un recluta para desarrollar su empatía.', value: 'I' },
            { id: 'el2_c', text: 'Aplico el reglamento de conducta sin excepciones.', value: 'C' },
            { id: 'el2_d', text: 'Le doy espacio para que él mismo busque la reconciliación con el grupo.', value: 'S' }
        ]
    },
    {
        id: 'vision_espiritual_1',
        type: 'SITUATIONAL',
        text: 'FOCO: Ante una disputa doctrinal técnica en el chat oficial que genera división, tú:',
        options: [
            { id: 've1_a', text: 'Corto la discusión y reenfoco al grupo en el objetivo operativo.', value: 'D' },
            { id: 've1_b', text: 'Trato de mediar con humor y diplomacia para bajar la tensión.', value: 'I' },
            { id: 've1_c', text: 'Aporto las citas exactas y la base de datos para cerrar el debate.', value: 'C' },
            { id: 've1_d', text: 'Escucho a ambas partes sin juzgar, buscando la paz.', value: 'S' }
        ]
    },
    {
        id: 'completitud_1',
        type: 'DISC',
        text: 'PRESION: Bajo presión extrema y plazos cortos, tu "yo" real tiende a:',
        options: [
            { id: 'c1_a', text: 'Volverse más directo, tajante y enfocado en el "qué".', value: 'D' },
            { id: 'c1_b', text: 'Volverse más expresivo, persuasivo y enfocado en el "quién".', value: 'I' },
            { id: 'c1_c', text: 'Volverse más perfeccionista, crítico y enfocado en el "cómo".', value: 'C' },
            { id: 'c1_d', text: 'Volverse más reservado, paciente y enfocado en el "por qué".', value: 'S' }
        ]
    }
];

interface EliteRecruitmentTestProps {
    onComplete: (results: any, awardedXp: number) => Promise<void>;
    agentName: string;
}

const EliteRecruitmentTest: React.FC<EliteRecruitmentTestProps> = ({ onComplete, agentName }) => {
    const [showIntro, setShowIntro] = useState(true);
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFinished, setIsFinished] = useState(false);

    const TOTAL_XP_REWARD = 15;

    const handleSelect = (questionId: string, value: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
        if (currentStep < QUESTIONS.length - 1) {
            setTimeout(() => setCurrentStep(prev => prev + 1), 300);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await onComplete(answers, TOTAL_XP_REWARD);
            setIsFinished(true);
        } catch (err) {
            console.error("Error submitting test:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const progress = ((currentStep + 1) / QUESTIONS.length) * 100;

    if (showIntro) {
        return (
            <div className="w-full max-w-xl mx-auto bg-[#001f3f]/90 backdrop-blur-xl border border-[#ffb700]/30 rounded-[2.5rem] overflow-hidden shadow-2xl p-10 space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-20 h-20 bg-[#ffb700]/20 rounded-full flex items-center justify-center border-2 border-[#ffb700] shadow-[0_0_20px_rgba(255,183,0,0.2)]">
                        <Shield className="text-[#ffb700]" size={40} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-3xl font-bebas text-white uppercase tracking-[0.2em]">EVALUACIÓN DE ÉLITE 2026</h3>
                        <p className="text-[10px] text-[#ffb700] font-black uppercase tracking-[0.4em] font-bebas">Protocolo de Re-perfilado Táctico</p>
                    </div>
                </div>

                <div className="space-y-4 text-center">
                    <p className="text-[12px] text-white/70 font-montserrat leading-relaxed">
                        Bienvenido, **{agentName}**. Este test de alta precisión utiliza metodología **DISC** y **Escenarios Situacionales** para recalibrar tu perfil en el servidor central.
                    </p>
                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                            <Zap className="text-blue-400 mx-auto mb-2" size={20} />
                            <p className="text-[8px] text-white/40 uppercase font-black">Recompensa</p>
                            <p className="text-sm font-bebas text-white">+15 XP TÁCTICA</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                            <Target className="text-orange-400 mx-auto mb-2" size={20} />
                            <p className="text-[8px] text-white/40 uppercase font-black">Preguntas</p>
                            <p className="text-sm font-bebas text-white">7 CASOS ÉLITE</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => setShowIntro(false)}
                    className="w-full py-5 bg-[#ffb700] text-[#001f3f] font-black uppercase tracking-[0.3em] rounded-2xl shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3 active:scale-95 font-bebas"
                >
                    Iniciar Protocolo <ChevronRight size={20} />
                </button>
            </div>
        );
    }

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
