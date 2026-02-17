import type { Server as HttpServer } from 'http';
import { WebSocketServer } from 'ws';

type RealtimeEvent = {
  id?: string;
  type: string;
  orgId: string;
  actorId?: string;
  clientId?: string;
  payload?: unknown;
  timestamp?: number;
  sentAt?: number;
};

const sseClients = new Map<string, Set<{ id: string; write: (line: string) => void }>>();

const sendToOrgSse = (orgId: string, event: RealtimeEvent): void => {
  const clients = sseClients.get(orgId);
  if (!clients || clients.size === 0) return;
  const line = `data: ${JSON.stringify(event)}\n\n`;
  clients.forEach((client) => client.write(line));
};

let wsServer: WebSocketServer | null = null;

const sendToOrgWs = (orgId: string, event: RealtimeEvent): void => {
  if (!wsServer) return;
  wsServer.clients.forEach((socket) => {
    if (socket.readyState !== socket.OPEN) return;
    const meta = (socket as unknown as { orgId?: string }).orgId;
    if (meta === orgId) {
      socket.send(JSON.stringify(event));
    }
  });
};

export const realtimeGateway = {
  init(httpServer: HttpServer) {
    wsServer = new WebSocketServer({ server: httpServer, path: '/ws' });

    wsServer.on('connection', (socket, request) => {
      const url = new URL(request.url || '', 'http://localhost');
      const orgId = url.searchParams.get('orgId');
      if (!orgId) {
        socket.close(1008, 'orgId is required');
        return;
      }

      (socket as unknown as { orgId?: string }).orgId = orgId;

      socket.send(
        JSON.stringify({
          type: 'connected',
          orgId,
          timestamp: Date.now()
        })
      );

      socket.on('message', (raw) => {
        try {
          const parsed = JSON.parse(raw.toString()) as RealtimeEvent;
          if (!parsed?.type) return;
          const targetOrgId = typeof parsed.orgId === 'string' && parsed.orgId ? parsed.orgId : orgId;
          if (targetOrgId !== orgId) return;
          const event: RealtimeEvent = {
            id: parsed.id,
            type: parsed.type,
            orgId: targetOrgId,
            actorId: parsed.actorId,
            clientId: parsed.clientId,
            payload: parsed.payload,
            sentAt: parsed.sentAt || Date.now(),
            timestamp: Date.now()
          };
          sendToOrgWs(targetOrgId, event);
          sendToOrgSse(targetOrgId, event);
        } catch {
          // ignore malformed client event payloads
        }
      });
    });
  },

  attachSseClient(orgId: string, id: string, write: (line: string) => void) {
    const set = sseClients.get(orgId) || new Set();
    set.add({ id, write });
    sseClients.set(orgId, set);
  },

  detachSseClient(orgId: string, id: string) {
    const set = sseClients.get(orgId);
    if (!set) return;
    Array.from(set).forEach((client) => {
      if (client.id === id) set.delete(client);
    });
    if (set.size === 0) sseClients.delete(orgId);
  },

  publish(orgId: string, type: string, payload?: unknown) {
    const event: RealtimeEvent = { type, orgId, payload, timestamp: Date.now() };
    sendToOrgSse(orgId, event);
    sendToOrgWs(orgId, event);
  }
};
