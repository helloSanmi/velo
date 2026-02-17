import { createId } from '../utils/id';

type DialogKind = 'confirm' | 'notice' | 'prompt';
type DialogResult = boolean | string | null;

export interface DialogRequest {
  id: string;
  kind: DialogKind;
  title?: string;
  message: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  multiline?: boolean;
}

type DialogOpenEvent = CustomEvent<DialogRequest>;

const DIALOG_EVENT = 'velo:dialog:open';
const resolverMap = new Map<string, (result: DialogResult) => void>();

const emitDialog = <T extends DialogResult>(request: Omit<DialogRequest, 'id'>): Promise<T> => {
  const id = createId();
  const payload: DialogRequest = { id, ...request };

  return new Promise<T>((resolve) => {
    resolverMap.set(id, resolve as (result: DialogResult) => void);
    window.dispatchEvent(new CustomEvent(DIALOG_EVENT, { detail: payload }));
  });
};

export const dialogService = {
  eventName: DIALOG_EVENT,
  confirm: (
    message: string,
    options?: { title?: string; description?: string; confirmText?: string; cancelText?: string; danger?: boolean }
  ) =>
    emitDialog<boolean>({
      kind: 'confirm',
      message,
      title: options?.title || 'Confirm action',
      description: options?.description,
      confirmText: options?.confirmText || 'OK',
      cancelText: options?.cancelText || 'Cancel',
      danger: options?.danger
    }),
  notice: (message: string, options?: { title?: string; description?: string; confirmText?: string }) =>
    emitDialog<boolean>({
      kind: 'notice',
      message,
      title: options?.title || 'Notice',
      description: options?.description,
      confirmText: options?.confirmText || 'OK'
    }),
  prompt: (
    message: string,
    options?: {
      title?: string;
      description?: string;
      confirmText?: string;
      cancelText?: string;
      placeholder?: string;
      defaultValue?: string;
      required?: boolean;
      multiline?: boolean;
    }
  ) =>
    emitDialog<string | null>({
      kind: 'prompt',
      message,
      title: options?.title || 'Input required',
      description: options?.description,
      confirmText: options?.confirmText || 'OK',
      cancelText: options?.cancelText || 'Cancel',
      placeholder: options?.placeholder,
      defaultValue: options?.defaultValue,
      required: options?.required ?? false,
      multiline: options?.multiline ?? false
    }),
  resolve: (id: string, result: DialogResult) => {
    const resolver = resolverMap.get(id);
    if (!resolver) return;
    resolver(result);
    resolverMap.delete(id);
  },
  asDialogEvent: (event: Event) => event as DialogOpenEvent
};
