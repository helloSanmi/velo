import React, { useMemo, useState } from 'react';
import AssigneeInitialsPicker from './assignee-picker/AssigneeInitialsPicker';
import AssigneeListPicker from './assignee-picker/AssigneeListPicker';
import { AssigneePickerProps } from './assignee-picker/types';

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

  const selectedUsers = useMemo(
    () => users.filter((user) => selectedIds.includes(user.id)),
    [users, selectedIds]
  );

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const baseUsers = dropdownUnassignedOnly ? users.filter((user) => !selectedIds.includes(user.id)) : users;
    if (!normalized) return baseUsers;
    return baseUsers.filter((user) => `${user.displayName} ${user.username} ${user.role || 'member'}`.toLowerCase().includes(normalized));
  }, [users, query, dropdownUnassignedOnly, selectedIds]);

  const toggle = (userId: string) => {
    if (disabled) return;
    onChange(selectedIds.includes(userId) ? selectedIds.filter((id) => id !== userId) : [...selectedIds, userId]);
  };

  const clearAll = () => {
    if (!disabled) onChange([]);
  };

  const selectFiltered = () => {
    if (disabled) return;
    onChange(Array.from(new Set([...selectedIds, ...filteredUsers.map((user) => user.id)])));
  };

  const shared = {
    query,
    setQuery,
    selectedUsers,
    filteredUsers,
    toggle,
    clearAll,
    selectFiltered,
    placeholder,
    compact,
    disabled,
    selectedIds
  };

  if (compact && showInitialsChips) return <AssigneeInitialsPicker shared={shared} />;
  return <AssigneeListPicker shared={shared} />;
};

export default AssigneePicker;
