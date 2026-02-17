import { Project, ProjectOwnerMessage, User } from '../types';
import { realtimeService } from './realtimeService';
import { createId } from '../utils/id';

const STORAGE_KEY = 'velo_project_owner_chat';

const readStore = (): ProjectOwnerMessage[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeStore = (items: ProjectOwnerMessage[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

const getOwnerIds = (project: Project) =>
  Array.from(new Set([...(project.ownerIds || []), ...(project.createdBy ? [project.createdBy] : []), ...(project.members?.[0] ? [project.members[0]] : [])]));

export const projectChatService = {
  canAccessProjectChat: (user: User, project: Project) => {
    if (user.role === 'admin') return true;
    const ownerIds = getOwnerIds(project);
    return ownerIds.includes(user.id) || project.members.includes(user.id);
  },

  getThread: (orgId: string, projectId: string) =>
    readStore()
      .filter((item) => item.orgId === orgId && item.projectId === projectId)
      .sort((a, b) => a.createdAt - b.createdAt),

  getUnreadCountForUser: (orgId: string, projectId: string, userId: string) =>
    projectChatService.getThread(orgId, projectId).filter((item) => item.senderId !== userId && !item.readBy.includes(userId)).length,

  sendMessage: (user: User, project: Project, text: string): ProjectOwnerMessage | null => {
    const trimmed = text.trim();
    if (!trimmed) return null;
    if (!projectChatService.canAccessProjectChat(user, project)) return null;

    const all = readStore();
    const message: ProjectOwnerMessage = {
      id: createId(),
      orgId: project.orgId,
      projectId: project.id,
      senderId: user.id,
      senderName: user.displayName,
      text: trimmed,
      createdAt: Date.now(),
      readBy: [user.id]
    };
    writeStore([...all, message]);
    realtimeService.publish({
      type: 'PROJECT_CHAT_UPDATED',
      orgId: project.orgId,
      actorId: user.id,
      payload: { projectId: project.id }
    });
    return message;
  },

  markThreadRead: (orgId: string, projectId: string, userId: string) => {
    const all = readStore();
    let changed = false;
    const next = all.map((item) => {
      if (item.orgId !== orgId || item.projectId !== projectId) return item;
      if (item.readBy.includes(userId)) return item;
      changed = true;
      return { ...item, readBy: [...item.readBy, userId] };
    });
    if (changed) writeStore(next);
  }
};
