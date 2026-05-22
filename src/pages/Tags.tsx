import { useEffect, useState } from 'react';
import { useCategoryStore } from '../stores/categoryStore';
import { useTagStore } from '../stores/tagStore';

const COLORS = ['#6366f1','#22c55e','#f59e0b','#ec4899','#8b5cf6','#06b6d4','#f97316','#84cc16','#ef4444','#14b8a6'];

export default function Tags() {
  const { categories, load: loadCats, add: addCat, update: updateCat, remove: removeCat } = useCategoryStore();
  const { tags, load: loadTags, add: addTag, update: updateTag, remove: removeTag } = useTagStore();
  const [showCat, setShowCat] = useState(false); const [showTag, setShowTag] = useState(false);
  const [editCatId, setEditCatId] = useState<string | null>(null); const [editTagId, setEditTagId] = useState<string | null>(null);
  const [cf, setCf] = useState({ name: '', color: '#6366f1', icon: '📌' });
  const [tf, setTf] = useState({ name: '', color: '#818cf8', parentId: '' });

  useEffect(() => { loadCats(); loadTags(); }, [loadCats, loadTags]);

  const subs = (pid: string | null) => tags.filter((t) => t.parentId === pid);

  const saveCat = async () => {
    if (!cf.name.trim()) return;
    if (editCatId) await updateCat(editCatId, cf); else await addCat({ ...cf, order: categories.length });
    setShowCat(false); setEditCatId(null); setCf({ name: '', color: '#6366f1', icon: '📌' });
  };
  const saveTag = async () => {
    if (!tf.name.trim() || !tf.parentId) return;
    if (editTagId) await updateTag(editTagId, { ...tf });
    else await addTag({ ...tf, parentId: tf.parentId, order: subs(tf.parentId).length });
    setShowTag(false); setEditTagId(null); setTf({ name: '', color: '#818cf8', parentId: '' });
  };

  return (
    <div className="px-4 pt-4 pb-8 space-y-5">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-base font-semibold" style={{ color: 'var(--text)' }}>标签管理</h1>
        <div className="flex gap-1.5">
          <button onClick={() => { setEditCatId(null); setCf({ name: '', color: '#6366f1', icon: '📌' }); setShowCat(true); }} className="btn-ghost text-[10px]">+ 分类</button>
          <button onClick={() => { setEditTagId(null); setTf({ name: '', color: '#818cf8', parentId: categories[0]?.id ?? '' }); setShowTag(true); }} className="btn-ghost text-[10px]">+ 标签</button>
        </div>
      </div>

      <div className="space-y-2">
        {categories.map((cat) => (
          <div key={cat.id} className="card-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">{cat.icon}</span>
                <span className="font-medium text-sm" style={{ color: 'var(--text)' }}>{cat.name}</span>
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditCatId(cat.id); setCf({ name: cat.name, color: cat.color, icon: cat.icon }); setShowCat(true); }}
                  className="text-[10px] px-2 py-1 transition-colors" style={{ color: 'var(--text-muted)' }}>编辑</button>
                <button onClick={() => { if (confirm('删除此分类？')) removeCat(cat.id); }}
                  className="text-[10px] px-2 py-1 transition-colors hover:text-red-400" style={{ color: 'var(--text-muted)' }}>删除</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {subs(cat.id).map((tag) => (
                <span key={tag.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] border"
                  style={{ backgroundColor: tag.color + '14', color: tag.color, borderColor: tag.color + '30' }}>
                  {tag.name}
                  <button onClick={() => { setEditTagId(tag.id); setTf({ name: tag.name, color: tag.color, parentId: tag.parentId ?? '' }); setShowTag(true); }}
                    className="opacity-50 hover:opacity-100 ml-0.5">✎</button>
                  <button onClick={() => removeTag(tag.id)} className="opacity-50 hover:opacity-100">✕</button>
                </span>
              ))}
              {subs(cat.id).length === 0 && (
                <button onClick={() => { setEditTagId(null); setTf({ name: '', color: '#818cf8', parentId: cat.id }); setShowTag(true); }}
                  className="text-[10px] transition-colors hover:text-indigo-500" style={{ color: 'var(--text-muted)' }}>+ 添加标签</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      {showCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="card-lg p-6 w-full max-w-sm space-y-4" style={{ boxShadow: 'var(--shadow-lg)' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{editCatId ? '编辑分类' : '新建分类'}</h2>
            <div><label className="label-sm">名称</label><input type="text" value={cf.name} onChange={(e) => setCf({ ...cf, name: e.target.value })} className="input-field" placeholder="分类名称" /></div>
            <div><label className="label-sm">图标</label><input type="text" value={cf.icon} onChange={(e) => setCf({ ...cf, icon: e.target.value })} className="input-field" /></div>
            <div><label className="label-sm">颜色</label><div className="flex gap-1.5 flex-wrap">{COLORS.map((c) => (<button key={c} onClick={() => setCf({ ...cf, color: c })} className={`w-7 h-7 rounded-full transition-all ${cf.color === c ? 'ring-2 ring-offset-2 scale-110' : ''}`} style={{ backgroundColor: c }} />))}</div></div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => { setShowCat(false); setEditCatId(null); }} className="btn-ghost flex-1 py-3 rounded-xl">取消</button>
              <button onClick={saveCat} className="btn-primary flex-1 py-3 rounded-xl card-press">保存</button>
            </div>
          </div>
        </div>
      )}
      {showTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="card-lg p-6 w-full max-w-sm space-y-4" style={{ boxShadow: 'var(--shadow-lg)' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{editTagId ? '编辑标签' : '新建标签'}</h2>
            <div><label className="label-sm">名称</label><input type="text" value={tf.name} onChange={(e) => setTf({ ...tf, name: e.target.value })} className="input-field" placeholder="标签名称" /></div>
            <div><label className="label-sm">所属分类</label><select value={tf.parentId} onChange={(e) => setTf({ ...tf, parentId: e.target.value })} className="input-field">{categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>))}</select></div>
            <div><label className="label-sm">颜色</label><div className="flex gap-1.5 flex-wrap">{COLORS.map((c) => (<button key={c} onClick={() => setTf({ ...tf, color: c })} className={`w-7 h-7 rounded-full transition-all ${tf.color === c ? 'ring-2 ring-offset-2 scale-110' : ''}`} style={{ backgroundColor: c }} />))}</div></div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => { setShowTag(false); setEditTagId(null); }} className="btn-ghost flex-1 py-3 rounded-xl">取消</button>
              <button onClick={saveTag} className="btn-primary flex-1 py-3 rounded-xl card-press">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
