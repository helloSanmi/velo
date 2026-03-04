import React from 'react';
import { User } from '../../../types';

interface AIGenerateAssignmentQuickActionsProps {
  currentUserCandidate?: User;
  onSelectInstruction: (value: string) => void;
}

const AIGenerateAssignmentQuickActions: React.FC<AIGenerateAssignmentQuickActionsProps> = ({
  currentUserCandidate,
  onSelectInstruction
}) => (
  <div className="mt-2 flex flex-wrap gap-1.5">
    <button
      type="button"
      onClick={() => onSelectInstruction('assign by workload')}
      className="h-7 rounded-full border border-slate-300 bg-white px-3 text-[11px] text-slate-700 hover:bg-slate-50"
    >
      Assign by workload
    </button>
    <button
      type="button"
      onClick={() =>
        onSelectInstruction(
          currentUserCandidate ? `assign to ${currentUserCandidate.displayName}` : 'assign to me'
        )
      }
      className="h-7 rounded-full border border-slate-300 bg-white px-3 text-[11px] text-slate-700 hover:bg-slate-50"
    >
      Assign to me
    </button>
    <button
      type="button"
      onClick={() => onSelectInstruction('leave unassigned')}
      className="h-7 rounded-full border border-slate-300 bg-white px-3 text-[11px] text-slate-700 hover:bg-slate-50"
    >
      Leave unassigned
    </button>
  </div>
);

export default AIGenerateAssignmentQuickActions;
