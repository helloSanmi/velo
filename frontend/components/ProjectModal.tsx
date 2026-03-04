import React from 'react';
import { ArrowLeft, X } from 'lucide-react';
import ModeSelectionStep from './project-modal/ModeSelectionStep';
import TemplateSelectionStep from './project-modal/TemplateSelectionStep';
import AiConfigurationStep from './project-modal/AiConfigurationStep';
import ProjectDetailsStep from './project-modal/ProjectDetailsStep';
import ProjectMembersStep from './project-modal/ProjectMembersStep';
import { ProjectModalProps } from './project-modal/ProjectModal.types';
import { useProjectModalController } from './project-modal/useProjectModalController';

const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, onSubmit, currentUserId, initialTemplateId, allowAiMode = true }) => {
  const {
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
  } = useProjectModalController({
    isOpen,
    onClose,
    onSubmit,
    currentUserId,
    initialTemplateId
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[140] bg-slate-900/45 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={(e) => e.target === e.currentTarget && close()}
    >
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
              templates={templates}
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
              <ProjectDetailsStep
                name={name}
                setName={setName}
                description={description}
                setDescription={setDescription}
                startDate={startDate}
                setStartDate={setStartDate}
                endDate={endDate}
                setEndDate={setEndDate}
                budgetCost={budgetCost}
                setBudgetCost={setBudgetCost}
                hourlyRate={hourlyRate}
                setHourlyRate={setHourlyRate}
                scopeSummary={scopeSummary}
                setScopeSummary={setScopeSummary}
                scopeSize={scopeSize}
                setScopeSize={setScopeSize}
                metaError={metaError}
                clearMetaError={() => setMetaError('')}
                mode={mode}
                aiGeneratedTasks={aiGeneratedTasks}
                onRegenerateAi={() => setStep(2)}
                onUpdateGeneratedTask={updateGeneratedTask}
                onRemoveGeneratedTask={removeGeneratedTask}
                selectedColor={selectedColor}
                setSelectedColor={setSelectedColor}
                isPublic={isPublic}
                setIsPublic={setIsPublic}
                onOpenMembers={() => setStep(4)}
              />
            </form>
          )}

          {step === 4 && (
            <ProjectMembersStep
              users={allUsers}
              memberIds={memberIds}
              currentUserId={currentUserId}
              onToggleMember={toggleMember}
              onDone={() => setStep(3)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectModal;
