import React, { useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { getUserFullName } from '../../../utils/userDisplay';
import { AssigneePickerShared } from './types';

interface AssigneeInitialsPickerProps {
  shared: AssigneePickerShared;
}

const initialsFor = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

const AssigneeInitialsPicker: React.FC<AssigneeInitialsPickerProps> = ({ shared }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!wrapperRef.current?.contains(event.relatedTarget as Node)) setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} onBlur={handleBlur} className={`space-y-2 relative ${shared.disabled ? 'opacity-55' : ''}`}>
      <div className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 flex items-center gap-2">
        <Search className="w-3.5 h-3.5 text-slate-400" />
        <input
          value={shared.query}
          onFocus={() => !shared.disabled && setIsOpen(true)}
          onChange={(event) => {
            shared.setQuery(event.target.value);
            if (!shared.disabled) setIsOpen(true);
          }}
          disabled={shared.disabled}
          placeholder={shared.placeholder}
          className="w-full bg-transparent text-xs text-slate-700 placeholder:text-slate-400 outline-none"
        />
        {shared.selectedIds.length > 0 && (
          <button type="button" onClick={shared.clearAll} className="text-[10px] text-slate-500 hover:text-slate-700 shrink-0">
            Clear
          </button>
        )}
      </div>

      <div className="min-h-8 rounded-md border border-slate-200 bg-white p-1.5 flex flex-wrap gap-1.5">
        {shared.selectedUsers.length === 0 ? (
          <span className="text-[11px] text-slate-400 px-1">No assignees selected</span>
        ) : (
          shared.selectedUsers.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => shared.toggle(user.id)}
              title={getUserFullName(user)}
              aria-label={getUserFullName(user)}
              className="relative group w-6 h-6 rounded-full border border-slate-200 bg-slate-100 text-[10px] font-semibold text-slate-700 hover:bg-slate-200 inline-flex items-center justify-center"
            >
              {initialsFor(user.displayName)}
              <span className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 text-white text-[10px] px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-[160]">
                {getUserFullName(user)}
              </span>
            </button>
          ))
        )}
      </div>

      {isOpen && !shared.disabled && (
        <div className="absolute left-0 right-0 top-[78px] z-30 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg max-h-[160px] overflow-y-auto custom-scrollbar">
          {shared.filteredUsers.length === 0 ? (
            <div className="h-12 flex items-center justify-center text-xs text-slate-500">No unassigned members found</div>
          ) : (
            <div className="space-y-1">
              {shared.filteredUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => shared.toggle(user.id)}
                  title={getUserFullName(user)}
                  aria-label={getUserFullName(user)}
                  className="w-full h-8 px-2 rounded-md text-xs flex items-center justify-between bg-slate-50 text-slate-700 hover:bg-slate-100"
                >
                  <span className="truncate">{user.displayName}</span>
                  <span className="text-[10px] text-slate-500">{user.role || 'member'}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AssigneeInitialsPicker;
