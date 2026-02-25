import React from 'react';
import { X } from 'lucide-react';
import Button from '../ui/Button';
import AppSelect from '../ui/AppSelect';
import { User } from '../../types';

interface SettingsTeamDrawerProps {
  open: boolean;
  orgUsers: User[];
  error: string;
  name: string;
  description: string;
  leadId: string;
  memberIds: string[];
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onLeadChange: (value: string) => void;
  onToggleMember: (userId: string) => void;
  onClose: () => void;
  onCreate: () => void;
}

const SettingsTeamDrawer: React.FC<SettingsTeamDrawerProps> = ({
  open,
  orgUsers,
  error,
  name,
  description,
  leadId,
  memberIds,
  onNameChange,
  onDescriptionChange,
  onLeadChange,
  onToggleMember,
  onClose,
  onCreate
}) => {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-10 rounded-xl bg-slate-900/10 backdrop-blur-[1px]">
      <aside className="ml-auto flex h-full w-full max-w-md flex-col rounded-l-xl border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Add team</p>
            <p className="text-xs text-slate-500">Create a shared organization team.</p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Team name</span>
            <input autoFocus value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="Engineering" className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Description</span>
            <input value={description} onChange={(e) => onDescriptionChange(e.target.value)} placeholder="Core product delivery" className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Team lead</span>
            <AppSelect
              value={leadId}
              onChange={onLeadChange}
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              options={[
                { value: '', label: 'Select lead' },
                ...orgUsers.map((member) => ({ value: member.id, label: member.displayName }))
              ]}
            />
          </label>
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Members</span>
            <div className="grid max-h-44 grid-cols-2 gap-2 overflow-y-auto custom-scrollbar rounded-lg border border-slate-200 p-2">
              {orgUsers.map((member) => (
                <label key={member.id} className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700">
                  <input type="checkbox" checked={memberIds.includes(member.id)} onChange={() => onToggleMember(member.id)} />
                  <span className="truncate">{member.displayName}</span>
                </label>
              ))}
            </div>
          </div>
          {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p> : null}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white p-4">
          <Button type="button" size="sm" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" size="sm" onClick={onCreate} disabled={!name.trim()}>Create team</Button>
        </div>
      </aside>
    </div>
  );
};

export default SettingsTeamDrawer;
