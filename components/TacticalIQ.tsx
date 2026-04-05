import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Star, Zap, Trophy, HelpCircle, ChevronRight, X, BookOpen, Lightbulb, ChevronLeft, Lock, CheckCircle2, RotateCcw } from 'lucide-react';
import { Agent, IQLevel } from '../types';
import { submitIQLevelComplete } from '../services/supabaseService';
import { supabase } from '../services/supabaseClient';
import { LORE_DATA } from './TacticalLore';

interface TacticalIQProps {
    currentUser: Agent | null;
    onClose: () => void;
    onUpdateNeeded?: () => void;
}

// Las 12 Puertas de Jerusalén (Nehemías 3) - 4 misiones por puerta = 48 Niveles
const LEVELS: IQLevel[] = Array.from({ length: 48 }, (_, i) => {
    const level = i + 1;
    const doorIndex = Math.floor(i / 4) + 1;
    const doorPhase = (i % 4) + 1;

    const descriptions = [
        "PUERTA DE LAS OVEJAS: Decodifica el patrón numérico.",
        "PUERTA DEL PESCADO: Decodifica el patrón numérico.",
        "PUERTA VIEJA: Decodifica el patrón numérico.",
        "PUERTA DEL VALLE: Decodifica el patrón numérico.",
        "PUERTA DEL MULADAR: Decodifica el patrón numérico.",
        "PUERTA DE LA FUENTE: Decodifica el patrón numérico.",
        "PUERTA DE LAS AGUAS: Resuelve el Enigma de los Cántaros.",
        "PUERTA DE LOS CABALLOS: Completa el recorrido del jinete.",
        "PUERTA ORIENTAL: Restaura las Torres de la Ciudad.",
        "PUERTA DEL JUICIO: Completa la Criba de Justicia.",
        "PUERTA DE EFRAÍN: Resuelve el Cuadrado Mágico.",
        "PUERTA DE LA CÁRCEL: Decodifica el patrón numérico FINAL."
    ];

    const puzzleHints = [
        "Usa la lógica de descartes. El color verde indica posición exacta.",
        "Memoriza los bloques que parpadean. La secuencia aumenta cada vez.",
        "Cada símbolo corresponde a una letra. Busca patrones de palabras comunes.",
        "Identifica la palabra de 5 letras. Verde: Letra correcta. Amarillo: Posición incorrecta.",
        "Apaga todas las luces. Cada clic invierte la celda y sus vecinas.",
        "Conecta la fuente con el destino rotando las tuberías.",
        "Transfiere agua entre cántaros para obtener la medida exacta.",
        "Mueve el caballo en 'L' para llegar al destino evitando obstáculos.",
        "Mueve todos los discos a la tercera torre. Un disco grande no puede ir sobre uno pequeño.",
        "Completa la cuadrícula sin repetir números en filas o columnas.",
        "Suma las filas, columnas y diagonales para obtener el número objetivo.",
        "Nivel Máximo: Decodificación de alta seguridad con 5 dígitos."
    ];

    return {
        level,
        question: `${descriptions[doorIndex - 1]} (Fase ${doorPhase}/4)`,
        answer: "",
        options: [],
        hint: puzzleHints[doorIndex - 1],
        bibleClue: {
            verse: "Restaurando la ciudad con sabiduría y estrategia.",
            reference: `Puerta ${doorIndex}`
        }
    };
});

export type FeedbackType = 'green' | 'yellow' | 'gray';

