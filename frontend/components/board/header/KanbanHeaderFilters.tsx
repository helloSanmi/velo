import React from 'react';
import FilterBar from '../FilterBar';
import { KanbanHeaderProps } from './types';

type KanbanHeaderFiltersProps = Pick<
  KanbanHeaderProps,
  | 'searchQuery'
  | 'projectFilter'
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
  | 'setDueFrom'
  | 'setDueTo'
>;

const KanbanHeaderFilters: React.FC<KanbanHeaderFiltersProps> = ({
  searchQuery,
  projectFilter,
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
        onDueFromChange={setDueFrom}
        onDueToChange={setDueTo}
      />
    </div>
  );
};

export default KanbanHeaderFilters;
