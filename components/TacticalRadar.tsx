import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
    const categories = [
        { key: 'liderazgo', label: 'LID' },
        { key: 'servicio', label: 'SRV' },
        { key: 'analisis', label: 'ANL' },
        { key: 'potencial', label: 'POT' },
        { key: 'adaptabilidad', label: 'ADP' }
    ];

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
    const statsPoints = categories.map((cat, i) => {
        const val = (stats as any)[cat.key] || 0;
        const p = getPoint(i, val, radius);
        return `${p.x},${p.y}`;
    }).join(' ');

    return (
        <div className="relative flex flex-col items-center justify-center group">
            {/* Capa de Efectos de Fondo: Scanlines */}
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-10"></div>

            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative z-0 overflow-visible">
                <defs>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffb700" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#ffb700" stopOpacity="0.1" />
                    </linearGradient>
                </defs>

                {/* Grid Polygons with Animation */}
                {gridLevels.map((level, i) => {
                    const points = categories.map((_, idx) => {
                        const p = getPoint(idx, 100, radius * level);
                        return `${p.x},${p.y}`;
                    }).join(' ');

                    return (
                        <motion.polygon
                            key={`grid-${i}`}
                            points={points}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1, duration: 0.8 }}
                            fill="none"
                            stroke="rgba(255,183,0,0.1)"
                            strokeWidth="1"
                            strokeDasharray="2 2"
                        />
                    );
                })}

                {/* Axis lines */}
                {categories.map((_, i) => {
                    const p = getPoint(i, 100, radius);
                    return (
                        <motion.line
                            key={`axis-${i}`}
                            x1={center}
                            y1={center}
                            x2={p.x}
                            y2={p.y}
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 1 }}
                            stroke="rgba(255,183,0,0.15)"
                            strokeWidth="1"
                        />
                    );
                })}

                {/* Scanning Line Animation */}
                <motion.line
                    x1={center}
                    y1={center}
                    x2={center + radius * Math.cos(-Math.PI / 2)}
                    y2={center + radius * Math.sin(-Math.PI / 2)}
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                    stroke="#ffb700"
                    strokeWidth="2"
                    strokeLinecap="round"
                    style={{ transformOrigin: `${center}px ${center}px`, opacity: 0.3 }}
                />

                {/* Stats Logic with Framer Motion */}
                <AnimatePresence mode="wait">
                    <motion.polygon
                        points={statsPoints}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                            type: "spring",
                            stiffness: 50,
                            damping: 10,
                            delay: 0.5
                        }}
                        fill="url(#radarGradient)"
                        stroke="#ffb700"
                        strokeWidth="2"
                        filter="url(#glow)"
                    />
                </AnimatePresence>

                {/* Data Nodes (Points) */}
                {categories.map((cat, i) => {
                    const val = (stats as any)[cat.key] || 0;
                    const p = getPoint(i, val, radius);
                    return (
                        <motion.circle
                            key={`node-${i}`}
                            cx={p.x}
                            cy={p.y}
                            r="3"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 1 + i * 0.1 }}
                            fill="#ffb700"
                            className="drop-shadow-[0_0_5px_#ffb700]"
                        />
                    );
                })}

                {/* Labels */}
                {categories.map((cat, i) => {
                    const p = getPoint(i, 118, radius);
                    const val = (stats as any)[cat.key] || 0;
                    return (
                        <g key={`label-${i}`}>
                            <motion.text
                                x={p.x}
                                y={p.y - 12}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1.2 + i * 0.1 }}
                                fill="rgba(255,183,0,0.5)"
                                fontSize="7"
                                fontWeight="900"
                                textAnchor="middle"
                                className="font-bebas tracking-widest"
                            >
                                {cat.label}
                            </motion.text>
                            <motion.text
                                x={p.x}
                                y={p.y}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1.4 + i * 0.1 }}
                                fill="#ffb700"
                                fontSize="12"
                                fontWeight="900"
                                textAnchor="middle"
                                className="font-bebas tracking-tighter"
                            >
                                {val}
                            </motion.text>
                        </g>
                    );
                })}
            </svg>

            {/* Circular HUD Elements */}
            <motion.div
                className="absolute inset-0 border-[1px] border-amber-500/10 rounded-full"
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                style={{ margin: center * 0.1 }}
            />
            <motion.div
                className="absolute inset-0 border-t-[2px] border-l-[2px] border-amber-500/30 rounded-full pointer-events-none"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                style={{ margin: center * 0.05 }}
            />

            {/* Core Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-amber-500 rounded-full blur-[10px] opacity-20"></div>
        </div>
    );
};

export default TacticalRadar;

