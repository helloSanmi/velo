import { env } from '../../config/env.js';
import { ticketsGraphService } from './tickets.graph.service.js';

export const startTicketSubscriptionRenewalScheduler = () => {
  if (!env.TICKETS_SUBSCRIPTION_RENEWAL_ENABLED || env.NODE_ENV === 'test') return () => {};

  const intervalMinutes = Math.max(5, env.TICKETS_SUBSCRIPTION_RENEWAL_INTERVAL_MINUTES);
  const renewBeforeMinutes = Math.max(30, env.TICKETS_SUBSCRIPTION_RENEW_BEFORE_MINUTES);
  const intervalMs = intervalMinutes * 60 * 1000;
  let inFlight = false;

  const run = async (reason: 'startup' | 'interval') => {
    if (inFlight) return;
    inFlight = true;
    try {
      const result = await ticketsGraphService.renewExpiringMailSubscriptions({ renewBeforeMinutes });
      console.log(
        `[tickets-subscriptions] ${reason}: scanned ${result.scanned}, renewed ${result.renewed}, failed ${result.failed}.`
      );
    } catch (error) {
      console.error('[tickets-subscriptions] renewal failed', error);
    } finally {
      inFlight = false;
    }
  };

  void run('startup');
  const timer = setInterval(() => {
    void run('interval');
  }, intervalMs);
  timer.unref?.();

  return () => clearInterval(timer);
};
