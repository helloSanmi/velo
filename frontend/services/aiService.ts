import { Project, Task, TaskPriority, TaskStatus, User } from '../types';
import { apiRequest } from './apiClient';
import { userService } from './userService';

const parseJsonText = <T>(text: string): T | null => {
  try {
    const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(clean) as T;
  } catch {
    return null;
  }
};

const backendGenerateRaw = async (feature: string, prompt: string): Promise<string | null> => {
  const currentUser = userService.getCurrentUser();
  if (!currentUser) return null;
  try {
    const result = await apiRequest<{ content: string }>(`/orgs/${currentUser.orgId}/ai/generate`, {
      method: 'POST',
      body: { feature, prompt }
    });
    return result.content || null;
  } catch {
    return null;
  }
};

const backendGenerateJson = async <T>(feature: string, prompt: string): Promise<T | null> => {
  const content = await backendGenerateRaw(feature, prompt);
  if (!content) return null;
  return parseJsonText<T>(content);
};

const fallbackProjectTasks = (
  projectName: string,
  projectBrief: string,
  taskCount: number
): Array<{ title: string; description: string; priority: TaskPriority; tags: string[] }> => {
  const safeCount = Math.min(Math.max(taskCount || 8, 1), 20);
  const name = (projectName || 'New Project').trim();
  const brief = (projectBrief || '').trim();
  const snippet = brief ? brief.slice(0, 180) : `Deliver ${name} with clear milestones.`;
  const base = [
    { title: `Define scope for ${name}`, description: `Document goals and constraints. ${snippet}`, priority: TaskPriority.HIGH, tags: ['Scope', 'Planning'] },
    { title: 'Break down delivery phases', description: 'Split execution into phases, owners, and timelines.', priority: TaskPriority.HIGH, tags: ['Planning', 'Delivery'] },
    { title: 'Design and technical review', description: 'Review solution approach and dependencies.', priority: TaskPriority.MEDIUM, tags: ['Design', 'Review'] },
    { title: 'Implement core work', description: 'Build the highest-impact deliverables first.', priority: TaskPriority.HIGH, tags: ['Build'] },
    { title: 'QA and readiness', description: 'Validate requirements and fix defects before release.', priority: TaskPriority.MEDIUM, tags: ['QA'] },
    { title: 'Release and monitor', description: 'Roll out and monitor results with rapid issue response.', priority: TaskPriority.MEDIUM, tags: ['Release', 'Monitoring'] }
  ];
  if (safeCount <= base.length) return base.slice(0, safeCount);
  const extras = Array.from({ length: safeCount - base.length }, (_, idx) => ({
    title: `Execution checkpoint ${idx + 1}`,
    description: 'Validate milestone progress and remove blockers.',
    priority: TaskPriority.MEDIUM,
    tags: ['Tracking']
  }));
  return [...base, ...extras];
};

const fallbackDueDate = () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const normalizeSuggestedDate = (value?: string): string | null => {
  if (!value) return null;
  const clean = value.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return null;
  const parsed = new Date(`${clean}T00:00:00`);
  if (!Number.isFinite(parsed.getTime())) return null;
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (parsed.getTime() < todayStart) return null;
  return clean;
};

interface BoardContext {
  projects?: Project[];
  activeProjectId?: string | null;
  currentUserName?: string;
  responseStyle?: 'concise' | 'action_plan' | 'executive';
}

export type VoiceActionType =
  | 'switch_project'
  | 'create_task'
  | 'set_status'
  | 'set_priority'
  | 'assign_task';

export interface VoiceActionPlanItem {
  type: VoiceActionType;
  label: string;
  taskId?: string;
  projectId?: string | null;
  status?: string;
  priority?: TaskPriority;
  assigneeId?: string;
  title?: string;
  description?: string;
  tags?: string[];
}

const summarizeBoard = (tasks: Task[], projects: Project[], activeProjectId?: string | null) => {
  const scopedTasks = activeProjectId ? tasks.filter((task) => task.projectId === activeProjectId) : tasks;
  const now = Date.now();
  const open = scopedTasks.filter((task) => task.status !== TaskStatus.DONE);
  const overdue = open.filter((task) => Boolean(task.dueDate && task.dueDate < now));
  const high = open.filter((task) => task.priority === TaskPriority.HIGH);
  const atRisk = open.filter((task) => Boolean(task.isAtRisk));
  const activeProject = activeProjectId ? projects.find((project) => project.id === activeProjectId) : undefined;
  return {
    label: activeProject ? activeProject.name : 'All projects',
    total: scopedTasks.length,
    open: open.length,
    done: scopedTasks.length - open.length,
    overdue,
    high,
    atRisk
  };
};

