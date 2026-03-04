import { AICommandCenterProps } from './types';

export type CopilotControllerProps = Pick<
  AICommandCenterProps,
  | 'isOpen'
  | 'activeProjectId'
  | 'currentUserName'
  | 'currentUserId'
  | 'orgId'
  | 'tasks'
  | 'projects'
  | 'onSelectProject'
  | 'onCreateTask'
  | 'onSetTaskStatus'
  | 'onSetTaskPriority'
  | 'onAssignTask'
  | 'onPinInsight'
  | 'onUnpinInsight'
  | 'isInsightPinned'
>;