const TacticalIQ: React.FC<TacticalIQProps> = ({ currentUser, onClose, onUpdateNeeded }) => {
    const [currentIqLevel, setCurrentIqLevel] = useState(currentUser?.iqLevel || 1);
    const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
    const [gameState, setGameState] = useState<'MAP' | 'PLAYING' | 'RESOLVING' | 'EXAM'>('MAP');
    const [showHint, setShowHint] = useState(false);
    const [showBibleClue, setShowBibleClue] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showIntro, setShowIntro] = useState(!localStorage.getItem('hide_iq_intro'));

    // Mastermind (Puerta 1) State
    const [secretCode, setSecretCode] = useState<string[]>([]);
    const [attempts, setAttempts] = useState<{ guess: string[], feedback: FeedbackType[] }[]>([]);
    const [currentGuess, setCurrentGuess] = useState<string[]>([]);
    const [status, setStatus] = useState<'PLAYING' | 'FAILED' | 'MEM_SHOWING' | 'SUBMITTING' | 'TRANSITIONING'>('PLAYING');

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

    // Purga de Sistema (Lights Out) (Puerta 5) State
    const [lightsOutGrid, setLightsOutGrid] = useState<boolean[]>(Array(9).fill(false));
    const [lightsOutMoves, setLightsOutMoves] = useState(0);

    // Conexiones de la Fuente (Pipes) (Puerta 6) State
    const [pipesGrid, setPipesGrid] = useState<{ type: number, rot: number }[]>([]);
    const [pipeMoves, setPipeMoves] = useState(0);
    const [pipeLevel, setPipeLevel] = useState(1);
    const [pipeGridSize, setPipeGridSize] = useState(4);

    // Ruta Táctica (Caballo) (Puerta 7) State
    const [knightPos, setKnightPos] = useState(0);
    const [knightTarget, setKnightTarget] = useState(15);
    const [knightMovesCount, setKnightMovesCount] = useState(0);
    const [knightLevel, setKnightLevel] = useState(1);
    const [knightGridSize, setKnightGridSize] = useState(4);
    const [knightObstacles, setKnightObstacles] = useState<number[]>([]);

    // Torres de la Ciudad (Hanoi) (Puerta 9) State
    const [hanoiTowers, setHanoiTowers] = useState<number[][]>([[3, 2, 1], [], []]);
    const [hanoiSelectedTower, setHanoiSelectedTower] = useState<number | null>(null);
    const [hanoiMoves, setHanoiMoves] = useState(0);
    const [hanoiLevel, setHanoiLevel] = useState(1);

    // Criba de Justicia (Sudoku) (Puerta 10) State
    const [sudokuGrid, setSudokuGrid] = useState<(number | null)[]>([]);
    const [sudokuInitial, setSudokuInitial] = useState<boolean[]>([]);
    const [sudokuLevel, setSudokuLevel] = useState(1);
    const [sudokuSize, setSudokuSize] = useState(4);

    // Enigma de los Cántaros (Puerta 7) State
    const [jugA, setJugA] = useState(0);
    const [jugB, setJugB] = useState(0);
    const [jugACap, setJugACap] = useState(3);
    const [jugBCap, setJugBCap] = useState(5);
    const [jugTarget, setJugTarget] = useState(4);
    const [jugLevel, setJugLevel] = useState(1);

    // ESTADOS PUERTA 11 (CUADRADO MÁGICO)
    const [magicSquareGrid, setMagicSquareGrid] = useState<(number | null)[]>(Array(9).fill(null));
    const [magicSquareLevel, setMagicSquareLevel] = useState(1);
    const [magicSquareTarget, setMagicSquareTarget] = useState(15);
    const [magicSquareSelectedIdx, setMagicSquareSelectedIdx] = useState<number | null>(null);

    // ESTADOS PUERTA 12 (CÁRCEL / COMBINACIÓN FINAL)
    const [lockCombination, setLockCombination] = useState<string[]>([]);
    const [lockCurrentGuess, setLockCurrentGuess] = useState<string[]>([]);
    const [lockAttempts, setLockAttempts] = useState<{ guess: string[], feedback: any[] }[]>([]);

    // Pistas y Curriculum Bíblico (Lore) State
    const [hintsUsed, setHintsUsed] = useState(0);
    const [revealedPipePath, setRevealedPipePath] = useState<number[]>([]);
    const correctPipePathRef = useRef<number[]>([]);
    const [highlightedPipeIndex, setHighlightedPipeIndex] = useState<number | null>(null);
    const [currentLoreIndex, setCurrentLoreIndex] = useState(0);
    const [showLoreModal, setShowLoreModal] = useState(false);
    const [loreSelectedOption, setLoreSelectedOption] = useState<number | null>(null);
    const [loreFeedback, setLoreFeedback] = useState<'success' | 'error' | null>(null);

    // Speed / Timer State
    const [startTime, setStartTime] = useState<number | null>(null);
    const [finalTime, setFinalTime] = useState<number>(0);

    // ESTADOS DE EXAMEN Y REINICIO
    const [showResetNotice, setShowResetNotice] = useState(false);
    const [currentExamIndex, setCurrentExamIndex] = useState(0);
    const [examScore, setExamScore] = useState(0);
    const [examQuestions, setExamQuestions] = useState<any[]>([]);
    const [isFinalizing, setIsFinalizing] = useState(false);

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
                wordleCurrentGuess,
                lightsOutGrid,
                lightsOutMoves,
                pipesGrid,
                pipeMoves,
                pipeLevel,
                pipeGridSize,
                knightPos,
                knightTarget,
                knightMovesCount,
                knightLevel,
                knightGridSize,
                knightObstacles,
                hanoiTowers,
                hanoiSelectedTower,
                hanoiMoves,
                hanoiLevel,
                sudokuGrid,
                sudokuInitial,
                sudokuLevel,
                sudokuSize,
                jugA,
                jugB,
                jugACap,
                jugBCap,
                jugTarget,
                jugLevel
            };
            localStorage.setItem(`iq_state_${currentUser.id}_level${selectedLevel}`, JSON.stringify(stateToSave));
        } else if ((status === 'FAILED' || gameState === 'RESOLVING') && selectedLevel && currentUser) {
            localStorage.removeItem(`iq_state_${currentUser.id}_level${selectedLevel}`);
        }
    }, [secretCode, attempts, currentGuess, status, startTime, showHint, showBibleClue, memoryPattern, memoryPlayerGuess, memoryLevel, cryptoPhrase, cryptoCipher, cryptoGuess, cryptoMistakes, wordleWord, wordleGuesses, wordleCurrentGuess, lightsOutGrid, lightsOutMoves, pipesGrid, pipeMoves, pipeLevel, pipeGridSize, knightPos, knightTarget, knightMovesCount, knightLevel, knightGridSize, knightObstacles, hanoiTowers, hanoiSelectedTower, hanoiMoves, hanoiLevel, sudokuGrid, sudokuInitial, sudokuLevel, sudokuSize, jugA, jugB, jugACap, jugBCap, jugTarget, jugLevel, gameState, selectedLevel, currentUser]);

    // Generador Puerta 1
    const generateCode = () => {
        const isLevel12 = selectedLevel === 12;
        const length = isLevel12 ? 5 : 4;
        const range = isLevel12 ? 10 : 6;
        const offset = isLevel12 ? 0 : 1;

        const newCode = Array.from({ length }, () => Math.floor(Math.random() * range) + offset + "");
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

        // Codificador 1 a 1: mapeo a caracteres rúnicos / símbolos
        const chars = "!@#$%^&*_+-=<>/?XYZWQK".split('');
        // Shuffle chars
        for (let i = chars.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [chars[i], chars[j]] = [chars[j], chars[i]];
        }

        const cipherMap: Record<string, string> = {};
        let charIndex = 0;

        // Crear mapa 1 a 1 para las letras únicas de la frase
        for (let i = 0; i < phrase.length; i++) {
            const l = phrase[i];
            if (l !== " " && !cipherMap[l]) {
                cipherMap[l] = chars[charIndex++];
            }
        }

        let ciphered = "";
        for (let i = 0; i < phrase.length; i++) {
            if (phrase[i] === " ") ciphered += " ";
            else ciphered += cipherMap[phrase[i]];
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

    const toggleLightsOutCells = (currentGrid: boolean[], index: number) => {
        const newGrid = [...currentGrid];
        const row = Math.floor(index / 3);
        const col = index % 3;

        newGrid[index] = !newGrid[index]; // Centro
        if (row > 0) newGrid[index - 3] = !newGrid[index - 3]; // Arriba
        if (row < 2) newGrid[index + 3] = !newGrid[index + 3]; // Abajo
        if (col > 0) newGrid[index - 1] = !newGrid[index - 1]; // Izquierda
        if (col < 2) newGrid[index + 1] = !newGrid[index + 1]; // Derecha

        return newGrid;
    };

    // Generador Puerta 6 (Pipes)
    const startPipes = (stage: number = 1) => {
        let size = 4;
        if (stage === 1) size = 4;
        else if (stage === 2) size = 5;
        else size = 6;

        // Dynamic guaranteed path generator
        const pathDefs: Record<number, number> = {};
        let r = 0, c = 0;
        const route = [{ r, c }];
        const pathIndices: number[] = [0];

        while (r < size - 1 || c < size - 1) {
            if (r === size - 1) c++;
            else if (c === size - 1) r++;
            else {
                if (Math.random() > 0.5) c++; else r++;
            }
            route.push({ r, c });
            pathIndices.push(r * size + c);
        }
        correctPipePathRef.current = pathIndices;

        for (let i = 0; i < route.length; i++) {
            const curr = route[i];
            const prev = i > 0 ? route[i - 1] : { r: curr.r, c: curr.c - 1 }; // init from West
            const next = i < route.length - 1 ? route[i + 1] : { r: curr.r, c: curr.c + 1 }; // exit to East

            const drIn = curr.r - prev.r;
            const dcIn = curr.c - prev.c;
            const drOut = next.r - curr.r;
            const dcOut = next.c - curr.c;

            // if we keep moving in the same direction, it's a straight pipe (0), otherwise corner (1)
            if (drIn === drOut && dcIn === dcOut) {
                pathDefs[curr.r * size + curr.c] = 0;
            } else {
                pathDefs[curr.r * size + curr.c] = 1;
            }
        }

        const newBoard = Array.from({ length: size * size }, (_, i) => {
            const t = pathDefs[i] !== undefined ? pathDefs[i] : (Math.random() > 0.5 ? 1 : 0);
            return { type: t, rot: Math.floor(Math.random() * 4) };
        });

        setPipesGrid(newBoard);
        setPipeMoves(0);
        setPipeLevel(stage);
        setPipeGridSize(size);
        setStatus('PLAYING');
        if (stage === 1) setStartTime(Date.now());
    };

    // Generador Puerta 5 (Lights Out)
    const startLightsOut = () => {
        let grid = Array(9).fill(false);
        const clicks = Math.floor(Math.random() * 6) + 5; // Simular 5 a 10 desordenamientos aleatorios viables
        for (let i = 0; i < clicks; i++) {
            const idx = Math.floor(Math.random() * 9);
            grid = toggleLightsOutCells(grid, idx);
        }
        if (grid.every(val => val === false)) {
            grid = toggleLightsOutCells(grid, 4);
        }
        setLightsOutGrid(grid);
        setLightsOutMoves(0);
        setStatus('PLAYING');
        setStartTime(Date.now());
    };

    // Generador Puerta 7 (Caballo)
    const startKnight = (stage: number = 1) => {
        let size = 4;
        let target = 15;
        let obs: number[] = [];

        if (stage === 1) { // 4x4
            size = 4;
            target = 15;
            obs = [];
        } else if (stage === 2) { // 5x5
            size = 5;
            target = 24;
            obs = [6, 8, 12, 16, 18];
        } else { // 6x6
            size = 6;
            target = 35;
            obs = [14, 15, 20, 21, 22];
        }

        setKnightLevel(stage);
        setKnightGridSize(size);
        setKnightTarget(target);
        setKnightObstacles(obs);
        setKnightPos(0);
        setKnightMovesCount(0);
        setStatus('PLAYING');
        if (stage === 1) setStartTime(Date.now());
    };

    // Generador Puerta 9 (Hanoi)
    const startHanoi = (stage: number = 1) => {
        const diskCount = 2 + stage; // Stage 1: 3, Stage 2: 4, Stage 3: 5
        const disks = Array.from({ length: diskCount }, (_, i) => diskCount - i);
        setHanoiTowers([disks, [], []]);
        setHanoiSelectedTower(null);
        setHanoiMoves(0);
        setHanoiLevel(stage);
        setStatus('PLAYING');
        if (stage === 1) setStartTime(Date.now());
    };

    // Generador Puerta 7 (Enigma de los Cántaros)
    const startJugs = (stage: number = 1) => {
        let target = 4;
        let capA = 3;
        let capB = 5;

        if (stage === 2) { target = 6; capA = 4; capB = 9; }
        else if (stage === 3) { target = 8; capA = 5; capB = 12; }

        setJugACap(capA);
        setJugBCap(capB);
        setJugTarget(target);
        setJugA(0);
        setJugB(0);
        setJugLevel(stage);
        setStatus('PLAYING');
        if (stage === 1) setStartTime(Date.now());
    };

    // Generador Puerta 10 (Sudoku)
    const startSudoku = (stage: number = 1) => {
        const size = stage === 3 ? 6 : 4;
        const newGrid = Array(size * size).fill(null);
        const initial = Array(size * size).fill(false);

        // Generador simple de Sudoku/Cuadrado Latino
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const val = ((i + j) % size) + 1;
                const idx = i * size + j;
                // Dejamos algunas pistas fijas
                if ((i + j) % 2 === 0) {
                    newGrid[idx] = val;
                    initial[idx] = true;
                }
            }
        }

        setSudokuGrid(newGrid);
        setSudokuInitial(initial);
        setSudokuLevel(stage);
        setSudokuSize(size);
        setStatus('PLAYING');
        if (stage === 1) setStartTime(Date.now());
    };

    // GENERADOR PUERTA 11
    const startMagicSquare = (level: number) => {
        setMagicSquareLevel(level);
        setMagicSquareTarget(15);
        const newGrid = Array(9).fill(null);

        if (level === 1) {
            newGrid[0] = 8;
            newGrid[1] = 1;
            newGrid[2] = 6;
        } else if (level === 2) {
            newGrid[4] = 5;
        } else {
            newGrid[0] = 4;
        }

        setMagicSquareGrid(newGrid);
        setMagicSquareSelectedIdx(null);
        setStatus('PLAYING');
        if (level === 1) setStartTime(Date.now());
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

                        setLightsOutGrid(saved.lightsOutGrid || Array(9).fill(false));
                        setLightsOutMoves(saved.lightsOutMoves || 0);

                        setPipesGrid(saved.pipesGrid || []);
                        setPipeMoves(saved.pipeMoves || 0);
                        setPipeLevel(saved.pipeLevel || 1);
                        setPipeGridSize(saved.pipeGridSize || 4);

                        setKnightPos(saved.knightPos || 0);
                        setKnightTarget(saved.knightTarget || 15);
                        setKnightMovesCount(saved.knightMovesCount || 0);
                        setKnightLevel(saved.knightLevel || 1);
                        setKnightGridSize(saved.knightGridSize || 4);
                        setKnightObstacles(saved.knightObstacles || []);

                        setHanoiTowers(saved.hanoiTowers || [[3, 2, 1], [], []]);
                        setHanoiSelectedTower(saved.hanoiSelectedTower || null);
                        setHanoiMoves(saved.hanoiMoves || 0);
                        setHanoiLevel(saved.hanoiLevel || 1);

                        setMagicSquareGrid(saved.magicSquareGrid || Array(9).fill(null));
                        setMagicSquareLevel(saved.magicSquareLevel || 1);
                        setMagicSquareTarget(saved.magicSquareTarget || 15);

                        setSudokuGrid(saved.sudokuGrid || []);
                        setSudokuInitial(saved.sudokuInitial || []);
                        setSudokuLevel(saved.sudokuLevel || 1);
                        setSudokuSize(saved.sudokuSize || 4);

                        setJugA(saved.jugA || 0);
                        setJugB(saved.jugB || 0);
                        setJugACap(saved.jugACap || 3);
                        setJugBCap(saved.jugBCap || 5);
                        setJugTarget(saved.jugTarget || 4);
                        setJugLevel(saved.jugLevel || 1);

                        // Lógicas de auto-corrección para guardados corruptos/antiguos
                        if (level === 2 && saved.status === 'MEM_SHOWING') {
                            startMemorySequence(saved.memoryLevel || 1);
                        } else if (level === 3 && (!saved.cryptoPhrase || saved.cryptoPhrase.trim() === "")) {
                            startCrypto();
                        } else if (level === 4 && (!saved.wordleWord || saved.wordleWord.trim() === "")) {
                            startWordle();
                        } else if (level === 5 && (!saved.lightsOutGrid || saved.lightsOutGrid.every((light: boolean) => !light))) {
                            startLightsOut();
                        } else if (level === 6 && (!saved.pipesGrid || saved.pipesGrid.length === 0)) {
                            startPipes(1);
                        } else if (level === 8 && saved.knightLevel === undefined) {
                            startKnight(1);
                        } else if (level === 9 && (!saved.hanoiTowers || saved.hanoiTowers[0].length === 0 && saved.hanoiTowers[1].length === 0 && saved.hanoiTowers[2].length === 0)) {
                            startHanoi(1);
                        } else if (level === 10 && (!saved.sudokuGrid || saved.sudokuGrid.length === 0)) {
                            startSudoku(1);
                        } else if (level === 11 && (!saved.magicSquareGrid || saved.magicSquareGrid.every(v => v === null))) {
                            startMagicSquare(1);
                        } else if (level === 7 && saved.jugTarget === undefined) {
                            startJugs(1);
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

    const handleLevelComplete = async () => {
        if (!selectedLevel || !currentUser?.id) return;

        setIsSubmitting(true);
        const timeTaken = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
        setFinalTime(timeTaken);

        try {
            // Usamos submitIQLevelComplete que ya maneja la lógica de la base de datos (acumulación en pozo)
            const res = await submitIQLevelComplete(currentUser.id, selectedLevel, timeTaken);

            if (res.success) {
                if (selectedLevel === 48) {
                    // Generar examen: 1 pregunta aleatoria de cada una de las 12 puertas
                    const pool: any[] = [];
                    for (let i = 1; i <= 12; i++) {
                        const doorClues = LORE_DATA[i] || [];
                        if (doorClues.length > 0) {
                            const randomIdx = Math.floor(Math.random() * doorClues.length);
                            pool.push(doorClues[randomIdx]);
                        }
                    }
                    setExamQuestions(pool);
                    setCurrentExamIndex(0);
                    setExamScore(0);
                    setGameState('EXAM');
                } else {
                    setGameState('RESOLVING');
                    if (selectedLevel === currentIqLevel) setCurrentIqLevel(prev => prev + 1);
                }
                if (onUpdateNeeded) onUpdateNeeded();

                // Limpiar estado guardado del nivel completado
                localStorage.removeItem(`iq_state_${currentUser.id}_level${selectedLevel}`);
            } else {
                alert(`❌ ERROR DE ENLACE: ${res.error || 'NÚCLEO INESTABLE'}`);
            }
        } catch (err: any) {
            console.error("Fallo crítico al completar nivel:", err);
            setStatus('FAILED');
        } finally {
            setIsSubmitting(false);
            // IMPORTANTE: Resetear status de TRANSITIONING a PLAYING si falló la sincronización
            // para que el overlay de bloqueo desaparezca.
            setStatus('PLAYING');
        }
    };

    const handleExamAnswer = async (optionIndex: number) => {
        const isCorrect = optionIndex === examQuestions[currentExamIndex].correctIndex;
        const newScore = isCorrect ? examScore + 1 : examScore;
        setExamScore(newScore);

        if (currentExamIndex < examQuestions.length - 1) {
            setCurrentExamIndex(prev => prev + 1);
        } else {
            setIsSubmitting(true); // Usamos el overlay de cargando para la finalización rpc
            const finalPercentage = Math.round((newScore / examQuestions.length) * 100);

            try {
                // @ts-ignore
                const { error } = await supabase.rpc('finalize_iq_campaign', {
                    p_agent_id_input: currentUser?.id,
                    p_exam_score: finalPercentage
                });

                if (error) throw error;
                setGameState('RESOLVING');
            } catch (err) {
                console.error("Error al finalizar campaña:", err);
                alert("Error al procesar la recompensa final. Contacte al soporte táctico.");
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const startLevelLogic = (level: number) => {
        setShowHint(false);
        setShowBibleClue(false);
        setStartTime(Date.now());
        setShowBriefing(false);

        const doorIndex = Math.floor((level - 1) / 4) + 1;
        const phase = ((level - 1) % 4) + 1;

        if (doorIndex === 1) generateCode(); // Mastermind
        else if (doorIndex === 2) {
            setMemoryLevel(phase);
            startMemorySequence(phase);
        }
        else if (doorIndex === 3) startCrypto();
        else if (doorIndex === 4) startWordle();
        else if (doorIndex === 5) startLightsOut();
        else if (doorIndex === 6) startPipes(phase);
        else if (doorIndex === 7) startJugs(phase);
        else if (doorIndex === 8) startKnight(phase);
        else if (doorIndex === 9) startHanoi(phase);
        else if (doorIndex === 10) startSudoku(phase);
        else if (doorIndex === 11) startMagicSquare(phase);
        else if (doorIndex === 12) generateCode(); // Mastermind Final
    };

    const handleNumberPress = (num: string) => {
        const length = selectedLevel === 12 ? 5 : 4;
        if (currentGuess.length < length && status === 'PLAYING' && !isSubmitting) {
            setCurrentGuess(prev => [...prev, num]);
        }
    };

    const handleDelete = () => {
        if (currentGuess.length > 0 && status === 'PLAYING' && !isSubmitting) {
            setCurrentGuess(prev => prev.slice(0, -1));
        }
    };

    const submitGuess = async () => {
        const length = selectedLevel === 12 ? 5 : 4;
        if (currentGuess.length !== length || status !== 'PLAYING' || !currentUser || !selectedLevel || isSubmitting) return;

        // Evaluar lógica Mastermind / Wordle
        const feedback: FeedbackType[] = new Array(length).fill('gray');
        const secretCopy = [...secretCode];
        const guessCopy = [...currentGuess];

        // 1ra pasada: Verdes (Match exacto posición y valor)
        for (let i = 0; i < length; i++) {
            if (guessCopy[i] === secretCopy[i]) {
                feedback[i] = 'green';
                secretCopy[i] = 'MATCHED';
                guessCopy[i] = 'USED'; // Para que no cuente como amarillo después
            }
        }

        // 2da pasada: Amarillos (Match valor diferente posición)
        for (let i = 0; i < length; i++) {
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
            handleLevelComplete();
        } else if (newAttempts.length >= (selectedLevel === 12 ? 15 : 6)) {
            setStatus('FAILED');
        }
    };

    // CONTROLADORES PUERTA 9
    const handleHanoiClick = async (towerIndex: number) => {
        if (status !== 'PLAYING' || isSubmitting) return;

        if (hanoiSelectedTower === null) {
            // Seleccionar torre de origen (si no está vacía)
            if (hanoiTowers[towerIndex].length > 0) {
                setHanoiSelectedTower(towerIndex);
            }
        } else {
            // Mover disco
            if (hanoiSelectedTower === towerIndex) {
                // Deseleccionar si toca la misma
                setHanoiSelectedTower(null);
                return;
            }

            const sourceTower = hanoiTowers[hanoiSelectedTower];
            const targetTower = hanoiTowers[towerIndex];
            const movingDisk = sourceTower[sourceTower.length - 1];
            const topDiskTarget = targetTower[targetTower.length - 1];

            if (!topDiskTarget || movingDisk < topDiskTarget) {
                // Movimiento válido
                const newTowers = hanoiTowers.map((t, i) => {
                    if (i === hanoiSelectedTower) return t.slice(0, -1);
                    if (i === towerIndex) return [...t, movingDisk];
                    return t;
                });

                setHanoiTowers(newTowers);
                setHanoiSelectedTower(null);
                setHanoiMoves(prev => prev + 1);

                // Win Condition Stage
                if (newTowers[2].length === (2 + hanoiLevel)) {
                    setStatus('TRANSITIONING');
                    if (hanoiLevel < 3) {
                        const nextLevel = hanoiLevel + 1;
                        setHanoiLevel(nextLevel);
                        setTimeout(() => startHanoi(nextLevel), 1000);
                    } else {
                        handleLevelComplete();
                    }
                }
            } else {
                // Movimiento inválido - Feedback visual rápido (opcional, por ahora nada)
            }
        }
    };

    // CONTROLADORES PUERTA 7 (ENIGMA DE LOS CÁNTAROS)
    const handleJugFill = (jug: 'A' | 'B') => {
        if (status !== 'PLAYING' || isSubmitting) return;
        if (jug === 'A') setJugA(jugACap);
        else setJugB(jugBCap);
    };

    const handleJugEmpty = (jug: 'A' | 'B') => {
        if (status !== 'PLAYING' || isSubmitting) return;
        if (jug === 'A') setJugA(0);
        else setJugB(0);
    };

    const handleJugPour = async (from: 'A' | 'B') => {
        if (status !== 'PLAYING' || isSubmitting) return;

        let newA = jugA;
        let newB = jugB;

        if (from === 'A') {
            const transfer = Math.min(jugA, jugBCap - jugB);
            newA -= transfer;
            newB += transfer;
        } else {
            const transfer = Math.min(jugB, jugACap - jugA);
            newB -= transfer;
            newA += transfer;
        }

        setJugA(newA);
        setJugB(newB);

        // Win Condition
        if (newA === jugTarget || newB === jugTarget) {
            setStatus('TRANSITIONING');
            if (jugLevel < 3) {
                const nextLevel = jugLevel + 1;
                setJugLevel(nextLevel);
                setTimeout(() => startJugs(nextLevel), 1000);
            } else {
                handleLevelComplete();
            }
        }
    };

    // CONTROLADORES PUERTA 10
    const handleSudokuCellClick = async (index: number) => {
        if (status !== 'PLAYING' || isSubmitting || sudokuInitial[index]) return;

        const newGrid = [...sudokuGrid];
        const currentVal = newGrid[index] || 0;
        const nextVal = (currentVal % sudokuSize) + 1;
        newGrid[index] = nextVal;
        setSudokuGrid(newGrid);

        // Check Win Condition
        const isComplete = newGrid.every(v => v !== null);
        if (isComplete) {
            // Verificar filas y columnas
            let isValid = true;
            for (let i = 0; i < sudokuSize; i++) {
                const row = newGrid.slice(i * sudokuSize, (i + 1) * sudokuSize);
                const col = Array.from({ length: sudokuSize }, (_, r) => newGrid[r * sudokuSize + i]);

                const rowSet = new Set(row.filter(v => v !== null));
                const colSet = new Set(col.filter(v => v !== null));

                if (rowSet.size !== sudokuSize || colSet.size !== sudokuSize) {
                    isValid = false;
                    break;
                }
            }

            if (isValid) {
                setStatus('TRANSITIONING');
                if (sudokuLevel < 3) {
                    const nextLevel = sudokuLevel + 1;
                    setSudokuLevel(nextLevel);
                    setTimeout(() => startSudoku(nextLevel), 1000);
                } else {
                    handleLevelComplete();
                }
            }
        }
    };

    // CONTROLADORES PUERTA 11
    const handleMagicSquareCellClick = (index: number) => {
        if (status !== 'PLAYING' || isSubmitting) return;
        setMagicSquareSelectedIdx(index);
    };

    const handleMagicSquareNumPress = async (num: number) => {
        if (status !== 'PLAYING' || isSubmitting || magicSquareSelectedIdx === null) return;

        const newGrid = [...magicSquareGrid];
        newGrid[magicSquareSelectedIdx] = num;
        setMagicSquareGrid(newGrid);

        // Validar victoria
        const isComplete = newGrid.every(v => v !== null);
        if (isComplete) {
            const target = magicSquareTarget;
            const checks = [
                [0, 1, 2], [3, 4, 5], [6, 7, 8], // Filas
                [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
                [0, 4, 8], [2, 4, 6]             // Diagonales
            ];

            const isValid = checks.every(group =>
                group.reduce((acc, idx) => acc + (newGrid[idx] || 0), 0) === target
            );

            const uniqueNums = new Set(newGrid.filter(v => v !== null));
            const allUnique = uniqueNums.size === 9;

            if (isValid && allUnique) {
                setStatus('TRANSITIONING');
                if (magicSquareLevel < 3) {
                    const nextLevel = magicSquareLevel + 1;
                    setMagicSquareLevel(nextLevel);
                    setTimeout(() => startMagicSquare(nextLevel), 1000);
                } else {
                    handleLevelComplete();
                }
            }
        }
    };

    // CONTROLADORES PUERTA 2
    const handleMemoryClick = async (blockIndex: number) => {
        if (status !== 'PLAYING' || isSubmitting) return;

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
            setStatus('TRANSITIONING');
            if (memoryLevel < 3) {
                const nextLevel = memoryLevel + 1;
                setMemoryLevel(nextLevel);
                setTimeout(() => startMemorySequence(nextLevel), 1000);
            } else {
                handleLevelComplete();
            }
        }
    };

    // CONTROLADORES PUERTA 3
    const handleCryptoInput = async (char: string) => {
        if (status !== 'PLAYING' || isSubmitting) return;

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
            setStatus('SUBMITTING');
            handleLevelComplete();
        }
    };

    const handleCryptoDelete = () => {
        if (status !== 'PLAYING' || isSubmitting || cryptoGuess.length === 0) return;
        let p = cryptoGuess;
        p = p.slice(0, -1);
        if (p[p.length - 1] === " ") p = p.slice(0, -1);
        setCryptoGuess(p);
    };

    // CONTROLADORES PUERTA 4
    const handleWordleInput = (char: string) => {
        if (status !== 'PLAYING' || isSubmitting || wordleCurrentGuess.length >= 5) return;
        setWordleCurrentGuess(prev => prev + char);
    };

    const handleWordleDelete = () => {
        if (status !== 'PLAYING' || isSubmitting || wordleCurrentGuess.length === 0) return;
        setWordleCurrentGuess(prev => prev.slice(0, -1));
    };

    const submitWordleGuess = async () => {
        if (wordleCurrentGuess.length !== 5 || status !== 'PLAYING' || isSubmitting || !currentUser || !selectedLevel) return;

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
            handleLevelComplete();
        } else if (newGuesses.length >= 6) {
            setStatus('FAILED');
        }
    };

    // CONTROLADORES PUERTA 5
    const handleLightsOutClick = async (index: number) => {
        if (status !== 'PLAYING' || isSubmitting || !currentUser || !selectedLevel) return;

        const newGrid = toggleLightsOutCells(lightsOutGrid, index);
        setLightsOutGrid(newGrid);
        setLightsOutMoves(prev => prev + 1);

        const isWin = newGrid.every(val => val === false);
        if (isWin) {
            handleLevelComplete();
        }
    };

    // CONTROLADORES PUERTA 6
    const handlePipeClick = async (index: number) => {
        if (status !== 'PLAYING' || isSubmitting || !currentUser || !selectedLevel) return;

        const newGrid = [...pipesGrid];
        newGrid[index] = { ...newGrid[index], rot: (newGrid[index].rot + 1) % 4 };
        setPipesGrid(newGrid);
        setPipeMoves(prev => prev + 1);

        // Check win
        const getConnections = (type: number, rot: number) => {
            let base = type === 0 ? [0, 2] : [0, 1]; // 0=Straight(N,S), 1=Curve(N,E)
            return base.map(d => (d + rot) % 4);
        };

        let visited = new Set<number>();
        let currentCell = 0;
        let incomingDirection = 3; // Enters from West
        let isWin = false;
        const totalCells = pipeGridSize * pipeGridSize;

        while (currentCell >= 0 && currentCell < totalCells) {
            if (visited.has(currentCell)) break; // Loop
            visited.add(currentCell);

            const conn = getConnections(newGrid[currentCell].type, newGrid[currentCell].rot);
            if (!conn.includes(incomingDirection)) break; // Broken pipe

            const outgoingAngles = conn.filter(d => d !== incomingDirection);
            if (outgoingAngles.length !== 1) break;
            let outDir = outgoingAngles[0];

            if (currentCell === totalCells - 1 && outDir === 1) { // Exit bottom-right to East
                isWin = true;
                break;
            }

            if (outDir === 0) { // N
                if (currentCell < pipeGridSize) break;
                currentCell -= pipeGridSize; incomingDirection = 2; // Arrives from S
            } else if (outDir === 1) { // E
                if (currentCell % pipeGridSize === pipeGridSize - 1) break;
                currentCell += 1; incomingDirection = 3; // Arrives from W
            } else if (outDir === 2) { // S
                if (currentCell >= totalCells - pipeGridSize) break;
                currentCell += pipeGridSize; incomingDirection = 0; // Arrives from N
            } else if (outDir === 3) { // W
                if (currentCell % pipeGridSize === 0) break;
                currentCell -= 1; incomingDirection = 1; // Arrives from E
            }
        }

        if (isWin) {
            setStatus('TRANSITIONING');
            if (pipeLevel < 3) {
                const nextLevel = pipeLevel + 1;
                setPipeLevel(nextLevel);
                setTimeout(() => startPipes(nextLevel), 600);
            } else {
                handleLevelComplete();
            }
        }
    };

    // CONTROLADOR PUERTA 7 (CABALLO)
    const handleKnightClick = async (index: number) => {
        if (status !== 'PLAYING' || isSubmitting || !currentUser || !selectedLevel) return;

        // Verificar si el movimiento es un movimiento de caballo válido ('L')
        const r1 = Math.floor(knightPos / knightGridSize);
        const c1 = knightPos % knightGridSize;
        const r2 = Math.floor(index / knightGridSize);
        const c2 = index % knightGridSize;

        const rowDiff = Math.abs(r1 - r2);
        const colDiff = Math.abs(c1 - c2);
        const isKnightMove = (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);

        if (!isKnightMove) return; // Movimiento inválido
        if (knightObstacles.includes(index)) return; // Obstáculo

        setKnightPos(index);
        setKnightMovesCount(prev => prev + 1);

        if (index === knightTarget) {
            setStatus('TRANSITIONING');
            if (knightLevel < 3) {
                const nextLevel = knightLevel + 1;
                setKnightLevel(nextLevel);
                setTimeout(() => startKnight(nextLevel), 600);
            } else {
                handleLevelComplete();
            }
        }
    };

    // --- SISTEMA DE PISTAS (Sustentación Táctica) ---
    const requestHint = () => {
        if (hintsUsed >= 5) {
            alert("Has agotado tu sustento táctico (5 max). Debes resolverlo solo.");
            return;
        }
        setShowLoreModal(true);
        setLoreSelectedOption(null);
        setLoreFeedback(null);
    };

    const applyTacticalReveal = (level: number) => {
        if (level === 1 || level === 12) {
            // Mastermind / Lock: Añade el siguiente número correcto
            const length = level === 12 ? 5 : 4;
            const unrevealedIdx = currentGuess.length;
            if (unrevealedIdx < length) {
                const newGuess = [...currentGuess, secretCode[unrevealedIdx]];
                setCurrentGuess(newGuess);
            }
        } else if (level === 2) {
            // Memory: Mostrar patrón un segundo (como un replay)
            setStatus('MEM_SHOWING');
            setActiveMemoryBlock(memoryPattern[memoryPlayerGuess.length]);
            setTimeout(() => {
                const block = memoryPattern[memoryPlayerGuess.length];
                handleMemoryClick(block);
            }, 600);
        } else if (level === 3) {
            // Criptograma: Rellenar primera letra vacía
            const emptyIdx = cryptoCipher.split("").findIndex((c, i) => c !== " " && (!cryptoGuess || cryptoGuess[i] === " " || cryptoGuess[i] === "_"));
            if (emptyIdx >= 0) {
                const correctChar = cryptoPhrase[emptyIdx];
                const cipherChar = cryptoCipher[emptyIdx];
                handleCryptoInput(correctChar);
            }
        } else if (level === 4) {
            // Wordle: Poner letra correcta no encontrada
            const missingVars = wordleWord.split("").filter(l => !wordleGuesses.some(g => g.feedback[wordleWord.indexOf(l)] === 'green'));
            if (missingVars.length > 0 && wordleCurrentGuess.length < 5) {
                handleWordleInput(missingVars[0]);
            }
        } else if (level === 5) {
            // Lights Out: Apagar un foco encendido
            const redIndex = lightsOutGrid.findIndex(l => l === true);
            if (redIndex >= 0) {
                const newGrid = [...lightsOutGrid];
                newGrid[redIndex] = false;
                setLightsOutGrid(newGrid);
            }
        } else if (level === 6) {
            if (correctPipePathRef.current.length > 0) {
                setRevealedPipePath(correctPipePathRef.current);
                setTimeout(() => setRevealedPipePath([]), 3000);
            }
            return;
        } else if (level === 7) {
            // Cántaros: El sistema ejecuta un movimiento útil
            if (jugA < jugACap) setJugA(jugACap);
            else if (jugB < jugBCap) {
                const transfer = Math.min(jugA, jugBCap - jugB);
                setJugA(prev => prev - transfer);
                setJugB(prev => prev + transfer);
            } else setJugB(0);
        } else if (level === 8) {
            // Caballos: Hint visual o movimiento automático
            const moves = [
                { r: -2, c: -1 }, { r: -2, c: 1 }, { r: -1, c: -2 }, { r: -1, c: 2 },
                { r: 1, c: -2 }, { r: 1, c: 2 }, { r: 2, c: -1 }, { r: 2, c: 1 }
            ];
            const r1 = Math.floor(knightPos / knightGridSize);
            const c1 = knightPos % knightGridSize;
            const rTarget = Math.floor(knightTarget / knightGridSize);
            const cTarget = knightTarget % knightGridSize;

            for (const m of moves) {
                const nr = r1 + m.r, nc = c1 + m.c;
                if (nr >= 0 && nr < knightGridSize && nc >= 0 && nc < knightGridSize) {
                    const nIdx = nr * knightGridSize + nc;
                    if (Math.abs(nr - rTarget) + Math.abs(nc - cTarget) < Math.abs(r1 - rTarget) + Math.abs(c1 - cTarget)) {
                        handleKnightClick(nIdx);
                        return;
                    }
                }
            }
        } else if (level === 9) {
            // Hanoi: Ejecutar un movimiento válido
            const fromTower = hanoiTowers.findIndex(t => t.length > 0);
            if (fromTower !== -1) {
                const disk = hanoiTowers[fromTower][hanoiTowers[fromTower].length - 1];
                const toTower = (fromTower + 1) % 3;
                if (hanoiTowers[toTower].length === 0 || hanoiTowers[toTower][hanoiTowers[toTower].length - 1] > disk) {
                    const newTowers = [...hanoiTowers.map(t => [...t])];
                    newTowers[fromTower].pop();
                    newTowers[toTower].push(disk);
                    setHanoiTowers(newTowers);
                    setHanoiMoves(prev => prev + 1);
                }
            }
        } else if (level === 10) {
            // Sudoku: Revelar una celda vacía con un número válido (no necesariamente la única solución)
            const emptyIdx = sudokuGrid.findIndex(v => v === 0);
            if (emptyIdx !== -1) {
                const newGrid = [...sudokuGrid];
                const size = sudokuSize;
                const row = Math.floor(emptyIdx / size);
                const col = emptyIdx % size;
                // Buscar un número que no esté en fila/col
                for (let n = 1; n <= size; n++) {
                    const inRow = newGrid.slice(row * size, (row + 1) * size).includes(n);
                    const inCol = newGrid.filter((_, i) => i % size === col).includes(n);
                    if (!inRow && !inCol) {
                        newGrid[emptyIdx] = n;
                        setSudokuGrid(newGrid);
                        break;
                    }
                }
            }
        } else if (level === 11) {
            // Cuadrado Mágico: Rellenar celda basada en la solución estándar
            const solution = [8, 1, 6, 3, 5, 7, 4, 9, 2];
            const emptyIdx = magicSquareGrid.findIndex(v => v === null);
            if (emptyIdx !== -1) {
                const newGrid = [...magicSquareGrid];
                newGrid[emptyIdx] = solution[emptyIdx];
                setMagicSquareGrid(newGrid);
            }
        }
    };

    const submitLoreAnswer = () => {
        if (loreSelectedOption === null || !selectedLevel) return;

        const fragments = LORE_DATA[selectedLevel];
        if (!fragments || fragments.length === 0) return;

        const currentFragment = fragments[currentLoreIndex % fragments.length];

        if (loreSelectedOption === currentFragment.correctIndex) {
            setLoreFeedback('success');

            setTimeout(() => {
                const penaltySeconds = 30 * Math.pow(2, hintsUsed); // 30, 60, 120...

                if (startTime) {
                    setStartTime(prev => prev ? prev - (penaltySeconds * 1000) : Date.now() - (penaltySeconds * 1000));
                }

                setHintsUsed(prev => prev + 1);
                setCurrentLoreIndex(prev => prev + 1);
                setShowLoreModal(false);

                applyTacticalReveal(selectedLevel);

            }, 1500);

        } else {
            setLoreFeedback('error');
            setTimeout(() => {
                setShowLoreModal(false);
                setTimeout(() => setLoreFeedback(null), 500);
            }, 2000);
        }
    };


    // RENDERIZADORES PUERTA 4
    const renderWordleRow = (index: number) => {
        const isCurrentRow = index === wordleGuesses.length;
        const isPastRow = index < wordleGuesses.length;

        const getBgColor = (bgFeed: FeedbackType | undefined) => {
            if (bgFeed === 'green') return 'bg-green-500 border-green-400 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]';
            if (bgFeed === 'yellow') return 'bg-yellow-500 border-yellow-400 text-white';
            if (bgFeed === 'gray') return 'bg-gray-800 border-gray-600 text-gray-500 opacity-60';
            return 'bg-blue-900 border-blue-500 text-blue-100';
        };

        return (
            <div key={index} className="flex justify-center gap-2 mb-2 w-full">
                {[0, 1, 2, 3, 4].map(pos => {
                    const letter = isPastRow ? wordleGuesses[index].guess[pos] : (isCurrentRow && wordleCurrentGuess[pos] ? wordleCurrentGuess[pos] : '');
                    const bgColor = isPastRow ? getBgColor(wordleGuesses[index].feedback[pos]) : (letter ? 'bg-[#001d3d] border-blue-500/30 text-blue-100 shadow-[inset_0_0_8px_rgba(59,130,246,0.2)]' : 'bg-[#001d3d]/30 border-white/5');

                    return (
                        <div key={pos} className={`w-12 h-14 sm:w-14 sm:h-16 rounded-lg border-2 flex items-center justify-center font-bebas text-2xl tracking-widest transition-all duration-300 ${bgColor}`}>
                            {letter}
                        </div>
                    );
                })}
            </div>
        );
    };

    // RENDERIZADORES PUERTA 1
    const renderAttemptRow = (index: number) => {
        const length = selectedLevel === 12 ? 5 : 4;
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
                {Array.from({ length }).map((_, col) => {
                    let digit = '';
                    let feedbackColorClass = 'bg-white/5 border-white/10 text-white/20';

                    if (isPastRow) {
                        digit = attempts[index].guess[col];
                        feedbackColorClass = getBgColor(attempts[index].feedback[col]);
                    } else if (isCurrentRow && currentGuess[col]) {
                        digit = currentGuess[col];
                        feedbackColorClass = 'border-blue-400 text-blue-100 shadow-[0_0_10px_rgba(59,130,246,0.2)] bg-blue-500/20';
                    }

                    return (
                        <div key={col} className={`${selectedLevel === 12 ? 'w-8 h-8 sm:w-10 sm:h-10' : 'w-10 h-10 sm:w-12 sm:h-12'} border-2 rounded-lg flex items-center justify-center text-xl sm:text-2xl font-bebas transition-all duration-300 ${feedbackColorClass}`}>
                            {digit}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 h-[100dvh] z-50 bg-[#000814] text-white font-montserrat overflow-hidden flex flex-col">
            {/* HEADER TÁCTICO */}
            <div className="p-3 pt-[env(safe-area-inset-top)] border-b border-white/5 flex justify-between items-center bg-black/60 backdrop-blur-md z-10 shrink-0">
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
                            className="pb-24 pt-4 max-w-md mx-auto space-y-8"
                        >
                            <div className="text-center mb-6">
                                <h3 className="text-[#FFB700] font-bebas tracking-[0.3em] text-xl">RECONSTRUCCIÓN DE JERUSALÉN</h3>
                                <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest mt-1 opacity-60">48 Desafíos • 12 Puertas de Restauración</p>
                            </div>

                            {Array.from({ length: 12 }).map((_, doorIdx) => {
                                const doorNum = doorIdx + 1;
                                const isDoorLocked = doorNum > Math.ceil(currentIqLevel / 4);

                                return (
                                    <div key={`door-${doorNum}`} className={`p-4 rounded-2xl border ${isDoorLocked ? 'bg-black/40 border-white/5 opacity-40 grayscale' : 'bg-[#001d3d]/40 border-blue-500/20 shadow-[0_0_20px_rgba(0,0,0,0.4)]'}`}>
                                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1.5 rounded-lg border ${isDoorLocked ? 'bg-gray-800 text-gray-500' : 'bg-blue-600 border-blue-400 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]'}`}>
                                                    <Lock size={12} />
                                                </div>
                                                <h4 className="font-bebas tracking-widest text-sm text-white">PUERTA {doorNum}: {LORE_DATA[doorNum]?.[0]?.title || "EN CONSTRUCCIÓN"}</h4>
                                            </div>
                                            <span className="text-[8px] font-black text-blue-300 opacity-60 uppercase tracking-widest">Sectores: 4</span>
                                        </div>

                                        <div className="grid grid-cols-4 gap-2">
                                            {[1, 2, 3, 4].map(phase => {
                                                const lvlNum = (doorIdx * 4) + phase;
                                                const isLvlLocked = lvlNum > currentIqLevel;
                                                const isLvlCompleted = lvlNum < currentIqLevel;
                                                const isActive = lvlNum === currentIqLevel;

                                                return (
                                                    <button
                                                        key={`lvl-${lvlNum}`}
                                                        disabled={isLvlLocked}
                                                        onClick={() => handleLevelSelect(lvlNum)}
                                                        className={`aspect-square rounded-xl border flex flex-col items-center justify-center transition-all relative group overflow-hidden ${isLvlLocked
                                                            ? 'bg-black/60 border-white/5 text-white/5'
                                                            : isLvlCompleted
                                                                ? 'bg-green-500/10 border-green-500/30 text-green-500'
                                                                : isActive
                                                                    ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] animate-pulse'
                                                                    : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                                                            }`}
                                                    >
                                                        <span className="text-[10px] font-bebas tracking-widest leading-none">F{phase}</span>
                                                        {isLvlCompleted && <CheckCircle2 size={10} className="mt-1" />}
                                                        {!isLvlLocked && !isLvlCompleted && !isActive && <span className="text-[6px] font-black mt-1 opacity-50">LISTO</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
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
                            {(() => {
                                const doorIdx = Math.floor((selectedLevel - 1) / 4) + 1;
                                return (
                                    <>
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
                                                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute z-[55] inset-0 bg-black/95 flex flex-col items-center justify-center p-6 text-center shadow-2xl backdrop-blur-md rounded-t-3xl border-t border-blue-500/30">
                                                    <div className="bg-gradient-to-b from-[#001d3d] to-black border border-blue-500/20 p-6 rounded-2xl max-w-sm w-full relative shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                                                        <button onClick={() => { if (startTime) setShowBriefing(false); else setGameState('MAP'); }} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"><X size={18} /></button>
                                                        <div className="w-12 h-12 bg-blue-500/20 rounded-xl mx-auto flex items-center justify-center mb-4 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                                                            <BookOpen className="text-blue-400" size={24} />
                                                        </div>

                                                        {(() => {
                                                            const doorIdx = Math.floor((selectedLevel! - 1) / 4) + 1;
                                                            const phaseIdx = (selectedLevel! - 1) % 4;
                                                            const loreEntry = LORE_DATA[doorIdx]?.[phaseIdx] || LORE_DATA[doorIdx]?.[0];

                                                            return (
                                                                <>
                                                                    <h2 className="text-xl font-bebas tracking-widest text-[#FFB700] mb-0.5 line-clamp-1">{loreEntry?.title || `PUERTA ${doorIdx}`}</h2>
                                                                    <p className="text-[7px] text-blue-400 font-black uppercase tracking-[0.2em] mb-4 border-b border-white/5 pb-3">Crónica de Construcción - Fase {phaseIdx + 1}/4</p>

                                                                    <div className="bg-black/40 p-4 rounded-xl border border-white/5 text-left mb-6 max-h-[160px] overflow-y-auto custom-scrollbar">
                                                                        <p className="text-[11px] text-gray-300 leading-relaxed font-medium">
                                                                            {loreEntry?.text || "Iniciando protocolos de restauración para esta sección de la muralla."}
                                                                        </p>
                                                                    </div>

                                                                    <div className="space-y-3 mb-6">
                                                                        <div className="flex gap-3 items-start text-left">
                                                                            <div className="w-4 h-4 rounded bg-blue-500/20 flex items-center justify-center text-[8px] font-black text-blue-400 border border-blue-500/20 shrink-0 mt-0.5">OBJ</div>
                                                                            <p className="text-[9px] text-white/70 italic">"{LEVELS[selectedLevel! - 1].question.split(':')[1]}"</p>
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            );
                                                        })()}

                                                        <button onClick={() => startLevelLogic(selectedLevel!)} className="w-full px-6 py-3 bg-blue-600 text-white font-bebas tracking-[0.2em] rounded-xl hover:bg-blue-500 shadow-lg shadow-blue-600/20 active:scale-95 transition-all text-sm group flex items-center justify-center gap-2">
                                                            INICIAR CONSTRUCCIÓN <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
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
                                            <button
                                                onClick={requestHint}
                                                className="flex-1 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-center gap-1.5 text-purple-400 text-[9px] font-black tracking-widest uppercase font-bebas active:scale-95 transition-all shadow-sm"
                                            >
                                                <Zap size={12} /> HACK (AYUDA)
                                            </button>
                                        </div>

                                        <AnimatePresence>
                                            {showBibleClue && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="bg-blue-900/20 p-3 rounded-lg border border-blue-500/10 text-center">
                                                    <p className="text-[10px] italic text-blue-200/90 leading-tight mb-1">"{LEVELS[selectedLevel - 1]?.bibleClue?.verse || "Fortalece tus manos para la buena obra."}"</p>
                                                    <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">{LEVELS[selectedLevel - 1]?.bibleClue?.reference || "NehemÃ­as 2:18"}</p>
                                                </motion.div>
                                            )}
                                            {showHint && showBibleClue && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-green-500/5 p-3 rounded-lg border border-green-500/10 text-center">
                                                    <p className="text-[9px] text-green-400 font-bold leading-tight">
                                                        📡 PISTA DE SISTEMA: {selectedLevel === 1 ? 'Observa los colores verdes y amarillos devueltos tras cada intento.' : selectedLevel === 2 ? 'Concéntrate en la forma imaginaria que dibujan los toques en la matriz.' : selectedLevel === 3 ? 'Busca palabras cortas como "EL", "LA" o "DE" como puntos de inicio comunes.' : selectedLevel === 4 ? 'Piensa en las edificaciones que construyó Nehemías a su regreso o en temas del Templo.' : selectedLevel === 5 ? 'Tocar las esquinas primero a veces ayuda. Busca simetrías y secuencias.' : selectedLevel === 6 ? 'Sigue el flujo de agua desde el inicio. Si se te bloquea, es probable que un cruce esté al revés y necesites retroceder dos bloques.' : selectedLevel === 7 ? 'Si necesitas 4 litros con cántaros de 3 y 5: Llena el de 5, pásalo al de 3 (te quedan 2 en el de 5), vacía el de 3, pasa esos 2 al de 3, llena el de 5 y completa el de 3...' : selectedLevel === 9 ? 'Si tienes un número impar de bloques, comienza moviendo el más pequeño a la torre de destino (derecha). Si es par, muévelo a la torre central.' : selectedLevel === 10 ? 'Usa el proceso de eliminación. Si en una fila faltan solo dos números y uno de ellos ya está en la columna de abajo, entonces el otro número va en esa celda.' : 'Un movimiento en L significa: 2 casillas en una dirección y 1 casilla perpendicular. Si estás en una esquina, tus opciones son muy limitadas.'}
                                                    </p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {doorIdx === 1 && (
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
                                        {doorIdx === 2 && (
                                            <div className="mt-4 flex flex-col items-center">
                                                <div className="flex justify-between w-full px-4 mb-4">
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Fase {memoryLevel}/3</span>
                                                    <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">
                                                        {status === 'MEM_SHOWING' ? 'MEmoriza el patrón' : status === 'PLAYING' ? 'Repite el patrón' : ''}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-3 gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-xl shadow-inner mx-auto touch-manipulation">
                                                    {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => {
                                                        const isShowing = status === 'MEM_SHOWING' && activeMemoryBlock === i;

                                                        // Sólo mostramos el estilo 'cliccado' si el jugador está jugando y este bloque fue el *último* que presionó, o está en su arreglo de guesses.
                                                        // NOTA: Para no bloquear múltiples pulsaciones sobre la misma caja, el estilo verde solo será cosmético y no disabled state.
                                                        const isClicked = status === 'PLAYING' && memoryPlayerGuess.includes(i);

                                                        return (
                                                            <button
                                                                key={i}
                                                                disabled={status !== 'PLAYING'}
                                                                onClick={() => handleMemoryClick(i)}
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
                                        {doorIdx === 3 && (
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
                                        {doorIdx === 4 && (
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

                                        {/* INTERFAZ PUERTA 5: PURGA DE SISTEMA (LIGHTS OUT) */}
                                        {doorIdx === 5 && (
                                            <div className="mt-2 flex flex-col items-center w-full px-4">
                                                <div className="flex justify-between w-full mb-4">
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Sectores Corruptos: {lightsOutGrid.filter(x => x).length}</span>
                                                    <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">
                                                        Movimientos: {lightsOutMoves}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-3 gap-2 sm:gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-xl shadow-inner mx-auto w-full max-w-[280px]">
                                                    {lightsOutGrid.map((isRed, idx) => (
                                                        <button
                                                            key={`lo-${idx}`}
                                                            disabled={status !== 'PLAYING'}
                                                            onClick={() => handleLightsOutClick(idx)}
                                                            className={`aspect-square rounded-lg border-2 transition-all duration-300 focus:outline-none flex items-center justify-center ${isRed
                                                                ? 'bg-red-500/20 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:bg-red-500/30 active:scale-95 text-red-400'
                                                                : 'bg-green-500/10 border-green-500/30 text-green-500/50 shadow-inner hover:bg-green-500/20 active:scale-95'
                                                                }`}
                                                        >
                                                            <div className={`w-3 h-3 rounded-full transition-all duration-300 ${isRed ? 'bg-red-400 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-green-500/30'}`} />
                                                        </button>
                                                    ))}
                                                </div>
                                                <p className="text-[9px] text-gray-500 mt-6 text-center italic">Apaga todos los focos de alerta (rojos) para restaurar la integridad de la Puerta.</p>
                                            </div>
                                        )}

                                        {/* INTERFAZ PUERTA 6: CONEXIONES DE LA FUENTE (PIPES) */}
                                        {doorIdx === 6 && (
                                            <div className="mt-2 flex flex-col items-center w-full px-2 sm:px-4">
                                                <div className="flex justify-between w-full mb-4 px-2">
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Fase {pipeLevel}/3</span>
                                                    <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">
                                                        Movimientos: {pipeMoves}
                                                    </span>
                                                </div>

                                                <div className="relative p-2 sm:p-3 bg-white/[0.02] border border-white/5 rounded-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] mx-auto w-full max-w-[280px]">
                                                    {/* IN Indicator */}
                                                    <div className="absolute top-[24px] sm:top-[30px] -left-2 w-4 h-4 sm:w-6 sm:h-6 bg-blue-500 rounded-full flex items-center justify-center animate-pulse z-10 shadow-[0_0_15px_rgba(59,130,246,0.8)]"><div className="w-2 h-2 sm:w-3 sm:h-3 bg-white/80 rounded-full" /></div>
                                                    {/* OUT Indicator */}
                                                    <div className="absolute bottom-[24px] sm:bottom-[30px] -right-2 w-4 h-4 sm:w-6 sm:h-6 bg-gray-800 rounded-full flex items-center justify-center z-10 border-2 border-dashed border-gray-600"></div>

                                                    <div className={`grid gap-1 sm:gap-1.5 touch-manipulation`} style={{ gridTemplateColumns: `repeat(${pipeGridSize}, minmax(0, 1fr))` }}>
                                                        {pipesGrid.map((pipe, idx) => (
                                                            <button
                                                                key={`pipe-${idx}`}
                                                                disabled={status !== 'PLAYING'}
                                                                onClick={() => handlePipeClick(idx)}
                                                                className={`aspect-square bg-[#001d3d]/40 border rounded-md relative overflow-hidden transition-colors hover:bg-blue-900/40 active:scale-95 flex items-center justify-center group ${highlightedPipeIndex === idx || revealedPipePath.includes(idx) ? 'glow-pulse border-[#ffb700] shadow-[0_0_15px_rgba(255,183,0,0.3)] bg-blue-500/10' : 'border-blue-500/10'}`}
                                                            >
                                                                <div className="w-full h-full absolute inset-0 transition-transform duration-300 pointer-events-none" style={{ transform: `rotate(${pipe.rot * 90}deg)` }}>
                                                                    <div className="absolute top-1/2 left-1/2 w-[14px] h-[14px] bg-blue-400/90 rounded-full -mt-[7px] -ml-[7px] z-10 shadow-sm" />
                                                                    {pipe.type === 0 ? (
                                                                        // Straight (N, S)
                                                                        <div className="absolute top-0 left-1/2 -ml-[5px] w-[10px] h-full bg-blue-400/90 rounded-sm shadow-sm" />
                                                                    ) : (
                                                                        // Curve (N, E)
                                                                        <>
                                                                            <div className="absolute top-0 left-1/2 -ml-[5px] w-[10px] h-[58%] bg-blue-400/90 rounded-b-sm shadow-sm" />
                                                                            <div className="absolute top-1/2 left-1/2 -mt-[5px] w-[58%] h-[10px] bg-blue-400/90 rounded-l-sm shadow-sm" />
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <p className="text-[9px] text-gray-500 mt-6 text-center italic">Toca las tuberías para conectarlas de izquierda a derecha sin cortes.</p>
                                            </div>
                                        )}

                                        {/* INTERFAZ PUERTA 7: ENIGMA DE LOS CÁNTAROS (WATER JUGS) */}
                                        {doorIdx === 7 && (
                                            <div className="mt-2 flex flex-col items-center w-full px-2 sm:px-4">
                                                <div className="flex justify-between w-full mb-4 px-2">
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Fase {jugLevel}/3</span>
                                                    <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest text-right">
                                                        Objetivo: <span className="text-white font-black">{jugTarget}L</span>
                                                    </span>
                                                </div>

                                                <div className="flex justify-around items-end w-full max-w-[320px] h-48 bg-white/[0.02] border border-white/5 rounded-2xl p-6 gap-8 relative overflow-hidden">
                                                    {/* Cántaro A */}
                                                    <div className="flex flex-col items-center gap-3 flex-1">
                                                        <div className="relative w-full aspect-[2/3] max-w-[80px]">
                                                            {/* Cuerpo del Cántaro */}
                                                            <div className="absolute inset-0 border-x-4 border-b-4 border-white/20 rounded-b-3xl rounded-t-lg overflow-hidden bg-black/20">
                                                                <motion.div
                                                                    className="absolute bottom-0 w-full bg-blue-500/60 backdrop-blur-sm border-t border-blue-300/50 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                                                                    initial={false}
                                                                    animate={{ height: `${(jugA / jugACap) * 100}%` }}
                                                                    transition={{ type: "spring", stiffness: 100, damping: 15 }}
                                                                />
                                                                <div className="absolute top-2 left-0 w-full text-center text-[10px] font-bold text-white/40 z-10">{jugACap}L</div>
                                                                <div className="absolute inset-0 flex items-center justify-center text-lg font-black text-white drop-shadow-md z-10">{jugA}L</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-1 w-full scale-90">
                                                            <button onClick={() => handleJugFill('A')} className="flex-1 p-1 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/30 rounded text-[9px] font-bold text-blue-200">LLENAR</button>
                                                            <button onClick={() => handleJugEmpty('A')} className="flex-1 p-1 bg-red-600/30 hover:bg-red-600/50 border border-red-500/30 rounded text-[9px] font-bold text-red-200">VACÍAR</button>
                                                        </div>
                                                        <button onClick={() => handleJugPour('A')} className="w-full p-1.5 bg-green-600/30 hover:bg-green-600/50 border border-green-500/30 rounded text-[9px] font-bold text-green-200 flex items-center justify-center gap-1">TRASVASAR <ChevronRight size={10} /></button>
                                                    </div>

                                                    {/* Cántaro B */}
                                                    <div className="flex flex-col items-center gap-3 flex-1">
                                                        <div className="relative w-full aspect-[2/3] max-w-[80px]">
                                                            {/* Cuerpo del Cántaro */}
                                                            <div className="absolute inset-0 border-x-4 border-b-4 border-white/20 rounded-b-3xl rounded-t-lg overflow-hidden bg-black/20">
                                                                <motion.div
                                                                    className="absolute bottom-0 w-full bg-blue-500/60 backdrop-blur-sm border-t border-blue-300/50 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                                                                    initial={false}
                                                                    animate={{ height: `${(jugB / jugBCap) * 100}%` }}
                                                                    transition={{ type: "spring", stiffness: 100, damping: 15 }}
                                                                />
                                                                <div className="absolute top-2 left-0 w-full text-center text-[10px] font-bold text-white/40 z-10">{jugBCap}L</div>
                                                                <div className="absolute inset-0 flex items-center justify-center text-lg font-black text-white drop-shadow-md z-10">{jugB}L</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-1 w-full scale-90">
                                                            <button onClick={() => handleJugFill('B')} className="flex-1 p-1 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/30 rounded text-[9px] font-bold text-blue-200">LLENAR</button>
                                                            <button onClick={() => handleJugEmpty('B')} className="flex-1 p-1 bg-red-600/30 hover:bg-red-600/50 border border-red-500/30 rounded text-[9px] font-bold text-red-200">VACÍAR</button>
                                                        </div>
                                                        <button onClick={() => handleJugPour('B')} className="w-full p-1.5 bg-green-600/30 hover:bg-green-600/50 border border-green-500/30 rounded text-[9px] font-bold text-green-200 flex items-center justify-center gap-1"><ChevronLeft size={10} /> TRASVASAR</button>
                                                    </div>
                                                </div>
                                                <p className="text-[9px] text-gray-500 mt-6 text-center italic">Usa los cántaros para medir exactamente {jugTarget} litros de agua pura de la Fuente.</p>
                                            </div>
                                        )}

                                        {/* INTERFAZ PUERTA 8: RUTA TÁCTICA (CABALLO) */}
                                        {doorIdx === 8 && (
                                            <div className="mt-2 flex flex-col items-center w-full px-2 sm:px-4">
                                                <div className="flex justify-between w-full mb-4 px-2">
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Fase {knightLevel}/3</span>
                                                    <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">
                                                        Movimientos: {knightMovesCount}
                                                    </span>
                                                </div>

                                                <div className="relative p-2 sm:p-3 bg-white/[0.02] border border-white/5 rounded-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] mx-auto w-full max-w-[300px] touch-manipulation">
                                                    <div className={`grid gap-1 sm:gap-1.5`} style={{ gridTemplateColumns: `repeat(${knightGridSize}, minmax(0, 1fr))` }}>
                                                        {Array.from({ length: knightGridSize * knightGridSize }).map((_, idx) => {
                                                            const isKnight = knightPos === idx;
                                                            const isTarget = knightTarget === idx;
                                                            const isObstacle = knightObstacles.includes(idx);

                                                            // Calcular si es un movimiento válido
                                                            const r1 = Math.floor(knightPos / knightGridSize);
                                                            const c1 = knightPos % knightGridSize;
                                                            const r2 = Math.floor(idx / knightGridSize);
                                                            const c2 = idx % knightGridSize;
                                                            const rowDiff = Math.abs(r1 - r2);
                                                            const colDiff = Math.abs(c1 - c2);
                                                            const isValidMove = ((rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2)) && !isObstacle && !isKnight && status === 'PLAYING';

                                                            return (
                                                                <button
                                                                    key={`knight-${idx}`}
                                                                    disabled={status !== 'PLAYING' || isSubmitting || isObstacle || isKnight}
                                                                    onClick={() => {
                                                                        if (!isValidMove) {
                                                                            // Pequeño feedback de error visual simulado temporal (opcional)
                                                                        }
                                                                        handleKnightClick(idx);
                                                                    }}
                                                                    className={`aspect-square rounded-md flex items-center justify-center transition-all ${isObstacle ? 'bg-red-900/40 border border-red-500/30' :
                                                                        isTarget ? 'bg-green-500/20 border border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.3)] animate-pulse' :
                                                                            isValidMove ? 'bg-blue-500/20 border border-blue-400/50 shadow-[inset_0_0_10px_rgba(59,130,246,0.3)] hover:bg-blue-500/40 cursor-pointer animate-pulse' :
                                                                                'bg-[#001d3d]/40 border border-blue-500/10 hover:bg-blue-900/40 cursor-not-allowed opacity-60'
                                                                        }`}
                                                                >
                                                                    {isObstacle && <div className="text-red-500/40 font-bold text-xs">X</div>}
                                                                    {isKnight && <div className="w-4 h-4 sm:w-5 sm:h-5 bg-blue-400 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)] flex items-center justify-center"><div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full" /></div>}
                                                                    {isTarget && !isKnight && <div className="w-2 h-2 bg-green-400 rounded-full" />}
                                                                    {isValidMove && !isTarget && <div className="w-1.5 h-1.5 bg-blue-300/50 rounded-full" />}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                                <p className="text-[9px] text-gray-500 mt-6 text-center italic">El Táctico (punto azul) solo puede moverse en 'L' (saltos de Ajedrez). Llega al objetivo (punto verde) evitando los muros (X).</p>
                                            </div>
                                        )}

                                        {/* INTERFAZ PUERTA 9: TORRES DE LA CIUDAD (HANOI) */}
                                        {doorIdx === 9 && (
                                            <div className="mt-2 flex flex-col items-center w-full px-2 sm:px-4">
                                                <div className="flex justify-between w-full mb-4 px-2">
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Fase {hanoiLevel}/3</span>
                                                    <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">
                                                        Movimientos: {hanoiMoves}
                                                    </span>
                                                </div>

                                                <div className="flex justify-around items-end w-full max-w-[320px] h-48 bg-white/[0.02] border border-white/5 rounded-xl p-4 gap-2 relative">
                                                    {hanoiTowers.map((tower, tIdx) => (
                                                        <button
                                                            key={`tower-${tIdx}`}
                                                            onClick={() => handleHanoiClick(tIdx)}
                                                            className={`relative w-1/3 h-full flex flex-col justify-end items-center group transition-all rounded-lg ${hanoiSelectedTower === tIdx ? 'bg-blue-500/10 ring-1 ring-blue-500/30' : 'hover:bg-white/5'}`}
                                                        >
                                                            {/* Eje de la torre */}
                                                            <div className={`absolute bottom-0 w-1.5 h-3/4 rounded-t-full transition-colors ${hanoiSelectedTower === tIdx ? 'bg-blue-400' : 'bg-gray-700'}`} />

                                                            {/* Discos */}
                                                            <div className="flex flex-col-reverse items-center w-full z-10 gap-1 pb-1">
                                                                {tower.map((diskSize, dIdx) => {
                                                                    const isTop = dIdx === tower.length - 1;
                                                                    const isMoving = hanoiSelectedTower === tIdx && isTop;

                                                                    return (
                                                                        <motion.div
                                                                            layoutId={`disk-${diskSize}`}
                                                                            key={`disk-${diskSize}`}
                                                                            className={`h-4 rounded-full shadow-lg border ${isMoving ? 'border-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'border-white/10'}`}
                                                                            style={{
                                                                                width: `${30 + diskSize * 12}%`,
                                                                                backgroundColor: `hsl(${200 + diskSize * 20}, 70%, ${isMoving ? '60%' : '40%'})`
                                                                            }}
                                                                            initial={false}
                                                                            animate={{
                                                                                y: isMoving ? -20 : 0,
                                                                                scale: isMoving ? 1.05 : 1
                                                                            }}
                                                                        />
                                                                    );
                                                                })}
                                                            </div>

                                                            {/* Base de la torre */}
                                                            <div className={`w-full h-2 rounded-full absolute bottom-0 ${hanoiSelectedTower === tIdx ? 'bg-blue-500/40' : 'bg-white/10'}`} />
                                                        </button>
                                                    ))}
                                                </div>
                                                <p className="text-[9px] text-gray-500 mt-6 text-center italic">Restaura la Ciudad moviendo los bloques a la derecha. Un bloque grande no puede sostener a uno pequeño.</p>
                                            </div>
                                        )}

                                        {/* INTERFAZ PUERTA 10: CRIBA DE JUSTICIA (SUDOKU) */}
                                        {doorIdx === 10 && (
                                            <div className="mt-2 flex flex-col items-center w-full px-2 sm:px-4">
                                                <div className="flex justify-between w-full mb-4 px-2">
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Fase {sudokuLevel}/3</span>
                                                    <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">
                                                        {sudokuSize}x{sudokuSize} - Inspección
                                                    </span>
                                                </div>

                                                <div className={`grid gap-1.5 p-3 bg-white/[0.02] border border-white/5 rounded-xl shadow-inner mx-auto w-full max-w-[300px] touch-manipulation`} style={{ gridTemplateColumns: `repeat(${sudokuSize}, minmax(0, 1fr))` }}>
                                                    {sudokuGrid.map((val, idx) => {
                                                        const isInitial = sudokuInitial[idx];

                                                        return (
                                                            <button
                                                                key={`sudoku-${idx}`}
                                                                disabled={status !== 'PLAYING' || isSubmitting || isInitial}
                                                                onClick={() => handleSudokuCellClick(idx)}
                                                                className={`aspect-square rounded-lg border-2 flex items-center justify-center font-bebas text-xl transition-all duration-200 ${isInitial
                                                                    ? 'bg-blue-900/40 border-blue-500/20 text-blue-300 opacity-80 cursor-default'
                                                                    : val
                                                                        ? 'bg-blue-600/20 border-blue-400 text-white shadow-[0_0_10px_rgba(59,130,246,0.3)] active:scale-95'
                                                                        : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/20 active:scale-95'}`}
                                                            >
                                                                {val || '?'}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                <p className="text-[9px] text-gray-500 mt-6 text-center italic">Inspecciona los registros y completa la cuadrícula sin repetir números en filas o columnas.</p>
                                            </div>
                                        )}

                                        {/* INTERFAZ PUERTA 11: CUADRADO MÁGICO */}
                                        {doorIdx === 11 && (
                                            <div className="mt-2 flex flex-col items-center w-full px-2 sm:px-4">
                                                <div className="flex justify-between w-full mb-4 px-2">
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Fase {magicSquareLevel}/3</span>
                                                    <span className="text-[10px] text-[#FFB700] font-bold uppercase tracking-widest">Suma Objetivo: {magicSquareTarget}</span>
                                                </div>

                                                <div className="grid grid-cols-3 gap-2 p-3 bg-white/[0.02] border border-white/5 rounded-xl shadow-inner mx-auto w-full max-w-[280px] touch-manipulation">
                                                    {magicSquareGrid.map((val, idx) => (
                                                        <button
                                                            key={`magic-${idx}`}
                                                            disabled={status !== 'PLAYING'}
                                                            onClick={() => handleMagicSquareCellClick(idx)}
                                                            className={`aspect-square rounded-lg border-2 flex items-center justify-center font-bebas text-2xl transition-all duration-200 ${magicSquareSelectedIdx === idx
                                                                ? 'bg-blue-600/40 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-105 z-10'
                                                                : val
                                                                    ? 'bg-blue-900/20 border-blue-500/30 text-white'
                                                                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/20'}`}
                                                        >
                                                            {val || ''}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Teclado para Cuadrado Mágico */}
                                                <div className="grid grid-cols-3 gap-2 mt-6 w-full max-w-[280px]">
                                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
                                                        const isUsed = magicSquareGrid.includes(num);
                                                        return (
                                                            <button
                                                                key={`keypad-${num}`}
                                                                disabled={status !== 'PLAYING' || isSubmitting || isUsed}
                                                                onClick={() => handleMagicSquareNumPress(num)}
                                                                className={`py-2 rounded-lg font-bebas text-lg border transition-all ${isUsed
                                                                    ? 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed opacity-50'
                                                                    : 'bg-blue-900/20 border-blue-500/30 text-blue-300 hover:bg-blue-800/40 active:scale-95'}`}
                                                            >
                                                                {num}
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                <p className="text-[9px] text-gray-500 mt-6 text-center italic">Organiza los números del 1 al 9 para que cada fila, columna y diagonal sume {magicSquareTarget}.</p>
                                            </div>
                                        )}

                                        {/* INTERFAZ PUERTA 12: CÁRCEL / COMBINACIÓN FINAL */}
                                        {doorIdx === 12 && (
                                            <>
                                                <div className="flex justify-between w-full px-2 mb-2">
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Blindaje Final</span>
                                                    <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Intentos: {attempts.length}/15</span>
                                                </div>
                                                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 shadow-inner mt-2 overflow-y-auto max-h-[220px]">
                                                    {Array.from({ length: attempts.length + 1 }).map((_, rowIndex) => renderAttemptRow(rowIndex))}
                                                </div>

                                                <div className="mt-2">
                                                    <div className="grid grid-cols-5 gap-1.5 px-1">
                                                        {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                                                            <button
                                                                key={num}
                                                                disabled={status !== 'PLAYING' || currentGuess.length >= 5}
                                                                onClick={() => handleNumberPress(num)}
                                                                className="aspect-square bg-white/[0.05] border border-white/10 rounded-lg text-lg font-bebas active:scale-[0.95] active:bg-blue-600/50 transition-all disabled:opacity-30 flex items-center justify-center text-blue-100"
                                                            >
                                                                {num}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 mt-3 px-1">
                                                        <button
                                                            onClick={handleDelete}
                                                            disabled={status !== 'PLAYING' || currentGuess.length === 0}
                                                            className="py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg font-bebas active:scale-95 disabled:opacity-30 transition-all text-xs tracking-widest"
                                                        >
                                                            DESHACER
                                                        </button>
                                                        <button
                                                            onClick={submitGuess}
                                                            disabled={status !== 'PLAYING' || currentGuess.length !== 5 || isSubmitting}
                                                            className="py-2.5 bg-blue-600 text-white rounded-lg font-bebas shadow-lg active:scale-95 disabled:opacity-30 transition-all text-xs tracking-widest"
                                                        >
                                                            {isSubmitting ? 'VALIDANDO...' : 'VASCULAR'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {/* BOTÓN DE SUSTENTACIÓN TÁCTICA (PISTAS BÍBLICAS) */}
                                        {status === 'PLAYING' && selectedLevel && LORE_DATA[doorIdx] && (
                                            <div className="mt-6 flex flex-col items-center w-full px-4">
                                                <button
                                                    onClick={requestHint}
                                                    disabled={hintsUsed >= 5}
                                                    className={`px-4 py-2 w-full max-w-[280px] rounded-lg font-bebas tracking-widest text-sm flex items-center justify-center gap-2 border transition-all ${hintsUsed >= 5 ? 'bg-gray-900 border-gray-700 text-gray-500' : 'bg-blue-900/30 border-blue-500/30 text-blue-300 hover:bg-blue-800/40 active:scale-95'}`}
                                                >
                                                    <BookOpen size={16} className={hintsUsed >= 5 ? 'opacity-50' : 'text-blue-400'} />
                                                    {hintsUsed >= 5 ? 'SUSTENTACIÓN AGOTADA' : `PEDIR SUSTENTACIÓN TÁCTICA (${hintsUsed}/5)`}
                                                </button>
                                                {hintsUsed > 0 && <p className="text-[9px] text-red-400/70 mt-2 text-center uppercase tracking-widest">Penalización actual: +{30 * Math.pow(2, hintsUsed - 1)}s al tiempo base.</p>}
                                            </div>
                                        )}

                                        {/* MENSAJE DE FRACASO COMÚN */}
                                        {status === 'FAILED' && (
                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-4 bg-red-900/30 border border-red-500/30 rounded-xl text-center shadow-lg">
                                                <h3 className="text-red-400 font-bebas text-lg tracking-widest uppercase">Construcción Interrumpida</h3>
                                                <p className="text-[10px] text-red-200/60 mb-4 px-4 uppercase tracking-[0.1em] font-bold">
                                                    El sector {selectedLevel} ha colapsado. Se requiere un nuevo protocolo de seguridad.
                                                </p>
                                                <button onClick={() => {
                                                    startLevelLogic(selectedLevel!);
                                                }} className="px-8 py-3 bg-red-600 text-white font-bebas rounded-lg hover:bg-red-500 shadow-xl shadow-red-600/20 tracking-[0.2em] active:scale-95 transition-all text-xs flex items-center justify-center gap-2 mx-auto">
                                                    <RotateCcw size={14} /> REINTENTAR FASE
                                                </button>
                                            </motion.div>
                                        )}

                                    </>
                                );
                            })()}
                        </motion.div>
                    )}

                    {gameState === 'EXAM' && examQuestions.length > 0 && (
                        <motion.div
                            key="exam"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="max-w-md mx-auto py-8 px-4 flex flex-col items-center text-center space-y-6"
                        >
                            <div className="w-full flex justify-between items-center mb-4">
                                <div className="flex flex-col items-start">
                                    <span className="text-[10px] text-blue-400 font-black tracking-widest uppercase">Examen Táctico de Retención</span>
                                    <span className="text-sm font-bebas text-white tracking-widest">Pregunta {currentExamIndex + 1} de {examQuestions.length}</span>
                                </div>
                                <div className="h-2 w-32 bg-white/5 rounded-full overflow-hidden border border-white/10">
                                    <div
                                        className="h-full bg-blue-500 transition-all duration-500"
                                        style={{ width: `${((currentExamIndex + 1) / examQuestions.length) * 100}%` }}
                                    />
                                </div>
                            </div>

                            <div className="p-6 bg-blue-900/20 border border-blue-500/30 rounded-2xl shadow-xl w-full">
                                <h3 className="text-lg font-bebas text-[#FFB700] tracking-widest mb-4">
                                    {examQuestions[currentExamIndex].question}
                                </h3>
                                <div className="grid gap-3">
                                    {examQuestions[currentExamIndex].options.map((option: any, idx: number) => (
                                        <button
                                            key={idx}
                                            disabled={isSubmitting}
                                            onClick={() => handleExamAnswer(idx)}
                                            className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-left text-xs font-bold hover:bg-blue-600/20 hover:border-blue-400/50 transition-all active:scale-[0.98] flex items-center gap-3 group"
                                        >
                                            <span className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-[10px] group-hover:bg-blue-500 group-hover:border-blue-400 transition-colors">
                                                {String.fromCharCode(65 + idx)}
                                            </span>
                                            <span className="flex-1 opacity-80 group-hover:opacity-100">{option}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <p className="text-[9px] text-gray-500 uppercase font-black tracking-[0.2em]">
                                Tus XP acumulados dependen de la precisión de esta inspección final.
                            </p>
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
                                    <span className="text-sm font-bebas text-green-400">+{50 + (selectedLevel! * 5)} XP</span>
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

                {/* MODAL DE AVISO DE REINICIO Y AJUSTES */}
                <AnimatePresence>
                    {showResetNotice && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/90 backdrop-blur-md">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="bg-[#001d3d] border border-blue-500/30 rounded-3xl p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(59,130,246,0.3)] relative overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_10px_#3b82f6]"></div>
                                <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-400/30 relative">
                                    <Zap size={40} className="text-blue-400 animate-pulse" />
                                    <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full"></div>
                                </div>
                                <h2 className="text-2xl font-bebas tracking-[0.2em] text-[#FFB700] mb-3">ACTUALIZACIÓN TÁCTICA</h2>
                                <p className="text-[11px] text-blue-200/80 leading-relaxed mb-6 font-bold uppercase tracking-widest">
                                    Hemos reiniciado la campaña. Ahora el avance es de 48 niveles con un Pozo de XP que solo asegurarás tras un examen de retención final. ¡Demuestra que el aprendizaje está en tu memoria!
                                </p>
                                <button
                                    onClick={() => {
                                        localStorage.setItem('nehemias_reset_notice', 'true');
                                        setShowResetNotice(false);
                                    }}
                                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bebas tracking-[0.3em] hover:bg-blue-500 transition-all shadow-[0_10px_20px_rgba(37,99,235,0.3)] active:scale-95"
                                >
                                    ENTENDIDO, AGENTE
                                </button>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* OVERLAY DE SINCRONIZACIÓN (BLOQUEO DE UI) */}
                <AnimatePresence>
                    {(isSubmitting || status === 'TRANSITIONING') && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-center"
                        >
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                                <Brain className="absolute inset-0 m-auto text-blue-400 animate-pulse" size={24} />
                            </div>
                            <h3 className="mt-6 text-xl font-bebas tracking-[0.2em] text-white">SINCRONIZANDO...</h3>
                            <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mt-2 animate-pulse">Procesando Datos del Muro</p>
                        </motion.div>
                    )}
                </AnimatePresence>


                {/* MODAL DE SUSTENTACIÓN TÁCTICA (LORE BÍBLICO) */}
                {showLoreModal && selectedLevel && LORE_DATA[selectedLevel] && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-[#001226] border border-blue-500/30 rounded-xl max-w-sm w-full shadow-[0_0_30px_rgba(0,100,255,0.15)] relative overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-4 border-b border-white/10 bg-blue-900/20 flex items-start shrink-0">
                                <BookOpen className="text-blue-400 shrink-0 mr-3 mt-0.5" size={20} />
                                <div>
                                    <h3 className="font-bebas text-blue-100 text-lg tracking-widest leading-none">REPORTE TÁCTICO BÍBLICO</h3>
                                    <p className="text-[9px] text-blue-400/80 uppercase font-black tracking-widest mt-1">Puerta {selectedLevel} • Fragmento {currentLoreIndex + 1}</p>
                                </div>
                                <button onClick={() => setShowLoreModal(false)} className="ml-auto text-gray-400 hover:text-white p-1"><X size={18} /></button>
                            </div>

                            <div className="p-4 overflow-y-auto grow custom-scrollbar">
                                <h4 className="font-bold text-white text-sm mb-2">{LORE_DATA[selectedLevel][currentLoreIndex % LORE_DATA[selectedLevel].length].title}</h4>
                                <p className="text-[12px] text-blue-100/70 mb-6 leading-relaxed text-justify">
                                    {LORE_DATA[selectedLevel][currentLoreIndex % LORE_DATA[selectedLevel].length].text}
                                </p>

                                <div className="bg-black/60 border border-yellow-500/20 rounded-lg p-3">
                                    <p className="text-yellow-400 text-[10px] uppercase tracking-widest font-black mb-3 opacity-80">VERIFICACIÓN DE COMUNICACIONES:</p>
                                    <p className="text-sm text-white mb-4 font-medium">{LORE_DATA[selectedLevel][currentLoreIndex % LORE_DATA[selectedLevel].length].question}</p>

                                    <div className="flex flex-col gap-2">
                                        {LORE_DATA[selectedLevel][currentLoreIndex % LORE_DATA[selectedLevel].length].options.map((opt, i) => (
                                            <button
                                                key={`opt-${i}`}
                                                onClick={() => setLoreSelectedOption(i)}
                                                className={`p-3 rounded-lg text-left text-xs transition-colors border ${loreSelectedOption === i ? 'bg-blue-600/30 border-blue-400 text-white shadow-[0_0_10px_rgba(59,130,246,0.2)]' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'} ${loreFeedback === 'success' && i === LORE_DATA[selectedLevel]![currentLoreIndex % LORE_DATA[selectedLevel]!.length].correctIndex ? 'bg-green-600/50 border-green-400 text-white' : ''} ${loreFeedback === 'error' && loreSelectedOption === i ? 'bg-red-600/40 border-red-500 text-white/50' : ''}`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border-t border-white/10 bg-black/40 shrink-0">
                                <button
                                    onClick={submitLoreAnswer}
                                    disabled={loreSelectedOption === null || loreFeedback !== null}
                                    className={`w-full py-3 text-white font-bebas tracking-widest rounded-lg transition-all flex justify-center items-center text-base ${loreFeedback === 'success' ? 'bg-green-600' : loreFeedback === 'error' ? 'bg-red-600' : 'bg-blue-600 hover:bg-blue-500 disabled:opacity-50'}`}
                                >
                                    {loreFeedback === 'success' ? 'SOPORTE AUTORIZADO' : loreFeedback === 'error' ? 'DENEGADO' : 'CONFIRMAR RESPUESTA'}
                                </button>
                                {loreFeedback === null && <p className="text-[9px] text-center text-red-500 mt-3 font-bold uppercase tracking-widest">Penalización por soporte: +{30 * Math.pow(2, hintsUsed)}s al reloj</p>}
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>

            {/* HUD DE PROGRESO INFERIOR (COMPACTO Y FIJO) */}
            <div className="p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-black/90 backdrop-blur-xl border-t border-white/5 flex justify-center gap-6 shadow-[0_-10px_20px_rgba(0,0,0,0.5)] shrink-0">
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
