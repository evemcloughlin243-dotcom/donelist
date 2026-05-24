import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type BrowserType = 'chrome' | 'safari-ios' | 'samsung' | 'firefox' | 'other-android' | 'desktop';

function detectBrowser(): BrowserType {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/.test(ua)) return 'safari-ios';
  if (/Android/.test(ua)) {
    if (/Chrome/.test(ua) && !/SamsungBrowser/.test(ua)) return 'chrome';
    if (/SamsungBrowser/.test(ua)) return 'samsung';
    if (/Firefox/.test(ua)) return 'firefox';
    return 'other-android';
  }
  return 'desktop';
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const browser = detectBrowser();

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Also show a one-time popup after 3 seconds on mobile
  useEffect(() => {
    if (installed) return;
    if (browser === 'desktop') return;
    const dismissed = localStorage.getItem('donelist_install_popup');
    if (!dismissed) {
      const t = setTimeout(() => {
        setShowModal(true);
        localStorage.setItem('donelist_install_popup', '1');
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [browser, installed]);

  const handleInstall = async () => {
    if (deferred) {
      setShowModal(false);
      await deferred.prompt();
      const r = await deferred.userChoice;
      if (r.outcome === 'accepted') {
        setInstalled(true);
        return;
      }
    }
    // No deferred prompt — show manual instructions
    if (browser === 'chrome') {
      alert('点击浏览器右上角 ⋮ 菜单 → "安装应用"');
    } else if (browser === 'samsung') {
      alert('点击浏览器底部 ≡ 菜单 → "安装应用" 或 "添加到主屏幕"');
    } else if (browser === 'firefox') {
      alert('Firefox 不支持 PWA 安装。建议用 Chrome 打开此网址：\nhttps://evemcloughlin243-dotcom.github.io/donelist/');
    } else if (browser === 'other-android') {
      alert('请在浏览器菜单中查找"安装应用"或"添加到主屏幕"选项。\n推荐使用 Chrome 浏览器。');
    } else if (browser === 'safari-ios') {
      alert('点击 Safari 底部中间 分享按钮 ↑ → 向右滑动 → "添加到主屏幕"');
    }
  };

  const browserInstructions = () => {
    switch (browser) {
      case 'chrome':
        return deferred
          ? '点击下方按钮一键安装到桌面'
          : 'Chrome 右上角 ⋮ → 安装应用';
      case 'samsung':
        return 'Samsung 浏览器底部 ≡ → 安装应用';
      case 'firefox':
        return 'Firefox 不支持安装。建议换 Chrome 打开';
      case 'safari-ios':
        return 'Safari 底部中间 ↑ 分享 → 添加到主屏幕';
      case 'other-android':
        return '浏览器菜单中找"安装应用"，推荐用 Chrome';
      case 'desktop':
        return '用手机打开此网址即可安装到桌面';
    }
  };

  if (installed) return null;

  return (
    <>
      {/* Persistent floating button */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed right-4 z-40 flex items-center gap-1.5 px-3 py-2 rounded-full shadow-lg card-press slide-up"
        style={{
          bottom: '5rem',
          background: 'var(--accent)',
          color: '#fff',
          fontSize: '0.75rem',
          fontWeight: 600,
          boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
        }}
      >
        <span className="text-base leading-none">📲</span>
        <span>安装</span>
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowModal(false)}>
          <div className="card-lg p-6 w-full max-w-sm mx-4 mb-6 sm:mb-0 space-y-4 slide-up"
            style={{ boxShadow: 'var(--shadow-lg)' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <span className="text-4xl mb-3 block">
                {browser === 'safari-ios' ? '📱' : browser === 'chrome' && deferred ? '⬇️' : '📲'}
              </span>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
                {deferred ? '安装 Donelist' : '添加到桌面'}
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                {browserInstructions()}
              </p>
            </div>

            {browser === 'safari-ios' && (
              <div className="bg-white/[0.03] rounded-xl p-3 space-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                  点击 Safari 底部中间的 <span style={{ color: 'var(--text)' }}>↑ 分享</span> 按钮
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                  向右滑动，找到 <span style={{ color: 'var(--text)' }}>「添加到主屏幕」</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold">3</span>
                  点右上角「添加」即可
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setShowModal(false)}
                className="btn-ghost flex-1 py-3 rounded-xl">关闭</button>
              <button onClick={handleInstall}
                className="btn-primary flex-1 py-3 rounded-xl card-press">
                {deferred ? '一键安装' : browser === 'firefox' ? '知道了' : '知道怎么装了'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
