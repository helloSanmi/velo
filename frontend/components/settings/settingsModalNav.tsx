import React from 'react';
import { Bell, Link2, Monitor, Settings, Shield, Sparkles, Users, Zap } from 'lucide-react';
import type { SettingsTabType } from '../SettingsModal';
import { User as UserType } from '../../types';

export const buildSettingsNavItems = (
  user: UserType,
  canAccessWorkflowAutomation: boolean
): Array<{ id: SettingsTabType; label: string; icon: React.ReactNode }> => {
  const navItems: Array<{ id: SettingsTabType; label: string; icon: React.ReactNode }> = [
    { id: 'general', label: 'General', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <Monitor className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'teams', label: 'Teams & Access', icon: <Users className="w-4 h-4" /> }
  ];

  if (canAccessWorkflowAutomation) {
    navItems.push({ id: 'automation', label: 'Workflows', icon: <Zap className="w-4 h-4" /> });
  }

  if (user.role === 'admin') {
    navItems.push({ id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> });
    navItems.push({ id: 'licenses', label: 'Users', icon: <Settings className="w-4 h-4" /> });
    navItems.push({ id: 'policy', label: 'Policy', icon: <Bell className="w-4 h-4" /> });
    navItems.push({ id: 'integrations', label: 'Integrations', icon: <Link2 className="w-4 h-4" /> });
    navItems.push({ id: 'danger', label: 'Danger Zone', icon: <Shield className="w-4 h-4" /> });
  }

  return navItems;
};
