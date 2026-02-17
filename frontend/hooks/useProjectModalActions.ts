import { useCallback } from 'react';
import { Project, TaskPriority, User } from '../types';
import { projectService } from '../services/projectService';
import { workflowService } from '../services/workflowService';

interface ProjectCreateMeta {
  startDate?: number;
  endDate?: number;
  budgetCost?: number;
  hourlyRate?: number;
  scopeSummary?: string;
  scopeSize?: number;
  isPublic?: boolean;
}

interface UseProjectModalActionsOptions {
  user: User | null;
  projects: Project[];
  setProjects: (updater: Project[] | ((prev: Project[]) => Project[])) => void;
  setActiveProjectId: (projectId: string | null) => void;
  setIsProjectModalOpen: (open: boolean) => void;
  setProjectModalTemplateId: (templateId: string | null) => void;
  onCreateTask: (
    title: string,
    description: string,
    priority: TaskPriority,
    tags?: string[],
    dueDate?: number,
    projectId?: string
  ) => void;
}

export const useProjectModalActions = ({
  user,
  projects,
  setProjects,
  setActiveProjectId,
  setIsProjectModalOpen,
  setProjectModalTemplateId,
  onCreateTask
}: UseProjectModalActionsOptions) => {
  const handleAddProjectFromModal = useCallback(
    (
      name: string,
      description: string,
      color: string,
      members: string[],
      templateId?: string,
      aiGeneratedTasks?: Array<{ title: string; description: string; priority: TaskPriority; tags?: string[] }>,
      meta?: ProjectCreateMeta
    ) => {
      if (!user) return;

      const project = projectService.createProject(user.orgId, name, description, color, members, meta, user.id);
      setProjects([...projects, project]);
      setActiveProjectId(project.id);
      setIsProjectModalOpen(false);
      setProjectModalTemplateId(null);

      if (templateId) {
        const template = workflowService.getTemplates().find((item) => item.id === templateId);
        template?.tasks.forEach((templateTask) => {
          onCreateTask(
            templateTask.title,
            templateTask.description,
            templateTask.priority,
            templateTask.tags,
            undefined,
            project.id
          );
        });
      }

      if (aiGeneratedTasks?.length) {
        aiGeneratedTasks.forEach((generatedTask) => {
          onCreateTask(
            generatedTask.title,
            generatedTask.description,
            generatedTask.priority,
            generatedTask.tags || ['AI-Ingested'],
            undefined,
            project.id
          );
        });
      }
    },
    [
      onCreateTask,
      projects,
      setActiveProjectId,
      setIsProjectModalOpen,
      setProjectModalTemplateId,
      setProjects,
      user
    ]
  );

  return { handleAddProjectFromModal };
};
