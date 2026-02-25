import React, { useMemo, useState } from 'react';
import { Project, SecurityGroup, User } from '../../types';
import { groupService } from '../../services/groupService';
import { dialogService } from '../../services/dialogService';
import SettingsGlobalGroupsPanel from './SettingsGlobalGroupsPanel';
import SettingsProjectGroupsPanel from './SettingsProjectGroupsPanel';

interface SettingsGroupsTabProps {
  user: User;
  projects: Project[];
  allUsers: User[];
  groups: SecurityGroup[];
  onGroupsChanged: (groups: SecurityGroup[]) => void;
}

const getProjectOwnerId = (project?: Project) => project?.createdBy || project?.members?.[0];

const SettingsGroupsTab: React.FC<SettingsGroupsTabProps> = ({ user, projects, allUsers, groups, onGroupsChanged }) => {
  const [globalName, setGlobalName] = useState('');
  const [globalMembers, setGlobalMembers] = useState<string[]>([]);
  const [projectName, setProjectName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [projectMembers, setProjectMembers] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingMembers, setEditingMembers] = useState<string[]>([]);

  const orgProjects = useMemo(() => projects.filter((project) => project.orgId === user.orgId), [projects, user.orgId]);
  const orgUsers = useMemo(() => allUsers.filter((candidate) => candidate.orgId === user.orgId), [allUsers, user.orgId]);
  const ownedProjects = useMemo(() => (user.role === 'admin' ? orgProjects : orgProjects.filter((project) => getProjectOwnerId(project) === user.id)), [orgProjects, user.id, user.role]);
  const globalGroups = useMemo(() => groups.filter((group) => group.scope === 'global').sort((a, b) => a.name.localeCompare(b.name)), [groups]);
  const projectGroups = useMemo(() => groups.filter((group) => group.scope === 'project').sort((a, b) => a.name.localeCompare(b.name)), [groups]);

  const refresh = () => onGroupsChanged(groupService.getGroups(user.orgId));
  const toggleMember = (ids: string[], setIds: (ids: string[]) => void, memberId: string) => setIds(ids.includes(memberId) ? ids.filter((id) => id !== memberId) : [...ids, memberId]);
  const canEditGroup = (group: SecurityGroup) => group.scope === 'global' ? user.role === 'admin' : user.role === 'admin' || getProjectOwnerId(orgProjects.find((candidate) => candidate.id === group.projectId)) === user.id;

  const createGlobal = () => {
    setError('');
    const result = groupService.createGroup(user, user.orgId, { name: globalName, scope: 'global', memberIds: globalMembers }, orgProjects);
    if (result.error) return setError(result.error);
    setGlobalName(''); setGlobalMembers([]); refresh();
  };

  const createProjectGroup = () => {
    setError('');
    const result = groupService.createGroup(user, user.orgId, { name: projectName, scope: 'project', projectId, memberIds: projectMembers }, orgProjects);
    if (result.error) return setError(result.error);
    setProjectName(''); setProjectId(''); setProjectMembers([]); refresh();
  };

  const startEdit = (group: SecurityGroup) => { setEditingGroupId(group.id); setEditingName(group.name); setEditingMembers(group.memberIds); setError(''); };
  const saveEdit = () => {
    if (!editingGroupId) return;
    const result = groupService.updateGroup(user, editingGroupId, { name: editingName, memberIds: editingMembers }, orgProjects);
    if (result.error) return setError(result.error);
    setEditingGroupId(null); setEditingName(''); setEditingMembers([]); refresh();
  };
  const removeGroup = async (group: SecurityGroup) => {
    const confirmed = await dialogService.confirm(`Delete group "${group.name}"?`, { title: 'Delete group', confirmText: 'Delete', danger: true });
    if (!confirmed) return;
    const result = groupService.deleteGroup(user, group.id, orgProjects);
    if (!result.success) return setError(result.error || 'Unable to delete group.');
    refresh();
  };

  return (
    <div className="animate-in slide-in-from-bottom-2 fade-in duration-300 space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-base font-semibold text-slate-900">Security groups</h3>
        <p className="mt-1 text-xs text-slate-500">Define access scopes by member collection. Global groups are org-wide, project groups are limited to one project.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SettingsGlobalGroupsPanel
          isAdmin={user.role === 'admin'}
          orgUsers={orgUsers}
          globalGroups={globalGroups}
          globalName={globalName}
          globalMembers={globalMembers}
          editingGroupId={editingGroupId}
          editingName={editingName}
          editingMembers={editingMembers}
          onGlobalNameChange={setGlobalName}
          onToggleGlobalMember={(memberId) => toggleMember(globalMembers, setGlobalMembers, memberId)}
          onCreateGlobal={createGlobal}
          isEditable={canEditGroup}
          onStartEdit={startEdit}
          onSaveEdit={saveEdit}
          onRemove={removeGroup}
          onEditingNameChange={setEditingName}
          onToggleEditingMember={(memberId) => toggleMember(editingMembers, setEditingMembers, memberId)}
        />
        <SettingsProjectGroupsPanel
          ownedProjects={ownedProjects}
          orgUsers={orgUsers}
          orgProjects={orgProjects}
          projectGroups={projectGroups}
          projectName={projectName}
          projectId={projectId}
          projectMembers={projectMembers}
          editingGroupId={editingGroupId}
          editingName={editingName}
          editingMembers={editingMembers}
          onProjectNameChange={setProjectName}
          onProjectIdChange={setProjectId}
          onToggleProjectMember={(memberId) => toggleMember(projectMembers, setProjectMembers, memberId)}
          onCreateProjectGroup={createProjectGroup}
          isEditable={canEditGroup}
          onStartEdit={startEdit}
          onSaveEdit={saveEdit}
          onRemove={removeGroup}
          onEditingNameChange={setEditingName}
          onToggleEditingMember={(memberId) => toggleMember(editingMembers, setEditingMembers, memberId)}
        />
      </div>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
};

export default SettingsGroupsTab;
