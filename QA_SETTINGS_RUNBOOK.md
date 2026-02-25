# Settings Manual QA Runbook

## Scope
Validate all Settings tabs end-to-end for:
- Admin
- Project owner (non-admin)
- Project member
- Uninvolved member

## Test data setup (required)
1. Create users:
- `admin-a` (role: admin)
- `owner-o` (role: member)
- `member-m` (role: member)
- `worker-w` (role: member, not in project members)
- `outsider-x` (role: member, uninvolved)
2. Create project `P1`:
- `createdBy = owner-o`
- `ownerIds = [owner-o]`
- `members = [owner-o, member-m]`
3. Create task `T1` in `P1`:
- assign `worker-w` via assignee (not project member)
4. Ensure all users are in same org.

## Global checks (all roles)
1. Open Settings modal.
2. Confirm no console errors.
3. Confirm close/open works.
4. Confirm current tab state changes correctly when clicking nav.

## Role matrix

### Admin (`admin-a`)
Expected tabs:
- General, Appearance, Notifications, Teams & Access, Workflows, Security, Licenses, Integrations, Danger Zone

Checks:
1. Workflows tab:
- Can see rules from all projects.
- Can add rule.
- Can toggle Active/Paused.
- Can delete rule.
2. Security tab:
- Every toggle/dropdown/text field saves immediately.
- Section collapse/expand works:
  - Session & authentication
  - Access & invite controls
  - API, audit & data protection
3. Licenses tab:
- Add user works.
- Edit user works.
- Role update works.
- Remove user works (not self).
- Invite create/revoke works.
- Add seats works (no dummy upgrade toast).
4. Integrations tab:
- Slack connect/disconnect persists.
- GitHub connect/disconnect persists.
- Jira connect/disconnect persists.
- GitHub repo input persists.
- Jira project key input persists.
5. Danger Zone:
- Delete button remains disabled until exact workspace name + `DELETE`.

### Owner (`owner-o`, non-admin)
Expected tabs:
- General, Appearance, Notifications, Teams & Access, Workflows
- Must NOT see Security/Licenses/Integrations/Danger Zone

Checks:
1. Workflows tab:
- Visible.
- Can view rules for involved projects.
- Can create/manage rules for owned project `P1`.
2. Teams & Access:
- Team create/edit/delete blocked unless admin-only behavior is expected.
- Group create/edit allowed only within owner permission rules.

### Member (`member-m`)
Expected tabs:
- General, Appearance, Notifications, Teams & Access, Workflows
- Must NOT see Security/Licenses/Integrations/Danger Zone

Checks:
1. Workflows tab:
- Visible (member is in `P1.members`).
- Can view rules for `P1`.
- Cannot add rule.
- Cannot toggle rule state.
- Cannot delete rule.
2. Teams & Access:
- Read-only where not permitted.

### Assigned non-member (`worker-w`)
Expected tabs:
- General, Appearance, Notifications, Teams & Access, Workflows

Checks:
1. Workflows tab:
- Visible (assigned task in `P1`).
- Shows `P1` rules.
- Cannot manage rules.

### Uninvolved member (`outsider-x`)
Expected tabs:
- General, Appearance, Notifications, Teams & Access
- Workflows tab should NOT appear

Checks:
1. Confirm Workflows tab hidden.

## Notifications tab checks (any non-admin + admin)
1. Toggle `Enable all notifications`.
2. Toggle individual switches.
3. Toggle sound + test sound button.
4. Click Apply changes and confirm persistence after close/reopen.
5. Click Discard and confirm rollback before apply.

## General/Appearance checks (all visible roles)
1. General:
- Copilot response style persists.
- AI/Realtime/Forecast/Personal toggles persist.
2. Appearance:
- Compact mode persists.
- Theme switch applies instantly and persists.

## Teams & Access checks
1. Teams:
- Admin can create/edit/delete teams.
- Non-admin cannot manage if policy says read-only.
2. Groups:
- Global group create/edit/delete admin-only.
- Project group create/edit/delete owner/admin by project scope.

## Pass/Fail template
Use this table per run:

| Role | Tab | Test | Result | Notes |
|---|---|---|---|---|
| admin-a | Workflows | Add/toggle/delete | PASS/FAIL | |
| admin-a | Security | Immediate-save + collapse | PASS/FAIL | |
| admin-a | Licenses | user/invite/seat actions | PASS/FAIL | |
| admin-a | Integrations | Slack/GitHub/Jira real actions | PASS/FAIL | |
| owner-o | Workflows | view + manage owned | PASS/FAIL | |
| member-m | Workflows | view-only | PASS/FAIL | |
| worker-w | Workflows | assigned non-member view-only | PASS/FAIL | |
| outsider-x | Workflows | hidden | PASS/FAIL | |

