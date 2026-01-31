
import React from 'react';
import { LayoutDashboard, Users, QrCode, User, LogOut, Target, UserPlus } from 'lucide-react';
import { AppView, UserRole } from '../types';
import { formatDriveUrl } from './DigitalIdCard';

interface LayoutProps {
  children: React.ReactNode;
  activeView: AppView;
  setView: (view: AppView) => void;
  userRole: UserRole;
  userName: string;
  onLogout: () => void;
}

const OFFICIAL_LOGO = "1DYDTGzou08o0NIPuCPH9JvYtaNFf2X5f";

const Layout: React.FC<LayoutProps> = ({ children, activeView, setView, userRole, userName, onLogout }) => {
  const allNavItems = [
    { id: AppView.CIU, icon: <Target size={20} />, label: 'Inteligencia', roles: [UserRole.DIRECTOR] },
    { id: AppView.DIRECTORY, icon: <Users size={20} />, label: 'Directorio', roles: [UserRole.DIRECTOR, UserRole.LEADER] },
    { id: AppView.SCANNER, icon: <QrCode size={20} />, label: 'Asistencia', roles: [UserRole.DIRECTOR, UserRole.LEADER] },
    { id: AppView.ENROLLMENT, icon: <UserPlus size={20} />, label: 'Inscribir', roles: [UserRole.DIRECTOR, UserRole.LEADER] },
    { id: AppView.PROFILE, icon: <User size={20} />, label: 'Mi Perfil', roles: [UserRole.DIRECTOR, UserRole.LEADER, UserRole.STUDENT] },
  ];

  const filteredNavItems = allNavItems.filter(item => item.roles.includes(userRole));

  return (
    <div className="flex flex-col h-screen bg-[#020202] text-[#f8f9fa] overflow-hidden">
      <header className="h-16 border-b border-white/5 bg-black/50 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <img src={formatDriveUrl(OFFICIAL_LOGO)} alt="Logo" className="h-7 md:h-8 w-auto object-contain transition-transform active:scale-95" />
          <div className="flex flex-col">
            <h1 className="font-orbitron font-bold text-[10px] md:text-xs tracking-widest text-white leading-none">CONSAGRADOS 2026</h1>
            <p className="text-[6px] md:text-[7px] text-blue-500 font-black uppercase tracking-[0.2em]">Agency of Experience</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-black text-white uppercase leading-none">{userName.split(' ')[0]}</p>
            <p className="text-[7px] text-blue-400 font-bold uppercase tracking-widest">{userRole}</p>
          </div>
          <button onClick={onLogout} className="p-2 text-gray-500 hover:text-white transition-colors bg-white/5 rounded-lg">
            <LogOut size={16} />
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
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeView === item.id
                  ? 'bg-blue-600/10 text-blue-400 border-l-2 border-blue-500'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
              >
                {item.icon}
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto pb-24 md:pb-0 bg-[#050505]">
          <div className="max-w-screen-xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-white/5 bg-black/80 backdrop-blur-xl px-4 py-3 flex justify-around items-center z-40 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {filteredNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${activeView === item.id ? 'text-blue-400' : 'text-gray-500'
              }`}
          >
            <div className={`p-1 rounded-lg ${activeView === item.id ? 'bg-blue-500/10' : ''}`}>
              {item.icon}
            </div>
            <span className="text-[7px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
