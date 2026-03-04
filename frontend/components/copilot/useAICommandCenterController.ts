import { useMemo, useRef, useState } from 'react';
import { ChatMessage } from '../../services/aiChatHistoryService';
import { userService } from '../../services/userService';
import { COPILOT_SUGGESTED_PROMPTS } from './aiCommandCenterUtils';
import { CopilotControllerProps } from './copilotController.types';
import { useCopilotActions } from './useCopilotActions';
import { useCopilotRecorder } from './useCopilotRecorder';
import { useCopilotSessions } from './useCopilotSessions';
import { useCopilotUiEffects } from './useCopilotUiEffects';

export const useAICommandCenterController = ({
  isOpen,
  activeProjectId,
  currentUserName,
  currentUserId,
  orgId,
  tasks,
  projects,
  onSelectProject,
  onCreateTask,
  onSetTaskStatus,
  onSetTaskPriority,
  onAssignTask
}: CopilotControllerProps) => {
  const allUsers = userService.getUsers(orgId);
  const [query, setQuery] = useState('');
  const [contextProjectId, setContextProjectId] = useState<string | 'all'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatActorKey = `${currentUserId}::${(currentUserName || '').trim().toLowerCase()}`;

  const {
    sessions,
    setSessions,
    selectedSessionId,
    setSelectedSessionId,
    editingSessionId,
    setEditingSessionId,
    editingTitle,
    setEditingTitle,
    reloadSessions,
    handleDeleteSession,
    handleClearAll,
    handleRenameSession,
    saveRename,
    exportProjectHistory
  } = useCopilotSessions({ orgId, currentUserId, chatActorKey });

  const { isRecording, audioUrl, isRecorderSupported, stopRecording, startRecording, clearAudio } = useCopilotRecorder({
    isOpen,
    setQuery
  });

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) || null,
    [sessions, selectedSessionId]
  );
  const messages: ChatMessage[] = selectedSession?.messages || [];

  const resolvedContextProjectId = contextProjectId;
  const resolvedContextLabel =
    resolvedContextProjectId === 'all'
      ? 'All projects'
      : projects.find((project) => project.id === resolvedContextProjectId)?.name || 'Selected project';

  useCopilotUiEffects({
    isOpen,
    activeProjectId,
    chatActorKey,
    reloadSessions,
    setContextProjectId,
    inputRef,
    selectedSession,
    messages,
    isLoading,
    scrollRef,
    setShowDiagnostics
  });

  const { applyAction, ask, copyText, handleExportProjectHistory } = useCopilotActions({
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
  });

  return {
    query,
    setQuery,
    contextProjectId,
    setContextProjectId,
    isLoading,
    copiedIndex,
    showDiagnostics,
    setShowDiagnostics,
    inputRef,
    scrollRef,
    sessions,
    selectedSession,
    selectedSessionId,
    setSelectedSessionId,
    editingSessionId,
    setEditingSessionId,
    editingTitle,
    setEditingTitle,
    messages,
    isRecording,
    audioUrl,
    isRecorderSupported,
    stopRecording,
    startRecording,
    clearAudio,
    handleDeleteSession,
    handleClearAll,
    handleRenameSession,
    saveRename,
    reloadSessions,
    resolvedContextProjectId,
    resolvedContextLabel,
    contextSelectableValue: contextProjectId,
    applyAction,
    ask,
    copyText,
    handleExportProjectHistory,
    canChat: Boolean(selectedSession || contextProjectId),
    suggestedPrompts: [...COPILOT_SUGGESTED_PROMPTS]
  };
};
