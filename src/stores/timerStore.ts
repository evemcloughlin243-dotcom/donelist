import { create } from 'zustand';

export type TimerStatus = 'idle' | 'running' | 'paused';

interface TimerState {
  status: TimerStatus;
  startTime: number | null;
  elapsedBeforePause: number;
  name: string;
  categoryId: string;
  tagIds: string[];
  notes: string;

  // actions
  start: (opts?: { name?: string; categoryId?: string; tagIds?: string[] }) => void;
  pause: () => void;
  resume: () => void;
  stop: () => { duration: number; startTime: number };
  reset: () => void;
  setField: (field: 'name' | 'categoryId' | 'notes', value: string) => void;
  toggleTag: (tagId: string) => void;

  // computed
  getElapsed: () => number;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  status: 'idle',
  startTime: null,
  elapsedBeforePause: 0,
  name: '',
  categoryId: '',
  tagIds: [],
  notes: '',

  start: (opts) => {
    set({
      status: 'running',
      startTime: Date.now(),
      elapsedBeforePause: 0,
      name: opts?.name ?? '',
      categoryId: opts?.categoryId ?? '',
      tagIds: opts?.tagIds ?? [],
      notes: '',
    });
  },

  pause: () => {
    const { startTime, elapsedBeforePause } = get();
    if (!startTime) return;
    set({
      status: 'paused',
      elapsedBeforePause: elapsedBeforePause + (Date.now() - startTime),
      startTime: null,
    });
  },

  resume: () => {
    set({ status: 'running', startTime: Date.now() });
  },

  stop: () => {
    const { startTime, elapsedBeforePause } = get();
    const now = Date.now();
    const duration = Math.round(
      (elapsedBeforePause + (startTime ? now - startTime : 0)) / 60000,
    );
    const actualStart = now - (elapsedBeforePause + (startTime ? now - startTime : 0));
    set({
      status: 'idle',
      startTime: null,
      elapsedBeforePause: 0,
      name: '',
      categoryId: '',
      tagIds: [],
      notes: '',
    });
    return { duration, startTime: actualStart };
  },

  reset: () => {
    set({
      status: 'idle',
      startTime: null,
      elapsedBeforePause: 0,
      name: '',
      categoryId: '',
      tagIds: [],
      notes: '',
    });
  },

  setField: (field, value) => {
    set({ [field]: value } as any);
  },

  toggleTag: (tagId) => {
    const { tagIds } = get();
    set({
      tagIds: tagIds.includes(tagId)
        ? tagIds.filter((t) => t !== tagId)
        : [...tagIds, tagId],
    });
  },

  getElapsed: () => {
    const { startTime, elapsedBeforePause, status } = get();
    if (status === 'idle') return 0;
    if (status === 'paused') return elapsedBeforePause;
    return elapsedBeforePause + (startTime ? Date.now() - startTime : 0);
  },
}));
