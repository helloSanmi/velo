import React from 'react';
import { X } from 'lucide-react';
import { IntakeTicketPriority, IntakeTicketStatus, User } from '../../types';
import Button from '../ui/Button';
import AppSelect from '../ui/AppSelect';
import { PRIORITY_OPTIONS } from './ticketConstants';

interface TicketCreateModalProps {
  currentUser: User;
  busyId: string | null;
  isOpen: boolean;
  title: string;
  description: string;
  status: IntakeTicketStatus;
  priority: IntakeTicketPriority;
  projectId: string;
  assigneeId: string;
  tags: string;
  canManageDraftTriageFields: boolean;
  createStatusOptions: Array<{ value: IntakeTicketStatus; label: string }>;
  createProjectOptions: Array<{ value: string; label: string }>;
  createAssigneeOptions: Array<{ value: string; label: string }>;
  onClose: () => void;
  onCreate: () => void;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onStatusChange: (value: IntakeTicketStatus) => void;
  onPriorityChange: (value: IntakeTicketPriority) => void;
  onProjectChange: (value: string) => void;
  onAssigneeChange: (value: string) => void;
  onTagsChange: (value: string) => void;
}

const TicketCreateModal: React.FC<TicketCreateModalProps> = ({
  currentUser,
  busyId,
  isOpen,
  title,
  description,
  status,
  priority,
  projectId,
  assigneeId,
  tags,
  canManageDraftTriageFields,
  createStatusOptions,
  createProjectOptions,
  createAssigneeOptions,
  onClose,
  onCreate,
  onTitleChange,
  onDescriptionChange,
  onStatusChange,
  onPriorityChange,
  onProjectChange,
  onAssigneeChange,
  onTagsChange
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/45 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h4 className="text-base font-semibold text-slate-900">New ticket</h4>
          <button type="button" className="rounded-md p-1 text-slate-500 hover:bg-slate-100" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Title"
            className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-300"
          />
          <textarea
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="Description"
            rows={4}
            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-300"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="inline-flex h-11 w-full items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800">
              {currentUser.displayName}
            </div>
            <div className="inline-flex h-11 w-full items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800">
              {currentUser.email}
            </div>
            <AppSelect
              value={status}
              onChange={(value) => onStatusChange(value as IntakeTicketStatus)}
              options={createStatusOptions}
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm"
              disabled={!canManageDraftTriageFields}
            />
            <AppSelect
              value={priority}
              onChange={(value) => onPriorityChange(value as IntakeTicketPriority)}
              options={PRIORITY_OPTIONS}
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm"
            />
            <AppSelect
              value={projectId}
              onChange={onProjectChange}
              options={createProjectOptions}
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm"
            />
            <AppSelect
              value={assigneeId}
              onChange={onAssigneeChange}
              options={createAssigneeOptions}
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm"
              disabled={!canManageDraftTriageFields}
            />
          </div>
          {!canManageDraftTriageFields ? (
            <p className="text-xs text-slate-500">Initial status/assignee are owner-admin managed. Ticket will start as New.</p>
          ) : null}
          <input
            value={tags}
            onChange={(event) => onTagsChange(event.target.value)}
            placeholder="Tags (comma separated)"
            className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-300"
          />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <Button variant="secondary" className="h-10 px-3 text-sm" onClick={onClose}>
            Cancel
          </Button>
          <Button className="h-10 px-3 text-sm" onClick={onCreate} disabled={busyId === 'create' || !title.trim()}>
            Create ticket
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TicketCreateModal;
