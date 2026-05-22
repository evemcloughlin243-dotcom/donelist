import { create } from 'zustand';
import { db, type Tag } from '../db/database';
import { seedIfEmpty } from '../db/seed';

interface TagState {
  tags: Tag[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (t: Omit<Tag, 'id'>) => Promise<string>;
  update: (id: string, data: Partial<Tag>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  getByParent: (parentId: string | null) => Tag[];
  getChildren: (parentId: string) => Tag[];
}

export const useTagStore = create<TagState>((set, get) => ({
  tags: [],
  loaded: false,

  load: async () => {
    if (get().loaded) return;
    await seedIfEmpty();
    const tags = await db.tags.orderBy('order').toArray();
    set({ tags, loaded: true });
  },

  add: async (t) => {
    const id = crypto.randomUUID();
    const tag: Tag = { ...t, id };
    await db.tags.add(tag);
    set({ tags: [...get().tags, tag].sort((a, b) => a.order - b.order) });
    return id;
  },

  update: async (id, data) => {
    await db.tags.update(id, data);
    const tags = get().tags.map((t) => (t.id === id ? { ...t, ...data } : t));
    set({ tags });
  },

  remove: async (id) => {
    await db.tags.delete(id);
    set({ tags: get().tags.filter((t) => t.id !== id) });
  },

  getByParent: (parentId) => {
    return get().tags.filter((t) => t.parentId === parentId);
  },

  getChildren: (parentId) => {
    return get().tags.filter((t) => t.parentId === parentId);
  },
}));
