
import { realtimeService } from './realtimeService';

export interface UserSettings {
  copilotResponseStyle: 'concise' | 'action_plan' | 'executive';
  aiSuggestions: boolean;
  realTimeUpdates: boolean;
  compactMode: boolean;
  theme: 'Light' | 'Dark' | 'Aurora';
  enableNotifications: boolean;
  notificationTaskAssignment: boolean;
  notificationMentionsReplies: boolean;
  notificationProjectCompletionActions: boolean;
  notificationDueOverdue: boolean;
  notificationStatusChangesMyWork: boolean;
  notificationSystemSecurity: boolean;
  notificationDailySummary: boolean;
  notificationDigestMode: 'bundled' | 'instant' | 'off';
  notificationInAppAssigned: boolean;
  notificationInAppCompleted: boolean;
  notificationInAppComments: boolean;
  notificationSound: boolean;
  notificationScheduleStart: string;
  notificationScheduleEnd: string;
  notificationUrgentTasks: boolean;
  notificationMentionsFromLeads: boolean;
  enableEstimateCalibration: boolean;
  showPersonalCalibration: boolean;
  estimationRequireApproval: boolean;
  estimationApprovalThreshold: number;
  requireTwoFactorAuth: boolean;
  securitySessionTimeoutMinutes: 15 | 30 | 60 | 120;
  securitySingleSessionOnly: boolean;
  securityPasswordMinLength: 8 | 10 | 12;
  securityPasswordRequireComplexity: boolean;
  securityLockoutAttempts: 3 | 5 | 10;
  securityAllowedEmailDomains: string;
  securityInviteExpiryDays: 1 | 3 | 7 | 14 | 30;
  securityInviteRequireAdminApproval: boolean;
  securityApiTokensEnabled: boolean;
  securityAuditExportEnabled: boolean;
  securityRequireApprovalForPurge: boolean;
  securityAlertOnRiskEvents: boolean;
  dataRetentionPolicy: '30_days' | '90_days' | '365_days' | 'indefinite';
}

const SETTINGS_KEY = 'velo_settings';
const SESSION_KEY = 'velo_session';
const scopedKey = (session: { orgId?: string; id?: string } | null) =>
  session?.orgId && session?.id ? `${SETTINGS_KEY}:${session.orgId}:${session.id}` : SETTINGS_KEY;

const DEFAULT_SETTINGS: UserSettings = {
  copilotResponseStyle: 'action_plan',
  aiSuggestions: true,
  realTimeUpdates: true,
  compactMode: false,
  theme: 'Light',
  enableNotifications: true,
  notificationTaskAssignment: true,
  notificationMentionsReplies: true,
  notificationProjectCompletionActions: true,
  notificationDueOverdue: true,
  notificationStatusChangesMyWork: true,
  notificationSystemSecurity: true,
  notificationDailySummary: false,
  notificationDigestMode: 'instant',
  notificationInAppAssigned: true,
  notificationInAppCompleted: true,
  notificationInAppComments: true,
  notificationSound: true,
  notificationScheduleStart: '00:00',
  notificationScheduleEnd: '23:59',
  notificationUrgentTasks: false,
  notificationMentionsFromLeads: true,
  enableEstimateCalibration: true,
  showPersonalCalibration: true,
  estimationRequireApproval: true,
  estimationApprovalThreshold: 1.35,
  requireTwoFactorAuth: false,
  securitySessionTimeoutMinutes: 30,
  securitySingleSessionOnly: false,
  securityPasswordMinLength: 10,
  securityPasswordRequireComplexity: true,
  securityLockoutAttempts: 5,
  securityAllowedEmailDomains: '',
  securityInviteExpiryDays: 14,
  securityInviteRequireAdminApproval: false,
  securityApiTokensEnabled: true,
  securityAuditExportEnabled: true,
  securityRequireApprovalForPurge: true,
  securityAlertOnRiskEvents: true,
  dataRetentionPolicy: '90_days'
};

export const settingsService = {
  getSettings: (): UserSettings => {
    try {
      const sessionRaw = localStorage.getItem(SESSION_KEY);
      const session = sessionRaw ? JSON.parse(sessionRaw) : null;
      const key = scopedKey(session);
      const stored = session ? localStorage.getItem(key) : localStorage.getItem(SETTINGS_KEY);
      if (!stored) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(stored);
      const merged = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        notificationTaskAssignment:
          typeof parsed.notificationTaskAssignment === 'boolean'
            ? parsed.notificationTaskAssignment
            : typeof parsed.notificationInAppAssigned === 'boolean'
              ? parsed.notificationInAppAssigned
              : DEFAULT_SETTINGS.notificationTaskAssignment,
        notificationMentionsReplies:
          typeof parsed.notificationMentionsReplies === 'boolean'
            ? parsed.notificationMentionsReplies
            : typeof parsed.notificationInAppComments === 'boolean' || typeof parsed.notificationMentionsFromLeads === 'boolean'
              ? Boolean(parsed.notificationInAppComments || parsed.notificationMentionsFromLeads)
              : DEFAULT_SETTINGS.notificationMentionsReplies,
        notificationProjectCompletionActions:
          typeof parsed.notificationProjectCompletionActions === 'boolean'
            ? parsed.notificationProjectCompletionActions
            : typeof parsed.notificationInAppCompleted === 'boolean'
              ? parsed.notificationInAppCompleted
              : DEFAULT_SETTINGS.notificationProjectCompletionActions,
        notificationDueOverdue:
          typeof parsed.notificationDueOverdue === 'boolean'
            ? parsed.notificationDueOverdue
            : typeof parsed.notificationUrgentTasks === 'boolean'
              ? parsed.notificationUrgentTasks
              : DEFAULT_SETTINGS.notificationDueOverdue,
        notificationStatusChangesMyWork:
          typeof parsed.notificationStatusChangesMyWork === 'boolean'
            ? parsed.notificationStatusChangesMyWork
            : typeof parsed.notificationInAppCompleted === 'boolean'
              ? parsed.notificationInAppCompleted
              : DEFAULT_SETTINGS.notificationStatusChangesMyWork,
        notificationSystemSecurity:
          typeof parsed.notificationSystemSecurity === 'boolean'
            ? parsed.notificationSystemSecurity
            : DEFAULT_SETTINGS.notificationSystemSecurity
      } as UserSettings;
      // Migrate older bundled digest default to per-notification delivery.
      if (merged.notificationDigestMode === 'bundled') {
        const migrated = { ...merged, notificationDigestMode: 'instant' as const };
        localStorage.setItem(key, JSON.stringify(migrated));
        return migrated;
      }
      return merged;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  },

  updateSettings: (updates: Partial<UserSettings>): UserSettings => {
    const current = settingsService.getSettings();
    const updated = { ...current, ...updates };
    const sessionRaw = localStorage.getItem(SESSION_KEY);
    const session = sessionRaw ? JSON.parse(sessionRaw) : null;
    localStorage.setItem(scopedKey(session), JSON.stringify(updated));

    // Trigger a custom event so other components can react
    window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: updated }));
    realtimeService.publish({
      type: 'SETTINGS_UPDATED',
      orgId: session?.orgId,
      actorId: session?.id
    });
    
    return updated;
  }
};
