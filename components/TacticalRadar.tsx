import React from 'react';

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

const TacticalRadar: React.FC<TacticalRadarProps> = ({ stats, size = 200 }) => {
    const categories = [
        { key: 'liderazgo', label: 'LID' },
        { key: 'servicio', label: 'SRV' },
        { key: 'analisis', label: 'ANL' },
        { key: 'potencial', label: 'POT' },
        { key: 'adaptabilidad', label: 'ADP' }
    ];

    const center = size / 2;
    const radius = (size / 2) * 0.7;
    const angleStep = (Math.PI * 2) / categories.length;

    // Helper to calculate coordinates
    const getPoint = (index: number, value: number, maxRadius: number) => {
        const angle = index * angleStep - Math.PI / 2;
        const r = (value / 100) * maxRadius;
        return {
            x: center + r * Math.cos(angle),
            y: center + r * Math.sin(angle)
        };
    };

    // Draw background polygons
    const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];
    const gridPolygons = gridLevels.map(level => {
        return categories.map((_, i) => {
            const p = getPoint(i, 100, radius * level);
            return `${p.x},${p.y}`;
        }).join(' ');
    });

    // Draw the actual stats polygon
    const statsPoints = categories.map((cat, i) => {
        const val = (stats as any)[cat.key] || 0;
        const p = getPoint(i, val, radius);
        return `${p.x},${p.y}`;
    }).join(' ');

    return (
        <div className="relative flex flex-col items-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-[0_0_10px_rgba(255,183,0,0.2)]">
                {/* Grid */}
                {gridPolygons.map((points, i) => (
                    <polygon
                        key={i}
                        points={points}
                        fill="none"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="1"
                    />
                ))}

                {/* Axis lines */}
                {categories.map((_, i) => {
                    const p = getPoint(i, 100, radius);
                    return (
                        <line
                            key={i}
                            x1={center}
                            y1={center}
                            x2={p.x}
                            y2={p.y}
                            stroke="rgba(255,255,255,0.05)"
                            strokeWidth="1"
                        />
                    );
                })}

                {/* Stats Fill */}
                <defs>
                    <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffb700" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#ffb700" stopOpacity="0.8" />
                    </linearGradient>
                </defs>

                <polygon
                    points={statsPoints}
                    fill="url(#radarGradient)"
                    stroke="#ffb700"
                    strokeWidth="2"
                    className="animate-in fade-in zoom-in duration-1000"
                />

                {/* Category Labels */}
                {categories.map((cat, i) => {
                    const p = getPoint(i, 115, radius);
                    return (
                        <text
                            key={i}
                            x={p.x}
                            y={p.y}
                            fill="#ffb700"
                            fontSize="8"
                            fontWeight="900"
                            textAnchor="middle"
                            alignmentBaseline="middle"
                            className="font-montserrat tracking-tighter"
                        >
                            {cat.label}
                        </text>
                    );
                })}
            </svg>

            {/* Legend or Center info could go here */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-2 h-2 rounded-full bg-[#ffb700] blur-[2px] opacity-50"></div>
            </div>
        </div>
    );
};

export default TacticalRadar;
