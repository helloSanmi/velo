import { beforeEach, describe, expect, it } from 'vitest';
import { teamService } from '../teamService';
import { User } from '../../types';

const orgId = 'org-test';
const admin: User = { id: 'u-admin', orgId, username: 'admin', displayName: 'Admin', role: 'admin' };
const member: User = { id: 'u-member', orgId, username: 'member', displayName: 'Member', role: 'member' };

describe('teamService', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('allows admin to create team', () => {
    const result = teamService.createTeam(admin, orgId, {
      name: 'Platform Team',
      leadId: member.id,
      memberIds: [member.id]
    });
    expect(result.error).toBeUndefined();
    expect(result.team?.name).toBe('Platform Team');
    expect(result.team?.leadId).toBe(member.id);
    expect(result.team?.memberIds).toContain(member.id);
  });

  it('blocks non-admin team creation', () => {
    const result = teamService.createTeam(member, orgId, {
      name: 'Forbidden Team',
      memberIds: [member.id]
    });
    expect(result.error).toBe('Only admins can manage teams.');
  });

  it('updates and deletes team with admin permission', () => {
    const created = teamService.createTeam(admin, orgId, {
      name: 'Ops',
      memberIds: [member.id]
    }).team!;

    const updated = teamService.updateTeam(admin, created.id, { name: 'Ops Core' });
    expect(updated.error).toBeUndefined();
    expect(updated.team?.name).toBe('Ops Core');

    const removed = teamService.deleteTeam(admin, created.id);
    expect(removed.success).toBe(true);
    expect(teamService.getTeams(orgId)).toHaveLength(0);
  });
});
