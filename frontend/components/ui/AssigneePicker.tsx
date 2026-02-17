import React, { useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { User } from '../../types';
import { getUserFullName } from '../../utils/userDisplay';

interface AssigneePickerProps {
  users: User[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  compact?: boolean;
  dropdownUnassignedOnly?: boolean;
  showInitialsChips?: boolean;
  disabled?: boolean;
}

const AssigneePicker: React.FC<AssigneePickerProps> = ({
  users,
  selectedIds,
  onChange,
  placeholder = 'Search members',
  compact = false,
  dropdownUnassignedOnly = false,
  showInitialsChips = false,
  disabled = false
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedUsers = useMemo(
    () => users.filter((user) => selectedIds.includes(user.id)),
    [users, selectedIds]
  );

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const baseUsers =
      dropdownUnassignedOnly
        ? users.filter((user) => !selectedIds.includes(user.id))
        : users;
    if (!normalized) return baseUsers;
    return baseUsers.filter((user) => {
      const role = user.role || 'member';
      return `${user.displayName} ${user.username} ${role}`.toLowerCase().includes(normalized);
    });
  }, [users, query, dropdownUnassignedOnly, selectedIds]);

  const toggle = (userId: string) => {
    if (disabled) return;
    onChange(selectedIds.includes(userId) ? selectedIds.filter((id) => id !== userId) : [...selectedIds, userId]);
  };

  const clearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  const selectFiltered = () => {
    if (disabled) return;
    const filteredIds = filteredUsers.map((user) => user.id);
    onChange(Array.from(new Set([...selectedIds, ...filteredIds])));
  };

  const initialsFor = (name: string) =>
    name
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!wrapperRef.current?.contains(event.relatedTarget as Node)) {
      setIsOpen(false);
    }
  };

  if (compact && showInitialsChips) {
    return (
      <div ref={wrapperRef} onBlur={handleBlur} className={`space-y-2 relative ${disabled ? 'opacity-55' : ''}`}>
        <div className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            value={query}
            onFocus={() => {
              if (!disabled) setIsOpen(true);
            }}
            onChange={(event) => {
              setQuery(event.target.value);
              if (!disabled) setIsOpen(true);
            }}
            disabled={disabled}
            placeholder={placeholder}
            className="w-full bg-transparent text-xs text-slate-700 placeholder:text-slate-400 outline-none"
          />
          {selectedIds.length > 0 && (
            <button type="button" onClick={clearAll} className="text-[10px] text-slate-500 hover:text-slate-700 shrink-0">
              Clear
            </button>
          )}
        </div>

        <div className="min-h-8 rounded-md border border-slate-200 bg-white p-1.5 flex flex-wrap gap-1.5">
          {selectedUsers.length === 0 ? (
            <span className="text-[11px] text-slate-400 px-1">No assignees selected</span>
          ) : (
            selectedUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => toggle(user.id)}
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

        {isOpen && !disabled && (
          <div className="absolute left-0 right-0 top-[78px] z-30 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg max-h-[160px] overflow-y-auto custom-scrollbar">
            {filteredUsers.length === 0 ? (
              <div className="h-12 flex items-center justify-center text-xs text-slate-500">No unassigned members found</div>
            ) : (
              <div className="space-y-1">
                {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => toggle(user.id)}
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
  }

  return (
    <div className={`space-y-2 ${disabled ? 'opacity-55' : ''}`}>
      <div className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 flex items-center gap-2">
        <Search className="w-3.5 h-3.5 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full bg-transparent text-xs text-slate-700 placeholder:text-slate-400 outline-none"
        />
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-500">{selectedIds.length} selected</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={selectFiltered} disabled={disabled} className="text-slate-600 hover:text-slate-900 disabled:opacity-40">
            Add shown
          </button>
          <button type="button" onClick={clearAll} disabled={disabled} className="text-slate-600 hover:text-slate-900 disabled:opacity-40">
            Clear
          </button>
        </div>
      </div>

      <div className={compact ? 'min-h-8 max-h-[56px] rounded-md border border-slate-200 bg-white p-1.5 overflow-y-auto custom-scrollbar' : 'min-h-8 flex flex-wrap gap-1.5'}>
        {selectedUsers.length === 0 ? (
          compact ? (
            <div className="h-full inline-flex items-center text-[11px] text-slate-400 px-1">No assignees selected</div>
          ) : null
        ) : (
          <div className={compact ? 'flex flex-wrap gap-1.5' : 'contents'}>
            {selectedUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => toggle(user.id)}
                title={getUserFullName(user)}
                aria-label={getUserFullName(user)}
                className="h-6 px-2 rounded-md border border-slate-200 bg-slate-50 text-[11px] text-slate-700 inline-flex items-center gap-1"
              >
                <span title={getUserFullName(user)} className="truncate max-w-[120px]">
                  {user.displayName}
                </span>
                <X className="w-3 h-3 text-slate-500" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={`rounded-lg border border-slate-200 bg-white p-1.5 overflow-y-auto custom-scrollbar ${compact ? 'max-h-[92px]' : 'max-h-[164px]'}`}>
        {filteredUsers.length === 0 ? (
          <div className="h-12 flex items-center justify-center text-xs text-slate-500">No members found</div>
        ) : (
          <div className="space-y-1">
            {filteredUsers.map((user) => {
              const isSelected = selectedIds.includes(user.id);
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggle(user.id)}
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
};

export default AssigneePicker;
