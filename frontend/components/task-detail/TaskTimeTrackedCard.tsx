import React, { useState } from 'react';
import { Clock, Pause, Play } from 'lucide-react';
import { Task } from '../../types';
import Button from '../ui/Button';
import { TASK_SECTION_SHELL, TASK_SECTION_TITLE, TASK_SUBCARD } from './taskDetailStyles';
import { getPermissionMessage } from '../../services/permissionAccessService';

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
  showControls?: boolean;
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
  addManualTime,
  showControls = true
}) => {
  const [showManualEntry, setShowManualEntry] = useState(false);
  return (
    <div className={TASK_SECTION_SHELL}>
      <h4 className={TASK_SECTION_TITLE}>Time tracked</h4>
      <div className="mt-1 flex flex-col gap-1">
        <div className={TASK_SUBCARD}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-base font-bold text-slate-900 leading-none whitespace-nowrap">{formatTrackedTime(totalTrackedMs)}</p>
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

        {showControls ? (
          <>
            <div className="grid grid-cols-2 gap-1">
              <Button
                type="button"
                variant="secondary"
                className={`h-7 px-2 text-[10px] justify-center ${
                  task.isTimerRunning ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : ''
                }`}
                onClick={() => onToggleTimer?.(task.id)}
                disabled={!canTrackTime}
                title={task.isTimerRunning ? 'Stop timer' : 'Start timer'}
              >
                {task.isTimerRunning ? <Pause className="w-3.5 h-3.5 mr-1" /> : <Play className="w-3.5 h-3.5 mr-1" />}
                {task.isTimerRunning ? 'Stop' : 'Start'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-7 px-2 text-[10px]"
                onClick={() => setShowManualEntry((prev) => !prev)}
                disabled={!canTrackTime}
              >
                {showManualEntry ? 'Hide manual' : 'Manual time'}
              </Button>
            </div>
            {showManualEntry ? (
              <div className="grid grid-cols-2 gap-1">
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
                  className="h-7 px-2 rounded-md border border-slate-300 bg-white text-[11px] outline-none focus:ring-2 focus:ring-slate-300"
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
                  className="h-7 px-2 rounded-md border border-slate-300 bg-white text-[11px] outline-none focus:ring-2 focus:ring-slate-300"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="col-span-2 h-7 px-2 text-[10px]"
                  onClick={() => {
                    addManualTime();
                    setShowManualEntry(false);
                  }}
                  disabled={!canTrackTime}
                >
                  Add manual time
                </Button>
              </div>
            ) : null}
            {!canTrackTime ? <p className="text-[9px] text-slate-500">{getPermissionMessage('task_operator', 'track time')}</p> : null}
            {manualTimeError ? <p className="text-[9px] text-rose-600">{manualTimeError}</p> : null}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default TaskTimeTrackedCard;
