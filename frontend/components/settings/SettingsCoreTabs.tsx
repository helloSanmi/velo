import React from 'react';
import { Cloud, Monitor, Sparkles, User } from 'lucide-react';
import SettingsToggleRow from './SettingsToggleRow';
import { Organization, Project, Team, User as UserType } from '../../types';
import { UserSettings } from '../../services/settingsService';
import AppSelect from '../ui/AppSelect';
import ProfileSettingsPanel from './core/ProfileSettingsPanel';
import NotificationsSettingsPanel from './core/NotificationsSettingsPanel';
import SecuritySettingsPanel from './core/SecuritySettingsPanel';

interface SettingsCoreTabsProps {
  activeTab: 'profile' | 'general' | 'notifications' | 'security' | 'appearance';
  user: UserType;
  org: Organization | null;
  allUsers: UserType[];
  projects: Project[];
  teams: Team[];
  settings: UserSettings;
  onToggle: (key: keyof UserSettings) => void;
  onThemeChange: (theme: UserSettings['theme']) => void;
  onUpdateSettings: (updates: Partial<UserSettings>) => void;
  onThresholdChange: (value: number) => void;
  onUpdateProject?: (id: string, updates: Partial<Project>) => void;
  onAvatarUpdate: (avatar: string) => Promise<void>;
  onChangePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<{ success: boolean; error?: string }>;
  onUpdateProfileName: (firstName: string, lastName: string) => Promise<{ success: boolean; error?: string }>;
}

const SettingsCoreTabs: React.FC<SettingsCoreTabsProps> = (props) => {
  const { activeTab, user, org, allUsers, projects, teams, settings, onToggle, onThemeChange, onUpdateSettings, onThresholdChange, onUpdateProject, onAvatarUpdate, onChangePassword, onUpdateProfileName } = props;

  if (activeTab === 'profile') {
    return (
      <ProfileSettingsPanel
        user={user}
        org={org}
        teams={teams}
        onAvatarUpdate={onAvatarUpdate}
        onChangePassword={onChangePassword}
        onUpdateProfileName={onUpdateProfileName}
      />
    );
  }

  if (activeTab === 'general') {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="p-4 border border-slate-200 rounded-xl bg-white">
          <p className="text-sm font-medium text-slate-900">Copilot response style</p>
          <p className="text-xs text-slate-600 mt-1">Choose how Copilot structures answers across project and workspace prompts.</p>
          <div className="mt-3">
            <AppSelect
              value={settings.copilotResponseStyle}
              onChange={(value) =>
                onUpdateSettings({
                  copilotResponseStyle: value as UserSettings['copilotResponseStyle']
                })
              }
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              options={[
                { value: 'action_plan', label: 'Action plan (recommended)' },
                { value: 'concise', label: 'Concise' },
                { value: 'executive', label: 'Executive summary' }
              ]}
            />
          </div>
        </div>
        <SettingsToggleRow
          icon={<Sparkles className="w-4 h-4" />}
          title="AI Task Assist & Generation"
          description="Enable AI-powered task suggestions, AI-generated tasks, image-to-task, and Copilot task creation."
          enabled={settings.aiSuggestions}
          onToggle={() => onToggle('aiSuggestions')}
        />
        <SettingsToggleRow
          icon={<Cloud className="w-4 h-4" />}
          title="Live Collaboration Sync"
          description="Receive live updates and background auto-refresh while teammates make changes."
          enabled={settings.realTimeUpdates}
          onToggle={() => onToggle('realTimeUpdates')}
        />
        <SettingsToggleRow
          icon={<Sparkles className="w-4 h-4" />}
          title="Smart Effort Forecasting"
          description="Adjust effort forecasts using historical estimate-vs-actual data and trigger risk approval alerts."
          enabled={settings.enableEstimateCalibration}
          onToggle={() => onToggle('enableEstimateCalibration')}
        />
        <SettingsToggleRow
          icon={<User className="w-4 h-4" />}
          title="Show My Forecast Insights"
          description="Show your personal risk-adjusted forecast details in planning and task views."
          enabled={settings.showPersonalCalibration}
          onToggle={() => onToggle('showPersonalCalibration')}
        />
      </div>
    );
  }

  if (activeTab === 'notifications') {
    return <NotificationsSettingsPanel user={user} settings={settings} onUpdateSettings={onUpdateSettings} />;
  }

  if (activeTab === 'security') {
    return (
      <SecuritySettingsPanel
        user={user}
        org={org}
        allUsers={allUsers}
        teams={teams}
        projects={projects}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
        onUpdateProject={onUpdateProject}
      />
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <SettingsToggleRow
        icon={<Monitor className="w-4 h-4" />}
        title="Compact Mode"
        description="Reduce spacing to fit more content on screen."
        enabled={settings.compactMode}
        onToggle={() => onToggle('compactMode')}
      />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {(['Light', 'Dark', 'Aurora'] as const).map((theme) => (
          <button
            key={theme}
            onClick={() => onThemeChange(theme)}
            className={`p-3 rounded-xl border transition-colors text-left ${settings.theme === theme ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
          >
            <div className={`w-full h-10 rounded-md ${theme === 'Light' ? 'bg-slate-100 border border-slate-200' : theme === 'Dark' ? 'bg-slate-800' : 'bg-gradient-to-br from-indigo-500 via-violet-500 to-emerald-500'}`} />
            <p className="text-xs font-medium text-slate-700 mt-2 text-center">{theme}</p>
          </button>
        ))}
      </div>
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
        <p className="text-xs text-slate-600">Theme changes apply instantly across board, modals, and dashboard pages.</p>
      </div>
    </div>
  );
};

export default SettingsCoreTabs;
