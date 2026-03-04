import React from 'react';
import { Check, Users } from 'lucide-react';
import Button from '../ui/Button';
import AiGeneratedTasksEditor from './AiGeneratedTasksEditor';
import ProjectMetaFields from './ProjectMetaFields';
import { AiTaskDraft, Mode, PROJECT_MODAL_COLORS } from './types';

interface ProjectDetailsStepProps {
  name: string;
  setName: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  budgetCost: string;
  setBudgetCost: (value: string) => void;
  hourlyRate: string;
  setHourlyRate: (value: string) => void;
  scopeSummary: string;
  setScopeSummary: (value: string) => void;
  scopeSize: string;
  setScopeSize: (value: string) => void;
  metaError: string;
  clearMetaError: () => void;
  mode: Mode;
  aiGeneratedTasks: AiTaskDraft[];
  onRegenerateAi: () => void;
  onUpdateGeneratedTask: (index: number, updates: Partial<AiTaskDraft>) => void;
  onRemoveGeneratedTask: (index: number) => void;
  selectedColor: string;
  setSelectedColor: (color: string) => void;
  isPublic: boolean;
  setIsPublic: (value: boolean) => void;
  onOpenMembers: () => void;
}

const ProjectDetailsStep: React.FC<ProjectDetailsStepProps> = ({
  name,
  setName,
  description,
  setDescription,
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
  clearMetaError,
  mode,
  aiGeneratedTasks,
  onRegenerateAi,
  onUpdateGeneratedTask,
  onRemoveGeneratedTask,
  selectedColor,
  setSelectedColor,
  isPublic,
  setIsPublic,
  onOpenMembers
}) => (
  <>
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
          if (metaError) clearMetaError();
        }}
        className="w-full min-h-[100px] rounded-lg border border-slate-300 p-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
        placeholder="Short description"
      />
    </div>

    <ProjectMetaFields
      startDate={startDate}
      setStartDate={setStartDate}
      endDate={endDate}
      setEndDate={setEndDate}
      budgetCost={budgetCost}
      setBudgetCost={setBudgetCost}
      hourlyRate={hourlyRate}
      setHourlyRate={setHourlyRate}
      scopeSize={scopeSize}
      setScopeSize={setScopeSize}
      scopeSummary={scopeSummary}
      setScopeSummary={setScopeSummary}
      metaError={metaError}
      clearMetaError={clearMetaError}
    />

    {metaError ? <p className="text-xs text-rose-600">{metaError}</p> : null}

    {mode === 'ai' ? (
      <AiGeneratedTasksEditor
        tasks={aiGeneratedTasks}
        onRegenerate={onRegenerateAi}
        onUpdateTask={onUpdateGeneratedTask}
        onRemoveTask={onRemoveGeneratedTask}
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
            {selectedColor === color ? <Check className="w-4 h-4 text-white mx-auto" /> : null}
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
      <Button type="button" variant="outline" className="flex-1" onClick={onOpenMembers}>
        <Users className="w-4 h-4 mr-2" /> Members
      </Button>
      <Button type="submit" className="flex-1">Create Project</Button>
    </div>
  </>
);

export default ProjectDetailsStep;
