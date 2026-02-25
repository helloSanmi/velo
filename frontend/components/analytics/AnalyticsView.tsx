import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Sparkles } from 'lucide-react';
import { Project, Task, TaskPriority, TaskStatus, User } from '../../types';
import Button from '../ui/Button';
import AppSelect from '../ui/AppSelect';
import { aiService } from '../../services/aiService';
import { aiJobService } from '../../services/aiJobService';
import { userService } from '../../services/userService';
import { toastService } from '../../services/toastService';
import { AnalyticsPreset, AnalyticsPresetKey, analyticsPresetService } from '../../services/analyticsPresetService';

interface AnalyticsViewProps {
  tasks: Task[];
  projects: Project[];
  allUsers: User[];
  orgId: string;
  onUpdateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>) => void;
}

interface Recommendation {
  id: string;
  title: string;
  detail: string;
  impact: 'high' | 'medium';
  taskIds: string[];
  applyLabel: string;
  apply: () => void;
}

const toCurrency = (value: number) =>
  value.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ tasks, projects, allUsers, orgId, onUpdateTask }) => {
  const currentUser = userService.getCurrentUser();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [selectedPreset, setSelectedPreset] = useState<AnalyticsPresetKey>('overview');
  const [savedPresets, setSavedPresets] = useState<AnalyticsPreset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [sharePreset, setSharePreset] = useState(false);
  const [insights, setInsights] = useState<{ bottlenecks: string[]; suggestions: string[] } | null>(null);
  const [isCheckingAI, setIsCheckingAI] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    setSavedPresets(analyticsPresetService.list(currentUser.id, orgId));
  }, [currentUser, orgId]);

  useEffect(() => {
    if (!currentUser) return;
    const key = `analytics-health:${selectedProjectId}`;
    setIsCheckingAI(aiJobService.isJobRunning(orgId, currentUser.id, key));
    const handler = () => setIsCheckingAI(aiJobService.isJobRunning(orgId, currentUser.id, key));
    window.addEventListener(aiJobService.eventName, handler);
    return () => window.removeEventListener(aiJobService.eventName, handler);
  }, [currentUser, orgId, selectedProjectId]);

  const activeProjects = useMemo(
    () => projects.filter((project) => !project.isArchived && !project.isCompleted && !project.isDeleted),
    [projects]
  );

  const selectedProject = useMemo(
    () => (selectedProjectId === 'all' ? null : activeProjects.find((project) => project.id === selectedProjectId) || null),
    [activeProjects, selectedProjectId]
  );

  useEffect(() => {
    if (selectedProjectId !== 'all' && !activeProjects.find((project) => project.id === selectedProjectId)) {
      setSelectedProjectId('all');
    }
  }, [activeProjects, selectedProjectId]);

  const scopedTasks = useMemo(() => {
    if (!selectedProject) return tasks;
    return tasks.filter((task) => task.projectId === selectedProject.id);
  }, [selectedProject, tasks]);

  const now = Date.now();
  const presetTasks = useMemo(() => {
    if (selectedPreset === 'overview') return scopedTasks;
    if (selectedPreset === 'delivery') {
      return scopedTasks.filter((task) => task.status !== TaskStatus.DONE || Boolean(task.dueDate && task.dueDate <= now + 14 * 86400000));
    }
    if (selectedPreset === 'risk') {
      return scopedTasks.filter(
        (task) =>
          Boolean(task.isAtRisk) ||
          Boolean(task.dueDate && task.dueDate < now && task.status !== TaskStatus.DONE) ||
          (task.priority === TaskPriority.HIGH && task.status !== TaskStatus.DONE)
      );
    }
    return scopedTasks.filter((task) => (task.timeLogged || 0) > 0);
  }, [now, scopedTasks, selectedPreset]);

  const stats = useMemo(() => {
    const total = presetTasks.length;
    const done = presetTasks.filter((task) => task.status === TaskStatus.DONE).length;
    const inProgress = presetTasks.filter((task) => task.status === TaskStatus.IN_PROGRESS).length;
    const overdue = presetTasks.filter((task) => Boolean(task.dueDate && task.dueDate < now && task.status !== TaskStatus.DONE)).length;
    const atRisk = presetTasks.filter((task) => task.isAtRisk).length;
    const completion = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, inProgress, overdue, atRisk, completion };
  }, [presetTasks, now]);

  const spend = useMemo(() => {
    if (!selectedProject?.hourlyRate) return null;
    const trackedHours = presetTasks.reduce((sum, task) => sum + ((task.timeLogged || 0) / 3600000), 0);
    return {
      trackedHours,
      trackedCost: trackedHours * selectedProject.hourlyRate,
      budget: selectedProject.budgetCost || 0
    };
  }, [presetTasks, selectedProject]);

  const recommendations = useMemo<Recommendation[]>(() => {
    const items: Recommendation[] = [];

    const overdueTaskIds = presetTasks
      .filter((task) => task.dueDate && task.dueDate < now && task.status !== TaskStatus.DONE)
      .map((task) => task.id);
    if (overdueTaskIds.length > 0) {
      items.push({
        id: 'mark-overdue-risk',
        title: 'Mark overdue tasks as at risk',
        detail: `${overdueTaskIds.length} overdue task${overdueTaskIds.length > 1 ? 's need' : ' needs'} visibility for faster triage.`,
        impact: 'high',
        taskIds: overdueTaskIds,
        applyLabel: 'Apply risk flag',
        apply: () => overdueTaskIds.forEach((taskId) => onUpdateTask(taskId, { isAtRisk: true }))
      });
    }

    const highTodoIds = presetTasks
      .filter((task) => task.priority === TaskPriority.HIGH && task.status === TaskStatus.TODO)
      .map((task) => task.id);
    if (highTodoIds.length > 0) {
      items.push({
        id: 'start-high-priority',
        title: 'Move high-priority backlog into progress',
        detail: `${highTodoIds.length} high-priority task${highTodoIds.length > 1 ? 's are' : ' is'} still in To Do.`,
        impact: 'medium',
        taskIds: highTodoIds,
        applyLabel: 'Move to in progress',
        apply: () => highTodoIds.forEach((taskId) => onUpdateTask(taskId, { status: TaskStatus.IN_PROGRESS }))
      });
    }

    if (selectedProject?.hourlyRate && selectedProject.budgetCost) {
      const trackedCost = presetTasks.reduce((sum, task) => sum + ((task.timeLogged || 0) / 3600000) * selectedProject.hourlyRate!, 0);
      if (trackedCost > selectedProject.budgetCost * 0.9) {
        const inProgressIds = presetTasks.filter((task) => task.status === TaskStatus.IN_PROGRESS).map((task) => task.id);
        if (inProgressIds.length > 0) {
          items.push({
            id: 'budget-risk',
            title: 'Budget nearing limit',
            detail: 'Current tracked cost is above 90% of budget. Mark in-progress tasks at risk to control burn.',
            impact: 'high',
            taskIds: inProgressIds,
            applyLabel: 'Flag in-progress tasks',
            apply: () => inProgressIds.forEach((taskId) => onUpdateTask(taskId, { isAtRisk: true }))
          });
        }
      }
    }

    return items.slice(0, 4);
  }, [now, onUpdateTask, presetTasks, selectedProject]);

  const runAIHealthAudit = async () => {
    if (!currentUser) return;
    const dedupeKey = `analytics-health:${selectedProjectId}`;
    setIsCheckingAI(true);
    await aiJobService.runJob({
      orgId,
      userId: currentUser.id,
      type: 'analytics_health',
      label: selectedProject ? `Analytics AI check for "${selectedProject.name}"` : 'Analytics AI check',
      dedupeKey,
      run: () => aiService.getHealthInsights(presetTasks, allUsers),
      onSuccess: (result) => {
        setInsights(result);
        toastService.success('AI analysis complete', 'Insights are ready.');
      },
      onError: () => toastService.error('AI analysis failed', 'Please retry in a moment.')
    });
    setIsCheckingAI(aiJobService.isJobRunning(orgId, currentUser.id, dedupeKey));
  };

  const saveCurrentPreset = () => {
    if (!currentUser) return;
    const name = newPresetName.trim();
    if (!name) {
      toastService.warning('Name required', 'Enter a preset name.');
      return;
    }
    analyticsPresetService.create({
      userId: currentUser.id,
      orgId,
      name,
      key: selectedPreset,
      selectedProjectId,
      visibility: sharePreset ? 'shared' : 'personal'
    });
    setSavedPresets(analyticsPresetService.list(currentUser.id, orgId));
    setNewPresetName('');
    setSharePreset(false);
    toastService.success('Preset saved', `"${name}" saved.`);
  };

  const applySavedPreset = (presetId: string) => {
    const preset = savedPresets.find((item) => item.id === presetId);
    if (!preset) return;
    setSelectedPreset(preset.key);
    setSelectedProjectId(preset.selectedProjectId);
  };

  const removeSavedPreset = (presetId: string) => {
    if (!currentUser) return;
    analyticsPresetService.remove(currentUser.id, orgId, presetId);
    setSavedPresets(analyticsPresetService.list(currentUser.id, orgId));
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
              <Button onClick={runAIHealthAudit} variant="secondary" disabled={isCheckingAI} className="h-10 px-3 text-sm flex-1">
                <Sparkles className={`mr-1.5 h-4 w-4 ${isCheckingAI ? 'animate-pulse' : ''}`} />
                {isCheckingAI ? 'Running AI…' : 'Run AI analysis'}
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
              <Button onClick={runAIHealthAudit} variant="secondary" disabled={isCheckingAI} className="h-9 px-3 text-sm">
                <Sparkles className={`mr-1.5 h-4 w-4 ${isCheckingAI ? 'animate-pulse' : ''}`} />
                {isCheckingAI ? 'Running AI…' : 'Run AI analysis'}
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
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Actionable recommendations</h3>
              <span className="text-xs text-slate-500">{recommendations.length} actions</span>
            </div>
            <div className="space-y-2.5">
              {recommendations.length === 0 ? (
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  No immediate actions. This project is currently stable.
                </p>
              ) : (
                recommendations.map((recommendation) => (
                  <div key={recommendation.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{recommendation.title}</p>
                        <p className="mt-0.5 text-xs text-slate-600">{recommendation.detail}</p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          recommendation.impact === 'high' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {recommendation.impact} impact
                      </span>
                    </div>
                    <div className="mt-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <p className="text-xs text-slate-500">{recommendation.taskIds.length} task(s)</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5 text-xs"
                        onClick={() => {
                          recommendation.apply();
                          toastService.success('Recommendation applied', recommendation.title);
                        }}
                      >
                        {recommendation.applyLabel}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">AI summary</h3>
              <Clock3 className="h-4 w-4 text-slate-400" />
            </div>
            {insights ? (
              <div className="space-y-2">
                {insights.bottlenecks.map((item, idx) => (
                  <div key={`b-${idx}`} className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-sm text-rose-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
                {insights.suggestions.map((item, idx) => (
                  <div key={`s-${idx}`} className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-sm text-emerald-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Run AI analysis to get project-specific bottlenecks and recommendations.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
