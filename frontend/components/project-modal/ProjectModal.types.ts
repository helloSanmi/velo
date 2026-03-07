export interface ProjectModalSubmitMeta {
  startDate?: number;
  endDate?: number;
  budgetCost?: number;
  hourlyRate?: number;
  scopeSummary?: string;
  scopeSize?: number;
  isPublic?: boolean;
}

export interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    name: string,
    description: string,
    color: string,
    members: string[],
    templateId?: string,
    aiGeneratedTasks?: any[],
    meta?: ProjectModalSubmitMeta
  ) => void;
  currentUserId: string;
  initialTemplateId?: string | null;
  aiPlanEnabled?: boolean;
  aiEnabled?: boolean;
  allowAiMode?: boolean;
}
