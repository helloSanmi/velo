import { NotificationSenderPreflightResult, NotificationSetupGuide, TicketNotificationPolicy, TicketPolicy } from '../../types';
import { apiRequest } from '../apiClient';

export const getTicketPolicy = async (orgId: string, projectId?: string): Promise<TicketPolicy> => {
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  return apiRequest<TicketPolicy>(`/orgs/${orgId}/tickets/policy${query}`);
};

export const updateTicketPolicy = async (
  orgId: string,
  patch: {
    projectId?: string;
    assignmentMode: TicketPolicy['assignmentMode'];
    assigneePoolIds: string[];
    slaHours: TicketPolicy['slaHours'];
    roundRobinCursor?: number;
  }
): Promise<TicketPolicy> => apiRequest<TicketPolicy>(`/orgs/${orgId}/tickets/policy`, { method: 'PATCH', body: patch });

export const getTicketNotificationPolicy = async (orgId: string): Promise<TicketNotificationPolicy> =>
  apiRequest<TicketNotificationPolicy>(`/orgs/${orgId}/tickets/notifications/policy`);

export const updateTicketNotificationPolicy = async (
  orgId: string,
  patch: Partial<Omit<TicketNotificationPolicy, 'orgId' | 'updatedAt'>>
): Promise<TicketNotificationPolicy> =>
  apiRequest<TicketNotificationPolicy>(`/orgs/${orgId}/tickets/notifications/policy`, { method: 'PATCH', body: patch });

export const runTicketNotificationSenderPreflight = async (
  orgId: string,
  input?: { testRecipientEmail?: string }
): Promise<NotificationSenderPreflightResult> =>
  apiRequest<NotificationSenderPreflightResult>(`/orgs/${orgId}/tickets/notifications/preflight`, {
    method: 'POST',
    body: input || {}
  });

export const getTicketNotificationSetupGuide = async (orgId: string): Promise<NotificationSetupGuide> =>
  apiRequest<NotificationSetupGuide>(`/orgs/${orgId}/tickets/notifications/setup-script`);
