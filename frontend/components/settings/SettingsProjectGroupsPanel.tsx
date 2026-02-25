import React from 'react';
import { FolderLock, Plus } from 'lucide-react';
import Button from '../ui/Button';
import AppSelect from '../ui/AppSelect';
import { Project, SecurityGroup, User } from '../../types';
import SettingsGroupCard from './SettingsGroupCard';

interface SettingsProjectGroupsPanelProps {
  ownedProjects: Project[];
  orgUsers: User[];
  orgProjects: Project[];
  projectGroups: SecurityGroup[];
  projectName: string;
  projectId: string;
  projectMembers: string[];
  editingGroupId: string | null;
  editingName: string;
  editingMembers: string[];
  onProjectNameChange: (value: string) => void;
  onProjectIdChange: (value: string) => void;
  onToggleProjectMember: (memberId: string) => void;
  onCreateProjectGroup: () => void;
  isEditable: (group: SecurityGroup) => boolean;
  onStartEdit: (group: SecurityGroup) => void;
  onSaveEdit: () => void;
  onRemove: (group: SecurityGroup) => void;
  onEditingNameChange: (value: string) => void;
  onToggleEditingMember: (memberId: string) => void;
}

const SettingsProjectGroupsPanel: React.FC<SettingsProjectGroupsPanelProps> = (props) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4">
    <div className="flex items-center gap-2">
      <FolderLock className="h-4 w-4 text-slate-500" />
      <p className="text-sm font-semibold text-slate-900">Project groups</p>
    </div>
    <p className="mt-1 text-xs text-slate-500">Project-owner (or admin) managed groups for task assignment scope.</p>
    <div className="mt-3 space-y-2">
      <input value={props.projectName} onChange={(event) => props.onProjectNameChange(event.target.value)} placeholder="Group name" className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none" />
      <AppSelect
        value={props.projectId}
        onChange={props.onProjectIdChange}
        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
        options={[
          { value: '', label: 'Select project' },
          ...props.ownedProjects.map((project) => ({ value: project.id, label: project.name }))
        ]}
      />
      <div className="custom-scrollbar grid max-h-24 grid-cols-2 gap-2 overflow-y-auto">
        {props.orgUsers.map((member) => (
          <label key={member.id} className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700">
            <input type="checkbox" checked={props.projectMembers.includes(member.id)} onChange={() => props.onToggleProjectMember(member.id)} />
            <span className="truncate">{member.displayName}</span>
          </label>
        ))}
      </div>
      <Button size="sm" onClick={props.onCreateProjectGroup} disabled={!props.projectName.trim() || !props.projectId}><Plus className="mr-1.5 h-3.5 w-3.5" /> Create project group</Button>
    </div>
    <div className="mt-3 space-y-2">
      {props.projectGroups.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500">No project groups yet.</div> : props.projectGroups.map((group) => (
        <SettingsGroupCard
          key={group.id}
          group={group}
          groupProject={props.orgProjects.find((project) => project.id === group.projectId)}
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

export default SettingsProjectGroupsPanel;
