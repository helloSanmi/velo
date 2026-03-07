import React from 'react';
import { Project, ProjectStage, Task, TaskPriority, User } from '../../types';
import KanbanBoard from './KanbanBoard';
import BoardChecklistView from './BoardChecklistView';
import BoardTableView from './BoardTableView';
import BoardTimelineView from './BoardTimelineView';
import BoardCalendarView from './BoardCalendarView';
import BoardGanttView from './BoardGanttView';
import BoardWorkloadView from './BoardWorkloadView';

interface KanbanBoardContentProps {
  boardView: 'kanban' | 'checklist' | 'gantt' | 'table' | 'calendar' | 'workload' | 'timeline';
  categorizedTasks: Record<string, Task[]>;
  statusFilter: string | 'All';
  projectStages: ProjectStage[];
  selectedTaskIds: string[];
  allUsers: User[];
  projects: Project[];
  activeProject?: Project;
  checklistDensity: 'comfortable' | 'compact';
  canDeleteTask?: (taskId: string) => boolean;
  aiPlanEnabled?: boolean;
  aiEnabled?: boolean;
  canManageTaskAI?: (taskId: string) => boolean;
  canToggleTaskTimer?: (taskId: string) => boolean;
  includeUnscheduled: boolean;
  onToggleTaskSelection: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onMoveTask: (taskId: string, targetStatus: string, targetTaskId?: string) => void;
  onAIAssist: (task: Task) => void;
  onSelectTask: (task: Task) => void;
  onAddNewTask: () => void;
  onUpdateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>) => void;
  onToggleTimer?: (id: string) => void;
}

const KanbanBoardContent: React.FC<KanbanBoardContentProps> = ({
  boardView,
  categorizedTasks,
  statusFilter,
  projectStages,
  selectedTaskIds,
  allUsers,
  projects,
  activeProject,
  checklistDensity,
  canDeleteTask,
  aiPlanEnabled = true,
  aiEnabled = true,
  canManageTaskAI,
  canToggleTaskTimer,
  includeUnscheduled,
  onToggleTaskSelection,
  onDeleteTask,
  onUpdateStatus,
  onMoveTask,
  onAIAssist,
  onSelectTask,
  onAddNewTask,
  onUpdateTask,
  onToggleTimer
}) => {
  if (boardView === 'kanban') {
    return (
      <KanbanBoard
        categorizedTasks={categorizedTasks}
        statusFilter={statusFilter}
        statusOptions={projectStages}
        selectedTaskIds={selectedTaskIds}
        onToggleTaskSelection={onToggleTaskSelection}
        onDeleteTask={onDeleteTask}
        onUpdateStatus={onUpdateStatus}
        onMoveTask={onMoveTask}
        onAIAssist={onAIAssist}
        onSelectTask={onSelectTask}
        onAddNewTask={onAddNewTask}
        onToggleTimer={onToggleTimer}
        canDeleteTask={canDeleteTask}
        aiPlanEnabled={aiPlanEnabled}
        aiEnabled={aiEnabled}
        canManageTaskAI={canManageTaskAI}
        canToggleTaskTimer={canToggleTaskTimer}
        showProjectNameOnCards={!activeProject}
      />
    );
  }

  if (boardView === 'checklist') {
    return (
      <BoardChecklistView
        categorizedTasks={categorizedTasks}
        statusFilter={statusFilter}
        statusOptions={projectStages}
        allUsers={allUsers}
        density={checklistDensity}
        onSelectTask={onSelectTask}
        onUpdateTask={onUpdateTask}
        onMoveTask={onMoveTask}
        onAddNewTask={onAddNewTask}
      />
    );
  }

  if (boardView === 'table') {
    return (
      <BoardTableView
        categorizedTasks={categorizedTasks}
        statusFilter={statusFilter}
        statusOptions={projectStages}
        projects={projects}
        allUsers={allUsers}
        activeProject={activeProject}
        onSelectTask={onSelectTask}
        onUpdateStatus={onUpdateStatus}
        onUpdateTask={onUpdateTask}
        onToggleTimer={onToggleTimer}
        canToggleTaskTimer={canToggleTaskTimer}
      />
    );
  }

  if (boardView === 'timeline') {
    return (
      <BoardTimelineView
        categorizedTasks={categorizedTasks}
        statusFilter={statusFilter}
        statusOptions={projectStages}
        includeUnscheduled={includeUnscheduled}
        onSelectTask={onSelectTask}
        onUpdateTask={onUpdateTask}
      />
    );
  }

  if (boardView === 'calendar') {
    return (
      <BoardCalendarView
        categorizedTasks={categorizedTasks}
        statusFilter={statusFilter}
        statusOptions={projectStages}
        includeUnscheduled={includeUnscheduled}
        onSelectTask={onSelectTask}
        onUpdateTask={onUpdateTask}
      />
    );
  }

  if (boardView === 'gantt') {
    return (
      <BoardGanttView
        categorizedTasks={categorizedTasks}
        statusFilter={statusFilter}
        statusOptions={projectStages}
        includeUnscheduled={includeUnscheduled}
        onSelectTask={onSelectTask}
        onUpdateTask={onUpdateTask}
      />
    );
  }

  return (
    <BoardWorkloadView
      categorizedTasks={categorizedTasks}
      statusFilter={statusFilter}
      statusOptions={projectStages}
      allUsers={allUsers}
      onSelectTask={onSelectTask}
      onReassign={(taskId, userId) => onUpdateTask(taskId, { assigneeId: userId, assigneeIds: [userId] })}
    />
  );
};

export default KanbanBoardContent;
