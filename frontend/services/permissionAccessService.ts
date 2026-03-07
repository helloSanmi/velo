import { toastService } from './toastService';

export type PermissionRule =
  | 'admin_only'
  | 'project_creator_or_admin'
  | 'project_owner_or_admin'
  | 'task_operator';

const PERMISSION_SUBJECT: Record<PermissionRule, string> = {
  admin_only: 'Only admins can',
  project_creator_or_admin: 'Only admins or project creators can',
  project_owner_or_admin: 'Only project owners or admins can',
  task_operator: 'Only assigned members, project owners, or admins can'
};

export const getPermissionMessage = (rule: PermissionRule, action: string): string =>
  `${PERMISSION_SUBJECT[rule]} ${action}.`;

export const ensurePermissionAccess = (allowed: boolean, rule: PermissionRule, action: string): boolean => {
  if (allowed) return true;
  toastService.warning('Permission denied', getPermissionMessage(rule, action));
  return false;
};
