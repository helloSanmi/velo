import { env } from '../../config/env.js';
import { runRetentionCleanup } from './retention.service.js';

export const startRetentionCleanupScheduler = () => {
  if (!env.RETENTION_CLEANUP_ENABLED || env.NODE_ENV === 'test') return () => {};

  const intervalMinutes = Math.max(5, env.RETENTION_CLEANUP_INTERVAL_MINUTES);
  const intervalMs = intervalMinutes * 60 * 1000;
  let inFlight = false;

  const run = async (reason: 'startup' | 'interval') => {
    if (inFlight) return;
    inFlight = true;
    try {
      const result = await runRetentionCleanup({
        orgRetentionDays: env.RETENTION_ORG_DELETE_DAYS,
        projectDeletionAuditRetentionDays: env.RETENTION_PROJECT_DELETE_AUDIT_DAYS
      });
      console.log(
        `[retention] ${reason}: purged ${result.purgedOrganizations} org(s), ${result.purgedProjectDeletionAudits} project deletion audit log(s).`
      );
    } catch (error) {
      console.error('[retention] cleanup failed', error);
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
