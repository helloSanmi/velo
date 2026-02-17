import React, { useMemo, useState } from 'react';
import { Task } from '../../types';

interface MoveTasksBackModalProps {
  isOpen: boolean;
  projectName: string;
  finalStageName: string;
  previousStageName: string;
  tasks: Task[];
  onClose: () => void;
  onConfirm: (taskIds: string[]) => void;
}

const MoveTasksBackModal: React.FC<MoveTasksBackModalProps> = ({
  isOpen,
  projectName,
  finalStageName,
  previousStageName,
  tasks,
  onClose,
  onConfirm
}) => {
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');

  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => a.title.localeCompare(b.title)),
    [tasks]
  );
  const filteredTasks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return sortedTasks;
    return sortedTasks.filter((task) => task.title.toLowerCase().includes(normalized));
  }, [query, sortedTasks]);

  if (!isOpen) return null;

  const selectedFilteredCount = filteredTasks.filter((task) => selectedTaskIds.includes(task.id)).length;
  const allFilteredSelected = filteredTasks.length > 0 && selectedFilteredCount === filteredTasks.length;

  return (
    <div
      className="fixed inset-0 z-[290] bg-slate-900/45 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="w-full max-w-[620px] rounded-t-2xl md:rounded-2xl border border-slate-200 bg-white shadow-2xl p-4 md:p-5 max-h-[94dvh] overflow-y-auto custom-scrollbar">
        <h3 className="text-lg font-semibold text-slate-900">Choose tasks to move back</h3>
        <p className="text-sm text-slate-600 mt-1">
          {projectName}: select one or more tasks to move from <span className="font-medium">{finalStageName}</span> to{' '}
          <span className="font-medium">{previousStageName}</span>.
        </p>
        <p className="text-xs text-slate-500 mt-1">Reason will be auto-added as: Project reopened.</p>
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search tasks..."
          className="mt-3 w-full h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
        />

        <div className="mt-3 max-h-[300px] overflow-y-auto border border-slate-200 rounded-xl">
          {filteredTasks.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">No tasks available in the final stage.</div>
          ) : (
            <>
              <button
                onClick={() =>
                  setSelectedTaskIds((prev) => {
                    if (allFilteredSelected) {
                      return prev.filter((id) => !filteredTasks.some((task) => task.id === id));
                    }
                    const next = new Set(prev);
                    filteredTasks.forEach((task) => next.add(task.id));
                    return Array.from(next);
                  })
                }
                className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 border-b border-slate-200 bg-slate-50 hover:bg-slate-100"
              >
                {allFilteredSelected ? 'Clear filtered selection' : `Select filtered (${filteredTasks.length})`}
              </button>
              <div className="divide-y divide-slate-100">
                {filteredTasks.map((task) => {
                  const checked = selectedTaskIds.includes(task.id);
                  return (
                    <label key={task.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedTaskIds((prev) =>
                            prev.includes(task.id) ? prev.filter((id) => id !== task.id) : [...prev, task.id]
                          )
                        }
                      />
                      <div className="min-w-0">
                        <p className="text-sm text-slate-800 truncate">{task.title}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="h-10 px-4 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selectedTaskIds)}
            disabled={selectedTaskIds.length === 0}
            className="h-10 px-4 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800"
          >
            Move selected ({selectedTaskIds.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoveTasksBackModal;
