import { Project, Task, TaskPriority, TaskStatus } from '../../types';
import { BoardContext, BoardSummary, VoiceActionPlanItem } from './types';

export const isProjectSummaryPrompt = (prompt: string): boolean =>
  /tell me about|more about|about this project|project summary|summary|overview|project details|details on this project|progress|status|how are we doing|where are we/i.test(
    prompt
  );
export const isPriorityPrompt = (prompt: string): boolean =>
  /priority|priorities|what.*priority|which.*priority|focus first|order of work|what should we prioritize|top items/i.test(prompt);
export const isOwnershipPrompt = (prompt: string): boolean =>
  /who.*own|who.*assigned|ownership|assignee|who is working|who is handling|who is on this project|project members|team members|owners/i.test(prompt);
export const isBlockerPrompt = (prompt: string): boolean =>
  /blocker|blocked|stuck|what is blocking|dependency|dependencies/i.test(prompt);
export const isRiskPrompt = (prompt: string): boolean =>
  /risk|at risk|delivery risk|health|project health|red flags|warning signs/i.test(prompt);
export const isDueSoonPrompt = (prompt: string): boolean =>
  /due soon|this week|next 7 days|deadline|upcoming due/i.test(prompt);
export const isCompletionPrompt = (prompt: string): boolean =>
  /can we complete|when can we complete|completion forecast|how close|ready to complete/i.test(prompt);
export const isProgressPrompt = (prompt: string): boolean =>
  /what can we do|what can i do|how do we progress|move forward|next step|next steps|next action|where do we start|what should we do this week|unstick|unblock|accelerate|speed up|deliver faster|progress|improve.*delivery|improve.*project|improve this project|improve delivery|optimi[sz]e.*delivery|advance.*project|build momentum/i.test(
    prompt
  );
export const isActionablePrompt = (prompt: string): boolean =>
  /create|add|move|mark|set|assign|priorit|start|complete|progress|blocker|due|switch|improve|delivery|optimi[sz]e|faster|next action|what should we do|where do we start/i.test(prompt);

export const normalizeCopilotReply = (reply: string): string => {
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

export const summarizeBoard = (tasks: Task[], projects: Project[], activeProjectId?: string | null): BoardSummary => {
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

export const getScopedTasksForContext = (tasks: Task[], context: BoardContext): Task[] =>
  context.activeProjectId ? tasks.filter((task) => task.projectId === context.activeProjectId) : tasks;

const inferStatusTargets = (tasks: Task[]) => {
  const unique = Array.from(new Set(tasks.map((task) => String(task.status || '').toLowerCase()).filter(Boolean)));
  const done = unique.find((status) => status.includes('done') || status.includes('complete')) || TaskStatus.DONE;
  const inProgress = unique.find((status) => status.includes('in-progress') || status.includes('progress') || status.includes('doing')) || 'in-progress';
  return { done, inProgress };
};

export const buildLocalActionSuggestions = (prompt: string, tasks: Task[], context: BoardContext): VoiceActionPlanItem[] => {
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

export const localBoardAssistant = (latestPrompt: string, tasks: Task[], projects: Project[], activeProjectId?: string | null) => {
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

    return [
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

  if (isOwnershipPrompt(latestPrompt)) {
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

  if (isBlockerPrompt(latestPrompt)) {
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

  if (isDueSoonPrompt(latestPrompt)) {
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

  if (isCompletionPrompt(latestPrompt)) {
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

export const isVagueCopilotReply = (reply: string, prompt: string, scopedTasks: Task[]): boolean => {
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
