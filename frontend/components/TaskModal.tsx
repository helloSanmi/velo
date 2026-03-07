import React from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';
import { TaskPriority } from '../types';
import Button from './ui/Button';
import AssigneePicker from './ui/AssigneePicker';
import DateInputField from './ui/DateInputField';
import TaskModalEstimationSection from './task-modal/TaskModalEstimationSection';
import TaskModalTagsField from './task-modal/TaskModalTagsField';
import { TaskModalProps } from './task-modal/TaskModal.types';
import { useTaskModalController } from './task-modal/useTaskModalController';

const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  canAssignMembers = false,
  projectId,
  aiPlanEnabled = true,
  aiEnabled = true
}) => {
  const controller = useTaskModalController({ projectId, aiPlanEnabled, aiEnabled, onClose, onSubmit });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/45 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-t-2xl md:rounded-xl shadow-2xl overflow-hidden h-[92dvh] md:h-auto md:max-h-[80vh] flex flex-col">
        <div className="h-12 px-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">New Task</h2>
            <p className="text-[11px] text-slate-500 -mt-0.5">Compact task setup</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={controller.submit} className="flex-1 min-h-0 flex flex-col">
          <div className="p-3.5 md:p-4 space-y-3 overflow-y-auto custom-scrollbar">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Title</label>
              <input
                autoFocus
                value={controller.title}
                onChange={(e) => controller.setTitle(e.target.value)}
                required
                className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Task title"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Assignees</label>
                <AssigneePicker users={controller.allUsers} selectedIds={controller.assigneeIds} onChange={controller.setAssigneeIds} compact disabled={!canAssignMembers} />
                {canAssignMembers ? (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Project owners and admins can be assigned even if they are not listed as project members.
                  </p>
                ) : null}
                {!canAssignMembers ? <p className="mt-1 text-[11px] text-slate-500">Only project owner/admin can assign members.</p> : null}
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Priority</label>
                <select value={controller.priority} onChange={(e) => controller.setPriority(e.target.value as TaskPriority)} className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm bg-white outline-none focus:ring-2 focus:ring-slate-300">
                  {Object.values(TaskPriority).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <TaskModalEstimationSection
              estimateHours={controller.estimateHours}
              onEstimateHoursChange={controller.setEstimateHours}
              preview={controller.preview}
              showPersonalCalibration={controller.showPersonalCalibration}
              whatIfPercent={controller.whatIfPercent}
              onWhatIfPercentChange={controller.setWhatIfPercent}
              whatIfAdjustedMinutes={controller.whatIfAdjustedMinutes}
            />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs text-slate-500">Due date</label>
                <button type="button" onClick={controller.handleSuggestDate} className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1">
                  {controller.isScheduling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}{' '}
                  {!controller.aiPlanEnabled ? 'Suggest: Pro' : !controller.aiEnabled ? 'Suggest: Enable AI' : 'Suggest'}
                </button>
              </div>
              <DateInputField value={controller.dueDate} onChange={controller.setDueDate} />
            </div>

            <TaskModalTagsField
              tagInput={controller.tagInput}
              onTagInputChange={controller.setTagInput}
              onTagInputKeyDown={controller.addTagFromInput}
              tags={controller.tags}
              onRemoveTag={(tag) => controller.setTags((prev) => prev.filter((t) => t !== tag))}
              onSuggestTags={controller.handleSuggestTags}
              isSuggestingTags={controller.isSuggestingTags}
              suggestLabel={!controller.aiPlanEnabled ? 'Suggest tags: Pro' : !controller.aiEnabled ? 'Suggest tags: Enable AI' : undefined}
            />

            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Description</label>
              <textarea
                value={controller.description}
                onChange={(e) => controller.setDescription(e.target.value)}
                className="w-full h-28 rounded-lg border border-slate-300 p-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 resize-none"
                placeholder="Add notes or details..."
              />
            </div>
          </div>

          <div className="border-t border-slate-200 p-3.5 md:p-4 bg-white sticky bottom-0">
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button type="submit" className="flex-1">Create Task</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
