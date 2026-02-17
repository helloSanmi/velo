import React, { useMemo, useState } from 'react';
import { FolderLock, Globe2, Plus, Trash2, Users } from 'lucide-react';
import Button from '../ui/Button';
import { Project, SecurityGroup, User } from '../../types';
import { groupService } from '../../services/groupService';
import { dialogService } from '../../services/dialogService';

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
  const ownedProjects = useMemo(() => {
    if (user.role === 'admin') return orgProjects;
    return orgProjects.filter((project) => getProjectOwnerId(project) === user.id);
  }, [orgProjects, user.id, user.role]);

  const globalGroups = useMemo(() => groups.filter((group) => group.scope === 'global').sort((a, b) => a.name.localeCompare(b.name)), [groups]);
  const projectGroups = useMemo(() => groups.filter((group) => group.scope === 'project').sort((a, b) => a.name.localeCompare(b.name)), [groups]);

  const canEditGroup = (group: SecurityGroup) => {
    if (group.scope === 'global') return user.role === 'admin';
    if (user.role === 'admin') return true;
    const project = orgProjects.find((candidate) => candidate.id === group.projectId);
    return getProjectOwnerId(project) === user.id;
  };

  const refresh = () => onGroupsChanged(groupService.getGroups(user.orgId));

  const toggleMember = (ids: string[], setIds: (ids: string[]) => void, memberId: string) => {
    setIds(ids.includes(memberId) ? ids.filter((id) => id !== memberId) : [...ids, memberId]);
  };

  const createGlobal = () => {
    setError('');
    const result = groupService.createGroup(user, user.orgId, { name: globalName, scope: 'global', memberIds: globalMembers }, orgProjects);
    if (result.error) {
      setError(result.error);
      return;
    }
    setGlobalName('');
    setGlobalMembers([]);
    refresh();
  };

  const createProjectGroup = () => {
    setError('');
    const result = groupService.createGroup(
      user,
      user.orgId,
      { name: projectName, scope: 'project', projectId, memberIds: projectMembers },
      orgProjects
    );
    if (result.error) {
      setError(result.error);
      return;
    }
    setProjectName('');
    setProjectId('');
    setProjectMembers([]);
    refresh();
  };

  const startEdit = (group: SecurityGroup) => {
    setEditingGroupId(group.id);
    setEditingName(group.name);
    setEditingMembers(group.memberIds);
    setError('');
  };

  const saveEdit = () => {
    if (!editingGroupId) return;
    const result = groupService.updateGroup(user, editingGroupId, { name: editingName, memberIds: editingMembers }, orgProjects);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditingGroupId(null);
    setEditingName('');
    setEditingMembers([]);
    refresh();
  };

  const removeGroup = async (group: SecurityGroup) => {
    const confirmed = await dialogService.confirm(`Delete group "${group.name}"?`, {
      title: 'Delete group',
      confirmText: 'Delete',
      danger: true
    });
    if (!confirmed) return;
    const result = groupService.deleteGroup(user, group.id, orgProjects);
    if (!result.success) {
      setError(result.error || 'Unable to delete group.');
      return;
    }
    refresh();
  };

  const renderGroupCard = (group: SecurityGroup) => {
    const editable = canEditGroup(group);
    const isEditing = editingGroupId === group.id;
    const groupProject = orgProjects.find((project) => project.id === group.projectId);
    const memberNames = (isEditing ? editingMembers : group.memberIds)
      .map((id) => orgUsers.find((candidate) => candidate.id === id)?.displayName)
      .filter(Boolean) as string[];

    return (
      <div key={group.id} className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <input
                value={editingName}
                onChange={(event) => setEditingName(event.target.value)}
                className="h-8 w-full rounded-md border border-slate-300 px-2 text-sm outline-none"
              />
            ) : (
              <p className="truncate text-sm font-semibold text-slate-900">{group.name}</p>
            )}
            <p className="mt-0.5 text-[11px] text-slate-500">
              {group.scope === 'global' ? 'Global access group' : `Project access group${groupProject ? ` • ${groupProject.name}` : ''}`}
            </p>
          </div>
          {editable ? (
            <div className="flex items-center gap-1.5">
              {isEditing ? (
                <Button size="sm" onClick={saveEdit}>Save</Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => startEdit(group)}>Edit</Button>
              )}
              <button
                onClick={() => removeGroup(group)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                title="Delete group"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>
        {isEditing ? (
          <div className="mt-2 grid max-h-24 grid-cols-2 gap-2 overflow-y-auto custom-scrollbar">
            {orgUsers.map((member) => (
              <label key={member.id} className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={editingMembers.includes(member.id)}
                  onChange={() => toggleMember(editingMembers, setEditingMembers, member.id)}
                />
                <span className="truncate">{member.displayName}</span>
              </label>
            ))}
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1">
            {memberNames.slice(0, 5).map((name) => (
              <span key={name} className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700">{name}</span>
            ))}
            {memberNames.length > 5 ? (
              <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700">+{memberNames.length - 5}</span>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-base font-semibold text-slate-900">Security groups</h3>
        <p className="mt-1 text-xs text-slate-500">Define access scopes by member collection. Global groups are org-wide, project groups are limited to one project.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-slate-500" />
            <p className="text-sm font-semibold text-slate-900">Global groups</p>
          </div>
          <p className="mt-1 text-xs text-slate-500">Admin-managed groups available across the org.</p>
          {user.role === 'admin' ? (
            <div className="mt-3 space-y-2">
              <input
                value={globalName}
                onChange={(event) => setGlobalName(event.target.value)}
                placeholder="Group name"
                className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none"
              />
              <div className="grid max-h-24 grid-cols-2 gap-2 overflow-y-auto custom-scrollbar">
                {orgUsers.map((member) => (
                  <label key={member.id} className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700">
                    <input type="checkbox" checked={globalMembers.includes(member.id)} onChange={() => toggleMember(globalMembers, setGlobalMembers, member.id)} />
                    <span className="truncate">{member.displayName}</span>
                  </label>
                ))}
              </div>
              <Button size="sm" onClick={createGlobal} disabled={!globalName.trim()}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Create global group
              </Button>
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-500">Only admins can create global groups.</p>
          )}

          <div className="mt-3 space-y-2">
            {globalGroups.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500">No global groups yet.</div>
            ) : globalGroups.map(renderGroupCard)}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <FolderLock className="h-4 w-4 text-slate-500" />
            <p className="text-sm font-semibold text-slate-900">Project groups</p>
          </div>
          <p className="mt-1 text-xs text-slate-500">Project-owner (or admin) managed groups for task assignment scope.</p>

          <div className="mt-3 space-y-2">
            <input
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="Group name"
              className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none"
            />
            <select
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none"
            >
              <option value="">Select project</option>
              {ownedProjects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            <div className="grid max-h-24 grid-cols-2 gap-2 overflow-y-auto custom-scrollbar">
              {orgUsers.map((member) => (
                <label key={member.id} className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700">
                  <input type="checkbox" checked={projectMembers.includes(member.id)} onChange={() => toggleMember(projectMembers, setProjectMembers, member.id)} />
                  <span className="truncate">{member.displayName}</span>
                </label>
              ))}
            </div>
            <Button size="sm" onClick={createProjectGroup} disabled={!projectName.trim() || !projectId}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Create project group
            </Button>
          </div>

          <div className="mt-3 space-y-2">
            {projectGroups.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500">No project groups yet.</div>
            ) : projectGroups.map(renderGroupCard)}
          </div>
        </div>
      </div>

      {error ? <p className="text-xs text-rose-600">{error}</p> : null}

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Groups control who can be assigned quickly and who has scoped access.</span>
      </div>
    </div>
  );
};

export default SettingsGroupsTab;
