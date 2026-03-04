import { ProjectLifecycle, UserRole } from '@prisma/client';

export interface ProjectMetadataPatch {
  startDate?: number;
  endDate?: number;
  budgetCost?: number;
  hourlyRate?: number;
  scopeSummary?: string;
  scopeSize?: number;
  completionComment?: string;
  completionRequestedAt?: number;
  completionRequestedById?: string;
  completionRequestedByName?: string;
  completionRequestedComment?: string;
  ownerIds?: string[];
  reopenedAt?: number;
  reopenedById?: string;
  archivedAt?: number;
  archivedById?: string;
  completedAt?: number;
  completedById?: string;
  deletedAt?: number;
  deletedById?: string;
  integrations?: {
    slack?: { enabled?: boolean; channel?: string };
    github?: { enabled?: boolean; repo?: string };
  };
}

export interface ProjectActor {
  userId: string;
  role: UserRole;
}

export interface ProjectCreateInput {
  orgId: string;
  actor: ProjectActor;
  id?: string;
  name: string;
  description: string;
  color: string;
  stageDefs?: { id: string; name: string }[];
  isPublic?: boolean;
  publicToken?: string;
  memberIds: string[];
  metadata?: ProjectMetadataPatch;
}

export interface ProjectUpdateInput {
  orgId: string;
  projectId: string;
  actor: ProjectActor;
  patch: Partial<{
    name: string;
    description: string;
    color: string;
    stageDefs: { id: string; name: string }[];
    isPublic: boolean;
    publicToken: string;
    lifecycle: ProjectLifecycle;
    ownerId: string;
    memberIds: string[];
    metadata: ProjectMetadataPatch;
  }>;
}

export interface ProjectRemoveInput {
  orgId: string;
  projectId: string;
  actor: ProjectActor;
}
