import { create } from 'zustand';
import { db, type Goal } from '../db/database';

interface GoalState {
  goals: Goal[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (g: Omit<Goal, 'id' | 'createdAt'>) => Promise<string>;
  update: (id: string, data: Partial<Goal>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  getActive: () => Goal[];
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  loaded: false,

  load: async () => {
    if (get().loaded) return;
    const goals = await db.goals.orderBy('createdAt').reverse().toArray();
    set({ goals, loaded: true });
  },

  add: async (g) => {
    const id = crypto.randomUUID();
    const goal: Goal = { ...g, id, createdAt: Date.now() };
    await db.goals.add(goal);
    set({ goals: [goal, ...get().goals] });
    return id;
  },

  update: async (id, data) => {
    await db.goals.update(id, data);
    const goals = get().goals.map((g) => (g.id === id ? { ...g, ...data } : g));
    set({ goals });
  },

  remove: async (id) => {
    await db.goals.delete(id);
    set({ goals: get().goals.filter((g) => g.id !== id) });
  },

  getActive: () => get().goals.filter((g) => g.status === 'active'),
}));
