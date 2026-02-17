import { TaskPriority } from '../../types';

export type Mode = 'manual' | 'template' | 'ai';
export type AiInputMode = 'brief' | 'document';
export type AiTaskDraft = { title: string; description: string; priority: TaskPriority; tags: string[] };

export const PROJECT_MODAL_COLORS = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-slate-700',
  'bg-pink-500'
];
