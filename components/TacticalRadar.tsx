import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface TacticalRadarProps {
    stats: {
        liderazgo: number;
        servicio: number;
        analisis: number;
        potencial: number;
        adaptabilidad: number;
    };
    size?: number;
}

const TacticalRadar: React.FC<TacticalRadarProps> = ({ stats, size = 260 }) => {
    const categories = useMemo(() => [
        { key: 'liderazgo', label: 'LID' },
        { key: 'servicio', label: 'SRV' },
        { key: 'analisis', label: 'ANL' },
        { key: 'potencial', label: 'POT' },
        { key: 'adaptabilidad', label: 'ADP' }
    ], []);

    const center = size / 2;
    const radius = (size / 2) * 0.75;
    const angleStep = (Math.PI * 2) / categories.length;

    const getPoint = (index: number, value: number, maxRadius: number) => {
        const angle = index * angleStep - Math.PI / 2;
        const r = (value / 100) * maxRadius;
        return {
            x: center + r * Math.cos(angle),
            y: center + r * Math.sin(angle)
        };
    };

    const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

    // Animación de los puntos
    // Creamos un string de puntos para el polígono que se anima
    // Usaremos framer-motion para animar cada valor individualmente
    const statsPoints = categories.map((cat, i) => {
        const val = (stats as any)[cat.key] || 0;
        const p = getPoint(i, val, radius);
        return `${p.x},${p.y}`;
    }).join(' ');

    return (
        <div className="relative flex flex-col items-center justify-center group">
            {/* Capa de Efectos de Fondo: Scanlines */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-10"></div>

            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative z-0 overflow-visible">
                <defs>
                    <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <linearGradient id="polyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffb700" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#ffb700" stopOpacity="0.1" />
                    </linearGradient>
                </defs>

                {/* Grid Polygons */}
                {gridLevels.map((level, i) => {
                    const points = categories.map((_, idx) => {
                        const p = getPoint(idx, 100, radius * level);
                        return `${p.x},${p.y}`;
                    }).join(' ');

                    return (
                        <polygon
                            key={`grid-${i}`}
                            points={points}
                            fill="none"
                            stroke="rgba(255,183,0,0.1)"
                            strokeWidth="1"
                            strokeDasharray={i === 4 ? "0" : "2 2"}
                        />
                    );
                })}

                {/* Axis lines */}
                {categories.map((_, i) => {
                    const p = getPoint(i, 100, radius);
                    return (
                        <line
                            key={`axis-${i}`}
                            x1={center}
                            y1={center}
                            x2={p.x}
                            y2={p.y}
                            stroke="rgba(255,183,0,0.15)"
                            strokeWidth="1"
                        />
                    );
                })}

                {/* Scanning Line HUD */}
                <motion.line
                    x1={center}
                    y1={center}
                    x2={center + radius * 1.1 * Math.cos(-Math.PI / 2)}
                    y2={center + radius * 1.1 * Math.sin(-Math.PI / 2)}
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                    stroke="#ffb700"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    style={{ transformOrigin: `${center}px ${center}px`, opacity: 0.4 }}
                />

                {/* The Stats Area with unique entry animation */}
                <motion.polygon
                    points={statsPoints}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                        type: "spring",
                        stiffness: 40,
                        damping: 12,
                        delay: 0.2
                    }}
                    fill="url(#polyGradient)"
                    stroke="#ffb700"
                    strokeWidth="2"
                    filter="url(#radarGlow)"
                    className="drop-shadow-[0_0_10px_rgba(255,183,0,0.5)]"
                />

                {/* Data Nodes and Values */}
                {categories.map((cat, i) => {
                    const val = (stats as any)[cat.key] || 0;
                    const p = getPoint(i, val, radius);
                    const labelPos = getPoint(i, 120, radius);

                    return (
                        <g key={`data-${i}`}>
                            {/* Value Circle */}
                            <motion.circle
                                cx={p.x}
                                cy={p.y}
                                r="4"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.8 + i * 0.1, type: "spring" }}
                                fill="#ffb700"
                                className="shadow-lg"
                            />

                            {/* Category Label */}
                            <motion.text
                                x={labelPos.x}
                                y={i === 2 || i === 3 ? labelPos.y - 18 : labelPos.y - 12}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1 + i * 0.1 }}
                                fill="rgba(255,255,255,0.4)"
                                fontSize="7"
                                fontWeight="900"
                                textAnchor="middle"
                                className="font-bebas tracking-[0.2em] font-black"
                            >
                                {cat.label}
                            </motion.text>

                            {/* Precise Value HUD */}
                            <motion.text
                                x={labelPos.x}
                                y={i === 2 || i === 3 ? labelPos.y - 6 : labelPos.y}
                                initial={{ opacity: 0, y: labelPos.y + 5 }}
                                animate={{ opacity: 1, y: i === 2 || i === 3 ? labelPos.y - 6 : labelPos.y }}
                                transition={{ delay: 1.2 + i * 0.1 }}
                                fill="#ffb700"
                                fontSize="13"
                                fontWeight="900"
                                textAnchor="middle"
                                className="font-bebas tracking-tighter"
                            >
                                {val}
                            </motion.text>

                            {/* Decorative line to label */}
                            <motion.line
                                x1={p.x}
                                y1={p.y}
                                x2={labelPos.x}
                                y2={labelPos.y - 5}
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 0.2 }}
                                transition={{ delay: 1.1 + i * 0.1 }}
                                stroke="#ffb700"
                                strokeWidth="0.5"
                                strokeDasharray="1 1"
                            />
                        </g>
                    );
                })}
            </svg>

            {/* Circular Rotating Borders (Premium HUD Feel) */}
            <div className="absolute inset-0 pointer-events-none">
                <motion.div
                    className="absolute inset-0 border-[0.5px] border-amber-500/5 rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 60, ease: "linear" }}
                    style={{ margin: -10 }}
                />
                <motion.div
                    className="absolute inset-0 border-t-[1px] border-amber-500/20 rounded-full"
                    animate={{ rotate: -360 }}
                    transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
                    style={{ margin: -15 }}
                />
            </div>

            {/* Scale Indicator */}
            <div className="mt-2 flex gap-4 opacity-40">
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-[#ffb700] rounded-full"></div>
                    <span className="text-[6px] font-black text-white uppercase tracking-widest font-bebas">Operativo</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 border border-[#ffb700] rounded-full"></div>
                    <span className="text-[6px] font-black text-white/50 uppercase tracking-widest font-bebas">Objetivo</span>
                </div>
            </div>
        </div>
    );
};

export default TacticalRadar;
