import React from 'react';
import DateInputField from '../../ui/DateInputField';

interface DueDateRangeControlProps {
  dueFrom?: number;
  dueTo?: number;
  onDueFromChange: (value?: number) => void;
  onDueToChange: (value?: number) => void;
}

const DueDateRangeControl: React.FC<DueDateRangeControlProps> = ({ dueFrom, dueTo, onDueFromChange, onDueToChange }) => {
  return (
    <div className="w-full h-10 md:h-8 rounded-lg md:rounded-md border border-slate-200 bg-white px-2.5 flex items-center gap-1.5">
      <span className="text-xs md:text-[11px] text-slate-500 shrink-0">Due</span>
      <DateInputField
        value={dueFrom ? new Date(dueFrom).toISOString().slice(0, 10) : ''}
        onChange={(value) => onDueFromChange(value ? new Date(`${value}T00:00:00`).getTime() : undefined)}
        compact
        className="min-w-0 border-0"
      />
      <span className="text-xs text-slate-400 shrink-0">-</span>
      <DateInputField
        value={dueTo ? new Date(dueTo).toISOString().slice(0, 10) : ''}
        onChange={(value) => onDueToChange(value ? new Date(`${value}T23:59:59`).getTime() : undefined)}
        compact
        className="min-w-0 border-0"
      />
    </div>
  );
};

export default DueDateRangeControl;
