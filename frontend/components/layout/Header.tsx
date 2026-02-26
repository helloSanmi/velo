import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Cloud, Menu, Plus, RotateCcw } from 'lucide-react';
import Button from '../ui/Button';
import { taskService } from '../../services/taskService';
import { notificationService, Notification } from '../../services/notificationService';
import { dialogService } from '../../services/dialogService';
import HeaderNotificationsMenu from './header/HeaderNotificationsMenu';
import HeaderProfileMenu from './header/HeaderProfileMenu';
import { HeaderProps } from './header/types';

const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  onNewTask,
  onReset,
  onRefreshData,
  onToggleSidebar,
  onOpenProfile,
  onOpenSettings,
  onOpenTaskFromNotification,
  onlineCount,
  isOnline,
  pendingSyncCount = 0
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const previousUnreadRef = useRef(0);

  const fetchNotifications = useCallback(() => {
    setNotifications(notificationService.getNotifications(user.orgId, user.id));
  }, [user.id, user.orgId]);

  useEffect(() => {
    fetchNotifications();
    const handleAlertUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ userId: string; orgId: string }>).detail;
      if (detail?.userId === user.id && detail?.orgId === user.orgId) fetchNotifications();
    };
    window.addEventListener('notificationsUpdated', handleAlertUpdate);
    return () => window.removeEventListener('notificationsUpdated', handleAlertUpdate);
  }, [user.id, user.orgId, fetchNotifications]);

  useEffect(() => {
    const unread = notifications.filter((item) => !item.read).length;
    if (unread > previousUnreadRef.current) notificationService.testSound(user.id);
    previousUnreadRef.current = unread;
  }, [notifications, user.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsProfileOpen(false);
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) setIsNotificationsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((item) => !item.read).length;

  return (
    <header className="flex-none w-full bg-white/95 backdrop-blur-md border-b border-slate-200 px-2.5 sm:px-4 md:px-8 py-2.5 sticky top-0 z-[55]">
      <div className="max-w-[1800px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button onClick={onToggleSidebar} className="p-1.5 sm:p-2 -ml-0.5 sm:-ml-1 text-slate-500 hover:bg-slate-100 rounded-lg lg:hidden transition-all active:scale-95">
            <Menu className="w-5 h-5" />
          </button>

          <button type="button" className="flex items-center gap-1.5 sm:gap-2 cursor-pointer select-none min-w-0" onClick={onRefreshData} title="Refresh board data">
            <div className="bg-[#76003f] p-1.5 rounded-lg shrink-0">
              <Cloud className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-base sm:text-lg font-heading font-bold text-slate-900 tracking-tight truncate">
              Velo<span className="text-[#76003f]">.</span>
            </h1>
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <div className="hidden md:flex items-center gap-2 pr-2">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-400'}`} />
            <span className="text-xs font-medium text-slate-500">{isOnline ? `Live · ${onlineCount} online` : 'Offline'}</span>
          </div>
          {isOnline && pendingSyncCount > 0 ? (
            <div className="h-6 px-2 rounded-full border border-amber-200 bg-amber-50 text-[11px] font-medium text-amber-800 inline-flex items-center whitespace-nowrap">
              Sync pending ({pendingSyncCount})
            </div>
          ) : null}

          <div className="hidden sm:flex items-center border-r border-slate-200 pr-3 gap-1.5">
            <button
              onClick={async () => {
                const confirmed = await dialogService.confirm('Reset all demo data?', { title: 'Reset workspace', confirmText: 'Reset', danger: true });
                if (!confirmed) return;
                taskService.clearData();
                onReset();
              }}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-all"
              title="Reset System"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <Button size="sm" variant="primary" onClick={onNewTask} className="rounded-lg h-8 px-2.5 sm:px-3.5 tracking-tight text-xs bg-[#76003f] hover:bg-[#640035] min-w-0">
            <Plus className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden min-[361px]:inline">New Task</span>
            <span className="min-[361px]:hidden sr-only">New Task</span>
          </Button>

          <div ref={notificationRef}>
            <HeaderNotificationsMenu
              orgId={user.orgId}
              userId={user.id}
              isOpen={isNotificationsOpen}
              notifications={notifications}
              unreadCount={unreadCount}
              onToggle={() => setIsNotificationsOpen((prev) => !prev)}
              onOpenTask={onOpenTaskFromNotification}
              onCloseMenu={() => setIsNotificationsOpen(false)}
            />
          </div>

          <div ref={dropdownRef}>
            <HeaderProfileMenu
              user={user}
              isOpen={isProfileOpen}
              onToggle={() => setIsProfileOpen((prev) => !prev)}
              onOpenProfile={onOpenProfile}
              onOpenSettings={onOpenSettings}
              onLogout={onLogout}
              onClose={() => setIsProfileOpen(false)}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
