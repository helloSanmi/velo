import React from 'react';

interface TimelineHeaderProps {
  taskCount: number;
  rangeDays: 21 | 30 | 60;
  onRangeChange: (value: 21 | 30 | 60) => void;
}

const TimelineHeader: React.FC<TimelineHeaderProps> = ({ taskCount, rangeDays, onRangeChange }) => (
  <div className="border-b border-slate-200 px-3 py-2 flex items-center justify-between gap-2">
    <p className="text-xs md:text-sm font-medium text-slate-700">Timeline ({taskCount} tasks)</p>
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500">Range</span>
      <select
        className="velo-select h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700"
        value={rangeDays}
        onChange={(event) => onRangeChange(Number(event.target.value) as 21 | 30 | 60)}
      >
        <option value={21}>3 weeks</option>
        <option value={30}>30 days</option>
        <option value={60}>60 days</option>
      </select>
    </div>
  </div>
);

export default TimelineHeader;
