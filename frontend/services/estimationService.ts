import { createId } from '../utils/id';
import { EstimationAdjustmentPreview, EstimationConfidence, EstimationProfile, Project, Task } from '../types';
import { settingsService } from './settingsService';

const PROFILES_KEY = 'velo_estimation_profiles_v1';
const MIN_SAMPLES = 8;
const CONTEXT_MIN_SAMPLES = 5;
const WINDOW_TASKS = 40;

interface ContextInput {
  projectId?: string;
  status?: string;
  tags?: string[];
}

const readProfiles = (): EstimationProfile[] => {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeProfiles = (profiles: EstimationProfile[]) => {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
};

const clampRatio = (value: number) => Math.max(0.5, Math.min(2.5, value));

const computeVariance = (values: number[]) => {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Number(variance.toFixed(4));
};

const computeConfidence = (sampleSize: number, variance: number): EstimationConfidence => {
  if (sampleSize < MIN_SAMPLES) return 'low';
  if (sampleSize >= 30 && variance <= 0.18) return 'high';
  if (sampleSize >= 15 && variance <= 0.35) return 'medium';
  return sampleSize >= 20 ? 'medium' : 'low';
};

const weightedMedian = (entries: Array<{ value: number; weight: number }>) => {
  if (entries.length === 0) return 1;
  const sorted = [...entries].sort((a, b) => a.value - b.value);
  const totalWeight = sorted.reduce((sum, entry) => sum + entry.weight, 0);
  let cumulative = 0;
  for (const entry of sorted) {
    cumulative += entry.weight;
    if (cumulative >= totalWeight / 2) return entry.value;
  }
  return sorted[sorted.length - 1].value;
};

const computeProfileFromTasks = (
  tasks: Task[],
  orgId: string,
  userId: string,
  contextType: EstimationProfile['contextType'],
  contextKey: string
): EstimationProfile | null => {
  const relevant = tasks
    .filter((task) => task.estimateProvidedBy === userId)
    .slice(-WINDOW_TASKS);
  if (relevant.length === 0) return null;

  const now = Date.now();
  const ratios = relevant
    .map((task) => {
      const estimate = task.estimateMinutes || 0;
      const actual = task.actualMinutes || (task.timeLogged ? Math.round((task.timeLogged || 0) / 60000) : 0);
      if (!estimate || !actual) return null;
      const ageDays = Math.max(0, (now - (task.completedAt || task.updatedAt || now)) / (1000 * 60 * 60 * 24));
      const weight = Math.max(0.2, 1 - ageDays / 180);
      return { value: clampRatio(actual / estimate), weight };
    })
    .filter((entry): entry is { value: number; weight: number } => Boolean(entry));

  if (ratios.length === 0) return null;

  const ratioValues = ratios.map((entry) => entry.value);
  const bias = weightedMedian(ratios);
  const variance = computeVariance(ratioValues);
  const confidence = computeConfidence(ratios.length, variance);
  const earliest = relevant[0]?.completedAt || relevant[0]?.updatedAt || now;
  const latest = relevant[relevant.length - 1]?.completedAt || relevant[relevant.length - 1]?.updatedAt || now;
  const midpoint = Math.floor(relevant.length / 2);
  const older = ratioValues.slice(0, midpoint);
  const newer = ratioValues.slice(midpoint);
  const olderAvg = older.length ? older.reduce((a, b) => a + b, 0) / older.length : bias;
  const newerAvg = newer.length ? newer.reduce((a, b) => a + b, 0) / newer.length : bias;

  return {
    id: createId(),
    orgId,
    userId,
    contextType,
    contextKey,
    biasFactor: Number(bias.toFixed(3)),
    confidence,
    sampleSize: ratios.length,
    varianceScore: variance,
    trendDelta: Number((newerAvg - olderAvg).toFixed(3)),
    windowStart: earliest,
    windowEnd: latest,
    updatedAt: now
  };
};

const isDoneLike = (status?: string) => {
  if (!status) return false;
  const normalized = status.toLowerCase();
  return normalized === 'done' || normalized === 'completed' || normalized.includes('done');
};

const getCalibratableTasks = (orgId: string, tasks: Task[]) =>
  tasks.filter((task) => {
    if (task.orgId !== orgId) return false;
    if (!isDoneLike(task.status)) return false;
    if (!task.estimateMinutes || task.estimateMinutes <= 0) return false;
    const actual = task.actualMinutes || (task.timeLogged ? Math.round((task.timeLogged || 0) / 60000) : 0);
    if (!actual || actual <= 0) return false;
    return Boolean(task.estimateProvidedBy || task.userId);
  });

const blendProfiles = (profiles: EstimationProfile[]): { factor: number; confidence: EstimationConfidence; samples: number } => {
  if (profiles.length === 0) return { factor: 1, confidence: 'low', samples: 0 };
  const totalSamples = profiles.reduce((sum, profile) => sum + profile.sampleSize, 0);
  const factor = profiles.reduce((sum, profile) => sum + profile.biasFactor * profile.sampleSize, 0) / Math.max(1, totalSamples);
  const hasHigh = profiles.some((profile) => profile.confidence === 'high');
  const hasMedium = profiles.some((profile) => profile.confidence === 'medium');
  return {
    factor: Number(factor.toFixed(3)),
    confidence: hasHigh ? 'high' : hasMedium ? 'medium' : 'low',
    samples: totalSamples
  };
};

export const estimationService = {
  recomputeOrgProfiles: (orgId: string, tasks: Task[]) => {
    const calibratable = getCalibratableTasks(orgId, tasks);
    const userIds = Array.from(new Set(calibratable.map((task) => task.estimateProvidedBy || task.userId)));
    const nextProfiles: EstimationProfile[] = [];

    userIds.forEach((userId) => {
      const global = computeProfileFromTasks(calibratable, orgId, userId, 'global', 'global');
      if (global) nextProfiles.push(global);

      const byProject = new Map<string, Task[]>();
      const byStage = new Map<string, Task[]>();
      const byTag = new Map<string, Task[]>();
      calibratable
        .filter((task) => (task.estimateProvidedBy || task.userId) === userId)
        .forEach((task) => {
          byProject.set(task.projectId, [...(byProject.get(task.projectId) || []), task]);
          byStage.set(task.status || 'unknown', [...(byStage.get(task.status || 'unknown') || []), task]);
          (task.tags || []).forEach((tag) => {
            byTag.set(tag, [...(byTag.get(tag) || []), task]);
          });
        });

      byProject.forEach((projectTasks, projectId) => {
        if (projectTasks.length < CONTEXT_MIN_SAMPLES) return;
        const profile = computeProfileFromTasks(projectTasks, orgId, userId, 'project', projectId);
        if (profile) nextProfiles.push(profile);
      });
      byStage.forEach((stageTasks, stage) => {
        if (stageTasks.length < CONTEXT_MIN_SAMPLES) return;
        const profile = computeProfileFromTasks(stageTasks, orgId, userId, 'stage', stage);
        if (profile) nextProfiles.push(profile);
      });
      byTag.forEach((tagTasks, tag) => {
        if (tagTasks.length < CONTEXT_MIN_SAMPLES) return;
        const profile = computeProfileFromTasks(tagTasks, orgId, userId, 'tag', tag);
        if (profile) nextProfiles.push(profile);
      });
    });

    const retained = readProfiles().filter((profile) => profile.orgId !== orgId);
    writeProfiles([...retained, ...nextProfiles]);
    return nextProfiles;
  },

  getProfilesForUser: (orgId: string, userId: string) =>
    readProfiles().filter((profile) => profile.orgId === orgId && profile.userId === userId),

  getAdjustmentPreview: (
    orgId: string,
    userId: string,
    estimateMinutes: number,
    context: ContextInput = {}
  ): EstimationAdjustmentPreview => {
    const settings = settingsService.getSettings();
    if (!settings.enableEstimateCalibration || estimateMinutes <= 0) {
      return {
        estimatedMinutes: estimateMinutes,
        adjustedMinutes: estimateMinutes,
        biasFactorUsed: 1,
        confidence: 'low',
        sampleSize: 0,
        explanation: 'Forecast calibration is turned off',
        requiresApproval: false
      };
    }

    const profiles = estimationService.getProfilesForUser(orgId, userId);
    const global = profiles.find((profile) => profile.contextType === 'global' && profile.contextKey === 'global');
    const candidates: EstimationProfile[] = [];
    if (global) candidates.push(global);
    if (context.projectId) {
      const profile = profiles.find((item) => item.contextType === 'project' && item.contextKey === context.projectId);
      if (profile) candidates.push(profile);
    }
    if (context.status) {
      const profile = profiles.find((item) => item.contextType === 'stage' && item.contextKey === context.status);
      if (profile) candidates.push(profile);
    }
    (context.tags || []).forEach((tag) => {
      const profile = profiles.find((item) => item.contextType === 'tag' && item.contextKey === tag);
      if (profile) candidates.push(profile);
    });

    const blended = blendProfiles(candidates);
    const factor = blended.samples < MIN_SAMPLES ? 1 : blended.factor;
    const adjusted = Math.max(15, Math.round((estimateMinutes * factor) / 15) * 15);
    const requiresApproval =
      settings.estimationRequireApproval &&
      blended.confidence !== 'low' &&
      factor >= settings.estimationApprovalThreshold;
    const delta = factor - 1;
    const direction = delta > 0 ? `+${Math.round(delta * 100)}%` : `${Math.round(delta * 100)}%`;
    const explanation =
      blended.samples < MIN_SAMPLES
        ? 'Not enough historical data yet'
        : `Adjusted from your historical pattern (${direction} across ${blended.samples} completed tasks)`;

    return {
      estimatedMinutes: estimateMinutes,
      adjustedMinutes: adjusted,
      biasFactorUsed: Number(factor.toFixed(3)),
      confidence: blended.confidence,
      sampleSize: blended.samples,
      explanation,
      requiresApproval
    };
  },

  getTrackedMinutes: (task: Task, now = Date.now()) => {
    const elapsedMs = task.isTimerRunning && task.timerStartedAt ? Math.max(0, now - task.timerStartedAt) : 0;
    const totalMs = (task.timeLogged || 0) + elapsedMs;
    return Math.max(0, Math.round(totalMs / 60000));
  },

  getEstimateOverrunRatio: (task: Task, now = Date.now()) => {
    if (!task.estimateMinutes || task.estimateMinutes <= 0) return 0;
    const trackedMinutes = estimationService.getTrackedMinutes(task, now);
    if (trackedMinutes <= 0) return 0;
    return trackedMinutes / task.estimateMinutes;
  },

  shouldRequireOverrunApprovalForDone: (task: Task, now = Date.now()) => {
    if (!task.estimateMinutes || task.estimateMinutes <= 0) return false;
    const settings = settingsService.getSettings();
    if (!settings.estimationRequireApproval) return false;
    const overrunRatio = estimationService.getEstimateOverrunRatio(task, now);
    return overrunRatio >= settings.estimationApprovalThreshold;
  },

  shouldRequireApprovalForDone: (task: Task) => {
    if (!task.estimateMinutes || task.estimateMinutes <= 0) return false;
    if (estimationService.shouldRequireOverrunApprovalForDone(task)) return true;
    const estimatorId = task.estimateProvidedBy || task.userId;
    const preview = estimationService.getAdjustmentPreview(task.orgId, estimatorId, task.estimateMinutes, {
      projectId: task.projectId,
      status: task.status,
      tags: task.tags
    });
    return preview.requiresApproval;
  },

  getPortfolioRiskRows: (orgId: string, projects: Project[], tasks: Task[]) => {
    return projects.map((project) => {
      const projectTasks = tasks.filter((task) => task.projectId === project.id && !task.isDeleted);
      const withEstimate = projectTasks.filter((task) => (task.estimateMinutes || 0) > 0);
      const estimated = withEstimate.reduce((sum, task) => sum + (task.estimateMinutes || 0), 0);
      const adjusted = withEstimate.reduce((sum, task) => {
        const estimatorId = task.estimateProvidedBy || task.userId;
        const preview = estimationService.getAdjustmentPreview(orgId, estimatorId, task.estimateMinutes || 0, {
          projectId: project.id,
          status: task.status,
          tags: task.tags
        });
        return sum + preview.adjustedMinutes;
      }, 0);
      const inflation = estimated > 0 ? adjusted / estimated : 1;
      return {
        projectId: project.id,
        projectName: project.name,
        estimatedMinutes: estimated,
        adjustedMinutes: adjusted,
        inflationFactor: Number(inflation.toFixed(3)),
        deltaMinutes: adjusted - estimated,
        taskCount: withEstimate.length
      };
    });
  },

  exportPortfolioCsv: (rows: ReturnType<typeof estimationService.getPortfolioRiskRows>) => {
    const header = ['Project', 'Estimated (min)', 'Adjusted (min)', 'Delta (min)', 'Inflation factor', 'Tasks with estimate'];
    const lines = rows.map((row) =>
      [row.projectName, row.estimatedMinutes, row.adjustedMinutes, row.deltaMinutes, row.inflationFactor, row.taskCount].join(',')
    );
    return [header.join(','), ...lines].join('\n');
  }
};
