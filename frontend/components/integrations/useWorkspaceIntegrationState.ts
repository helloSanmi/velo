import { useCallback, useEffect, useState } from 'react';
import { Organization } from '../../types';
import { userService } from '../../services/userService';
import { ConnectingIntegrationProvider, ConnectingProvider, IntegrationConnectionsState } from './types';

const EMPTY_CONNECTIONS: IntegrationConnectionsState = {
  slackConnected: false,
  githubConnected: false
};

interface UseWorkspaceIntegrationStateOptions {
  org?: Organization | null;
  onUpdateOrganizationSettings?: (
    patch: Partial<Pick<Organization, 'allowMicrosoftAuth' | 'microsoftWorkspaceConnected'>>
  ) => Promise<void>;
}

export const useWorkspaceIntegrationState = ({ org, onUpdateOrganizationSettings }: UseWorkspaceIntegrationStateOptions) => {
  const [connectingProvider, setConnectingProvider] = useState<ConnectingProvider>(null);
  const [connectingIntegrationProvider, setConnectingIntegrationProvider] = useState<ConnectingIntegrationProvider>(null);
  const [integrationConnections, setIntegrationConnections] = useState<IntegrationConnectionsState>(EMPTY_CONNECTIONS);
  const [integrationError, setIntegrationError] = useState('');
  const [ssoError, setSsoError] = useState('');

  const refreshConnections = useCallback(async () => {
    const result = await userService.listIntegrationConnections();
    if (!result.success) {
      setIntegrationError(result.error || 'Could not load integration connections.');
      setIntegrationConnections(EMPTY_CONNECTIONS);
      return false;
    }
    setIntegrationError('');
    setIntegrationConnections({
      slackConnected: result.slackConnected,
      githubConnected: result.githubConnected,
      slackLabel: result.slackLabel,
      githubLabel: result.githubLabel
    });
    return true;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadConnections = async () => {
      const result = await userService.listIntegrationConnections();
      if (cancelled) return;
      if (!result.success) {
        setIntegrationError(result.error || 'Could not load integration connections.');
        setIntegrationConnections(EMPTY_CONNECTIONS);
        return;
      }
      setIntegrationError('');
      setIntegrationConnections({
        slackConnected: result.slackConnected,
        githubConnected: result.githubConnected,
        slackLabel: result.slackLabel,
        githubLabel: result.githubLabel
      });
    };
    void loadConnections();
    return () => {
      cancelled = true;
    };
  }, []);

  const connectProvider = useCallback(
    async (provider: 'microsoft') => {
      if (!org || !org.loginSubdomain || !onUpdateOrganizationSettings) return;
      setSsoError('');
      setConnectingProvider(provider);
      const result = await userService.connectWorkspaceProvider(provider, `${org.loginSubdomain}.velo.ai`);
      setConnectingProvider(null);
      if (!result.success) {
        setSsoError(result.error || 'Could not connect Microsoft SSO.');
        return;
      }
      await onUpdateOrganizationSettings({
        microsoftWorkspaceConnected: result.microsoftConnected,
        allowMicrosoftAuth: result.microsoftAllowed
      });
    },
    [onUpdateOrganizationSettings, org]
  );

  const connectIntegration = useCallback(
    async (provider: 'slack' | 'github') => {
      setIntegrationError('');
      setConnectingIntegrationProvider(provider);
      const result = await userService.connectIntegrationProvider(provider);
      setConnectingIntegrationProvider(null);
      if (!result.success) {
        setIntegrationError(result.error || `Could not connect ${provider === 'slack' ? 'Slack' : 'GitHub'}.`);
        return;
      }
      await refreshConnections();
    },
    [refreshConnections]
  );

  return {
    connectingProvider,
    connectingIntegrationProvider,
    integrationConnections,
    integrationError,
    ssoError,
    setIntegrationError,
    connectProvider,
    connectIntegration
  };
};
