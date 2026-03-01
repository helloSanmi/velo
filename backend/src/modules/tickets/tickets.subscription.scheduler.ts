import { env } from '../../config/env.js';
import { ticketsGraphService } from './tickets.graph.service.js';

export const startTicketSubscriptionRenewalScheduler = () => {
  if (
    (!env.TICKETS_SUBSCRIPTION_RENEWAL_ENABLED && !env.TICKETS_DELTA_SYNC_FALLBACK_ENABLED) ||
    env.NODE_ENV === 'test'
  ) {
    return () => {};
  }

  const renewalIntervalMinutes = Math.max(5, env.TICKETS_SUBSCRIPTION_RENEWAL_INTERVAL_MINUTES);
  const renewBeforeMinutes = Math.max(30, env.TICKETS_SUBSCRIPTION_RENEW_BEFORE_MINUTES);
  const deltaIntervalMinutes = Math.max(2, env.TICKETS_DELTA_SYNC_FALLBACK_INTERVAL_MINUTES);
  const renewalIntervalMs = renewalIntervalMinutes * 60 * 1000;
  const deltaIntervalMs = deltaIntervalMinutes * 60 * 1000;
  let renewalInFlight = false;
  let deltaInFlight = false;

  const runRenewal = async (reason: 'startup' | 'interval') => {
    if (!env.TICKETS_SUBSCRIPTION_RENEWAL_ENABLED || renewalInFlight) return;
    renewalInFlight = true;
    try {
      const result = await ticketsGraphService.renewExpiringMailSubscriptions({ renewBeforeMinutes });
      console.log(
        `[tickets-subscriptions] ${reason}: scanned ${result.scanned}, renewed ${result.renewed}, failed ${result.failed}.`
      );
    } catch (error) {
      console.error('[tickets-subscriptions] renewal failed', error);
    } finally {
      renewalInFlight = false;
    }
  };

  const runDeltaFallback = async (reason: 'startup' | 'interval') => {
    if (!env.TICKETS_DELTA_SYNC_FALLBACK_ENABLED || deltaInFlight) return;
    deltaInFlight = true;
    try {
      const result = await ticketsGraphService.syncAllMailDelta();
      console.log(
        `[tickets-delta-fallback] ${reason}: scanned ${result.scanned}, synced ${result.synced}, failed ${result.failed}, processed ${result.processed}.`
      );
    } catch (error) {
      console.error('[tickets-delta-fallback] sync failed', error);
    } finally {
      deltaInFlight = false;
    }
  };

  void runRenewal('startup');
  void runDeltaFallback('startup');
  const renewalTimer = setInterval(() => {
    void runRenewal('interval');
  }, renewalIntervalMs);
  renewalTimer.unref?.();
  const deltaTimer = setInterval(() => {
    void runDeltaFallback('interval');
  }, deltaIntervalMs);
  deltaTimer.unref?.();

  return () => {
    clearInterval(renewalTimer);
    clearInterval(deltaTimer);
  };
};
