import { OrgInvite, Organization, User } from '../types';
import {
  getCurrentUserLocal,
  getUsersLocal,
  provisionUserLocal,
  updateUserLocal,
  deleteUserLocal
} from './user-service/localUsers';
import {
  addSeatsLocal,
  createInviteLocal,
  getInvitesLocal,
  getOrganizationLocal,
  getOrganizationsLocal,
  revokeInviteLocal,
  updateOrganizationLocal
} from './user-service/localOrgInvite';
import {
  acceptInviteLocal,
  deleteOrganizationLocal,
  loginLocal,
  logoutLocal,
  registerLocal
} from './user-service/localAuthLifecycle';
import { createRemoteUserFacade } from './user-service/remoteFacade';
import { hydrateWorkspaceFromBackend } from './user-service/workspaceHydration';

const localFacade = {
  getCurrentUser: (): User | null => getCurrentUserLocal(),
  getOrganization: (orgId: string): Organization | null => getOrganizationLocal(orgId),
  getOrganizations: (): Organization[] => getOrganizationsLocal(),
  updateOrganization: (orgId: string, updates: Partial<Organization>): Organization | null =>
    updateOrganizationLocal(orgId, updates),
  addSeats: (orgId: string, seatsToAdd: number): Organization | null => addSeatsLocal(orgId, seatsToAdd),
  getInvites: (orgId?: string): OrgInvite[] => getInvitesLocal(orgId),
  createInvite: (
    orgId: string,
    createdBy: string,
    options?: { role?: 'member' | 'admin'; invitedIdentifier?: string; ttlDays?: number; maxUses?: number }
  ): { success: boolean; invite?: OrgInvite; error?: string } =>
    createInviteLocal(orgId, createdBy, options),
  revokeInvite: (inviteId: string, actorId: string): { success: boolean; error?: string } =>
    revokeInviteLocal(inviteId, actorId),
  getUsers: (orgId?: string): User[] => getUsersLocal(orgId),
  updateUser: (userId: string, updates: Partial<User>): User[] => updateUserLocal(userId, updates),
  deleteUser: (userId: string): User[] => deleteUserLocal(userId),
  provisionUser: (
    orgId: string,
    username: string,
    role: 'admin' | 'member' = 'member',
    profile?: { firstName?: string; lastName?: string; email?: string }
  ): { success: boolean; error?: string; user?: User } =>
    provisionUserLocal(orgId, username, role, profile),
  register: (
    identifier: string,
    orgName?: string,
    options?: { plan?: 'free' | 'basic' | 'pro'; totalSeats?: number }
  ): User => registerLocal(identifier, orgName, options),
  login: (identifier: string): User | null => loginLocal(identifier),
  acceptInvite: (token: string, identifier: string): { success: boolean; error?: string; user?: User } =>
    acceptInviteLocal(token, identifier),
  logout: () => logoutLocal(),
  deleteOrganization: (actorId: string, orgId: string): { success: boolean; error?: string } =>
    deleteOrganizationLocal(actorId, orgId),
};

const remoteFacade = createRemoteUserFacade({
  getInvites: localFacade.getInvites,
  getUsers: localFacade.getUsers,
  hydrateWorkspaceFromBackend
});

export const userService = {
  ...localFacade,
  ...remoteFacade,
  hydrateWorkspaceFromBackend
};
