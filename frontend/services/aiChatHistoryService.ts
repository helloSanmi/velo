import { createId } from '../utils/id';

export interface ChatActionItem {
  type: 'switch_project' | 'create_task' | 'set_status' | 'set_priority' | 'assign_task';
  label: string;
  taskId?: string;
  projectId?: string | null;
  status?: string;
  priority?: 'Low' | 'Medium' | 'High';
  assigneeId?: string;
  title?: string;
  description?: string;
  tags?: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  actions?: ChatActionItem[];
  grounding?: {
    contextLabel: string;
    scopedTaskCount: number;
    referencedTaskCount: number;
    source: 'local' | 'hybrid' | 'backend';
    intent?: 'summary' | 'progress' | 'priority' | 'ownership' | 'blockers' | 'risk' | 'due_soon' | 'completion' | 'general';
  };
}

export interface ChatSession {
  id: string;
  orgId: string;
  userId: string;
  actorKey?: string;
  contextProjectId: string | null;
  contextLabel: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

const STORAGE_KEY = 'velo_ai_chat_sessions_v1';

const readSessions = (): ChatSession[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeSessions = (sessions: ChatSession[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 200)));
};

const sessionTitle = (firstMessage: string) => {
  const clean = firstMessage.replace(/\s+/g, ' ').trim();
  return clean.length > 42 ? `${clean.slice(0, 42)}...` : clean || 'New conversation';
};

export const aiChatHistoryService = {
  getSessions(orgId: string, userId: string, actorKey?: string) {
    return readSessions()
      .filter((session) =>
        actorKey
          ? session.orgId === orgId && session.actorKey === actorKey
          : session.orgId === orgId && session.userId === userId
      )
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
  createSession(input: {
    orgId: string;
    userId: string;
    actorKey?: string;
    contextProjectId: string | null;
    contextLabel: string;
    firstUserMessage: string;
  }) {
    const now = Date.now();
    const next: ChatSession = {
      id: createId(),
      orgId: input.orgId,
      userId: input.userId,
      actorKey: input.actorKey,
      contextProjectId: input.contextProjectId,
      contextLabel: input.contextLabel,
      title: sessionTitle(input.firstUserMessage),
      createdAt: now,
      updatedAt: now,
      messages: [{ role: 'user', content: input.firstUserMessage, timestamp: now }]
    };
    const all = readSessions();
    writeSessions([next, ...all]);
    return next;
  },
  saveSession(session: ChatSession) {
    const all = readSessions();
    const idx = all.findIndex((item) => item.id === session.id);
    if (idx >= 0) all[idx] = session;
    else all.unshift(session);
    writeSessions(all);
  },
  appendMessage(
    session: ChatSession,
    role: 'user' | 'model',
    content: string,
    actions?: ChatActionItem[],
    grounding?: ChatMessage['grounding']
  ) {
    const now = Date.now();
    const updated: ChatSession = {
      ...session,
      updatedAt: now,
      title: session.title || (role === 'user' ? sessionTitle(content) : session.title),
      messages: [
        ...session.messages,
        { role, content, timestamp: now, ...(actions?.length ? { actions } : {}), ...(grounding ? { grounding } : {}) }
      ]
    };
    this.saveSession(updated);
    return updated;
  },
  renameSession(sessionId: string, title: string) {
    const clean = title.trim();
    if (!clean) return;
    const all = readSessions();
    const idx = all.findIndex((session) => session.id === sessionId);
    if (idx < 0) return;
    all[idx] = { ...all[idx], title: clean, updatedAt: Date.now() };
    writeSessions(all);
  },
  updateSessionContext(sessionId: string, contextProjectId: string | null, contextLabel: string) {
    const all = readSessions();
    const idx = all.findIndex((session) => session.id === sessionId);
    if (idx < 0) return;
    all[idx] = {
      ...all[idx],
      contextProjectId,
      contextLabel,
      updatedAt: Date.now()
    };
    writeSessions(all);
  },
  deleteSession(sessionId: string) {
    writeSessions(readSessions().filter((session) => session.id !== sessionId));
  },
  clearSessions(orgId: string, userId: string, actorKey?: string) {
    writeSessions(
      readSessions().filter((session) =>
        actorKey
          ? !(session.orgId === orgId && session.actorKey === actorKey)
          : !(session.orgId === orgId && session.userId === userId)
      )
    );
  }
};
