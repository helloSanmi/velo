import React from 'react';
import { Task } from '../../types';

interface TaskDetailActivityTabProps {
  task: Task;
}

const TaskDetailActivityTab: React.FC<TaskDetailActivityTabProps> = ({ task }) => {
  const formatAction = (rawAction: string) => {
    if (!rawAction) return 'made an update';
    if (rawAction === 'Node initialized') return 'created this task';
    if (rawAction.startsWith('Reconfigured ')) {
      const key = rawAction.replace('Reconfigured ', '');
      const labels: Record<string, string> = {
        title: 'title',
        description: 'description',
        status: 'status',
        priority: 'priority',
        tags: 'tags',
        dueDate: 'due date',
        assigneeId: 'assignee',
        assigneeIds: 'assignees',
        comments: 'comments',
        subtasks: 'subtasks',
        blockedByIds: 'dependencies',
        timeLogged: 'time tracked'
      };
      return `updated ${labels[key] || key}`;
    }
    return rawAction;
  };

  return (
    <div className="h-full max-h-[52vh] md:max-h-[56vh] overflow-y-auto custom-scrollbar pr-1 space-y-2.5 animate-in fade-in duration-300">
      {(task.auditLog || []).length === 0 ? (
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-600">No activity yet.</div>
      ) : (
        (task.auditLog || [])
          .slice()
          .sort((a, b) => b.timestamp - a.timestamp)
          .map((log) => {
            const actionText = formatAction(log.action);
            const sentence = /[.!?]$/.test(actionText) ? actionText : `${actionText}.`;
            return (
            <div key={log.id} className="p-2.5 bg-slate-50 border-l-2 border-indigo-600 rounded-r-lg">
              <p className="text-xs font-medium text-slate-900 leading-snug">
                <span className="font-semibold">{log.displayName}</span> {sentence}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">{new Date(log.timestamp).toLocaleString()}</p>
            </div>
          );
          })
      )}
    </div>
  );
};

export default TaskDetailActivityTab;
