import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import Button from '../../../ui/Button';
import AppSelect from '../../../ui/AppSelect';
import { Project, Team, User } from '../../../../types';
import { getUserFullName } from '../../../../utils/userDisplay';

interface ProjectAccessManagementSectionProps {
  users: User[];
  teams: Team[];
  projects: Project[];
  onSaveProjectMembers?: (id: string, updates: Partial<Project>) => void;
}

const ProjectAccessManagementSection: React.FC<ProjectAccessManagementSectionProps> = ({ users, teams, projects, onSaveProjectMembers }) => {
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [directMemberIds, setDirectMemberIds] = useState<string[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

  const selectedProject = useMemo(() => projects.find((project) => project.id === projectId) || null, [projectId, projects]);
  const selectedProjectOwnerIds = useMemo(() => {
    if (!selectedProject) return new Set<string>();
    const ownerIds = Array.isArray(selectedProject.ownerIds) ? selectedProject.ownerIds : [];
    return new Set([selectedProject.createdBy, ...ownerIds].filter(Boolean));
  }, [selectedProject]);
  const selectedProjectMemberIds = useMemo(() => new Set((selectedProject?.members || []).filter(Boolean)), [selectedProject]);
  const selectedTeamMemberIds = useMemo(
    () =>
      new Set(
        selectedTeamIds.flatMap((teamId) => {
          const team = teams.find((candidate) => candidate.id === teamId);
          return team?.memberIds || [];
        })
      ),
    [selectedTeamIds, teams]
  );

  const toggleDirectMember = (memberId: string) => {
    setDirectMemberIds((prev) => (prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]));
  };

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds((prev) => (prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]));
  };

  const getProjectRoleLabel = (memberId: string) => {
    if (selectedProjectOwnerIds.has(memberId)) return 'Owner';
    if (selectedProjectMemberIds.has(memberId)) return 'Member';
    return 'Viewer';
  };

  const onProjectChange = (nextProjectId: string) => {
    setProjectId(nextProjectId);
    const nextProject = projects.find((project) => project.id === nextProjectId);
    setSelectedTeamIds([]);
    if (!nextProject) {
      setDirectMemberIds([]);
      return;
    }
    const members = Array.isArray(nextProject.members) ? nextProject.members : [];
    setDirectMemberIds(Array.from(new Set(members.filter(Boolean))));
  };

  const saveAccess = () => {
    if (!selectedProject || !onSaveProjectMembers) return;
    const ownerIds = Array.isArray(selectedProject.ownerIds) ? selectedProject.ownerIds : [];
    const teamMemberIds = selectedTeamIds.flatMap((teamId) => {
      const team = teams.find((candidate) => candidate.id === teamId);
      return team?.memberIds || [];
    });
    const nextMembers = Array.from(new Set([...directMemberIds, ...teamMemberIds, ...ownerIds, selectedProject.createdBy].filter(Boolean)));
    onSaveProjectMembers(selectedProject.id, { members: nextMembers });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
      <button type="button" onClick={() => setOpen((prev) => !prev)} className="w-full flex items-center justify-between gap-2 text-left">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
          <ShieldCheck className="h-4 w-4 text-slate-600" />
          Project access management
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
      </button>
      {open ? (
        <>
          <p className="text-xs text-slate-500">Choose a project, then add people directly or through teams.</p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[220px] flex-1">
              <AppSelect
                value={projectId}
                onChange={onProjectChange}
                className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm"
                options={[
                  { value: '', label: 'Select project' },
                  ...projects.map((project) => ({ value: project.id, label: project.name }))
                ]}
              />
            </div>
            {selectedProject ? <Button size="sm" onClick={saveAccess} disabled={!onSaveProjectMembers}>Save access</Button> : null}
          </div>
          {selectedProject ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-2">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Users</p>
                <div className="max-h-28 space-y-1 overflow-y-auto custom-scrollbar">
                  {users.map((member) => (
                    <label key={member.id} className="inline-flex w-full items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700">
                      <input type="checkbox" checked={directMemberIds.includes(member.id)} onChange={() => toggleDirectMember(member.id)} />
                      <span className="flex-1 truncate">{getUserFullName(member)}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                        getProjectRoleLabel(member.id) === 'Owner'
                          ? 'bg-indigo-100 text-indigo-700'
                          : getProjectRoleLabel(member.id) === 'Member'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-600'
                      }`}>
                        {getProjectRoleLabel(member.id)}
                      </span>
                      {selectedTeamMemberIds.has(member.id) && !selectedProjectMemberIds.has(member.id) ? (
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Will get access</span>
                      ) : null}
                    </label>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 p-2">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Teams</p>
                <div className="max-h-28 space-y-1 overflow-y-auto custom-scrollbar">
                  {teams.length === 0 ? (
                    <p className="text-xs text-slate-500">No teams available.</p>
                  ) : (
                    teams.map((team) => (
                      <label key={team.id} className="inline-flex w-full items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700">
                        <input type="checkbox" checked={selectedTeamIds.includes(team.id)} onChange={() => toggleTeam(team.id)} />
                        <span className="truncate">{team.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500">Select a project to manage who can access it.</div>
          )}
        </>
      ) : null}
    </div>
  );
};

export default ProjectAccessManagementSection;
