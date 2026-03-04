import { useCallback, useEffect, useMemo, useState } from 'react';
import { Github, MessageSquare } from 'lucide-react';
import {
  IntegrationCardModel,
  IntegrationHubProps,
  StatusFilter
} from './types';
import { useWorkspaceIntegrationState } from './useWorkspaceIntegrationState';

export const useIntegrationHubController = ({
  projects,
  onUpdateProject,
  org,
  onUpdateOrganizationSettings
}: Pick<IntegrationHubProps, 'projects' | 'onUpdateProject' | 'org' | 'onUpdateOrganizationSettings'>) => {
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [githubRepo, setGithubRepo] = useState('');
  const [slackChannel, setSlackChannel] = useState('');

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId]
  );

  useEffect(() => {
    if (!activeProject) {
      setGithubRepo('');
      setSlackChannel('');
      return;
    }
    setGithubRepo(activeProject.integrations?.github?.repo || '');
    setSlackChannel(activeProject.integrations?.slack?.channel || 'general');
  }, [activeProject]);

  const {
    connectingProvider,
    connectingIntegrationProvider,
    integrationConnections,
    integrationError,
    ssoError,
    setIntegrationError,
    connectProvider,
    connectIntegration
  } = useWorkspaceIntegrationState({ org, onUpdateOrganizationSettings });

  const toggleSlack = useCallback(() => {
    if (!activeProject) return;
    if (!integrationConnections.slackConnected) {
      setIntegrationError('Connect Slack at workspace level first.');
      return;
    }
    const enabled = !activeProject.integrations?.slack?.enabled;
    onUpdateProject(activeProject.id, {
      integrations: {
        ...activeProject.integrations,
        slack: {
          enabled,
          channel: slackChannel.trim() || activeProject.integrations?.slack?.channel || 'general'
        }
      }
    });
  }, [activeProject, integrationConnections.slackConnected, onUpdateProject, slackChannel]);

  const toggleGitHub = useCallback(() => {
    if (!activeProject) return;
    if (!integrationConnections.githubConnected) {
      setIntegrationError('Connect GitHub at workspace level first.');
      return;
    }
    const enabled = !activeProject.integrations?.github?.enabled;
    onUpdateProject(activeProject.id, {
      integrations: {
        ...activeProject.integrations,
        github: {
          enabled,
          repo: githubRepo.trim() || activeProject.integrations?.github?.repo || 'org/repository'
        }
      }
    });
  }, [activeProject, githubRepo, integrationConnections.githubConnected, onUpdateProject]);

  const saveGitHubRepo = useCallback(() => {
    if (!activeProject || !integrationConnections.githubConnected) return;
    onUpdateProject(activeProject.id, {
      integrations: {
        ...activeProject.integrations,
        github: {
          enabled: !!activeProject.integrations?.github?.enabled,
          repo: githubRepo.trim() || 'org/repository'
        }
      }
    });
  }, [activeProject, githubRepo, integrationConnections.githubConnected, onUpdateProject]);

  const saveSlackChannel = useCallback(() => {
    if (!activeProject || !integrationConnections.slackConnected) return;
    onUpdateProject(activeProject.id, {
      integrations: {
        ...activeProject.integrations,
        slack: {
          enabled: !!activeProject.integrations?.slack?.enabled,
          channel: slackChannel.trim() || 'general'
        }
      }
    });
  }, [activeProject, integrationConnections.slackConnected, onUpdateProject, slackChannel]);

  const cards = useMemo<IntegrationCardModel[]>(
    () => [
      {
        id: 'slack',
        name: 'Slack',
        description: 'Send task updates to a Slack channel.',
        icon: <MessageSquare className="w-5 h-5" />,
        enabled: !!activeProject?.integrations?.slack?.enabled,
        workspaceConnected: integrationConnections.slackConnected,
        workspaceLabel: integrationConnections.slackLabel,
        actionLabel: !integrationConnections.slackConnected
          ? 'Connect workspace'
          : activeProject?.integrations?.slack?.enabled
            ? 'Disable for project'
            : 'Enable for project',
        onClick: integrationConnections.slackConnected ? toggleSlack : () => connectIntegration('slack'),
        isConnecting: connectingIntegrationProvider === 'slack'
      },
      {
        id: 'github',
        name: 'GitHub',
        description: 'Link commits and pull requests to tasks.',
        icon: <Github className="w-5 h-5" />,
        enabled: !!activeProject?.integrations?.github?.enabled,
        workspaceConnected: integrationConnections.githubConnected,
        workspaceLabel: integrationConnections.githubLabel,
        actionLabel: !integrationConnections.githubConnected
          ? 'Connect workspace'
          : activeProject?.integrations?.github?.enabled
            ? 'Disable for project'
            : 'Enable for project',
        onClick: integrationConnections.githubConnected ? toggleGitHub : () => connectIntegration('github'),
        isConnecting: connectingIntegrationProvider === 'github'
      }
    ],
    [
      activeProject,
      connectingIntegrationProvider,
      connectIntegration,
      integrationConnections.githubConnected,
      integrationConnections.githubLabel,
      integrationConnections.slackConnected,
      integrationConnections.slackLabel,
      toggleGitHub,
      toggleSlack
    ]
  );

  const filteredCards = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return cards.filter((card) => {
      const matchesQuery = !normalized || `${card.name} ${card.description}`.toLowerCase().includes(normalized);
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Connected' && card.enabled) ||
        (statusFilter === 'Not Connected' && !card.enabled);
      return matchesQuery && matchesStatus;
    });
  }, [cards, query, statusFilter]);

  return {
    selectedProjectId,
    setSelectedProjectId,
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    mobileFiltersOpen,
    setMobileFiltersOpen,
    githubRepo,
    setGithubRepo,
    slackChannel,
    setSlackChannel,
    connectingProvider,
    integrationConnections,
    integrationError,
    ssoError,
    filteredCards,
    saveGitHubRepo,
    saveSlackChannel,
    handleConnectProvider: connectProvider,
    onUpdateOrganizationSettings
  };
};
