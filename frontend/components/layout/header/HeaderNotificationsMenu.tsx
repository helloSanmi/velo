import React from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import { Notification, notificationService } from '../../../services/notificationService';
import { dialogService } from '../../../services/dialogService';

interface HeaderNotificationsMenuProps {
  orgId: string;
  userId: string;
  isOpen: boolean;
  notifications: Notification[];
  unreadCount: number;
  onToggle: () => void;
  onOpenTask: (taskId: string) => void;
  onCloseMenu: () => void;
}

const formatNotificationTime = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return 'Just now';
  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))}m ago`;
  if (diff < day) return `${Math.max(1, Math.floor(diff / hour))}h ago`;
  return `${Math.max(1, Math.floor(diff / day))}d ago`;
};

const HeaderNotificationsMenu: React.FC<HeaderNotificationsMenuProps> = ({
  orgId,
  userId,
  isOpen,
  notifications,
  unreadCount,
  onToggle,
  onOpenTask,
  onCloseMenu
}) => (
  <div className="relative">
    <button
      onClick={onToggle}
      className="p-1.5 sm:p-1.5 bg-[#f8eef3] text-[#76003f] hover:text-[#640035] hover:bg-[#f3e3eb] rounded-lg transition-all relative border border-[#ead4df]"
    >
      <Bell className="w-4 h-4" />
      {unreadCount > 0 && (
        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
      )}
    </button>

    {isOpen && (
      <div className="absolute right-0 mt-3 w-[min(92vw,360px)] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-[120]">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            <p className="text-xs text-slate-500">{unreadCount} unread</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                const confirmed = await dialogService.confirm('Clear all notifications?', {
                  title: 'Clear notifications',
                  description: 'This removes all notifications for your account.',
                  confirmText: 'Clear all',
                  danger: true
                });
                if (!confirmed) return;
                notificationService.clearAll(orgId, userId);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 disabled:opacity-40"
              disabled={notifications.length === 0}
            >
              Clear all
            </button>
            <button
              onClick={() => notificationService.markAllAsRead(orgId, userId)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#76003f] hover:text-[#640035] disabled:opacity-40"
              disabled={unreadCount === 0}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">No notifications yet.</div>
        ) : (
          <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
            {notifications.map((item) => (
              <div
                key={item.id}
                className={`w-full text-left px-4 py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors ${
                  item.read ? 'bg-white' : 'bg-rose-50/35'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => {
                      notificationService.markAsRead(orgId, userId, item.id);
                      if (item.linkId) onOpenTask(item.linkId);
                      onCloseMenu();
                    }}
                    className="min-w-0 text-left"
                  >
                    <p className={`text-sm ${item.read ? 'text-slate-700' : 'text-slate-900 font-semibold'}`}>{item.title}</p>
                    <p className="text-xs text-slate-600 mt-0.5 truncate">{item.message}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{formatNotificationTime(item.timestamp)}</p>
                  </button>
                  <div className="flex items-center gap-2">
                    {!item.read ? <span className="mt-1 w-2 h-2 rounded-full bg-rose-500 shrink-0" /> : null}
                    <button
                      aria-label="Clear notification"
                      title="Clear notification"
                      onClick={() => notificationService.clearOne(orgId, userId, item.id)}
                      className="shrink-0 rounded-md p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}
  </div>
);

export default HeaderNotificationsMenu;
