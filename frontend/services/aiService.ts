import { Task, TaskPriority, TaskStatus, User } from '../types';
import { backendGenerateJson, backendGenerateRaw } from './ai-service/backend';
import {
  buildLocalActionSuggestions,
  getScopedTasksForContext,
  isActionablePrompt,
  isBlockerPrompt,
  isCompletionPrompt,
  isDueSoonPrompt,
  isOwnershipPrompt,
  isPriorityPrompt,
  isProgressPrompt,
  isProjectSummaryPrompt,
  isRiskPrompt,
  isVagueCopilotReply,
  localBoardAssistant,
  normalizeCopilotReply,
  summarizeBoard
} from './ai-service/boardAssistant';
import { BoardContext, VoiceActionPlanItem } from './ai-service/types';

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
    {
      title: `Define scope for ${name}`,
      description: `Document goals and constraints. ${snippet}`,
      priority: TaskPriority.HIGH,
      tags: ['Scope', 'Planning']
    },
    {
      title: 'Break down delivery phases',
      description: 'Split execution into phases, owners, and timelines.',
      priority: TaskPriority.HIGH,
      tags: ['Planning', 'Delivery']
    },
    {
      title: 'Design and technical review',
      description: 'Review solution approach and dependencies.',
      priority: TaskPriority.MEDIUM,
      tags: ['Design', 'Review']
    },
    {
      title: 'Implement core work',
      description: 'Build the highest-impact deliverables first.',
      priority: TaskPriority.HIGH,
      tags: ['Build']
    },
    {
      title: 'QA and readiness',
      description: 'Validate requirements and fix defects before release.',
      priority: TaskPriority.MEDIUM,
      tags: ['QA']
    },
    {
      title: 'Release and monitor',
      description: 'Roll out and monitor results with rapid issue response.',
      priority: TaskPriority.MEDIUM,
      tags: ['Release', 'Monitoring']
    }
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

const fallbackDueDate = () =>
  new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

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

export const aiService = {
  async generateProjectTasksFromBrief(projectName: string, projectBrief: string, taskCount: number) {
    const safeCount = Math.min(Math.max(taskCount || 8, 1), 20);
    const backend = await backendGenerateJson<{
      tasks: Array<{ title: string; description: string; priority: TaskPriority; tags: string[] }>;
    }>(
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
    return {
      isAtRisk,
      reason: isAtRisk ? 'High-priority item still open.' : 'No immediate risk signals.'
    };
  },

  async suggestTriage(tasks: Task[]): Promise<string[]> {
    const context = tasks.map((task) => ({
      id: task.id,
      title: task.title,
      priority: task.priority,
      status: task.status
    }));
    const backend = await backendGenerateJson<string[]>(
      'task_triage',
      `Return JSON array of task IDs ordered for execution.
Tasks: ${JSON.stringify(context.slice(0, 80))}`
    );
    if (Array.isArray(backend) && backend.length > 0) return backend;
    return tasks
      .slice()
      .sort((a, b) => {
        const score = (task: Task) =>
          task.priority === TaskPriority.HIGH ? 3 : task.priority === TaskPriority.MEDIUM ? 2 : 1;
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
    const scopedTasks = context.activeProjectId
      ? tasks.filter((task) => task.projectId === context.activeProjectId)
      : tasks;
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

    if (isProjectSummaryPrompt(latest)) {
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

    if (
      isPriorityPrompt(latest) ||
      isProgressPrompt(latest) ||
      isOwnershipPrompt(latest) ||
      isBlockerPrompt(latest) ||
      isRiskPrompt(latest) ||
      isDueSoonPrompt(latest) ||
      isCompletionPrompt(latest)
    ) {
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
  tasks.slice(0, 120).map((task) => ({
    id: task.id,
    title: task.title,
    projectId: task.projectId,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate || null,
    assigneeIds: task.assigneeIds || [],
    isAtRisk: Boolean(task.isAtRisk)
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
    projects: { id: string; name: string }[],
    context: BoardContext = {}
  ): Promise<{ reply: string; actions: VoiceActionPlanItem[] }> {
    if (isProjectSummaryPrompt(prompt)) {
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
Projects: ${JSON.stringify(projects.map((project) => ({ id: project.id, name: project.name })))}
Tasks: ${JSON.stringify(
  tasks.slice(0, 150).map((task) => ({
    id: task.id,
    title: task.title,
    projectId: task.projectId,
    status: task.status,
    priority: task.priority,
    assigneeIds: task.assigneeIds || []
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
            if (context.activeProjectId && item.projectId && item.projectId !== context.activeProjectId) {
              return false;
            }
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

    const fallbackReply = normalizeCopilotReply(
      await this.chatWithBoard([{ role: 'user', content: prompt }], tasks, context)
    );
    const fallbackActions = isActionablePrompt(prompt)
      ? buildLocalActionSuggestions(prompt, tasks, context)
      : [];
    return { reply: fallbackReply, actions: fallbackActions };
  },

  async parseProjectFromDocument(
    docText: string
  ): Promise<Array<{ title: string; description: string; priority: TaskPriority; tags: string[] }>> {
    const backend = await backendGenerateJson<{
      tasks: Array<{ title: string; description: string; priority: TaskPriority; tags: string[] }>;
    }>(
      'project_tasks_from_document',
      `Extract 8-20 actionable tasks and return JSON {"tasks":[{title,description,priority,tags[]}]}.
Document: ${docText.slice(0, 12000)}`
    );
    if (backend?.tasks?.length) return backend.tasks;
    return [];
  },

  async suggestWorkloadBalance(
    tasks: Task[],
    users: User[]
  ): Promise<Array<{ taskId: string; fromUserId: string; toUserId: string; reason: string }>> {
    const backend = await backendGenerateJson<{
      suggestions: Array<{ taskId: string; fromUserId: string; toUserId: string; reason: string }>;
    }>(
      'workload_balance',
      `Return JSON {"suggestions":[{taskId,fromUserId,toUserId,reason}]}.
Users: ${JSON.stringify(users.map((user) => ({ id: user.id, name: user.displayName })))}
OpenTasks: ${JSON.stringify(
  tasks
    .filter((task) => task.status !== TaskStatus.DONE)
    .slice(0, 120)
    .map((task) => ({
      id: task.id,
      title: task.title,
      assigneeIds: task.assigneeIds,
      priority: task.priority
    }))
)}`
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
    const backend = await backendGenerateJson<
      Array<{ title: string; description: string; subtasks: string[] }>
    >(
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
        description:
          'Extract requirements and convert highlighted work items into actionable tasks.',
        subtasks: [
          'Identify visible deliverables',
          'Create task list with owners',
          'Confirm timeline and risks'
        ]
      }
    ];
  },

  async getHealthInsights(
    tasks: Task[],
    users: User[]
  ): Promise<{ bottlenecks: string[]; suggestions: string[] }> {
    const backend = await backendGenerateJson<{ bottlenecks: string[]; suggestions: string[] }>(
      'health_insights',
      `Return JSON {"bottlenecks":string[],"suggestions":string[]}.
Tasks: ${JSON.stringify(
  tasks.slice(0, 120).map((task) => ({
    title: task.title,
    status: task.status,
    priority: task.priority,
    assigneeIds: task.assigneeIds
  }))
)}
Users: ${JSON.stringify(users.map((user) => ({ id: user.id, name: user.displayName })))}`
    );
    if (backend?.bottlenecks && backend?.suggestions) return backend;
    return {
      bottlenecks: ['No AI data available right now.'],
      suggestions: ['Retry health check in a moment.']
    };
  }
};

export type { BoardContext, VoiceActionPlanItem };
