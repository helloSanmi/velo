import { Organization, OrgInvite } from '../../types';
import { createId } from '../../utils/id';
import { PLAN_DEFAULT_SEATS, PLAN_SEAT_PRICE, INVITES_KEY, ORGS_KEY } from './constants';
import { emitUsersUpdated } from './helpers';

export const getOrganizationLocal = (orgId: string): Organization | null => {
  const orgs: Organization[] = JSON.parse(localStorage.getItem(ORGS_KEY) || '[]');
  return orgs.find((org) => org.id === orgId) || null;
};

export const getOrganizationsLocal = (): Organization[] =>
  JSON.parse(localStorage.getItem(ORGS_KEY) || '[]');

export const updateOrganizationLocal = (
  orgId: string,
  updates: Partial<Organization>
): Organization | null => {
  const orgs = getOrganizationsLocal();
  let updatedOrg: Organization | null = null;
  const newOrgs = orgs.map((org) => {
    if (org.id !== orgId) return org;
    updatedOrg = { ...org, ...updates };
    return updatedOrg;
  });
  localStorage.setItem(ORGS_KEY, JSON.stringify(newOrgs));
  emitUsersUpdated(orgId);
  return updatedOrg;
};

export const addSeatsLocal = (orgId: string, seatsToAdd: number): Organization | null => {
  if (!Number.isFinite(seatsToAdd) || seatsToAdd <= 0) return getOrganizationLocal(orgId);
  const org = getOrganizationLocal(orgId);
  if (!org) return null;
  return updateOrganizationLocal(orgId, {
    totalSeats: Math.max(org.totalSeats, org.totalSeats + Math.round(seatsToAdd))
  });
};

export const getInvitesLocal = (orgId?: string): OrgInvite[] => {
  const invites: OrgInvite[] = JSON.parse(localStorage.getItem(INVITES_KEY) || '[]');
  return orgId ? invites.filter((invite) => invite.orgId === orgId) : invites;
};

export const createInviteLocal = (
  orgId: string,
  createdBy: string,
  options?: { role?: 'member' | 'admin'; invitedIdentifier?: string; ttlDays?: number; maxUses?: number }
): { success: boolean; invite?: OrgInvite; error?: string } => {
  const org = getOrganizationLocal(orgId);
  if (!org) return { success: false, error: 'Organization not found.' };
  const token = `velo_${createId().slice(0, 10)}`;
  const invite: OrgInvite = {
    id: createId(),
    orgId,
    token,
    role: options?.role || 'member',
    createdBy,
    createdAt: Date.now(),
    expiresAt: Date.now() + Math.max(1, options?.ttlDays || 14) * 24 * 60 * 60 * 1000,
    maxUses: options?.maxUses || 1,
    usedCount: 0,
    invitedIdentifier: options?.invitedIdentifier?.trim() || undefined
  };
  const invites = getInvitesLocal();
  localStorage.setItem(INVITES_KEY, JSON.stringify([invite, ...invites]));
  emitUsersUpdated(orgId, createdBy);
  return { success: true, invite };
};

export const revokeInviteLocal = (
  inviteId: string,
  actorId: string
): { success: boolean; error?: string } => {
  const invites = getInvitesLocal();
  const target = invites.find((invite) => invite.id === inviteId);
  if (!target) return { success: false, error: 'Invite not found.' };
  const updated = invites.map((invite) =>
    invite.id === inviteId ? { ...invite, revoked: true } : invite
  );
  localStorage.setItem(INVITES_KEY, JSON.stringify(updated));
  emitUsersUpdated(target.orgId, actorId);
  return { success: true };
};

export const registerLocalOrganization = (
  orgId: string,
  ownerId: string,
  orgName: string,
  plan: 'free' | 'basic' | 'pro',
  totalSeats: number
) => {
  const orgs = getOrganizationsLocal();
  const newOrg: Organization = {
    id: orgId,
    name: orgName,
    totalSeats,
    ownerId,
    createdAt: Date.now(),
    plan,
    seatPrice: PLAN_SEAT_PRICE[plan],
    billingCurrency: 'USD'
  };
  localStorage.setItem(ORGS_KEY, JSON.stringify([...orgs, newOrg]));
};

export const resolvePlanSeats = (
  plan: 'free' | 'basic' | 'pro',
  selected?: number
): number => {
  const selectedSeats = Number.isFinite(selected as number)
    ? Number(selected)
    : PLAN_DEFAULT_SEATS[plan];
  return plan === 'free'
    ? Math.max(1, Math.min(3, Math.round(selectedSeats)))
    : Math.max(1, Math.min(100000, Math.round(selectedSeats)));
};
