import { useCallback } from 'react';
import { Task, TaskPriority } from '../types';
import { taskService } from '../services/taskService';
import { toastService } from '../services/toastService';

interface GeneratedProjectTask {
  title: string;
  description: string;
  priority: TaskPriority;
  tags: string[];
}

interface UseTaskModalActionsOptions {
  activeProjectId: string | null;
  selectedTask: Task | null;
  setSelectedTask: (task: Task | null | ((prev: Task | null) => Task | null)) => void;
  onCreateTask: (
    title: string,
    description: string,
    priority: TaskPriority,
    tags?: string[],
    dueDate?: number,
    projectId?: string,
    assigneeIds?: string[],
    securityGroupIds?: string[],
    estimateMinutes?: number,
    estimateProvidedBy?: string,
    creationAuditAction?: string
  ) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onCommentTask: (taskId: string, text: string) => void;
  refreshTasks: () => void;
}

interface UseTaskModalActionsResult {
  handleUpdateTaskFromModal: (taskId: string, updates: Partial<Task>) => void;
  handleCommentOnTaskFromModal: (taskId: string, text: string) => void;
  handleGeneratedTasksFromVision: (generated: Array<{ title: string; description: string }>) => void;
  handleVoiceCreateTask: (
    title: string,
    description: string,
    priority: TaskPriority,
    tags?: string[],
    dueDate?: number,
    projectId?: string
  ) => void;
  handleVoiceSetTaskPriority: (taskId: string, priority: TaskPriority) => void;
  handleVoiceAssignTask: (taskId: string, assigneeId: string) => void;
  handleGenerateProjectTasksWithAI: (projectId: string, generatedTasks: GeneratedProjectTask[]) => void;
}

export const useTaskModalActions = ({
  activeProjectId,
  selectedTask,
  setSelectedTask,
  onCreateTask,
  onUpdateTask,
  onCommentTask,
  refreshTasks
}: UseTaskModalActionsOptions): UseTaskModalActionsResult => {
  const handleUpdateTaskFromModal = useCallback(
    (taskId: string, updates: Partial<Task>) => {
      onUpdateTask(taskId, updates);
      setSelectedTask((prev) => (prev?.id === taskId ? { ...prev, ...updates } : prev));
    },
    [onUpdateTask, setSelectedTask]
  );

  const handleCommentOnTaskFromModal = useCallback(
    (taskId: string, text: string) => {
      onCommentTask(taskId, text);
      const updatedTask = taskService.getTaskById(taskId);
      if (updatedTask) {
        setSelectedTask(updatedTask);
      } else if (selectedTask?.id === taskId) {
        setSelectedTask(null);
      }
    },
    [onCommentTask, selectedTask?.id, setSelectedTask]
  );

  const handleGeneratedTasksFromVision = useCallback(
    (generated: Array<{ title: string; description: string }>) => {
      generated.forEach((item) => {
        onCreateTask(
          item.title,
          item.description,
          TaskPriority.MEDIUM,
          ['Vision Scan'],
          undefined,
          activeProjectId || 'p1'
        );
      });
    },
    [activeProjectId, onCreateTask]
  );

  const handleVoiceCreateTask = useCallback(
    (
      title: string,
      description: string,
      priority: TaskPriority,
      tags: string[] = ['Voice'],
      dueDate?: number,
      projectId?: string
    ) => {
      onCreateTask(title, description, priority, tags, dueDate, projectId || activeProjectId || 'p1');
    },
    [activeProjectId, onCreateTask]
  );

  const handleVoiceSetTaskPriority = useCallback(
    (taskId: string, priority: TaskPriority) => {
      onUpdateTask(taskId, { priority });
    },
    [onUpdateTask]
  );

  const handleVoiceAssignTask = useCallback(
    (taskId: string, assigneeId: string) => {
      onUpdateTask(taskId, { assigneeId, assigneeIds: [assigneeId] });
    },
    [onUpdateTask]
  );

  const handleGenerateProjectTasksWithAI = useCallback(
    (projectId: string, generatedTasks: GeneratedProjectTask[]) => {
      if (!generatedTasks.length) return;
      generatedTasks.forEach((item) => {
        onCreateTask(
          item.title,
          item.description,
          item.priority || TaskPriority.MEDIUM,
          item.tags || ['AI'],
          undefined,
          projectId,
          [],
          [],
          undefined,
          undefined,
          'generated with AI from project board'
        );
      });
      toastService.success('AI tasks added', `${generatedTasks.length} task${generatedTasks.length > 1 ? 's' : ''} created.`);
      refreshTasks();
    },
    [onCreateTask, refreshTasks]
  );

  return {
    handleUpdateTaskFromModal,
    handleCommentOnTaskFromModal,
    handleGeneratedTasksFromVision,
    handleVoiceCreateTask,
    handleVoiceSetTaskPriority,
    handleVoiceAssignTask,
    handleGenerateProjectTasksWithAI
  };
};
