import React from 'react';
import { Trash2 } from 'lucide-react';
import { Task } from '../../types';
import Button from '../ui/Button';
import { dialogService } from '../../services/dialogService';

interface TaskDetailFooterProps {
  task: Task;
  onClose: () => void;
  onDelete: (id: string) => void;
  onEdit: () => void;
  canDelete?: boolean;
}

const TaskDetailFooter: React.FC<TaskDetailFooterProps> = ({ task, onClose, onDelete, onEdit, canDelete = true }) => {
  return (
    <div className="p-4 md:p-5 bg-white border-t border-slate-200 flex flex-col sm:flex-row gap-2 flex-shrink-0">
      <Button variant="outline" className="flex-1" onClick={onEdit}>Edit Task</Button>
      <Button
        variant="danger"
        className="px-6 disabled:opacity-35"
        disabled={!canDelete}
        title={canDelete ? 'Delete task' : 'Only project owner/admin can delete'}
        onClick={async () => {
          if (!canDelete) return;
          const confirmed = await dialogService.confirm('Delete this task?', { title: 'Delete task', confirmText: 'Delete', danger: true });
          if (confirmed) {
            onDelete(task.id);
            onClose();
          }
        }}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default TaskDetailFooter;
