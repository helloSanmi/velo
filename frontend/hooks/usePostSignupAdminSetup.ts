import { useEffect, useState } from 'react';
import { SecurityGroup, Team, User } from '../types';

const SETUP_MARKER_KEY = 'velo_post_signup_setup';

export const usePostSignupAdminSetup = (
  user: User | null,
  teams: Team[],
  groups: SecurityGroup[],
  isSettingsOpen: boolean
) => {
  const [isAdminSetupOpen, setIsAdminSetupOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    try {
      const raw = sessionStorage.getItem(SETUP_MARKER_KEY);
      if (!raw) return;
      const marker = JSON.parse(raw) as { orgId?: string; userId?: string };
      if (marker.orgId !== user.orgId || marker.userId !== user.id) return;
      const orgTeams = teams.filter((team) => team.orgId === user.orgId);
      const orgGroups = groups.filter((group) => group.orgId === user.orgId);
      const isComplete = orgTeams.length > 0 && orgGroups.length > 0;
      if (isComplete) {
        sessionStorage.removeItem(SETUP_MARKER_KEY);
        setIsAdminSetupOpen(false);
        return;
      }
      if (!isSettingsOpen) setIsAdminSetupOpen(true);
    } catch {
      // Ignore malformed marker.
    }
  }, [user, teams, groups, isSettingsOpen]);

  const completeSetup = () => {
    sessionStorage.removeItem(SETUP_MARKER_KEY);
    setIsAdminSetupOpen(false);
  };

  return {
    isAdminSetupOpen,
    setIsAdminSetupOpen,
    completeSetup
  };
};
