import React, { useMemo, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { aiService } from '../../services/aiService';
import { TaskPriority } from '../../types';
import Button from '../ui/Button';

interface GeneratedTaskDraft {
  title: string;
  description: string;
  priority: TaskPriority;
  tags: string[];
}

interface AIGenerateTasksModalProps {
  isOpen: boolean;
  projectName: string;
  projectDescription?: string;
  onClose: () => void;
  onGenerate: (tasks: GeneratedTaskDraft[]) => void;
}

const AIGenerateTasksModal: React.FC<AIGenerateTasksModalProps> = ({
  isOpen,
  projectName,
  projectDescription,
  onClose,
  onGenerate
}) => {
  const [brief, setBrief] = useState('');
  const [taskCount, setTaskCount] = useState(6);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const helperText = useMemo(
    () => (projectDescription?.trim() ? projectDescription : 'Add a short delivery brief so AI can create focused tasks.'),
    [projectDescription]
  );

  if (!isOpen) return null;

  const handleClose = () => {
    if (isLoading) return;
    setBrief('');
    setTaskCount(6);
    setError('');
    onClose();
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
      onGenerate(cleaned);
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
