import { createId } from '../utils/id';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  durationMs?: number;
}

const TOAST_EVENT = 'velo:toast:push';

const push = (payload: Omit<ToastItem, 'id'>) => {
  const detail: ToastItem = { id: createId(), durationMs: 5000, ...payload };
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail }));
};

export const toastService = {
  eventName: TOAST_EVENT,
  push,
  success: (title: string, message?: string) => push({ type: 'success', title, message }),
  info: (title: string, message?: string) => push({ type: 'info', title, message }),
  warning: (title: string, message?: string) => push({ type: 'warning', title, message }),
  error: (title: string, message?: string) => push({ type: 'error', title, message })
};
