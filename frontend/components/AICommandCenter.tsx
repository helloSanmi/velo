import React from 'react';
import { toastService } from '../services/toastService';
import { AICommandCenterProps } from './copilot/types';
import CopilotSidebar from './copilot/CopilotSidebar';
import CopilotTopBar from './copilot/CopilotTopBar';
import CopilotMessages from './copilot/CopilotMessages';
import CopilotComposer from './copilot/CopilotComposer';
import { aiChatHistoryService } from '../services/aiChatHistoryService';
import { useAICommandCenterController } from './copilot/useAICommandCenterController';

const AICommandCenter: React.FC<AICommandCenterProps> = ({
  isOpen,
  onClose,
  tasks,
  projects,
  activeProjectId,
  currentUserName,
  currentUserId,
  orgId,
  onSelectProject,
  onCreateTask,
  onSetTaskStatus,
  onSetTaskPriority,
  onAssignTask,
  onPinInsight,
  onUnpinInsight,
  isInsightPinned
}) => {
  const {
    query,
    setQuery,
    contextProjectId,
    setContextProjectId,
    isLoading,
    copiedIndex,
    showDiagnostics,
    setShowDiagnostics,
    inputRef,
    scrollRef,
    sessions,
    selectedSession,
    selectedSessionId,
    setSelectedSessionId,
    editingSessionId,
    setEditingSessionId,
    editingTitle,
    setEditingTitle,
    messages,
    isRecording,
    audioUrl,
    isRecorderSupported,
    stopRecording,
    startRecording,
    clearAudio,
    handleDeleteSession,
    handleClearAll,
    handleRenameSession,
    saveRename,
    reloadSessions,
    resolvedContextProjectId,
    resolvedContextLabel,
    contextSelectableValue,
    applyAction,
    ask,
    copyText,
    handleExportProjectHistory,
    canChat,
    suggestedPrompts
  } = useAICommandCenterController({
    isOpen,
    activeProjectId,
    currentUserName,
    currentUserId,
    orgId,
    tasks,
    projects,
    onSelectProject,
    onCreateTask,
    onSetTaskStatus,
    onSetTaskPriority,
    onAssignTask,
    onPinInsight,
    onUnpinInsight,
    isInsightPinned
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="w-full max-w-5xl h-[100dvh] md:h-[74vh] md:max-h-[680px] bg-white md:border border-slate-200 md:rounded-xl shadow-2xl overflow-hidden flex text-[13px]"
        style={{ fontFamily: "'Figtree', system-ui, -apple-system, sans-serif" }}
      >
        <div className="hidden md:flex">
          <CopilotSidebar
            sessions={sessions}
            selectedSessionId={selectedSessionId}
            editingSessionId={editingSessionId}
            editingTitle={editingTitle}
            setEditingTitle={setEditingTitle}
            onNewChat={() => setSelectedSessionId(null)}
            onExport={handleExportProjectHistory}
            onClearAll={() => void handleClearAll()}
            onSelectSession={(session) => {
              setSelectedSessionId(session.id);
              setContextProjectId(session.contextProjectId || 'all');
            }}
            onStartRename={handleRenameSession}
            onSaveRename={saveRename}
            onCancelRename={() => setEditingSessionId(null)}
            onDeleteSession={(sessionId) => void handleDeleteSession(sessionId)}
          />
        </div>

        <section className="flex-1 flex flex-col min-w-0">
          <CopilotTopBar
            projects={projects}
            resolvedContextLabel={resolvedContextLabel}
            contextSelectableValue={contextSelectableValue}
            showDiagnostics={showDiagnostics}
            onClose={onClose}
            onToggleDiagnostics={() =>
              setShowDiagnostics((prev) => {
                const next = !prev;
                toastService.info('Copilot diagnostics', next ? 'Diagnostics enabled' : 'Diagnostics disabled');
                return next;
              })
            }
            onChangeContext={(value) => {
              const label = value === 'all' ? 'All projects' : projects.find((project) => project.id === value)?.name || 'Selected project';
              setContextProjectId(value);
              if (value !== 'all') onSelectProject?.(value);
              if (selectedSession) {
                aiChatHistoryService.updateSessionContext(selectedSession.id, value === 'all' ? null : value, label);
                reloadSessions();
              }
            }}
          />

          <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-3.5 md:p-4 space-y-4 bg-slate-50">
            <CopilotMessages
              messages={messages}
              isLoading={isLoading}
              copiedIndex={copiedIndex}
              resolvedContextProjectId={resolvedContextProjectId}
              isInsightPinned={isInsightPinned}
              onPinInsight={onPinInsight}
              onUnpinInsight={onUnpinInsight}
              onApplyAction={applyAction}
              onCopyText={copyText}
              showDiagnostics={showDiagnostics}
            />
          </div>

          <CopilotComposer
            query={query}
            setQuery={setQuery}
            suggestedPrompts={suggestedPrompts}
            isLoading={isLoading}
            canChat={canChat}
            isRecording={isRecording}
            isRecorderSupported={isRecorderSupported}
            audioUrl={audioUrl}
            inputRef={inputRef}
            onAsk={(preset) => void ask(preset)}
            onToggleRecording={() => {
              if (isRecording) {
                stopRecording();
                return;
              }
              void startRecording();
            }}
            onClearVoice={() => {
              stopRecording();
              clearAudio();
              setQuery('');
            }}
          />
        </section>
      </div>
    </div>
  );
};

export default AICommandCenter;
