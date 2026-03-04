import { workspaceNotificationService } from '../tickets/workspace.notification.service.js';
import { parseIds } from './teams.schemas.js';
import { resolveAdminRecipients, resolveActorName, resolveUsers } from './teams.notifications.recipients.js';

export const notifyTeamCreated = async (input: {
  orgId: string;
  actorUserId: string;
  teamId: string;
  teamName: string;
  memberIds: unknown;
}) => {
  const actorName = await resolveActorName(input.actorUserId);
  const memberIds = parseIds(input.memberIds);

  if (memberIds.length > 0) {
    await workspaceNotificationService.notify({
      orgId: input.orgId,
      eventType: 'user_lifecycle',
      actorUserId: input.actorUserId,
      title: `Added to team: ${input.teamName}`,
      summary: `${actorName} added you to team "${input.teamName}".`,
      recipients: await resolveUsers({ orgId: input.orgId, userIds: memberIds }),
      facts: [{ title: 'Team', value: input.teamName }],
      openPath: '/app?settings=teams',
      dedupeEntityKey: `team-created-${input.teamId}`
    });
  }

  await workspaceNotificationService.notify({
    orgId: input.orgId,
    eventType: 'security_admin_alerts',
    actorUserId: input.actorUserId,
    title: 'Team created',
    summary: `${actorName} created team "${input.teamName}".`,
    recipients: await resolveAdminRecipients(input.orgId),
    facts: [{ title: 'Team', value: input.teamName }],
    openPath: '/app?settings=teams',
    dedupeEntityKey: `security-team-created-${input.teamId}`
  });
};

export const notifyTeamUpdated = async (input: {
  orgId: string;
  actorUserId: string;
  teamId: string;
  teamName: string;
  previousMemberIds: unknown;
  nextMemberIds: unknown;
}) => {
  const actorName = await resolveActorName(input.actorUserId);
  const previousMemberIds = parseIds(input.previousMemberIds);
  const nextMemberIds = parseIds(input.nextMemberIds);
  const addedUserIds = nextMemberIds.filter((userId) => !previousMemberIds.includes(userId));
  const removedUserIds = previousMemberIds.filter((userId) => !nextMemberIds.includes(userId));

  if (addedUserIds.length > 0) {
    await workspaceNotificationService.notify({
      orgId: input.orgId,
      eventType: 'user_lifecycle',
      actorUserId: input.actorUserId,
      title: `Added to team: ${input.teamName}`,
      summary: `${actorName} added you to team "${input.teamName}".`,
      recipients: await resolveUsers({ orgId: input.orgId, userIds: addedUserIds }),
      facts: [{ title: 'Team', value: input.teamName }],
      openPath: '/app?settings=teams',
      dedupeEntityKey: `team-added-${input.teamId}-${Date.now()}`
    });
  }

  if (removedUserIds.length > 0) {
    await workspaceNotificationService.notify({
      orgId: input.orgId,
      eventType: 'user_lifecycle',
      actorUserId: input.actorUserId,
      title: `Removed from team: ${input.teamName}`,
      summary: `${actorName} removed you from team "${input.teamName}".`,
      recipients: await resolveUsers({ orgId: input.orgId, userIds: removedUserIds }),
      facts: [{ title: 'Team', value: input.teamName }],
      openPath: '/app?settings=teams',
      dedupeEntityKey: `team-removed-${input.teamId}-${Date.now()}`
    });
  }

  if (addedUserIds.length > 0 || removedUserIds.length > 0) {
    await workspaceNotificationService.notify({
      orgId: input.orgId,
      eventType: 'security_admin_alerts',
      actorUserId: input.actorUserId,
      title: 'Team membership updated',
      summary: `${actorName} updated members for team "${input.teamName}".`,
      recipients: await resolveAdminRecipients(input.orgId),
      facts: [
        { title: 'Team', value: input.teamName },
        { title: 'Added', value: String(addedUserIds.length) },
        { title: 'Removed', value: String(removedUserIds.length) }
      ],
      openPath: '/app?settings=teams',
      dedupeEntityKey: `security-team-${input.teamId}-${Date.now()}`
    });
  }
};

export const notifyTeamDeleted = async (input: {
  orgId: string;
  actorUserId: string;
  teamId: string;
  teamName: string;
  memberIds: unknown;
}) => {
  const actorName = await resolveActorName(input.actorUserId);
  const memberIds = parseIds(input.memberIds);

  if (memberIds.length > 0) {
    await workspaceNotificationService.notify({
      orgId: input.orgId,
      eventType: 'user_lifecycle',
      actorUserId: input.actorUserId,
      title: `Removed from team: ${input.teamName}`,
      summary: `${actorName} removed team "${input.teamName}".`,
      recipients: await resolveUsers({ orgId: input.orgId, userIds: memberIds }),
      facts: [{ title: 'Team', value: input.teamName }],
      openPath: '/app?settings=teams',
      dedupeEntityKey: `team-deleted-${input.teamId}`
    });
  }

  await workspaceNotificationService.notify({
    orgId: input.orgId,
    eventType: 'security_admin_alerts',
    actorUserId: input.actorUserId,
    title: 'Team deleted',
    summary: `${actorName} deleted team "${input.teamName}".`,
    recipients: await resolveAdminRecipients(input.orgId),
    facts: [{ title: 'Team', value: input.teamName }],
    openPath: '/app?settings=teams',
    dedupeEntityKey: `security-team-deleted-${input.teamId}`
  });
};
