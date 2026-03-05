import { Team } from '../../types';
import { normalizeTeam } from './store';

export const mapApiTeam = (row: any): Team =>
  normalizeTeam({
    id: row.id,
    orgId: row.orgId,
    name: row.name,
    description: row.description || undefined,
    leadId: row.leadId || undefined,
    memberIds: Array.isArray(row.memberIds) ? row.memberIds : [],
    createdBy: row.createdBy,
    createdAt: new Date(row.createdAt).getTime(),
    updatedAt: new Date(row.updatedAt).getTime()
  });