const normalizeCopilotReply = (reply: string): string => {
  const lines = reply
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const dedupedLines = lines.filter((line) => {
    const key = line.toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return dedupedLines.join('\n').trim();
};

const isProjectSummaryPrompt = (prompt: string): boolean =>
  /tell me about|more about|about this project|project summary|summary|overview|project details|details on this project|progress|status|how are we doing|where are we/i.test(
    prompt
  );
const isPriorityPrompt = (prompt: string): boolean =>
  /priority|priorities|what.*priority|which.*priority|focus first|order of work|what should we prioritize|top items/i.test(prompt);
const isOwnershipPrompt = (prompt: string): boolean =>
  /who.*own|who.*assigned|ownership|assignee|who is working|who is handling|who is on this project|project members|team members|owners/i.test(prompt);
const isBlockerPrompt = (prompt: string): boolean =>
  /blocker|blocked|stuck|what is blocking|dependency|dependencies/i.test(prompt);
const isRiskPrompt = (prompt: string): boolean =>
  /risk|at risk|delivery risk|health|project health|red flags|warning signs/i.test(prompt);
const isDueSoonPrompt = (prompt: string): boolean =>
  /due soon|this week|next 7 days|deadline|upcoming due/i.test(prompt);
const isCompletionPrompt = (prompt: string): boolean =>
  /can we complete|when can we complete|completion forecast|how close|ready to complete/i.test(prompt);
const isProgressPrompt = (prompt: string): boolean =>
  /what can we do|what can i do|how do we progress|move forward|next step|next steps|next action|where do we start|what should we do this week|unstick|unblock|accelerate|speed up|deliver faster|progress|improve.*delivery|improve.*project|improve this project|improve delivery|optimi[sz]e.*delivery|advance.*project|build momentum/i.test(
    prompt
  );
const isActionablePrompt = (prompt: string): boolean =>
  /create|add|move|mark|set|assign|priorit|start|complete|progress|blocker|due|switch|improve|delivery|optimi[sz]e|faster|next action|what should we do|where do we start/i.test(prompt);

const getScopedTasksForContext = (tasks: Task[], context: BoardContext): Task[] =>
  context.activeProjectId ? tasks.filter((task) => task.projectId === context.activeProjectId) : tasks;

const inferStatusTargets = (tasks: Task[]) => {
  const unique = Array.from(new Set(tasks.map((task) => String(task.status || '').toLowerCase()).filter(Boolean)));
  const done = unique.find((status) => status.includes('done') || status.includes('complete')) || TaskStatus.DONE;
  const inProgress = unique.find((status) => status.includes('in-progress') || status.includes('progress') || status.includes('doing')) || 'in-progress';
  return { done, inProgress };
};

const buildLocalActionSuggestions = (prompt: string, tasks: Task[], context: BoardContext): VoiceActionPlanItem[] => {
  const scopedTasks = getScopedTasksForContext(tasks, context);
  if (scopedTasks.length === 0) return [];
  const openTasks = scopedTasks.filter((task) => task.status !== TaskStatus.DONE);
  const { done, inProgress } = inferStatusTargets(scopedTasks);
  const actions: VoiceActionPlanItem[] = [];

  if ((isPriorityPrompt(prompt) || /priorit|focus first/i.test(prompt)) && openTasks.length > 0) {
    const promote = openTasks.find((task) => task.priority !== TaskPriority.HIGH);
    if (promote) {
      actions.push({
        type: 'set_priority',
        taskId: promote.id,
        priority: TaskPriority.HIGH,
        label: `Raise "${promote.title}" to High priority`
      });
    }
  }

  if ((/progress|next step|next action|move forward|unstick|unblock|accelerate|deliver faster|improve.*delivery|improve.*project|optimi[sz]e.*delivery|where do we start|what should we do this week/i.test(prompt) || isCompletionPrompt(prompt)) && openTasks.length > 0) {
    const candidate = openTasks.find((task) => String(task.status).toLowerCase() !== String(inProgress).toLowerCase()) || openTasks[0];
    if (candidate) {
      actions.push({
        type: 'set_status',
        taskId: candidate.id,
        status: String(candidate.status).toLowerCase().includes('progress') ? done : inProgress,
        label: `Move "${candidate.title}" forward`
      });
    }
  }

  if (/create|add/i.test(prompt)) {
    actions.push({
      type: 'create_task',
      projectId: context.activeProjectId || undefined,
      title: 'Follow-up action from Copilot',
      description: `Created from prompt: "${prompt.trim().slice(0, 120)}"`,
      priority: TaskPriority.MEDIUM,
      tags: ['Copilot'],
      label: 'Create a follow-up task from this request'
    });
  }

  return actions.slice(0, 3);
};

const localBoardAssistant = (latestPrompt: string, tasks: Task[], projects: Project[], activeProjectId?: string | null) => {
  const prompt = latestPrompt.toLowerCase();
  const summary = summarizeBoard(tasks, projects, activeProjectId);
  const scopedTasks = activeProjectId ? tasks.filter((task) => task.projectId === activeProjectId) : tasks;
  const completionRate = summary.total > 0 ? Math.round((summary.done / summary.total) * 100) : 0;
  const unassignedOpen = scopedTasks.filter(
    (task) => task.status !== TaskStatus.DONE && (!Array.isArray(task.assigneeIds) || task.assigneeIds.length === 0)
  );
  const nextFocus = scopedTasks
    .filter((task) => task.status !== TaskStatus.DONE)
    .sort((a, b) => {
      const priorityWeight = (task: Task) => (task.priority === TaskPriority.HIGH ? 3 : task.priority === TaskPriority.MEDIUM ? 2 : 1);
      return priorityWeight(b) - priorityWeight(a);
    })
    .slice(0, 3);

  const isSummaryPrompt = isProjectSummaryPrompt(latestPrompt);
  const asksForProgress = isProgressPrompt(latestPrompt);

  if (isSummaryPrompt) {
    const riskLevel = summary.overdue.length > 0 || summary.atRisk.length > 0 || summary.high.length >= 3 ? 'High' : summary.high.length > 0 ? 'Medium' : 'Low';
    const actions: string[] = [];
    if (summary.overdue.length > 0) actions.push(`Resolve overdue items first (${summary.overdue.length}).`);
    if (summary.atRisk.length > 0) actions.push(`Review at-risk tasks with owners (${summary.atRisk.length}).`);
    if (unassignedOpen.length > 0) actions.push(`Assign owners for unassigned open tasks (${unassignedOpen.length}).`);
    if (summary.high.length > 0) actions.push(`Prioritize and close high-priority open tasks (${summary.high.length}).`);
    if (actions.length === 0 && summary.open === 0) actions.push('All tasks are done. Project is ready for completion or handoff.');
    if (actions.length === 0) actions.push('Keep current execution pace and monitor due dates.');

    const actionPlanReply = [
      `Project snapshot (${summary.label}):`,
      `- Progress: ${summary.done}/${summary.total} done (${completionRate}%)`,
      `- Open: ${summary.open} (high priority: ${summary.high.length}, overdue: ${summary.overdue.length}, at risk: ${summary.atRisk.length})`,
      `- Risk level: ${riskLevel}`,
      '',
      'Current focus:',
      ...(nextFocus.length > 0
        ? nextFocus.map((task) => `- ${task.title} [${task.priority}]${task.dueDate ? ` (due ${new Date(task.dueDate).toLocaleDateString()})` : ''}`)
        : ['- No open tasks.']),
      '',
      'Next actions:',
      ...actions.slice(0, 4).map((action) => `- ${action}`),
      '',
      'Ask next: "Show overdue tasks", "Show blockers", or "What should we do this week?"'
    ].join('\n');
    return actionPlanReply;
  }

  if (asksForProgress) {
    const inProgress = scopedTasks.filter((task) => task.status !== TaskStatus.DONE);
    const topOpen = inProgress
      .slice()
      .sort((a, b) => {
        const priorityWeight = (task: Task) => (task.priority === TaskPriority.HIGH ? 3 : task.priority === TaskPriority.MEDIUM ? 2 : 1);
        return priorityWeight(b) - priorityWeight(a);
      })
      .slice(0, 3);
    const needsOwner = inProgress.filter((task) => !Array.isArray(task.assigneeIds) || task.assigneeIds.length === 0).slice(0, 2);
    const overdue = summary.overdue.slice(0, 2);
    const blockedOrAtRisk = scopedTasks
      .filter((task) => task.status !== TaskStatus.DONE && (Boolean(task.isAtRisk) || Boolean(task.blockedByIds?.length)))
      .slice(0, 2);

    const nextMoves: string[] = [];
    overdue.forEach((task) => nextMoves.push(`Close overdue task "${task.title}" first.`));
    topOpen.forEach((task) => nextMoves.push(`Push "${task.title}" to done with a clear owner and target date.`));
    needsOwner.forEach((task) => nextMoves.push(`Assign an owner to "${task.title}" before next update.`));
    if (nextMoves.length === 0) nextMoves.push('Project is clear. Keep momentum and close the remaining work this sprint.');

    return [
      `Progress plan (${summary.label}):`,
      `- Current state: ${summary.done}/${summary.total} done, ${summary.open} still open.`,
      `- Main bottleneck: ${summary.high.length > 0 ? `${summary.high.length} high-priority open task(s).` : 'No critical blockers flagged.'}`,
      `- Delivery health: ${summary.overdue.length > 0 || blockedOrAtRisk.length > 0 ? 'At risk' : 'Stable'}.`,
      '',
      'Where execution is stuck:',
      ...(blockedOrAtRisk.length > 0
        ? blockedOrAtRisk.map((task) => {
            const reason = task.blockedByIds?.length ? `${task.blockedByIds.length} dependency blocker(s)` : 'risk flag raised';
            return `- ${task.title} (${reason})`;
          })
        : ['- No hard blockers currently flagged in board data.']),
      '',
      'Next 3 moves:',
      ...nextMoves.slice(0, 3).map((item) => `- ${item}`),
      '',
      'Outcome target:',
      `- Reduce open tasks from ${summary.open} to ${Math.max(0, summary.open - Math.min(2, summary.open))} in the next cycle.`
    ].join('\n');
  }

  if (isOwnershipPrompt) {
    const openTasks = scopedTasks.filter((task) => task.status !== TaskStatus.DONE);
    const assigned = openTasks.filter((task) => Array.isArray(task.assigneeIds) && task.assigneeIds.length > 0);
    const unassigned = openTasks.filter((task) => !Array.isArray(task.assigneeIds) || task.assigneeIds.length === 0);
    return [
      `Ownership view (${summary.label}):`,
      `- Open tasks: ${openTasks.length}`,
      `- Assigned: ${assigned.length}`,
      `- Unassigned: ${unassigned.length}`,
      '',
      'Needs owner now:',
      ...(unassigned.slice(0, 5).map((task) => `- ${task.title} [${task.priority}]`) || ['- None']),
      '',
      'Action:',
      '- Assign owners for all unassigned high-priority tasks first.'
    ].join('\n');
  }

  if (isBlockerPrompt) {
    const blockedTasks = scopedTasks.filter(
      (task) =>
        task.status !== TaskStatus.DONE &&
        ((Array.isArray(task.blockedByIds) && task.blockedByIds.length > 0) || Boolean(task.isAtRisk))
    );
    if (blockedTasks.length === 0) {
      return `No active blockers detected in ${summary.label}.`;
    }
    return [
      `Blockers (${summary.label}):`,
      ...blockedTasks.slice(0, 6).map((task) => {
        const deps = Array.isArray(task.blockedByIds) ? task.blockedByIds.length : 0;
        return `- ${task.title} [${task.priority}]${deps > 0 ? ` (${deps} dependency blocker${deps > 1 ? 's' : ''})` : ''}`;
      }),
      '',
      'Action:',
      '- Resolve dependency blockers first, then re-check risk flags.'
    ].join('\n');
  }

  if (isDueSoonPrompt) {
    const now = Date.now();
    const next7Days = now + 7 * 24 * 60 * 60 * 1000;
    const dueSoon = scopedTasks.filter(
      (task) => task.status !== TaskStatus.DONE && Boolean(task.dueDate && task.dueDate >= now && task.dueDate <= next7Days)
    );
    if (dueSoon.length === 0) return `No tasks due in the next 7 days for ${summary.label}.`;
    return [
      `Due this week (${summary.label}):`,
      ...dueSoon
        .slice(0, 6)
        .sort((a, b) => (a.dueDate || Number.MAX_SAFE_INTEGER) - (b.dueDate || Number.MAX_SAFE_INTEGER))
        .map((task) => `- ${task.title} [${task.priority}] (due ${new Date(task.dueDate as number).toLocaleDateString()})`),
      '',
      'Action:',
      '- Pull high-priority due items to top of today’s execution list.'
    ].join('\n');
  }

  if (isCompletionPrompt) {
    const openTasks = scopedTasks.filter((task) => task.status !== TaskStatus.DONE);
    const highOpen = openTasks.filter((task) => task.priority === TaskPriority.HIGH);
    return [
      `Completion check (${summary.label}):`,
      `- Done: ${summary.done}/${summary.total}`,
      `- Remaining open: ${openTasks.length}`,
      `- High-priority still open: ${highOpen.length}`,
      '',
      openTasks.length === 0 ? '- Project is ready for completion review.' : '- Not ready for completion yet.',
      'Action:',
      `- Close the remaining ${openTasks.length} open task${openTasks.length === 1 ? '' : 's'} first.`
    ].join('\n');
  }

  if (prompt.includes('overdue') || prompt.includes('late')) {
    if (summary.overdue.length === 0) return `No overdue tasks in ${summary.label}.`;
    return [
      `Overdue in ${summary.label}:`,
      ...summary.overdue.slice(0, 6).map((task) => `- ${task.title} (${task.priority})`),
      '',
      'Action:',
      '- Start with the oldest overdue task, then re-check workload and due dates.'
    ].join('\n');
  }

  if (prompt.includes('high') || prompt.includes('priority')) {
    if (summary.open === 0) return `All tasks are done in ${summary.label}. No open priorities right now.`;
    const openTasks = scopedTasks.filter((task) => task.status !== TaskStatus.DONE);
    const high = openTasks.filter((task) => task.priority === TaskPriority.HIGH);
    const medium = openTasks.filter((task) => task.priority === TaskPriority.MEDIUM);
    const low = openTasks.filter((task) => task.priority === TaskPriority.LOW);
    const priorityOrder = [...high, ...medium, ...low].slice(0, 6);
    return [
      `Priority queue (${summary.label}):`,
      `- High: ${high.length}, Medium: ${medium.length}, Low: ${low.length}`,
      '',
      'Work in this order:',
      ...priorityOrder.map((task) => `- ${task.title} [${task.priority}]${task.dueDate ? ` (due ${new Date(task.dueDate).toLocaleDateString()})` : ''}`),
      '',
      'Action:',
      '- Finish high-priority items first, then medium, then low.'
    ].join('\n');
  }

  if (prompt.includes('risk') || prompt.includes('blocked')) {
    if (summary.atRisk.length === 0) return `No tasks currently marked at risk in ${summary.label}.`;
    return [
      `At-risk tasks in ${summary.label}:`,
      ...summary.atRisk.slice(0, 6).map((task) => `- ${task.title}`),
      '',
      'Action:',
      '- Review blockers and reduce scope or reassign support where needed.'
    ].join('\n');
  }

  return [
    `Board summary (${summary.label}):`,
    `- Total: ${summary.total}`,
    `- Open: ${summary.open}`,
    `- Done: ${summary.done}`,
    `- Overdue: ${summary.overdue.length}`,
    `- High priority open: ${summary.high.length}`,
    `- At risk: ${summary.atRisk.length}`,
    '',
    'Try: "Show overdue tasks", "List high priority", or "What is at risk?"'
  ].join('\n');
};

const isVagueCopilotReply = (reply: string, prompt: string, scopedTasks: Task[]): boolean => {
  const normalized = (reply || '').toLowerCase().trim();
  if (!normalized) return true;
  const genericSignals = [
    'focus on the tasks',
    'ensure they are completed',
    'may help expedite',
    'it depends',
    'generally',
    'in general',
    'are levels of importance',
    'help determine the order'
  ];
  const hasGenericSignal = genericSignals.some((token) => normalized.includes(token));
  const mentionsTaskTitle = scopedTasks.some((task) => task.title && normalized.includes(task.title.toLowerCase()));
  const hasNumericEvidence = /\b\d+\b/.test(normalized);
  const asksForProgress = isProgressPrompt(prompt);
  const asksForPriority = isPriorityPrompt(prompt);
  const asksForOwnership = isOwnershipPrompt(prompt);
  const asksForBlockers = isBlockerPrompt(prompt);
  const asksForRisk = isRiskPrompt(prompt);
  const asksForDueSoon = isDueSoonPrompt(prompt);
  const asksForCompletion = isCompletionPrompt(prompt);
  if (asksForProgress && (!mentionsTaskTitle || !hasNumericEvidence)) return true;
  if (asksForPriority && (!mentionsTaskTitle || !hasNumericEvidence)) return true;
  if (asksForOwnership && (!mentionsTaskTitle || !hasNumericEvidence)) return true;
  if (asksForBlockers && (!mentionsTaskTitle || !hasNumericEvidence)) return true;
  if (asksForRisk && (!mentionsTaskTitle || !hasNumericEvidence)) return true;
  if (asksForDueSoon && (!mentionsTaskTitle || !hasNumericEvidence)) return true;
  if (asksForCompletion && (!mentionsTaskTitle || !hasNumericEvidence)) return true;
  return hasGenericSignal && !mentionsTaskTitle;
};

export const aiService = {
  async generateProjectTasksFromBrief(projectName: string, projectBrief: string, taskCount: number) {
    const safeCount = Math.min(Math.max(taskCount || 8, 1), 20);
    const backend = await backendGenerateJson<{ tasks: Array<{ title: string; description: string; priority: TaskPriority; tags: string[] }> }>(
      'project_tasks_from_brief',
      `Generate exactly ${safeCount} implementation tasks as JSON: {"tasks":[{title,description,priority,tags[]}]}.
Project: ${projectName || 'Untitled'}
Brief: ${projectBrief || 'No brief provided'}`
    );
    if (backend?.tasks?.length) return backend.tasks;
    return fallbackProjectTasks(projectName, projectBrief, safeCount);
  },

  async breakDownTask(title: string, description: string): Promise<string[]> {
    const backend = await backendGenerateJson<{ steps: string[] }>(
      'task_breakdown',
      `Return JSON {"steps":string[]} with 3-5 concise actions.
Task title: ${title}
Task description: ${description}`
    );
    if (backend?.steps?.length) return backend.steps;
    return ['Clarify outcome', 'Break into execution steps', 'Validate and close'];
  },

  async suggestTags(title: string, description: string): Promise<string[]> {
    const backend = await backendGenerateJson<{ tags: string[] }>(
      'task_tags',
      `Return JSON {"tags":string[]} with 2-4 short tags.
Title: ${title}
Description: ${description}`
    );
    if (backend?.tags?.length) return backend.tags;
    return ['Task'];
  },

  async draftTaskDescription(title: string): Promise<string> {
    const backend = await backendGenerateRaw(
      'task_description',
      `Draft a concise professional task description for: ${title}.
Include objective, success criteria, and dependencies in plain text.`
    );
    if (backend?.trim()) return backend.trim();
    return 'Objective: Define the expected outcome.\nSuccess criteria: Clear measurable completion signal.\nDependencies: List prerequisite inputs and owners.';
  },

  async predictRisk(task: Task): Promise<{ isAtRisk: boolean; reason: string }> {
    const backend = await backendGenerateJson<{ isAtRisk: boolean; reason: string }>(
      'task_risk',
      `Return JSON {"isAtRisk":boolean,"reason":string}.
Task: ${task.title}
Status: ${task.status}
Priority: ${task.priority}
DueDate: ${task.dueDate || 'none'}
TimeLoggedMs: ${task.timeLogged || 0}`
    );
    if (backend && typeof backend.isAtRisk === 'boolean') return backend;
    const isAtRisk = task.priority === TaskPriority.HIGH && task.status !== TaskStatus.DONE;
    return { isAtRisk, reason: isAtRisk ? 'High-priority item still open.' : 'No immediate risk signals.' };
  },

  async suggestTriage(tasks: Task[]): Promise<string[]> {
    const context = tasks.map((task) => ({ id: task.id, title: task.title, priority: task.priority, status: task.status }));
    const backend = await backendGenerateJson<string[]>(
      'task_triage',
      `Return JSON array of task IDs ordered for execution.
Tasks: ${JSON.stringify(context.slice(0, 80))}`
    );
    if (Array.isArray(backend) && backend.length > 0) return backend;
    return tasks
      .slice()
      .sort((a, b) => {
        const score = (task: Task) => (task.priority === TaskPriority.HIGH ? 3 : task.priority === TaskPriority.MEDIUM ? 2 : 1);
        return score(b) - score(a);
      })
      .map((task) => task.id);
  },

  async chatWithBoard(
    history: { role: 'user' | 'model'; content: string }[],
    tasks: Task[],
    context: BoardContext = {}
  ): Promise<string> {
    const latest = history[history.length - 1]?.content || 'Summarize board status.';
    const recentHistory = history.slice(-8);
    const projects = context.projects || [];
    const scopedTasks = context.activeProjectId ? tasks.filter((task) => task.projectId === context.activeProjectId) : tasks;
    const activeProject = context.activeProjectId
      ? projects.find((project) => project.id === context.activeProjectId)
      : undefined;
    const boardSummary = summarizeBoard(tasks, projects, context.activeProjectId);
    const responseStyle = context.responseStyle || 'action_plan';
    const styleInstruction =
      responseStyle === 'concise'
        ? 'Style: concise. Use 3-5 bullets max and keep the response short.'
        : responseStyle === 'executive'
          ? 'Style: executive. Start with outcome, then risks and decisions needed. Keep it brief and leadership-friendly.'
          : 'Style: action plan. Use clear sections with concrete next actions and owners where possible.';
    const isSummaryPrompt = isProjectSummaryPrompt(latest);
    if (isSummaryPrompt) {
      const base = localBoardAssistant(latest, tasks, projects, context.activeProjectId);
      if (responseStyle === 'concise') {
        const lines = base.split('\n').filter((line) => line.trim().length > 0);
        const compact = lines.filter((line) => line.startsWith('- ')).slice(0, 5);
        return [`${lines[0] || `Project snapshot (${boardSummary.label})`}:`, ...compact].join('\n');
      }
      if (responseStyle === 'executive') {
        return [
          `Executive update (${boardSummary.label}):`,
          `- Delivery progress: ${boardSummary.done}/${boardSummary.total} tasks done.`,
          `- Current risk: ${boardSummary.overdue.length > 0 || boardSummary.atRisk.length > 0 ? 'Elevated' : 'Controlled'}.`,
          `- Decisions needed: ${boardSummary.high.length > 0 ? 'Prioritize high-impact open tasks this cycle.' : 'No escalation required currently.'}`
        ].join('\n');
      }
      return base;
    }
    if (isPriorityPrompt(latest)) {
      return localBoardAssistant(latest, tasks, projects, context.activeProjectId);
    }
    if (isProgressPrompt(latest) || isOwnershipPrompt(latest) || isBlockerPrompt(latest) || isRiskPrompt(latest) || isDueSoonPrompt(latest) || isCompletionPrompt(latest)) {
      return localBoardAssistant(latest, tasks, projects, context.activeProjectId);
    }
    const backend = await backendGenerateRaw(
      'board_chat',
      `User asks: ${latest}
Workspace user: ${context.currentUserName || 'Unknown'}
Current focus: ${activeProject ? activeProject.name : 'All projects'}
Conversation (latest turns): ${JSON.stringify(recentHistory)}
Board summary: ${JSON.stringify(boardSummary)}
Board tasks: ${JSON.stringify(
  tasks.slice(0, 120).map((t) => ({
    id: t.id,
    title: t.title,
    projectId: t.projectId,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate || null,
    assigneeIds: t.assigneeIds || [],
    isAtRisk: Boolean(t.isAtRisk)
    }))
)}
Rules:
- Be factual and grounded in the provided board/task data only.
- If data is missing, state that clearly instead of guessing.
- Use concise sections and bullet points when useful.
- Mention concrete task titles/statuses when making recommendations.
- If giving dates, include exact dates.
- ${styleInstruction}
Respond in plain text.`
    );
    const trimmed = normalizeCopilotReply(backend?.trim() || '');
    if (trimmed && !isVagueCopilotReply(trimmed, latest, scopedTasks)) return trimmed;
    return normalizeCopilotReply(localBoardAssistant(latest, tasks, projects, context.activeProjectId));
  },

  async planVoiceActions(
    prompt: string,
    tasks: Task[],
    projects: Project[],
    context: BoardContext = {}
  ): Promise<{ reply: string; actions: VoiceActionPlanItem[] }> {
    const asksForSummary = isProjectSummaryPrompt(prompt);
    if (asksForSummary) {
      const reply = await this.chatWithBoard([{ role: 'user', content: prompt }], tasks, context);
      return { reply, actions: [] };
    }

    const backend = await backendGenerateJson<{ reply: string; actions: VoiceActionPlanItem[] }>(
      'voice_assistant_actions',
      `You are a project operations assistant.
Return strict JSON: {"reply": string, "actions": [{type,label,taskId?,projectId?,status?,priority?,assigneeId?,title?,description?,tags?}]}
Only allowed action types: switch_project, create_task, set_status, set_priority, assign_task
If no action should be executed, return actions: []
Prompt: ${prompt}
Context project: ${context.activeProjectId || 'all'}
Projects: ${JSON.stringify(projects.map((p) => ({ id: p.id, name: p.name })))}
Tasks: ${JSON.stringify(
  tasks.slice(0, 150).map((t) => ({
    id: t.id,
    title: t.title,
    projectId: t.projectId,
    status: t.status,
    priority: t.priority,
    assigneeIds: t.assigneeIds || []
  }))
)}`
    );

    if (backend?.reply && Array.isArray(backend.actions)) {
      const scopedTasks = getScopedTasksForContext(tasks, context).slice(0, 200);
      const scopedTaskIds = new Set(scopedTasks.map((task) => task.id));
      const reply = isVagueCopilotReply(backend.reply, prompt, scopedTasks)
        ? await this.chatWithBoard([{ role: 'user', content: prompt }], tasks, context)
        : normalizeCopilotReply(backend.reply);
      const filteredActions = backend.actions
        .filter((item) => item?.type && item?.label)
        .filter((item) => {
          if (item.type === 'switch_project') return Boolean(item.projectId);
          if (item.type === 'create_task') {
            if (context.activeProjectId && item.projectId && item.projectId !== context.activeProjectId) return false;
            return true;
          }
          if (!item.taskId) return false;
          if (context.activeProjectId && !scopedTaskIds.has(item.taskId)) return false;
          return true;
        })
        .slice(0, 8);
      const localActions =
        filteredActions.length > 0 || !isActionablePrompt(prompt)
          ? []
          : buildLocalActionSuggestions(prompt, tasks, context);
      return {
        reply,
        actions: (filteredActions.length > 0 ? filteredActions : localActions).slice(0, 8)
      };
    }

    const fallbackReply = normalizeCopilotReply(await this.chatWithBoard([{ role: 'user', content: prompt }], tasks, context));
    const fallbackActions = isActionablePrompt(prompt) ? buildLocalActionSuggestions(prompt, tasks, context) : [];
    return { reply: fallbackReply, actions: fallbackActions };
  },

  async parseProjectFromDocument(docText: string): Promise<Array<{ title: string; description: string; priority: TaskPriority; tags: string[] }>> {
    const backend = await backendGenerateJson<{ tasks: Array<{ title: string; description: string; priority: TaskPriority; tags: string[] }> }>(
      'project_tasks_from_document',
      `Extract 8-20 actionable tasks and return JSON {"tasks":[{title,description,priority,tags[]}]}.
Document: ${docText.slice(0, 12000)}`
    );
    if (backend?.tasks?.length) return backend.tasks;
    return [];
  },

  async suggestWorkloadBalance(tasks: Task[], users: User[]): Promise<Array<{ taskId: string; fromUserId: string; toUserId: string; reason: string }>> {
    const backend = await backendGenerateJson<{ suggestions: Array<{ taskId: string; fromUserId: string; toUserId: string; reason: string }> }>(
      'workload_balance',
      `Return JSON {"suggestions":[{taskId,fromUserId,toUserId,reason}]}.
Users: ${JSON.stringify(users.map((u) => ({ id: u.id, name: u.displayName })))}
OpenTasks: ${JSON.stringify(tasks.filter((t) => t.status !== TaskStatus.DONE).slice(0, 120).map((t) => ({ id: t.id, title: t.title, assigneeIds: t.assigneeIds, priority: t.priority })))}`
    );
    if (backend?.suggestions?.length) return backend.suggestions;
    return [];
  },

  async suggestDueDate(title: string, subtasks: string[]): Promise<string> {
    const backend = await backendGenerateJson<{ suggestedDate: string }>(
      'task_due_date',
      `Return JSON {"suggestedDate":"YYYY-MM-DD"} for this task.
Title: ${title}
Subtasks: ${subtasks.join(', ') || 'none'}`
    );
    const normalized = normalizeSuggestedDate(backend?.suggestedDate);
    if (normalized) return normalized;
    return fallbackDueDate();
  },

  async parseImageToTasks(
    base64Data: string,
    mimeType: string,
    context?: { projectName?: string; stageNames?: string[] }
  ): Promise<{ title: string; description: string; subtasks: string[] }[]> {
    const backend = await backendGenerateJson<Array<{ title: string; description: string; subtasks: string[] }>>(
      'image_to_tasks',
      `Attempt to infer tasks from encoded image metadata and notes.
Return JSON array with {title,description,subtasks[]}.
MimeType: ${mimeType}
Project context: ${context?.projectName || 'General workspace'}
Stage context: ${(context?.stageNames || []).join(', ') || 'To Do, In Progress, Done'}
ImagePayloadHead: ${base64Data.slice(0, 6000)}`
    );
    if (Array.isArray(backend) && backend.length > 0) return backend;
    return [
      {
        title: `Review uploaded visual for ${context?.projectName || 'current project'}`,
        description: 'Extract requirements and convert highlighted work items into actionable tasks.',
        subtasks: ['Identify visible deliverables', 'Create task list with owners', 'Confirm timeline and risks']
      }
    ];
  },

  async getHealthInsights(tasks: Task[], users: User[]): Promise<{ bottlenecks: string[]; suggestions: string[] }> {
    const backend = await backendGenerateJson<{ bottlenecks: string[]; suggestions: string[] }>(
      'health_insights',
      `Return JSON {"bottlenecks":string[],"suggestions":string[]}.
Tasks: ${JSON.stringify(tasks.slice(0, 120).map((t) => ({ title: t.title, status: t.status, priority: t.priority, assigneeIds: t.assigneeIds })))}
Users: ${JSON.stringify(users.map((u) => ({ id: u.id, name: u.displayName })))}`
    );
    if (backend?.bottlenecks && backend?.suggestions) return backend;
    return { bottlenecks: ['No AI data available right now.'], suggestions: ['Retry health check in a moment.'] };
  }
};
