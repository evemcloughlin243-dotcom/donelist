import Dexie, { type Table } from 'dexie';

export interface Activity {
  id: string;
  name: string;
  duration: number;
  categoryId: string;
  tagIds: string[];
  timestamp: number;
  date: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  order: number;
}

export interface Tag {
  id: string;
  name: string;
  parentId: string | null;
  color: string;
  order: number;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  targetCategories: string[];
  targetHoursPerWeek: number;
  startDate: string;
  endDate: string | null;
  status: 'active' | 'completed' | 'paused';
  createdAt: number;
}

export interface Plan {
  id: string;
  goalId: string | null;
  generatedAt: number;
  timeRange: { start: string; end: string };
  content: string;
}

class DonelistDB extends Dexie {
  activities!: Table<Activity, string>;
  categories!: Table<Category, string>;
  tags!: Table<Tag, string>;
  goals!: Table<Goal, string>;
  plans!: Table<Plan, string>;

  constructor() {
    super('donelist');
    this.version(1).stores({
      activities: 'id, date, categoryId, timestamp',
      categories: 'id',
      tags: 'id, parentId',
      goals: 'id, status',
      plans: 'id, goalId, generatedAt',
    });
  }
}

export const db = new DonelistDB();
