import React, { Suspense, lazy } from 'react';
import TaskModal from '../TaskModal';
import ProjectModal from '../ProjectModal';
import TaskDetailModal from '../TaskDetailModal';
import { GlobalModalsProps } from './GlobalModals.types';

const AIModal = lazy(() => import('../AIModal'));
const AICommandCenter = lazy(() => import('../AICommandCenter'));
const VisionModal = lazy(() => import('../VisionModal'));
const CommandPalette = lazy(() => import('../CommandPalette'));
const ProfileModal = lazy(() => import('../ProfileModal'));
const SettingsModal = lazy(() => import('../SettingsModal'));

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
  activeProjectId, aiPlanEnabled, aiEnabled, canAssignMembers, canManageTask, createTask, handleAddProject, handleUpdateTask,
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
        aiPlanEnabled={aiPlanEnabled}
        aiEnabled={aiEnabled}
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
        aiPlanEnabled={aiPlanEnabled}
        aiEnabled={aiEnabled}
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
        aiPlanEnabled={aiPlanEnabled}
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
