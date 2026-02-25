import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

type AppSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

interface AppSelectProps {
  value: string;
  options: AppSelectOption[];
  onChange: (value: string) => void;
  className?: string;
  menuClassName?: string;
  disabled?: boolean;
  placeholder?: string;
}

const AppSelect: React.FC<AppSelectProps> = ({
  value,
  options,
  onChange,
  className = '',
  menuClassName = '',
  disabled = false,
  placeholder
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = useMemo(() => options.find((option) => option.value === value), [options, value]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`${className} inline-flex w-full items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <span className={`min-w-0 truncate ${selected ? '' : 'text-slate-400'}`}>{selected?.label || placeholder || 'Select'}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div className={`absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-lg border border-slate-200 bg-white p-1 shadow-xl ${menuClassName}`}>
          <div className="max-h-64 overflow-y-auto custom-scrollbar pr-1">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={option.disabled}
                  onClick={() => {
                    if (option.disabled) return;
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                    isSelected ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                  } ${option.disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AppSelect;
