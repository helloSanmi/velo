import React, { Suspense, lazy } from 'react';
import TaskModal from '../TaskModal';
import ProjectModal from '../ProjectModal';
import TaskDetailModal from '../TaskDetailModal';
import { SettingsTabType } from '../SettingsModal';
import { Task, User, Project, TaskPriority } from '../../types';
import { TaskDetailTabType } from '../task-detail/types';

const AIModal = lazy(() => import('../AIModal'));
const AICommandCenter = lazy(() => import('../AICommandCenter'));
const VisionModal = lazy(() => import('../VisionModal'));
const CommandPalette = lazy(() => import('../CommandPalette'));
const ProfileModal = lazy(() => import('../ProfileModal'));
const SettingsModal = lazy(() => import('../SettingsModal'));

interface GlobalModalsProps {
  user: User;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  isProjectModalOpen: boolean;
  setIsProjectModalOpen: (open: boolean) => void;
  projectModalTemplateId?: string | null;
  setProjectModalTemplateId?: (templateId: string | null) => void;
  isCommandCenterOpen: boolean;
  setIsCommandCenterOpen: (open: boolean) => void;
  isVisionModalOpen: boolean;
  setIsVisionModalOpen: (open: boolean) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  isProfileOpen: boolean;
  setIsProfileOpen: (open: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  settingsTab: SettingsTabType;
  selectedTask: Task | null;
  taskDetailInitialTab?: TaskDetailTabType;
  onTaskDetailTabChange: (tab: TaskDetailTabType) => void;
  onTaskDetailTabConsumed: () => void;
  setSelectedTask: (task: Task | null) => void;
  aiSuggestions: string[] | null;
  setAiSuggestions: (s: string[] | null) => void;
  aiLoading: boolean;
  activeTaskTitle: string;
  tasks: Task[];
  projectTasks: Task[];
  projects: Project[];
  activeProject?: Project;
  activeProjectId: string | null;
  aiEnabled: boolean;
  canAssignMembers: boolean;
  canManageTask: (taskId: string) => boolean;
  createTask: (
    title: string,
    description: string,
    priority: TaskPriority,
    tags: string[],
    dueDate?: number,
    projectId?: string,
    assigneeIds?: string[],
    securityGroupIds?: string[],
    estimateMinutes?: number,
    estimateProvidedBy?: string,
    creationAuditAction?: string
  ) => void;
  handleAddProject: (
    name: string,
    description: string,
    color: string,
    members: string[],
    templateId?: string,
    aiGeneratedTasks?: any[],
    meta?: { startDate?: number; endDate?: number; budgetCost?: number; hourlyRate?: number; scopeSummary?: string; scopeSize?: number }
  ) => void;
  handleUpdateTask: (id: string, updates: any) => void;
  handleCommentOnTask: (id: string, text: string) => void;
  deleteTask: (id: string) => void;
  canDeleteTask: (taskId: string) => boolean;
  canToggleTaskTimer: (taskId: string) => boolean;
  onToggleTimer: (id: string) => void;
  applyAISuggestions: (finalSteps: string[]) => void;
  handleGeneratedTasks: (generated: any[]) => void;
  setActiveProjectId: (id: string) => void;
  refreshTasks: () => void;
  onRenameProject: (id: string, name: string) => void;
  onCompleteProject: (id: string) => void;
  onReopenProject: (id: string) => void;
  onArchiveProject: (id: string) => void;
  onRestoreProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onPurgeProject: (id: string) => void;
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
  onChangeProjectOwner: (id: string, ownerId: string) => void;
  onDeleteOrganization: () => void;
  onUserUpdated: (user: User) => void;
  allowAiTools: boolean;
  onVoiceSelectProject: (projectId: string) => void;
  onVoiceCreateTask: (
    title: string,
    description: string,
    priority: TaskPriority,
    tags?: string[],
    dueDate?: number,
    projectId?: string
  ) => void;
  onVoiceSetTaskStatus: (taskId: string, status: string) => void;
  onVoiceSetTaskPriority: (taskId: string, priority: TaskPriority) => void;
  onVoiceAssignTask: (taskId: string, assigneeId: string) => void;
  onPinInsightToProject: (projectId: string, insight: string) => void;
  onUnpinInsightFromProject: (projectId: string, insight: string) => void;
  isProjectInsightPinned: (projectId: string, insight: string) => boolean;
}

const GlobalModals: React.FC<GlobalModalsProps> = ({
  user, isModalOpen, setIsModalOpen, isProjectModalOpen, setIsProjectModalOpen,
  projectModalTemplateId, setProjectModalTemplateId,
  isCommandCenterOpen, setIsCommandCenterOpen,
  isVisionModalOpen, setIsVisionModalOpen, isCommandPaletteOpen, setIsCommandPaletteOpen,
  isProfileOpen, setIsProfileOpen,
  isSettingsOpen, setIsSettingsOpen, settingsTab, selectedTask, setSelectedTask,
  taskDetailInitialTab, onTaskDetailTabChange, onTaskDetailTabConsumed,
  aiSuggestions, setAiSuggestions, aiLoading, activeTaskTitle, tasks, projects,
  projectTasks, activeProject,
  activeProjectId, aiEnabled, canAssignMembers, canManageTask, createTask, handleAddProject, handleUpdateTask,
  handleCommentOnTask, deleteTask, canDeleteTask, canToggleTaskTimer, onToggleTimer, applyAISuggestions, handleGeneratedTasks,
  setActiveProjectId, refreshTasks, onRenameProject, onCompleteProject, onReopenProject, onArchiveProject, onRestoreProject, onDeleteProject, onPurgeProject, onUpdateProject, onChangeProjectOwner, onDeleteOrganization, onUserUpdated,
  allowAiTools, onVoiceSelectProject, onVoiceCreateTask, onVoiceSetTaskStatus, onVoiceSetTaskPriority, onVoiceAssignTask, onPinInsightToProject, onUnpinInsightFromProject, isProjectInsightPinned
}) => {
  const withLazy = (node: React.ReactNode) => (
    <Suspense fallback={null}>{node}</Suspense>
  );

  return (
    <>
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        canAssignMembers={canAssignMembers}
        projectId={activeProjectId}
        onSubmit={(title, description, priority, tags, dueDate, assigneeIds, securityGroupIds, estimateMinutes, creationAuditAction) =>
          createTask(title, description, priority, tags, dueDate, activeProjectId || 'p1', assigneeIds, securityGroupIds, estimateMinutes, user.id, creationAuditAction)
        }
      />
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => {
          setIsProjectModalOpen(false);
          setProjectModalTemplateId?.(null);
        }}
        onSubmit={handleAddProject}
        currentUserId={user.id}
        initialTemplateId={projectModalTemplateId}
        allowAiMode={allowAiTools}
      />
      <TaskDetailModal 
        task={selectedTask ? (tasks.find((t) => t.id === selectedTask.id) || selectedTask) : null}
        tasks={tasks} // Fixed: Passing the tasks array to the detail modal to prevent 'filter' errors
        currentUser={user} 
        initialTab={taskDetailInitialTab}
        onActiveTabChange={onTaskDetailTabChange}
        onClose={() => { setSelectedTask(null); onTaskDetailTabConsumed(); refreshTasks(); }} 
        onUpdate={handleUpdateTask} 
        onAddComment={handleCommentOnTask} 
        onDelete={deleteTask} 
        canDelete={Boolean(selectedTask && canDeleteTask(selectedTask.id))}
        canManageTask={Boolean(selectedTask && canManageTask(selectedTask.id))}
        canTrackTime={Boolean(selectedTask && canToggleTaskTimer(selectedTask.id))}
        aiEnabled={aiEnabled}
        onToggleTimer={onToggleTimer}
      />
      {withLazy(<AIModal suggestions={aiSuggestions} onClose={() => setAiSuggestions(null)} onApply={applyAISuggestions} isLoading={aiLoading} taskTitle={activeTaskTitle} />)}
      {allowAiTools ? withLazy(
        <AICommandCenter
          isOpen={isCommandCenterOpen}
          onClose={() => setIsCommandCenterOpen(false)}
          tasks={tasks}
          projects={projects}
          activeProjectId={activeProjectId}
          currentUserName={user.displayName}
          currentUserId={user.id}
          orgId={user.orgId}
          onSelectProject={onVoiceSelectProject}
          onCreateTask={onVoiceCreateTask}
          onSetTaskStatus={onVoiceSetTaskStatus}
          onSetTaskPriority={onVoiceSetTaskPriority}
          onAssignTask={onVoiceAssignTask}
          onPinInsight={onPinInsightToProject}
          onUnpinInsight={onUnpinInsightFromProject}
          isInsightPinned={isProjectInsightPinned}
        />
      ) : null}
      {allowAiTools ? withLazy(<VisionModal isOpen={isVisionModalOpen} onClose={() => setIsVisionModalOpen(false)} onTasksGenerated={handleGeneratedTasks} activeProjectName={activeProject?.name} activeStageNames={activeProject?.stages?.map((stage) => stage.name)} />) : null}
      {withLazy(<CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} tasks={tasks} projects={projects} onSelectTask={setSelectedTask} onSelectProject={setActiveProjectId} />)}
      {withLazy(
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          user={user}
          onUserUpdated={onUserUpdated}
        />
      )}
      {withLazy(
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          initialTab={settingsTab}
          user={user}
          projects={projects}
          projectTasks={projectTasks}
          onRenameProject={onRenameProject}
          onCompleteProject={onCompleteProject}
          onReopenProject={onReopenProject}
          onArchiveProject={onArchiveProject}
          onRestoreProject={onRestoreProject}
          onDeleteProject={onDeleteProject}
          onPurgeProject={onPurgeProject}
          onUpdateProject={onUpdateProject}
          onChangeProjectOwner={onChangeProjectOwner}
          onDeleteOrganization={onDeleteOrganization}
          onUserUpdated={onUserUpdated}
        />
      )}
    </>
  );
};

export default GlobalModals;
