import React from 'react';
import { Pencil } from 'lucide-react';

interface ProfileIdentityCardProps {
  firstName: string;
  lastName: string;
  firstNameDraft: string;
  lastNameDraft: string;
  isEditingName: boolean;
  isSavingName: boolean;
  nameError: string;
  email: string;
  company: string;
  teamText: string;
  onFirstNameDraftChange: (value: string) => void;
  onLastNameDraftChange: (value: string) => void;
  onStartEditName: () => void;
  onCancelEditName: () => void;
  onSaveName: () => void;
}

const rowLabel = 'text-[11px] font-medium uppercase tracking-wide text-slate-500';

const ProfileIdentityCard: React.FC<ProfileIdentityCardProps> = (props) => (
  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
    <div className="grid grid-cols-1 gap-1.5 px-4 py-2.5 md:grid-cols-[130px_1fr] md:gap-3">
      <p className={rowLabel}>First name</p>
      <div className="flex min-w-0 items-center justify-between gap-2">
        {props.isEditingName ? <input value={props.firstNameDraft} onChange={(event) => props.onFirstNameDraftChange(event.target.value)} className="h-8 w-full max-w-xs rounded-md border border-slate-300 px-2 text-sm outline-none focus:ring-2 focus:ring-slate-300" /> : <p className="text-sm text-slate-900">{props.firstName}</p>}
        {!props.isEditingName ? <button type="button" onClick={props.onStartEditName} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Edit name" title="Edit name"><Pencil className="h-3.5 w-3.5" /></button> : null}
      </div>
    </div>
    <div className="grid grid-cols-1 gap-1.5 border-t border-slate-100 px-4 py-2.5 md:grid-cols-[130px_1fr] md:gap-3">
      <p className={rowLabel}>Last name</p>
      <div className="flex min-w-0 items-center justify-between gap-2">
        {props.isEditingName ? <input value={props.lastNameDraft} onChange={(event) => props.onLastNameDraftChange(event.target.value)} className="h-8 w-full max-w-xs rounded-md border border-slate-300 px-2 text-sm outline-none focus:ring-2 focus:ring-slate-300" /> : <p className="text-sm text-slate-900">{props.lastName}</p>}
        {!props.isEditingName ? <button type="button" onClick={props.onStartEditName} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Edit name" title="Edit name"><Pencil className="h-3.5 w-3.5" /></button> : null}
      </div>
    </div>
    {props.isEditingName ? (
      <div className="border-t border-slate-100 px-4 py-2">
        {props.nameError ? <p className="mb-2 text-xs text-rose-600">{props.nameError}</p> : null}
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={props.onCancelEditName} className="h-8 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={props.onSaveName} disabled={props.isSavingName} className="h-8 rounded-md border border-slate-800 bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60">{props.isSavingName ? 'Saving...' : 'Save name'}</button>
        </div>
      </div>
    ) : null}
    <div className="grid grid-cols-1 gap-1.5 border-t border-slate-100 px-4 py-2.5 md:grid-cols-[130px_1fr] md:gap-3"><p className={rowLabel}>Email</p><p className="text-sm text-slate-900">{props.email}</p></div>
    <div className="grid grid-cols-1 gap-1.5 border-t border-slate-100 px-4 py-2.5 md:grid-cols-[130px_1fr] md:gap-3"><p className={rowLabel}>Company</p><p className="text-sm text-slate-900">{props.company}</p></div>
    <div className="grid grid-cols-1 gap-1.5 border-t border-slate-100 px-4 py-2.5 md:grid-cols-[130px_1fr] md:gap-3"><p className={rowLabel}>Team</p><p className="text-sm text-slate-900">{props.teamText}</p></div>
  </div>
);

export default ProfileIdentityCard;
