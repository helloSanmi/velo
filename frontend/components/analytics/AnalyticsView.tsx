import React from 'react';
import { Sparkles } from 'lucide-react';
import { Project, Task, User } from '../../types';
import Button from '../ui/Button';
import AppSelect from '../ui/AppSelect';
import { AnalyticsPresetKey } from '../../services/analyticsPresetService';
import { useAnalyticsViewState } from './useAnalyticsViewState';
import AnalyticsRecommendationsPanel from './AnalyticsRecommendationsPanel';
import AnalyticsAiSummaryPanel from './AnalyticsAiSummaryPanel';
import { toastService } from '../../services/toastService';
import { ensureAiAccess } from '../../services/aiAccessService';

interface AnalyticsViewProps {
  tasks: Task[];
  projects: Project[];
  allUsers: User[];
  orgId: string;
  aiPlanEnabled: boolean;
  aiEnabled: boolean;
  onUpdateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>) => void;
}

const toCurrency = (value: number) =>
  value.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ tasks, projects, allUsers, orgId, aiPlanEnabled, aiEnabled, onUpdateTask }) => {
  const {
    currentUser,
    mobileFiltersOpen,
    setMobileFiltersOpen,
    selectedProjectId,
    setSelectedProjectId,
    selectedPreset,
    setSelectedPreset,
    setDismissedRecommendationIds,
    savedPresets,
    newPresetName,
    setNewPresetName,
    sharePreset,
    setSharePreset,
    insights,
    isCheckingAI,
    activeProjects,
    stats,
    spend,
    recommendations,
    runAIHealthAudit,
    saveCurrentPreset,
    applySavedPreset,
    removeSavedPreset,
    setLocalTaskPatches
  } = useAnalyticsViewState({ tasks, projects, allUsers, orgId, onUpdateTask });

  const handleRunAi = () => {
    if (!ensureAiAccess({ aiPlanEnabled, aiEnabled, featureLabel: 'AI analysis' })) return;
    runAIHealthAudit();
  };

  return (
    <div className="bg-[#f7f3f6] p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">Analytics</h2>
              <p className="mt-1 text-xs md:text-sm text-slate-600">Project health, risk, and recommended actions.</p>
            </div>
            <div className="md:hidden flex items-center gap-2">
              <Button onClick={handleRunAi} variant="secondary" disabled={isCheckingAI} className="h-10 px-3 text-sm flex-1">
                <Sparkles className={`mr-1.5 h-4 w-4 ${isCheckingAI ? 'animate-pulse' : ''}`} />
                {isCheckingAI ? 'Running AI…' : !aiPlanEnabled ? 'AI analysis: Pro' : 'Run AI analysis'}
              </Button>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen((prev) => !prev)}
                className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 whitespace-nowrap"
              >
                {mobileFiltersOpen ? 'Hide filters' : 'Filters'}
              </button>
            </div>
            <div className={`${mobileFiltersOpen ? 'block' : 'hidden'} md:hidden`}>
              <AppSelect
                value={selectedProjectId}
                onChange={setSelectedProjectId}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
                options={[
                  { value: 'all', label: 'All active projects' },
                  ...activeProjects.map((project) => ({ value: project.id, label: project.name }))
                ]}
              />
            </div>
            <div className="hidden md:flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
              <div className="min-w-[180px]">
                <AppSelect
                  value={selectedPreset}
                  onChange={(value) => setSelectedPreset(value as AnalyticsPresetKey)}
                  className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
                  options={[
                    { value: 'overview', label: 'Overview preset' },
                    { value: 'delivery', label: 'Delivery preset' },
                    { value: 'risk', label: 'Risk preset' },
                    { value: 'budget', label: 'Budget preset' }
                  ]}
                />
              </div>
              <div className="min-w-[220px]">
                <AppSelect
                  value={selectedProjectId}
                  onChange={setSelectedProjectId}
                  className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
                  options={[
                    { value: 'all', label: 'All active projects' },
                    ...activeProjects.map((project) => ({ value: project.id, label: project.name }))
                  ]}
                />
              </div>
              <Button onClick={handleRunAi} variant="secondary" disabled={isCheckingAI} className="h-9 px-3 text-sm">
                <Sparkles className={`mr-1.5 h-4 w-4 ${isCheckingAI ? 'animate-pulse' : ''}`} />
                {isCheckingAI ? 'Running AI…' : !aiPlanEnabled ? 'AI analysis: Pro' : 'Run AI analysis'}
              </Button>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={newPresetName}
                onChange={(event) => setNewPresetName(event.target.value)}
                placeholder="Save preset as..."
                className="h-8 w-44 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700"
              />
              <label className="inline-flex items-center gap-1 text-xs text-slate-600">
                <input type="checkbox" checked={sharePreset} onChange={(event) => setSharePreset(event.target.checked)} />
                Share
              </label>
              <button type="button" onClick={saveCurrentPreset} className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700 hover:bg-slate-50">
                Save preset
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {savedPresets.slice(0, 6).map((preset) => (
                <div key={preset.id} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
                  <button type="button" onClick={() => applySavedPreset(preset.id)} className="text-[11px] text-slate-700">
                    {preset.name}{preset.visibility === 'shared' ? ' (Shared)' : ''}
                  </button>
                  {preset.userId === currentUser?.id ? (
                    <button type="button" onClick={() => removeSavedPreset(preset.id)} className="text-[11px] text-rose-600">
                      ×
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-500">Completion</p>
            <p className="mt-1 text-lg md:text-xl font-semibold text-slate-900">{stats.completion}%</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-500">In progress</p>
            <p className="mt-1 text-lg md:text-xl font-semibold text-slate-900">{stats.inProgress}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-500">Overdue</p>
            <p className="mt-1 text-lg md:text-xl font-semibold text-rose-700">{stats.overdue}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-500">At risk</p>
            <p className="mt-1 text-lg md:text-xl font-semibold text-amber-700">{stats.atRisk}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-500">Total tasks</p>
            <p className="mt-1 text-lg md:text-xl font-semibold text-slate-900">{stats.total}</p>
          </div>
        </section>

        {spend ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Budget tracking</p>
            <p className="mt-1 text-sm text-slate-600">
              {spend.trackedHours.toFixed(1)}h tracked • {toCurrency(spend.trackedCost)} spent
              {spend.budget > 0 ? ` of ${toCurrency(spend.budget)} budget` : ''}
            </p>
          </section>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <AnalyticsRecommendationsPanel
            recommendations={recommendations}
            onDismiss={(id) => setDismissedRecommendationIds((prev) => (prev.includes(id) ? prev : [...prev, id]))}
            setLocalTaskPatches={setLocalTaskPatches}
          />
          <AnalyticsAiSummaryPanel insights={insights} />
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
