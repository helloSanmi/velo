import React from 'react';
import { Globe2, Plus } from 'lucide-react';
import Button from '../ui/Button';
import { SecurityGroup, User } from '../../types';
import SettingsGroupCard from './SettingsGroupCard';

interface SettingsGlobalGroupsPanelProps {
  isAdmin: boolean;
  orgUsers: User[];
  globalGroups: SecurityGroup[];
  globalName: string;
  globalMembers: string[];
  editingGroupId: string | null;
  editingName: string;
  editingMembers: string[];
  onGlobalNameChange: (value: string) => void;
  onToggleGlobalMember: (memberId: string) => void;
  onCreateGlobal: () => void;
  isEditable: (group: SecurityGroup) => boolean;
  onStartEdit: (group: SecurityGroup) => void;
  onSaveEdit: () => void;
  onRemove: (group: SecurityGroup) => void;
  onEditingNameChange: (value: string) => void;
  onToggleEditingMember: (memberId: string) => void;
}

const SettingsGlobalGroupsPanel: React.FC<SettingsGlobalGroupsPanelProps> = (props) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4">
    <div className="flex items-center gap-2">
      <Globe2 className="h-4 w-4 text-slate-500" />
      <p className="text-sm font-semibold text-slate-900">Global groups</p>
    </div>
    <p className="mt-1 text-xs text-slate-500">Admin-managed groups available across the org.</p>
    {props.isAdmin ? (
      <div className="mt-3 space-y-2">
        <input value={props.globalName} onChange={(event) => props.onGlobalNameChange(event.target.value)} placeholder="Group name" className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none" />
        <div className="custom-scrollbar grid max-h-24 grid-cols-2 gap-2 overflow-y-auto">
          {props.orgUsers.map((member) => (
            <label key={member.id} className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700">
              <input type="checkbox" checked={props.globalMembers.includes(member.id)} onChange={() => props.onToggleGlobalMember(member.id)} />
              <span className="truncate">{member.displayName}</span>
            </label>
          ))}
        </div>
        <Button size="sm" onClick={props.onCreateGlobal} disabled={!props.globalName.trim()}><Plus className="mr-1.5 h-3.5 w-3.5" /> Create global group</Button>
      </div>
    ) : <p className="mt-3 text-xs text-slate-500">Only admins can create global groups.</p>}
    <div className="mt-3 space-y-2">
      {props.globalGroups.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500">No global groups yet.</div> : props.globalGroups.map((group) => (
        <SettingsGroupCard
          key={group.id}
          group={group}
          orgUsers={props.orgUsers}
          editable={props.isEditable(group)}
          isEditing={props.editingGroupId === group.id}
          editingName={props.editingName}
          editingMembers={props.editingMembers}
          onEditingNameChange={props.onEditingNameChange}
          onToggleEditingMember={props.onToggleEditingMember}
          onStartEdit={props.onStartEdit}
          onSave={props.onSaveEdit}
          onRemove={props.onRemove}
        />
      ))}
    </div>
  </div>
);

export default SettingsGlobalGroupsPanel;
