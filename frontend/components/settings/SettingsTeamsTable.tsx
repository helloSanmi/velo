import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import AppSelect from '../ui/AppSelect';
import { Team, User } from '../../types';

interface SettingsTeamsTableProps {
  teams: Team[];
  orgUsers: User[];
  canManageTeams: boolean;
  editingTeamId: string | null;
  editingName: string;
  editingDescription: string;
  editingLeadId: string;
  editingMembers: string[];
  onEditingNameChange: (value: string) => void;
  onEditingDescriptionChange: (value: string) => void;
  onEditingLeadChange: (value: string) => void;
  onToggleEditingMember: (memberId: string) => void;
  onStartEdit: (team: Team) => void;
  onSaveEdit: () => void;
  onRemoveTeam: (team: Team) => void;
}

const SettingsTeamsTable: React.FC<SettingsTeamsTableProps> = ({
  teams,
  orgUsers,
  canManageTeams,
  editingTeamId,
  editingName,
  editingDescription,
  editingLeadId,
  editingMembers,
  onEditingNameChange,
  onEditingDescriptionChange,
  onEditingLeadChange,
  onToggleEditingMember,
  onStartEdit,
  onSaveEdit,
  onRemoveTeam
}) => (
  <div className="max-h-[46vh] overflow-x-auto overflow-y-auto rounded-lg border border-slate-200/90">
    <table className="w-full min-w-[560px] text-left text-sm md:min-w-[700px]">
      <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wide text-slate-500">
        <tr>
          <th className="px-3 py-2">Team Name</th>
          <th className="px-3 py-2">Description</th>
          <th className="px-3 py-2">Team Lead</th>
          <th className="px-3 py-2">Members</th>
          <th className="px-3 py-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        {teams.map((team) => {
          const isEditing = editingTeamId === team.id;
          const teamLead = orgUsers.find((member) => member.id === team.leadId);
          return (
            <tr key={team.id} className="border-t border-slate-200/80 align-top">
              <td className="px-3 py-2.5">
                {isEditing ? <input value={editingName} onChange={(e) => onEditingNameChange(e.target.value)} className="h-8 w-full rounded-md border border-slate-300 px-2 text-sm outline-none" /> : <span className="font-medium text-slate-900">{team.name}</span>}
              </td>
              <td className="px-3 py-2.5">
                {isEditing ? <input value={editingDescription} onChange={(e) => onEditingDescriptionChange(e.target.value)} className="h-8 w-full rounded-md border border-slate-300 px-2 text-sm outline-none" /> : <span className="text-slate-700">{team.description || '-'}</span>}
              </td>
              <td className="px-3 py-2.5">
                {isEditing ? (
                  <AppSelect
                    value={editingLeadId}
                    onChange={onEditingLeadChange}
                    className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs"
                    options={[
                      { value: '', label: 'Select lead' },
                      ...orgUsers.map((member) => ({ value: member.id, label: member.displayName }))
                    ]}
                  />
                ) : (
                  <span>{teamLead?.displayName || 'Unassigned'}</span>
                )}
              </td>
              <td className="px-3 py-2.5">
                {isEditing ? (
                  <div className="grid max-h-20 grid-cols-2 gap-1 overflow-y-auto custom-scrollbar">
                    {orgUsers.map((member) => (
                      <label key={member.id} className="inline-flex h-7 items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 text-[11px]">
                        <input type="checkbox" checked={editingMembers.includes(member.id)} onChange={() => onToggleEditingMember(member.id)} />
                        <span className="truncate">{member.displayName}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <span>{team.memberIds.length} members</span>
                )}
              </td>
              <td className="px-3 py-2.5">
                {canManageTeams ? (
                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <Button size="sm" onClick={onSaveEdit}>Save</Button>
                    ) : (
                      <button onClick={() => onStartEdit(team)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"><Pencil className="h-4 w-4" /></button>
                    )}
                    <button onClick={() => onRemoveTeam(team)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ) : <span className="text-xs text-slate-400">Read only</span>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

export default SettingsTeamsTable;
