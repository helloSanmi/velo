import { Dispatch, SetStateAction } from 'react';
import { aiService, VoiceActionPlanItem } from '../../services/aiService';
import { aiChatHistoryService, ChatSession } from '../../services/aiChatHistoryService';
import { settingsService } from '../../services/settingsService';
import { toastService } from '../../services/toastService';
import { Project, Task, User } from '../../types';
import { buildRiskSummary } from './copilotUtils';
import {
  applyCopilotAction,
  countReferencedTasks,
  inferGroundingSource,
  inferPromptIntent,
  upsertSessionList
} from './aiCommandCenterUtils';

interface UseCopilotActionsArgs {
  query: string;
  isLoading: boolean;
  selectedSession: ChatSession | null;
  contextProjectId: string | 'all';
  setQuery: Dispatch<SetStateAction<string>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setSessions: Dispatch<SetStateAction<ChatSession[]>>;
  setSelectedSessionId: Dispatch<SetStateAction<string | null>>;
  setContextProjectId: Dispatch<SetStateAction<string | 'all'>>;
  setCopiedIndex: Dispatch<SetStateAction<number | null>>;
  orgId: string;
  currentUserId: string;
  currentUserName: string;
  chatActorKey: string;
  tasks: Task[];
  projects: Project[];
  allUsers: User[];
  activeProjectId?: string;
  resolvedContextProjectId: string | 'all';
  onSelectProject: (projectId: string) => void;
  onCreateTask: (projectId: string, title: string, description?: string, tags?: string[]) => void;
  onSetTaskStatus: (taskId: string, status: string) => void;
  onSetTaskPriority: (taskId: string, priority: 'Low' | 'Medium' | 'High') => void;
  onAssignTask: (taskId: string, assigneeId: string) => void;
  exportProjectHistory: (projectId?: string | null, projectName?: string) => void;
}

export const useCopilotActions = ({
  query,
  isLoading,
  selectedSession,
  contextProjectId,
  setQuery,
  setIsLoading,
  setSessions,
  setSelectedSessionId,
  setContextProjectId,
  setCopiedIndex,
  orgId,
  currentUserId,
  currentUserName,
  chatActorKey,
  tasks,
  projects,
  allUsers,
  activeProjectId,
  resolvedContextProjectId,
  onSelectProject,
  onCreateTask,
  onSetTaskStatus,
  onSetTaskPriority,
  onAssignTask,
  exportProjectHistory
}: UseCopilotActionsArgs) => {
  const upsertSession = (session: ChatSession) => setSessions((prev) => upsertSessionList(prev, session));

  const applyAction = (action: VoiceActionPlanItem) =>
    applyCopilotAction({
      action,
      onSelectProject,
      setContextProjectId,
      onCreateTask,
      onSetTaskStatus,
      onSetTaskPriority,
      onAssignTask,
      resolvedContextProjectId,
      activeProjectId
    });

  const ask = async (preset?: string) => {
    const text = (preset ?? query).trim();
    if (!text || isLoading) return;
    const promptIntent = inferPromptIntent(text.toLowerCase());
    setQuery('');
    setIsLoading(true);

    let active = selectedSession;
    if (!active) {
      active = aiChatHistoryService.createSession({
        orgId,
        userId: currentUserId,
        actorKey: chatActorKey,
        contextProjectId: contextProjectId === 'all' ? null : contextProjectId,
        contextLabel: contextProjectId === 'all' ? 'All projects' : projects.find((p) => p.id === contextProjectId)?.name || 'Selected project',
        firstUserMessage: text
      });
      setSelectedSessionId(active.id);
      upsertSession(active);
    } else {
      active = aiChatHistoryService.appendMessage(active, 'user', text);
      upsertSession(active);
    }

    try {
      const responseStyle = settingsService.getSettings().copilotResponseStyle;
      const scopedTasks = (active.contextProjectId || 'all') === 'all'
        ? tasks
        : tasks.filter((task) => task.projectId === active!.contextProjectId);

      const promptForCopilot =
        /not clear|unclear|be clearer|clarify/i.test(text) && active.messages.some((message) => message.role === 'model')
          ? `Rewrite your last answer with concrete evidence from current tasks only.
Use this structure: Risk level, Evidence, Impact, Actions (max 4 bullets each).
User feedback: ${text}`
          : text;

      const plan = await aiService.planVoiceActions(promptForCopilot, scopedTasks, projects, {
        projects,
        activeProjectId: active.contextProjectId,
        currentUserName,
        responseStyle
      });
      const fallbackRiskReply =
        /risk|at risk|delivery risk/i.test(text) &&
        /clarify|more specific|assist you better|please clarify/i.test(plan.reply || '')
          ? buildRiskSummary(
              scopedTasks,
              active.contextLabel || (active.contextProjectId ? projects.find((project) => project.id === active.contextProjectId)?.name || 'selected project' : 'all projects')
            )
          : null;

      const replyToStore = fallbackRiskReply || plan.reply;
      const referencedTaskCount = countReferencedTasks(replyToStore, scopedTasks);
      const withReply = aiChatHistoryService.appendMessage(active, 'model', replyToStore, plan.actions, {
        contextLabel:
          active.contextLabel ||
          (active.contextProjectId ? projects.find((project) => project.id === active.contextProjectId)?.name || 'Selected project' : 'All projects'),
        scopedTaskCount: scopedTasks.length,
        referencedTaskCount,
        source: inferGroundingSource(replyToStore, referencedTaskCount),
        intent: promptIntent
      });
      upsertSession(withReply);
    } catch {
      const withReply = aiChatHistoryService.appendMessage(active, 'model', 'Request failed. Please try again.');
      upsertSession(withReply);
    } finally {
      setIsLoading(false);
    }
  };

  const copyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1200);
  };

  const handleExportProjectHistory = () => {
    const projectId = resolvedContextProjectId === 'all' ? null : resolvedContextProjectId;
    const projectName = projects.find((project) => project.id === projectId)?.name || 'project';
    exportProjectHistory(projectId, projectName);
  };

  return { applyAction, ask, copyText, handleExportProjectHistory };
};
