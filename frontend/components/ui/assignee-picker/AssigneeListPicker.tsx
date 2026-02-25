import React from 'react';
import { Search, X } from 'lucide-react';
import { getUserFullName } from '../../../utils/userDisplay';
import { AssigneePickerShared } from './types';

interface AssigneeListPickerProps {
  shared: AssigneePickerShared;
}

const AssigneeListPicker: React.FC<AssigneeListPickerProps> = ({ shared }) => (
  <div className={`space-y-2 ${shared.disabled ? 'opacity-55' : ''}`}>
    <div className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 flex items-center gap-2">
      <Search className="w-3.5 h-3.5 text-slate-400" />
      <input
        value={shared.query}
        onChange={(event) => shared.setQuery(event.target.value)}
        disabled={shared.disabled}
        placeholder={shared.placeholder}
        className="w-full bg-transparent text-xs text-slate-700 placeholder:text-slate-400 outline-none"
      />
    </div>

    <div className="flex items-center justify-between text-[11px]">
      <span className="text-slate-500">{shared.selectedIds.length} selected</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={shared.selectFiltered} disabled={shared.disabled} className="text-slate-600 hover:text-slate-900 disabled:opacity-40">
          Add shown
        </button>
        <button type="button" onClick={shared.clearAll} disabled={shared.disabled} className="text-slate-600 hover:text-slate-900 disabled:opacity-40">
          Clear
        </button>
      </div>
    </div>

    <div className={shared.compact ? 'min-h-8 max-h-[56px] rounded-md border border-slate-200 bg-white p-1.5 overflow-y-auto custom-scrollbar' : 'min-h-8 flex flex-wrap gap-1.5'}>
      {shared.selectedUsers.length === 0 ? (
        shared.compact ? <div className="h-full inline-flex items-center text-[11px] text-slate-400 px-1">No assignees selected</div> : null
      ) : (
        <div className={shared.compact ? 'flex flex-wrap gap-1.5' : 'contents'}>
          {shared.selectedUsers.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => shared.toggle(user.id)}
              title={getUserFullName(user)}
              aria-label={getUserFullName(user)}
              className="h-6 px-2 rounded-md border border-slate-200 bg-slate-50 text-[11px] text-slate-700 inline-flex items-center gap-1"
            >
              <span title={getUserFullName(user)} className="truncate max-w-[120px]">{user.displayName}</span>
              <X className="w-3 h-3 text-slate-500" />
            </button>
          ))}
        </div>
      )}
    </div>

    <div className={`rounded-lg border border-slate-200 bg-white p-1.5 overflow-y-auto custom-scrollbar ${shared.compact ? 'max-h-[92px]' : 'max-h-[164px]'}`}>
      {shared.filteredUsers.length === 0 ? (
        <div className="h-12 flex items-center justify-center text-xs text-slate-500">No members found</div>
      ) : (
        <div className="space-y-1">
          {shared.filteredUsers.map((user) => {
            const isSelected = shared.selectedIds.includes(user.id);
            return (
              <button
                key={user.id}
                type="button"
                onClick={() => shared.toggle(user.id)}
                title={getUserFullName(user)}
                aria-label={getUserFullName(user)}
                className={`w-full h-8 px-2 rounded-md text-xs flex items-center justify-between transition-colors ${
                  isSelected ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="truncate">{user.displayName}</span>
                <span className={`text-[10px] ${isSelected ? 'text-indigo-700' : 'text-slate-500'}`}>
                  {isSelected ? 'Selected' : user.role || 'member'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  </div>
);

export default AssigneeListPicker;
