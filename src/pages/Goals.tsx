import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoalStore } from '../stores/goalStore';
import { useCategoryStore } from '../stores/categoryStore';
import { format } from 'date-fns';
import type { Goal } from '../db/database';

const badgeColors: Record<string, { bg: string; border: string; color: string }> = {
  active: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', color: '#059669' },
  completed: { bg: 'rgba(14,165,233,0.08)', border: 'rgba(14,165,233,0.2)', color: '#0284c7' },
  paused: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', color: '#d97706' },
};
const badgeLabels: Record<string, string> = { active: '进行中', completed: '已完成', paused: '已暂停' };

export default function Goals() {
  const { goals, load, loaded, add, update, remove } = useGoalStore();
  const { categories, load: loadCats } = useCategoryStore();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState({
    title: '', description: '', targetCategories: [] as string[],
    targetHoursPerWeek: 20, startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: '', status: 'active' as Goal['status'],
  });

  useEffect(() => { load(); loadCats(); }, [load, loadCats]);

  const reset = () => {
    setF({ title: '', description: '', targetCategories: [], targetHoursPerWeek: 20,
      startDate: format(new Date(), 'yyyy-MM-dd'), endDate: '', status: 'active' });
    setEditId(null);
  };

  const save = async () => {
    if (!f.title.trim()) return;
    if (editId) await update(editId, { ...f, endDate: f.endDate || null } as Partial<Goal>);
    else await add({ ...f, endDate: f.endDate || null } as any);
    setShow(false); reset();
  };

  const edit = (g: Goal) => {
    setEditId(g.id);
    setF({ title: g.title, description: g.description, targetCategories: g.targetCategories,
      targetHoursPerWeek: g.targetHoursPerWeek, startDate: g.startDate, endDate: g.endDate ?? '', status: g.status });
    setShow(true);
  };

  return (
    <div className="px-4 pt-4 pb-8 space-y-5">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-base font-semibold" style={{ color: 'var(--text)' }}>目标管理</h1>
        <button onClick={() => { reset(); setShow(true); }} className="btn-ghost text-xs">+ 新建</button>
      </div>

      {!loaded ? (
        <div className="card-lg p-8 text-center"><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>加载中...</p></div>
      ) : goals.length === 0 ? (
        <div className="card-lg p-10 text-center">
          <p className="text-3xl mb-3">🎯</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>还没有目标</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>创建目标后，AI 可基于历史数据生成个性化计划</p>
        </div>
      ) : (
        <div className="space-y-2">
          {goals.map((g) => {
            const bs = badgeColors[g.status];
            return (
              <div key={g.id} className="card-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm truncate" style={{ color: 'var(--text)' }}>{g.title}</h3>
                      <span className="badge" style={{ background: bs.bg, border: `1px solid ${bs.border}`, color: bs.color }}>{badgeLabels[g.status]}</span>
                    </div>
                    {g.description && <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{g.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  <span>{(g.targetHoursPerWeek ?? 0)}h/周</span>
                  <span>{g.startDate}{g.endDate ? ` → ${g.endDate}` : ' 起'}</span>
                </div>
                {g.targetCategories.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {g.targetCategories.map((cid) => {
                      const cat = categories.find((c) => c.id === cid);
                      return cat ? (
                        <span key={cid} className="text-[10px] px-2 py-0.5 rounded-md" style={{ background: 'var(--bg-card-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                          {cat.icon} {cat.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => navigate(`/plan?goalId=${g.id}`)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium card-press"
                    style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', color: 'var(--accent)' }}>
                    🤖 生成计划
                  </button>
                  <button onClick={() => edit(g)} className="btn-ghost text-xs px-3 py-1.5">编辑</button>
                  <button onClick={() => { if (confirm('确定删除？')) remove(g.id); }} className="btn-ghost text-xs px-3 py-1.5 hover:text-red-400">删除</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="card-lg p-6 w-full max-w-sm space-y-4 max-h-[90vh] overflow-y-auto" style={{ boxShadow: 'var(--shadow-lg)' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{editId ? '编辑目标' : '新建目标'}</h2>
            <div><label className="label-sm">名称</label><input type="text" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className="input-field" placeholder="例如：提升编程技能" /></div>
            <div><label className="label-sm">描述</label><textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="input-field resize-none" rows={2} placeholder="具体想达成什么？" /></div>
            <div>
              <label className="label-sm">关注分类</label>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => {
                  const active = f.targetCategories.includes(cat.id);
                  return (
                    <button key={cat.id} onClick={() => setF((p) => ({ ...p, targetCategories: p.targetCategories.includes(cat.id) ? p.targetCategories.filter((c) => c !== cat.id) : [...p.targetCategories, cat.id] }))}
                      className="px-3 py-1.5 rounded-lg text-xs transition-all card-press"
                      style={{ background: active ? 'var(--accent-bg)' : 'var(--bg-card)', border: active ? '1px solid var(--accent-border)' : '1px solid var(--border)', color: active ? 'var(--accent)' : 'var(--text-secondary)' }}>
                      {cat.icon} {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1"><label className="label-sm">每周(h)</label><input type="number" value={f.targetHoursPerWeek} onChange={(e) => setF({ ...f, targetHoursPerWeek: parseInt(e.target.value) || 0 })} className="input-field" /></div>
              <div className="flex-1"><label className="label-sm">状态</label><select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Goal['status'] })} className="input-field">
                <option value="active">进行中</option><option value="paused">已暂停</option><option value="completed">已完成</option></select></div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1"><label className="label-sm">开始</label><input type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} className="input-field" /></div>
              <div className="flex-1"><label className="label-sm">结束 (可选)</label><input type="date" value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} className="input-field" /></div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => { setShow(false); reset(); }} className="btn-ghost flex-1 py-3 rounded-xl">取消</button>
              <button onClick={save} className="btn-primary flex-1 py-3 rounded-xl card-press">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
