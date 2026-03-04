import { Task } from '../../../types';

export type ResizeEdge = 'start' | 'end';
export type DragMode = ResizeEdge | 'move';
export type Span = { start: number; end: number };
export type DragState = {
  taskId: string;
  mode: DragMode;
  originX: number;
  originalStart: number;
  originalEnd: number;
};

export const DAY_MS = 86400000;
export const LANE_WIDTH = 34;
export const ROW_HEIGHT = 48;
export const LANE_MIN_WIDTH = 980;
export const WORKDAY_MINUTES = 480;

export const toDayStart = (value: number) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

export const getTaskSpan = (task: Task, override?: Span): Span | null => {
  if (override) return override;
  if (!task.dueDate) return null;
  const end = toDayStart(task.dueDate);
  const durationDays = Math.max(1, Math.min(20, Math.ceil((task.estimateMinutes || WORKDAY_MINUTES) / WORKDAY_MINUTES)));
  const start = end - (durationDays - 1) * DAY_MS;
  return { start, end };
};
