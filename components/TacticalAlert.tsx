import React, { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldCheck,
    AlertTriangle,
    XCircle,
    Info,
    X,
    CheckCircle2,
    Zap,
    Target
} from 'lucide-react';

type AlertType = 'SUCCESS' | 'ERROR' | 'WARNING' | 'INFO' | 'CONFIRM';

interface TacticalAlertOptions {
    title: string;
    message: string;
    type?: AlertType;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
}

interface TacticalAlertContextType {
    showAlert: (options: TacticalAlertOptions) => void;
    hideAlert: () => void;
}

const TacticalAlertContext = createContext<TacticalAlertContextType | undefined>(undefined);

export const useTacticalAlert = () => {
    const context = useContext(TacticalAlertContext);
    if (!context) throw new Error('useTacticalAlert must be used within TacticalAlertProvider');
    return context;
};

export const TacticalAlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [alert, setAlert] = useState<TacticalAlertOptions | null>(null);

    const showAlert = (options: TacticalAlertOptions) => setAlert(options);
    const hideAlert = () => setAlert(null);

    return (
        <TacticalAlertContext.Provider value={{ showAlert, hideAlert }}>
            {children}
            <AnimatePresence>
                {alert && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            className="relative w-full max-w-sm bg-[#001f3f] border border-white/10 rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                        >
                            {/* Tactical Border Glow */}
                            <div className={`absolute inset-0 opacity-20 pointer-events-none ${alert.type === 'ERROR' ? 'bg-red-500' :
                                    alert.type === 'WARNING' ? 'bg-yellow-500' :
                                        'bg-[#ffb700]'
                                }`} style={{ filter: 'blur(40px)' }} />

                            <div className="relative z-10 p-8 flex flex-col items-center text-center">
                                {/* Icon Section */}
                                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 border ${alert.type === 'ERROR' ? 'bg-red-500/10 border-red-500/30 text-red-500' :
                                        alert.type === 'WARNING' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' :
                                            'bg-[#ffb700]/10 border-[#ffb700]/30 text-[#ffb700]'
                                    }`}>
                                    {alert.type === 'SUCCESS' && <ShieldCheck size={40} />}
                                    {alert.type === 'ERROR' && <XCircle size={40} />}
                                    {alert.type === 'WARNING' && <AlertTriangle size={40} />}
                                    {alert.type === 'INFO' && <Info size={40} />}
                                    {alert.type === 'CONFIRM' && <Target size={40} />}
                                    {!alert.type && <CheckCircle2 size={40} />}
                                </div>

                                {/* Text Content */}
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2 font-bebas">
                                    {alert.title}
                                </h3>
                                <p className="text-sm text-white/60 font-medium leading-relaxed font-montserrat whitespace-pre-wrap">
                                    {alert.message}
                                </p>

                                {/* Actions */}
                                <div className="w-full mt-8 flex flex-col gap-3">
                                    {alert.type === 'CONFIRM' ? (
                                        <div className="flex gap-3 w-full">
                                            <button
                                                onClick={() => {
                                                    alert.onCancel?.();
                                                    hideAlert();
                                                }}
                                                className="flex-1 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all font-bebas"
                                            >
                                                {alert.cancelText || 'CANCELAR'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    alert.onConfirm?.();
                                                    hideAlert();
                                                }}
                                                className="flex-1 px-6 py-4 rounded-2xl bg-[#ffb700] text-[#001f3f] font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all font-bebas shadow-[0_10px_20px_rgba(255,183,0,0.3)]"
                                            >
                                                {alert.confirmText || 'CONFIRMAR'}
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={hideAlert}
                                            className="w-full px-6 py-4 rounded-2xl bg-[#ffb700] text-[#001f3f] font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all font-bebas shadow-[0_10px_20px_rgba(255,183,0,0.3)]"
                                        >
                                            ENTENDIDO
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Close Button */}
                            <button
                                onClick={hideAlert}
                                className="absolute top-6 right-6 p-2 text-white/20 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>

                            {/* Decorative Scan Line */}
                            <div className="absolute top-0 inset-x-0 h-[2px] bg-[#ffb700] opacity-30 shadow-[0_0_10px_#ffb700]"
                                style={{ animation: 'scan 2s linear infinite' }} />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <style>{`
        @keyframes scan {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(400px); opacity: 0; }
        }
      `}</style>
        </TacticalAlertContext.Provider>
    );
};
