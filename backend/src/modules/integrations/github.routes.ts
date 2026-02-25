import crypto from 'crypto';
import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { writeAudit } from '../audit/audit.service.js';

const router = Router();

const normalizeRepo = (value: unknown): string => String(value || '').trim().toLowerCase();

const readGithubConfig = (metadata: unknown): { enabled: boolean; repo: string } => {
  const md = metadata && typeof metadata === 'object' ? (metadata as Record<string, unknown>) : {};
  const integrations = md.integrations && typeof md.integrations === 'object'
    ? (md.integrations as Record<string, unknown>)
    : {};
  const github = integrations.github && typeof integrations.github === 'object'
    ? (integrations.github as Record<string, unknown>)
    : {};
  return {
    enabled: Boolean(github.enabled),
    repo: normalizeRepo(github.repo)
  };
};

const verifySignature = (req: any): boolean => {
  const secret = env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return true;
  const signature = String(req.headers['x-hub-signature-256'] || '');
  const body = JSON.stringify(req.body || {});
  const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex');
  const expected = `sha256=${hmac}`;
  if (!signature || signature.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
};

const extractTaskIds = (text: string): string[] => {
  const ids = new Set<string>();
  const patterns = [
    /(?:velo-task|task)\s*[:#]\s*([a-z0-9_-]+)/gi
  ];
  patterns.forEach((pattern) => {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text))) {
      if (match[1]) ids.add(match[1].trim());
    }
  });
  return Array.from(ids);
};

router.post('/integrations/github/webhook', async (req, res) => {
  if (!verifySignature(req)) {
    res.status(401).json({ success: false, message: 'Invalid webhook signature.' });
    return;
  }

  const repo = normalizeRepo((req.body as any)?.repository?.full_name);
  if (!repo) {
    res.json({ success: true, data: { processed: 0 } });
    return;
  }

  const projects = await prisma.project.findMany({
    where: { lifecycle: 'active' },
    select: { id: true, orgId: true, metadata: true, name: true }
  });
  const matchedProjects = projects.filter((project) => {
    const config = readGithubConfig(project.metadata);
    return config.enabled && config.repo === repo;
  });
  if (matchedProjects.length === 0) {
    res.json({ success: true, data: { processed: 0 } });
    return;
  }

  const commits = Array.isArray((req.body as any)?.commits) ? (req.body as any).commits as Array<any> : [];
  let processed = 0;

  for (const commit of commits) {
    const sha = String(commit?.id || '').slice(0, 12);
    const url = String(commit?.url || '');
    const author = String(commit?.author?.name || 'GitHub');
    const message = String(commit?.message || '');
    const referencedTaskIds = extractTaskIds(message);
    if (referencedTaskIds.length === 0) continue;

    for (const project of matchedProjects) {
      for (const taskId of referencedTaskIds) {
        const task = await prisma.task.findFirst({
          where: {
            id: taskId,
            orgId: project.orgId,
            projectId: project.id
          }
        });
        if (!task) continue;
        const auditLog = Array.isArray(task.auditLog) ? [...(task.auditLog as Record<string, unknown>[])] : [];
        auditLog.push({
          id: `gh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          userId: 'github',
          displayName: 'GitHub',
          action: `Linked commit ${sha} by ${author}${url ? ` (${url})` : ''}`,
          timestamp: Date.now()
        });
        await prisma.task.update({
          where: { id: task.id },
          data: { auditLog: auditLog as any }
        });
        await writeAudit({
          orgId: project.orgId,
          actionType: 'task_updated',
          action: `GitHub commit linked to task ${task.title}`,
          entityType: 'task',
          entityId: task.id,
          metadata: { repo, sha, url, message }
        });
        processed += 1;
      }
    }
  }

  res.json({ success: true, data: { processed } });
});

export const githubIntegrationsRoutes = router;

