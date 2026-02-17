import React, { useEffect, useState } from 'react';
import { CheckCircle2, Info, AlertTriangle, AlertCircle, X } from 'lucide-react';
import { toastService, ToastItem } from '../../services/toastService';

const ToastHost: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (event: Event) => {
      const toast = (event as CustomEvent<ToastItem>).detail;
      setToasts((prev) => [...prev, toast]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== toast.id));
      }, toast.durationMs || 5000);
    };

    window.addEventListener(toastService.eventName, handler);
    return () => window.removeEventListener(toastService.eventName, handler);
  }, []);

  if (toasts.length === 0) return null;

  const styles = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    info: 'border-sky-200 bg-sky-50 text-sky-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    error: 'border-rose-200 bg-rose-50 text-rose-800'
  };

  const iconByType = {
    success: <CheckCircle2 className="w-4 h-4" />,
    info: <Info className="w-4 h-4" />,
    warning: <AlertTriangle className="w-4 h-4" />,
    error: <AlertCircle className="w-4 h-4" />
  };

  return (
    <div className="fixed inset-0 z-[320] flex flex-col items-center justify-start gap-2 px-4 pt-4 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className={`w-[min(92vw,420px)] rounded-xl border px-3 py-2.5 shadow-lg pointer-events-auto ${styles[toast.type]}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <span className="mt-0.5">{iconByType[toast.type]}</span>
              <div>
                <p className="text-sm font-semibold leading-tight">{toast.title}</p>
                {toast.message ? <p className="text-xs mt-0.5 opacity-90">{toast.message}</p> : null}
              </div>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))}
              aria-label="Close notification"
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ToastHost;
