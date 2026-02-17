export const USERS_KEY = 'velo_users';
export const ORGS_KEY = 'velo_orgs';
export const SESSION_KEY = 'velo_session';
export const INVITES_KEY = 'velo_org_invites';
export const PROJECTS_KEY = 'velo_projects';
export const GROUPS_KEY = 'velo_security_groups';
export const TEAMS_KEY = 'velo_teams';
export const WORKFLOWS_KEY = 'velo_workflows';
export const PROJECT_CHAT_KEY = 'velo_project_owner_chat';
export const SAVED_VIEWS_KEY = 'velo_saved_views';
export const NOTIFICATIONS_KEY = 'velo_notifications';
export const ESTIMATION_PROFILES_KEY = 'velo_estimation_profiles_v1';
export const PRESENCE_KEY_PREFIX = 'velo_presence_v1:';

export const PLAN_DEFAULT_SEATS: Record<'free' | 'basic' | 'pro', number> = {
  free: 3,
  basic: 100000,
  pro: 100000
};

export const PLAN_SEAT_PRICE: Record<'free' | 'basic' | 'pro', number> = {
  free: 0,
  basic: 5,
  pro: 7
};

