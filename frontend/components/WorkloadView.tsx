import React, { useMemo, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Task, TaskPriority, TaskStatus, User } from '../types';
import Button from './ui/Button';
import { aiService } from '../services/aiService';
import { toastService } from '../services/toastService';
import { ensureAiAccess } from '../services/aiAccessService';
import WorkloadFilters from './workload/WorkloadFilters';
import WorkloadSuggestions from './workload/WorkloadSuggestions';
import WorkloadUserCard from './workload/WorkloadUserCard';
import { LoadFilter, UserWorkloadStat, WorkloadSuggestion } from './workload/types';

interface WorkloadViewProps {
  users: User[];
  tasks: Task[];
  onReassign: (taskId: string, toUserId: string) => void;
  aiPlanEnabled: boolean;
  aiEnabled: boolean;
}

const WorkloadView: React.FC<WorkloadViewProps> = ({ users, tasks, onReassign, aiPlanEnabled, aiEnabled }) => {
  const taskAssigneeIds = (task: Task): string[] => {
    if (Array.isArray(task.assigneeIds) && task.assigneeIds.length > 0) return task.assigneeIds;
    return task.assigneeId ? [task.assigneeId] : [];
  };
  const [isBalancing, setIsBalancing] = useState(false);
  const [suggestions, setSuggestions] = useState<WorkloadSuggestion[] | null>(null);
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
      } as UserWorkloadStat;
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
    if (!ensureAiAccess({ aiPlanEnabled, aiEnabled, featureLabel: 'AI workload balancing' })) {
      return;
    }
    setIsBalancing(true);
    try {
      const result = await aiService.suggestWorkloadBalance(tasks, users);
      setSuggestions(result);
    } catch {
      toastService.error('AI suggestion failed', 'Could not generate workload balancing suggestions.');
    } finally {
      setIsBalancing(false);
    }
  };

  const applyReassignment = (item: WorkloadSuggestion) => {
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
            {!aiPlanEnabled ? 'Suggest balancing: Pro' : !aiEnabled ? 'Suggest balancing: Enable AI' : 'Suggest balancing'}
          </Button>
        </div>

        <WorkloadSuggestions
          suggestions={suggestions || []}
          tasks={tasks}
          users={users}
          onApply={applyReassignment}
        />

        <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 h-auto md:h-[620px] flex flex-col">
          <WorkloadFilters
            query={query}
            setQuery={setQuery}
            loadFilter={loadFilter}
            setLoadFilter={setLoadFilter}
            mobileFiltersOpen={mobileFiltersOpen}
            setMobileFiltersOpen={setMobileFiltersOpen}
          />

          {filteredUserStats.length === 0 ? (
            <div className="border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500 flex-1 min-h-0 flex items-center justify-center">
              No team members match these filters.
            </div>
          ) : (
            <div className="flex-1 min-h-0 md:overflow-y-auto custom-scrollbar pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {filteredUserStats.map((user) => (
                  <WorkloadUserCard key={user.id} user={user} />
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
