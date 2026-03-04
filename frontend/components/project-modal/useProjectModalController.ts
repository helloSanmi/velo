import { useEffect, useState } from 'react';
import { aiService } from '../../services/aiService';
import { userService } from '../../services/userService';
import { workflowService } from '../../services/workflowService';
import { ProjectTemplate } from '../../types';
import { AiInputMode, AiTaskDraft, Mode, PROJECT_MODAL_COLORS } from './types';
import { ProjectModalProps } from './ProjectModal.types';
import { normalizeTaskPriority, parseProjectMeta } from './projectModal.helpers';

export const useProjectModalController = ({
  isOpen,
  onClose,
  onSubmit,
  currentUserId,
  initialTemplateId
}: Pick<ProjectModalProps, 'isOpen' | 'onClose' | 'onSubmit' | 'currentUserId' | 'initialTemplateId'>) => {
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
  const templates = workflowService.getTemplates();

  useEffect(() => {
    if (!isOpen || !initialTemplateId) return;
    const template = templates.find((item) => item.id === initialTemplateId);
    if (!template) return;
    setMode('template');
    setSelectedTemplate(template);
    setName(template.name);
    setDescription(template.description);
    setStep(3);
  }, [isOpen, initialTemplateId, templates]);

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
        priority: normalizeTaskPriority(task.priority as string),
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

    const result = parseProjectMeta({
      startDate,
      endDate,
      budgetCost,
      hourlyRate,
      scopeSummary,
      scopeSize,
      isPublic
    });
    if (result.error) {
      setMetaError(result.error);
      return;
    }

    onSubmit(name, description, selectedColor, memberIds, selectedTemplate?.id, aiGeneratedTasks, result.meta);
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

  return {
    step,
    setStep,
    mode,
    setMode,
    name,
    setName,
    description,
    setDescription,
    selectedColor,
    setSelectedColor,
    memberIds,
    isPublic,
    setIsPublic,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    budgetCost,
    setBudgetCost,
    hourlyRate,
    setHourlyRate,
    scopeSummary,
    setScopeSummary,
    scopeSize,
    setScopeSize,
    metaError,
    setMetaError,
    selectedTemplate,
    setSelectedTemplate,
    aiInputMode,
    setAiInputMode,
    aiBrief,
    setAiBrief,
    aiDocText,
    setAiDocText,
    aiTaskCount,
    setAiTaskCount,
    aiGeneratedTasks,
    isAiProcessing,
    aiError,
    allUsers,
    templates,
    close,
    processAi,
    submit,
    toggleMember,
    updateGeneratedTask,
    removeGeneratedTask
  };
};
