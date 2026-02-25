import React, { useMemo, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { aiService } from '../../services/aiService';
import { Task, TaskPriority, TaskStatus, User } from '../../types';
import { userService } from '../../services/userService';
import Button from '../ui/Button';

interface GeneratedTaskDraft {
  title: string;
  description: string;
  priority: TaskPriority;
  tags: string[];
  assigneeIds?: string[];
}

interface AIGenerateTasksModalProps {
  isOpen: boolean;
  projectName: string;
  projectDescription?: string;
  assigneeCandidates: User[];
  projectTasks: Task[];
  onClose: () => void;
  onGenerate: (tasks: GeneratedTaskDraft[]) => void;
}

const AIGenerateTasksModal: React.FC<AIGenerateTasksModalProps> = ({
  isOpen,
  projectName,
  projectDescription,
  assigneeCandidates,
  projectTasks,
  onClose,
  onGenerate
}) => {
  const [brief, setBrief] = useState('');
  const [assignmentInstruction, setAssignmentInstruction] = useState('');
  const [taskCount, setTaskCount] = useState(6);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const helperText = useMemo(
    () => (projectDescription?.trim() ? projectDescription : 'Add a short delivery brief so AI can create focused tasks.'),
    [projectDescription]
  );
  const currentUser = useMemo(() => userService.getCurrentUser(), []);
  const currentUserCandidate = useMemo(
    () => assigneeCandidates.find((candidate) => candidate.id === currentUser?.id),
    [assigneeCandidates, currentUser?.id]
  );

  if (!isOpen) return null;

  const handleClose = () => {
    if (isLoading) return;
    setBrief('');
    setAssignmentInstruction('');
    setTaskCount(6);
    setError('');
    onClose();
  };

  const isWorkloadInstruction = (value: string) =>
    /workload|least busy|lightest|balance|auto[- ]?assign|smart assign/i.test(value);

  const findExplicitAssignees = (value: string): User[] => {
    const normalized = value.toLowerCase();
    return assigneeCandidates.filter((candidate) => {
      const aliases = [candidate.displayName, candidate.username, candidate.email]
        .filter(Boolean)
        .map((item) => String(item).trim().toLowerCase())
        .filter((item) => item.length > 1);
      return aliases.some((alias) => normalized.includes(alias));
    });
  };

  const buildWorkloadOrder = (): User[] => {
    const loadByUser = new Map<string, number>();
    assigneeCandidates.forEach((candidate) => loadByUser.set(candidate.id, 0));
    projectTasks.forEach((task) => {
      if (task.status === TaskStatus.DONE) return;
      const ids = Array.isArray(task.assigneeIds) ? task.assigneeIds : task.assigneeId ? [task.assigneeId] : [];
      ids.forEach((id) => {
        if (!loadByUser.has(id)) return;
        loadByUser.set(id, (loadByUser.get(id) || 0) + 1);
      });
    });
    return assigneeCandidates.slice().sort((a, b) => {
      const aLoad = loadByUser.get(a.id) || 0;
      const bLoad = loadByUser.get(b.id) || 0;
      if (aLoad !== bLoad) return aLoad - bLoad;
      return a.displayName.localeCompare(b.displayName);
    });
  };

  const applyAssignmentPlan = (tasks: GeneratedTaskDraft[], instruction: string): GeneratedTaskDraft[] => {
    const normalized = instruction.trim();
    if (!normalized) return tasks;
    if (/leave unassigned|unassigned|no assign/i.test(normalized)) return tasks;
    if (/assign to me|for me|to me/i.test(normalized)) {
      if (!currentUserCandidate) return tasks;
      return tasks.map((task) => ({ ...task, assigneeIds: [currentUserCandidate.id] }));
    }
    if (assigneeCandidates.length === 0) return tasks;

    const assignerPool = isWorkloadInstruction(normalized) ? buildWorkloadOrder() : findExplicitAssignees(normalized);
    if (assignerPool.length === 0) return tasks;

    const rollingLoads = new Map(assignerPool.map((user, index) => [user.id, index]));
    return tasks.map((task, index) => {
      const candidate =
        isWorkloadInstruction(normalized)
          ? assignerPool
              .slice()
              .sort((a, b) => {
                const aLoad = rollingLoads.get(a.id) || 0;
                const bLoad = rollingLoads.get(b.id) || 0;
                if (aLoad !== bLoad) return aLoad - bLoad;
                return a.displayName.localeCompare(b.displayName);
              })[0]
          : assignerPool[index % assignerPool.length];
      if (!candidate) return task;
      rollingLoads.set(candidate.id, (rollingLoads.get(candidate.id) || 0) + 1);
      return { ...task, assigneeIds: [candidate.id] };
    });
  };

  const handleGenerate = async () => {
    const normalizedBrief = brief.trim() || helperText;
    setIsLoading(true);
    setError('');
    try {
      const generated = await aiService.generateProjectTasksFromBrief(projectName, normalizedBrief, taskCount);
      const cleaned = (generated || [])
        .filter((task) => task?.title?.trim())
        .map((task) => ({
          title: task.title.trim(),
          description: (task.description || '').trim(),
          priority: task.priority || TaskPriority.MEDIUM,
          tags: Array.isArray(task.tags) && task.tags.length > 0 ? task.tags.slice(0, 5) : ['AI']
        }));
      if (cleaned.length === 0) {
        setError('No tasks were generated. Try a more specific brief.');
        return;
      }
      const enriched = applyAssignmentPlan(cleaned, assignmentInstruction);
      if (
        assignmentInstruction.trim() &&
        !isWorkloadInstruction(assignmentInstruction) &&
        !/leave unassigned|unassigned|no assign/i.test(assignmentInstruction) &&
        enriched.every((task) => !task.assigneeIds?.length)
      ) {
        setError('No assignee matched your instruction. Use display name, username, or write "assign by workload".');
        return;
      }
      onGenerate(enriched);
      handleClose();
    } catch {
      setError('AI task generation failed. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[150] bg-slate-900/45 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={(event) => event.target === event.currentTarget && handleClose()}
    >
      <div className="w-full max-w-lg rounded-none md:rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden h-[100dvh] md:h-auto md:max-h-[84vh] flex flex-col">
        <div className="h-12 px-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Generate AI tasks</h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Project</p>
            <p className="text-sm font-medium text-slate-900 mt-0.5">{projectName}</p>
            <p className="text-xs text-slate-600 mt-1 line-clamp-2">{helperText}</p>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">What should AI focus on?</label>
            <textarea
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              className="w-full min-h-[110px] rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              placeholder="Example: prioritize launch blockers, QA readiness, and owner handoffs."
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Assignment instruction (optional)</label>
            <input
              value={assignmentInstruction}
              onChange={(event) => setAssignmentInstruction(event.target.value)}
              className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              placeholder='Example: assign to "Sarah Chen" and "Michael Scott", or "assign by workload".'
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setAssignmentInstruction('assign by workload')}
                className="h-7 rounded-full border border-slate-300 bg-white px-3 text-[11px] text-slate-700 hover:bg-slate-50"
              >
                Assign by workload
              </button>
              <button
                type="button"
                onClick={() =>
                  setAssignmentInstruction(
                    currentUserCandidate
                      ? `assign to ${currentUserCandidate.displayName}`
                      : 'assign to me'
                  )
                }
                className="h-7 rounded-full border border-slate-300 bg-white px-3 text-[11px] text-slate-700 hover:bg-slate-50"
              >
                Assign to me
              </button>
              <button
                type="button"
                onClick={() => setAssignmentInstruction('leave unassigned')}
                className="h-7 rounded-full border border-slate-300 bg-white px-3 text-[11px] text-slate-700 hover:bg-slate-50"
              >
                Leave unassigned
              </button>
            </div>
          </div>

          <div className="w-full sm:w-40">
            <label className="block text-xs text-slate-500 mb-1">Tasks to create</label>
            <input
              type="number"
              min={1}
              max={20}
              value={taskCount}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                setTaskCount(Number.isFinite(nextValue) ? Math.max(1, Math.min(20, nextValue)) : 6);
              }}
              className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          {error ? <p className="text-xs text-rose-600">{error}</p> : null}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} isLoading={isLoading}>
              <Sparkles className="w-4 h-4 mr-1.5" />
              Generate tasks
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIGenerateTasksModal;
