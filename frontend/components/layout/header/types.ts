import { User as UserType } from '../../../types';
import { SettingsTabType } from '../../SettingsModal';

export interface HeaderProps {
  user: UserType;
  onLogout: () => void;
  onNewTask: () => void;
  onReset: () => void;
  onRefreshData: () => void;
  onToggleSidebar: () => void;
  onOpenProfile: () => void;
  onOpenSettings: (tab: SettingsTabType) => void;
  onOpenTaskFromNotification: (taskId: string) => void;
  onlineCount: number;
  isOnline: boolean;
  pendingSyncCount?: number;
}
