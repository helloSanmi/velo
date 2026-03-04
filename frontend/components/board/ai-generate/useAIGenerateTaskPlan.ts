import { useMemo } from 'react';
import { Task, TaskStatus, User } from '../../../types';
import { userService } from '../../../services/userService';
import { GeneratedTaskDraft } from './types';

const WORKLOAD_PATTERN = /workload|least busy|lightest|balance|auto[- ]?assign|smart assign/i;
const UNASSIGNED_PATTERN = /leave unassigned|unassigned|no assign/i;
const ASSIGN_TO_ME_PATTERN = /assign to me|for me|to me/i;

export const useAIGenerateTaskPlan = (
  assigneeCandidates: User[],
  projectTasks: Task[],
  projectDescription?: string
) => {
  const helperText = useMemo(
    () => (projectDescription?.trim() ? projectDescription : 'Add a short delivery brief so AI can create focused tasks.'),
    [projectDescription]
  );
  const currentUser = useMemo(() => userService.getCurrentUser(), []);
  const currentUserCandidate = useMemo(
    () => assigneeCandidates.find((candidate) => candidate.id === currentUser?.id),
    [assigneeCandidates, currentUser?.id]
  );

  const isWorkloadInstruction = (value: string) => WORKLOAD_PATTERN.test(value);
  const isUnassignedInstruction = (value: string) => UNASSIGNED_PATTERN.test(value);

  const findExplicitAssignees = (value: string): User[] => {
    const normalized = value.toLowerCase();
    return assigneeCandidates.filter((candidate) => {
      const aliases = [candidate.displayName, candidate.username, candidate.email]
        .filter(Boolean)
        .map((item) => String(item).trim().toLowerCase())
        .filter((item) => item.length > 1);
      return aliases.some((alias) => normalized.includes(alias));
    });
  };

  const buildWorkloadOrder = (): User[] => {
    const loadByUser = new Map<string, number>();
    assigneeCandidates.forEach((candidate) => loadByUser.set(candidate.id, 0));
    projectTasks.forEach((task) => {
      if (task.status === TaskStatus.DONE) return;
      const ids = Array.isArray(task.assigneeIds) ? task.assigneeIds : task.assigneeId ? [task.assigneeId] : [];
      ids.forEach((id) => {
        if (!loadByUser.has(id)) return;
        loadByUser.set(id, (loadByUser.get(id) || 0) + 1);
      });
    });
    return assigneeCandidates.slice().sort((a, b) => {
      const aLoad = loadByUser.get(a.id) || 0;
      const bLoad = loadByUser.get(b.id) || 0;
      if (aLoad !== bLoad) return aLoad - bLoad;
      return a.displayName.localeCompare(b.displayName);
    });
  };

  const applyAssignmentPlan = (tasks: GeneratedTaskDraft[], instruction: string): GeneratedTaskDraft[] => {
    const normalized = instruction.trim();
    if (!normalized || isUnassignedInstruction(normalized)) return tasks;
    if (ASSIGN_TO_ME_PATTERN.test(normalized)) {
      if (!currentUserCandidate) return tasks;
      return tasks.map((task) => ({ ...task, assigneeIds: [currentUserCandidate.id] }));
    }
    if (assigneeCandidates.length === 0) return tasks;

    const assignerPool = isWorkloadInstruction(normalized) ? buildWorkloadOrder() : findExplicitAssignees(normalized);
    if (assignerPool.length === 0) return tasks;

    const rollingLoads = new Map(assignerPool.map((user, index) => [user.id, index]));
    return tasks.map((task, index) => {
      const candidate =
        isWorkloadInstruction(normalized)
          ? assignerPool
              .slice()
              .sort((a, b) => {
                const aLoad = rollingLoads.get(a.id) || 0;
                const bLoad = rollingLoads.get(b.id) || 0;
                if (aLoad !== bLoad) return aLoad - bLoad;
                return a.displayName.localeCompare(b.displayName);
              })[0]
          : assignerPool[index % assignerPool.length];
      if (!candidate) return task;
      rollingLoads.set(candidate.id, (rollingLoads.get(candidate.id) || 0) + 1);
      return { ...task, assigneeIds: [candidate.id] };
    });
  };

  return {
    helperText,
    currentUserCandidate,
    isWorkloadInstruction,
    isUnassignedInstruction,
    applyAssignmentPlan
  };
};
