import { User } from '../../../types';

export interface AssigneePickerProps {
  users: User[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  compact?: boolean;
  dropdownUnassignedOnly?: boolean;
  showInitialsChips?: boolean;
  disabled?: boolean;
}

export interface AssigneePickerShared {
  query: string;
  setQuery: (value: string) => void;
  selectedUsers: User[];
  filteredUsers: User[];
  toggle: (userId: string) => void;
  clearAll: () => void;
  selectFiltered: () => void;
  placeholder: string;
  compact: boolean;
  disabled: boolean;
  selectedIds: string[];
}
