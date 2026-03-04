import { Project, User } from '../../../types';

export interface SidebarProjectEditModalProps {
  isOpen: boolean;
  project: Project | null;
  allUsers: User[];
  currentUser: User;
  name: string;
  setName: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  color: string;
  setColor: (value: string) => void;
  ownerId: string;
  setOwnerId: (value: string) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  budgetCost: string;
  setBudgetCost: (value: string) => void;
  hourlyRate: string;
  setHourlyRate: (value: string) => void;
  scopeSize: string;
  setScopeSize: (value: string) => void;
  scopeSummary: string;
  setScopeSummary: (value: string) => void;
  isPublic: boolean;
  setIsPublic: (value: boolean) => void;
  onClose: () => void;
  onSave: () => void;
}
