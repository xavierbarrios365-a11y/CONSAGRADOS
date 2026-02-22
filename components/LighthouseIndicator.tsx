import React from 'react';

interface LighthouseIndicatorProps {
    status: 'online' | 'offline';
    size?: 'xs' | 'sm' | 'md';
}

const LighthouseIndicator: React.FC<LighthouseIndicatorProps> = ({ status, size = 'md' }) => {
    const isOnline = status === 'online';
    const color = isOnline ? '#ffb700' : '#ef4444';
    const isXs = size === 'xs';
    const isSm = size === 'sm' || isXs;

    return (
        <div className={`flex flex-col items-center ${isXs ? 'gap-0.5' : isSm ? 'gap-1' : 'gap-3'}`}>
            <div className={`relative ${isXs ? 'w-16 h-16' : isSm ? 'w-20 h-20' : 'w-36 h-36'} flex items-center justify-center`}>
                {/* Capa de Fondo (Silueta Blanca Original) */}
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        maskImage: 'url(/logo_white.png)',
                        WebkitMaskImage: 'url(/logo_white.png)',
                        maskSize: 'contain',
                        WebkitMaskSize: 'contain',
                        maskRepeat: 'no-repeat',
                        WebkitMaskRepeat: 'no-repeat',
                        maskPosition: 'center',
                        WebkitMaskPosition: 'center'
                    }}
                />

                {/* Capa de Animación (Barrido de Color Táctico) */}
                <div
                    className="absolute inset-0 overflow-hidden"
                    style={{
                        maskImage: 'url(/logo_white.png)',
                        WebkitMaskImage: 'url(/logo_white.png)',
                        maskSize: 'contain',
                        WebkitMaskSize: 'contain',
                        maskRepeat: 'no-repeat',
                        WebkitMaskRepeat: 'no-repeat',
                        maskPosition: 'center',
                        WebkitMaskPosition: 'center'
                    }}
                >
                    <div
                        className={`absolute inset-y-0 ${isSm ? 'w-20' : 'w-32'} -skew-x-12 opacity-90 blur-sm`}
                        style={{
                            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
                            animation: 'tactical-sweep 4s ease-in-out infinite',
                            filter: 'brightness(1.5)'
                        }}
                    />
                </div>

                {/* Resplandor Maestro (Solo Online) */}
                {isOnline && (
                    <div
                        className="absolute inset-0 blur-2xl opacity-20 animate-pulse pointer-events-none"
                        style={{ backgroundColor: color }}
                    />
                )}
            </div>

            {/* Etiquetas de Estado */}
            <div className="flex flex-col items-center">
                <span className={`text-white font-bebas ${isXs ? 'text-sm tracking-[0.15em]' : isSm ? 'text-lg tracking-[0.2em]' : 'text-3xl tracking-[0.4em]'} font-black leading-none drop-shadow-lg`}>
                    CONSAGRADOS <span className="text-[#ffb700]">2026</span>
                </span>
                <div className={`flex items-center gap-2 ${isSm ? 'mt-1 py-0.5' : 'mt-2 py-1'} px-4 rounded-full bg-white/5 border border-white/5 backdrop-blur-sm`}>
                    <div className={`${isSm ? 'w-1.5 h-1.5' : 'w-2 h-2'} rounded-full ${isOnline ? 'animate-pulse' : 'opacity-50'}`} style={{ backgroundColor: color }} />
                    <span className={`${isSm ? 'text-[6px]' : 'text-[10px]'} uppercase font-montserrat font-black tracking-[0.2em]`} style={{ color }}>
                        {isOnline ? 'CONECTADO' : 'DESCONECTADO'}
                    </span>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes tactical-sweep {
          0% { left: -150%; }
          30% { left: -150%; }
          70% { left: 150%; }
          100% { left: 150%; }
        }
      ` }} />
        </div>
    );
};

export default LighthouseIndicator;
