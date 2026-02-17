import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

interface DateInputFieldProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  placeholder?: string;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}

const DateInputField: React.FC<DateInputFieldProps> = ({
  value,
  onChange,
  min,
  placeholder,
  disabled,
  compact = false,
  className = ''
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const parseIsoDate = (iso?: string) => {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const toIsoDate = (date: Date) => {
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const selectedDate = parseIsoDate(value);
  const minDate = parseIsoDate(min);
  const [viewMonth, setViewMonth] = useState<Date>(
    new Date((selectedDate || new Date()).getFullYear(), (selectedDate || new Date()).getMonth(), 1)
  );

  useEffect(() => {
    const next = selectedDate || new Date();
    setViewMonth(new Date(next.getFullYear(), next.getMonth(), 1));
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isOpen]);

  const formatDisplay = (iso?: string) => {
    const parsed = parseIsoDate(iso);
    if (!parsed) return compact ? 'dd/mm/yyyy' : 'Select date';
    return parsed.toLocaleDateString('en-GB');
  };

  const days = useMemo(() => {
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const startOffset = first.getDay();
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - startOffset);
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + index);
      return day;
    });
  }, [viewMonth]);

  const isDisabledDate = (date: Date) => Boolean(minDate && date < minDate);

  const isSameDay = (a: Date | null, b: Date) =>
    Boolean(a) &&
    a!.getFullYear() === b.getFullYear() &&
    a!.getMonth() === b.getMonth() &&
    a!.getDate() === b.getDate();

  return (
    <div
      ref={rootRef}
      className={`relative w-full rounded-lg border border-slate-300 bg-white ${compact ? 'h-9' : 'h-10'} ${disabled ? 'opacity-60' : ''} ${className}`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full text-left bg-transparent pr-9 text-slate-700 outline-none ${compact ? 'h-9 px-2 text-xs' : 'h-10 px-3 text-sm'}`}
      >
        <span className={value ? 'text-slate-700' : 'text-slate-400'}>
          {value ? formatDisplay(value) : placeholder || formatDisplay(undefined)}
        </span>
      </button>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={disabled}
        aria-label="Open calendar"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <CalendarDays className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      </button>
      {isOpen ? (
        <div className="absolute top-[calc(100%+6px)] left-0 z-40 w-[280px] max-w-[92vw] rounded-xl border border-slate-200 bg-white shadow-xl p-2.5">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              className="w-7 h-7 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4 m-auto" />
            </button>
            <p className="text-xs font-semibold text-slate-800">
              {viewMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </p>
            <button
              type="button"
              onClick={() => setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              className="w-7 h-7 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4 m-auto" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((label) => (
              <span key={label} className="text-[10px] text-center text-slate-400 font-medium">
                {label}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const isCurrentMonth = day.getMonth() === viewMonth.getMonth();
              const isSelected = isSameDay(selectedDate, day);
              const disabledDay = isDisabledDate(day);
              return (
                <button
                  key={toIsoDate(day)}
                  type="button"
                  disabled={disabledDay}
                  onClick={() => {
                    onChange(toIsoDate(day));
                    setIsOpen(false);
                  }}
                  className={`h-8 rounded-md text-xs transition-colors ${
                    isSelected
                      ? 'bg-slate-900 text-white'
                      : isCurrentMonth
                        ? 'text-slate-700 hover:bg-slate-100'
                        : 'text-slate-300 hover:bg-slate-100'
                  } ${disabledDay ? 'opacity-35 cursor-not-allowed hover:bg-transparent' : ''}`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className="text-[11px] text-slate-500 hover:text-slate-700"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(toIsoDate(new Date()));
                setIsOpen(false);
              }}
              className="text-[11px] text-slate-700 font-medium hover:text-slate-900"
            >
              Today
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DateInputField;
