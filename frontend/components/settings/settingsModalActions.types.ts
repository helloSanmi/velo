import { UserSettings } from '../../services/settingsService';
import { OrgInvite, Organization, User as UserType } from '../../types';

export interface AiUsageRow {
  id: string;
  orgId: string;
  dayKey: string;
  requestsUsed: number;
  tokensUsed: number;
  warningIssuedAt?: string | null;
  blockedAt?: string | null;
}

export interface UseSettingsModalActionsArgs {
  user?: UserType;
  org: Organization | null;
  profileUser: UserType | null;
  editingProjectId: string | null;
  editingProjectName: string;
  newUserName: string;
  newUserFirstName: string;
  newUserLastName: string;
  newUserEmail: string;
  newUserRole: 'member' | 'admin';
  newUserTempPassword: string;
  newInviteIdentifier: string;
  newInviteRole: 'member' | 'admin';
  seatPurchaseCount: number;
  editingUserId: string | null;
  editFirstNameValue: string;
  editLastNameValue: string;
  editEmailValue: string;
  setSettings: (value: UserSettings) => void;
  setAllUsers: (value: UserType[]) => void;
  setOrg: (value: Organization | null) => void;
  setInvites: (value: OrgInvite[]) => void;
  setAiUsageRows: (value: AiUsageRow[]) => void;
  setProfileUser: (value: UserType | null) => void;
  setProvisionError: (value: string) => void;
  setNewUserName: (value: string) => void;
  setNewUserFirstName: (value: string) => void;
  setNewUserLastName: (value: string) => void;
  setNewUserEmail: (value: string) => void;
  setNewUserRole: (value: 'member' | 'admin') => void;
  setNewUserTempPassword: (value: string) => void;
  setIsProvisioning: (value: boolean) => void;
  setEditingUserId: (value: string | null) => void;
  setEditFirstNameValue: (value: string) => void;
  setEditLastNameValue: (value: string) => void;
  setEditEmailValue: (value: string) => void;
  setNewInviteIdentifier: (value: string) => void;
  setEditingProjectId: (value: string | null) => void;
  setEditingProjectName: (value: string) => void;
  onUserUpdated?: (user: UserType) => void;
  onRenameProject?: (id: string, name: string) => void;
  onDeleteOrganization?: () => void;
  onClose: () => void;
}

export type SettingsActionsContext = UseSettingsModalActionsArgs & {
  refreshWorkspaceUsers: () => Promise<void>;
};
