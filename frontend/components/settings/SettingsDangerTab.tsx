import React, { useMemo, useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Organization, User } from '../../types';

interface SettingsDangerTabProps {
  user: User;
  org: Organization | null;
  onDeleteOrganization: () => Promise<void>;
}

const SettingsDangerTab: React.FC<SettingsDangerTabProps> = ({ user, org, onDeleteOrganization }) => {
  const [orgNameConfirm, setOrgNameConfirm] = useState('');
  const [keywordConfirm, setKeywordConfirm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = useMemo(() => {
    if (!org) return false;
    if (user.role !== 'admin') return false;
    return orgNameConfirm.trim() === org.name && keywordConfirm.trim().toUpperCase() === 'DELETE';
  }, [keywordConfirm, org, orgNameConfirm, user.role]);

  const handleDelete = async () => {
    if (!canDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDeleteOrganization();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-3xl space-y-3">
      <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3">
        <div className="flex items-start gap-2.5">
          <div className="rounded-md bg-rose-100 p-1.5 text-rose-700">
            <AlertTriangle className="h-3.5 w-3.5" />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-rose-800">
              Permanently deletes this workspace and all associated records.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
          <p>
            This removes projects, tasks, users, teams, groups, invites, chat history, and analytics snapshots.
          </p>
          <p className="mt-1">
            Confirm by typing the workspace name and <span className="font-semibold text-slate-800">DELETE</span>.
          </p>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Workspace name</span>
            <input
              value={orgNameConfirm}
              onChange={(event) => setOrgNameConfirm(event.target.value)}
              placeholder={org?.name || 'Workspace name'}
              className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Confirmation</span>
            <input
              value={keywordConfirm}
              onChange={(event) => setKeywordConfirm(event.target.value)}
              placeholder="DELETE"
              className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm uppercase tracking-wide text-slate-900 outline-none focus:border-slate-400"
            />
          </label>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[11px] text-slate-600">
            {canDelete
              ? 'Ready to delete workspace'
              : 'Enter exact workspace name and DELETE to enable action'}
          </p>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!canDelete || isDeleting}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-600 px-3 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isDeleting ? 'Deleting...' : 'Delete workspace'}
          </button>
        </div>
      </div>
    </section>
  );
};

export default SettingsDangerTab;
