import React, { useMemo, useState } from 'react';
import { Building2, FolderLock, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import Button from '../ui/Button';
import { Project, SecurityGroup, Team, User } from '../../types';
import { teamService } from '../../services/teamService';
import { groupService } from '../../services/groupService';
import { dialogService } from '../../services/dialogService';

interface SettingsTeamsTabProps {
  currentUser: User;
  allUsers: User[];
  teams: Team[];
  groups: SecurityGroup[];
  projects: Project[];
  onTeamsChanged: (teams: Team[]) => void;
  onGroupsChanged: (groups: SecurityGroup[]) => void;
}

const getProjectOwnerId = (project?: Project) => project?.createdBy || project?.members?.[0];

type AccessTab = 'teams' | 'groups';
type GroupDraftScope = 'global' | 'project';

const SettingsTeamsTab: React.FC<SettingsTeamsTabProps> = ({
  currentUser,
  allUsers,
  teams,
  groups,
  projects,
  onTeamsChanged,
  onGroupsChanged
}) => {
  const [activeTab, setActiveTab] = useState<AccessTab>('teams');
  const [query, setQuery] = useState('');
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [leadId, setLeadId] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [editingLeadId, setEditingLeadId] = useState('');
  const [editingMembers, setEditingMembers] = useState<string[]>([]);

  const [groupName, setGroupName] = useState('');
  const [groupScope, setGroupScope] = useState<GroupDraftScope>('global');
  const [groupProjectId, setGroupProjectId] = useState('');
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [editingGroupMembers, setEditingGroupMembers] = useState<string[]>([]);

  const [error, setError] = useState('');

  const orgUsers = useMemo(() => allUsers.filter((user) => user.orgId === currentUser.orgId), [allUsers, currentUser.orgId]);
  const orgProjects = useMemo(() => projects.filter((project) => project.orgId === currentUser.orgId), [projects, currentUser.orgId]);
  const canManageTeams = currentUser.role === 'admin';

  const ownedProjects = useMemo(() => {
    if (currentUser.role === 'admin') return orgProjects;
    return orgProjects.filter((project) => getProjectOwnerId(project) === currentUser.id);
  }, [orgProjects, currentUser.id, currentUser.role]);

  const sortedTeams = useMemo(() => [...teams].sort((a, b) => a.name.localeCompare(b.name)), [teams]);
  const sortedGroups = useMemo(() => [...groups].sort((a, b) => a.name.localeCompare(b.name)), [groups]);

  const filteredTeams = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedTeams;
    return sortedTeams.filter((team) => `${team.name} ${team.description || ''}`.toLowerCase().includes(q));
  }, [sortedTeams, query]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedGroups;
    return sortedGroups.filter((group) => `${group.name} ${group.scope}`.toLowerCase().includes(q));
  }, [sortedGroups, query]);

  const refreshTeams = async () => onTeamsChanged(await teamService.fetchTeamsFromBackend(currentUser.orgId));
  const refreshGroups = async () => onGroupsChanged(await groupService.fetchGroupsFromBackend(currentUser.orgId));

  const toggleMember = (ids: string[], setIds: (next: string[]) => void, userId: string) => {
    setIds(ids.includes(userId) ? ids.filter((id) => id !== userId) : [...ids, userId]);
  };

  const closeCreateTeam = () => {
    setShowCreateTeam(false);
    setName('');
    setDescription('');
    setLeadId('');
    setMemberIds([]);
    setError('');
  };

  const closeCreateGroup = () => {
    setShowCreateGroup(false);
    setGroupName('');
    setGroupScope('global');
    setGroupProjectId('');
    setGroupMemberIds([]);
    setError('');
  };

  const createTeam = async () => {
    if (!canManageTeams) return;
    setError('');
    const result = await teamService.createTeamRemote(currentUser, currentUser.orgId, {
      name,
      description,
      leadId: leadId || undefined,
      memberIds
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    closeCreateTeam();
    await refreshTeams();
  };

  const startEditTeam = (team: Team) => {
    setEditingTeamId(team.id);
    setEditingName(team.name);
    setEditingDescription(team.description || '');
    setEditingLeadId(team.leadId || '');
    setEditingMembers(team.memberIds || []);
    setError('');
  };

  const saveEditTeam = async () => {
    if (!editingTeamId || !canManageTeams) return;
    const result = await teamService.updateTeamRemote(currentUser, currentUser.orgId, editingTeamId, {
      name: editingName,
      description: editingDescription,
      leadId: editingLeadId || undefined,
      memberIds: editingMembers
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditingTeamId(null);
    setEditingName('');
    setEditingDescription('');
    setEditingLeadId('');
    setEditingMembers([]);
    await refreshTeams();
  };

  const removeTeam = async (team: Team) => {
    if (!canManageTeams) return;
    const confirmed = await dialogService.confirm(`Delete team "${team.name}"?`, {
      title: 'Delete team',
      confirmText: 'Delete',
      danger: true
    });
    if (!confirmed) return;
    const result = await teamService.deleteTeamRemote(currentUser, currentUser.orgId, team.id);
    if (!result.success) {
      setError(result.error || 'Unable to delete team.');
      return;
    }
    await refreshTeams();
  };

  const canEditGroup = (group: SecurityGroup) => {
    if (group.scope === 'global') return currentUser.role === 'admin';
    if (currentUser.role === 'admin') return true;
    const project = orgProjects.find((candidate) => candidate.id === group.projectId);
    return getProjectOwnerId(project) === currentUser.id;
  };

  const createGroup = async () => {
    setError('');
    const result = await groupService.createGroupRemote(
      currentUser,
      currentUser.orgId,
      {
        name: groupName,
        scope: groupScope,
        projectId: groupScope === 'project' ? groupProjectId : undefined,
        memberIds: groupMemberIds
      }
    );
    if (result.error) {
      setError(result.error);
      return;
    }
    closeCreateGroup();
    await refreshGroups();
  };

  const startEditGroup = (group: SecurityGroup) => {
    setEditingGroupId(group.id);
    setEditingGroupName(group.name);
    setEditingGroupMembers(group.memberIds || []);
    setError('');
  };

  const saveEditGroup = async () => {
    if (!editingGroupId) return;
    const result = await groupService.updateGroupRemote(currentUser, currentUser.orgId, editingGroupId, {
      name: editingGroupName,
      memberIds: editingGroupMembers
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditingGroupId(null);
    setEditingGroupName('');
    setEditingGroupMembers([]);
    await refreshGroups();
  };

  const removeGroup = async (group: SecurityGroup) => {
    const confirmed = await dialogService.confirm(`Delete group "${group.name}"?`, {
      title: 'Delete group',
      confirmText: 'Delete',
      danger: true
    });
    if (!confirmed) return;
    const result = await groupService.deleteGroupRemote(currentUser, currentUser.orgId, group.id);
    if (!result.success) {
      setError(result.error || 'Unable to delete group.');
      return;
    }
    await refreshGroups();
  };

  return (
    <div className="relative space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="grid grid-cols-2 border-b border-slate-200/80 bg-slate-50/80">
          <button
            onClick={() => setActiveTab('teams')}
            className={`h-10 text-sm font-medium ${activeTab === 'teams' ? 'bg-white text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <span className="inline-flex items-center gap-2"><Building2 className="h-4 w-4" /> Teams</span>
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`h-10 text-sm font-medium border-l border-slate-200 ${activeTab === 'groups' ? 'bg-white text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <span className="inline-flex items-center gap-2"><FolderLock className="h-4 w-4" /> Security Groups</span>
          </button>
        </div>

        <div className="p-3.5">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="relative w-full sm:w-[280px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={activeTab === 'teams' ? 'Search team name or lead' : 'Search group name or scope'}
                className="h-8 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-2.5 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-400"
              />
            </div>
            {activeTab === 'teams' ? (
              <Button size="sm" onClick={() => setShowCreateTeam(true)} disabled={!canManageTeams}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add team
              </Button>
            ) : (
              <Button size="sm" onClick={() => setShowCreateGroup(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add group
              </Button>
            )}
          </div>

          <div className="max-h-[44vh] overflow-x-auto overflow-y-auto rounded-lg border border-slate-200/90">
            {activeTab === 'teams' ? (
              <table className="w-full min-w-[560px] md:min-w-[700px] text-left text-sm">
                <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-1.5">Team Name</th>
                    <th className="px-3 py-1.5">Description</th>
                    <th className="px-3 py-1.5">Team Lead</th>
                    <th className="px-3 py-1.5">Members</th>
                    <th className="px-3 py-1.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeams.map((team) => {
                    const isEditing = editingTeamId === team.id;
                    const teamLead = orgUsers.find((member) => member.id === team.leadId);
                    return (
                      <tr key={team.id} className="border-t border-slate-200/80 align-top">
                        <td className="px-3 py-1.5">
                          {isEditing ? <input value={editingName} onChange={(e) => setEditingName(e.target.value)} className="h-8 w-full rounded-md border border-slate-300 px-2 text-sm outline-none" /> : <span className="font-medium text-slate-900">{team.name}</span>}
                        </td>
                        <td className="px-3 py-1.5">
                          {isEditing ? <input value={editingDescription} onChange={(e) => setEditingDescription(e.target.value)} className="h-8 w-full rounded-md border border-slate-300 px-2 text-sm outline-none" /> : <span className="text-slate-700">{team.description || '-'}</span>}
                        </td>
                        <td className="px-3 py-1.5">
                          {isEditing ? (
                            <select value={editingLeadId} onChange={(e) => setEditingLeadId(e.target.value)} className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs outline-none">
                              <option value="">Select lead</option>
                              {orgUsers.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}
                            </select>
                          ) : (
                            <span>{teamLead?.displayName || 'Unassigned'}</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5">
                          {isEditing ? (
                            <div className="grid max-h-20 grid-cols-2 gap-1 overflow-y-auto custom-scrollbar">
                              {orgUsers.map((member) => (
                                <label key={member.id} className="inline-flex h-7 items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 text-[11px]">
                                  <input type="checkbox" checked={editingMembers.includes(member.id)} onChange={() => toggleMember(editingMembers, setEditingMembers, member.id)} />
                                  <span className="truncate">{member.displayName}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <span>{team.memberIds.length} members</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5">
                          {canManageTeams ? (
                            <div className="flex items-center gap-1">
                              {isEditing ? (
                                <Button size="sm" onClick={saveEditTeam}>Save</Button>
                              ) : (
                                <button onClick={() => startEditTeam(team)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"><Pencil className="h-4 w-4" /></button>
                              )}
                              <button onClick={() => removeTeam(team)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          ) : <span className="text-xs text-slate-400">Read only</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <table className="w-full min-w-[560px] md:min-w-[700px] text-left text-sm">
                <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-1.5">Group Name</th>
                    <th className="px-3 py-1.5">Scope</th>
                    <th className="px-3 py-1.5">Project</th>
                    <th className="px-3 py-1.5">Members</th>
                    <th className="px-3 py-1.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.map((group) => {
                    const isEditing = editingGroupId === group.id;
                    const project = orgProjects.find((item) => item.id === group.projectId);
                    const editable = canEditGroup(group);
                    return (
                      <tr key={group.id} className="border-t border-slate-200/80 align-top">
                        <td className="px-3 py-1.5">
                          {isEditing ? <input value={editingGroupName} onChange={(e) => setEditingGroupName(e.target.value)} className="h-8 w-full rounded-md border border-slate-300 px-2 text-sm outline-none" /> : <span className="font-medium text-slate-900">{group.name}</span>}
                        </td>
                        <td className="px-3 py-1.5">{group.scope === 'global' ? 'Global' : 'Project'}</td>
                        <td className="px-3 py-1.5">{group.scope === 'project' ? (project?.name || 'Unknown') : '-'}</td>
                        <td className="px-3 py-1.5">
                          {isEditing ? (
                            <div className="grid max-h-20 grid-cols-2 gap-1 overflow-y-auto custom-scrollbar">
                              {orgUsers.map((member) => (
                                <label key={member.id} className="inline-flex h-7 items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 text-[11px]">
                                  <input type="checkbox" checked={editingGroupMembers.includes(member.id)} onChange={() => toggleMember(editingGroupMembers, setEditingGroupMembers, member.id)} />
                                  <span className="truncate">{member.displayName}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <span>{group.memberIds.length} members</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5">
                          {editable ? (
                            <div className="flex items-center gap-1">
                              {isEditing ? (
                                <Button size="sm" onClick={saveEditGroup}>Save</Button>
                              ) : (
                                <button onClick={() => startEditGroup(group)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"><Pencil className="h-4 w-4" /></button>
                              )}
                              <button onClick={() => removeGroup(group)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          ) : <span className="text-xs text-slate-400">Read only</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {(showCreateTeam || showCreateGroup) ? (
        <div className="absolute inset-0 z-10 rounded-xl bg-slate-900/10 backdrop-blur-[1px]">
          {showCreateTeam ? (
            <aside className="ml-auto flex h-full w-full max-w-md flex-col rounded-l-xl border-l border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Add team</p>
                  <p className="text-xs text-slate-500">Create a shared organization team.</p>
                </div>
                <button type="button" onClick={closeCreateTeam} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Team name</span>
                  <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Engineering" className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none" />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Description</span>
                  <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Core product delivery" className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none" />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Team lead</span>
                  <select value={leadId} onChange={(e) => setLeadId(e.target.value)} className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none">
                    <option value="">Select lead</option>
                    {orgUsers.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}
                  </select>
                </label>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Members</span>
                  <div className="grid max-h-44 grid-cols-2 gap-2 overflow-y-auto custom-scrollbar rounded-lg border border-slate-200 p-2">
                    {orgUsers.map((member) => (
                      <label key={member.id} className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700">
                        <input type="checkbox" checked={memberIds.includes(member.id)} onChange={() => toggleMember(memberIds, setMemberIds, member.id)} />
                        <span className="truncate">{member.displayName}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p> : null}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white p-4">
                <Button type="button" size="sm" variant="outline" onClick={closeCreateTeam}>Cancel</Button>
                <Button type="button" size="sm" onClick={createTeam} disabled={!name.trim()}>Create team</Button>
              </div>
            </aside>
          ) : null}

          {showCreateGroup ? (
            <aside className="ml-auto flex h-full w-full max-w-md flex-col rounded-l-xl border-l border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Add security group</p>
                  <p className="text-xs text-slate-500">Create a reusable access group for tasks.</p>
                </div>
                <button type="button" onClick={closeCreateGroup} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Group name</span>
                  <input autoFocus value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Backend Security" className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none" />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Scope</span>
                  <select value={groupScope} onChange={(e) => setGroupScope(e.target.value as GroupDraftScope)} className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none">
                    <option value="global">Global</option>
                    <option value="project">Project</option>
                  </select>
                </label>

                {groupScope === 'project' ? (
                  <label className="block space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Project</span>
                    <select value={groupProjectId} onChange={(e) => setGroupProjectId(e.target.value)} className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none">
                      <option value="">Select project</option>
                      {ownedProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                    </select>
                  </label>
                ) : null}

                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Members</span>
                  <div className="grid max-h-44 grid-cols-2 gap-2 overflow-y-auto custom-scrollbar rounded-lg border border-slate-200 p-2">
                    {orgUsers.map((member) => (
                      <label key={member.id} className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700">
                        <input type="checkbox" checked={groupMemberIds.includes(member.id)} onChange={() => toggleMember(groupMemberIds, setGroupMemberIds, member.id)} />
                        <span className="truncate">{member.displayName}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p> : null}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white p-4">
                <Button type="button" size="sm" variant="outline" onClick={closeCreateGroup}>Cancel</Button>
                <Button type="button" size="sm" onClick={createGroup} disabled={!groupName.trim() || (groupScope === 'project' && !groupProjectId)}>Create group</Button>
              </div>
            </aside>
          ) : null}
        </div>
      ) : null}

      {error && !(showCreateTeam || showCreateGroup) ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
};

export default SettingsTeamsTab;
