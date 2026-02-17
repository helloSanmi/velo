import React from 'react';
import { CheckCircle2, Link2, Lock, Plus, Search } from 'lucide-react';
import { Task } from '../../types';

interface TaskDetailDependenciesTabProps {
  task: Task;
  potentialDependencies: Task[];
  dependencyQuery: string;
  setDependencyQuery: (value: string) => void;
  onToggleDependency: (depId: string) => void;
  canManageDependencies: boolean;
}

const TaskDetailDependenciesTab: React.FC<TaskDetailDependenciesTabProps> = ({
  task,
  potentialDependencies,
  dependencyQuery,
  setDependencyQuery,
  onToggleDependency,
  canManageDependencies
}) => {
  const selectedDeps = potentialDependencies.filter((dep) => task.blockedByIds?.includes(dep.id));
  const availableDeps = potentialDependencies.filter((dep) => {
    if (task.blockedByIds?.includes(dep.id)) return false;
    if (!dependencyQuery.trim()) return true;
    return dep.title.toLowerCase().includes(dependencyQuery.trim().toLowerCase());
  });

  const renderDependencyRow = (dep: Task, isSelected: boolean) => (
    <button
      key={dep.id}
      onClick={() => canManageDependencies && onToggleDependency(dep.id)}
      disabled={!canManageDependencies}
      className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all group ${
        isSelected
          ? 'bg-rose-50 border-rose-200 hover:border-rose-300'
          : 'bg-white border-slate-200 hover:border-slate-300'
      } ${!canManageDependencies ? 'opacity-55 cursor-not-allowed' : ''}`}
    >
      <div className="flex items-start gap-3 text-left min-w-0">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            isSelected ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {isSelected ? <Lock className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-semibold truncate ${isSelected ? 'text-rose-900' : 'text-slate-900'}`}>{dep.title}</p>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wide bg-slate-100 text-slate-600 border border-slate-200">
              {dep.status.replace('-', ' ')}
            </span>
            <span className="text-[10px] text-slate-400">#{dep.id.slice(-4)}</span>
          </div>
        </div>
      </div>
      {isSelected ? (
        <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />
      ) : (
        <Plus className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0" />
      )}
    </button>
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-300 h-full flex flex-col">
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-rose-600" /> Dependencies
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">Choose tasks that must be completed first.</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold text-slate-900">{selectedDeps.length}</p>
          <p className="text-[10px] uppercase tracking-wide text-slate-500">selected</p>
        </div>
      </div>

      <label className="h-10 border border-slate-300 rounded-lg px-3 flex items-center gap-2 bg-white">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          value={dependencyQuery}
          onChange={(e) => setDependencyQuery(e.target.value)}
          disabled={!canManageDependencies}
          placeholder="Search available tasks"
          className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
        />
      </label>
      {!canManageDependencies ? <p className="text-[11px] text-slate-500">Only project owner/admin can edit dependencies.</p> : null}

      <div className="grid md:grid-cols-2 gap-3 flex-1 min-h-0">
        <section className="border border-slate-200 rounded-xl bg-white p-3 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Selected</p>
            <span className="text-xs text-slate-500">{selectedDeps.length}</span>
          </div>
          <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1">
            {selectedDeps.length === 0 ? (
              <div className="h-full min-h-24 rounded-lg border border-dashed border-slate-200 text-xs text-slate-500 flex items-center justify-center px-4 text-center">
                No dependencies yet.
              </div>
            ) : (
              selectedDeps.map((dep) => renderDependencyRow(dep, true))
            )}
          </div>
        </section>

        <section className="border border-slate-200 rounded-xl bg-white p-3 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Available</p>
            <span className="text-xs text-slate-500">{availableDeps.length}</span>
          </div>
          <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1">
            {availableDeps.length === 0 ? (
              <div className="h-full min-h-24 rounded-lg border border-dashed border-slate-200 text-xs text-slate-500 flex items-center justify-center px-4 text-center">
                {dependencyQuery.trim() ? 'No tasks match this search.' : 'No other tasks available.'}
              </div>
            ) : (
              availableDeps.map((dep) => renderDependencyRow(dep, false))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default TaskDetailDependenciesTab;
