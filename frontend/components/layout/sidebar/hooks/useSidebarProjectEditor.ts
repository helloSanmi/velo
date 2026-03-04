import { useState } from 'react';
import { Project, User } from '../../../../types';
import { toastService } from '../../../../services/toastService';

const formatDateInput = (value?: number) => {
  if (!value) return '';
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

interface UseSidebarProjectEditorParams {
  projects: Project[];
  currentUser: User;
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
  closeProjectMenu: () => void;
}

export const useSidebarProjectEditor = ({
  projects,
  currentUser,
  onUpdateProject,
  closeProjectMenu
}: UseSidebarProjectEditorParams) => {
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('bg-indigo-600');
  const [editOwnerId, setEditOwnerId] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editBudgetCost, setEditBudgetCost] = useState('');
  const [editHourlyRate, setEditHourlyRate] = useState('');
  const [editScopeSize, setEditScopeSize] = useState('');
  const [editScopeSummary, setEditScopeSummary] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(false);

  const editingProject = projects.find((project) => project.id === editingProjectId) || null;

  const openEditProject = (project: Project) => {
    closeProjectMenu();
    setEditingProjectId(project.id);
    setEditName(project.name);
    setEditDescription(project.description || '');
    setEditColor(project.color || 'bg-indigo-600');
    setEditOwnerId(project.createdBy || project.members?.[0] || currentUser.id);
    setEditStartDate(formatDateInput(project.startDate));
    setEditEndDate(formatDateInput(project.endDate));
    setEditBudgetCost(project.budgetCost ? String(project.budgetCost) : '');
    setEditHourlyRate(project.hourlyRate ? String(project.hourlyRate) : '');
    setEditScopeSize(project.scopeSize ? String(project.scopeSize) : '');
    setEditScopeSummary(project.scopeSummary || '');
    setEditIsPublic(Boolean(project.isPublic));
  };

  const closeEditProject = () => {
    setEditingProjectId(null);
  };

  const saveEditProject = () => {
    if (!editingProject) return;
    const trimmedName = editName.trim();
    if (!trimmedName) {
      toastService.warning('Name required', 'Project name cannot be empty.');
      return;
    }

    const startDate = editStartDate ? new Date(`${editStartDate}T00:00:00`).getTime() : undefined;
    const endDate = editEndDate ? new Date(`${editEndDate}T00:00:00`).getTime() : undefined;
    if (startDate && endDate && endDate < startDate) {
      toastService.warning('Invalid dates', 'End date cannot be before start date.');
      return;
    }

    const updates: Partial<Project> = {
      name: trimmedName,
      description: editDescription.trim(),
      color: editColor,
      startDate,
      endDate,
      budgetCost: editBudgetCost ? Math.max(0, Number(editBudgetCost)) : undefined,
      hourlyRate: editHourlyRate ? Math.max(0, Number(editHourlyRate)) : undefined,
      scopeSize: editScopeSize ? Math.max(0, Math.round(Number(editScopeSize))) : undefined,
      scopeSummary: editScopeSummary.trim() || undefined,
      isPublic: editIsPublic
    };

    if (currentUser.role === 'admin' && editOwnerId) {
      updates.createdBy = editOwnerId;
      updates.members = editingProject.members.includes(editOwnerId)
        ? editingProject.members
        : [...editingProject.members, editOwnerId];
    }

    onUpdateProject(editingProject.id, updates);
    closeEditProject();
  };

  return {
    editingProject,
    editName,
    setEditName,
    editDescription,
    setEditDescription,
    editColor,
    setEditColor,
    editOwnerId,
    setEditOwnerId,
    editStartDate,
    setEditStartDate,
    editEndDate,
    setEditEndDate,
    editBudgetCost,
    setEditBudgetCost,
    editHourlyRate,
    setEditHourlyRate,
    editScopeSize,
    setEditScopeSize,
    editScopeSummary,
    setEditScopeSummary,
    editIsPublic,
    setEditIsPublic,
    openEditProject,
    closeEditProject,
    saveEditProject
  };
};
