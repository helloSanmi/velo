import React from 'react';
import FilterBar from '../FilterBar';
import { KanbanHeaderProps } from './types';

type KanbanHeaderFiltersProps = Pick<
  KanbanHeaderProps,
  | 'searchQuery'
  | 'projectFilter'
  | 'dueStatusFilter'
  | 'includeUnscheduled'
  | 'projects'
  | 'dueFrom'
  | 'dueTo'
  | 'statusFilter'
  | 'priorityFilter'
  | 'tagFilter'
  | 'assigneeFilter'
  | 'projectStages'
  | 'uniqueTags'
  | 'allUsers'
  | 'setStatusFilter'
  | 'setPriorityFilter'
  | 'setTagFilter'
  | 'setAssigneeFilter'
  | 'setSearchQuery'
  | 'setProjectFilter'
  | 'setDueStatusFilter'
  | 'setIncludeUnscheduled'
  | 'setDueFrom'
  | 'setDueTo'
>;

const KanbanHeaderFilters: React.FC<KanbanHeaderFiltersProps> = ({
  searchQuery,
  projectFilter,
  dueStatusFilter,
  includeUnscheduled,
  projects,
  dueFrom,
  dueTo,
  statusFilter,
  priorityFilter,
  tagFilter,
  assigneeFilter,
  projectStages,
  uniqueTags,
  allUsers,
  setStatusFilter,
  setPriorityFilter,
  setTagFilter,
  setAssigneeFilter,
  setSearchQuery,
  setProjectFilter,
  setDueStatusFilter,
  setIncludeUnscheduled,
  setDueFrom,
  setDueTo
}) => {
  return (
    <div className="w-full">
      <FilterBar
        embedded
        compact
        searchQuery={searchQuery}
        projectFilter={projectFilter}
        dueStatusFilter={dueStatusFilter}
        includeUnscheduled={includeUnscheduled}
        projectOptions={projects.map((project) => ({ id: project.id, name: project.name }))}
        dueFrom={dueFrom}
        dueTo={dueTo}
        statusFilter={statusFilter}
        priorityFilter={priorityFilter}
        tagFilter={tagFilter}
        assigneeFilter={assigneeFilter}
        statusOptions={projectStages}
        uniqueTags={uniqueTags}
        allUsers={allUsers}
        onStatusChange={setStatusFilter}
        onPriorityChange={setPriorityFilter}
        onTagChange={setTagFilter}
        onAssigneeChange={setAssigneeFilter}
        onSearchChange={setSearchQuery}
        onProjectChange={(value) => setProjectFilter(value as string | 'All')}
        onDueStatusChange={setDueStatusFilter}
        onIncludeUnscheduledChange={setIncludeUnscheduled}
        onDueFromChange={setDueFrom}
        onDueToChange={setDueTo}
      />
    </div>
  );
};

export default KanbanHeaderFilters;
