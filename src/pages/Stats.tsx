import { useEffect, useState, useMemo } from 'react';
import { useActivityStore } from '../stores/activityStore';
import { useCategoryStore } from '../stores/categoryStore';
import { useTagStore } from '../stores/tagStore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, LineChart, Line } from 'recharts';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { zhCN } from 'date-fns/locale';

type Range = '7d' | '30d' | '90d' | 'all';
const RANGES: Record<Range, string> = { '7d': '7天', '30d': '30天', '90d': '90天', 'all': '全部' };

export default function Stats() {
  const { activities, load: loadActs, loaded } = useActivityStore();
  const { categories, load: loadCats } = useCategoryStore();
  const { tags, load: loadTags } = useTagStore();
  const [range, setRange] = useState<Range>('7d');

  useEffect(() => { loadActs(); loadCats(); loadTags(); }, [loadActs, loadCats, loadTags]);

  const filtered = useMemo(() => {
    if (!loaded) return [];
    if (range === 'all') return activities;
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    return activities.filter((a) => a.date >= format(subDays(new Date(), days - 1), 'yyyy-MM-dd'));
  }, [activities, loaded, range]);

  const getCat = (id: string) => categories.find((c) => c.id === id);
  const getTag = (id: string) => tags.find((t) => t.id === id);

  const catData = useMemo(() => {
    const m: Record<string, { name: string; value: number; color: string; icon: string }> = {};
    filtered.forEach((a) => {
      const c = getCat(a.categoryId); if (!c) return;
      (m[a.categoryId] ??= { name: c.name, value: 0, color: c.color, icon: c.icon }).value += a.duration;
    });
    return Object.values(m).sort((a, b) => b.value - a.value);
  }, [filtered, categories]);

  const tagData = useMemo(() => {
    const m: Record<string, { name: string; value: number; color: string }> = {};
    filtered.forEach((a) => a.tagIds.forEach((tid) => {
      const t = getTag(tid); if (!t) return;
      (m[tid] ??= { name: t.name, value: 0, color: t.color }).value += a.duration;
    }));
    return Object.values(m).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [filtered, tags]);

  const dailyData = useMemo(() => {
    const n = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 30;
    return eachDayOfInterval({ start: subDays(new Date(), n - 1), end: new Date() }).map((d) => {
      const ds = format(d, 'yyyy-MM-dd');
      return { day: format(d, 'MM/dd'), weekday: format(d, 'EEE', { locale: zhCN }), minutes: filtered.filter((a) => a.date === ds).reduce((s, a) => s + a.duration, 0) };
    });
  }, [filtered, range]);

  const totalMin = filtered.reduce((s, a) => s + a.duration, 0);
  const activeDays = new Set(filtered.map((a) => a.date)).size;
  const avg = activeDays > 0 ? Math.round(totalMin / activeDays) : 0;
  const top = catData[0];

  const fmt = (m: number) => m >= 60 ? `${(m / 60).toFixed(1)}h` : `${m}m`;
  const ttip = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '12px', color: 'var(--text)' };

  if (!loaded) return (
    <div className="px-4 pt-4 pb-2">
      <h1 className="text-base font-semibold pt-2" style={{ color: 'var(--text)' }}>统计分析</h1>
      <div className="card-lg p-8 text-center mt-4"><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>加载中...</p></div>
    </div>
  );

  return (
    <div className="px-4 pt-4 pb-8 space-y-5">
      <h1 className="text-base font-semibold pt-2" style={{ color: 'var(--text)' }}>统计分析</h1>

      <div className="flex gap-1 rounded-2xl p-1" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {(Object.keys(RANGES) as Range[]).map((r) => (
          <button key={r} onClick={() => setRange(r)}
            className="flex-1 py-2 text-xs rounded-xl font-medium transition-all"
            style={{ background: range === r ? 'var(--bg-card-hover)' : 'transparent', color: range === r ? 'var(--text)' : 'var(--text-muted)' }}>
            {RANGES[r]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { l: '总时长', v: `${(totalMin / 60).toFixed(1)}`, u: 'h' },
          { l: '活跃天数', v: String(activeDays), u: '天' },
          { l: '日均', v: fmt(avg), u: '' },
          { l: '最多', v: top ? `${top.icon} ${top.name}` : '-', u: '' },
        ].map((s) => (
          <div key={s.l} className="card-lg p-4">
            <p className="label-sm">{s.l}</p>
            <p className="text-xl font-bold truncate" style={{ color: 'var(--text)' }}>{s.v}<span className="text-xs font-normal ml-0.5" style={{ color: 'var(--text-muted)' }}>{s.u}</span></p>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card-lg p-10 text-center"><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>该时间范围内暂无记录</p></div>
      ) : (
        <>
          {catData.length > 0 && (
            <div className="card-lg p-5">
              <h2 className="label-sm">分类分布</h2>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={catData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                      {catData.map((e) => (<Cell key={e.name} fill={e.color} opacity={0.85} />))}
                    </Pie>
                    <Tooltip contentStyle={ttip as any} formatter={(v: number) => [fmt(v), '时长']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-2">
                {catData.map((c) => (
                  <div key={c.name} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />{c.icon} {c.name}
                    <span style={{ color: 'var(--text-muted)' }}>{fmt(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dailyData.length > 0 && (
            <div className="card-lg p-5">
              <h2 className="label-sm">每日趋势</h2>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                    <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v >= 60 ? `${v / 60}h` : `${v}m`} />
                    <Tooltip contentStyle={ttip as any} formatter={(v: number) => [fmt(v), '时长']} />
                    <Line type="monotone" dataKey="minutes" stroke="url(#lg)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#818cf8' }} />
                    <defs>
                      <linearGradient id="lg" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#a78bfa" />
                      </linearGradient>
                    </defs>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {tagData.length > 0 && (
            <div className="card-lg p-5">
              <h2 className="label-sm">标签排行</h2>
              <div className="space-y-2">
                {tagData.map((t, i) => {
                  const max = tagData[0]?.value || 1;
                  return (
                    <div key={t.name} className="flex items-center gap-3">
                      <span className="text-[10px] w-4 tabular-nums" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                      <span className="text-xs w-14 truncate" style={{ color: 'var(--text-secondary)' }}>{t.name}</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-card-hover)' }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(t.value / max) * 100}%`, backgroundColor: t.color, opacity: 0.7 }} />
                      </div>
                      <span className="text-[10px] tabular-nums w-10 text-right" style={{ color: 'var(--text-muted)' }}>{fmt(t.value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
