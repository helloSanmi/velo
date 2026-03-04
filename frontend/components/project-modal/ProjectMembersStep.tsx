import React from 'react';
import { Check } from 'lucide-react';
import { User } from '../../types';
import { getUserFullName } from '../../utils/userDisplay';
import Button from '../ui/Button';

interface ProjectMembersStepProps {
  users: User[];
  memberIds: string[];
  currentUserId: string;
  onToggleMember: (id: string) => void;
  onDone: () => void;
}

const ProjectMembersStep: React.FC<ProjectMembersStepProps> = ({
  users,
  memberIds,
  currentUserId,
  onToggleMember,
  onDone
}) => (
  <div className="space-y-3">
    <p className="text-sm text-slate-600">Select project members:</p>
    <div className="grid sm:grid-cols-2 gap-2 max-h-[42vh] md:max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
      {users.map((user) => {
        const selected = memberIds.includes(user.id);
        return (
          <button
            key={user.id}
            onClick={() => onToggleMember(user.id)}
            className={`p-3 rounded-lg border text-left transition-colors ${selected ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:bg-slate-50'} ${user.id === currentUserId ? 'opacity-80' : ''}`}
          >
            <div className="flex items-center gap-2.5">
              <img src={user.avatar} alt={user.displayName} title={getUserFullName(user)} className="w-8 h-8 rounded-lg border border-slate-200" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 truncate">{user.displayName}{user.id === currentUserId ? ' (You)' : ''}</p>
                <p className="text-xs text-slate-500 truncate">{user.role || 'member'}</p>
              </div>
              {selected ? <Check className="w-4 h-4 text-slate-900" /> : null}
            </div>
          </button>
        );
      })}
    </div>
    <Button className="w-full" onClick={onDone}>Done</Button>
  </div>
);

export default ProjectMembersStep;
