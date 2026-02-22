import React from 'react';

const LoadingScreen = ({ message }: { message: string }) => (
    <div className="min-h-screen bg-[#001f3f] flex flex-col items-center justify-center p-6 space-y-6 animate-in fade-in">
        <div className="w-24 h-24 flex items-center justify-center relative">
            <div className="absolute inset-0 bg-[#ffb700]/10 rounded-full animate-ping opacity-20"></div>
            <img
                src="/logo_white.png"
                alt="Consagrados Logo"
                className="w-16 h-16 object-contain drop-shadow-[0_0_15px_rgba(255,183,0,0.3)] animate-pulse"
            />
        </div>
        <div className="space-y-2 text-center">
            <p className="text-[#ffb700] text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">{message}</p>
            <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden mx-auto">
                <div className="w-1/2 h-full bg-[#ffb700] animate-[shimmer_2s_infinite] shadow-[0_0_10px_rgba(255,183,0,0.5)]"></div>
            </div>
        </div>
        <style>{`
      @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
    `}</style>
    </div>
);

export default LoadingScreen;
