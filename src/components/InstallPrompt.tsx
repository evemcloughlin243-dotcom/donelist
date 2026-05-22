import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/.test(ua);
    setIsIOS(ios);

    // Chrome/Edge install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      const dismissed = localStorage.getItem('donelist_pwa_dismissed');
      if (!dismissed) setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // For iOS: auto-show after first visit
    if (ios) {
      const dismissed = localStorage.getItem('donelist_pwa_dismissed');
      if (!dismissed) {
        // Show after a short delay on first visit
        const timer = setTimeout(() => setShow(true), 2000);
        return () => {
          clearTimeout(timer);
          window.removeEventListener('beforeinstallprompt', handler);
        };
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferred) {
      deferred.prompt();
      const result = await deferred.userChoice;
      if (result.outcome === 'accepted') setShow(false);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('donelist_pwa_dismissed', '1');
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-sm mx-auto slide-up">
      <div className="card-lg p-5" style={{ boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">📲</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {isIOS ? '添加到主屏幕' : '安装 Donelist'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              {isIOS
                ? '点击 Safari 底部的 分享按钮 → 选择「添加到主屏幕」，数据不会丢失'
                : '安装到桌面，数据更安全，离线也能用'}
            </p>
            {!isIOS && (
              <button onClick={handleInstall}
                className="w-full mt-3 py-2.5 btn-primary card-press text-sm">
                安装
              </button>
            )}
          </div>
          <button onClick={handleDismiss}
            className="text-lg leading-none flex-shrink-0 px-1"
            style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>
      </div>
    </div>
  );
}
