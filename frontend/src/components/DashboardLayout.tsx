import { useState, useEffect } from 'react';
import { LayoutDashboard, LineChart, FileText, Settings, Bell, Globe, Cpu, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';


interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const SidebarItem = ({ icon: Icon, label, active, onClick }: SidebarItemProps) => (
  <div 
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-all duration-200 group ${
      active 
        ? 'bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20' 
        : 'text-[#7a7a85] hover:bg-white/[0.03] hover:text-[#b0aca5] border border-transparent'
    }`}
  >
    <Icon className={`w-[18px] h-[18px] transition-colors ${active ? 'text-[var(--gold)]' : 'group-hover:text-[var(--gold-dim)]'}`} />
    <span className="text-sm font-medium tracking-wide">{label}</span>
    {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-pulse-gold" />}
  </div>
);

const LiveClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const h = time.getHours().toString().padStart(2, '0');
  const m = time.getMinutes().toString().padStart(2, '0');
  const s = time.getSeconds().toString().padStart(2, '0');

  return (
    <div className="font-data text-xs tracking-wider text-[#7a7a85] flex items-center gap-1">
      <Clock className="w-3.5 h-3.5 text-[var(--gold-dim)]" />
      <span className="text-[var(--gold)]">{h}</span>
      <span className="animate-blink text-[var(--gold-dim)]">:</span>
      <span className="text-[var(--gold)]">{m}</span>
      <span className="animate-blink text-[var(--gold-dim)]">:</span>
      <span className="text-[#5a5a5a]">{s}</span>
    </div>
  );
};

export const DashboardLayout = ({ children, activeView, onNavigate }: { 
  children: ReactNode,
  activeView: string,
  onNavigate: (view: string) => void
}) => {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 border-r border-[#1e1e28] bg-[#0d0d0f]/80 backdrop-blur-2xl p-5 flex flex-col gap-6 hidden lg:flex">
        {/* Logo */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--gold)] to-[var(--gold-dim)] flex items-center justify-center animate-pulse-gold">
            <Cpu className="w-4.5 h-4.5 text-[#09090b]" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-[#e8e6e3]">FinIntell</span>
            <span className="text-[10px] font-data text-[var(--gold-dim)] tracking-widest uppercase">Terminal</span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#262630] to-transparent" />

        <nav className="flex flex-col gap-1">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="市场看板" 
            active={activeView === 'dashboard'} 
            onClick={() => onNavigate('dashboard')}
          />
          <SidebarItem 
            icon={Globe} 
            label="国际局势" 
            active={activeView === 'news'} 
            onClick={() => onNavigate('news')}
          />
          <SidebarItem 
            icon={LineChart} 
            label="行情分析" 
            active={activeView === 'analysis'}
            onClick={() => onNavigate('analysis')}
          />
          <SidebarItem 
            icon={FileText} 
            label="财经研报" 
            active={activeView === 'reports'} 
            onClick={() => onNavigate('reports')}
          />
          <SidebarItem icon={Settings} label="系统设置" />
        </nav>

        {/* Bottom status panel */}
        <div className="mt-auto">
          <div className="rounded-lg border border-[#262630] bg-[#0d0d0f] p-3.5 space-y-3">
            <div className="text-[10px] font-data text-[#5a5a5a] uppercase tracking-[0.15em]">系统状态</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-[#4ade80] shadow-[0_0_8px_rgba(74,222,128,0.4)] animate-pulse" />
                <span className="text-[#8a8a8a]">已连接</span>
              </div>
              <LiveClock />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top bar */}
        <header className="h-14 border-b border-[#1e1e28] flex items-center justify-between px-6 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-base font-semibold lg:hidden text-[#e8e6e3]">FinIntell</h1>
            <div className="hidden lg:flex items-center gap-2 text-sm">
              <span className="text-[#5a5a5a]">终端</span>
              <span className="text-[#262630]">/</span>
              <span className="text-[#8a8a8a]">
                {activeView === 'dashboard' ? '市场看板' : activeView === 'news' ? '国际局势' : activeView === 'analysis' ? '行情分析' : activeView === 'reports' ? '财经研报' : '市场看板'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden lg:block">
              <LiveClock />
            </div>
            <div className="h-5 w-px bg-[#262630]" />
            <button className="p-2 rounded-lg hover:bg-white/[0.03] text-[#5a5a5a] hover:text-[var(--gold-dim)] transition-all relative" id="notifications-btn">
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--gold)] rounded-full border-2 border-[#09090b] animate-pulse-gold" />
            </button>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--gold-dim)] to-[var(--cold-blue)] border border-[#262630]" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:px-6 lg:pt-5 lg:pb-8 space-y-5 grid-bg">
          {children}
        </div>
      </main>
    </div>
  );
};
