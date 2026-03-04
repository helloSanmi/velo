import React from 'react';
import { Clock, Pause, Play } from 'lucide-react';
import { Task } from '../../types';
import Button from '../ui/Button';

interface TaskTimeTrackedCardProps {
  task: Task;
  formatTrackedTime: (ms: number) => string;
  totalTrackedMs: number;
  canTrackTime: boolean;
  onToggleTimer?: (id: string) => void;
  manualHours: string;
  setManualHours: (value: string) => void;
  manualMinutes: string;
  setManualMinutes: (value: string) => void;
  manualTimeError: string;
  setManualTimeError: (value: string) => void;
  addManualTime: (minutesToAdd?: number) => void;
}

const TaskTimeTrackedCard: React.FC<TaskTimeTrackedCardProps> = ({
  task,
  formatTrackedTime,
  totalTrackedMs,
  canTrackTime,
  onToggleTimer,
  manualHours,
  setManualHours,
  manualMinutes,
  setManualMinutes,
  manualTimeError,
  setManualTimeError,
  addManualTime
}) => {
  return (
    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col min-h-[220px]">
      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Time Tracked</h4>
      <div className="flex-1 min-h-0 flex flex-col gap-2.5">
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="text-lg font-bold text-slate-900 leading-none whitespace-nowrap">{formatTrackedTime(totalTrackedMs)}</p>
            <span
              className={`inline-flex items-center justify-center rounded-full p-1.5 ${
                task.isTimerRunning ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
              }`}
              title={task.isTimerRunning ? 'Timer running' : 'Timer stopped'}
              aria-label={task.isTimerRunning ? 'Timer running' : 'Timer stopped'}
            >
              <Clock className="w-3 h-3" />
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          className={`h-8 px-3 text-xs justify-center ${
            task.isTimerRunning ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : ''
          }`}
          onClick={() => onToggleTimer?.(task.id)}
          disabled={!canTrackTime}
          title={task.isTimerRunning ? 'Stop timer' : 'Start timer'}
        >
          {task.isTimerRunning ? <Pause className="w-3.5 h-3.5 mr-1" /> : <Play className="w-3.5 h-3.5 mr-1" />}
          {task.isTimerRunning ? 'Stop' : 'Start'}
        </Button>

        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min={0}
            step={1}
            value={manualHours}
            onChange={(event) => {
              setManualHours(event.target.value);
              if (manualTimeError) setManualTimeError('');
            }}
            disabled={!canTrackTime}
            placeholder="Hours"
            className="h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs outline-none focus:ring-2 focus:ring-slate-300"
          />
          <input
            type="number"
            min={0}
            step={1}
            value={manualMinutes}
            onChange={(event) => {
              setManualMinutes(event.target.value);
              if (manualTimeError) setManualTimeError('');
            }}
            disabled={!canTrackTime}
            placeholder="Minutes"
            className="h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs outline-none focus:ring-2 focus:ring-slate-300"
          />
          <Button
            type="button"
            variant="secondary"
            className="col-span-2 h-8 px-3 text-xs"
            onClick={() => addManualTime()}
            disabled={!canTrackTime}
          >
            Add manual time
          </Button>
        </div>
        {!canTrackTime ? <p className="text-[11px] text-slate-500">Only assigned members, project owners, or admins can track time.</p> : null}
        {manualTimeError ? <p className="text-[11px] text-rose-600">{manualTimeError}</p> : null}
      </div>
    </div>
  );
};

export default TaskTimeTrackedCard;
