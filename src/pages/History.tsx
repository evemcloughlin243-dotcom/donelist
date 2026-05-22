import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActivityStore } from '../stores/activityStore';
import { useCategoryStore } from '../stores/categoryStore';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Activity } from '../db/database';

export default function History() {
  const { activities, load, loaded, remove } = useActivityStore();
  const { categories, load: loadCats } = useCategoryStore();
  const navigate = useNavigate();

  useEffect(() => { load(); loadCats(); }, [load, loadCats]);

  const getCatById = (id: string) => categories.find((c) => c.id === id);

  const grouped = activities.reduce<Record<string, Activity[]>>((acc, a) => {
    (acc[a.date] ??= []).push(a); return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const fmtHeader = (ds: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const yest = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
    if (ds === today) return '今天';
    if (ds === yest) return '昨天';
    return format(new Date(ds), 'M月d日 EEEE', { locale: zhCN });
  };

  return (
    <div className="px-4 pt-4 pb-2 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-base font-semibold" style={{ color: 'var(--text)' }}>历史记录</h1>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{activities.length} 条</span>
      </div>

      {!loaded ? (
        <div className="card-lg p-8 text-center"><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>加载中...</p></div>
      ) : sortedDates.length === 0 ? (
        <div className="card-lg p-10 text-center">
          <p className="text-3xl mb-3">📋</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>暂无记录</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>开始计时或手动记录吧</p>
        </div>
      ) : (
        sortedDates.map((ds) => {
          const dayTotal = grouped[ds].reduce((s, a) => s + a.duration, 0);
          return (
            <div key={ds}>
              <div className="flex items-baseline justify-between mb-2 mt-1">
                <h2 className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{fmtHeader(ds)}</h2>
                <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }}>{(dayTotal / 60).toFixed(1)}h</span>
              </div>
              <div className="space-y-1">
                {grouped[ds].map((a) => {
                  const cat = getCatById(a.categoryId);
                  return (
                    <div key={a.id} onClick={() => navigate(`/record/${a.id}`)}
                      className="card rounded-xl px-4 py-3 flex items-center gap-3 card-press group">
                      <span className="text-lg">{cat?.icon ?? '📌'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{a.name}</p>
                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{cat?.name} · {format(a.timestamp, 'HH:mm')}</p>
                      </div>
                      <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                        {Math.floor(a.duration / 60) > 0 ? `${Math.floor(a.duration / 60)}h${a.duration % 60}m` : `${a.duration}m`}
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); if (confirm('确定删除？')) remove(a.id); }}
                        className="text-xs px-1 opacity-0 group-hover:opacity-100 transition-all hover:text-red-400"
                        style={{ color: 'var(--text-muted)' }}>✕</button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
