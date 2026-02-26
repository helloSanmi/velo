import {
  IntakeTicket,
  IntakeTicketPriority,
  IntakeTicketStatus,
  TicketNotificationDelivery,
  TicketNotificationActiveHealthCheck,
  TicketNotificationDiagnostics,
  TicketNotificationDeliveryStatus,
  TicketNotificationPolicy,
  TicketPolicy
} from '../types';
import { createId } from '../utils/id';
import { apiRequest } from './apiClient';

const TICKETS_KEY = 'velo_intake_tickets';

const readAll = (): IntakeTicket[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(TICKETS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeAll = (rows: IntakeTicket[]): void => {
  localStorage.setItem(TICKETS_KEY, JSON.stringify(rows));
};

export const ticketService = {
  async getPolicy(orgId: string, projectId?: string): Promise<TicketPolicy> {
    const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    return apiRequest<TicketPolicy>(`/orgs/${orgId}/tickets/policy${query}`);
  },

  async updatePolicy(
    orgId: string,
    patch: {
      projectId?: string;
      assignmentMode: TicketPolicy['assignmentMode'];
      assigneePoolIds: string[];
      slaHours: TicketPolicy['slaHours'];
      roundRobinCursor?: number;
    }
  ): Promise<TicketPolicy> {
    return apiRequest<TicketPolicy>(`/orgs/${orgId}/tickets/policy`, { method: 'PATCH', body: patch });
  },

  async getNotificationPolicy(orgId: string): Promise<TicketNotificationPolicy> {
    return apiRequest<TicketNotificationPolicy>(`/orgs/${orgId}/tickets/notifications/policy`);
  },

  async updateNotificationPolicy(
    orgId: string,
    patch: Partial<Omit<TicketNotificationPolicy, 'orgId' | 'updatedAt'>>
  ): Promise<TicketNotificationPolicy> {
    return apiRequest<TicketNotificationPolicy>(`/orgs/${orgId}/tickets/notifications/policy`, { method: 'PATCH', body: patch });
  },

  async getNotificationQueueStatus(orgId: string): Promise<{ queued: number; digestPending: number }> {
    return apiRequest<{ queued: number; digestPending: number }>(`/orgs/${orgId}/tickets/notifications/queue-status`);
  },

  async getNotificationDeliveries(
    orgId: string,
    input?: { status?: TicketNotificationDeliveryStatus; limit?: number }
  ): Promise<TicketNotificationDelivery[]> {
    const search = new URLSearchParams();
    if (input?.status) search.set('status', input.status);
    if (typeof input?.limit === 'number') search.set('limit', String(input.limit));
    const query = search.toString() ? `?${search.toString()}` : '';
    const rows = await apiRequest<TicketNotificationDelivery[]>(`/orgs/${orgId}/tickets/notifications/deliveries${query}`);
    return rows.map((row: any) => ({
      ...row,
      createdAt: Date.parse(String(row.createdAt || '')) || Date.now(),
      updatedAt: Date.parse(String(row.updatedAt || '')) || Date.now(),
      nextAttemptAt: row.nextAttemptAt ? Date.parse(String(row.nextAttemptAt)) : undefined,
      sentAt: row.sentAt ? Date.parse(String(row.sentAt)) : undefined,
      resolvedAt: row.resolvedAt ? Date.parse(String(row.resolvedAt)) : undefined
    }));
  },

  async retryNotificationDelivery(orgId: string, deliveryId: string): Promise<TicketNotificationDelivery> {
    return apiRequest<TicketNotificationDelivery>(
      `/orgs/${orgId}/tickets/notifications/deliveries/${encodeURIComponent(deliveryId)}/retry`,
      { method: 'POST' }
    );
  },

  async getNotificationDiagnostics(orgId: string): Promise<TicketNotificationDiagnostics> {
    return apiRequest<TicketNotificationDiagnostics>(`/orgs/${orgId}/tickets/notifications/health`);
  },

  async runNotificationHealthCheck(orgId: string): Promise<TicketNotificationActiveHealthCheck> {
    return apiRequest<TicketNotificationActiveHealthCheck>(`/orgs/${orgId}/tickets/notifications/health-check`, {
      method: 'POST'
    });
  },

  async getTickets(orgId: string): Promise<IntakeTicket[]> {
    const local = readAll().filter((row) => row.orgId === orgId);
    try {
      const remote = await apiRequest<IntakeTicket[]>(`/orgs/${orgId}/tickets`);
      writeAll([...readAll().filter((row) => row.orgId !== orgId), ...remote]);
      return remote;
    } catch {
      return local.sort((a, b) => b.updatedAt - a.updatedAt);
    }
  },

  async createTicket(
    orgId: string,
    payload: {
      projectId?: string;
      title: string;
      description?: string;
      requesterName: string;
      requesterEmail?: string;
      status?: IntakeTicketStatus;
      priority?: IntakeTicketPriority;
      tags?: string[];
      source?: IntakeTicket['source'];
      assigneeId?: string | null;
      startedAt?: number;
    }
  ): Promise<IntakeTicket> {
    try {
      const created = await apiRequest<IntakeTicket>(`/orgs/${orgId}/tickets`, { method: 'POST', body: payload });
      writeAll([...readAll().filter((row) => !(row.orgId === orgId && row.id === created.id)), created]);
      return created;
    } catch {
      const now = Date.now();
      const local: IntakeTicket = {
        id: createId(),
        orgId,
        title: payload.title,
        description: payload.description || '',
        requesterName: payload.requesterName,
        requesterEmail: payload.requesterEmail,
        status: payload.status || 'new',
        priority: payload.priority || 'medium',
        tags: payload.tags || [],
        source: payload.source || 'workspace',
        startedAt: payload.startedAt,
        createdAt: now,
        updatedAt: now,
        projectId: payload.projectId,
        assigneeId: payload.assigneeId === null ? undefined : payload.assigneeId
      };
      writeAll([...readAll(), local]);
      return local;
    }
  },

  async updateTicket(
    orgId: string,
    ticketId: string,
    patch: Partial<{
      projectId: string;
      title: string;
      description: string;
      requesterName: string;
      requesterEmail: string;
      priority: IntakeTicketPriority;
      status: IntakeTicketStatus;
      tags: string[];
      assigneeId: string | null;
      startedAt: number | null;
    }>
  ): Promise<IntakeTicket | null> {
    try {
      const updated = await apiRequest<IntakeTicket>(`/orgs/${orgId}/tickets/${ticketId}`, { method: 'PATCH', body: patch });
      writeAll(readAll().map((row) => (row.orgId === orgId && row.id === ticketId ? updated : row)));
      return updated;
    } catch {
      const rows = readAll();
      const next = rows.map((row) => {
        if (!(row.orgId === orgId && row.id === ticketId)) return row;
        return {
          ...row,
          ...patch,
          assigneeId: patch.assigneeId === null ? undefined : patch.assigneeId ?? row.assigneeId,
          startedAt: patch.startedAt === null ? undefined : patch.startedAt ?? row.startedAt,
          updatedAt: Date.now()
        } as IntakeTicket;
      });
      writeAll(next);
      return next.find((row) => row.orgId === orgId && row.id === ticketId) || null;
    }
  },

  async convertTicket(
    orgId: string,
    ticketId: string,
    payload: {
      projectId?: string;
      status?: string;
    }
  ): Promise<{ ticket: IntakeTicket; taskId: string } | null> {
    try {
      const converted = await apiRequest<{ ticket: IntakeTicket; taskId: string }>(`/orgs/${orgId}/tickets/${ticketId}/convert`, {
        method: 'POST',
        body: payload
      });
      writeAll(readAll().map((row) => (row.orgId === orgId && row.id === ticketId ? converted.ticket : row)));
      return converted;
    } catch {
      const rows = readAll();
      const current = rows.find((row) => row.orgId === orgId && row.id === ticketId);
      if (!current) return null;
      const updated: IntakeTicket = {
        ...current,
        status: 'converted',
        convertedTaskId: createId('task'),
        convertedProjectId: payload.projectId || current.projectId,
        convertedAt: Date.now(),
        updatedAt: Date.now()
      };
      writeAll(rows.map((row) => (row.orgId === orgId && row.id === ticketId ? updated : row)));
      return { ticket: updated, taskId: updated.convertedTaskId || '' };
    }
  },

  async addComment(orgId: string, ticketId: string, text: string): Promise<IntakeTicket | null> {
    try {
      const updated = await apiRequest<IntakeTicket>(`/orgs/${orgId}/tickets/${ticketId}/comments`, {
        method: 'POST',
        body: { text }
      });
      writeAll(readAll().map((row) => (row.orgId === orgId && row.id === ticketId ? updated : row)));
      return updated;
    } catch {
      return readAll().find((row) => row.orgId === orgId && row.id === ticketId) || null;
    }
  },

  async deleteTicket(orgId: string, ticketId: string): Promise<void> {
    try {
      await apiRequest(`/orgs/${orgId}/tickets/${ticketId}`, { method: 'DELETE' });
    } catch {
      // noop fallback path below
    }
    writeAll(readAll().filter((row) => !(row.orgId === orgId && row.id === ticketId)));
  }
};
