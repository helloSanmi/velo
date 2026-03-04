import React from 'react';

export type TableSortKey = 'order' | 'title' | 'priority' | 'dueDate' | 'assignee';
export type SortDirection = 'asc' | 'desc';

interface BoardTableControlsProps {
  taskCount: number;
  sortBy: TableSortKey;
  sortDirection: SortDirection;
  onSortByChange: (value: TableSortKey) => void;
  onToggleSortDirection: () => void;
}

const BoardTableControls: React.FC<BoardTableControlsProps> = ({
  taskCount,
  sortBy,
  sortDirection,
  onSortByChange,
  onToggleSortDirection
}) => {
  return (
    <div className="border-b border-slate-200 px-3 py-2 flex items-center justify-between gap-2">
      <p className="text-xs md:text-sm font-medium text-slate-700">
        {taskCount} task{taskCount === 1 ? '' : 's'}
      </p>
      <div className="flex items-center gap-2">
        <select
          className="velo-select h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700"
          value={sortBy}
          onChange={(event) => onSortByChange(event.target.value as TableSortKey)}
        >
          <option value="order">Sort: Board order</option>
          <option value="title">Sort: Title</option>
          <option value="priority">Sort: Priority</option>
          <option value="dueDate">Sort: Due date</option>
          <option value="assignee">Sort: Assignee</option>
        </select>
        <button
          type="button"
          onClick={onToggleSortDirection}
          className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700 hover:bg-slate-50"
        >
          {sortDirection === 'asc' ? 'Asc' : 'Desc'}
        </button>
      </div>
    </div>
  );
};

export default BoardTableControls;
