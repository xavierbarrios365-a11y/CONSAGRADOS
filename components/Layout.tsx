import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Users, QrCode, User, LogOut, Target, UserPlus, BookOpen, Activity, GraduationCap, Trophy, Bell, RotateCcw, ChevronUp, ClipboardList, Sparkles, Shield, Settings, Zap, Menu, X } from 'lucide-react';
import { AppView, UserRole } from '../types';
import { formatDriveUrl } from '../services/storageUtils';

interface LayoutProps {
  children: React.ReactNode;
  activeView: AppView;
  setView: (view: AppView) => void;
  userRole: UserRole;
  userName: string;
  onLogout: () => void;
  onHardReset?: () => void;
  notificationCount: number;
  onOpenInbox: () => void;
}

const OFFICIAL_LOGO = "/logo_white.png";

const Layout: React.FC<LayoutProps> = ({ children, activeView, setView, userRole, userName, onLogout, onHardReset, notificationCount, onOpenInbox }) => {
  const [logoError, setLogoError] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const allNavItems = [
    { id: AppView.HOME, icon: <LayoutDashboard size={20} />, label: 'Inicio', roles: [UserRole.DIRECTOR, UserRole.LEADER, UserRole.STUDENT] },
    { id: AppView.CIU, icon: <Target size={20} />, label: 'Inteligencia', roles: [UserRole.DIRECTOR] },
    { id: AppView.DIRECTORY, icon: <Users size={20} />, label: 'Directorio', roles: [UserRole.DIRECTOR, UserRole.LEADER, UserRole.STUDENT] },
    { id: AppView.SCANNER, icon: <QrCode size={20} />, label: 'Asistencia', roles: [UserRole.DIRECTOR, UserRole.LEADER] },
    { id: AppView.VISITOR, icon: <Activity size={20} />, label: 'Radar', roles: [UserRole.DIRECTOR, UserRole.LEADER] },
    { id: AppView.ACADEMIA, icon: <GraduationCap size={20} />, label: 'Academia', roles: [UserRole.DIRECTOR, UserRole.LEADER, UserRole.STUDENT] },
    { id: AppView.ASCENSO, icon: <ChevronUp size={20} />, label: 'Ascenso', roles: [UserRole.DIRECTOR, UserRole.LEADER, UserRole.STUDENT] },
    { id: AppView.PROFILE, icon: <User size={20} />, label: 'Mi Perfil', roles: [UserRole.DIRECTOR, UserRole.LEADER, UserRole.STUDENT] },
    { id: AppView.BIBLE_WAR_ARENA, icon: <Zap size={20} />, label: 'Arena', roles: [UserRole.DIRECTOR] },
    { id: AppView.ADMIN, icon: <Settings size={20} />, label: 'Admin', roles: [UserRole.DIRECTOR] },
  ];

  // Si es un jugador test, solo mostrar Inicio, Arena (Combatir) y Mi Perfil
  const filteredNavItems = allNavItems.filter(item => {
    const isTest = userName && (userName.includes('Test') || userName.includes('TEST'));

    // Si es Test Player, forzar visibilidad de Arena aunque no tenga el rol, y limitar el resto
    if (isTest) {
      return item.id === AppView.HOME || item.id === AppView.PROFILE || item.id === AppView.BIBLE_WAR_ARENA;
    }

    return item.roles.includes(userRole);
  });

  const maxMobileVisible = 4;
  const mobileVisibleItems = filteredNavItems.slice(0, maxMobileVisible);
  const mobileHiddenItems = filteredNavItems.slice(maxMobileVisible);

  return (
    <div className="flex flex-col h-screen bg-[#000810] text-[#f4f4f4] overflow-hidden font-montserrat relative">

      {/* CAPA DE FONDO CINEMÁTICO UNIVERSAL */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Gradientes de Profundidad */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/10 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-amber-900/5 blur-[100px] rounded-full"></div>

        {/* Grid Táctico Sutil */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#ffffff 0.5px, transparent 0.5px)', backgroundSize: '30px 30px' }}></div>

        {/* Scanlines Effect */}
        <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
      </div>

      <header className="min-h-[4rem] h-auto border-b border-white/5 bg-black/40 backdrop-blur-xl px-6 py-2 flex items-center justify-between shrink-0 z-30 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <img
            src={logoError ? '/logo_white.png' : formatDriveUrl(OFFICIAL_LOGO)}
            alt="Logo"
            className="h-6 w-auto object-contain transition-transform active:scale-95 cursor-pointer"
            onClick={() => setView(AppView.HOME)}
            onError={() => setLogoError(true)}
          />
          <div className="flex flex-col">
            <p className="text-[8px] text-[#ffb700] font-black uppercase tracking-[0.3em] font-montserrat">Consagrados</p>
          </div>
        </motion.div>

        <div className="flex items-center gap-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={onOpenInbox}
            className="relative cursor-pointer group p-2 text-gray-500 hover:text-[#ffb700] transition-colors"
            title="Notificaciones"
          >
            <Bell size={20} className="group-hover:animate-swing" />
            {notificationCount > 0 && (
              <span className="absolute -top-0 -right-0 h-4 min-w-[1rem] flex items-center justify-center bg-red-600 text-[8px] font-black text-white px-1 rounded-full border-2 border-[#000810] shadow-[0_0_10px_rgba(220,38,38,0.5)]">
                {notificationCount > 9 ? '+9' : notificationCount}
              </span>
            )}
          </motion.div>

          <div className="text-right hidden xs:block">
            <p className="text-[10px] font-black text-white uppercase leading-none tracking-wider">{userName.split(' ')[0]}</p>
            <p className="text-[7px] text-[#ffb700] font-bold uppercase tracking-widest opacity-80">{userRole}</p>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <button
              onClick={onHardReset}
              className="p-2.5 text-gray-400 hover:text-[#ffb700] hover:bg-amber-500/10 transition-all bg-white/5 rounded-xl border border-white/5 active:scale-95 group"
              title="Reinicio Maestro (Limpiar Caché)"
            >
              <RotateCcw size={18} className="group-hover:rotate-180 transition-transform duration-700" />
            </button>
            <button
              onClick={onLogout}
              className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all bg-white/5 rounded-xl border border-white/5 active:scale-95 group"
              title="Cerrar Sesión"
            >
              <LogOut size={18} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative z-10">
        <aside className="hidden md:flex w-64 border-r border-white/5 bg-black/20 flex-col py-6">
          <nav className="flex-1 px-4 space-y-1">
            {filteredNavItems.map((item) => (
              <motion.button
                key={item.id}
                whileHover={{ x: 5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative overflow-hidden group ${activeView === item.id
                  ? 'bg-amber-500/10 text-amber-500 border-l-4 border-amber-500 shadow-[0_0_20px_rgba(255,183,0,0.05)]'
                  : 'text-white/40 hover:bg-white/5 hover:text-white'
                  }`}
              >
                {activeView === item.id && (
                  <motion.div
                    layoutId="activeNavBackground"
                    className="absolute inset-0 bg-amber-500/5 z-0"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{item.icon}</span>
                <span className="text-sm font-black uppercase tracking-widest relative z-10 font-bebas">{item.label}</span>
              </motion.button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto pb-40 md:pb-0 bg-transparent custom-scrollbar">
          <div className="max-w-screen-xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-white/5 bg-black/60 backdrop-blur-2xl px-6 py-2 flex justify-around items-center z-40 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
        {mobileVisibleItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`flex flex-col items-center relative transition-all duration-300 py-1 ${activeView === item.id ? 'text-[#ffb700] scale-110' : 'text-gray-500'
              }`}
            title={item.label}
          >
            <div className={`p-2 rounded-xl transition-all duration-300 relative ${activeView === item.id ? 'bg-[#ffb700]/15 border border-[#ffb700]/30 shadow-[0_0_20px_rgba(255,183,0,0.15)]' : 'bg-transparent border border-transparent'}`}>
              {item.icon}
              {activeView === item.id && (
                <motion.div
                  layoutId="mobileNavGlow"
                  className="absolute inset-[-4px] border border-[#ffb700]/20 rounded-2xl pointer-events-none"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </div>
            <span className={`text-[7px] font-black uppercase tracking-widest mt-1 font-bebas transition-opacity duration-300 ${activeView === item.id ? 'opacity-100' : 'opacity-0'}`}>
              {item.label}
            </span>
          </button>
        ))}
        {mobileHiddenItems.length > 0 && (
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className={`flex flex-col items-center relative transition-all duration-300 py-1 ${isMobileMenuOpen ? 'text-[#ffb700] scale-110' : 'text-gray-500'}`}
            title="Menú"
          >
            <div className={`p-2 rounded-xl transition-all duration-300 relative ${isMobileMenuOpen ? 'bg-[#ffb700]/15 border border-[#ffb700]/30 shadow-[0_0_20px_rgba(255,183,0,0.15)]' : 'bg-transparent border border-transparent'}`}>
              <Menu size={20} />
            </div>
            <span className={`text-[7px] font-black uppercase tracking-widest mt-1 font-bebas transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'text-gray-500'}`}>
              MENÚ
            </span>
          </button>
        )}
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-[#000810]/95 backdrop-blur-3xl flex flex-col md:hidden"
          >
            <div className="flex justify-between items-center p-6 border-b border-white/10 pt-[max(1.5rem,env(safe-area-inset-top))]">
              <h2 className="text-xl font-bebas text-[#ffb700] tracking-widest uppercase flex items-center gap-2">
                <Menu size={20} /> Menú Principal
              </h2>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-3 bg-white/5 hover:bg-white/20 border border-white/10 rounded-full text-white transition-all active:scale-95"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-8 pb-[max(6rem,env(safe-area-inset-bottom))] custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                {filteredNavItems.map((item, index) => (
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={item.id}
                    onClick={() => {
                      setView(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border transition-all active:scale-95 ${activeView === item.id
                        ? 'bg-[#ffb700] text-[#001f3f] border-[#ffb700] shadow-[0_10px_30px_rgba(255,183,0,0.3)]'
                        : 'bg-black/40 text-white/70 border-white/10 hover:bg-white/10 hover:border-white/20'
                      }`}
                  >
                    <div className={activeView === item.id ? 'scale-125 transition-transform' : ''}>
                      {item.icon}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest font-bebas text-center">
                      {item.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Layout;

