import { create } from 'zustand';
import { db, type Plan } from '../db/database';

interface PlanState {
  plans: Plan[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (p: Omit<Plan, 'id'>) => Promise<string>;
  remove: (id: string) => Promise<void>;
  getByGoal: (goalId: string) => Plan[];
}

export const usePlanStore = create<PlanState>((set, get) => ({
  plans: [],
  loaded: false,

  load: async () => {
    if (get().loaded) return;
    const plans = await db.plans.orderBy('generatedAt').reverse().toArray();
    set({ plans, loaded: true });
  },

  add: async (p) => {
    const id = crypto.randomUUID();
    const plan: Plan = { ...p, id };
    await db.plans.add(plan);
    set({ plans: [plan, ...get().plans] });
    return id;
  },

  remove: async (id) => {
    await db.plans.delete(id);
    set({ plans: get().plans.filter((p) => p.id !== id) });
  },

  getByGoal: (goalId) => get().plans.filter((p) => p.goalId === goalId),
}));
