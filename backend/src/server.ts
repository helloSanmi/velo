import http from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { realtimeGateway } from './modules/realtime/realtime.gateway.js';
import { startRetentionCleanupScheduler } from './modules/retention/retention.scheduler.js';
import { startTicketSubscriptionRenewalScheduler } from './modules/tickets/tickets.subscription.scheduler.js';
import { startTicketsNotificationQueue } from './modules/tickets/tickets.notification.service.js';

const app = createApp();
const server = http.createServer(app);
realtimeGateway.init(server);
const stopRetentionCleanup = startRetentionCleanupScheduler();
const stopTicketSubscriptionRenewal = startTicketSubscriptionRenewalScheduler();
const stopTicketNotificationQueue = startTicketsNotificationQueue();

server.listen(env.PORT, () => {
  console.log(`Velo backend listening on http://localhost:${env.PORT}`);
});

const shutdown = () => {
  stopRetentionCleanup();
  stopTicketSubscriptionRenewal();
  stopTicketNotificationQueue();
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
