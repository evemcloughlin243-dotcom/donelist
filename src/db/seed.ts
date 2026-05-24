import { db } from './database';
import type { Category, Tag } from './database';

const presetCategories: Category[] = [
  { id: 'cat-work', name: '工作', color: '#6366f1', icon: '💻', order: 0 },
  { id: 'cat-learn', name: '学习', color: '#10b981', icon: '📖', order: 1 },
  { id: 'cat-exercise', name: '运动', color: '#f59e0b', icon: '⚡', order: 2 },
  { id: 'cat-life', name: '生活', color: '#f43f5e', icon: '☕', order: 3 },
  { id: 'cat-entertain', name: '娱乐', color: '#8b5cf6', icon: '🎧', order: 4 },
  { id: 'cat-health', name: '健康', color: '#06b6d4', icon: '🧘', order: 5 },
  { id: 'cat-social', name: '社交', color: '#f97316', icon: '💬', order: 6 },
];

const presetTags: Tag[] = [
  // 工作
  { id: 'tag-coding', name: '写代码', parentId: 'cat-work', color: '#6366f1', order: 0 },
  { id: 'tag-meeting', name: '开会', parentId: 'cat-work', color: '#818cf8', order: 1 },
  { id: 'tag-planning', name: '规划', parentId: 'cat-work', color: '#a5b4fc', order: 2 },
  { id: 'tag-review', name: '审核', parentId: 'cat-work', color: '#c7d2fe', order: 3 },
  { id: 'tag-email', name: '邮件', parentId: 'cat-work', color: '#ddd6fe', order: 4 },
  // 学习
  { id: 'tag-reading', name: '阅读', parentId: 'cat-learn', color: '#10b981', order: 0 },
  { id: 'tag-video', name: '看视频', parentId: 'cat-learn', color: '#34d399', order: 1 },
  { id: 'tag-practice', name: '动手练习', parentId: 'cat-learn', color: '#6ee7b7', order: 2 },
  { id: 'tag-note', name: '记笔记', parentId: 'cat-learn', color: '#a7f3d0', order: 3 },
  { id: 'tag-exam', name: '备考', parentId: 'cat-learn', color: '#d1fae5', order: 4 },
  // 运动
  { id: 'tag-run', name: '跑步', parentId: 'cat-exercise', color: '#f59e0b', order: 0 },
  { id: 'tag-gym', name: '健身房', parentId: 'cat-exercise', color: '#fbbf24', order: 1 },
  { id: 'tag-swim', name: '游泳', parentId: 'cat-exercise', color: '#fcd34d', order: 2 },
  { id: 'tag-ball', name: '球类', parentId: 'cat-exercise', color: '#fde68a', order: 3 },
  // 生活
  { id: 'tag-cook', name: '做饭', parentId: 'cat-life', color: '#f43f5e', order: 0 },
  { id: 'tag-clean', name: '打扫', parentId: 'cat-life', color: '#fb7185', order: 1 },
  { id: 'tag-shop', name: '购物', parentId: 'cat-life', color: '#fda4af', order: 2 },
  { id: 'tag-commute', name: '通勤', parentId: 'cat-life', color: '#fecdd3', order: 3 },
  // 娱乐
  { id: 'tag-game', name: '打游戏', parentId: 'cat-entertain', color: '#8b5cf6', order: 0 },
  { id: 'tag-movie', name: '看电影', parentId: 'cat-entertain', color: '#a78bfa', order: 1 },
  { id: 'tag-music', name: '听音乐', parentId: 'cat-entertain', color: '#c4b5fd', order: 2 },
  { id: 'tag-stream', name: '刷视频', parentId: 'cat-entertain', color: '#ddd6fe', order: 3 },
  // 健康
  { id: 'tag-sleep', name: '睡觉', parentId: 'cat-health', color: '#06b6d4', order: 0 },
  { id: 'tag-meditate', name: '冥想', parentId: 'cat-health', color: '#22d3ee', order: 1 },
  { id: 'tag-skincare', name: '护肤', parentId: 'cat-health', color: '#67e8f9', order: 2 },
  // 社交
  { id: 'tag-chat', name: '聊天', parentId: 'cat-social', color: '#f97316', order: 0 },
  { id: 'tag-party', name: '聚会', parentId: 'cat-social', color: '#fb923c', order: 1 },
  { id: 'tag-date', name: '约会', parentId: 'cat-social', color: '#fdba74', order: 2 },
];

let seeding = false;
let seeded = false;

export async function seedIfEmpty(): Promise<void> {
  if (seeded) return;
  // 互斥锁：防止多个 store 同时调用导致重复插入报错
  while (seeding) {
    await new Promise((r) => setTimeout(r, 50));
  }
  if (seeded) return;

  seeding = true;
  try {
    const catCount = await db.categories.count();
    if (catCount === 0) {
      await db.categories.bulkAdd(presetCategories).catch(() => {});
    }
    const tagCount = await db.tags.count();
    if (tagCount === 0) {
      await db.tags.bulkAdd(presetTags).catch(() => {});
    }
    seeded = true;
  } finally {
    seeding = false;
  }
}
