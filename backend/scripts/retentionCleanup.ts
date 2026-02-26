import { env } from '../src/config/env.js';
import { prisma } from '../src/lib/prisma.js';
import { runRetentionCleanup } from '../src/modules/retention/retention.service.js';

async function main() {
  const result = await runRetentionCleanup({
    orgRetentionDays: env.RETENTION_ORG_DELETE_DAYS,
    projectDeletionAuditRetentionDays: env.RETENTION_PROJECT_DELETE_AUDIT_DAYS,
    ticketNotificationDeliveryRetentionDays: env.RETENTION_TICKET_NOTIFICATION_DELIVERY_DAYS,
    ticketInboundMessageRetentionDays: env.RETENTION_TICKET_INBOUND_MESSAGE_DAYS,
    ticketSuppressionRetentionDays: env.RETENTION_TICKET_SUPPRESSION_DAYS
  });
  console.log(`Purged ${result.purgedOrganizations} organization(s) beyond ${env.RETENTION_ORG_DELETE_DAYS}-day retention.`);
  console.log(
    `Purged ${result.purgedProjectDeletionAudits} project deletion audit log(s) beyond ${env.RETENTION_PROJECT_DELETE_AUDIT_DAYS}-day retention.`
  );
  console.log(
    `Purged ${result.purgedTicketNotificationDeliveries} ticket notification delivery row(s) beyond ${env.RETENTION_TICKET_NOTIFICATION_DELIVERY_DAYS}-day retention.`
  );
  console.log(
    `Purged ${result.purgedTicketInboundMessages} ticket inbound message state row(s) beyond ${env.RETENTION_TICKET_INBOUND_MESSAGE_DAYS}-day retention.`
  );
  console.log(
    `Purged ${result.purgedTicketSuppressions} ticket suppression row(s) beyond ${env.RETENTION_TICKET_SUPPRESSION_DAYS}-day retention.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
