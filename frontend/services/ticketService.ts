import {
  IntakeTicket,
  IntakeTicketPriority,
  IntakeTicketStatus,
} from '../types';
import { createId } from '../utils/id';
import { apiRequest } from './apiClient';
import { readAllTickets, writeAllTickets } from './ticket-service/store';
import {
  getTicketNotificationPolicy,
  getTicketNotificationSetupGuide,
  getTicketPolicy,
  runTicketNotificationSenderPreflight,
  updateTicketNotificationPolicy,
  updateTicketPolicy
} from './ticket-service/policy';

export const ticketService = {
  getPolicy: getTicketPolicy,

  updatePolicy: updateTicketPolicy,

  getNotificationPolicy: getTicketNotificationPolicy,

  updateNotificationPolicy: updateTicketNotificationPolicy,

  runNotificationSenderPreflight: runTicketNotificationSenderPreflight,

  getNotificationSetupGuide: getTicketNotificationSetupGuide,

  async getTickets(orgId: string): Promise<IntakeTicket[]> {
    const local = readAllTickets().filter((row) => row.orgId === orgId);
    try {
      const remote = await apiRequest<IntakeTicket[]>(`/orgs/${orgId}/tickets`);
      writeAllTickets([...readAllTickets().filter((row) => row.orgId !== orgId), ...remote]);
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
      writeAllTickets([...readAllTickets().filter((row) => !(row.orgId === orgId && row.id === created.id)), created]);
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
      writeAllTickets([...readAllTickets(), local]);
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
      writeAllTickets(readAllTickets().map((row) => (row.orgId === orgId && row.id === ticketId ? updated : row)));
      return updated;
    } catch {
      const rows = readAllTickets();
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
      writeAllTickets(next);
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
      writeAllTickets(readAllTickets().map((row) => (row.orgId === orgId && row.id === ticketId ? converted.ticket : row)));
      return converted;
    } catch {
      const rows = readAllTickets();
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
      writeAllTickets(rows.map((row) => (row.orgId === orgId && row.id === ticketId ? updated : row)));
      return { ticket: updated, taskId: updated.convertedTaskId || '' };
    }
  },

  async addComment(orgId: string, ticketId: string, text: string): Promise<IntakeTicket | null> {
    try {
      const updated = await apiRequest<IntakeTicket>(`/orgs/${orgId}/tickets/${ticketId}/comments`, {
        method: 'POST',
        body: { text }
      });
      writeAllTickets(readAllTickets().map((row) => (row.orgId === orgId && row.id === ticketId ? updated : row)));
      return updated;
    } catch {
      return readAllTickets().find((row) => row.orgId === orgId && row.id === ticketId) || null;
    }
  },

  async deleteTicket(orgId: string, ticketId: string): Promise<void> {
    try {
      await apiRequest(`/orgs/${orgId}/tickets/${ticketId}`, { method: 'DELETE' });
    } catch {
      // noop fallback path below
    }
    writeAllTickets(readAllTickets().filter((row) => !(row.orgId === orgId && row.id === ticketId)));
  }
};
