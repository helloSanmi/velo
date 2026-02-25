import React, { useMemo, useState } from 'react';
import { Building2, Plus, Search } from 'lucide-react';
import Button from '../ui/Button';
import { Project, SecurityGroup, Team, User } from '../../types';
import { teamService } from '../../services/teamService';
import { dialogService } from '../../services/dialogService';
import SettingsTeamDrawer from './SettingsTeamDrawer';
import SettingsTeamsTable from './SettingsTeamsTable';

interface SettingsTeamsTabProps {
  currentUser: User;
  allUsers: User[];
  teams: Team[];
  groups: SecurityGroup[];
  projects: Project[];
  onTeamsChanged: (teams: Team[]) => void;
  onGroupsChanged: (groups: SecurityGroup[]) => void;
}

const SettingsTeamsTab: React.FC<SettingsTeamsTabProps> = ({
  currentUser,
  allUsers,
  teams,
  groups,
  projects,
  onTeamsChanged,
  onGroupsChanged
}) => {
  const [query, setQuery] = useState('');
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [leadId, setLeadId] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [editingLeadId, setEditingLeadId] = useState('');
  const [editingMembers, setEditingMembers] = useState<string[]>([]);
  const [error, setError] = useState('');

  const orgUsers = useMemo(() => allUsers.filter((user) => user.orgId === currentUser.orgId), [allUsers, currentUser.orgId]);
  const canManageTeams = currentUser.role === 'admin';
  const sortedTeams = useMemo(() => [...teams].sort((a, b) => a.name.localeCompare(b.name)), [teams]);

  const filteredTeams = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedTeams;
    return sortedTeams.filter((team) => `${team.name} ${team.description || ''}`.toLowerCase().includes(q));
  }, [sortedTeams, query]);

  const refreshTeams = async () => onTeamsChanged(await teamService.fetchTeamsFromBackend(currentUser.orgId));

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

  const _unused = { groups, projects, onGroupsChanged };
  void _unused;

  return (
    <div className="relative space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-slate-500" />
          <h3 className="text-base font-semibold text-slate-900">Teams</h3>
        </div>
        <p className="mt-1 text-xs text-slate-500">Manage org teams, team leads, and membership.</p>

        <div className="mt-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="relative w-full sm:w-[320px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search team name or lead"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-400"
              />
            </div>
            <Button size="sm" onClick={() => setShowCreateTeam(true)} disabled={!canManageTeams}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add team
            </Button>
          </div>

          <SettingsTeamsTable
            teams={filteredTeams}
            orgUsers={orgUsers}
            canManageTeams={canManageTeams}
            editingTeamId={editingTeamId}
            editingName={editingName}
            editingDescription={editingDescription}
            editingLeadId={editingLeadId}
            editingMembers={editingMembers}
            onEditingNameChange={setEditingName}
            onEditingDescriptionChange={setEditingDescription}
            onEditingLeadChange={setEditingLeadId}
            onToggleEditingMember={(memberId) => toggleMember(editingMembers, setEditingMembers, memberId)}
            onStartEdit={startEditTeam}
            onSaveEdit={saveEditTeam}
            onRemoveTeam={removeTeam}
          />
        </div>
      </div>

      <SettingsTeamDrawer
        open={showCreateTeam}
        orgUsers={orgUsers}
        error={error}
        name={name}
        description={description}
        leadId={leadId}
        memberIds={memberIds}
        onNameChange={setName}
        onDescriptionChange={setDescription}
        onLeadChange={setLeadId}
        onToggleMember={(memberId) => toggleMember(memberIds, setMemberIds, memberId)}
        onClose={closeCreateTeam}
        onCreate={createTeam}
      />

      {error && !showCreateTeam ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
};

export default SettingsTeamsTab;
