import React from 'react';
import IntegrationConnectionsGrid from './integrations/IntegrationConnectionsGrid';
import IntegrationFilters from './integrations/IntegrationFilters';
import { IntegrationHubProps } from './integrations/types';
import { useIntegrationHubController } from './integrations/useIntegrationHubController';
import WorkspaceSsoSection from './integrations/WorkspaceSsoSection';

const IntegrationHub: React.FC<IntegrationHubProps> = ({
  projects,
  onUpdateProject,
  org,
  onUpdateOrganizationSettings,
  compact = false
}) => {
  const controller = useIntegrationHubController({
    projects,
    onUpdateProject,
    org,
    onUpdateOrganizationSettings
  });

  return (
    <div className={`flex-1 overflow-y-auto ${compact ? 'bg-transparent p-3 md:p-4' : 'bg-slate-50 p-4 md:p-8'} custom-scrollbar`}>
      <div className={compact ? 'max-w-none space-y-3' : 'max-w-6xl mx-auto space-y-6'}>
        {!compact ? (
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Integrations</h2>
            <p className="text-sm text-slate-600 mt-1">Connect your workspace with external tools.</p>
          </div>
        ) : null}

        {org && controller.onUpdateOrganizationSettings ? (
          <WorkspaceSsoSection
            org={org}
            ssoError={controller.ssoError}
            connectingProvider={controller.connectingProvider}
            onConnect={() => controller.handleConnectProvider('microsoft')}
            onToggleAllow={(checked) => controller.onUpdateOrganizationSettings?.({ allowMicrosoftAuth: checked })}
          />
        ) : null}

        <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <IntegrationFilters
            compact={compact}
            projects={projects}
            selectedProjectId={controller.selectedProjectId}
            setSelectedProjectId={controller.setSelectedProjectId}
            query={controller.query}
            setQuery={controller.setQuery}
            statusFilter={controller.statusFilter}
            setStatusFilter={controller.setStatusFilter}
            mobileFiltersOpen={controller.mobileFiltersOpen}
            setMobileFiltersOpen={controller.setMobileFiltersOpen}
          />

          <IntegrationConnectionsGrid
            cards={controller.filteredCards}
            githubRepo={controller.githubRepo}
            setGithubRepo={controller.setGithubRepo}
            slackChannel={controller.slackChannel}
            setSlackChannel={controller.setSlackChannel}
            slackConnected={controller.integrationConnections.slackConnected}
            githubConnected={controller.integrationConnections.githubConnected}
            onSaveSlackChannel={controller.saveSlackChannel}
            onSaveGitHubRepo={controller.saveGitHubRepo}
          />

          {controller.integrationError ? <p className="text-xs text-rose-600">{controller.integrationError}</p> : null}
        </section>
      </div>
    </div>
  );
};

export default IntegrationHub;
