import { db } from './database';
import type { Category, Tag } from './database';

const presetCategories: Category[] = [
  { id: 'cat-work', name: '工作', color: '#6366f1', icon: '💼', order: 0 },
  { id: 'cat-learn', name: '学习', color: '#22c55e', icon: '📚', order: 1 },
  { id: 'cat-exercise', name: '运动', color: '#f59e0b', icon: '🏃', order: 2 },
  { id: 'cat-life', name: '生活', color: '#ec4899', icon: '🏠', order: 3 },
  { id: 'cat-entertain', name: '娱乐', color: '#8b5cf6', icon: '🎮', order: 4 },
];

const presetTags: Tag[] = [
  // 工作子标签
  { id: 'tag-coding', name: '编码', parentId: 'cat-work', color: '#6366f1', order: 0 },
  { id: 'tag-meeting', name: '会议', parentId: 'cat-work', color: '#818cf8', order: 1 },
  { id: 'tag-writing', name: '文档', parentId: 'cat-work', color: '#a5b4fc', order: 2 },
  { id: 'tag-review', name: '代码审查', parentId: 'cat-work', color: '#c7d2fe', order: 3 },

  // 学习子标签
  { id: 'tag-reading', name: '阅读', parentId: 'cat-learn', color: '#22c55e', order: 0 },
  { id: 'tag-course', name: '课程', parentId: 'cat-learn', color: '#4ade80', order: 1 },
  { id: 'tag-practice', name: '练习', parentId: 'cat-learn', color: '#86efac', order: 2 },

  // 运动子标签
  { id: 'tag-run', name: '跑步', parentId: 'cat-exercise', color: '#f59e0b', order: 0 },
  { id: 'tag-gym', name: '健身', parentId: 'cat-exercise', color: '#fbbf24', order: 1 },
  { id: 'tag-yoga', name: '瑜伽', parentId: 'cat-exercise', color: '#fcd34d', order: 2 },

  // 生活子标签
  { id: 'tag-cook', name: '烹饪', parentId: 'cat-life', color: '#ec4899', order: 0 },
  { id: 'tag-clean', name: '家务', parentId: 'cat-life', color: '#f472b6', order: 1 },
  { id: 'tag-social', name: '社交', parentId: 'cat-life', color: '#f9a8d4', order: 2 },

  // 娱乐子标签
  { id: 'tag-game', name: '游戏', parentId: 'cat-entertain', color: '#8b5cf6', order: 0 },
  { id: 'tag-movie', name: '影视', parentId: 'cat-entertain', color: '#a78bfa', order: 1 },
  { id: 'tag-music', name: '音乐', parentId: 'cat-entertain', color: '#c4b5fd', order: 2 },
];

export async function seedIfEmpty(): Promise<void> {
  const catCount = await db.categories.count();
  if (catCount === 0) {
    await db.categories.bulkAdd(presetCategories);
  }
  const tagCount = await db.tags.count();
  if (tagCount === 0) {
    await db.tags.bulkAdd(presetTags);
  }
}
