import React from 'react';
import { Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import { Project, SecurityGroup, User } from '../../types';

interface SettingsGroupCardProps {
  group: SecurityGroup;
  groupProject?: Project;
  orgUsers: User[];
  editable: boolean;
  isEditing: boolean;
  editingName: string;
  editingMembers: string[];
  onEditingNameChange: (value: string) => void;
  onToggleEditingMember: (memberId: string) => void;
  onStartEdit: (group: SecurityGroup) => void;
  onSave: () => void;
  onRemove: (group: SecurityGroup) => void;
}

const SettingsGroupCard: React.FC<SettingsGroupCardProps> = ({
  group, groupProject, orgUsers, editable, isEditing, editingName, editingMembers, onEditingNameChange, onToggleEditingMember, onStartEdit, onSave, onRemove
}) => {
  const memberNames = (isEditing ? editingMembers : group.memberIds)
    .map((id) => orgUsers.find((candidate) => candidate.id === id)?.displayName)
    .filter(Boolean) as string[];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {isEditing ? <input value={editingName} onChange={(event) => onEditingNameChange(event.target.value)} className="h-8 w-full rounded-md border border-slate-300 px-2 text-sm outline-none" /> : <p className="truncate text-sm font-semibold text-slate-900">{group.name}</p>}
          <p className="mt-0.5 text-[11px] text-slate-500">{group.scope === 'global' ? 'Global access group' : `Project access group${groupProject ? ` • ${groupProject.name}` : ''}`}</p>
        </div>
        {editable ? (
          <div className="flex items-center gap-1.5">
            {isEditing ? <Button size="sm" onClick={onSave}>Save</Button> : <Button size="sm" variant="outline" onClick={() => onStartEdit(group)}>Edit</Button>}
            <button onClick={() => onRemove(group)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600" title="Delete group">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
      {isEditing ? (
        <div className="custom-scrollbar mt-2 grid max-h-24 grid-cols-2 gap-2 overflow-y-auto">
          {orgUsers.map((member) => (
            <label key={member.id} className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700">
              <input type="checkbox" checked={editingMembers.includes(member.id)} onChange={() => onToggleEditingMember(member.id)} />
              <span className="truncate">{member.displayName}</span>
            </label>
          ))}
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1">
          {memberNames.slice(0, 5).map((name) => <span key={name} className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700">{name}</span>)}
          {memberNames.length > 5 ? <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700">+{memberNames.length - 5}</span> : null}
        </div>
      )}
    </div>
  );
};

export default SettingsGroupCard;
