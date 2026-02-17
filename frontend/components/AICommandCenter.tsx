import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TaskPriority } from '../types';
import { aiService, VoiceActionPlanItem } from '../services/aiService';
import { aiChatHistoryService, ChatMessage, ChatSession } from '../services/aiChatHistoryService';
import { dialogService } from '../services/dialogService';
import { toastService } from '../services/toastService';
import { settingsService } from '../services/settingsService';
import { buildRiskSummary, formatTime, getSpeechRecognition } from './copilot/copilotUtils';
import { AICommandCenterProps } from './copilot/types';
import CopilotSidebar from './copilot/CopilotSidebar';
import CopilotTopBar from './copilot/CopilotTopBar';
import CopilotMessages from './copilot/CopilotMessages';
import CopilotComposer from './copilot/CopilotComposer';

const COPILOT_SUGGESTED_PROMPTS = [
  'Where are we with this project?',
  'What are top priorities right now?',
  'What is blocking progress?'
] as const;

const countReferencedTasks = (reply: string, scopedTasks: AICommandCenterProps['tasks']): number => {
  const normalizedReply = reply.toLowerCase();
  return scopedTasks.reduce((count, task) => {
    const title = (task.title || '').trim().toLowerCase();
    if (!title || title.length < 4) return count;
    return normalizedReply.includes(title) ? count + 1 : count;
  }, 0);
};

const inferGroundingSource = (reply: string, referencedTaskCount: number): 'local' | 'hybrid' | 'backend' => {
  if (referencedTaskCount > 0) return 'local';
  if (/request failed|try again/i.test(reply)) return 'backend';
  return 'hybrid';
};

