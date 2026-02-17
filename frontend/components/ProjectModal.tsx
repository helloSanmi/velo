import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Users, X } from 'lucide-react';
import { aiService } from '../services/aiService';
import { userService } from '../services/userService';
import { workflowService } from '../services/workflowService';
import { ProjectTemplate, TaskPriority } from '../types';
import { getUserFullName } from '../utils/userDisplay';
import Button from './ui/Button';
import DateInputField from './ui/DateInputField';
import ModeSelectionStep from './project-modal/ModeSelectionStep';
import TemplateSelectionStep from './project-modal/TemplateSelectionStep';
import AiConfigurationStep from './project-modal/AiConfigurationStep';
import AiGeneratedTasksEditor from './project-modal/AiGeneratedTasksEditor';
import { AiInputMode, AiTaskDraft, Mode, PROJECT_MODAL_COLORS } from './project-modal/types';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    name: string,
    description: string,
    color: string,
    members: string[],
    templateId?: string,
    aiGeneratedTasks?: any[],
    meta?: { startDate?: number; endDate?: number; budgetCost?: number; hourlyRate?: number; scopeSummary?: string; scopeSize?: number; isPublic?: boolean }
  ) => void;
  currentUserId: string;
  initialTemplateId?: string | null;
  allowAiMode?: boolean;
}

