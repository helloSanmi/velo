import React, { useMemo, useState } from 'react';
import { Hash, Loader2, Sparkles, Users, X } from 'lucide-react';
import { SecurityGroup, TaskPriority } from '../types';
import { userService } from '../services/userService';
import { aiService } from '../services/aiService';
import { dialogService } from '../services/dialogService';
import { estimationService } from '../services/estimationService';
import { groupService } from '../services/groupService';
import { settingsService } from '../services/settingsService';
import Button from './ui/Button';
import AssigneePicker from './ui/AssigneePicker';
import DateInputField from './ui/DateInputField';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    title: string,
    description: string,
    priority: TaskPriority,
    tags: string[],
    dueDate?: number,
    assigneeIds?: string[],
    securityGroupIds?: string[],
    estimateMinutes?: number,
    creationAuditAction?: string
  ) => void;
  canAssignMembers?: boolean;
  projectId?: string | null;
}

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSubmit, canAssignMembers = false, projectId }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [securityGroupIds, setSecurityGroupIds] = useState<string[]>([]);
  const [estimateHours, setEstimateHours] = useState('');
  const [whatIfPercent, setWhatIfPercent] = useState(0);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [aiSuggestedDueDateUsed, setAiSuggestedDueDateUsed] = useState(false);
  const [showPersonalCalibration, setShowPersonalCalibration] = useState(settingsService.getSettings().showPersonalCalibration);

  const allUsers = userService.getUsers();
  const currentUser = userService.getCurrentUser();
  const assignableGroups = useMemo(
    () => (currentUser ? groupService.getAssignableGroupsForProject(currentUser.orgId, projectId || undefined) : []),
    [currentUser, projectId]
  );
  const selectedGroups = useMemo(
    () => assignableGroups.filter((group) => securityGroupIds.includes(group.id)),
    [assignableGroups, securityGroupIds]
  );
  const estimateMinutes = estimateHours.trim() ? Math.max(0, Math.round(Number(estimateHours || 0) * 60)) : 0;
  const preview = currentUser && estimateMinutes > 0
    ? estimationService.getAdjustmentPreview(currentUser.orgId, currentUser.id, estimateMinutes, {
      projectId: projectId || undefined,
      tags
    })
    : null;
  const whatIfAdjustedMinutes = preview ? Math.round(preview.adjustedMinutes * (1 + whatIfPercent / 100)) : 0;

  React.useEffect(() => {
    const handleSettingsUpdate = (event: any) => {
      if (event?.detail) setShowPersonalCalibration(Boolean(event.detail.showPersonalCalibration));
    };
    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate);
  }, []);

  if (!isOpen) return null;

  const handleSuggestDate = async () => {
    if (!title.trim()) {
      await dialogService.notice('Please enter a task title first.', { title: 'Task title required' });
      return;
    }
    setIsScheduling(true);
    const suggested = await aiService.suggestDueDate(title, tags);
    setDueDate(suggested);
    setAiSuggestedDueDateUsed(true);
    setIsScheduling(false);
  };

  const handleSuggestTags = async () => {
    if (!title.trim()) return;
    setIsSuggestingTags(true);
    const suggested = await aiService.suggestTags(title, description);
    setTags((prev) => Array.from(new Set([...prev, ...suggested])));
    setIsSuggestingTags(false);
  };

  const addTagFromInput = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || !tagInput.trim()) return;
    e.preventDefault();
    const nextTag = tagInput.trim();
    if (!tags.includes(nextTag)) setTags([...tags, nextTag]);
    setTagInput('');
  };

  const toggleGroup = (groupId: string) => {
    setSecurityGroupIds((prev) => (prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]));
  };

  const formatGroupScope = (group: SecurityGroup) => (group.scope === 'global' ? 'Global' : 'Project');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit(
      title,
      description,
      priority,
      tags,
      dueDate ? new Date(dueDate).getTime() : undefined,
      assigneeIds,
      securityGroupIds,
      estimateMinutes > 0 ? estimateMinutes : undefined,
      aiSuggestedDueDateUsed ? 'used AI-suggested due date at creation' : undefined
    );

    setTitle('');
    setDescription('');
    setPriority(TaskPriority.MEDIUM);
    setTags([]);
    setTagInput('');
    setDueDate('');
    setAssigneeIds([]);
    setSecurityGroupIds([]);
    setEstimateHours('');
    setWhatIfPercent(0);
    setAiSuggestedDueDateUsed(false);
    onClose();
  };

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

        <form onSubmit={submit} className="flex-1 min-h-0 flex flex-col">
          <div className="p-3.5 md:p-4 space-y-3 overflow-y-auto custom-scrollbar">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Title</label>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Task title"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Assignees</label>
                <AssigneePicker users={allUsers} selectedIds={assigneeIds} onChange={setAssigneeIds} compact disabled={!canAssignMembers} />
                {canAssignMembers ? (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Project owners and admins can be assigned even if they are not listed as project members.
                  </p>
                ) : null}
                <div className="mt-2">
                  <label className="block text-[11px] text-slate-500 mb-1">Security groups</label>
                  <div className="rounded-lg border border-slate-300 bg-white p-1.5 max-h-24 overflow-y-auto custom-scrollbar space-y-1">
                    {assignableGroups.length === 0 ? (
                      <p className="text-[11px] text-slate-500 px-1 py-1">No groups available for this project.</p>
                    ) : (
                      assignableGroups.map((group) => (
                        <label
                          key={group.id}
                          className="h-7 px-2 rounded-md text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 inline-flex items-center justify-between gap-2 w-full cursor-pointer"
                        >
                          <span className="truncate">{group.name}</span>
                          <span className="text-[10px] text-slate-500">{formatGroupScope(group)}</span>
                          <input
                            type="checkbox"
                            checked={securityGroupIds.includes(group.id)}
                            onChange={() => toggleGroup(group.id)}
                            className="accent-slate-900"
                            disabled={!canAssignMembers}
                          />
                        </label>
                      ))
                    )}
                  </div>
                  {selectedGroups.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {selectedGroups.map((group) => (
                        <span key={group.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                          <Users className="w-3 h-3" />
                          {group.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                {!canAssignMembers ? <p className="mt-1 text-[11px] text-slate-500">Only project owner/admin can assign members.</p> : null}
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm bg-white outline-none focus:ring-2 focus:ring-slate-300">
                  {Object.values(TaskPriority).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <label className="block text-xs text-slate-500 mb-1.5">Planned effort (hours)</label>
              <input
                type="number"
                min={0}
                step={0.25}
                value={estimateHours}
                onChange={(e) => setEstimateHours(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 bg-white"
                placeholder="e.g. 8"
              />
              {preview && showPersonalCalibration ? (
                <div className="mt-2.5 space-y-1.5 text-xs">
                  <p className="text-slate-700">
                    Risk-adjusted plan: <span className="font-semibold">{Math.max(0.25, preview.adjustedMinutes / 60).toFixed(2)}h</span>
                    {' '}({preview.explanation})
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-slate-500">Scenario buffer ({whatIfPercent}%)</label>
                    <input
                      type="range"
                      min={-20}
                      max={50}
                      step={5}
                      value={whatIfPercent}
                      onChange={(e) => setWhatIfPercent(Number(e.target.value))}
                      className="w-full md:w-40"
                    />
                  </div>
                  <p className="text-slate-600">
                    Scenario result: <span className="font-semibold">{Math.max(0.25, whatIfAdjustedMinutes / 60).toFixed(2)}h</span>
                    {preview.requiresApproval ? <span className="ml-2 text-amber-700 font-semibold">Owner/Admin approval required at completion</span> : null}
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 mt-2">Add a planned effort estimate to enable forecast calibration.</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs text-slate-500">Due date</label>
                <button type="button" onClick={handleSuggestDate} className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1">
                  {isScheduling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Suggest
                </button>
              </div>
              <DateInputField value={dueDate} onChange={setDueDate} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs text-slate-500">Tags</label>
                <button type="button" onClick={handleSuggestTags} className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1">
                  {isSuggestingTags ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Suggest
                </button>
              </div>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={addTagFromInput}
                  placeholder="Press Enter to add"
                  className="w-full h-10 rounded-lg border border-slate-300 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
              {tags.length > 0 && (
                <div className="mt-2 max-h-20 overflow-y-auto custom-scrollbar pr-1 flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <button key={tag} type="button" onClick={() => setTags((prev) => prev.filter((t) => t !== tag))} className="px-2 py-1 rounded-md text-xs border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100">
                      {tag} ×
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
