import React, { useMemo, useState } from 'react';
import { Github, Link2, MessageSquare, Search } from 'lucide-react';
import { Project } from '../types';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { dialogService } from '../services/dialogService';

interface IntegrationHubProps {
  projects: Project[];
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
  compact?: boolean;
}

type StatusFilter = 'All' | 'Connected' | 'Not Connected';

const IntegrationHub: React.FC<IntegrationHubProps> = ({ projects, onUpdateProject, compact = false }) => {
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId),
    [projects, selectedProjectId]
  );

  const toggleSlack = () => {
    if (!activeProject) return;
    const enabled = !activeProject.integrations?.slack?.enabled;
    onUpdateProject(activeProject.id, {
      integrations: {
        ...activeProject.integrations,
        slack: {
          enabled,
          channel: activeProject.integrations?.slack?.channel || 'general'
        }
      }
    });
  };

  const cards = [
    {
      id: 'slack',
      name: 'Slack',
      description: 'Send task updates to a Slack channel.',
      icon: <MessageSquare className="w-5 h-5" />,
      enabled: !!activeProject?.integrations?.slack?.enabled,
      actionLabel: activeProject?.integrations?.slack?.enabled ? 'Disconnect' : 'Connect',
      onClick: toggleSlack
    },
    {
      id: 'github',
      name: 'GitHub',
      description: 'Link commits and pull requests to tasks.',
      icon: <Github className="w-5 h-5" />,
      enabled: false,
      actionLabel: 'Coming soon',
      onClick: () => dialogService.notice('GitHub integration is not available yet.', { title: 'Integration unavailable' })
    },
    {
      id: 'jira',
      name: 'Jira',
      description: 'Sync issue status between Jira and Velo.',
      icon: <Link2 className="w-5 h-5" />,
      enabled: false,
      actionLabel: 'Coming soon',
      onClick: () => dialogService.notice('Jira integration is not available yet.', { title: 'Integration unavailable' })
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
          ) : (
            <p className="text-xs text-slate-500">Manage project integration connections.</p>
          )}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className={`bg-white border border-slate-300 ${compact ? 'rounded-lg px-2.5 py-1.5 text-xs w-full md:w-auto' : 'rounded-xl px-3 py-2 text-sm w-full md:w-auto'}`}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
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
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="h-10 w-full bg-white border border-slate-300 rounded-lg px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="All">All statuses</option>
              <option value="Connected">Connected</option>
              <option value="Not Connected">Not connected</option>
            </select>
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
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="h-10 bg-white border border-slate-300 rounded-lg px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="All">All statuses</option>
              <option value="Connected">Connected</option>
              <option value="Not Connected">Not connected</option>
            </select>
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
                    </div>
                    <Button
                      onClick={card.onClick}
                      variant={card.enabled ? 'outline' : 'primary'}
                      className="w-full"
                    >
                      {card.actionLabel}
                    </Button>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default IntegrationHub;
