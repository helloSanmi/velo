import { ReactNode } from 'react';
import { Organization, Project } from '../../types';

export interface IntegrationConnectionsState {
  slackConnected: boolean;
  githubConnected: boolean;
  slackLabel?: string;
  githubLabel?: string;
}

export type StatusFilter = 'All' | 'Connected' | 'Not Connected';

export type ConnectingProvider = 'microsoft' | null;
export type ConnectingIntegrationProvider = 'slack' | 'github' | null;

export interface IntegrationHubProps {
  projects: Project[];
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
  org?: Organization | null;
  onUpdateOrganizationSettings?: (
    patch: Partial<Pick<Organization, 'allowMicrosoftAuth' | 'microsoftWorkspaceConnected'>>
  ) => Promise<void>;
  compact?: boolean;
}

export interface IntegrationCardModel {
  id: 'slack' | 'github';
  name: string;
  description: string;
  icon: ReactNode;
  enabled: boolean;
  workspaceConnected: boolean;
  workspaceLabel?: string;
  actionLabel: string;
  isConnecting: boolean;
  onClick: () => void;
}