const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, onSubmit, currentUserId, initialTemplateId, allowAiMode = true }) => {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<Mode>('manual');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(PROJECT_MODAL_COLORS[0]);
  const [memberIds, setMemberIds] = useState<string[]>([currentUserId]);
  const [isPublic, setIsPublic] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budgetCost, setBudgetCost] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [scopeSummary, setScopeSummary] = useState('');
  const [scopeSize, setScopeSize] = useState('');
  const [metaError, setMetaError] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);

  const [aiInputMode, setAiInputMode] = useState<AiInputMode>('brief');
  const [aiBrief, setAiBrief] = useState('');
  const [aiDocText, setAiDocText] = useState('');
  const [aiTaskCount, setAiTaskCount] = useState(8);
  const [aiGeneratedTasks, setAiGeneratedTasks] = useState<AiTaskDraft[]>([]);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiError, setAiError] = useState('');

  const allUsers = userService.getUsers();

  useEffect(() => {
    if (!isOpen) return;
    if (!initialTemplateId) return;
    const template = workflowService.getTemplates().find((item) => item.id === initialTemplateId);
    if (!template) return;
    setMode('template');
    setSelectedTemplate(template);
    setName(template.name);
    setDescription(template.description);
    setStep(3);
  }, [isOpen, initialTemplateId]);

  if (!isOpen) return null;

  const reset = () => {
    setStep(1);
    setMode('manual');
    setName('');
    setDescription('');
    setSelectedColor(PROJECT_MODAL_COLORS[0]);
    setMemberIds([currentUserId]);
    setIsPublic(false);
    setStartDate('');
    setEndDate('');
    setBudgetCost('');
    setHourlyRate('');
    setScopeSummary('');
    setScopeSize('');
    setMetaError('');
    setSelectedTemplate(null);

    setAiInputMode('brief');
    setAiBrief('');
    setAiDocText('');
    setAiTaskCount(8);
    setAiGeneratedTasks([]);
    setIsAiProcessing(false);
    setAiError('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const normalizePriority = (priority: string): TaskPriority => {
    const normalized = priority?.toLowerCase();
    if (normalized === 'high') return TaskPriority.HIGH;
    if (normalized === 'low') return TaskPriority.LOW;
    return TaskPriority.MEDIUM;
  };

  const processAi = async () => {
    if (aiInputMode === 'brief' && !aiBrief.trim()) return;
    if (aiInputMode === 'document' && !aiDocText.trim()) return;

    setIsAiProcessing(true);
    setAiError('');

    const tasks =
      aiInputMode === 'brief'
        ? await aiService.generateProjectTasksFromBrief(name, aiBrief, aiTaskCount)
        : await aiService.parseProjectFromDocument(aiDocText);

    const normalizedTasks = (tasks || [])
      .filter((task) => task?.title?.trim())
      .map((task) => ({
        title: task.title.trim(),
        description: (task.description || '').trim(),
        priority: normalizePriority(task.priority as string),
        tags: Array.isArray(task.tags) && task.tags.length > 0 ? task.tags.slice(0, 4) : ['Planning']
      }));

    setAiGeneratedTasks(normalizedTasks);
    setIsAiProcessing(false);

    if (normalizedTasks.length > 0) {
      setStep(3);
      return;
    }

    setAiError('No tasks were generated. Try a more specific brief.');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedStartDate = startDate ? new Date(startDate).getTime() : undefined;
    const parsedEndDate = endDate ? new Date(endDate).getTime() : undefined;
    const parsedBudgetCost = budgetCost.trim() ? Number(budgetCost) : undefined;
    const parsedHourlyRate = hourlyRate.trim() ? Number(hourlyRate) : undefined;
    const parsedScopeSize = scopeSize.trim() ? Number(scopeSize) : undefined;

    if (parsedStartDate && parsedEndDate && parsedEndDate < parsedStartDate) {
      setMetaError('End date must be on or after the start date.');
      return;
    }
    if (parsedBudgetCost !== undefined && (!Number.isFinite(parsedBudgetCost) || parsedBudgetCost < 0)) {
      setMetaError('Cost must be a positive number.');
      return;
    }
    if (parsedHourlyRate !== undefined && (!Number.isFinite(parsedHourlyRate) || parsedHourlyRate < 0)) {
      setMetaError('Hourly rate must be a positive number.');
      return;
    }
    if (parsedScopeSize !== undefined && (!Number.isFinite(parsedScopeSize) || parsedScopeSize < 0)) {
      setMetaError('Scope size must be a positive number.');
      return;
    }

    onSubmit(name, description, selectedColor, memberIds, selectedTemplate?.id, aiGeneratedTasks, {
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      budgetCost: parsedBudgetCost,
      hourlyRate: parsedHourlyRate,
      scopeSummary: scopeSummary.trim() || undefined,
      scopeSize: parsedScopeSize !== undefined ? Math.round(parsedScopeSize) : undefined,
      isPublic
    });
    close();
  };

  const toggleMember = (id: string) => {
    if (id === currentUserId) return;
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  };

  const updateGeneratedTask = (index: number, updates: Partial<AiTaskDraft>) => {
    setAiGeneratedTasks((prev) => prev.map((task, taskIndex) => (taskIndex === index ? { ...task, ...updates } : task)));
  };

  const removeGeneratedTask = (index: number) => {
    setAiGeneratedTasks((prev) => prev.filter((_, taskIndex) => taskIndex !== index));
  };

  return (
    <div className="fixed inset-0 z-[140] bg-slate-900/45 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-t-2xl md:rounded-xl shadow-2xl overflow-hidden h-[94dvh] md:h-auto md:max-h-[88vh] flex flex-col">
        <div className="h-12 px-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="text-sm font-semibold">Create Project</h2>
          </div>
          <button onClick={close} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 p-3.5 md:p-4 overflow-y-auto custom-scrollbar">
          {step === 1 && (
            <ModeSelectionStep
              allowAiMode={allowAiMode}
              onSelectMode={(selectedMode) => {
                if (selectedMode === 'ai' && !allowAiMode) {
                  return;
                }
                if (selectedMode === 'manual') {
                  setMode('manual');
                  setSelectedTemplate(null);
                  setStep(3);
                  return;
                }
                setMode(selectedMode);
                setStep(2);
              }}
            />
          )}

          {step === 2 && mode === 'template' && (
            <TemplateSelectionStep
              templates={workflowService.getTemplates()}
              onSelectTemplate={(template) => {
                setSelectedTemplate(template);
                setName(template.name);
                setDescription(template.description);
                setStep(3);
              }}
            />
          )}

          {step === 2 && mode === 'ai' && (
            <AiConfigurationStep
              aiInputMode={aiInputMode}
              setAiInputMode={setAiInputMode}
              aiBrief={aiBrief}
              setAiBrief={setAiBrief}
              aiDocText={aiDocText}
              setAiDocText={setAiDocText}
              aiTaskCount={aiTaskCount}
              setAiTaskCount={setAiTaskCount}
              isAiProcessing={isAiProcessing}
              aiError={aiError}
              onProcess={processAi}
            />
          )}

          {step === 3 && (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Project name</label>
                <input
                  autoFocus
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="Project name"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (metaError) setMetaError('');
                  }}
                  className="w-full min-h-[100px] rounded-lg border border-slate-300 p-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="Short description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Start date</label>
                  <DateInputField
                    value={startDate}
                    onChange={(value) => {
                      setStartDate(value);
                      if (value && !endDate) {
                        const base = new Date(value);
                        base.setDate(base.getDate() + 30);
                        setEndDate(base.toISOString().split('T')[0]);
                      }
                      if (metaError) setMetaError('');
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">End date</label>
                  <DateInputField
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(value) => {
                      setEndDate(value);
                      if (metaError) setMetaError('');
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Planned cost ($)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={budgetCost}
                    onChange={(e) => {
                      setBudgetCost(e.target.value);
                      if (metaError) setMetaError('');
                    }}
                    className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Hourly rate ($/hour, optional)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={hourlyRate}
                    onChange={(e) => {
                      setHourlyRate(e.target.value);
                      if (metaError) setMetaError('');
                    }}
                    className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                    placeholder="e.g. 85"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Scope size (tasks)</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={scopeSize}
                    onChange={(e) => {
                      setScopeSize(e.target.value);
                      if (metaError) setMetaError('');
                    }}
                    className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                    placeholder="e.g. 40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Scope summary</label>
                <textarea
                  value={scopeSummary}
                  onChange={(e) => {
                    setScopeSummary(e.target.value);
                    if (metaError) setMetaError('');
                  }}
                  className="w-full min-h-[72px] rounded-lg border border-slate-300 p-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="What is in scope and what is out of scope?"
                />
              </div>
              {metaError ? <p className="text-xs text-rose-600">{metaError}</p> : null}

              {mode === 'ai' ? (
                <AiGeneratedTasksEditor
                  tasks={aiGeneratedTasks}
                  onRegenerate={() => setStep(2)}
                  onUpdateTask={updateGeneratedTask}
                  onRemoveTask={removeGeneratedTask}
                />
              ) : null}

              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Color</label>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_MODAL_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`w-8 h-8 rounded-lg ${color} ${selectedColor === color ? 'ring-2 ring-offset-2 ring-slate-800' : ''}`}
                    >
                      {selectedColor === color && <Check className="w-4 h-4 text-white mx-auto" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-900">Public project</p>
                  <p className="text-xs text-slate-600">Allow read-only public sharing.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPublic(!isPublic)}
                  className={`w-11 h-6 rounded-full p-1 transition-colors ${isPublic ? 'bg-slate-900' : 'bg-slate-300'}`}
                >
                  <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${isPublic ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(4)}>
                  <Users className="w-4 h-4 mr-2" /> Members
                </Button>
                <Button type="submit" className="flex-1">Create Project</Button>
              </div>
            </form>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Select project members:</p>
              <div className="grid sm:grid-cols-2 gap-2 max-h-[42vh] md:max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
                {allUsers.map((u) => {
                  const selected = memberIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      onClick={() => toggleMember(u.id)}
                      className={`p-3 rounded-lg border text-left transition-colors ${selected ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:bg-slate-50'} ${u.id === currentUserId ? 'opacity-80' : ''}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <img src={u.avatar} alt={u.displayName} title={getUserFullName(u)} className="w-8 h-8 rounded-lg border border-slate-200" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 truncate">{u.displayName}{u.id === currentUserId ? ' (You)' : ''}</p>
                          <p className="text-xs text-slate-500 truncate">{u.role || 'member'}</p>
                        </div>
                        {selected && <Check className="w-4 h-4 text-slate-900" />}
                      </div>
                    </button>
                  );
                })}
              </div>
              <Button className="w-full" onClick={() => setStep(3)}>Done</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectModal;
