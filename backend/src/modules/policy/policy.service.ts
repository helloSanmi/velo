import type { UserRole } from '@prisma/client';
import { HttpError } from '../../lib/httpError.js';

export type PolicyAction =
  | 'project:delete'
  | 'project:archive'
  | 'project:rename'
  | 'project:owner-change'
  | 'task:assign'
  | 'task:delete'
  | 'task:edit'
  | 'task:status'
  | 'ai:run'
  | 'org:usage-read';

interface PolicyContext {
  role: UserRole;
  userId: string;
  projectOwnerId?: string;
  projectOwnerIds?: string[];
  isProjectMember?: boolean;
  isTaskAssignee?: boolean;
}

const projectOwnerOrAdmin = (ctx: PolicyContext): boolean =>
  ctx.role === 'admin' ||
  (ctx.projectOwnerId && ctx.projectOwnerId === ctx.userId) ||
  (Array.isArray(ctx.projectOwnerIds) && ctx.projectOwnerIds.includes(ctx.userId)) ||
  false;

export const can = (action: PolicyAction, ctx: PolicyContext): boolean => {
  switch (action) {
    case 'org:usage-read':
      return ctx.role === 'admin';
    case 'project:owner-change':
      return ctx.role === 'admin';
    case 'project:delete':
    case 'project:archive':
    case 'project:rename':
    case 'task:assign':
    case 'task:delete':
    case 'ai:run':
      return projectOwnerOrAdmin(ctx);
    case 'task:edit':
      return projectOwnerOrAdmin(ctx) || Boolean(ctx.isProjectMember);
    case 'task:status':
      return projectOwnerOrAdmin(ctx) || Boolean(ctx.isProjectMember) || Boolean(ctx.isTaskAssignee);
    default:
      return false;
  }
};

export const enforce = (action: PolicyAction, ctx: PolicyContext): void => {
  if (!can(action, ctx)) throw new HttpError(403, `Permission denied for ${action}`);
};
