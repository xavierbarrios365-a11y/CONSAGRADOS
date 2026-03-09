import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Star, Zap, Trophy, HelpCircle, ChevronRight, X, BookOpen, Lightbulb, ChevronLeft, Lock, CheckCircle2, RotateCcw } from 'lucide-react';
import { Agent, IQLevel } from '../types';
import { submitIQLevelComplete } from '../services/supabaseService';

interface TacticalIQProps {
    currentUser: Agent | null;
    onClose: () => void;
    onUpdateNeeded?: () => void;
}

// Las 12 Puertas de Jerusalén (Nehemías 3)
const LEVELS: IQLevel[] = [
    { level: 1, question: "PUERTA DE LAS OVEJAS: Decodifica el patrón numérico.", answer: "", options: [], hint: "El código no tiene dígitos repetidos... a menos que sí los tenga.", bibleClue: { verse: "Entonces se levantó el sumo sacerdote Eliasib con sus hermanos los sacerdotes, y edificaron la puerta de las Ovejas.", reference: "Nehemías 3:1" } },
    { level: 2, question: "PUERTA DEL PESCADO: Decodifica el patrón numérico.", answer: "", options: [], hint: "La lógica es la misma, la dificultad aumenta.", bibleClue: { verse: "Los hijos de Senaa edificaron la puerta del Pescado; le pusieron vigas, y colocaron sus puertas, sus cerraduras y sus cerrojos.", reference: "Nehemías 3:3" } },
    { level: 3, question: "PUERTA VIEJA: Decodifica el patrón numérico.", answer: "", options: [], hint: "Concéntrate en los aciertos parciales.", bibleClue: { verse: "La puerta Vieja fue restaurada por Joiada hijo de Paseah y Mesulam hijo de Besodías.", reference: "Nehemías 3:6" } },
    { level: 4, question: "PUERTA DEL VALLE: Decodifica el patrón numérico.", answer: "", options: [], hint: "Elimina los números grises de tu mente.", bibleClue: { verse: "La puerta del Valle la restauró Hanún con los moradores de Zanoa...", reference: "Nehemías 3:13" } },
    { level: 5, question: "PUERTA DEL MULADAR: Decodifica el patrón numérico.", answer: "", options: [], hint: "Usa el teclado táctico con precisión.", bibleClue: { verse: "La puerta del Muladar la restauró Malquías hijo de Recab, gobernador de la provincia de Bet-haquerem.", reference: "Nehemías 3:14" } },
    { level: 6, question: "PUERTA DE LA FUENTE: Decodifica el patrón numérico.", answer: "", options: [], hint: "Un hit verde vale más que dos amarillos.", bibleClue: { verse: "Salum hijo de Colhoze, gobernador de la región de Mizpa, restauró la puerta de la Fuente.", reference: "Nehemías 3:15" } },
    { level: 7, question: "PUERTA DE LAS AGUAS: Decodifica el patrón numérico.", answer: "", options: [], hint: "Mantén el ritmo.", bibleClue: { verse: "Y los sirvientes del templo que habitaban en Ofel restauraron hasta enfrente de la puerta de las Aguas al oriente.", reference: "Nehemías 3:26" } },
    { level: 8, question: "PUERTA DE LOS CABALLOS: Decodifica el patrón numérico.", answer: "", options: [], hint: "La victoria requiere insistencia.", bibleClue: { verse: "Desde la puerta de los Caballos restauraron los sacerdotes, cada uno enfrente de su casa.", reference: "Nehemías 3:28" } },
    { level: 9, question: "PUERTA ORIENTAL: Decodifica el patrón numérico.", answer: "", options: [], hint: "No hay atajos tácticos.", bibleClue: { verse: "Después de ellos restauró Sadoc hijo de Imer, enfrente de su casa; y después de él restauró Semaías, guarda de la puerta Oriental.", reference: "Nehemías 3:29" } },
    { level: 10, question: "PUERTA DEL JUICIO: Decodifica el patrón numérico.", answer: "", options: [], hint: "Casi en el final, evalúa bien tus datos.", bibleClue: { verse: "Después de él restauró Malquías, hijo del platero... hasta la puerta del Juicio.", reference: "Nehemías 3:31" } },
    { level: 11, question: "PUERTA DE EFRAÍN: Decodifica el patrón numérico.", answer: "", options: [], hint: "Requiere paciencia y exactitud.", bibleClue: { verse: "Y desde la puerta de Efraín hasta la puerta Vieja...", reference: "Nehemías 12:39" } },
    { level: 12, question: "PUERTA DE LA CÁRCEL: Decodifica el patrón numérico.", answer: "", options: [], hint: "El muro se completa aquí.", bibleClue: { verse: "...y se detuvieron a la puerta de la Cárcel.", reference: "Nehemías 12:39" } }
];

export type FeedbackType = 'green' | 'yellow' | 'gray';

