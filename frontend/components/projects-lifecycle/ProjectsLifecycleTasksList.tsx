import React from 'react';
import { Task } from '../../types';

interface ProjectsLifecycleTasksListProps {
  focusedProjectTasks: Task[];
}

const ProjectsLifecycleTasksList: React.FC<ProjectsLifecycleTasksListProps> = ({ focusedProjectTasks }) => {
  return (
    <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden flex-1 min-h-0">
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wide">Tasks</div>
      <div className="max-h-[42vh] md:max-h-[38vh] overflow-y-auto custom-scrollbar">
        {focusedProjectTasks.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No tasks found for this project.</p>
        ) : (
          <div className="divide-y divide-slate-200">
            {focusedProjectTasks.map((task) => (
              <div key={task.id} className="p-3">
                <p title={task.title} className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {task.status.replace('-', ' ')} • {task.priority}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsLifecycleTasksList;
