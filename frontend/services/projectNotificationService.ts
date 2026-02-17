import { Project, User } from '../types';
import { notificationService } from './notificationService';

export type ProjectLifecycleEvent =
  | 'renamed'
  | 'archived'
  | 'completed'
  | 'reopened'
  | 'restored'
  | 'deleted'
  | 'purged';

const EVENT_COPY: Record<ProjectLifecycleEvent, { title: string; message: (name: string) => string; category: 'system' | 'completed' }> = {
  renamed: {
    title: 'Project renamed',
    message: (name) => `Project renamed to "${name}".`,
    category: 'system'
  },
  archived: {
    title: 'Project archived',
    message: (name) => `"${name}" moved to archived.`,
    category: 'system'
  },
  completed: {
    title: 'Project completed',
    message: (name) => `"${name}" was marked complete.`,
    category: 'completed'
  },
  reopened: {
    title: 'Project reopened',
    message: (name) => `"${name}" is active again.`,
    category: 'system'
  },
  restored: {
    title: 'Project restored',
    message: (name) => `"${name}" was restored to active.`,
    category: 'system'
  },
  deleted: {
    title: 'Project deleted',
    message: (name) => `"${name}" moved to deleted.`,
    category: 'system'
  },
  purged: {
    title: 'Project purged',
    message: (name) => `"${name}" was permanently removed.`,
    category: 'system'
  }
};

export const notifyProjectLifecycle = (
  actor: User,
  project: Project | undefined,
  event: ProjectLifecycleEvent,
  overrideName?: string
) => {
  if (!project) return;
  const recipients = Array.from(new Set(project.members || []))
    .filter((memberId) => Boolean(memberId) && memberId !== actor.id);
  const copy = EVENT_COPY[event];
  const projectName = (overrideName || project.name || 'Project').trim() || 'Project';
  recipients.forEach((memberId) => {
    notificationService.addNotification({
      orgId: actor.orgId,
      userId: memberId,
      title: copy.title,
      message: copy.message(projectName),
      type: 'SYSTEM',
      category: copy.category,
      linkId: project.id
    });
  });
};
