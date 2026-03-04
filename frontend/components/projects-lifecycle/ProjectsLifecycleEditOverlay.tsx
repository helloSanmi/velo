import React from 'react';
import { X } from 'lucide-react';
import { User } from '../../types';
import DateInputField from '../ui/DateInputField';
import { EditSection } from './projectsLifecycle.types';

interface ProjectsLifecycleEditOverlayProps {
  editSection: EditSection;
  currentUserRole?: 'admin' | 'member' | 'guest';
  focusedProjectOrgId: string;
  allUsers: User[];
  draftStartDate: string;
  setDraftStartDate: (value: string) => void;
  draftEndDate: string;
  setDraftEndDate: (value: string) => void;
  draftBudget: string;
  setDraftBudget: (value: string) => void;
  draftHourlyRate: string;
  setDraftHourlyRate: (value: string) => void;
  draftScopeSize: string;
  setDraftScopeSize: (value: string) => void;
  draftScopeSummary: string;
  setDraftScopeSummary: (value: string) => void;
  draftOwnerIds: string[];
  onToggleOwner: (userId: string) => void;
  onCloseEditor: () => void;
  onSaveSection: () => void;
}

const ProjectsLifecycleEditOverlay: React.FC<ProjectsLifecycleEditOverlayProps> = ({
  editSection,
  currentUserRole,
  focusedProjectOrgId,
  allUsers,
  draftStartDate,
  setDraftStartDate,
  draftEndDate,
  setDraftEndDate,
  draftBudget,
  setDraftBudget,
  draftHourlyRate,
  setDraftHourlyRate,
  draftScopeSize,
  setDraftScopeSize,
  draftScopeSummary,
  setDraftScopeSummary,
  draftOwnerIds,
  onToggleOwner,
  onCloseEditor,
  onSaveSection
}) => {
  if (!editSection) return null;

  return (
    <div className="absolute inset-0 bg-white/90 backdrop-blur-[1px] p-4 rounded-xl z-10">
      <div className="h-full border border-slate-200 rounded-xl bg-white p-4 flex flex-col">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900 capitalize">Edit {editSection}</p>
          <button onClick={onCloseEditor} className="w-7 h-7 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50">
            <X className="w-3.5 h-3.5 m-auto" />
          </button>
        </div>

        <div className="mt-3 flex-1 overflow-y-auto space-y-3">
          {editSection === 'timeline' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <label className="text-xs text-slate-600">
                Start date
                <DateInputField value={draftStartDate} onChange={setDraftStartDate} compact className="mt-1" />
              </label>
              <label className="text-xs text-slate-600">
                End date
                <DateInputField value={draftEndDate} onChange={setDraftEndDate} compact className="mt-1" />
              </label>
            </div>
          ) : null}

          {editSection === 'budget' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <label className="text-xs text-slate-600 block">
                Budget (USD)
                <input type="number" min={0} value={draftBudget} onChange={(event) => setDraftBudget(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-xs" />
              </label>
              <label className="text-xs text-slate-600 block">
                Hourly rate ($/h)
                <input type="number" min={0} step={0.01} value={draftHourlyRate} onChange={(event) => setDraftHourlyRate(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-xs" />
              </label>
            </div>
          ) : null}

          {editSection === 'scope' ? (
            <>
              <label className="text-xs text-slate-600 block">
                Scope size (tasks)
                <input type="number" min={0} value={draftScopeSize} onChange={(event) => setDraftScopeSize(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-xs" />
              </label>
              <label className="text-xs text-slate-600 block">
                Scope summary
                <textarea value={draftScopeSummary} onChange={(event) => setDraftScopeSummary(event.target.value)} rows={4} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-xs" />
              </label>
            </>
          ) : null}

          {editSection === 'owners' && currentUserRole === 'admin' ? (
            <div className="space-y-2">
              <p className="text-xs text-slate-600">Select one or more project owners</p>
              <div className="max-h-48 overflow-y-auto rounded-md border border-slate-200 divide-y divide-slate-100">
                {allUsers
                  .filter((user) => user.orgId === focusedProjectOrgId)
                  .map((user) => (
                    <label key={user.id} className="flex items-center justify-between gap-2 px-2 py-2 text-xs">
                      <span className="text-slate-700">{user.displayName}</span>
                      <input type="checkbox" checked={draftOwnerIds.includes(user.id)} onChange={() => onToggleOwner(user.id)} />
                    </label>
                  ))}
              </div>
              <p className="text-[11px] text-slate-500">First selected owner becomes primary owner.</p>
            </div>
          ) : null}
        </div>

        <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
          <button onClick={onCloseEditor} className="h-8 px-3 rounded-md border border-slate-200 text-xs text-slate-700">Cancel</button>
          <button onClick={onSaveSection} className="h-8 px-3 rounded-md bg-slate-900 text-xs text-white">Save</button>
        </div>
      </div>
    </div>
  );
};

export default ProjectsLifecycleEditOverlay;
