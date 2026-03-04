import { useMemo, useState } from 'react';
import { Project, User } from '../../types';
import { EditSection, LifecycleMetaItem } from './projectsLifecycle.types';

const toDateInput = (value?: number) => (value ? new Date(value).toISOString().slice(0, 10) : '');

interface UseProjectsLifecyclePanelStateArgs {
  focusedProject: Project;
  allUsers: User[];
  currentUserRole?: 'admin' | 'member' | 'guest';
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
}

export const useProjectsLifecyclePanelState = ({
  focusedProject,
  allUsers,
  currentUserRole,
  onUpdateProject
}: UseProjectsLifecyclePanelStateArgs) => {
  const [editSection, setEditSection] = useState<EditSection>(null);
  const [draftStartDate, setDraftStartDate] = useState(toDateInput(focusedProject.startDate));
  const [draftEndDate, setDraftEndDate] = useState(toDateInput(focusedProject.endDate));
  const [draftBudget, setDraftBudget] = useState(
    typeof focusedProject.budgetCost === 'number' ? String(focusedProject.budgetCost) : ''
  );
  const [draftHourlyRate, setDraftHourlyRate] = useState(
    typeof focusedProject.hourlyRate === 'number' ? String(focusedProject.hourlyRate) : ''
  );
  const [draftScopeSize, setDraftScopeSize] = useState(
    typeof focusedProject.scopeSize === 'number' ? String(focusedProject.scopeSize) : ''
  );
  const [draftScopeSummary, setDraftScopeSummary] = useState(focusedProject.scopeSummary || '');

  const ownerIds = useMemo(
    () => Array.from(new Set([...(focusedProject.ownerIds || []), ...(focusedProject.createdBy ? [focusedProject.createdBy] : [])])),
    [focusedProject.ownerIds, focusedProject.createdBy]
  );
  const [draftOwnerIds, setDraftOwnerIds] = useState<string[]>(ownerIds);

  const resolveUserLabel = (userId?: string) => {
    if (!userId) return 'Unknown';
    return allUsers.find((user) => user.id === userId)?.displayName || 'Unknown';
  };

  const ownerNames = ownerIds
    .map((id) => allUsers.find((user) => user.id === id)?.displayName)
    .filter(Boolean) as string[];

  const lifecycleMeta = useMemo(
    () =>
      [
        focusedProject.isCompleted
          ? {
              key: 'completed',
              label: 'Completed',
              timestamp: focusedProject.completedAt || focusedProject.updatedAt || 0,
              actor: resolveUserLabel(focusedProject.completedById),
              isApproximate: !focusedProject.completedAt
            }
          : null,
        focusedProject.isArchived
          ? {
              key: 'archived',
              label: 'Archived',
              timestamp: focusedProject.archivedAt || focusedProject.updatedAt || 0,
              actor: resolveUserLabel(focusedProject.archivedById),
              isApproximate: !focusedProject.archivedAt
            }
          : null,
        focusedProject.isDeleted
          ? {
              key: 'deleted',
              label: 'Deleted',
              timestamp: focusedProject.deletedAt || focusedProject.updatedAt || 0,
              actor: resolveUserLabel(focusedProject.deletedById),
              isApproximate: !focusedProject.deletedAt
            }
          : null
      ].filter(Boolean) as LifecycleMetaItem[],
    [focusedProject, allUsers]
  );

  const openSectionEditor = (section: EditSection) => {
    setEditSection(section);
    setDraftStartDate(toDateInput(focusedProject.startDate));
    setDraftEndDate(toDateInput(focusedProject.endDate));
    setDraftBudget(typeof focusedProject.budgetCost === 'number' ? String(focusedProject.budgetCost) : '');
    setDraftHourlyRate(typeof focusedProject.hourlyRate === 'number' ? String(focusedProject.hourlyRate) : '');
    setDraftScopeSize(typeof focusedProject.scopeSize === 'number' ? String(focusedProject.scopeSize) : '');
    setDraftScopeSummary(focusedProject.scopeSummary || '');
    setDraftOwnerIds(ownerIds);
  };

  const closeEditor = () => setEditSection(null);

  const toggleOwner = (userId: string) => {
    setDraftOwnerIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  };

  const saveSection = () => {
    if (!editSection) return;
    if (editSection === 'timeline') {
      const startDate = draftStartDate ? new Date(`${draftStartDate}T00:00:00`).getTime() : undefined;
      const endDate = draftEndDate ? new Date(`${draftEndDate}T00:00:00`).getTime() : undefined;
      onUpdateProject(focusedProject.id, { startDate, endDate });
    }
    if (editSection === 'budget') {
      onUpdateProject(focusedProject.id, {
        budgetCost: draftBudget ? Math.max(0, Number(draftBudget)) : undefined,
        hourlyRate: draftHourlyRate ? Math.max(0, Number(draftHourlyRate)) : undefined
      });
    }
    if (editSection === 'scope') {
      onUpdateProject(focusedProject.id, {
        scopeSize: draftScopeSize ? Math.max(0, Math.round(Number(draftScopeSize))) : undefined,
        scopeSummary: draftScopeSummary.trim() || undefined
      });
    }
    if (editSection === 'owners' && currentUserRole === 'admin') {
      const nextOwnerIds = Array.from(new Set(draftOwnerIds.filter(Boolean)));
      if (nextOwnerIds.length > 0) {
        const primaryOwnerId = nextOwnerIds[0];
        const nextMembers = Array.from(new Set([...(focusedProject.members || []), ...nextOwnerIds]));
        onUpdateProject(focusedProject.id, { createdBy: primaryOwnerId, ownerIds: nextOwnerIds, members: nextMembers });
      }
    }
    closeEditor();
  };

  return {
    editSection,
    draftStartDate,
    setDraftStartDate,
    draftEndDate,
    setDraftEndDate,
    draftBudget,
    setDraftBudget,
    draftHourlyRate,
    setDraftHourlyRate,
    draftScopeSize,
    setDraftScopeSize,
    draftScopeSummary,
    setDraftScopeSummary,
    ownerIds,
    ownerNames,
    draftOwnerIds,
    lifecycleMeta,
    openSectionEditor,
    closeEditor,
    saveSection,
    toggleOwner
  };
};
