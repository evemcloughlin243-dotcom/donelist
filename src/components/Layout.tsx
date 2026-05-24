import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTimerStore } from '../stores/timerStore';
import InstallPrompt from './InstallPrompt';

const tabs = [
  { path: '/', label: '首页', icon: '◉' },
  { path: '/record', label: '记录', icon: '＋' },
  { path: '/stats', label: '统计', icon: '▣' },
  { path: '/plan', label: '计划', icon: '◆' },
  { path: '/settings', label: '设置', icon: '◎' },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const timerStatus = useTimerStore((s) => s.status);
  const isTiming = timerStatus !== 'idle';

  useEffect(() => {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      navigator.storage.persist();
    }
  }, []);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex flex-col h-dvh max-w-lg mx-auto relative" style={{ backgroundColor: 'var(--bg)' }}>
      {isTiming && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-indigo-500/90 backdrop-blur px-4 py-1.5 flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-xs text-white/90 font-medium">计时中</span>
        </div>
      )}

      <main className={`flex-1 overflow-y-auto pb-2 ${isTiming ? 'pt-7' : ''}`}>
        <Outlet />
      </main>

      <InstallPrompt />

      <nav style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}
        className="flex-shrink-0">
        <div className="flex justify-around items-center h-16 px-1">
          {tabs.map((tab) => (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-center flex-1 h-full transition-all"
              style={{ color: isActive(tab.path) ? 'var(--accent)' : 'var(--text-muted)' }}
            >
              <span className="text-lg leading-none font-light">{tab.icon}</span>
              <span className="text-[9px] mt-1 font-medium tracking-wide">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
