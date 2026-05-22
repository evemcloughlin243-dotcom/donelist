import { create } from 'zustand';
import { db, type Activity } from '../db/database';

interface ActivityState {
  activities: Activity[];
  loaded: boolean;
  load: () => Promise<void>;
  loadByDateRange: (start: string, end: string) => Promise<Activity[]>;
  add: (a: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  update: (id: string, data: Partial<Omit<Activity, 'id'>>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  activities: [],
  loaded: false,

  load: async () => {
    if (get().loaded) return;
    const activities = await db.activities.orderBy('timestamp').reverse().toArray();
    set({ activities, loaded: true });
  },

  loadByDateRange: async (start, end) => {
    return db.activities.where('date').between(start, end, true, true).toArray();
  },

  add: async (a) => {
    const now = Date.now();
    const id = crypto.randomUUID();
    const activity: Activity = { ...a, id, createdAt: now, updatedAt: now };
    await db.activities.add(activity);
    set({ activities: [activity, ...get().activities] });
    return id;
  },

  update: async (id, data) => {
    const now = Date.now();
    await db.activities.update(id, { ...data, updatedAt: now });
    const activities = get().activities.map((a) =>
      a.id === id ? { ...a, ...data, updatedAt: now } : a,
    );
    set({ activities });
  },

  remove: async (id) => {
    await db.activities.delete(id);
    set({ activities: get().activities.filter((a) => a.id !== id) });
  },
}));
