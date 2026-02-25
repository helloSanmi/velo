import { Project, Task } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

type TaskEvent = 'created' | 'updated' | 'deleted';

const readSlackConfig = (project: Project): { enabled: boolean; channel: string | null } => {
  const metadata = project.metadata && typeof project.metadata === 'object'
    ? (project.metadata as Record<string, unknown>)
    : {};
  const integrations = metadata.integrations && typeof metadata.integrations === 'object'
    ? (metadata.integrations as Record<string, unknown>)
    : {};
  const slack = integrations.slack && typeof integrations.slack === 'object'
    ? (integrations.slack as Record<string, unknown>)
    : {};
  const enabled = Boolean(slack.enabled);
  const channelRaw = typeof slack.channel === 'string' ? slack.channel.trim() : '';
  const channel = channelRaw.length > 0 ? channelRaw : null;
  return { enabled, channel };
};

const buildTaskEventText = (input: {
  event: TaskEvent;
  task: Task;
  project: Project;
  actorDisplay: string;
}): string => {
  if (input.event === 'created') {
    return `Task created in *${input.project.name}*: *${input.task.title}* by ${input.actorDisplay} (status: ${input.task.status}).`;
  }
  if (input.event === 'deleted') {
    return `Task deleted in *${input.project.name}*: *${input.task.title}* by ${input.actorDisplay}.`;
  }
  return `Task updated in *${input.project.name}*: *${input.task.title}* by ${input.actorDisplay} (status: ${input.task.status}, priority: ${input.task.priority}).`;
};

export const sendSlackTaskEvent = async (input: {
  event: TaskEvent;
  project: Project;
  task: Task;
  actorDisplay: string;
}) => {
  const connection = await (prisma as any).organizationOAuthConnection.findUnique({
    where: {
      orgId_provider: {
        orgId: input.project.orgId,
        provider: 'slack'
      }
    },
    select: { accessToken: true }
  });
  const token = connection?.accessToken ? String(connection.accessToken) : '';
  if (!token) return;

  const config = readSlackConfig(input.project);
  if (!config.enabled || !config.channel) return;

  const text = buildTaskEventText(input);
  try {
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel: config.channel,
        text,
        mrkdwn: true
      })
    });
  } catch {
    // Keep task operations non-blocking if Slack is unavailable.
  }
};