const inferPromptIntent = (
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

const AICommandCenter: React.FC<AICommandCenterProps> = ({
  isOpen,
  onClose,
  tasks,
  projects,
  activeProjectId,
  currentUserName,
  currentUserId,
  orgId,
  onSelectProject,
  onCreateTask,
  onSetTaskStatus,
  onSetTaskPriority,
  onAssignTask,
  onPinInsight,
  onUnpinInsight,
  isInsightPinned
}) => {
  const [query, setQuery] = useState('');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [contextProjectId, setContextProjectId] = useState<string | 'all'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRecorderSupported, setIsRecorderSupported] = useState(true);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const chatActorKey = `${currentUserId}::${(currentUserName || '').trim().toLowerCase()}`;

  const reloadSessions = () => {
    const next = aiChatHistoryService.getSessions(orgId, currentUserId, chatActorKey);
    setSessions(next);
    if (selectedSessionId && !next.some((session) => session.id === selectedSessionId)) setSelectedSessionId(null);
  };

  useEffect(() => {
    if (!isOpen) return;
    reloadSessions();
    setContextProjectId(activeProjectId || 'all');
    setTimeout(() => inputRef.current?.focus(), 10);
  }, [isOpen, activeProjectId, chatActorKey]);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) || null,
    [sessions, selectedSessionId]
  );
  const messages: ChatMessage[] = selectedSession?.messages || [];

  useEffect(() => {
    if (!isOpen) return;
    if (selectedSession) {
      setContextProjectId(selectedSession.contextProjectId || 'all');
      return;
    }
    setContextProjectId(activeProjectId || 'all');
  }, [isOpen, selectedSession?.id, selectedSession?.contextProjectId, activeProjectId]);

  const resolvedContextProjectId = contextProjectId;
  const resolvedContextLabel = resolvedContextProjectId === 'all'
    ? 'All projects'
    : projects.find((project) => project.id === resolvedContextProjectId)?.name || 'Selected project';

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  const clearAudio = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
  };
  const stopStreamTracks = () => {
    if (!streamRef.current) return;
    streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
    recognitionRef.current?.stop();
    stopStreamTracks();
    setIsRecording(false);
  };
  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setIsRecorderSupported(false);
      return;
    }
    setIsRecorderSupported(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (blob.size > 0) {
          clearAudio();
          setAudioUrl(URL.createObjectURL(blob));
        }
      };
      recorder.start();

      const Recognition = getSpeechRecognition();
      if (Recognition) {
        const recognition = new Recognition();
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const text = Array.from(event.results)
            .map((result) => result[0]?.transcript || '')
            .join(' ')
            .trim();
          setQuery(text);
        };
        recognitionRef.current = recognition;
        recognition.start();
      }
      setIsRecording(true);
    } catch {
      setIsRecorderSupported(false);
      setIsRecording(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopRecording();
      window.speechSynthesis?.cancel();
      setQuery('');
      clearAudio();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        setShowDiagnostics((prev) => {
          const next = !prev;
          toastService.info('Copilot diagnostics', next ? 'Diagnostics enabled' : 'Diagnostics disabled');
          return next;
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  useEffect(() => () => {
    stopRecording();
    clearAudio();
  }, []);

  if (!isOpen) return null;

  const upsertSession = (session: ChatSession) => {
    setSessions((prev) => {
      const mapped = prev.some((item) => item.id === session.id)
        ? prev.map((item) => (item.id === session.id ? session : item))
        : [session, ...prev];
      return mapped.sort((a, b) => b.updatedAt - a.updatedAt);
    });
  };

  const applyAction = (action: VoiceActionPlanItem) => {
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
      const scopedTasks =
        (active.contextProjectId || 'all') === 'all'
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

  const exportProjectHistory = () => {
    const projectId = resolvedContextProjectId === 'all' ? null : resolvedContextProjectId;
    if (!projectId) {
      toastService.warning('Select a project', 'Choose a specific project context before exporting history.');
      return;
    }
    const projectName = projects.find((project) => project.id === projectId)?.name || 'project';
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

  const canChat = Boolean(selectedSession || contextProjectId);
  const contextSelectableValue = contextProjectId;
  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="w-full max-w-5xl h-[100dvh] md:h-[74vh] md:max-h-[680px] bg-white md:border border-slate-200 md:rounded-xl shadow-2xl overflow-hidden flex text-[13px]"
        style={{ fontFamily: "'Figtree', system-ui, -apple-system, sans-serif" }}
      >
        <div className="hidden md:flex">
          <CopilotSidebar
            sessions={sessions}
            selectedSessionId={selectedSessionId}
            editingSessionId={editingSessionId}
            editingTitle={editingTitle}
            setEditingTitle={setEditingTitle}
            onNewChat={() => setSelectedSessionId(null)}
            onExport={exportProjectHistory}
            onClearAll={() => void handleClearAll()}
            onSelectSession={(session) => {
              setSelectedSessionId(session.id);
              setContextProjectId(session.contextProjectId || 'all');
            }}
            onStartRename={handleRenameSession}
            onSaveRename={saveRename}
            onCancelRename={() => setEditingSessionId(null)}
            onDeleteSession={(sessionId) => void handleDeleteSession(sessionId)}
          />
        </div>

        <section className="flex-1 flex flex-col min-w-0">
          <CopilotTopBar
            projects={projects}
            resolvedContextLabel={resolvedContextLabel}
            contextSelectableValue={contextSelectableValue}
            showDiagnostics={showDiagnostics}
            onClose={onClose}
            onToggleDiagnostics={() =>
              setShowDiagnostics((prev) => {
                const next = !prev;
                toastService.info('Copilot diagnostics', next ? 'Diagnostics enabled' : 'Diagnostics disabled');
                return next;
              })
            }
            onChangeContext={(value) => {
              const label = value === 'all' ? 'All projects' : projects.find((project) => project.id === value)?.name || 'Selected project';
              setContextProjectId(value);
              if (value !== 'all') onSelectProject?.(value);
              if (selectedSession) {
                aiChatHistoryService.updateSessionContext(selectedSession.id, value === 'all' ? null : value, label);
                reloadSessions();
              }
            }}
          />

          <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-3.5 md:p-4 space-y-4 bg-slate-50">
            <CopilotMessages
              messages={messages}
              isLoading={isLoading}
              copiedIndex={copiedIndex}
              resolvedContextProjectId={resolvedContextProjectId}
              isInsightPinned={isInsightPinned}
              onPinInsight={onPinInsight}
              onUnpinInsight={onUnpinInsight}
              onApplyAction={applyAction}
              onCopyText={copyText}
              showDiagnostics={showDiagnostics}
            />
          </div>

          <CopilotComposer
            query={query}
            setQuery={setQuery}
            suggestedPrompts={[...COPILOT_SUGGESTED_PROMPTS]}
            isLoading={isLoading}
            canChat={canChat}
            isRecording={isRecording}
            isRecorderSupported={isRecorderSupported}
            audioUrl={audioUrl}
            inputRef={inputRef}
            onAsk={(preset) => void ask(preset)}
            onToggleRecording={() => {
              if (isRecording) {
                stopRecording();
                return;
              }
              void startRecording();
            }}
            onClearVoice={() => {
              stopRecording();
              clearAudio();
              setQuery('');
            }}
          />
        </section>
      </div>
    </div>
  );
};

export default AICommandCenter;
