import { Task } from '../../types';

export type StatusFilter = 'All' | 'On Track' | 'At Risk' | 'Completed';
export type HorizonFilter = 'All' | '30' | '90' | '180';

export interface MilestoneItem extends Task {
  dueDate: number;
  dueInDays: number;
  completed: boolean;
  atRisk: boolean;
  lane: 'now' | 'next' | 'later' | 'completed';
  startInDays: number;
}
