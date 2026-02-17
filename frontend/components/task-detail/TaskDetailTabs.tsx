import React from 'react';
import { History, ListChecks, Lock, MessageSquare, User as UserIcon } from 'lucide-react';
import { Task } from '../../types';
import { TaskDetailTabType } from './types';

interface TaskDetailTabsProps {
  task: Task;
  activeTab: TaskDetailTabType;
  setActiveTab: (tab: TaskDetailTabType) => void;
}

const TaskDetailTabs: React.FC<TaskDetailTabsProps> = ({ task, activeTab, setActiveTab }) => {
  const tabs: Array<{ id: TaskDetailTabType; label: string; icon: React.ReactNode; count: string }> = [
    { id: 'general', label: 'Summary', icon: <UserIcon className="w-3.5 h-3.5" />, count: '' },
    { id: 'subtasks', label: 'Steps', icon: <ListChecks className="w-3.5 h-3.5" />, count: String(task.subtasks.length) },
    { id: 'dependencies', label: 'Deps', icon: <Lock className="w-3.5 h-3.5" />, count: String(task.blockedByIds?.length || 0) },
    { id: 'comments', label: 'Comments', icon: <MessageSquare className="w-3.5 h-3.5" />, count: String(task.comments?.length || 0) },
    { id: 'activity', label: 'Activity', icon: <History className="w-3.5 h-3.5" />, count: String(task.auditLog?.length || 0) }
  ];

  return (
    <div className="px-4 md:px-5 py-3 border-b border-slate-200 flex-shrink-0 bg-white">
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar md:grid md:grid-cols-5 md:overflow-visible">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`h-10 rounded-lg px-2 inline-flex items-center justify-center gap-1.5 text-[11px] font-medium transition-colors shrink-0 min-w-[108px] md:min-w-0 ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            {tab.icon}
            <span className="truncate">{tab.label}</span>
            {tab.count && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${activeTab === tab.id ? 'bg-white/15 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TaskDetailTabs;
