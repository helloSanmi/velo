import { useState } from 'react';
import { User, TaskPriority } from '../../../types';
import { dialogService } from '../../../services/dialogService';
import { SavedBoardView, savedViewService } from '../../../services/savedViewService';
import { toastService } from '../../../services/toastService';

interface UseSavedBoardViewsOptions {
  currentUser: User;
  searchQuery: string;
  projectFilter: string | 'All';
  statusFilter: string | 'All';
  priorityFilter: TaskPriority | 'All';
  tagFilter: string | 'All';
  assigneeFilter: string | 'All';
  dueFrom?: number;
  dueTo?: number;
  setSearchQuery: (value: string) => void;
  setProjectFilter: (value: string | 'All') => void;
  setStatusFilter: (status: string | 'All') => void;
  setPriorityFilter: (priority: TaskPriority | 'All') => void;
  setTagFilter: (tag: string) => void;
  setAssigneeFilter: (assignee: string) => void;
  setDueFrom: (value?: number) => void;
  setDueTo: (value?: number) => void;
}

export const useSavedBoardViews = ({
  currentUser,
  searchQuery,
  projectFilter,
  statusFilter,
  priorityFilter,
  tagFilter,
  assigneeFilter,
  dueFrom,
  dueTo,
  setSearchQuery,
  setProjectFilter,
  setStatusFilter,
  setPriorityFilter,
  setTagFilter,
  setAssigneeFilter,
  setDueFrom,
  setDueTo
}: UseSavedBoardViewsOptions) => {
  const [savedViews, setSavedViews] = useState<SavedBoardView[]>(() => savedViewService.list(currentUser.id, currentUser.orgId));
  const [appliedViewId, setAppliedViewId] = useState<string | null>(null);
  const [isSavedViewsOpen, setIsSavedViewsOpen] = useState(false);
  const [isSaveViewOpen, setIsSaveViewOpen] = useState(false);
  const [saveViewName, setSaveViewName] = useState('');

  const openSavedViews = () => setIsSavedViewsOpen(true);
  const closeSavedViews = () => setIsSavedViewsOpen(false);
  const openSaveView = () => setIsSaveViewOpen(true);
  const closeSaveView = () => {
    setIsSaveViewOpen(false);
    setSaveViewName('');
  };

  const saveCurrentView = () => {
    const trimmedName = saveViewName.trim();
    if (!trimmedName) {
      toastService.warning('Name required', 'Enter a name to save this view.');
      return;
    }

    const view = savedViewService.create({
      userId: currentUser.id,
      orgId: currentUser.orgId,
      name: trimmedName,
      searchQuery,
      projectFilter,
      statusFilter,
      priorityFilter,
      tagFilter,
      assigneeFilter,
      dueFrom,
      dueTo
    });

    setSavedViews((prev) => [view, ...prev]);
    toastService.success('View saved', `"${view.name}" created.`);
    setAppliedViewId(view.id);
    setSaveViewName('');
    setIsSaveViewOpen(false);
  };

  const applySavedView = (id: string) => {
    const view = savedViews.find((item) => item.id === id);
    if (!view) return;

    setSearchQuery(view.searchQuery);
    setProjectFilter(view.projectFilter || 'All');
    setStatusFilter(view.statusFilter);
    setPriorityFilter(view.priorityFilter);
    setTagFilter(view.tagFilter);
    setAssigneeFilter(view.assigneeFilter);
    setDueFrom(view.dueFrom);
    setDueTo(view.dueTo);
    setAppliedViewId(view.id);
  };

  const deleteAppliedView = async () => {
    if (!appliedViewId) return;

    const view = savedViews.find((item) => item.id === appliedViewId);
    if (!view) return;

    const confirmed = await dialogService.confirm(`Delete saved view "${view.name}"?`, {
      title: 'Delete view',
      confirmText: 'Delete',
      danger: true
    });
    if (!confirmed) return;

    savedViewService.remove(currentUser.id, currentUser.orgId, appliedViewId);
    setSavedViews(savedViewService.list(currentUser.id, currentUser.orgId));
    setAppliedViewId(null);
    toastService.info('View deleted', `"${view.name}" was removed.`);
  };

  const saveManagedViews = (views: SavedBoardView[]) => {
    savedViewService.replaceForUser(currentUser.id, currentUser.orgId, views);
    const nextViews = savedViewService.list(currentUser.id, currentUser.orgId);
    setSavedViews(nextViews);

    if (appliedViewId && !nextViews.some((view) => view.id === appliedViewId)) {
      setAppliedViewId(null);
    }

    toastService.success('Views updated', 'Saved views manager changes applied.');
    setIsSavedViewsOpen(false);
  };

  return {
    savedViews,
    appliedViewId,
    isSavedViewsOpen,
    openSavedViews,
    closeSavedViews,
    isSaveViewOpen,
    openSaveView,
    closeSaveView,
    saveViewName,
    setSaveViewName,
    saveCurrentView,
    applySavedView,
    deleteAppliedView,
    saveManagedViews
  };
};
