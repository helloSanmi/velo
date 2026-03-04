import { useEffect, useMemo, useState } from 'react';
import { IntakeTicketPriority, IntakeTicketStatus, Project, User } from '../../../types';
import { getProjectOwnerIds } from '../../../services/accessPolicyService';
import { STATUS_OPTIONS } from '../ticketConstants';

interface UseTicketDraftArgs {
  currentUser: User;
  activeProjects: Project[];
  allUsers: User[];
}

export const useTicketDraft = ({ currentUser, activeProjects, allUsers }: UseTicketDraftArgs) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftStatus, setDraftStatus] = useState<IntakeTicketStatus>('new');
  const [draftPriority, setDraftPriority] = useState<IntakeTicketPriority>('medium');
  const [draftProjectId, setDraftProjectId] = useState<string>('none');
  const [draftAssigneeId, setDraftAssigneeId] = useState<string>('auto');
  const [draftTags, setDraftTags] = useState('');

  const createProjectOptions = useMemo(
    () => [{ value: 'none', label: 'No linked project' }, ...activeProjects.map((project) => ({ value: project.id, label: project.name }))],
    [activeProjects]
  );

  const projectOptions = useMemo(
    () => [{ value: 'all', label: 'All projects' }, ...activeProjects.map((project) => ({ value: project.id, label: project.name }))],
    [activeProjects]
  );

  const assigneeOptions = useMemo(
    () => [{ value: 'none', label: 'Unassigned' }, ...allUsers.map((user) => ({ value: user.id, label: user.displayName }))],
    [allUsers]
  );

  const createAssigneeOptions = useMemo(
    () => [
      { value: 'auto', label: 'Auto assign (policy)' },
      { value: 'none', label: 'Unassigned' },
      ...allUsers.map((user) => ({ value: user.id, label: user.displayName }))
    ],
    [allUsers]
  );

  const createStatusOptions = useMemo(() => STATUS_OPTIONS.filter((option) => option.value !== 'converted'), []);

  const draftProject = useMemo(
    () => (draftProjectId === 'none' ? null : activeProjects.find((project) => project.id === draftProjectId) || null),
    [activeProjects, draftProjectId]
  );

  const canManageDraftTriageFields = useMemo(() => {
    if (currentUser.role === 'admin') return true;
    if (!draftProject) return false;
    return getProjectOwnerIds(draftProject).includes(currentUser.id);
  }, [currentUser.id, currentUser.role, draftProject]);

  useEffect(() => {
    if (canManageDraftTriageFields) return;
    if (draftStatus !== 'new') setDraftStatus('new');
    if (draftAssigneeId !== 'auto') setDraftAssigneeId('auto');
  }, [canManageDraftTriageFields, draftAssigneeId, draftStatus]);

  const resetDraft = () => {
    setDraftTitle('');
    setDraftDescription('');
    setDraftStatus('new');
    setDraftPriority('medium');
    setDraftProjectId('none');
    setDraftAssigneeId('auto');
    setDraftTags('');
  };

  return {
    isCreateModalOpen,
    setIsCreateModalOpen,
    draftTitle,
    setDraftTitle,
    draftDescription,
    setDraftDescription,
    draftStatus,
    setDraftStatus,
    draftPriority,
    setDraftPriority,
    draftProjectId,
    setDraftProjectId,
    draftAssigneeId,
    setDraftAssigneeId,
    draftTags,
    setDraftTags,
    createProjectOptions,
    projectOptions,
    assigneeOptions,
    createAssigneeOptions,
    createStatusOptions,
    canManageDraftTriageFields,
    resetDraft
  };
};
