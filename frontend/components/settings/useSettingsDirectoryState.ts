import { useCallback, useEffect, useState } from 'react';
import { Organization } from '../../types';
import { userService } from '../../services/userService';
import { DirectoryEntry, normalizeEmail } from './settingsAdminRows';

interface UseSettingsDirectoryStateArgs {
  org: Organization | null;
  onUpdateOrganizationSettings: (
    patch: Partial<
      Pick<
        Organization,
        | 'loginSubdomain'
        | 'allowMicrosoftAuth'
        | 'microsoftWorkspaceConnected'
        | 'notificationSenderEmail'
        | 'plan'
        | 'totalSeats'
        | 'seatPrice'
        | 'billingCurrency'
      >
    >
  ) => Promise<Organization | null>;
}

export const useSettingsDirectoryState = ({ org, onUpdateOrganizationSettings }: UseSettingsDirectoryStateArgs) => {
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [directoryUsers, setDirectoryUsers] = useState<DirectoryEntry[]>([]);
  const [directoryError, setDirectoryError] = useState('');

  const directoryCacheKey = org ? `velo_directory_cache_${org.id}` : 'velo_directory_cache';

  const mergeDirectoryUsers = useCallback(
    (provider: 'microsoft', entries: DirectoryEntry[]) => {
      setDirectoryUsers((prev) => {
        const next = [...prev];
        const indexByIdentity = new Map<string, number>();

        next.forEach((entry, index) => {
          const key = entry.externalId || normalizeEmail(entry.email);
          indexByIdentity.set(key, index);
        });

        for (const entry of entries) {
          const key = entry.externalId || normalizeEmail(entry.email);
          const index = indexByIdentity.get(key);
          if (index === undefined) {
            indexByIdentity.set(key, next.length);
            next.push(entry);
          } else {
            next[index] = entry;
          }
        }

        try {
          localStorage.setItem(directoryCacheKey, JSON.stringify({ provider, users: next, updatedAt: Date.now() }));
        } catch {}

        return next;
      });
    },
    [directoryCacheKey]
  );

  const handleSyncDirectory = useCallback(
    async (provider: 'microsoft') => {
      if (provider === 'microsoft' && !org?.microsoftWorkspaceConnected) {
        setDirectoryError('Microsoft is not connected in Integrations.');
        return;
      }

      setDirectoryLoading(true);
      setDirectoryError('');
      try {
        let result = await userService.startDirectoryImport(provider);
        if (!result.success && result.code === 'SSO_RECONNECT_REQUIRED' && org?.loginSubdomain) {
          const reconnect = await userService.connectWorkspaceProvider(provider, `${org.loginSubdomain}.velo.ai`);
          if (!reconnect.success) {
            setDirectoryError(reconnect.error || 'Could not reconnect Microsoft directory access.');
            return;
          }
          await onUpdateOrganizationSettings({
            microsoftWorkspaceConnected: reconnect.microsoftConnected,
            allowMicrosoftAuth: reconnect.microsoftAllowed
          });
          result = await userService.startDirectoryImport(provider);
        }

        if (!result.success || !result.users) {
          setDirectoryError(result.error || 'Could not sync directory.');
          return;
        }

        const seen = new Set<string>();
        const unique = result.users
          .filter((entry) => {
            const key = entry.externalId || normalizeEmail(entry.email);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .map((entry) => ({ ...entry, provider }));

        mergeDirectoryUsers(provider, unique);
      } finally {
        setDirectoryLoading(false);
      }
    },
    [mergeDirectoryUsers, onUpdateOrganizationSettings, org]
  );

  useEffect(() => {
    if (!org) return;
    try {
      const raw = localStorage.getItem(directoryCacheKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { users?: DirectoryEntry[] };
      if (Array.isArray(parsed.users)) setDirectoryUsers(parsed.users);
    } catch {}
  }, [directoryCacheKey, org]);

  return {
    directoryLoading,
    directoryUsers,
    directoryError,
    setDirectoryError,
    handleSyncDirectory
  };
};
