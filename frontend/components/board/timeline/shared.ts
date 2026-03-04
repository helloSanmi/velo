export const DAY_MS = 86400000;
export const CELL_WIDTH = 34;

export const dayStart = (ts: number) => {
  const date = new Date(ts);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

export interface TimelineBar {
  taskId: string;
  rowIndex: number;
  x1: number;
  x2: number;
  y: number;
}

export interface TimelineDependencyLine {
  fromId: string;
  toId: string;
  d: string;
}
