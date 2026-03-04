import { VoiceActionPlanItem } from '../../services/aiService';
import { ChatSession } from '../../services/aiChatHistoryService';
import { TaskPriority } from '../../types';
import { AICommandCenterProps } from './types';

export const COPILOT_SUGGESTED_PROMPTS = [
  'Where are we with this project?',
  'What are top priorities right now?',
  'What is blocking progress?'
] as const;

export const countReferencedTasks = (reply: string, scopedTasks: AICommandCenterProps['tasks']): number => {
  const normalizedReply = reply.toLowerCase();
  return scopedTasks.reduce((count, task) => {
    const title = (task.title || '').trim().toLowerCase();
    if (!title || title.length < 4) return count;
    return normalizedReply.includes(title) ? count + 1 : count;
  }, 0);
};

export const inferGroundingSource = (reply: string, referencedTaskCount: number): 'local' | 'hybrid' | 'backend' => {
  if (referencedTaskCount > 0) return 'local';
  if (/request failed|try again/i.test(reply)) return 'backend';
  return 'hybrid';
};

export const inferPromptIntent = (
  prompt: string
): 'summary' | 'progress' | 'priority' | 'ownership' | 'blockers' | 'risk' | 'due_soon' | 'completion' | 'general' => {
  if (/tell me about|more about|about this project|project summary|summary|overview|project details|how are we doing|where are we/i.test(prompt)) return 'summary';
  if (/what can we do|what can i do|next action|next step|where do we start|improve.*delivery|progress|accelerate|deliver faster/i.test(prompt)) return 'progress';
  if (/priority|priorities|focus first|what should we prioritize|top items/i.test(prompt)) return 'priority';
  if (/who.*own|ownership|assignee|team members|owners|who is on this project/i.test(prompt)) return 'ownership';
  if (/blocker|blocked|stuck|dependency|dependencies/i.test(prompt)) return 'blockers';
  if (/risk|at risk|delivery risk|health|red flags|warning signs/i.test(prompt)) return 'risk';
  if (/due soon|this week|next 7 days|deadline|upcoming due/i.test(prompt)) return 'due_soon';
  if (/can we complete|ready to complete|completion forecast|how close/i.test(prompt)) return 'completion';
  return 'general';
};

interface ApplyActionParams {
  action: VoiceActionPlanItem;
  onSelectProject?: (projectId: string) => void;
  setContextProjectId: (value: string | 'all') => void;
  onCreateTask?: (
    title: string,
    description: string,
    priority: TaskPriority,
    tags?: string[],
    dueDate?: number,
    projectId?: string
  ) => void;
  onSetTaskStatus?: (taskId: string, status: string) => void;
  onSetTaskPriority?: (taskId: string, priority: TaskPriority) => void;
  onAssignTask?: (taskId: string, assigneeId: string) => void;
  resolvedContextProjectId: string | 'all';
  activeProjectId: string | null;
}

export const applyCopilotAction = ({
  action,
  onSelectProject,
  setContextProjectId,
  onCreateTask,
  onSetTaskStatus,
  onSetTaskPriority,
  onAssignTask,
  resolvedContextProjectId,
  activeProjectId
}: ApplyActionParams): boolean => {
  switch (action.type) {
    case 'switch_project':
      if (action.projectId) {
        onSelectProject?.(action.projectId);
        setContextProjectId(action.projectId);
        return true;
      }
      return false;
    case 'create_task':
      if (!action.title) return false;
      onCreateTask?.(
        action.title,
        action.description || '',
        action.priority || TaskPriority.MEDIUM,
        action.tags || ['Copilot'],
        undefined,
        action.projectId || (resolvedContextProjectId === 'all' ? activeProjectId || undefined : resolvedContextProjectId)
      );
      return true;
    case 'set_status':
      if (!action.taskId || !action.status) return false;
      onSetTaskStatus?.(action.taskId, action.status);
      return true;
    case 'set_priority':
      if (!action.taskId || !action.priority) return false;
      onSetTaskPriority?.(action.taskId, action.priority);
      return true;
    case 'assign_task':
      if (!action.taskId || !action.assigneeId) return false;
      onAssignTask?.(action.taskId, action.assigneeId);
      return true;
    default:
      return false;
  }
};

export const upsertSessionList = (prev: ChatSession[], session: ChatSession): ChatSession[] => {
  const mapped = prev.some((item) => item.id === session.id)
    ? prev.map((item) => (item.id === session.id ? session : item))
    : [session, ...prev];
  return mapped.sort((a, b) => b.updatedAt - a.updatedAt);
};
