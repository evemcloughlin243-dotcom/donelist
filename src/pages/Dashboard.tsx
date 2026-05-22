import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActivityStore } from '../stores/activityStore';
import { useCategoryStore } from '../stores/categoryStore';
import { useTagStore } from '../stores/tagStore';
import { useTimerStore } from '../stores/timerStore';
import { useTheme } from '../hooks/useTheme';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Activity } from '../db/database';

export default function Dashboard() {
  const { activities, loaded, load, add } = useActivityStore();
  const { categories, load: loadCats } = useCategoryStore();
  const { load: loadTags } = useTagStore();
  const timer = useTimerStore();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const [todayTotal, setTodayTotal] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [weekData, setWeekData] = useState<{ day: string; minutes: number }[]>([]);
  const [recent, setRecent] = useState<Activity[]>([]);

  useEffect(() => {
    load(); loadCats(); loadTags();
  }, [load, loadCats, loadTags]);

  useEffect(() => {
    if (timer.status === 'running') {
      intervalRef.current = window.setInterval(() => setElapsed(timer.getElapsed()), 200);
    } else {
      setElapsed(timer.getElapsed());
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timer.status, timer]);

  useEffect(() => {
    if (!loaded) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayActs = activities.filter((a) => a.date === today);
    setTodayTotal(todayActs.reduce((sum, a) => sum + a.duration, 0));
    setTodayCount(todayActs.length);
    setRecent(activities.slice(0, 5));
    const now = new Date();
    const days = eachDayOfInterval({
      start: startOfWeek(now, { weekStartsOn: 1 }),
      end: endOfWeek(now, { weekStartsOn: 1 }),
    });
    setWeekData(days.map((d) => {
      const ds = format(d, 'yyyy-MM-dd');
      return { day: format(d, 'EEE', { locale: zhCN }), minutes: activities.filter((a) => a.date === ds).reduce((s, a) => s + a.duration, 0) };
    }));
  }, [loaded, activities]);

  const handleStopTimer = async () => {
    // 必须在 stop() 之前捕获状态，stop() 会清空所有字段
    const captured = {
      name: timer.name,
      categoryId: timer.categoryId,
      tagIds: [...timer.tagIds],
      notes: timer.notes,
    };
    const { duration, startTime } = timer.stop();
    if (duration < 1) return;
    await add({
      name: captured.name || '未命名事项', duration,
      categoryId: captured.categoryId || categories[0]?.id || '',
      tagIds: captured.tagIds, timestamp: startTime,
      date: format(new Date(), 'yyyy-MM-dd'), notes: captured.notes,
    });
  };

  const getCatById = (id: string) => categories.find((c) => c.id === id);

  const formatElapsed = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600), m = Math.floor((totalSec % 3600) / 60), s = totalSec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const todayHours = Math.floor(todayTotal / 60), todayMins = todayTotal % 60;
  const weekMax = Math.max(...weekData.map((w) => w.minutes), 1);
  const isDark = theme === 'dark';

  return (
    <div className="px-4 pt-4 pb-2 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Donelist</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{format(new Date(), 'M月d日 EEEE', { locale: zhCN })}</p>
        </div>
        <button onClick={() => navigate('/history')} className="text-xs" style={{ color: 'var(--text-muted)' }}>
          所有记录 →
        </button>
      </div>

      {/* Timer Hero */}
      <div className={`card-lg p-6 ${timer.status === 'running' ? 'timer-pulse' : ''}`}
        style={{
          ...(timer.status === 'running' ? { borderColor: 'var(--accent-border)' } : {}),
          ...(timer.status === 'paused' ? { borderColor: 'rgba(245,158,11,0.3)' } : {}),
        }}>
        {timer.status === 'idle' ? (
          <>
            <p className="label-sm">快速开始</p>
            <div className="grid grid-cols-5 gap-2 mb-5">
              {categories.slice(0, 5).map((cat) => (
                <button key={cat.id} onClick={() => timer.start({ categoryId: cat.id })}
                  className="card flex flex-col items-center gap-2 py-4 rounded-xl card-press"
                  style={{ border: '1px solid var(--border)' }}>
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{cat.name}</span>
                </button>
              ))}
            </div>
            <button onClick={() => navigate('/record')}
              className="w-full py-3 rounded-2xl text-sm font-medium card-press"
              style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              ✦ 自定义记录
            </button>
          </>
        ) : (
          <>
            <div className="text-center space-y-2 mb-6">
              <div className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-500 uppercase tracking-widest font-medium">
                  {timer.status === 'running' ? '计时中' : '已暂停'}
                </span>
              </div>
              <p className="text-5xl font-bold tabular-nums tracking-tight" style={{ color: 'var(--text)' }}>
                {formatElapsed(elapsed)}
              </p>
              {timer.name && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{timer.name}</p>}
              {timer.categoryId && (
                <span className="inline-block text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-card-hover)', color: 'var(--text-secondary)' }}>
                  {getCatById(timer.categoryId)?.icon} {getCatById(timer.categoryId)?.name}
                </span>
              )}
            </div>
            <div className="flex gap-3">
              {timer.status === 'running' ? (
                <button onClick={timer.pause} className="flex-1 py-3 rounded-2xl text-sm font-medium card-press"
                  style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#d97706' }}>
                  暂停
                </button>
              ) : (
                <button onClick={timer.resume} className="flex-1 py-3 rounded-2xl text-sm font-medium card-press"
                  style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#059669' }}>
                  继续
                </button>
              )}
              <button onClick={handleStopTimer} className="flex-[2] py-3 rounded-2xl text-sm font-semibold card-press"
                style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: '#ef4444' }}>
                结束计时
              </button>
            </div>
            {!timer.name && (
              <input type="text" value={timer.name} onChange={(e) => timer.setField('name', e.target.value)}
                placeholder="在做什么？（可选）"
                className="w-full mt-3 bg-transparent text-center text-sm outline-none"
                style={{ color: 'var(--text-secondary)' }} />
            )}
          </>
        )}
      </div>

      {/* Today summary */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: '今日时长', value: `${todayHours > 0 ? todayHours + 'h ' : ''}${todayMins}m` },
          { label: '今日记录', value: `${todayCount} 条` },
        ].map((s) => (
          <div key={s.label} className="card-lg p-4">
            <p className="label-sm">{s.label}</p>
            <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Week mini bars */}
      {weekData.length > 0 && (
        <div className="card-lg p-4">
          <p className="label-sm">本周</p>
          <div className="flex justify-between items-end gap-1.5 h-20">
            {weekData.map((d) => {
              const height = Math.max((d.minutes / weekMax) * 100, 2);
              return (
                <div key={d.day} className="flex flex-col items-center gap-1.5 flex-1">
                  <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {d.minutes > 0 ? `${(d.minutes / 60).toFixed(1)}h` : ''}
                  </span>
                  <div className="w-full rounded-t-md transition-all duration-500"
                    style={{
                      height: `${height}%`,
                      background: d.minutes > 0
                        ? 'linear-gradient(180deg, #818cf8 0%, #6366f1 100%)'
                        : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                    }} />
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{d.day}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent */}
      <div>
        <h2 className="label-sm" style={{ marginBottom: '0.75rem' }}>最近记录</h2>
        {recent.length === 0 ? (
          <div className="card-lg p-8 text-center">
            <p className="text-3xl mb-2">⏱️</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>还没有记录</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>点击上方分类快速开始</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {recent.map((a) => {
              const cat = getCatById(a.categoryId);
              return (
                <div key={a.id} onClick={() => navigate(`/record/${a.id}`)}
                  className="card rounded-xl px-4 py-3 flex items-center gap-3 card-press">
                  <span className="text-lg">{cat?.icon ?? '📌'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{a.name}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{cat?.name} · {format(a.timestamp, 'HH:mm')}</p>
                  </div>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {Math.floor(a.duration / 60)}h{a.duration % 60}m
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
