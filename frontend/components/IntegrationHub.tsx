import React, { useEffect, useMemo, useState } from 'react';
import { Github, MessageSquare, Search } from 'lucide-react';
import { Organization, Project } from '../types';
import Button from './ui/Button';
import Badge from './ui/Badge';
import AppSelect from './ui/AppSelect';
import { userService } from '../services/userService';

interface IntegrationHubProps {
  projects: Project[];
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
  org?: Organization | null;
  onUpdateOrganizationSettings?: (patch: Partial<Pick<Organization, 'allowMicrosoftAuth' | 'microsoftWorkspaceConnected'>>) => Promise<void>;
  compact?: boolean;
}

type StatusFilter = 'All' | 'Connected' | 'Not Connected';

const MicrosoftLogo = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <rect x="3" y="3" width="8.5" height="8.5" fill="#F25022" />
    <rect x="12.5" y="3" width="8.5" height="8.5" fill="#7FBA00" />
    <rect x="3" y="12.5" width="8.5" height="8.5" fill="#00A4EF" />
    <rect x="12.5" y="12.5" width="8.5" height="8.5" fill="#FFB900" />
  </svg>
);

const IntegrationHub: React.FC<IntegrationHubProps> = ({ projects, onUpdateProject, org, onUpdateOrganizationSettings, compact = false }) => {
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [githubRepo, setGithubRepo] = useState('');
  const [slackChannel, setSlackChannel] = useState('');
  const [connectingProvider, setConnectingProvider] = useState<'microsoft' | null>(null);
  const [connectingIntegrationProvider, setConnectingIntegrationProvider] = useState<'slack' | 'github' | null>(null);
  const [integrationConnections, setIntegrationConnections] = useState<{ slackConnected: boolean; githubConnected: boolean; slackLabel?: string; githubLabel?: string }>({
    slackConnected: false,
    githubConnected: false
  });
  const [integrationError, setIntegrationError] = useState('');
  const [ssoError, setSsoError] = useState('');

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId),
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

  useEffect(() => {
    let cancelled = false;
    const loadConnections = async () => {
      const result = await userService.listIntegrationConnections();
      if (cancelled) return;
      if (!result.success) {
        setIntegrationError(result.error || 'Could not load integration connections.');
        setIntegrationConnections({ slackConnected: false, githubConnected: false });
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
    return () => { cancelled = true; };
  }, []);

  const toggleSlack = () => {
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
  };

  const toggleGitHub = () => {
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
  };

  const saveGitHubRepo = () => {
    if (!activeProject) return;
    if (!integrationConnections.githubConnected) return;
    onUpdateProject(activeProject.id, {
      integrations: {
        ...activeProject.integrations,
        github: {
          enabled: !!activeProject.integrations?.github?.enabled,
          repo: githubRepo.trim() || 'org/repository'
        }
      }
    });
  };

  const saveSlackChannel = () => {
    if (!activeProject) return;
    if (!integrationConnections.slackConnected) return;
    onUpdateProject(activeProject.id, {
      integrations: {
        ...activeProject.integrations,
        slack: {
          enabled: !!activeProject.integrations?.slack?.enabled,
          channel: slackChannel.trim() || 'general'
        }
      }
    });
  };

  const handleConnectProvider = async (provider: 'microsoft') => {
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
  };

  const handleConnectIntegration = async (provider: 'slack' | 'github') => {
    setIntegrationError('');
    setConnectingIntegrationProvider(provider);
    const result = await userService.connectIntegrationProvider(provider);
    setConnectingIntegrationProvider(null);
    if (!result.success) {
      setIntegrationError(result.error || `Could not connect ${provider === 'slack' ? 'Slack' : 'GitHub'}.`);
      return;
    }
    const refreshed = await userService.listIntegrationConnections();
    if (!refreshed.success) {
      setIntegrationError(refreshed.error || 'Connected, but could not refresh integration state.');
      return;
    }
    setIntegrationConnections({
      slackConnected: refreshed.slackConnected,
      githubConnected: refreshed.githubConnected,
      slackLabel: refreshed.slackLabel,
      githubLabel: refreshed.githubLabel
    });
  };

  const cards = [
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
        : activeProject?.integrations?.slack?.enabled ? 'Disable for project' : 'Enable for project',
      onClick: integrationConnections.slackConnected ? toggleSlack : () => handleConnectIntegration('slack'),
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
        : activeProject?.integrations?.github?.enabled ? 'Disable for project' : 'Enable for project',
      onClick: integrationConnections.githubConnected ? toggleGitHub : () => handleConnectIntegration('github'),
      isConnecting: connectingIntegrationProvider === 'github'
    }
  ];

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

  return (
    <div className={`flex-1 overflow-y-auto ${compact ? 'bg-transparent p-3 md:p-4' : 'bg-slate-50 p-4 md:p-8'} custom-scrollbar`}>
      <div className={`${compact ? 'max-w-none space-y-3' : 'max-w-6xl mx-auto space-y-6'}`}>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          {!compact ? (
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Integrations</h2>
              <p className="text-sm text-slate-600 mt-1">Connect your workspace with external tools.</p>
            </div>
          ) : null}
        </div>

        {org && onUpdateOrganizationSettings ? (
          <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Workspace SSO</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Configure organization-level Microsoft sign-in for {org.loginSubdomain || 'workspace'}.velo.ai.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <article className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2.5">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200">
                      <MicrosoftLogo />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Microsoft Entra ID</p>
                      <p className="text-[11px] text-slate-500">Org-wide sign-in provider</p>
                    </div>
                  </div>
                  <Badge variant={org.microsoftWorkspaceConnected ? 'emerald' : 'neutral'}>
                    {org.microsoftWorkspaceConnected ? 'Connected' : 'Not connected'}
                  </Badge>
                </div>
                <label className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 flex items-center justify-between">
                  <span className="text-xs text-slate-700">Consent / connection</span>
                  <Button
                    size="sm"
                    variant={org.microsoftWorkspaceConnected ? 'outline' : 'primary'}
                    className="!h-7 !px-2.5 !text-[11px]"
                    onClick={() => handleConnectProvider('microsoft')}
                    isLoading={connectingProvider === 'microsoft'}
                  >
                    {org.microsoftWorkspaceConnected ? 'Reconnect' : 'Connect'}
                  </Button>
                </label>
                <label className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 flex items-center justify-between">
                  <span className="text-xs text-slate-700">Allow user sign-in</span>
                  <input
                    type="checkbox"
                    checked={Boolean(org.allowMicrosoftAuth)}
                    onChange={(event) => onUpdateOrganizationSettings({ allowMicrosoftAuth: event.target.checked })}
                    disabled={!org.microsoftWorkspaceConnected}
                  />
                </label>
              </article>
            </div>
            {ssoError ? <p className="text-xs text-rose-600">{ssoError}</p> : null}
          </section>
        ) : null}

        <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">Manage project integration connections.</p>
            <div className={`${compact ? 'w-full sm:w-[220px]' : 'w-full sm:w-[260px]'}`}>
              <AppSelect
                value={selectedProjectId}
                onChange={setSelectedProjectId}
                className={`bg-white border border-slate-300 ${compact ? 'h-8 rounded-lg px-2.5 text-xs' : 'h-10 rounded-xl px-3 text-sm'}`}
                options={projects.map((p) => ({ value: p.id, label: p.name }))}
              />
            </div>
          </div>
          <div className="md:hidden flex items-center gap-2">
            <label className="h-10 bg-white border border-slate-300 rounded-lg px-3 flex items-center gap-2 flex-1 min-w-0">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter integrations"
                className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
              />
            </label>
            <button
              type="button"
              onClick={() => setMobileFiltersOpen((prev) => !prev)}
              className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 whitespace-nowrap"
            >
              {mobileFiltersOpen ? 'Hide filters' : 'Filters'}
            </button>
          </div>
          <div className={`${mobileFiltersOpen ? 'block' : 'hidden'} md:hidden mt-2`}>
            <AppSelect
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as StatusFilter)}
              className="h-10 w-full bg-white border border-slate-300 rounded-lg px-3 text-sm text-slate-700"
              options={[
                { value: 'All', label: 'All statuses' },
                { value: 'Connected', label: 'Connected' },
                { value: 'Not Connected', label: 'Not connected' }
              ]}
            />
          </div>
          <div className="hidden md:grid grid-cols-2 gap-2.5">
            <label className="h-10 bg-white border border-slate-300 rounded-lg px-3 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter integrations"
                className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
              />
            </label>
            <AppSelect
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as StatusFilter)}
              className="h-10 bg-white border border-slate-300 rounded-lg px-3 text-sm text-slate-700"
              options={[
                { value: 'All', label: 'All statuses' },
                { value: 'Connected', label: 'Connected' },
                { value: 'Not Connected', label: 'Not connected' }
              ]}
            />
          </div>

          {filteredCards.length === 0 ? (
            <div className="border border-slate-200 rounded-lg p-8 text-center text-sm text-slate-500">
              No integrations match these filters.
            </div>
          ) : (
            <div className="md:max-h-[62vh] overflow-y-auto custom-scrollbar pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCards.map((card) => (
                  <article key={card.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-lg bg-slate-100 text-slate-700">{card.icon}</div>
                      <Badge variant={card.enabled ? 'emerald' : 'neutral'}>
                        {card.enabled ? 'Connected' : 'Not Connected'}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">{card.name}</h3>
                      <p className="text-sm text-slate-600 mt-1">{card.description}</p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Workspace: {card.workspaceConnected ? `Connected${card.workspaceLabel ? ` (${card.workspaceLabel})` : ''}` : 'Not connected'}
                      </p>
                    </div>
                    {card.id === 'slack' ? (
                      <label className="block">
                        <span className="text-[11px] text-slate-500">Channel</span>
                        <input
                          value={slackChannel}
                          onChange={(event) => setSlackChannel(event.target.value)}
                          onBlur={saveSlackChannel}
                          placeholder="general"
                          disabled={!integrationConnections.slackConnected}
                          className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
                        />
                      </label>
                    ) : null}
                    {card.id === 'github' ? (
                      <label className="block">
                        <span className="text-[11px] text-slate-500">Repository</span>
                        <input
                          value={githubRepo}
                          onChange={(event) => setGithubRepo(event.target.value)}
                          onBlur={saveGitHubRepo}
                          placeholder="org/repository"
                          disabled={!integrationConnections.githubConnected}
                          className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
                        />
                      </label>
                    ) : null}
                    <Button
                      onClick={card.onClick}
                      variant={card.workspaceConnected ? (card.enabled ? 'outline' : 'primary') : 'primary'}
                      isLoading={card.isConnecting}
                      className="w-full"
                    >
                      {card.actionLabel}
                    </Button>
                  </article>
                ))}
              </div>
            </div>
          )}
          {integrationError ? <p className="text-xs text-rose-600">{integrationError}</p> : null}
        </section>
      </div>
    </div>
  );
};

export default IntegrationHub;
