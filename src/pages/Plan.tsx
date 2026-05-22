import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useGoalStore } from '../stores/goalStore';
import { useActivityStore } from '../stores/activityStore';
import { useCategoryStore } from '../stores/categoryStore';
import { usePlanStore } from '../stores/planStore';
import { format, subDays } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { streamChat, getEffectiveConfig } from '../lib/ai';

export default function Plan() {
  const [searchParams] = useSearchParams(); const goalId = searchParams.get('goalId');
  const navigate = useNavigate();
  const { goals, load: loadGoals } = useGoalStore();
  const { load: loadActs } = useActivityStore();
  const { categories, load: loadCats } = useCategoryStore();
  const { plans, load: loadPlans, add: addPlan, remove: removePlan } = usePlanStore();
  const [generating, setGenerating] = useState(false);
  const [stream, setStream] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { loadGoals(); loadActs(); loadCats(); loadPlans(); }, [loadGoals, loadActs, loadCats, loadPlans]);

  const goal = useMemo(() => (goalId ? goals.find((g) => g.id === goalId) : null), [goals, goalId]);
  const goalPlans = useMemo(() => (goalId ? plans.filter((p) => p.goalId === goalId) : plans), [plans, goalId]);
  const getCat = (id: string) => categories.find((c) => c.id === id);

  const buildPrompt = async () => {
    const config = getEffectiveConfig();
    if (!config.apiKey) { setError('请先在设置页面配置 AI 模型和 API Key'); return null; }
    if (!config.model) { setError('请先在设置页面填写模型名称'); return null; }

    const { db } = await import('../db/database');
    const acts = await db.activities.orderBy('timestamp').reverse().toArray();
    if (!acts.length) { setError('没有历史数据，请先记录一些已做事项'); return null; }
    const cats = await db.categories.toArray(); const tgs = await db.tags.toArray();
    const cm = new Map(cats.map((c) => [c.id, c])); const tm = new Map(tgs.map((t) => [t.id, t]));
    const byCat: Record<string, number> = {}; const byTag: Record<string, number> = {};
    let total = 0;
    acts.forEach((a) => { total += a.duration; byCat[a.categoryId] = (byCat[a.categoryId] || 0) + a.duration; a.tagIds.forEach((tid) => { byTag[tid] = (byTag[tid] || 0) + a.duration; }); });
    const days = new Set(acts.map((a) => a.date)).size;
    const recent = acts.filter((a) => a.date >= format(subDays(new Date(), 6), 'yyyy-MM-dd')).reduce((s, a) => s + a.duration, 0);

    return `你是时间管理教练。请根据以下历史数据生成个性化分析和计划。

## 用户目标
${goal ? `**${goal.title}**\n${goal.description}\n目标分类: ${goal.targetCategories.map((cid) => cm.get(cid)?.name ?? cid).join('、')}\n每周目标: ${goal.targetHoursPerWeek}h` : '无特定目标，请根据数据给出建议'}

## 历史数据
- 总时长: ${(total / 60).toFixed(1)}h / ${days}天 / 日均${Math.floor(total / days / 60)}h${Math.round(total / days) % 60}m / 近7天日均${Math.round(recent / 7 / 60 * 10) / 10}h

## 分类分布
${Object.entries(byCat).sort(([,a],[,b]) => b - a).map(([cid, m]) => `- ${cm.get(cid)?.icon ?? ''} ${cm.get(cid)?.name ?? cid}: ${(m / 60).toFixed(1)}h (${((m / total) * 100).toFixed(0)}%)`).join('\n')}

## Top 标签
${Object.entries(byTag).sort(([,a],[,b]) => b - a).slice(0, 10).map(([tid, m]) => `- ${tm.get(tid)?.name ?? tid}: ${(m / 60).toFixed(1)}h`).join('\n')}

请输出：

### 📊 数据分析
2-3句分析当前时间分配特点。

### 🎯 优化建议
3-5条具体可执行建议，每条带具体时间数字。

### 📅 建议周计划
用表格给出建议的每周时间分配。

要求：具体可执行，用中文，不要太理论。`;
  };

  const generate = async () => {
    setGenerating(true); setStream(''); setError('');
    try {
      const prompt = await buildPrompt(); if (!prompt) { setGenerating(false); return; }
      const systemPrompt = '你是专业时间管理教练。基于用户历史数据提供具体、可执行的时间管理建议。始终用中文回复，简洁实用。';
      let full = '';
      for await (const delta of streamChat(systemPrompt, prompt, setError)) {
        full += delta;
        setStream(full);
      }
      if (!full) { setGenerating(false); return; }
      const { db: d2 } = await import('../db/database');
      const a2 = await d2.activities.orderBy('timestamp').toArray();
      const dts = a2.map((a) => a.date).sort();
      await addPlan({ goalId, generatedAt: Date.now(), timeRange: { start: dts[0] ?? format(new Date(), 'yyyy-MM-dd'), end: dts[dts.length - 1] ?? format(new Date(), 'yyyy-MM-dd') }, content: full });
      await loadPlans();
    } catch (e: any) { setError(e.message ?? '生成失败'); }
    finally { setGenerating(false); }
  };

  return (
    <div className="px-4 pt-4 pb-8 space-y-5">
      <h1 className="text-base font-semibold pt-2" style={{ color: 'var(--text)' }}>AI 计划</h1>

      {goal ? (
        <div className="card-lg p-4 space-y-1">
          <p className="label-sm">当前目标</p>
          <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>{goal.title}</p>
          {goal.description && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{goal.description}</p>}
          <div className="flex flex-wrap gap-1 mt-2">
            {goal.targetCategories.map((cid) => { const cat = getCat(cid); return cat ? <span key={cid} className="text-[10px] px-2 py-0.5 rounded-md" style={{ background: 'var(--bg-card-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>{cat.icon} {cat.name}</span> : null; })}
          </div>
        </div>
      ) : (
        <button onClick={() => navigate('/goals')} className="w-full card-lg p-4 text-left" style={{ color: 'var(--text-secondary)' }}>
          <p className="text-sm">先在目标管理中创建目标，生成更精准的计划 →</p>
        </button>
      )}

      {error && (
        <div className="card-lg p-4" style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger-border)' }}>
          <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
        </div>
      )}

      <button onClick={generate} disabled={generating}
        className="w-full btn-primary card-press flex items-center justify-center gap-2">
        {generating ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />AI 正在分析...</> : '🤖 生成个性化计划'}
      </button>

      {!stream && !generating && goalPlans.length > 0 && (
        <div className="space-y-3">
          <h2 className="label-sm">历史计划</h2>
          {goalPlans.map((p) => (
            <div key={p.id} className="card-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  {format(p.generatedAt, 'yyyy-MM-dd HH:mm')}
                  <span className="ml-2" style={{ color: 'var(--text-muted)' }}>{p.timeRange.start} ~ {p.timeRange.end}</span>
                </p>
                <button onClick={() => removePlan(p.id)} className="text-xs hover:text-red-400 transition-colors" style={{ color: 'var(--text-muted)' }}>删除</button>
              </div>
              <div className="prose prose-sm max-w-none" style={{ color: 'var(--text-secondary)' }}>
                <ReactMarkdown>{p.content}</ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      )}

      {stream && (
        <div className="card-lg p-5 slide-up">
          <p className="text-[11px] mb-4" style={{ color: 'var(--text-secondary)' }}>{format(new Date(), 'yyyy-MM-dd HH:mm')} 生成</p>
          <div className="prose prose-sm max-w-none" style={{ color: 'var(--text-secondary)' }}>
            <ReactMarkdown>{stream}</ReactMarkdown>
          </div>
        </div>
      )}

      {!generating && !goalPlans.length && !stream && (
        <div className="card-lg p-10 text-center">
          <p className="text-3xl mb-3">🤖</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>点击上方按钮，让 AI 分析你的历史数据</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>基于 Claude API，数据在本地处理</p>
        </div>
      )}
    </div>
  );
}
