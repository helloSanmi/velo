import React, { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCircle2, Volume2 } from 'lucide-react';
import Button from '../../ui/Button';
import { User as UserType } from '../../../types';
import { dialogService } from '../../../services/dialogService';
import { notificationService } from '../../../services/notificationService';
import { UserSettings } from '../../../services/settingsService';

interface NotificationsSettingsPanelProps {
  user: UserType;
  settings: UserSettings;
  onUpdateSettings: (updates: Partial<UserSettings>) => void;
}

const toggleClass = (active: boolean) => `w-11 h-6 rounded-full p-1 transition-colors ${active ? 'bg-slate-900' : 'bg-slate-300'}`;
const thumbClass = (active: boolean) => `block w-4 h-4 rounded-full bg-white transition-transform ${active ? 'translate-x-5' : ''}`;
const notificationOptions = [
  { key: 'notificationTaskAssignment' as const, title: 'Task assignment', description: "When you're assigned or unassigned." },
  { key: 'notificationMentionsReplies' as const, title: 'Mentions and replies', description: 'When someone mentions you or comments on your work.' },
  { key: 'notificationProjectCompletionActions' as const, title: 'Project completion actions', description: 'Completion requests, approvals, and project-complete updates.' },
  { key: 'notificationDueOverdue' as const, title: 'Due and overdue reminders', description: 'Due soon, overdue, and escalation reminders.' },
  { key: 'notificationStatusChangesMyWork' as const, title: 'Status changes on my work', description: 'Task completed/moved back changes on tasks tied to you.' },
  { key: 'notificationSystemSecurity' as const, title: 'System and security alerts', description: 'Workspace/security changes and important system notices.' }
];
const buildDraft = (settings: UserSettings) => ({
  enableNotifications: settings.enableNotifications,
  notificationTaskAssignment: settings.notificationTaskAssignment,
  notificationMentionsReplies: settings.notificationMentionsReplies,
  notificationProjectCompletionActions: settings.notificationProjectCompletionActions,
  notificationDueOverdue: settings.notificationDueOverdue,
  notificationStatusChangesMyWork: settings.notificationStatusChangesMyWork,
  notificationSystemSecurity: settings.notificationSystemSecurity,
  notificationSound: settings.notificationSound
});

const NotificationsSettingsPanel: React.FC<NotificationsSettingsPanelProps> = ({
  user,
  settings,
  onUpdateSettings
}) => {
  const [draft, setDraft] = useState(buildDraft(settings));

  useEffect(() => {
    setDraft(buildDraft(settings));
  }, [settings]);
  const options = useMemo(() => notificationOptions, []);

  const hasChanges =
    draft.enableNotifications !== settings.enableNotifications ||
    draft.notificationTaskAssignment !== settings.notificationTaskAssignment ||
    draft.notificationMentionsReplies !== settings.notificationMentionsReplies ||
    draft.notificationProjectCompletionActions !== settings.notificationProjectCompletionActions ||
    draft.notificationDueOverdue !== settings.notificationDueOverdue ||
    draft.notificationStatusChangesMyWork !== settings.notificationStatusChangesMyWork ||
    draft.notificationSystemSecurity !== settings.notificationSystemSecurity ||
    draft.notificationSound !== settings.notificationSound;

  const resetDraft = () => setDraft(buildDraft(settings));

  const applyChanges = () => {
    onUpdateSettings({
      enableNotifications: draft.enableNotifications,
      notificationTaskAssignment: draft.notificationTaskAssignment,
      notificationMentionsReplies: draft.notificationMentionsReplies,
      notificationProjectCompletionActions: draft.notificationProjectCompletionActions,
      notificationDueOverdue: draft.notificationDueOverdue,
      notificationStatusChangesMyWork: draft.notificationStatusChangesMyWork,
      notificationSystemSecurity: draft.notificationSystemSecurity,
      notificationSound: draft.notificationSound
    });
    dialogService.notice('Notification preferences updated.', { title: 'Notifications' });
  };

  const setKey = (key: keyof typeof draft) => {
    setDraft((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleEnableAll = () => {
    setDraft((prev) => {
      const next = !prev.enableNotifications;
      if (!next) {
        return { ...prev, enableNotifications: false };
      }
      return {
        ...prev,
        enableNotifications: true,
        notificationTaskAssignment: true,
        notificationMentionsReplies: true,
        notificationProjectCompletionActions: true,
        notificationDueOverdue: true,
        notificationStatusChangesMyWork: true,
        notificationSystemSecurity: true,
        notificationSound: true
      };
    });
  };

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Enable all notifications</p>
              <p className="text-xs text-slate-500">Turning this on enables every notification option below.</p>
            </div>
          </div>
          <button onClick={toggleEnableAll} className={toggleClass(draft.enableNotifications)}>
            <span className={thumbClass(draft.enableNotifications)} />
          </button>
        </div>
      </div>

      <div className={`rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5 ${draft.enableNotifications ? '' : 'opacity-60'}`}>
        {options.map((option) => (
          <div key={option.key} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">{option.title}</p>
              <p className="text-xs text-slate-500">{option.description}</p>
            </div>
            <button
              onClick={() => setKey(option.key)}
              disabled={!draft.enableNotifications}
              className={toggleClass(draft[option.key])}
            >
              <span className={thumbClass(draft[option.key])} />
            </button>
          </div>
        ))}

        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
          <div className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-900">
            <Volume2 className="w-4 h-4 text-slate-500" />
            Notification sound
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => notificationService.testSound(user.id)}
              className="h-7 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
            >
              Test
            </button>
            <button
              onClick={() => setKey('notificationSound')}
              disabled={!draft.enableNotifications}
              className={toggleClass(draft.notificationSound)}
            >
              <span className={thumbClass(draft.notificationSound)} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
        <p className="text-xs text-slate-500">{hasChanges ? 'Unsaved notification changes.' : 'No pending notification changes.'}</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={resetDraft} disabled={!hasChanges}>
            Discard
          </Button>
          <Button onClick={applyChanges} disabled={!hasChanges} className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Apply changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotificationsSettingsPanel;
