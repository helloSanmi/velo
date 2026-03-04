import { useMemo, useState } from 'react';
import { Project, Task, TaskStatus } from '../../types';
import { HorizonFilter, MilestoneItem, StatusFilter } from './types';

const DAY_MS = 86400000;

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

const daysUntil = (targetTs: number) => Math.ceil((targetTs - startOfToday()) / DAY_MS);

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const useRoadmapViewState = (tasks: Task[], projects: Project[]) => {
  const [query, setQuery] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [projectFilter, setProjectFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [horizonFilter, setHorizonFilter] = useState<HorizonFilter>('All');

  const projectMap = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);

  const getDoneStageId = (projectId: string) => {
    const project = projectMap.get(projectId);
    return project?.stages?.[project.stages.length - 1]?.id || TaskStatus.DONE;
  };

  const milestones = useMemo<MilestoneItem[]>(() => {
    const nowStart = startOfToday();
    return tasks
      .filter((task) => typeof task.dueDate === 'number')
      .map((task) => {
        const dueDate = task.dueDate as number;
        const completed = task.status === getDoneStageId(task.projectId) || task.status === TaskStatus.DONE;
        const dueInDays = daysUntil(dueDate);
        const atRisk = !completed && (dueInDays < 0 || dueInDays <= 7 || Boolean(task.isAtRisk));
        const lane: MilestoneItem['lane'] = completed
          ? 'completed'
          : dueInDays <= 30
            ? 'now'
            : dueInDays <= 90
              ? 'next'
              : 'later';
        const startInDays = Math.floor(((task.createdAt || nowStart) - nowStart) / DAY_MS);
        return {
          ...task,
          dueDate,
          dueInDays,
          completed,
          atRisk,
          lane,
          startInDays
        };
      })
      .sort((a, b) => a.dueDate - b.dueDate);
  }, [tasks, projectMap]);

  const filteredMilestones = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return milestones
      .filter((task) => (projectFilter === 'All' ? true : task.projectId === projectFilter))
      .filter((task) => {
        if (statusFilter === 'All') return true;
        if (statusFilter === 'Completed') return task.completed;
        if (statusFilter === 'At Risk') return task.atRisk && !task.completed;
        return !task.completed && !task.atRisk;
      })
      .filter((task) => {
        if (horizonFilter === 'All') return true;
        const maxDays = Number(horizonFilter);
        return task.completed || task.dueInDays <= maxDays;
      })
      .filter((task) => {
        if (!normalized) return true;
        const projectName = projectMap.get(task.projectId)?.name || '';
        return `${task.title} ${projectName}`.toLowerCase().includes(normalized);
      });
  }, [horizonFilter, milestones, projectFilter, projectMap, query, statusFilter]);

  const nowMilestones = useMemo(
    () => filteredMilestones.filter((task) => !task.completed && task.dueInDays <= 30).sort((a, b) => b.dueDate - a.dueDate),
    [filteredMilestones]
  );

  const timelineMilestones = useMemo(() => filteredMilestones.filter((task) => !task.completed).slice(0, 14), [filteredMilestones]);

  const summary = useMemo(() => {
    const total = filteredMilestones.length;
    const completed = filteredMilestones.filter((item) => item.completed).length;
    const atRisk = filteredMilestones.filter((item) => item.atRisk && !item.completed).length;
    const dueSoon = filteredMilestones.filter((item) => !item.completed && item.dueInDays >= 0 && item.dueInDays <= 14).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, atRisk, dueSoon, completionRate };
  }, [filteredMilestones]);

  const timelineRangeDays = horizonFilter === 'All' ? 180 : Number(horizonFilter);

  const tickLabels = useMemo(() => {
    const day = new Date();
    const labels: string[] = [];
    for (let index = 0; index < 7; index += 1) {
      labels.push(
        new Date(day.getFullYear(), day.getMonth(), day.getDate() + index).toLocaleDateString('en-US', { weekday: 'short' })
      );
    }
    return labels;
  }, []);

  return {
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
  };
};
