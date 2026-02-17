import React, { useMemo, useState } from 'react';
import { Loader2, Search, Sparkles } from 'lucide-react';
import { Task, TaskPriority, TaskStatus, User } from '../types';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { aiService } from '../services/aiService';
import { getUserFullName } from '../utils/userDisplay';

interface WorkloadViewProps {
  users: User[];
  tasks: Task[];
  onReassign: (taskId: string, toUserId: string) => void;
}

type LoadFilter = 'All' | 'High' | 'Medium' | 'Low';

const WorkloadView: React.FC<WorkloadViewProps> = ({ users, tasks, onReassign }) => {
  const taskAssigneeIds = (task: Task): string[] => {
    if (Array.isArray(task.assigneeIds) && task.assigneeIds.length > 0) return task.assigneeIds;
    return task.assigneeId ? [task.assigneeId] : [];
  };
  const [isBalancing, setIsBalancing] = useState(false);
  const [suggestions, setSuggestions] = useState<any[] | null>(null);
  const [query, setQuery] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [loadFilter, setLoadFilter] = useState<LoadFilter>('All');

  const userStats = useMemo(() => {
    return users.map((u) => {
      const activeTasks = tasks.filter((t) => taskAssigneeIds(t).includes(u.id) && t.status !== TaskStatus.DONE);
      const doneTasks = tasks.filter((t) => taskAssigneeIds(t).includes(u.id) && t.status === TaskStatus.DONE);
      const highCount = activeTasks.filter((t) => t.priority === TaskPriority.HIGH).length;
      const load = activeTasks.length;
      const status: LoadFilter = load >= 6 ? 'High' : load >= 3 ? 'Medium' : 'Low';
      return {
        ...u,
        load,
        status,
        done: doneTasks.length,
        highCount
      };
    });
  }, [users, tasks]);

  const filteredUserStats = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return userStats.filter((u) => {
      const matchesQuery = !normalized || u.displayName.toLowerCase().includes(normalized);
      const matchesLoad = loadFilter === 'All' || u.status === loadFilter;
      return matchesQuery && matchesLoad;
    });
  }, [userStats, query, loadFilter]);

  const handleBalance = async () => {
    setIsBalancing(true);
    try {
      const result = await aiService.suggestWorkloadBalance(tasks, users);
      setSuggestions(result);
    } finally {
      setIsBalancing(false);
    }
  };

  const applyReassignment = (item: any) => {
    onReassign(item.taskId, item.toUserId);
    setSuggestions((prev) => prev?.filter((s) => s.taskId !== item.taskId) || null);
  };

  return (
    <div className="bg-[#f7f3f6] p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-3xl font-semibold tracking-tight text-slate-900">Resources</h2>
            <p className="text-xs md:text-sm text-slate-600 mt-1">Team capacity and workload balancing.</p>
          </div>
          <Button onClick={handleBalance} variant="secondary" disabled={isBalancing}>
            {isBalancing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Suggest balancing
          </Button>
        </div>

        {suggestions && suggestions.length > 0 && (
          <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold">AI Suggestions</h3>
            <div className="space-y-3 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
              {suggestions.map((s, idx) => {
                const task = tasks.find((t) => t.id === s.taskId);
                const from = users.find((u) => u.id === s.fromUserId);
                const to = users.find((u) => u.id === s.toUserId);

                return (
                  <div key={idx} className="border border-slate-200 rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-900">
                        Move <span className="font-medium">{task?.title || 'Task'}</span> from {from?.displayName || 'Unknown'} to {to?.displayName || 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{s.reason}</p>
                    </div>
                    <Button size="sm" onClick={() => applyReassignment(s)}>Apply</Button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 h-auto md:h-[620px] flex flex-col">
          <div>
            <div className="md:hidden flex items-center gap-2">
              <label className="h-10 bg-white border border-slate-300 rounded-lg px-3 flex items-center gap-2 flex-1 min-w-0">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Filter people"
                  className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
                />
              </label>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen((prev) => !prev)}
                className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 whitespace-nowrap"
              >
                {mobileFiltersOpen ? 'Hide filters' : 'Filters'}
              </button>
            </div>
            <div className={`${mobileFiltersOpen ? 'block' : 'hidden'} md:hidden mt-2`}>
              <select
                value={loadFilter}
                onChange={(event) => setLoadFilter(event.target.value as LoadFilter)}
                className="h-10 w-full px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="All">All loads</option>
                <option value="High">High load</option>
                <option value="Medium">Medium load</option>
                <option value="Low">Low load</option>
              </select>
            </div>
            <div className="hidden md:grid grid-cols-2 gap-2.5">
              <label className="h-10 bg-white border border-slate-300 rounded-lg px-3 flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Filter people"
                  className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
                />
              </label>
              <select
                value={loadFilter}
                onChange={(event) => setLoadFilter(event.target.value as LoadFilter)}
                className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="All">All loads</option>
                <option value="High">High load</option>
                <option value="Medium">Medium load</option>
                <option value="Low">Low load</option>
              </select>
            </div>
          </div>

          {filteredUserStats.length === 0 ? (
            <div className="border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500 flex-1 min-h-0 flex items-center justify-center">
              No team members match these filters.
            </div>
          ) : (
            <div className="flex-1 min-h-0 md:overflow-y-auto custom-scrollbar pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {filteredUserStats.map((u) => (
                <article key={u.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={u.avatar}
                        className="w-10 h-10 rounded-xl border border-slate-200"
                        alt={u.displayName}
                        title={getUserFullName(u)}
                      />
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900 truncate">{u.displayName}</h3>
                        <p className="text-xs text-slate-500 capitalize">{u.role || 'member'}</p>
                      </div>
                    </div>
                    <Badge variant={u.status === 'High' ? 'rose' : u.status === 'Medium' ? 'amber' : 'emerald'}>{u.status} load</Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Active</span>
                      <span>{u.load}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${u.status === 'High' ? 'bg-rose-500' : u.status === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(u.load * 16, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="border border-slate-200 rounded-lg py-2">
                      <p className="text-sm font-semibold text-slate-900">{u.done}</p>
                      <p className="text-[11px] text-slate-500">Done</p>
                    </div>
                    <div className="border border-slate-200 rounded-lg py-2">
                      <p className="text-sm font-semibold text-slate-900">{u.highCount}</p>
                      <p className="text-[11px] text-slate-500">High Priority</p>
                    </div>
                  </div>
                </article>
              ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default WorkloadView;
