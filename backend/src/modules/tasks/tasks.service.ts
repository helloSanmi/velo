import { createTask } from './tasks.service.create.js';
import { listTasks } from './tasks.service.list.js';
import { removeTask } from './tasks.service.remove.js';
import { updateTask } from './tasks.service.update.js';

export const tasksService = {
  list: listTasks,
  create: createTask,
  update: updateTask,
  remove: removeTask
};
