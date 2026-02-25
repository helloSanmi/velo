import React, { useEffect, useMemo, useState } from 'react';
import { dialogService } from '../../../services/dialogService';
import { settingsService, UserSettings } from '../../../services/settingsService';
import { Organization, Project, Team, User as UserType } from '../../../types';
import SecurityHeaderCard from './security/SecurityHeaderCard';
import ProjectAccessManagementSection from './security/ProjectAccessManagementSection';
import SessionAuthSection from './security/SessionAuthSection';
import ApiAuditSection from './security/ApiAuditSection';

interface SecuritySettingsPanelProps {
  user: UserType;
  org: Organization | null;
  allUsers: UserType[];
  teams: Team[];
  projects: Project[];
  settings: UserSettings;
  onUpdateSettings: (updates: Partial<UserSettings>) => void;
  onUpdateProject?: (id: string, updates: Partial<Project>) => void;
}

const SecuritySettingsPanel: React.FC<SecuritySettingsPanelProps> = ({
  user,
  org,
  allUsers,
  teams,
  projects,
  settings,
  onUpdateSettings,
  onUpdateProject
}) => {
  const [draft, setDraft] = useState({
    requireTwoFactorAuth: settings.requireTwoFactorAuth,
    securitySessionTimeoutMinutes: settings.securitySessionTimeoutMinutes,
    securitySingleSessionOnly: settings.securitySingleSessionOnly,
    securityPasswordMinLength: settings.securityPasswordMinLength,
    securityPasswordRequireComplexity: settings.securityPasswordRequireComplexity,
    securityLockoutAttempts: settings.securityLockoutAttempts,
    securityApiTokensEnabled: settings.securityApiTokensEnabled,
    securityAuditExportEnabled: settings.securityAuditExportEnabled,
    securityRequireApprovalForPurge: settings.securityRequireApprovalForPurge,
    securityAlertOnRiskEvents: settings.securityAlertOnRiskEvents,
    dataRetentionPolicy: settings.dataRetentionPolicy
  });

  useEffect(() => {
    setDraft({
      requireTwoFactorAuth: settings.requireTwoFactorAuth,
      securitySessionTimeoutMinutes: settings.securitySessionTimeoutMinutes,
      securitySingleSessionOnly: settings.securitySingleSessionOnly,
      securityPasswordMinLength: settings.securityPasswordMinLength,
      securityPasswordRequireComplexity: settings.securityPasswordRequireComplexity,
      securityLockoutAttempts: settings.securityLockoutAttempts,
      securityApiTokensEnabled: settings.securityApiTokensEnabled,
      securityAuditExportEnabled: settings.securityAuditExportEnabled,
      securityRequireApprovalForPurge: settings.securityRequireApprovalForPurge,
      securityAlertOnRiskEvents: settings.securityAlertOnRiskEvents,
      dataRetentionPolicy: settings.dataRetentionPolicy
    });
  }, [settings]);

  const orgUsers = useMemo(
    () => allUsers.filter((candidate) => candidate.orgId === user.orgId).sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [allUsers, user.orgId]
  );
  const orgProjects = useMemo(
    () => projects.filter((project) => project.orgId === user.orgId && !project.isDeleted),
    [projects, user.orgId]
  );
  const orgTeams = useMemo(() => teams.filter((team) => team.orgId === user.orgId), [teams, user.orgId]);

  if (user.role !== 'admin') {
    return <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">Security is managed by workspace admins.</div>;
  }

  const updateDraft = (patch: Partial<UserSettings>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    settingsService.updateSettings(next as Partial<UserSettings>);
    onUpdateSettings(next as Partial<UserSettings>);
  };

  const handleProjectMembersSave = (projectId: string, updates: Partial<Project>) => {
    onUpdateProject?.(projectId, updates);
    dialogService.notice('Project access membership updated.', { title: 'Access updated' });
  };

  return (
    <div className="space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <SecurityHeaderCard
        workspaceName={org?.name}
        requireTwoFactorAuth={draft.requireTwoFactorAuth}
        onToggleTwoFactor={() => updateDraft({ requireTwoFactorAuth: !draft.requireTwoFactorAuth })}
      />
      <ProjectAccessManagementSection users={orgUsers} teams={orgTeams} projects={orgProjects} onSaveProjectMembers={handleProjectMembersSave} />
      <SessionAuthSection draft={draft} onUpdate={updateDraft} />
      <ApiAuditSection draft={draft} onUpdate={updateDraft} />
    </div>
  );
};

export default SecuritySettingsPanel;
