import { OrgInvite, Organization } from '../../types';
import { apiRequest } from '../apiClient';
import { mapInviteFromApi, mapOrganizationFromApi } from './mappers';

export const fetchInvitesFromBackendRemote = async (
  orgId: string,
  getLocalInvites: (orgId?: string) => OrgInvite[]
): Promise<OrgInvite[]> => {
  try {
    const rows = await apiRequest<any[]>(`/orgs/${orgId}/invites`);
    return rows.map(mapInviteFromApi);
  } catch {
    return getLocalInvites(orgId);
  }
};

export const createInviteRemote = async (
  orgId: string,
  options?: {
    role?: 'member' | 'admin';
    invitedIdentifier?: string;
    ttlDays?: number;
    maxUses?: number;
  }
): Promise<{ success: boolean; invite?: OrgInvite; error?: string }> => {
  try {
    const invite = await apiRequest<any>(`/orgs/${orgId}/invites`, {
      method: 'POST',
      body: {
        role: options?.role || 'member',
        invitedIdentifier: options?.invitedIdentifier,
        ttlDays: options?.ttlDays || 14,
        maxUses: options?.maxUses || 1
      }
    });
    return { success: true, invite: mapInviteFromApi(invite) };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not create invite.' };
  }
};

export const revokeInviteRemote = async (
  orgId: string,
  inviteId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    await apiRequest(`/orgs/${orgId}/invites/${inviteId}`, { method: 'DELETE' });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not revoke invite.' };
  }
};

export const resendInviteRemote = async (
  orgId: string,
  inviteId: string
): Promise<{ success: boolean; invite?: OrgInvite; error?: string }> => {
  try {
    const invite = await apiRequest<any>(`/orgs/${orgId}/invites/${inviteId}/resend`, {
      method: 'POST'
    });
    return { success: true, invite: mapInviteFromApi(invite) };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not resend invite.' };
  }
};

export const addSeatsRemote = async (
  orgId: string,
  seatsToAdd: number
): Promise<Organization | null> => {
  try {
    const org = await apiRequest<any>(`/orgs/${orgId}/seats/add`, {
      method: 'POST',
      body: { seatsToAdd }
    });
    return mapOrganizationFromApi(org);
  } catch {
    return null;
  }
};

export const updateOrganizationSettingsRemote = async (
  orgId: string,
  patch: Partial<
    Pick<
      Organization,
      | 'loginSubdomain'
      | 'allowMicrosoftAuth'
      | 'microsoftWorkspaceConnected'
      | 'notificationSenderEmail'
      | 'plan'
      | 'totalSeats'
      | 'seatPrice'
      | 'billingCurrency'
    >
  >
): Promise<Organization | null> => {
  try {
    const org = await apiRequest<any>(`/orgs/${orgId}/settings`, {
      method: 'PATCH',
      body: patch
    });
    return mapOrganizationFromApi(org);
  } catch {
    return null;
  }
};
