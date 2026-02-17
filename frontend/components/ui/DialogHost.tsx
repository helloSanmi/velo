import React, { useEffect, useState } from 'react';
import { dialogService, DialogRequest } from '../../services/dialogService';

const DialogHost: React.FC = () => {
  const [dialog, setDialog] = useState<DialogRequest | null>(null);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const payload = dialogService.asDialogEvent(event).detail;
      setDialog(payload);
    };
    window.addEventListener(dialogService.eventName, handleOpen);
    return () => window.removeEventListener(dialogService.eventName, handleOpen);
  }, []);

  useEffect(() => {
    setInputValue(dialog?.defaultValue || '');
  }, [dialog]);

  if (!dialog) return null;

  const close = (result: boolean | string | null) => {
    dialogService.resolve(dialog.id, result);
    setDialog(null);
  };

  const isPrompt = dialog.kind === 'prompt';
  const trimmedInput = inputValue.trim();
  const promptValue = dialog.required ? trimmedInput : inputValue;
  const isPromptSubmitDisabled = isPrompt && Boolean(dialog.required) && !trimmedInput;

  return (
    <div
      className="fixed inset-0 z-[300] bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) close(isPrompt ? null : false);
      }}
    >
      <div className="w-full max-w-[420px] rounded-xl border border-slate-200 bg-white shadow-xl p-4 md:p-5">
        <h3 className="text-base font-semibold tracking-tight text-slate-900">{dialog.title || 'Notice'}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{dialog.message}</p>
        {dialog.description && <p className="mt-1 text-xs leading-relaxed text-slate-500">{dialog.description}</p>}
        {isPrompt &&
          (dialog.multiline ? (
            <textarea
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder={dialog.placeholder}
              className="mt-3 w-full min-h-[96px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-300"
            />
          ) : (
            <input
              autoFocus
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder={dialog.placeholder}
              className="mt-3 w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-300"
            />
          ))}

        <div className="mt-4 flex items-center justify-end gap-2">
          {(dialog.kind === 'confirm' || isPrompt) && (
            <button
              onClick={() => close(isPrompt ? null : false)}
              className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors"
            >
              {dialog.cancelText || 'Cancel'}
            </button>
          )}
          <button
            onClick={() => close(isPrompt ? promptValue : true)}
            disabled={isPromptSubmitDisabled}
            className={`h-8 px-3 rounded-lg text-xs font-semibold transition-colors ${
              dialog.danger
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : 'bg-slate-800 text-white hover:bg-slate-900'
            } ${isPromptSubmitDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {dialog.confirmText || 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DialogHost;