const TacticalIQ: React.FC<TacticalIQProps> = ({ currentUser, onClose, onUpdateNeeded }) => {
    const [currentIqLevel, setCurrentIqLevel] = useState(currentUser?.iqLevel || 1);
    const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
    const [gameState, setGameState] = useState<'MAP' | 'PLAYING' | 'RESOLVING'>('MAP');
    const [showHint, setShowHint] = useState(false);
    const [showBibleClue, setShowBibleClue] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showIntro, setShowIntro] = useState(!localStorage.getItem('hide_iq_intro'));

    // Mastermind (Puerta 1) State
    const [secretCode, setSecretCode] = useState<string[]>([]);
    const [attempts, setAttempts] = useState<{ guess: string[], feedback: FeedbackType[] }[]>([]);
    const [currentGuess, setCurrentGuess] = useState<string[]>([]);
    const [status, setStatus] = useState<'PLAYING' | 'FAILED' | 'MEM_SHOWING'>('PLAYING');

    // Memory Matrix (Puerta 2) State
    const [memoryPattern, setMemoryPattern] = useState<number[]>([]);
    const [memoryPlayerGuess, setMemoryPlayerGuess] = useState<number[]>([]);
    const [memoryLevel, setMemoryLevel] = useState(1); // Fases dentro de la puerta 2 (ej. 3 secuencias)
    const [activeMemoryBlock, setActiveMemoryBlock] = useState<number | null>(null);

    // Criptograma (Puerta 3) State
    const [cryptoPhrase, setCryptoPhrase] = useState("");
    const [cryptoCipher, setCryptoCipher] = useState(""); // Frase codificada
    const [cryptoGuess, setCryptoGuess] = useState(""); // Letras ingresadas por el usuario
    const [cryptoMistakes, setCryptoMistakes] = useState(0);

    // Decodificador Frecuencias (Wordle) (Puerta 4) State
    const [wordleWord, setWordleWord] = useState("");
    const [wordleGuesses, setWordleGuesses] = useState<{ guess: string, feedback: FeedbackType[] }[]>([]);
    const [wordleCurrentGuess, setWordleCurrentGuess] = useState("");

    // Speed / Timer State
    const [startTime, setStartTime] = useState<number | null>(null);
    const [finalTime, setFinalTime] = useState<number>(0);

    // Instrucciones
    const [showBriefing, setShowBriefing] = useState(false);

    // Persistencia Local (Multitasking)
    useEffect(() => {
        if (gameState === 'PLAYING' && selectedLevel && currentUser && (status === 'PLAYING' || status === 'MEM_SHOWING')) {
            const stateToSave = {
                secretCode,
                attempts,
                currentGuess,
                status,
                startTime,
                showHint,
                showBibleClue,
                memoryPattern,
                memoryPlayerGuess,
                memoryLevel,
                cryptoPhrase,
                cryptoCipher,
                cryptoGuess,
                cryptoMistakes,
                wordleWord,
                wordleGuesses,
                wordleCurrentGuess
            };
            localStorage.setItem(`iq_state_${currentUser.id}_level${selectedLevel}`, JSON.stringify(stateToSave));
        } else if ((status === 'FAILED' || gameState === 'RESOLVING') && selectedLevel && currentUser) {
            localStorage.removeItem(`iq_state_${currentUser.id}_level${selectedLevel}`);
        }
    }, [secretCode, attempts, currentGuess, status, startTime, showHint, showBibleClue, memoryPattern, memoryPlayerGuess, memoryLevel, cryptoPhrase, cryptoCipher, cryptoGuess, cryptoMistakes, wordleWord, wordleGuesses, wordleCurrentGuess, gameState, selectedLevel, currentUser]);

    // Generador Puerta 1
    const generateCode = () => {
        const newCode = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1 + "");
        setSecretCode(newCode);
        setAttempts([]);
        setCurrentGuess([]);
        setStatus('PLAYING');
        setStartTime(Date.now());
    };

    // Generador Puerta 2
    const startMemorySequence = (stage: number) => {
        const sequenceLength = 3 + stage; // stage 1: 4, stage 2: 5, stage 3: 6
        const newPattern = Array.from({ length: sequenceLength }, () => Math.floor(Math.random() * 9));
        setMemoryPattern(newPattern);
        setMemoryPlayerGuess([]);
        setStatus('MEM_SHOWING');
        setActiveMemoryBlock(null);

        let currentIndex = 0;

        setTimeout(() => {
            const intervalId = setInterval(() => {
                if (currentIndex < newPattern.length) {
                    setActiveMemoryBlock(newPattern[currentIndex]);
                    // Apagado rápido para efecto de pulsación
                    setTimeout(() => setActiveMemoryBlock(null), 600);
                    currentIndex++;
                } else {
                    clearInterval(intervalId);
                    setStatus('PLAYING');
                }
            }, 1000); // 1 bloque cada segundo
        }, 800); // Pequeña pausa inicial
    };

    // Generador Puerta 3
    const startCrypto = () => {
        const phrases = [
            "DIOS ES MI FORTALEZA",
            "LA VERDAD OS HARA LIBRES",
            "JESUS ES EL CAMINO",
            "AMA A TU PROJIMO"
        ];
        const phrase = phrases[Math.floor(Math.random() * phrases.length)];
        setCryptoPhrase(phrase);

        // Codificador sencillo: mapeo a caracteres rúnicos / símbolos o letras desfasadas
        const chars = "!@#$%^&*_+-=<>/?XYZWQK";
        let ciphered = "";
        for (let i = 0; i < phrase.length; i++) {
            if (phrase[i] === " ") ciphered += " ";
            else ciphered += chars[Math.floor(Math.random() * chars.length)];
        }
        setCryptoCipher(ciphered);
        setCryptoGuess("");
        setCryptoMistakes(0);
        setStatus('PLAYING');
        setStartTime(Date.now());
    };

    // Generador Puerta 4 (Wordle)
    const startWordle = () => {
        const words = ["VALLE", "MUROS", "FUEGO", "ALTAR", "RESTO", "RUINA", "REYES", "REINO", "JUSTO", "PACTO", "LEY DE", "AYUNO"]; // Palabras de 5 letras
        // Filtramos solo las de 5 letras puras (sin espacios si aplica, o garantizamos que sean 5 letras)
        const pureWords = ["VALLE", "MUROS", "FUEGO", "ALTAR", "RESTO", "RUINA", "REYES", "REINO", "JUSTO", "PACTO", "AYUNO", "POLVO", "MUNDO"];
        setWordleWord(pureWords[Math.floor(Math.random() * pureWords.length)]);
        setWordleGuesses([]);
        setWordleCurrentGuess("");
        setStatus('PLAYING');
        setStartTime(Date.now());
    };

    const handleLevelSelect = (level: number) => {
        if (level <= currentIqLevel) {
            setSelectedLevel(level);
            setGameState('PLAYING');

            // Intentar recuperar el estado guardado
            const savedStateStr = localStorage.getItem(`iq_state_${currentUser?.id}_level${level}`);
            if (savedStateStr) {
                try {
                    const saved = JSON.parse(savedStateStr);
                    if (saved) {
                        setSecretCode(saved.secretCode || []);
                        setAttempts(saved.attempts || []);
                        setCurrentGuess(saved.currentGuess || []);
                        setStartTime(saved.startTime || Date.now());
                        setShowHint(saved.showHint || false);
                        setShowBibleClue(saved.showBibleClue || false);

                        setMemoryPattern(saved.memoryPattern || []);
                        setMemoryPlayerGuess(saved.memoryPlayerGuess || []);
                        setMemoryLevel(saved.memoryLevel || 1);

                        setCryptoPhrase(saved.cryptoPhrase || "");
                        setCryptoCipher(saved.cryptoCipher || "");
                        setCryptoGuess(saved.cryptoGuess || "");
                        setCryptoMistakes(saved.cryptoMistakes || 0);

                        setWordleWord(saved.wordleWord || "");
                        setWordleGuesses(saved.wordleGuesses || []);
                        setWordleCurrentGuess(saved.wordleCurrentGuess || "");

                        // Lógicas de auto-corrección para guardados corruptos/antiguos
                        if (level === 2 && saved.status === 'MEM_SHOWING') {
                            startMemorySequence(saved.memoryLevel || 1);
                        } else if (level === 3 && (!saved.cryptoPhrase || saved.cryptoPhrase.trim() === "")) {
                            startCrypto();
                        } else if (level === 4 && (!saved.wordleWord || saved.wordleWord.trim() === "")) {
                            startWordle();
                        } else {
                            setStatus(saved.status || 'PLAYING');
                        }

                        return; // Salir aquí para no sobreescribir
                    }
                } catch (e) {
                    console.error("Error leyendo estado guardado del minijuego:", e);
                }
            }

            // Si no hay guardado, mostramos instrucciones antes de empezar
            setShowBriefing(true);
        }
    };

    const startLevelLogic = (level: number) => {
        setShowHint(false);
        setShowBibleClue(false);
        setStartTime(Date.now());
        setShowBriefing(false);

        if (level === 1) generateCode();
        else if (level === 2) {
            setMemoryLevel(1);
            startMemorySequence(1);
        }
        else if (level === 3) startCrypto();
        else if (level === 4) startWordle();
    };

    const handleNumberPress = (num: string) => {
        if (currentGuess.length < 4 && status === 'PLAYING') {
            setCurrentGuess(prev => [...prev, num]);
        }
    };

    const handleDelete = () => {
        if (currentGuess.length > 0 && status === 'PLAYING') {
            setCurrentGuess(prev => prev.slice(0, -1));
        }
    };

    const submitGuess = async () => {
        if (currentGuess.length !== 4 || status !== 'PLAYING' || !currentUser || !selectedLevel) return;

        // Evaluar lógica Mastermind / Wordle
        const feedback: FeedbackType[] = new Array(4).fill('gray');
        const secretCopy = [...secretCode];
        const guessCopy = [...currentGuess];

        // 1ra pasada: Verdes (Match exacto posición y valor)
        for (let i = 0; i < 4; i++) {
            if (guessCopy[i] === secretCopy[i]) {
                feedback[i] = 'green';
                secretCopy[i] = 'MATCHED';
                guessCopy[i] = 'USED'; // Para que no cuente como amarillo después
            }
        }

        // 2da pasada: Amarillos (Match valor diferente posición)
        for (let i = 0; i < 4; i++) {
            if (guessCopy[i] !== 'USED') {
                const secretIndex = secretCopy.indexOf(guessCopy[i]);
                if (secretIndex !== -1) {
                    feedback[i] = 'yellow';
                    secretCopy[secretIndex] = 'MATCHED'; // Prevenir doble conteo
                }
            }
        }

        const newAttempts = [...attempts, { guess: currentGuess, feedback }];
        setAttempts(newAttempts);
        setCurrentGuess([]);

        const isWin = feedback.every(f => f === 'green');

        if (isWin) {
            setIsSubmitting(true);
            const timeTakenSecs = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
            setFinalTime(timeTakenSecs);

            try {
                const res = await submitIQLevelComplete(currentUser.id, selectedLevel, timeTakenSecs);
                if (res.success) {
                    if (selectedLevel === currentIqLevel) setCurrentIqLevel(prev => prev + 1);
                    setGameState('RESOLVING');
                    if (onUpdateNeeded) onUpdateNeeded();
                } else {
                    alert(`❌ ERROR DE ENLACE: ${res.error || 'NÚCLEO INESTABLE'}`);
                }
            } catch (error: any) {
                alert(`⚠️ FALLO CRÍTICO: ${error.message}`);
            } finally {
                setIsSubmitting(false);
            }
        } else if (newAttempts.length >= 6) {
            setStatus('FAILED');
        }
    };

    // CONTROLADORES PUERTA 2
    const handleMemoryPress = async (blockIndex: number) => {
        if (status !== 'PLAYING') return;

        const newGuess = [...memoryPlayerGuess, blockIndex];
        setMemoryPlayerGuess(newGuess);

        // Check if correct so far
        const isCorrectSoFar = newGuess.every((val, idx) => val === memoryPattern[idx]);

        if (!isCorrectSoFar) {
            setStatus('FAILED');
            return;
        }

        // Check if sequence is complete
        if (newGuess.length === memoryPattern.length) {
            if (memoryLevel < 3) {
                // Siguiente fase de memoria
                setMemoryLevel(prev => prev + 1);
                setTimeout(() => startMemorySequence(memoryLevel + 1), 1000);
            } else {
                // Ganó el Nivel 2 Completo
                setIsSubmitting(true);
                const timeTakenSecs = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
                setFinalTime(timeTakenSecs);

                try {
                    const res = await submitIQLevelComplete(currentUser!.id, selectedLevel!, timeTakenSecs);
                    if (res.success) {
                        if (selectedLevel === currentIqLevel) setCurrentIqLevel(prev => prev + 1);
                        setGameState('RESOLVING');
                        if (onUpdateNeeded) onUpdateNeeded();
                    } else {
                        alert(`❌ ERROR DE ENLACE: ${res.error}`);
                    }
                } catch (error: any) {
                    alert(`⚠️ FALLO CRÍTICO: ${error.message}`);
                } finally {
                    setIsSubmitting(false);
                }
            }
        }
    };

    // CONTROLADORES PUERTA 3
    const handleCryptoInput = async (char: string) => {
        if (status !== 'PLAYING') return;

        // Limite de longitud
        if (cryptoGuess.length >= cryptoPhrase.length) return;

        const nextIndex = cryptoGuess.length;
        const targetChar = cryptoPhrase[nextIndex];

        let newGuess = cryptoGuess;

        // Si el caracter actual en la frase final es espacio, lo auto-agregamos primero
        if (targetChar === " ") {
            newGuess += " ";
            const nextTargetChar = cryptoPhrase[nextIndex + 1];
            if (nextTargetChar && char === nextTargetChar) {
                newGuess += char;
            } else if (nextTargetChar) {
                setCryptoMistakes(prev => prev + 1);
                if (cryptoMistakes + 1 >= 5) setStatus('FAILED');
                return;
            }
        } else {
            if (char === targetChar) {
                newGuess += char;
            } else {
                setCryptoMistakes(prev => prev + 1);
                if (cryptoMistakes + 1 >= 5) setStatus('FAILED');
                return;
            }
        }

        setCryptoGuess(newGuess);

        // Win Condition
        if (newGuess.length === cryptoPhrase.length && newGuess === cryptoPhrase) {
            setIsSubmitting(true);
            const timeTakenSecs = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
            setFinalTime(timeTakenSecs);

            try {
                const res = await submitIQLevelComplete(currentUser!.id, selectedLevel!, timeTakenSecs);
                if (res.success) {
                    if (selectedLevel === currentIqLevel) setCurrentIqLevel(prev => prev + 1);
                    setGameState('RESOLVING');
                    if (onUpdateNeeded) onUpdateNeeded();
                } else alert(`❌ ERROR DE ENLACE: ${res.error}`);
            } catch (error: any) {
                alert(`⚠️ FALLO CRÍTICO: ${error.message}`);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleCryptoDelete = () => {
        if (status !== 'PLAYING' || cryptoGuess.length === 0) return;
        let p = cryptoGuess;
        p = p.slice(0, -1);
        if (p[p.length - 1] === " ") p = p.slice(0, -1);
        setCryptoGuess(p);
    };

    // CONTROLADORES PUERTA 4
    const handleWordleInput = (char: string) => {
        if (status !== 'PLAYING' || wordleCurrentGuess.length >= 5) return;
        setWordleCurrentGuess(prev => prev + char);
    };

    const handleWordleDelete = () => {
        if (status !== 'PLAYING' || wordleCurrentGuess.length === 0) return;
        setWordleCurrentGuess(prev => prev.slice(0, -1));
    };

    const submitWordleGuess = async () => {
        if (wordleCurrentGuess.length !== 5 || status !== 'PLAYING' || !currentUser || !selectedLevel) return;

        const guessArr = wordleCurrentGuess.split('');
        const secretArr = wordleWord.split('');
        const feedback: FeedbackType[] = new Array(5).fill('gray');

        // 1ra pasada: Verdes
        for (let i = 0; i < 5; i++) {
            if (guessArr[i] === secretArr[i]) {
                feedback[i] = 'green';
                secretArr[i] = '#';
                guessArr[i] = '*';
            }
        }

        // 2da pasada: Amarillos
        for (let i = 0; i < 5; i++) {
            if (guessArr[i] !== '*') {
                const idx = secretArr.indexOf(guessArr[i]);
                if (idx !== -1) {
                    feedback[i] = 'yellow';
                    secretArr[idx] = '#';
                }
            }
        }

        const newGuesses = [...wordleGuesses, { guess: wordleCurrentGuess, feedback }];
        setWordleGuesses(newGuesses);
        setWordleCurrentGuess("");

        const isWin = feedback.every(f => f === 'green');

        if (isWin) {
            setIsSubmitting(true);
            const timeTakenSecs = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
            setFinalTime(timeTakenSecs);

            try {
                const res = await submitIQLevelComplete(currentUser.id, selectedLevel, timeTakenSecs);
                if (res.success) {
                    if (selectedLevel === currentIqLevel) setCurrentIqLevel(prev => prev + 1);
                    setGameState('RESOLVING');
                    if (onUpdateNeeded) onUpdateNeeded();
                } else alert(`❌ ERROR DE ENLACE: ${res.error}`);
            } catch (error: any) {
                alert(`⚠️ FALLO CRÍTICO: ${error.message}`);
            } finally {
                setIsSubmitting(false);
            }
        } else if (newGuesses.length >= 6) {
            setStatus('FAILED');
        }
    };

    // RENDERIZADORES PUERTA 1
    const renderAttemptRow = (index: number) => {
        const isCurrentRow = index === attempts.length;
        const isPastRow = index < attempts.length;

        const getBgColor = (bgFeed: FeedbackType | undefined) => {
            if (bgFeed === 'green') return 'bg-green-500 border-green-400 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]';
            if (bgFeed === 'yellow') return 'bg-yellow-500 border-yellow-400 text-white';
            if (bgFeed === 'gray') return 'bg-gray-800 border-gray-600 text-gray-500 opacity-60';
            return 'bg-white/5 border-white/10 text-white/20';
        };

        return (
            <div key={index} className="flex gap-2 justify-center mb-2">
                {[0, 1, 2, 3].map(col => {
                    let digit = '';
                    let feedbackColorClass = 'bg-white/5 border-white/10 text-white/20';

                    if (isPastRow) {
                        digit = attempts[index].guess[col];
                        feedbackColorClass = getBgColor(attempts[index].feedback[col]);
                    } else if (isCurrentRow && currentGuess[col]) {
                        digit = currentGuess[col];
                        // Resaltar caja activa que tiene número
                        feedbackColorClass = 'border-blue-400 text-blue-100 shadow-[0_0_10px_rgba(59,130,246,0.2)] bg-blue-500/20';
                    }

                    return (
                        <div key={col} className={`w-10 h-10 sm:w-12 sm:h-12 border-2 rounded-lg flex items-center justify-center text-xl sm:text-2xl font-bebas transition-all duration-300 ${feedbackColorClass}`}>
                            {digit}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#000814] text-white font-montserrat overflow-hidden flex flex-col">
            {/* HEADER TÁCTICO */}
            <div className="p-3 border-b border-white/5 flex justify-between items-center bg-black/60 backdrop-blur-md z-10 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500/20 rounded-lg border border-blue-500/30">
                        <Brain className="text-blue-400" size={16} />
                    </div>
                    <div>
                        <h1 className="text-base font-bebas tracking-widest leading-none">PROYECTO NEHEMÍAS</h1>
                        <p className="text-[6px] text-blue-400 font-black uppercase tracking-[0.2em] mt-0.5">Ciber-Decodificador</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-full transition-colors">
                    <X size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-2 relative">
                <AnimatePresence mode="wait">
                    {showIntro && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            className="fixed inset-0 z-[60] bg-[#000814]/90 backdrop-blur-xl flex items-center justify-center p-4"
                        >
                            <div className="bg-gradient-to-br from-[#001d3d] to-black border border-blue-500/20 p-6 rounded-[1.5rem] max-w-sm w-full space-y-4 text-center shadow-2xl">
                                <div className="w-12 h-12 bg-blue-500/20 rounded-xl mx-auto flex items-center justify-center border border-blue-500/30">
                                    <Brain className="text-blue-400" size={24} />
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-xl font-bebas tracking-widest text-white uppercase">CÓDIGO MASTERMIND</h2>
                                    <p className="text-[8px] text-blue-300 font-black uppercase tracking-widest">Protocolo de Deducción Lógica</p>
                                </div>
                                <div className="space-y-3 text-left">
                                    <div className="flex gap-3 items-start">
                                        <div className="h-4 w-4 rounded-full bg-blue-500/20 flex items-center justify-center text-[8px] font-black text-blue-400 border border-blue-500/30 flex-shrink-0 mt-0.5">1</div>
                                        <p className="text-[10px] text-white/60 leading-tight"><span className="text-white font-bold">DESCUBRE EL PATRÓN:</span> Adivina el código secreto de 4 dígitos (usando números del 1 al 6). Tienes 6 intentos.</p>
                                    </div>
                                    <div className="flex gap-3 items-start">
                                        <div className="h-4 w-4 rounded-full bg-blue-500/20 flex items-center justify-center text-[8px] font-black text-blue-400 border border-blue-500/30 flex-shrink-0 mt-0.5">2</div>
                                        <p className="text-[10px] text-white/60 leading-tight"><span className="text-green-400 font-bold">VERDE:</span> Número correcto en posición correcta. <span className="text-yellow-400 font-bold">AMARILLO:</span> Número correcto en posición incorrecta. <span className="text-gray-400 font-bold">GRIS:</span> Número incorrecto.</p>
                                    </div>
                                    <div className="flex gap-3 items-start">
                                        <div className="h-4 w-4 rounded-full bg-blue-500/20 flex items-center justify-center text-[8px] font-black text-blue-400 border border-blue-500/30 flex-shrink-0 mt-0.5">3</div>
                                        <p className="text-[10px] text-white/60 leading-tight"><span className="text-white font-bold">RECOMPENSAS:</span> Gana XP escalable al triunfar. Fallar desestabiliza el núcleo.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        localStorage.setItem('hide_iq_intro', 'true');
                                        setShowIntro(false);
                                    }}
                                    className="w-full py-3 mt-2 bg-blue-600 text-white rounded-lg font-bebas tracking-widest hover:bg-blue-500 transition-all active:scale-95 text-base shadow-lg shadow-blue-600/20"
                                >
                                    ENTENDIDO
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {gameState === 'MAP' && (
                        <motion.div
                            key="map"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="grid grid-cols-3 gap-3 pb-24 pt-4 max-w-md mx-auto"
                        >
                            <div className="col-span-3 text-center mb-2">
                                <h3 className="text-[#FFB700] font-bebas tracking-widest text-sm">LAS 12 PUERTAS DE JERUSALÉN</h3>
                                <p className="text-[9px] text-gray-400">Restaura los códigos de acceso para reconstruir el muro.</p>
                            </div>
                            {LEVELS.map((lvl) => {
                                const isLocked = lvl.level > currentIqLevel;
                                const isCompleted = lvl.level < currentIqLevel;

                                return (
                                    <button
                                        key={lvl.level}
                                        disabled={isLocked}
                                        onClick={() => handleLevelSelect(lvl.level)}
                                        className={`aspect-[3/4] rounded-t-full rounded-b-lg border-2 flex flex-col items-center justify-start pt-4 px-1 transition-all relative group overflow-hidden ${isLocked
                                            ? 'bg-black border-white/5 text-white/10 grayscale'
                                            : isCompleted
                                                ? 'bg-green-900/20 border-green-500/30 text-green-400'
                                                : 'bg-[#FFB700]/10 border-[#FFB700]/40 text-white shadow-[0_0_15px_rgba(255,183,0,0.2)] animate-[pulse_3s_infinite]'
                                            }`}
                                    >
                                        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-30">
                                            {isLocked && <Lock size={12} />}
                                            {isCompleted && <CheckCircle2 size={12} className="text-green-500" />}
                                        </div>
                                        <span className="text-[10px] font-black tracking-widest mt-4">P{lvl.level}</span>
                                        <span className="text-[7px] text-center leading-tight mt-1 opacity-70 font-bold uppercase">{lvl.question.split(':')[0].replace('PUERTA ', '')}</span>

                                        {!isLocked && !isCompleted && (
                                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#FFB700]/50 rounded-full blur-[1px]"></div>
                                        )}
                                    </button>
                                );
                            })}
                        </motion.div>
                    )}

                    {gameState === 'PLAYING' && selectedLevel && (
                        <motion.div
                            key="playing"
                            initial={{ opacity: 0, scale: 1.05 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="max-w-md mx-auto flex flex-col gap-3 justify-start pb-24"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <button onClick={() => setGameState('MAP')} className="text-gray-400 hover:text-white flex items-center text-[10px] font-bold tracking-widest uppercase">
                                    <ChevronLeft size={14} /> Volver
                                </button>
                                <button onClick={() => setShowBriefing(true)} className="px-2 py-0.5 bg-blue-500/20 rounded-full text-[6px] font-black text-blue-400 tracking-[0.2em] uppercase border border-blue-500/20 hover:bg-blue-500/40 transition-colors">
                                    Nivel {selectedLevel} - INFO
                                </button>
                            </div>

                            {/* PANTALLA PREVIA (INSTRUCCIONES CLARAS) */}
                            <AnimatePresence>
                                {showBriefing && (
                                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute z-[55] inset-0 bg-black/95 flex flex-col items-center justify-center p-6 text-center shadow-2xl backdrop-blur-md rounded-t-3xl">
                                        <div className="border border-blue-500/30 bg-[#001d3d]/50 p-6 rounded-2xl max-w-sm w-full relative">
                                            <button onClick={() => { if (startTime) setShowBriefing(false); else startLevelLogic(selectedLevel); }} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={18} /></button>
                                            <div className="w-10 h-10 bg-blue-500/20 rounded-full mx-auto flex items-center justify-center mb-3">
                                                <Brain className="text-blue-400" size={20} />
                                            </div>
                                            <h2 className="text-xl font-bebas tracking-widest text-[#FFB700] mb-1">MISIÓN: PUERTA {selectedLevel}</h2>
                                            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-4 border-b border-white/5 pb-4">Instrucciones de Desbloqueo</p>

                                            <div className="text-[11px] text-gray-300 leading-relaxed mb-6 space-y-2 font-mono bg-black/30 p-4 rounded-xl border border-white/5 text-left">
                                                {selectedLevel === 1 && <><p><span className="text-blue-400 font-bold">» OBJETIVO:</span> Descifra la contraseña maestra de 4 dígitos numéricos.</p><p><span className="text-green-400 font-bold">» REGLAS:</span> Los números posibles son del 1 al 6. Tienes 6 intentos máximos.</p></>}
                                                {selectedLevel === 2 && <><p><span className="text-blue-400 font-bold">» OBJETIVO:</span> Memoriza la secuencia de luces en la matriz y reprodúcela en el orden exacto.</p><p><span className="text-green-400 font-bold">» REGLAS:</span> Estructura de 3 Fases incrementales. Un solo error desestabiliza toda la matriz.</p></>}
                                                {selectedLevel === 3 && <><p><span className="text-blue-400 font-bold">» OBJETIVO:</span> El proverbio bíblico ha sido encriptado con un protocolo antiguo.</p><p><span className="text-green-400 font-bold">» REGLAS:</span> Usa el teclado de consola para tantear y adivinar las letras que ocultan los símbolos. Límite de 5 errores.</p></>}
                                                {selectedLevel === 4 && <><p><span className="text-blue-400 font-bold">» OBJETIVO:</span> Decodifica la Frecuencia encontrando la palabra bíblica de 5 letras.</p><p><span className="text-green-400 font-bold">» REGLAS:</span> <span className="text-green-500">Verde:</span> Letra correcta y posición.<br /><span className="text-yellow-500">Amarillo:</span> Letra en otra posición. Tienes 6 intentos.</p></>}
                                            </div>

                                            <button onClick={() => startLevelLogic(selectedLevel)} className="w-full px-6 py-3 bg-blue-600 text-white font-bebas tracking-[0.15em] rounded-xl hover:bg-blue-500 shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-sm">
                                                INICIAR SISTEMA
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* HINTS */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowBibleClue(true)}
                                    className="flex-1 py-2 bg-[#FFB700]/5 border border-[#FFB700]/20 rounded-lg flex items-center justify-center gap-1.5 text-[#FFB700] text-[9px] font-black tracking-widest uppercase font-bebas active:scale-95 transition-all shadow-sm"
                                >
                                    <BookOpen size={12} /> RECURSO BÍBLICO
                                </button>
                                <button
                                    onClick={() => setShowHint(true)}
                                    disabled={!showBibleClue}
                                    className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 text-[9px] font-black tracking-widest uppercase font-bebas transition-all active:scale-95 shadow-sm ${showBibleClue
                                        ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                                        : 'bg-white/5 border border-white/5 text-white/10 cursor-not-allowed opacity-50'
                                        }`}
                                >
                                    <Lightbulb size={12} /> DATOS NÚCLEO
                                </button>
                            </div>

                            <AnimatePresence>
                                {showBibleClue && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-blue-900/20 p-3 rounded-lg border border-blue-500/10 text-center">
                                        <p className="text-[10px] italic text-blue-200/90 leading-tight mb-1">"{LEVELS[selectedLevel - 1].bibleClue.verse}"</p>
                                        <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">{LEVELS[selectedLevel - 1].bibleClue.reference}</p>
                                    </motion.div>
                                )}
                                {showHint && showBibleClue && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-green-500/5 p-3 rounded-lg border border-green-500/10 text-center">
                                        <p className="text-[9px] text-green-400 font-bold leading-tight">
                                            📡 PISTA DE SISTEMA: {selectedLevel === 1 ? 'Observa los colores verdes y amarillos devueltos tras cada intento.' : selectedLevel === 2 ? 'Concéntrate en la forma imaginaria que dibujan los toques en la matriz.' : selectedLevel === 3 ? 'Busca palabras cortas como "EL", "LA" o "DE" como puntos de inicio comunes.' : 'Piensa en las edificaciones que construyó Nehemías a su regreso o en temas del Templo.'}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* INTERFAZ PUERTA 1: CIBER-DECODIFICADOR */}
                            {selectedLevel === 1 && (
                                <>
                                    {/* TABLERO DE JUEGO (GRID) */}
                                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 shadow-inner mt-2">
                                        {[0, 1, 2, 3, 4, 5].map(rowIndex => renderAttemptRow(rowIndex))}
                                    </div>

                                    {/* CONTROLES / TECLADO NUMÉRICO */}
                                    <div className="mt-2">
                                        <div className="grid grid-cols-3 gap-2 px-1">
                                            {['1', '2', '3', '4', '5', '6'].map(num => (
                                                <button
                                                    key={num}
                                                    disabled={status !== 'PLAYING' || currentGuess.length >= 4}
                                                    onClick={() => handleNumberPress(num)}
                                                    className="aspect-[2/1] bg-white/[0.05] border border-white/10 rounded-lg text-xl font-bebas active:scale-[0.98] active:bg-blue-600/50 transition-all focus:outline-none disabled:opacity-30 flex items-center justify-center text-blue-100"
                                                >
                                                    {num}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mt-2 px-1">
                                            <button
                                                onClick={handleDelete}
                                                disabled={status !== 'PLAYING' || currentGuess.length === 0}
                                                className="py-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg font-bebas active:scale-95 disabled:opacity-30 disabled:grayscale transition-all flex justify-center items-center text-sm tracking-widest"
                                            >
                                                BORRAR
                                            </button>
                                            <button
                                                onClick={submitGuess}
                                                disabled={status !== 'PLAYING' || currentGuess.length !== 4 || isSubmitting}
                                                className="py-3 bg-blue-600 text-white rounded-lg font-bebas shadow-[0_4px_15px_rgba(37,99,235,0.4)] active:scale-[0.98] disabled:opacity-30 disabled:grayscale transition-all flex justify-center items-center text-sm tracking-widest"
                                            >
                                                {isSubmitting ? 'ENVIANDO...' : 'ENVIAR SEC.'}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* INTERFAZ PUERTA 2: MEMORIA VISUAL */}
                            {selectedLevel === 2 && (
                                <div className="mt-4 flex flex-col items-center">
                                    <div className="flex justify-between w-full px-4 mb-4">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Fase {memoryLevel}/3</span>
                                        <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">
                                            {status === 'MEM_SHOWING' ? 'MEmoriza el patrón' : status === 'PLAYING' ? 'Repite el patrón' : ''}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-xl shadow-inner mx-auto">
                                        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => {
                                            const isShowing = status === 'MEM_SHOWING' && activeMemoryBlock === i;

                                            // Sólo mostramos el estilo 'cliccado' si el jugador está jugando y este bloque fue el *último* que presionó, o está en su arreglo de guesses.
                                            // NOTA: Para no bloquear múltiples pulsaciones sobre la misma caja, el estilo verde solo será cosmético y no disabled state.
                                            const isClicked = status === 'PLAYING' && memoryPlayerGuess.includes(i);

                                            return (
                                                <button
                                                    key={i}
                                                    disabled={status !== 'PLAYING'}
                                                    onClick={() => handleMemoryPress(i)}
                                                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 transition-all duration-200 focus:outline-none ${isShowing
                                                        ? 'bg-blue-500 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.8)] scale-105'
                                                        : isClicked
                                                            ? 'bg-green-500/30 border-green-500/50 text-green-100/50 shadow-[inset_0_0_10px_rgba(34,197,94,0.3)] hover:bg-green-500/40 active:bg-green-500/80 active:border-green-400 active:scale-95 active:shadow-[0_0_15px_rgba(34,197,94,0.6)]'
                                                            : 'bg-white/5 border-white/10 hover:bg-white/10 active:bg-green-500/80 active:border-green-400 active:scale-95 active:shadow-[0_0_15px_rgba(34,197,94,0.6)]'
                                                        }`}
                                                >
                                                    {isClicked && <CheckCircle2 className="mx-auto opacity-30" size={24} />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* INTERFAZ PUERTA 3: CRIPTOGRAMA BÍBLICO */}
                            {selectedLevel === 3 && (
                                <div className="mt-2 flex flex-col items-center w-full px-1">
                                    <div className="flex justify-between w-full mb-2">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Descifra el mensaje</span>
                                        <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest">
                                            Errores: {cryptoMistakes}/5
                                        </span>
                                    </div>

                                    {/* Pantalla del Criptograma */}
                                    <div className="w-full bg-[#001d3d]/30 border border-blue-500/20 rounded-xl p-4 shadow-inner mb-4 flex flex-wrap gap-2 justify-center min-h-[100px] content-center">
                                        {Array.from(cryptoPhrase).map((char, i) => {
                                            const isSpace = char === " ";
                                            const isRevealed = i < cryptoGuess.length;
                                            const isCurrent = i === cryptoGuess.length && status === 'PLAYING';
                                            const cipherChar = cryptoCipher[i];

                                            if (isSpace) return <div key={i} className="w-4 h-8" />; // Separador de palabras

                                            return (
                                                <div key={i} className={`w-8 h-10 flex flex-col justify-end items-center border-b-2 transition-all duration-300 ${isRevealed ? 'border-green-500/50' :
                                                    isCurrent ? 'border-blue-400 shadow-[0_2px_10px_rgba(59,130,246,0.5)]' : 'border-white/10'
                                                    }`}>
                                                    <span className={`text-[10px] mb-1 font-mono font-bold ${isRevealed ? 'text-gray-500 opacity-50' : 'text-blue-400 opacity-80'}`}>
                                                        {cipherChar}
                                                    </span>
                                                    <span className={`text-lg font-bebas leading-none ${isRevealed ? 'text-green-400' : 'text-transparent'}`}>
                                                        {isRevealed ? cryptoGuess[i] : '?'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Teclado Alfabético */}
                                    <div className="w-full max-w-[360px] mx-auto select-none">
                                        <div className="flex justify-center flex-nowrap gap-1 mb-1.5 px-1">
                                            {"QWERTYUIOP".split("").map(l => (
                                                <button key={l} onClick={() => handleCryptoInput(l)} disabled={status !== 'PLAYING' || cryptoGuess.length >= cryptoPhrase.length} className="flex-1 max-w-[30px] sm:max-w-[35px] h-10 sm:h-12 bg-white/[0.05] border border-white/10 rounded-md text-base sm:text-lg font-bebas active:scale-95 active:bg-blue-600/50 transition-all disabled:opacity-30 flex items-center justify-center text-blue-100">{l}</button>
                                            ))}
                                        </div>
                                        <div className="flex justify-center flex-nowrap gap-1 mb-1.5 px-4">
                                            {"ASDFGHJKL".split("").map(l => (
                                                <button key={l} onClick={() => handleCryptoInput(l)} disabled={status !== 'PLAYING' || cryptoGuess.length >= cryptoPhrase.length} className="flex-1 max-w-[30px] sm:max-w-[35px] h-10 sm:h-12 bg-white/[0.05] border border-white/10 rounded-md text-base sm:text-lg font-bebas active:scale-95 active:bg-blue-600/50 transition-all disabled:opacity-30 flex items-center justify-center text-blue-100">{l}</button>
                                            ))}
                                        </div>
                                        <div className="flex justify-center flex-nowrap gap-1 px-1">
                                            <button onClick={handleCryptoDelete} disabled={status !== 'PLAYING' || cryptoGuess.length === 0} className="w-[45px] sm:w-[50px] h-10 sm:h-12 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md text-[10px] font-black tracking-widest active:scale-95 disabled:opacity-30 transition-all flex items-center justify-center mr-1">DEL</button>
                                            {"ZXCVBNM".split("").map(l => (
                                                <button key={l} onClick={() => handleCryptoInput(l)} disabled={status !== 'PLAYING' || cryptoGuess.length >= cryptoPhrase.length} className="flex-1 max-w-[30px] sm:max-w-[35px] h-10 sm:h-12 bg-white/[0.05] border border-white/10 rounded-md text-base sm:text-lg font-bebas active:scale-95 active:bg-blue-600/50 transition-all disabled:opacity-30 flex items-center justify-center text-blue-100">{l}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* INTERFAZ PUERTA 4: DECODIFICADOR (WORDLE) */}
                            {selectedLevel === 4 && (
                                <div className="mt-2 flex flex-col items-center w-full px-1">
                                    <div className="flex justify-between w-full mb-2">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Sincroniza la Frecuencia</span>
                                        <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">
                                            Intento: {wordleGuesses.length + 1}/6
                                        </span>
                                    </div>

                                    {/* Tablero (Grid) de Wordle */}
                                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 shadow-inner mt-2 mb-4 w-full flex flex-col items-center">
                                        {[0, 1, 2, 3, 4, 5].map(rowIndex => renderWordleRow(rowIndex))}
                                    </div>

                                    {/* Teclado Alfabético (Idéntico a Puerta 3 pero adaptado y con botón Enter) */}
                                    <div className="w-full max-w-[360px] mx-auto select-none">
                                        <div className="flex justify-center flex-nowrap gap-1 mb-1.5 px-1">
                                            {"QWERTYUIOP".split("").map(l => (
                                                <button key={l} onClick={() => handleWordleInput(l)} disabled={status !== 'PLAYING' || wordleCurrentGuess.length >= 5} className="flex-1 max-w-[30px] sm:max-w-[35px] h-10 sm:h-12 bg-white/[0.05] border border-white/10 rounded-md text-base sm:text-lg font-bebas active:scale-95 active:bg-blue-600/50 transition-all disabled:opacity-30 flex items-center justify-center text-blue-100">{l}</button>
                                            ))}
                                        </div>
                                        <div className="flex justify-center flex-nowrap gap-1 mb-1.5 px-4">
                                            {"ASDFGHJKL".split("").map(l => (
                                                <button key={l} onClick={() => handleWordleInput(l)} disabled={status !== 'PLAYING' || wordleCurrentGuess.length >= 5} className="flex-1 max-w-[30px] sm:max-w-[35px] h-10 sm:h-12 bg-white/[0.05] border border-white/10 rounded-md text-base sm:text-lg font-bebas active:scale-95 active:bg-blue-600/50 transition-all disabled:opacity-30 flex items-center justify-center text-blue-100">{l}</button>
                                            ))}
                                        </div>
                                        <div className="flex justify-center flex-nowrap gap-1 px-1">
                                            <button onClick={submitWordleGuess} disabled={status !== 'PLAYING' || wordleCurrentGuess.length !== 5 || isSubmitting} className="w-[45px] sm:w-[50px] h-10 sm:h-12 bg-blue-500/20 text-blue-400 border border-blue-500/40 rounded-md text-[9px] font-black tracking-widest active:scale-95 disabled:opacity-30 transition-all flex items-center justify-center mr-1">ENT</button>
                                            {"ZXCVBNM".split("").map(l => (
                                                <button key={l} onClick={() => handleWordleInput(l)} disabled={status !== 'PLAYING' || wordleCurrentGuess.length >= 5} className="flex-1 max-w-[30px] sm:max-w-[35px] h-10 sm:h-12 bg-white/[0.05] border border-white/10 rounded-md text-base sm:text-lg font-bebas active:scale-95 active:bg-blue-600/50 transition-all disabled:opacity-30 flex items-center justify-center text-blue-100">{l}</button>
                                            ))}
                                            <button onClick={handleWordleDelete} disabled={status !== 'PLAYING' || wordleCurrentGuess.length === 0} className="w-[45px] sm:w-[50px] h-10 sm:h-12 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md text-[10px] font-black tracking-widest active:scale-95 disabled:opacity-30 transition-all flex items-center justify-center ml-1">DEL</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* MENSAJE DE FRACASO COMÚN */}
                            {status === 'FAILED' && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-4 bg-red-900/30 border border-red-500/30 rounded-xl text-center shadow-lg">
                                    <h3 className="text-red-400 font-bebas text-lg tracking-widest">NÚCLEO DESESTABILIZADO</h3>
                                    <p className="text-[10px] text-red-200/60 mb-3">
                                        {selectedLevel === 1
                                            ? `Has agotado los 6 intentos tácticos. El código era ${secretCode.join('')}.`
                                            : selectedLevel === 2
                                                ? `Secuencia incorrecta.`
                                                : selectedLevel === 3
                                                    ? `Has agotado tus intentos. La frase era: ${cryptoPhrase}`
                                                    : `Has agotado tus intentos. La palabra era: ${wordleWord}`}
                                    </p>
                                    <button onClick={() => {
                                        if (selectedLevel === 1) generateCode();
                                        if (selectedLevel === 2) { setMemoryLevel(1); startMemorySequence(1); }
                                        if (selectedLevel === 3) startCrypto();
                                        if (selectedLevel === 4) startWordle();
                                    }} className="px-6 py-2 bg-red-600 text-white font-bebas rounded hover:bg-red-500 shadow-lg tracking-widest active:scale-95 transition-all text-sm flex items-center justify-center gap-2 mx-auto">
                                        <RotateCcw size={14} /> REINTENTAR PROTOCOLO
                                    </button>
                                </motion.div>
                            )}

                        </motion.div>
                    )}

                    {gameState === 'RESOLVING' && (
                        <motion.div
                            key="resolving"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="min-h-full flex flex-col items-center justify-center text-center gap-4 py-8"
                        >
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                                <Trophy size={32} className="text-green-500" />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-2xl font-bebas tracking-widest text-[#FFB700]">ÉXITO TÁCTICO</h2>
                                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Código Descifrado Exitosamente</p>
                            </div>
                            <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5 w-full max-w-[200px] shadow-inner">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[9px] text-gray-500 font-black tracking-widest">XP ADQUIRIDOS</span>
                                    <span className="text-sm font-bebas text-green-400">+{Math.floor(((selectedLevel || 1) - 1) / 10) + 1} XP</span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[9px] text-gray-500 font-black tracking-widest">TIEMPO EMPLEADO</span>
                                    <span className="text-sm font-bebas text-white">{finalTime}s</span>
                                </div>
                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: '100% ' }}
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                        className="h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={() => setGameState('MAP')}
                                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bebas tracking-[0.15em] hover:bg-blue-500 transition-all active:scale-95 text-sm shadow-lg shadow-blue-600/20 mt-4"
                            >
                                CONTINUAR AVANCE
                            </button>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

            {/* HUD DE PROGRESO INFERIOR (COMPACTO Y FIJO) */}
            <div className="p-2 bg-black/90 backdrop-blur-xl border-t border-white/5 flex justify-center gap-6 shadow-[0_-10px_20px_rgba(0,0,0,0.5)] shrink-0">
                <div className="text-center">
                    <p className="text-[5px] text-gray-500 uppercase font-black mb-0 tracking-widest leading-none">PROGRESO</p>
                    <p className="text-[10px] font-bebas tracking-widest text-[#FFB700] leading-tight mt-0.5">{Math.floor((currentIqLevel / 100) * 100)}%</p>
                </div>
                <div className="text-center">
                    <p className="text-[5px] text-gray-500 uppercase font-black mb-0 tracking-widest leading-none">NIVEL GLOBAL</p>
                    <p className="text-[10px] font-bebas tracking-widest text-white leading-tight mt-0.5">{currentIqLevel}/100</p>
                </div>
            </div>
        </div>
    );
};

export default TacticalIQ;
