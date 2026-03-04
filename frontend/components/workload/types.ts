import { User } from '../../types';

export type LoadFilter = 'All' | 'High' | 'Medium' | 'Low';

export interface UserWorkloadStat extends User {
  load: number;
  status: LoadFilter;
  done: number;
  highCount: number;
}

export interface WorkloadSuggestion {
  taskId: string;
  fromUserId: string;
  toUserId: string;
  reason: string;
}
