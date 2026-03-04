import type { RequestHandler } from 'express';
import { projectsService } from './projects.service.js';
import { createSchema, paramsSchema, projectParamsSchema, updateSchema } from './projects.routes.schemas.js';

const withRoute =
  (handler: RequestHandler): RequestHandler =>
  async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };

export const listProjectsHandler = withRoute(async (req, res) => {
  const { orgId } = paramsSchema.parse(req.params);
  const rows = await projectsService.list(orgId);
  res.json({ success: true, data: rows });
});

export const createProjectHandler = withRoute(async (req, res) => {
  const { orgId } = paramsSchema.parse(req.params);
  const body = createSchema.parse(req.body);
  const row = await projectsService.create({
    orgId,
    actor: { userId: req.auth!.userId, role: req.auth!.role },
    ...body
  });
  res.status(201).json({ success: true, data: row });
});

export const updateProjectHandler = withRoute(async (req, res) => {
  const { orgId, projectId } = projectParamsSchema.parse(req.params);
  const patch = updateSchema.parse(req.body);
  const row = await projectsService.update({
    orgId,
    projectId,
    actor: { userId: req.auth!.userId, role: req.auth!.role },
    patch
  });
  res.json({ success: true, data: row });
});

export const deleteProjectHandler = withRoute(async (req, res) => {
  const { orgId, projectId } = projectParamsSchema.parse(req.params);
  await projectsService.remove({
    orgId,
    projectId,
    actor: { userId: req.auth!.userId, role: req.auth!.role }
  });
  res.status(204).send();
});
