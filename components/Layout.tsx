
import React from 'react';
import { LayoutDashboard, Users, QrCode, User, LogOut, Target, UserPlus, BookOpen, Activity, GraduationCap, Trophy, Bell } from 'lucide-react';
import { AppView, UserRole } from '../types';
import { formatDriveUrl } from './DigitalIdCard';

interface LayoutProps {
  children: React.ReactNode;
  activeView: AppView;
  setView: (view: AppView) => void;
  userRole: UserRole;
  userName: string;
  onLogout: () => void;
  notificationCount: number;
  onOpenInbox: () => void;
}

const OFFICIAL_LOGO = "1DYDTGzou08o0NIPuCPH9JvYtaNFf2X5f";

const Layout: React.FC<LayoutProps> = ({ children, activeView, setView, userRole, userName, onLogout, notificationCount, onOpenInbox }) => {
  const allNavItems = [
    { id: AppView.HOME, icon: <LayoutDashboard size={20} />, label: 'Inicio', roles: [UserRole.DIRECTOR, UserRole.LEADER, UserRole.STUDENT] },
    { id: AppView.CIU, icon: <Target size={20} />, label: 'Inteligencia', roles: [UserRole.DIRECTOR] },
    { id: AppView.DIRECTORY, icon: <Users size={20} />, label: 'Directorio', roles: [UserRole.DIRECTOR, UserRole.LEADER, UserRole.STUDENT] },
    { id: AppView.SCANNER, icon: <QrCode size={20} />, label: 'Asistencia', roles: [UserRole.DIRECTOR, UserRole.LEADER] },
    { id: AppView.VISITOR, icon: <Activity size={20} />, label: 'Radar', roles: [UserRole.DIRECTOR, UserRole.LEADER] },
    { id: AppView.ENROLLMENT, icon: <UserPlus size={20} />, label: 'Inscribir', roles: [UserRole.DIRECTOR, UserRole.LEADER] },
    { id: AppView.CONTENT, icon: <BookOpen size={20} />, label: 'Material', roles: [UserRole.DIRECTOR, UserRole.LEADER, UserRole.STUDENT] },
    { id: AppView.ACADEMIA, icon: <GraduationCap size={20} />, label: 'Academia', roles: [UserRole.DIRECTOR, UserRole.LEADER, UserRole.STUDENT] },
    { id: AppView.PROFILE, icon: <User size={20} />, label: 'Mi Perfil', roles: [UserRole.DIRECTOR, UserRole.LEADER, UserRole.STUDENT] },
  ];

  const filteredNavItems = allNavItems.filter(item => item.roles.includes(userRole));

  return (
    <div className="flex flex-col h-screen bg-[#001f3f] text-[#f4f4f4] overflow-hidden font-montserrat">
      <header className="min-h-[4rem] h-auto border-b border-white/5 bg-black/50 backdrop-blur-md px-6 py-2 flex items-center justify-between shrink-0 z-30 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <img src={formatDriveUrl(OFFICIAL_LOGO)} alt="Logo" className="h-7 md:h-8 w-auto object-contain transition-transform active:scale-95" />
          <div className="flex flex-col">
            <h1 className="font-bebas text-[12px] md:text-sm tracking-[0.15em] text-white leading-none">CONSAGRADOS 2026</h1>
            <p className="text-[6px] md:text-[7px] text-[#ffb700] font-black uppercase tracking-[0.3em] font-montserrat">No pedimos permiso para ser luz</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div
            onClick={onOpenInbox}
            className="relative cursor-pointer group p-2 text-gray-500 hover:text-[#ffb700] transition-colors"
            title="Notificaciones"
          >
            <Bell size={20} className="group-hover:animate-swing" />
            {notificationCount > 0 && (
              <span className="absolute -top-0 -right-0 h-4 min-w-[1rem] flex items-center justify-center bg-red-600 text-[8px] font-black text-white px-1 rounded-full border-2 border-[#001f3f]">
                {notificationCount > 9 ? '+9' : notificationCount}
              </span>
            )}
          </div>

          <div className="text-right hidden xs:block">
            <p className="text-[10px] font-black text-white uppercase leading-none tracking-wider">{userName.split(' ')[0]}</p>
            <p className="text-[7px] text-[#ffb700] font-bold uppercase tracking-widest opacity-80">{userRole}</p>
          </div>
          <button onClick={onLogout} className="p-2.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition-all bg-white/5 rounded-xl border border-white/5 active:scale-95 group" title="Cerrar Sesión">
            <LogOut size={18} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <aside className="hidden md:flex w-64 border-r border-white/5 bg-black/20 flex-col py-6">
          <nav className="flex-1 px-4 space-y-1">
            {filteredNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeView === item.id
                  ? 'bg-[#ffb700]/10 text-[#ffb700] border-l-4 border-[#ffb700]'
                  : 'text-white/40 hover:bg-white/5 hover:text-white'
                  }`}
              >
                {item.icon}
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto pb-40 md:pb-0 bg-[#001f3f]">
          <div className="max-w-screen-xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-white/5 bg-black/80 backdrop-blur-2xl px-6 py-3 flex justify-around items-center z-40 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        {filteredNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`flex flex-col items-center relative transition-all duration-200 ${activeView === item.id ? 'text-[#ffb700] scale-110' : 'text-gray-500 hover:text-gray-400'
              }`}
            title={item.label}
          >
            <div className={`p-2 rounded-xl transition-all duration-200 ${activeView === item.id ? 'bg-[#ffb700]/15 border border-[#ffb700]/30 shadow-[0_0_15px_rgba(255,183,0,0.1)]' : 'bg-transparent border border-transparent'}`}>
              {item.icon}
            </div>
            {activeView === item.id && (
              <div className="absolute -bottom-1 w-1 h-1 bg-[#ffb700] rounded-full shadow-[0_0_8px_#ffb700]"></div>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
