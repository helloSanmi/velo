import { useState } from 'react';
import { aiChatHistoryService, ChatSession } from '../../services/aiChatHistoryService';
import { dialogService } from '../../services/dialogService';
import { toastService } from '../../services/toastService';
import { formatTime } from './copilotUtils';

interface UseCopilotSessionsParams {
  orgId: string;
  currentUserId: string;
  chatActorKey: string;
}

export const useCopilotSessions = ({
  orgId,
  currentUserId,
  chatActorKey
}: UseCopilotSessionsParams) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const reloadSessions = () => {
    const next = aiChatHistoryService.getSessions(orgId, currentUserId, chatActorKey);
    setSessions(next);
    if (selectedSessionId && !next.some((session) => session.id === selectedSessionId)) setSelectedSessionId(null);
  };

  const handleDeleteSession = async (sessionId: string) => {
    const ok = await dialogService.confirm('Delete this chat history?', { title: 'Delete conversation', confirmText: 'Delete', danger: true });
    if (!ok) return;
    aiChatHistoryService.deleteSession(sessionId);
    reloadSessions();
  };

  const handleClearAll = async () => {
    const ok = await dialogService.confirm('Delete all Copilot history?', { title: 'Delete all history', confirmText: 'Delete all', danger: true });
    if (!ok) return;
    aiChatHistoryService.clearSessions(orgId, currentUserId, chatActorKey);
    setSelectedSessionId(null);
    reloadSessions();
  };

  const handleRenameSession = (session: ChatSession) => {
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  const saveRename = () => {
    if (!editingSessionId) return;
    aiChatHistoryService.renameSession(editingSessionId, editingTitle);
    setEditingSessionId(null);
    setEditingTitle('');
    reloadSessions();
  };

  const exportProjectHistory = (projectId: string | null, projectName: string) => {
    if (!projectId) {
      toastService.warning('Select a project', 'Choose a specific project context before exporting history.');
      return;
    }
    const scoped = sessions.filter((session) => session.contextProjectId === projectId);
    const body = scoped
      .flatMap((session) => [
        `# ${session.title} (${formatTime(session.updatedAt)})`,
        ...session.messages.map((message) => `[${message.role.toUpperCase()}] ${message.content}`),
        ''
      ])
      .join('\n');
    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}-copilot-history.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return {
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
  };
};
