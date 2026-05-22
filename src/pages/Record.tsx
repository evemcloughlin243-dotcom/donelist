import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useActivityStore } from '../stores/activityStore';
import { useCategoryStore } from '../stores/categoryStore';
import { useTagStore } from '../stores/tagStore';
import { useTimerStore } from '../stores/timerStore';
import { format } from 'date-fns';

export default function Record() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activities, add, update } = useActivityStore();
  const { categories, load: loadCats } = useCategoryStore();
  const { tags, load: loadTags } = useTagStore();
  const timer = useTimerStore();

  const [name, setName] = useState('');
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(30);
  const [categoryId, setCategoryId] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState(format(new Date(), 'HH:mm'));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'timer' | 'manual'>('timer');
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => { loadCats(); loadTags(); }, [loadCats, loadTags]);

  useEffect(() => {
    if (timer.status === 'running') {
      intervalRef.current = window.setInterval(() => setElapsed(timer.getElapsed()), 200);
    } else {
      setElapsed(timer.getElapsed());
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timer.status, timer]);

  useEffect(() => {
    if (id && activities.length > 0) {
      const act = activities.find((a) => a.id === id);
      if (act) {
        setName(act.name); setHours(Math.floor(act.duration / 60)); setMinutes(act.duration % 60);
        setCategoryId(act.categoryId); setSelectedTags(act.tagIds);
        setDate(act.date); setTime(format(act.timestamp, 'HH:mm')); setNotes(act.notes); setMode('manual');
      }
    }
  }, [id, activities]);

  const handleSave = async () => {
    if (!name.trim() || !categoryId) return;
    setSaving(true);
    let duration: number, timestamp: number;
    if (mode === 'timer' && timer.status !== 'idle') {
      const r = timer.stop(); duration = r.duration; timestamp = r.startTime;
    } else if (mode === 'timer') {
      duration = Math.round(elapsed / 60000); timestamp = Date.now() - elapsed;
    } else {
      duration = hours * 60 + minutes; timestamp = new Date(`${date}T${time}:00`).getTime();
    }
    if (duration < 1) { setSaving(false); return; }
    const data = { name: name.trim(), duration, categoryId, tagIds: selectedTags, timestamp, date: format(timestamp, 'yyyy-MM-dd'), notes: notes.trim() };
    if (id) await update(id, data); else await add(data);
    setSaving(false); navigate('/');
  };

  const handleStartTimer = () => {
    timer.start({ name: name.trim() || undefined, categoryId: categoryId || categories[0]?.id, tagIds: selectedTags });
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((p) => p.includes(tagId) ? p.filter((t) => t !== tagId) : [...p, tagId]);
    if (isTimerActive) timer.toggleTag(tagId);
  };

  const tagsByParent = (pid: string | null) => tags.filter((t) => t.parentId === pid);

  const formatElapsed = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const isTimerActive = timer.status !== 'idle';

  return (
    <div className="px-4 pt-4 pb-24 space-y-5">
      <div className="flex items-center justify-between pt-2">
        <button onClick={() => navigate(-1)} className="text-sm" style={{ color: 'var(--text-muted)' }}>← 返回</button>
        <h1 className="text-base font-semibold" style={{ color: 'var(--text)' }}>{id ? '编辑记录' : '记录事项'}</h1>
        <div className="w-10" />
      </div>

      {!id && (
        <div className="flex rounded-2xl p-1" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {[
            { v: 'timer' as const, l: '⏱ 计时模式' },
            { v: 'manual' as const, l: '📝 手动输入' },
          ].map(({ v, l }) => (
            <button key={v} onClick={() => setMode(v)}
              className="flex-1 py-2 text-sm rounded-xl font-medium transition-all"
              style={{
                background: mode === v ? 'var(--bg-card-hover)' : 'transparent',
                color: mode === v ? 'var(--text)' : 'var(--text-muted)',
              }}>{l}</button>
          ))}
        </div>
      )}

      <div>
        <label className="label-sm">事项名称</label>
        <input type="text" value={name}
          onChange={(e) => { setName(e.target.value); if (isTimerActive) timer.setField('name', e.target.value); }}
          placeholder="做了什么？" className="input-field" />
      </div>

      {mode === 'timer' ? (
        <div className="card-lg p-5 text-center space-y-4">
          {isTimerActive ? (
            <>
              <div className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-500 uppercase tracking-widest font-medium">
                  {timer.status === 'running' ? '计时中' : '已暂停'}
                </span>
              </div>
              <p className="text-5xl font-bold tabular-nums tracking-tight" style={{ color: 'var(--text)' }}>{formatElapsed(elapsed)}</p>
              <div className="flex gap-3">
                {timer.status === 'running' ? (
                  <button onClick={timer.pause} className="flex-1 py-3 rounded-2xl text-sm font-medium card-press"
                    style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#d97706' }}>暂停</button>
                ) : (
                  <button onClick={timer.resume} className="flex-1 py-3 rounded-2xl text-sm font-medium card-press"
                    style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#059669' }}>继续</button>
                )}
                <button onClick={() => { const d = timer.getElapsed(); timer.stop(); setElapsed(d); }}
                  className="flex-1 py-3 rounded-2xl text-sm font-semibold card-press"
                  style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: '#ef4444' }}>停止计时</button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>点击开始，自动记录时长</p>
              {elapsed > 0 && <p className="text-4xl font-bold" style={{ color: 'var(--text)' }}>{formatElapsed(elapsed)}</p>}
              <button onClick={handleStartTimer}
                className="w-full py-3.5 rounded-2xl text-sm font-semibold card-press"
                style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', color: 'var(--accent)' }}>
                开始计时
              </button>
            </>
          )}
        </div>
      ) : (
        <div>
          <label className="label-sm">时长</label>
          <div className="flex gap-2 items-center">
            {[
              { v: hours, set: setHours, max: 99, unit: '小时' },
              { v: minutes, set: (v: number) => setMinutes(Math.max(0, Math.min(59, v))), max: 59, unit: '分钟' },
            ].map((f) => (
              <div key={f.unit} className="flex-1 input-field flex items-center gap-2">
                <input type="number" value={f.v} onChange={(e) => f.set(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-12 bg-transparent text-center outline-none tabular-nums" style={{ color: 'var(--text)' }} />
                <span style={{ color: 'var(--text-secondary)' }} className="text-sm">{f.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === 'manual' && (
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="label-sm">日期</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field" />
          </div>
          <div className="flex-1">
            <label className="label-sm">时间</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input-field" />
          </div>
        </div>
      )}

      <div>
        <label className="label-sm">分类</label>
        <div className="grid grid-cols-5 gap-2">
          {categories.map((cat) => {
            const active = categoryId === cat.id;
            return (
              <button key={cat.id} onClick={() => { setCategoryId(cat.id); if (isTimerActive) timer.setField('categoryId', cat.id); }}
                className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl card-press transition-all"
                style={{
                  background: active ? 'var(--accent-bg)' : 'var(--bg-card)',
                  border: active ? '1px solid var(--accent-border)' : '1px solid var(--border)',
                }}>
                <span className="text-xl">{cat.icon}</span>
                <span className="text-[10px]" style={{ color: active ? 'var(--accent)' : 'var(--text-secondary)' }}>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="label-sm">标签</label>
        <div className="space-y-2">
          {categories.map((cat) => {
            const subs = tagsByParent(cat.id);
            if (!subs.length) return null;
            return (
              <div key={cat.id} className="flex flex-wrap gap-1.5">
                {subs.map((tag) => {
                  const active = selectedTags.includes(tag.id);
                  return (
                    <button key={tag.id} onClick={() => toggleTag(tag.id)}
                      className="px-3 py-1.5 rounded-lg text-xs card-press transition-all"
                      style={{
                        background: active ? 'var(--accent-bg)' : 'var(--bg-card)',
                        border: active ? '1px solid var(--accent-border)' : '1px solid var(--border)',
                        color: active ? 'var(--accent)' : 'var(--text-secondary)',
                      }}>{tag.name}</button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <label className="label-sm">备注</label>
        <textarea value={notes}
          onChange={(e) => { setNotes(e.target.value); if (isTimerActive) timer.setField('notes', e.target.value); }}
          placeholder="补充说明..." rows={2} className="input-field resize-none" />
      </div>

      <button onClick={handleSave} disabled={saving || !name.trim() || !categoryId}
        className="w-full btn-primary card-press">
        {saving ? '保存中...' : id ? '更新记录' : '✓ 记录完成'}
      </button>
    </div>
  );
}
