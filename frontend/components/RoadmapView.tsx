import React from 'react';
import { Project, Task } from '../types';
import { RoadmapFiltersSummaryCard } from './roadmap/RoadmapFiltersSummaryCard';
import { RoadmapDeliverySection } from './roadmap/RoadmapDeliverySection';
import { useRoadmapViewState } from './roadmap/useRoadmapViewState';

interface RoadmapViewProps {
  tasks: Task[];
  projects: Project[];
}

const RoadmapView: React.FC<RoadmapViewProps> = ({ tasks, projects }) => {
  const {
    query,
    setQuery,
    mobileFiltersOpen,
    setMobileFiltersOpen,
    projectFilter,
    setProjectFilter,
    statusFilter,
    setStatusFilter,
    horizonFilter,
    setHorizonFilter,
    projectMap,
    nowMilestones,
    timelineMilestones,
    summary,
    timelineRangeDays,
    tickLabels
  } = useRoadmapViewState(tasks, projects);

  return (
    <div className="flex-1 overflow-y-auto bg-[#f7f3f6] p-3 md:p-5 custom-scrollbar">
      <div className="mx-auto max-w-[1400px] space-y-4">
        <RoadmapFiltersSummaryCard
          query={query}
          setQuery={setQuery}
          mobileFiltersOpen={mobileFiltersOpen}
          setMobileFiltersOpen={setMobileFiltersOpen}
          projectFilter={projectFilter}
          setProjectFilter={setProjectFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          horizonFilter={horizonFilter}
          setHorizonFilter={setHorizonFilter}
          projects={projects}
          summary={summary}
        />

        <RoadmapDeliverySection
          nowMilestones={nowMilestones}
          timelineMilestones={timelineMilestones}
          projectMap={projectMap}
          timelineRangeDays={timelineRangeDays}
          tickLabels={tickLabels}
        />
      </div>
    </div>
  );
};

export default RoadmapView;
