import React from 'react';
import { CELL_WIDTH } from './shared';

interface TimelineGridHeaderProps {
  days: number[];
}

const TimelineGridHeader: React.FC<TimelineGridHeaderProps> = ({ days }) => (
  <div className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 flex">
    <div className="w-[300px] shrink-0 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
      Task
    </div>
    <div className="flex">
      {days.map((day) => (
        <div
          key={day}
          className="h-10 border-l border-slate-200 px-1 py-1 text-[10px] text-slate-500"
          style={{ width: `${CELL_WIDTH}px` }}
          title={new Date(day).toLocaleDateString()}
        >
          <div className="text-center">{new Date(day).getDate()}</div>
        </div>
      ))}
    </div>
  </div>
);

export default TimelineGridHeader;
