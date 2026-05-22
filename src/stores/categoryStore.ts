import { create } from 'zustand';
import { db, type Category } from '../db/database';
import { seedIfEmpty } from '../db/seed';

interface CategoryState {
  categories: Category[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (c: Omit<Category, 'id'>) => Promise<string>;
  update: (id: string, data: Partial<Category>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  loaded: false,

  load: async () => {
    if (get().loaded) return;
    await seedIfEmpty();
    const categories = await db.categories.orderBy('order').toArray();
    set({ categories, loaded: true });
  },

  add: async (c) => {
    const id = crypto.randomUUID();
    const category: Category = { ...c, id };
    await db.categories.add(category);
    set({ categories: [...get().categories, category].sort((a, b) => a.order - b.order) });
    return id;
  },

  update: async (id, data) => {
    await db.categories.update(id, data);
    const categories = get().categories.map((c) => (c.id === id ? { ...c, ...data } : c));
    set({ categories });
  },

  remove: async (id) => {
    await db.categories.delete(id);
    set({ categories: get().categories.filter((c) => c.id !== id) });
  },
}));
