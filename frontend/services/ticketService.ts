import { IntakeTicket, IntakeTicketPriority, IntakeTicketStatus, TicketPolicy } from '../types';
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
