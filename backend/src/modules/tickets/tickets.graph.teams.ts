import { createId } from '../../lib/ids.js';
import { ensureProviderAccessToken } from '../auth/auth.oauth.js';
import { graphRequest } from './tickets.graph.request.js';
import { resolveConnection } from './tickets.graph.connection.js';
import { getCircuitOpenError, isCircuitOpen, updateGraphHealthOnResult } from './tickets.graph.health.js';
import { buildAppUrl, buildTicketUrl } from './tickets.graph.urls.js';

export const sendTicketTeamsCard = async (input: {
  orgId: string;
  title: string;
  summary: string;
  facts?: Array<{ title: string; value: string }>;
  ticketId: string;
}): Promise<void> => {
  const { metadata } = await resolveConnection(input.orgId);
  if (isCircuitOpen(metadata)) throw getCircuitOpenError(metadata);
  const teamsTeamId = metadata.teamsTeamId;
  const teamsChannelId = metadata.teamsChannelId;
  const teamsChatId = metadata.teamsChatId;
  if (!teamsChatId && !(teamsTeamId && teamsChannelId)) return;

  const accessToken = await ensureProviderAccessToken({ orgId: input.orgId, provider: 'microsoft' });
  const card = {
    type: 'AdaptiveCard',
    version: '1.5',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    body: [
      { type: 'TextBlock', size: 'Medium', weight: 'Bolder', text: input.title, wrap: true },
      { type: 'TextBlock', text: input.summary, wrap: true },
      ...(Array.isArray(input.facts) && input.facts.length > 0 ? [{ type: 'FactSet', facts: input.facts }] : [])
    ],
    actions: [{ type: 'Action.OpenUrl', title: 'Open ticket', url: buildTicketUrl(input.ticketId) }]
  };

  const body = {
    body: { contentType: 'html', content: `Ticket update: ${input.title}` },
    attachments: [{
      id: createId('card'),
      contentType: 'application/vnd.microsoft.card.adaptive',
      contentUrl: null,
      content: JSON.stringify(card),
      name: 'ticket-card'
    }]
  };

  try {
    if (teamsChatId) {
      await graphRequest({ accessToken, method: 'POST', url: `/chats/${encodeURIComponent(teamsChatId)}/messages`, body });
      await updateGraphHealthOnResult({ orgId: input.orgId, ok: true });
      return;
    }
    await graphRequest({
      accessToken,
      method: 'POST',
      url: `/teams/${encodeURIComponent(String(teamsTeamId))}/channels/${encodeURIComponent(String(teamsChannelId))}/messages`,
      body
    });
    await updateGraphHealthOnResult({ orgId: input.orgId, ok: true });
  } catch (error: any) {
    await updateGraphHealthOnResult({ orgId: input.orgId, ok: false, errorMessage: error?.message || String(error) });
    throw error;
  }
};

export const sendWorkspaceTeamsCard = async (input: {
  orgId: string;
  title: string;
  summary: string;
  facts?: Array<{ title: string; value: string }>;
  openPath?: string;
}): Promise<void> => {
  const { metadata } = await resolveConnection(input.orgId);
  if (isCircuitOpen(metadata)) throw getCircuitOpenError(metadata);
  const teamsTeamId = metadata.teamsTeamId;
  const teamsChannelId = metadata.teamsChannelId;
  const teamsChatId = metadata.teamsChatId;
  if (!teamsChatId && !(teamsTeamId && teamsChannelId)) return;

  const accessToken = await ensureProviderAccessToken({ orgId: input.orgId, provider: 'microsoft' });
  const card = {
    type: 'AdaptiveCard',
    version: '1.5',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    body: [
      { type: 'TextBlock', size: 'Medium', weight: 'Bolder', text: input.title, wrap: true },
      { type: 'TextBlock', text: input.summary, wrap: true },
      ...(Array.isArray(input.facts) && input.facts.length > 0 ? [{ type: 'FactSet', facts: input.facts }] : [])
    ],
    actions: input.openPath ? [{ type: 'Action.OpenUrl', title: 'Open in Velo', url: buildAppUrl(input.openPath) }] : []
  };

  const body = {
    body: { contentType: 'html', content: input.title },
    attachments: [{
      id: createId('card'),
      contentType: 'application/vnd.microsoft.card.adaptive',
      contentUrl: null,
      content: JSON.stringify(card),
      name: 'workspace-card'
    }]
  };

  try {
    if (teamsChatId) {
      await graphRequest({ accessToken, method: 'POST', url: `/chats/${encodeURIComponent(teamsChatId)}/messages`, body });
      await updateGraphHealthOnResult({ orgId: input.orgId, ok: true });
      return;
    }
    await graphRequest({
      accessToken,
      method: 'POST',
      url: `/teams/${encodeURIComponent(String(teamsTeamId))}/channels/${encodeURIComponent(String(teamsChannelId))}/messages`,
      body
    });
    await updateGraphHealthOnResult({ orgId: input.orgId, ok: true });
  } catch (error: any) {
    await updateGraphHealthOnResult({ orgId: input.orgId, ok: false, errorMessage: error?.message || String(error) });
    throw error;
  }
};
