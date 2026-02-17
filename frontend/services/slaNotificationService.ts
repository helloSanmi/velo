import { Task, User } from '../types';
import { estimationService } from './estimationService';
import { notificationService } from './notificationService';
import { getTaskAssigneeIds } from './task-service/storage';
import { isDoneStatusForProject } from './task-service/taskHelpers';

interface SlaNotificationOptions {
  user: User;
  allUsers: User[];
  tasks: Task[];
  enableEstimateCalibration: boolean;
  now?: number;
}

export const processSlaNotifications = ({
  user,
  allUsers,
  tasks,
  enableEstimateCalibration,
  now = Date.now()
}: SlaNotificationOptions) => {
  const key = `velo_sla_alerts:${user.orgId}`;
  const alerted: Record<string, string> = JSON.parse(localStorage.getItem(key) || '{}');
  const admins = allUsers.filter((member) => member.role === 'admin').map((member) => member.id);

  tasks.forEach((task) => {
    if (!task.dueDate) return;
    if (isDoneStatusForProject(user.orgId, task.projectId, task.status)) return;
    const recipients = Array.from(new Set(getTaskAssigneeIds(task).concat(task.userId))).filter(Boolean);
    const hoursToDue = (task.dueDate - now) / (1000 * 60 * 60);
    const dueKey = `${task.id}:due:${recipients.join(',')}`;
    const overdueKey = `${task.id}:overdue:${recipients.join(',')}`;
    const escalateKey = `${task.id}:escalate`;

    if (hoursToDue <= 24 && hoursToDue > 0 && !alerted[dueKey]) {
      alerted[dueKey] = '1';
      recipients.forEach((recipientId) => {
        notificationService.addNotification({
          orgId: user.orgId,
          userId: recipientId,
          title: 'Due soon',
          message: `"${task.title}" is due within 24 hours.`,
          type: 'DUE_DATE',
          category: 'due',
          urgent: false,
          linkId: task.id
        });
      });
    }

    if (hoursToDue <= 0 && !alerted[overdueKey]) {
      alerted[overdueKey] = '1';
      recipients.forEach((recipientId) => {
        notificationService.addNotification({
          orgId: user.orgId,
          userId: recipientId,
          title: 'Task overdue',
          message: `"${task.title}" is overdue.`,
          type: 'DUE_DATE',
          category: 'due',
          urgent: true,
          linkId: task.id
        });
      });
    }

    if (hoursToDue <= -24 && task.priority === 'High' && !alerted[escalateKey]) {
      alerted[escalateKey] = '1';
      admins.forEach((adminId) => {
        notificationService.addNotification({
          orgId: user.orgId,
          userId: adminId,
          title: 'SLA escalation',
          message: `High-priority task "${task.title}" is overdue by more than 24 hours.`,
          type: 'SYSTEM',
          category: 'system',
          urgent: true,
          linkId: task.id
        });
      });
    }

    if (enableEstimateCalibration && task.estimateMinutes && !task.estimateRiskApprovedAt) {
      const approvalKey = `${task.id}:estimate_approval`;
      if (estimationService.shouldRequireApprovalForDone(task) && !alerted[approvalKey]) {
        alerted[approvalKey] = '1';
        admins.forEach((adminId) => {
          notificationService.addNotification({
            orgId: user.orgId,
            userId: adminId,
            title: 'Forecast approval needed',
            message: `"${task.title}" exceeds calibration threshold and requires completion approval.`,
            type: 'SYSTEM',
            category: 'system',
            urgent: true,
            linkId: task.id
          });
        });
      }
    }
  });

  localStorage.setItem(key, JSON.stringify(alerted));
};
