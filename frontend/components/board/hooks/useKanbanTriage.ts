import { useState } from 'react';
import { Project, ProjectStage, Task } from '../../../types';
import { aiService } from '../../../services/aiService';
import { dialogService } from '../../../services/dialogService';
import { taskService } from '../../../services/taskService';

interface UseKanbanTriageOptions {
  activeProject: Project | undefined;
  projectStages: ProjectStage[];
  categorizedTasks: Record<string, Task[]>;
  refreshTasks?: () => void;
}

export const useKanbanTriage = ({
  activeProject,
  projectStages,
  categorizedTasks,
  refreshTasks
}: UseKanbanTriageOptions) => {
  const [isTriaging, setIsTriaging] = useState(false);

  const handleOptimizeOrder = async () => {
    if (!activeProject || isTriaging) return;

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
    } finally {
      setIsTriaging(false);
    }
  };

  return {
    isTriaging,
    handleOptimizeOrder
  };
};
