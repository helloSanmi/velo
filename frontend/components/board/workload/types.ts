import { Task } from '../../../types';

export interface WorkloadSuggestion {
  id: string;
  task: Task;
  fromUserId: string;
  toUserId: string;
  fromName: string;
  toName: string;
}
