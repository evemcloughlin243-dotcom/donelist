import { useState, useEffect } from 'react';
import { db } from '../db/database';
import { PROVIDERS, getAIConfig, saveAIConfig, type AIConfig } from '../lib/ai';
import { useTheme } from '../hooks/useTheme';

export default function Settings() {
  const { theme, toggle } = useTheme();
  const [config, setConfig] = useState<AIConfig>({
    provider: 'anthropic', apiKey: '', model: '', baseURL: '',
  });
  const [saved, setSaved] = useState(false);
  const [storageInfo, setStorageInfo] = useState({ persisted: false, usage: '', quota: '' });

  useEffect(() => {
    setConfig(getAIConfig());
    // 检查存储状态
    (async () => {
      let persisted = false;
      if ('storage' in navigator && 'persisted' in navigator.storage) {
        persisted = await navigator.storage.persisted();
      }
      let usage = '', quota = '';
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const est = await navigator.storage.estimate();
        usage = est.usage ? `${(est.usage / 1024 / 1024).toFixed(1)} MB` : '?';
        quota = est.quota ? `${(est.quota / 1024 / 1024).toFixed(0)} MB` : '?';
      }
      setStorageInfo({ persisted, usage, quota });
    })();
  }, []);

  const selectedProvider = PROVIDERS.find((p) => p.id === config.provider);

  const handleProviderChange = (providerId: string) => {
    const provider = PROVIDERS.find((p) => p.id === providerId);
    setConfig((c) => ({
      ...c,
      provider: providerId,
      model: provider?.defaultModel || '',
      baseURL: provider?.defaultBaseURL || '',
    }));
  };

  const handleSave = () => {
    saveAIConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleExport = async () => {
    const data = {
      activities: await db.activities.toArray(), categories: await db.categories.toArray(),
      tags: await db.tags.toArray(), goals: await db.goals.toArray(), plans: await db.plans.toArray(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `donelist-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (data.activities) { await db.activities.clear(); await db.activities.bulkAdd(data.activities); }
        if (data.categories) { await db.categories.clear(); await db.categories.bulkAdd(data.categories); }
        if (data.tags) { await db.tags.clear(); await db.tags.bulkAdd(data.tags); }
        if (data.goals) { await db.goals.clear(); await db.goals.bulkAdd(data.goals); }
        if (data.plans) { await db.plans.clear(); await db.plans.bulkAdd(data.plans); }
        alert('导入成功！请刷新页面。');
      } catch { alert('导入失败：文件格式不正确'); }
    };
    input.click();
  };

  return (
    <div className="px-4 pt-4 pb-8 space-y-5">
      <h1 className="text-base font-semibold pt-2" style={{ color: 'var(--text)' }}>设置</h1>

      {/* Theme */}
      <div className="card-lg p-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium" style={{ color: 'var(--text)' }}>外观</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {theme === 'light' ? '明亮模式' : '暗色模式'}
          </p>
        </div>
        <button onClick={toggle}
          className="text-2xl p-2 rounded-xl card-press transition-all"
          style={{ background: 'var(--bg-card-hover)' }}>
          {theme === 'light' ? '☀️' : '🌙'}
        </button>
      </div>

      {/* AI Config */}
      <div className="card-lg p-5 space-y-4">
        <div>
          <h2 className="text-sm font-medium" style={{ color: 'var(--text)' }}>AI 模型配置</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>用于个性化计划生成</p>
        </div>

        {/* Provider */}
        <div>
          <label className="label-sm">厂商</label>
          <select
            value={config.provider}
            onChange={(e) => handleProviderChange(e.target.value)}
            className="input-field"
          >
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {selectedProvider && (
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
              接口格式: {selectedProvider.apiFormat === 'anthropic' ? 'Anthropic Messages API' : 'OpenAI Compatible'}
            </p>
          )}
        </div>

        {/* API Key */}
        <div>
          <label className="label-sm">API Key</label>
          <input
            type="password"
            value={config.apiKey}
            onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
            placeholder={config.provider === 'anthropic' ? 'sk-ant-...' : 'sk-...'}
            className="input-field"
          />
        </div>

        {/* Model */}
        <div>
          <label className="label-sm">模型</label>
          <input
            type="text"
            value={config.model}
            onChange={(e) => setConfig({ ...config, model: e.target.value })}
            placeholder={selectedProvider?.defaultModel || '输入模型名'}
            className="input-field"
          />
        </div>

        {/* Base URL */}
        <div>
          <label className="label-sm">Base URL {config.provider === 'anthropic' && <span className="font-normal">(可选)</span>}</label>
          <input
            type="text"
            value={config.baseURL}
            onChange={(e) => setConfig({ ...config, baseURL: e.target.value })}
            placeholder={selectedProvider?.defaultBaseURL || (config.provider === 'custom' ? 'https://api.example.com/v1' : '默认')}
            className="input-field"
          />
          {config.provider === 'custom' && (
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
              填入任意兼容 OpenAI 接口格式的地址
            </p>
          )}
        </div>

        <button
          onClick={handleSave}
          className="px-5 py-2.5 text-sm rounded-xl font-medium transition-all card-press w-full"
          style={saved
            ? { background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#059669' }
            : { background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', color: 'var(--accent)' }
          }
        >
          {saved ? '已保存 ✓' : '保存配置'}
        </button>
      </div>

      {/* Storage status */}
      <div className="card-lg p-5 space-y-2">
        <h2 className="text-sm font-medium" style={{ color: 'var(--text)' }}>存储状态</h2>
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: 'var(--text-secondary)' }}>持久化保护</span>
          <span style={{ color: storageInfo.persisted ? '#22c55e' : '#f59e0b' }}>
            {storageInfo.persisted ? '已启用 ✓' : '未启用 ⚠'}
          </span>
        </div>
        {storageInfo.usage && (
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--text-secondary)' }}>已用空间</span>
            <span style={{ color: 'var(--text-muted)' }}>{storageInfo.usage} / {storageInfo.quota}</span>
          </div>
        )}
        {!storageInfo.persisted && (
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            建议将应用添加到主屏幕以启用持久化存储，防止数据被浏览器自动清理
          </p>
        )}
      </div>

      {/* Install */}
      <div className="card-lg p-5 space-y-3">
        <div>
          <h2 className="text-sm font-medium" style={{ color: 'var(--text)' }}>安装应用</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>添加到手机桌面，像 App 一样使用，数据更安全</p>
        </div>
        <button onClick={() => {
          // Re-show the install prompt
          localStorage.removeItem('donelist_pwa_dismissed');
          window.location.reload();
        }} className="btn-ghost w-full py-3 rounded-xl">
          📲 重新显示安装指引
        </button>
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          Android: Chrome 右上角 ⋮ → 安装应用<br/>
          iOS: Safari 底部 分享 → 添加到主屏幕
        </p>
      </div>

      {/* Data management */}
      <div className="card-lg p-5 space-y-4">
        <div>
          <h2 className="text-sm font-medium" style={{ color: 'var(--text)' }}>数据管理</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>导出或导入 JSON 格式的完整数据备份</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-ghost flex-1 py-3 rounded-xl">导出 JSON</button>
          <button onClick={handleImport} className="btn-ghost flex-1 py-3 rounded-xl">导入 JSON</button>
        </div>
      </div>

      <p className="text-[10px] text-center pt-2" style={{ color: 'var(--text-muted)' }}>Donelist v1.0.0</p>
    </div>
  );
}
