import React from 'react';
import { BOARD_CONTENT_GUTTER_CLASS, BOARD_INNER_WRAP_CLASS, BOARD_OUTER_WRAP_CLASS } from './layout';

interface KanbanOnboardingNoticeProps {
  visible: boolean;
  onDismiss: () => void;
}

const KanbanOnboardingNotice: React.FC<KanbanOnboardingNoticeProps> = ({ visible, onDismiss }) => {
  if (!visible) return null;
  return (
    <div className={`${BOARD_OUTER_WRAP_CLASS} pt-2`}>
      <div className={`${BOARD_INNER_WRAP_CLASS} ${BOARD_CONTENT_GUTTER_CLASS}`}>
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 flex items-start justify-between gap-2">
          <p className="text-xs text-indigo-800">
            New board modes available: use <span className="font-semibold">Kanban</span>, <span className="font-semibold">Checklist</span>,{' '}
            <span className="font-semibold">Gantt</span>, <span className="font-semibold">Table</span>,{' '}
            <span className="font-semibold">Calendar</span>, and <span className="font-semibold">Workload</span> from the top switcher.
          </p>
          <button
            type="button"
            className="text-[11px] rounded border border-indigo-200 bg-white px-2 py-0.5 text-indigo-700 hover:bg-indigo-100"
            onClick={onDismiss}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default KanbanOnboardingNotice;
