import { useCallback } from 'react';
import { TaskPriority } from '../types';
import { dialogService } from '../services/dialogService';
import { toastService } from '../services/toastService';

interface UseBulkTaskActionsParams {
  selectedTaskIds: string[];
  setSelectedTaskIds: (ids: string[]) => void;
  ensureTaskPermission: (taskId: string, action: 'complete' | 'rename' | 'delete' | 'assign') => boolean;
  canMutateTask: (taskId: string) => boolean;
  bulkUpdateTasks: (ids: string[], updates: { priority?: TaskPriority; status?: string; assigneeId?: string; assigneeIds?: string[] }) => void;
  bulkDeleteTasks: (ids: string[]) => void;
}

export const useBulkTaskActions = ({
  selectedTaskIds,
  setSelectedTaskIds,
  ensureTaskPermission,
  canMutateTask,
  bulkUpdateTasks,
  bulkDeleteTasks
}: UseBulkTaskActionsParams) => {
  const handleBulkPriority = useCallback(
    (priority: TaskPriority) => {
      const allowed = selectedTaskIds.filter((taskId) => canMutateTask(taskId) && ensureTaskPermission(taskId, 'rename'));
      bulkUpdateTasks(allowed, { priority });
      toastService.success('Priorities updated', `${allowed.length} task${allowed.length > 1 ? 's updated' : ' updated'}.`);
      setSelectedTaskIds([]);
    },
    [bulkUpdateTasks, canMutateTask, ensureTaskPermission, selectedTaskIds, setSelectedTaskIds]
  );

  const handleBulkStatus = useCallback(
    (status: string) => {
      bulkUpdateTasks(
        selectedTaskIds.filter((taskId) => canMutateTask(taskId) && ensureTaskPermission(taskId, 'complete')),
        { status }
      );
      setSelectedTaskIds([]);
    },
    [bulkUpdateTasks, canMutateTask, ensureTaskPermission, selectedTaskIds, setSelectedTaskIds]
  );

  const handleBulkAssignee = useCallback(
    (assigneeId: string) => {
      bulkUpdateTasks(
        selectedTaskIds.filter((taskId) => canMutateTask(taskId) && ensureTaskPermission(taskId, 'assign')),
        { assigneeId, assigneeIds: [assigneeId] }
      );
      setSelectedTaskIds([]);
    },
    [bulkUpdateTasks, canMutateTask, ensureTaskPermission, selectedTaskIds, setSelectedTaskIds]
  );

  const handleBulkDelete = useCallback(async () => {
    const confirmed = await dialogService.confirm('Delete selected tasks?', { title: 'Bulk delete', confirmText: 'Delete', danger: true });
    if (!confirmed) return;
    bulkDeleteTasks(selectedTaskIds.filter((taskId) => canMutateTask(taskId) && ensureTaskPermission(taskId, 'delete')));
    setSelectedTaskIds([]);
  }, [bulkDeleteTasks, canMutateTask, ensureTaskPermission, selectedTaskIds, setSelectedTaskIds]);

  return {
    handleBulkPriority,
    handleBulkStatus,
    handleBulkAssignee,
    handleBulkDelete
  };
};
