import React from 'react';

interface CalendarHeaderProps {
  zoom: 'month' | 'week' | 'day';
  viewDate: Date;
  onZoomChange: (zoom: 'month' | 'week' | 'day') => void;
  onPrev: () => void;
  onNext: () => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({ zoom, viewDate, onZoomChange, onPrev, onNext }) => (
  <div className="border-b border-slate-200 px-3 py-2 flex items-center justify-between">
    <p className="text-sm font-medium text-slate-700">
      {zoom === 'day'
        ? viewDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : viewDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
    </p>
    <div className="flex items-center gap-2 flex-wrap justify-end">
      <div className="inline-flex items-center rounded-md border border-slate-300 bg-white p-0.5">
        {(['month', 'week', 'day'] as const).map((nextZoom) => (
          <button
            key={nextZoom}
            type="button"
            onClick={() => onZoomChange(nextZoom)}
            className={`h-7 rounded px-2 text-xs ${
              zoom === nextZoom ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            {nextZoom[0].toUpperCase() + nextZoom.slice(1)}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onPrev}
        className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700 hover:bg-slate-50"
      >
        Prev
      </button>
      <button
        type="button"
        onClick={onNext}
        className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700 hover:bg-slate-50"
      >
        Next
      </button>
    </div>
  </div>
);

export default CalendarHeader;
