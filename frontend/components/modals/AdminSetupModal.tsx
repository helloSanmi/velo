import React, { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Plus, Users } from 'lucide-react';
import Button from '../ui/Button';
import { SecurityGroup, Team, User } from '../../types';
import { teamService } from '../../services/teamService';
import { groupService } from '../../services/groupService';

interface AdminSetupModalProps {
  isOpen: boolean;
  user: User;
  allUsers: User[];
  teams: Team[];
  groups: SecurityGroup[];
  onTeamsChanged: (teams: Team[]) => void;
  onOpenSettingsTab: (tab: 'teams' | 'licenses') => void;
  onClose: () => void;
  onComplete: () => void;
  onGroupsChanged: (groups: SecurityGroup[]) => void;
}

const AdminSetupModal: React.FC<AdminSetupModalProps> = ({
  isOpen,
  user,
  allUsers,
  teams,
  groups,
  onTeamsChanged,
  onGroupsChanged,
  onOpenSettingsTab,
  onClose,
  onComplete
}) => {
  const [teamName, setTeamName] = useState('');
  const [teamLeadId, setTeamLeadId] = useState('');
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([]);

  const orgUsers = useMemo(
    () => allUsers.filter((member) => member.orgId === user.orgId),
    [allUsers, user.orgId]
  );
  const hasTeam = teams.length > 0;
  const hasGroup = groups.length > 0;

  if (!isOpen || user.role !== 'admin') return null;

  const toggleMember = (memberId: string) => {
    setTeamMemberIds((prev) => (prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]));
  };

  const createFirstTeam = () => {
    setError('');
    const result = teamService.createTeam(user, user.orgId, {
      name: teamName,
      leadId: teamLeadId || undefined,
      memberIds: teamMemberIds
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    setTeamName('');
    setTeamLeadId('');
    setTeamMemberIds([]);
    onTeamsChanged(teamService.getTeams(user.orgId));
  };

  const createFirstGroup = () => {
    setError('');
    const result = groupService.createGroup(
      user,
      user.orgId,
      { name: groupName, scope: 'global', memberIds: groupMemberIds },
      []
    );
    if (result.error) {
      setError(result.error);
      return;
    }
    setGroupName('');
    setGroupMemberIds([]);
    onGroupsChanged(groupService.getGroups(user.orgId));
  };

  return (
    <div
      className="fixed inset-0 z-[130] bg-slate-900/50 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl rounded-none md:rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden h-[100dvh] md:h-auto md:max-h-[88vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Admin setup</p>
          <h3 className="text-xl font-semibold text-slate-900 mt-1">Configure your workspace foundation</h3>
          <p className="text-sm text-slate-600 mt-1">Set up teams first, then groups and member access.</p>
        </div>

        <div className="p-4 md:p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`rounded-lg border px-3 py-2 ${hasTeam ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
              <p className="text-[11px] text-slate-500">Teams</p>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">{teams.length} configured</p>
            </div>
            <div className={`rounded-lg border px-3 py-2 ${hasGroup ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
              <p className="text-[11px] text-slate-500">Security groups</p>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">{groups.length} configured</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[11px] text-slate-500">Members</p>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">{orgUsers.length} in workspace</p>
            </div>
          </div>

          {!hasTeam ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2.5">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Step 1 (required): create first team</p>
              <input
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                placeholder="Team name"
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 bg-white"
              />
              <select
                value={teamLeadId}
                onChange={(event) => setTeamLeadId(event.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 bg-white"
              >
                <option value="">Select team lead</option>
                {orgUsers.map((member) => (
                  <option key={member.id} value={member.id}>{member.displayName}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto custom-scrollbar">
                {orgUsers.map((member) => (
                  <label key={member.id} className="h-8 rounded-md border border-slate-200 bg-white px-2 inline-flex items-center gap-2 text-xs text-slate-700">
                    <input type="checkbox" checked={teamMemberIds.includes(member.id)} onChange={() => toggleMember(member.id)} />
                    <span className="truncate">{member.displayName}</span>
                  </label>
                ))}
              </div>
              <Button size="sm" onClick={createFirstTeam} disabled={!teamName.trim()}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Create team
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 flex items-center gap-2 text-sm text-emerald-800">
              <CheckCircle2 className="w-4 h-4" />
              At least one team exists. You can continue.
            </div>
          )}

          {!hasGroup ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2.5">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Step 2 (required): create first security group</p>
              <input
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="Security group name"
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 bg-white"
              />
              <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto custom-scrollbar">
                {orgUsers.map((member) => (
                  <label key={member.id} className="h-8 rounded-md border border-slate-200 bg-white px-2 inline-flex items-center gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={groupMemberIds.includes(member.id)}
                      onChange={() => setGroupMemberIds((prev) => (prev.includes(member.id) ? prev.filter((id) => id !== member.id) : [...prev, member.id]))}
                    />
                    <span className="truncate">{member.displayName}</span>
                  </label>
                ))}
              </div>
              <Button size="sm" onClick={createFirstGroup} disabled={!groupName.trim()}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Create security group
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 flex items-center gap-2 text-sm text-emerald-800">
              <CheckCircle2 className="w-4 h-4" />
              At least one security group exists. You can continue.
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => onOpenSettingsTab('teams')}>
              <Users className="w-3.5 h-3.5 mr-1.5" /> Manage teams
            </Button>
            <Button size="sm" variant="outline" onClick={() => onOpenSettingsTab('teams')}>
              Manage access groups
            </Button>
            <Button size="sm" variant="outline" onClick={() => onOpenSettingsTab('licenses')}>
              Invite members
            </Button>
          </div>

          {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        </div>

        <div className="px-4 md:px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between gap-2 shrink-0">
          <p className="text-xs text-slate-500">Required: at least one team and one security group.</p>
          <Button onClick={onComplete} disabled={!hasTeam || !hasGroup}>
            Continue to workspace <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminSetupModal;
