import { useState } from 'react';
import { Project, ProjectStage, Task } from '../../../types';
import { aiService } from '../../../services/aiService';
import { dialogService } from '../../../services/dialogService';
import { taskService } from '../../../services/taskService';
import { toastService } from '../../../services/toastService';
import { ensureAiAccess } from '../../../services/aiAccessService';

interface UseKanbanTriageOptions {
  activeProject: Project | undefined;
  projectStages: ProjectStage[];
  categorizedTasks: Record<string, Task[]>;
  refreshTasks?: () => void;
  aiPlanEnabled?: boolean;
  aiEnabled?: boolean;
}

export const useKanbanTriage = ({
  activeProject,
  projectStages,
  categorizedTasks,
  refreshTasks,
  aiPlanEnabled = true,
  aiEnabled = true
}: UseKanbanTriageOptions) => {
  const [isTriaging, setIsTriaging] = useState(false);

  const handleOptimizeOrder = async () => {
    if (!activeProject || isTriaging) return;
    if (!ensureAiAccess({ aiPlanEnabled, aiEnabled, featureLabel: 'AI backlog optimization' })) {
      return;
    }

    const firstStageId = projectStages[0]?.id || 'todo';
    const firstStageTasks = categorizedTasks[firstStageId] || [];

    if (firstStageTasks.length < 2) {
      await dialogService.notice(`At least 2 tasks are required in ${projectStages[0]?.name || 'the first stage'}.`, {
        title: 'Not enough tasks'
      });
      return;
    }

    setIsTriaging(true);

    try {
      const orderedIds = await aiService.suggestTriage(firstStageTasks);
      const newOrder = [...firstStageTasks].sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id));
      taskService.reorderTasks(activeProject.orgId, newOrder);
      refreshTasks?.();
    } catch {
      toastService.error('AI optimization failed', 'Could not optimize backlog order right now.');
    } finally {
      setIsTriaging(false);
    }
  };

  return {
    isTriaging,
    handleOptimizeOrder
  };
};
