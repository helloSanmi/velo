import React, { useState } from 'react';
import { Bot, Check, Copy, Loader2, Pin, PinOff } from 'lucide-react';
import { ChatMessage } from '../../services/aiChatHistoryService';
import { VoiceActionPlanItem } from '../../services/aiService';
import { toastService } from '../../services/toastService';
import { renderAssistantText } from './copilotUtils';

interface CopilotMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
  copiedIndex: number | null;
  resolvedContextProjectId: string | 'all';
  showDiagnostics?: boolean;
  isInsightPinned?: (projectId: string, insight: string) => boolean;
  onPinInsight?: (projectId: string, insight: string) => void;
  onUnpinInsight?: (projectId: string, insight: string) => void;
  onApplyAction: (action: VoiceActionPlanItem) => boolean;
  onCopyText: (text: string, index: number) => void;
}

const CopilotMessages: React.FC<CopilotMessagesProps> = ({
  messages,
  isLoading,
  copiedIndex,
  resolvedContextProjectId,
  showDiagnostics = false,
  isInsightPinned,
  onPinInsight,
  onUnpinInsight,
  onApplyAction,
  onCopyText
}) => {
  const [actionStates, setActionStates] = useState<Record<string, 'applied' | 'ignored'>>({});

  return (
    <>
      {messages.length === 0 ? (
        <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 mb-3"><Bot className="w-5 h-5" /></div>
          <h3 className="text-[15px] font-semibold text-slate-900">Ask Copilot about your workspace</h3>
          <p className="text-[13px] text-slate-600 mt-1">Use text or voice. Copilot can recommend and apply actions.</p>
        </div>
      ) : null}

      {messages.map((msg, i) => {
        const modelMessagePinned =
          msg.role === 'model' &&
          resolvedContextProjectId !== 'all' &&
          Boolean(isInsightPinned?.(resolvedContextProjectId as string, msg.content));
        const groundingLabel = msg.grounding
          ? `Grounded on ${msg.grounding.scopedTaskCount} task${msg.grounding.scopedTaskCount === 1 ? '' : 's'} in ${msg.grounding.contextLabel}${msg.grounding.referencedTaskCount > 0 ? ` • ${msg.grounding.referencedTaskCount} cited` : ''}`
          : null;

        return (
          <div key={`${msg.role}-${i}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[86%] rounded-xl border px-3 py-2.5 ${msg.role === 'user' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-800 border-slate-200'}`}>
              {msg.role === 'user' ? <p className="text-[13px] whitespace-pre-wrap leading-relaxed">{msg.content}</p> : renderAssistantText(msg.content)}
              {msg.role === 'model' ? (
                <div className="mt-2 pt-2 border-t border-slate-100 space-y-2">
                  {msg.actions?.length ? (
                    <div className="space-y-1.5">
                      {msg.actions.map((action, idx) => (
                        <div key={`${idx}-${action.type}`} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-2 py-1.5">
                          <p className="text-[10px] text-slate-700 truncate">{action.label}</p>
                          {(() => {
                            const actionKey = `${i}-${idx}-${action.type}-${action.label}`;
                            const state = actionStates[actionKey];
                            const isDone = Boolean(state);
                            return (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    const ok = onApplyAction(action);
                                    if (!ok) {
                                      toastService.warning('Action unavailable', 'Could not execute this recommendation.');
                                      return;
                                    }
                                    setActionStates((prev) => ({ ...prev, [actionKey]: 'applied' }));
                                  }}
                                  disabled={isDone}
                                  className={`h-6 px-2 rounded-md border text-[10px] font-medium ${
                                    state === 'applied'
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 cursor-not-allowed'
                                      : isDone
                                        ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  {state === 'applied' ? 'Applied' : 'Apply'}
                                </button>
                                <button
                                  onClick={() => setActionStates((prev) => ({ ...prev, [actionKey]: 'ignored' }))}
                                  disabled={isDone}
                                  className={`h-6 px-2 rounded-md border text-[10px] font-medium ${
                                    state === 'ignored'
                                      ? 'border-amber-200 bg-amber-50 text-amber-700 cursor-not-allowed'
                                      : isDone
                                        ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                                        : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                                  }`}
                                >
                                  {state === 'ignored' ? 'Ignored' : 'Ignore'}
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      {groundingLabel ? (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="inline-flex max-w-full truncate rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-[9px] font-medium text-sky-800">
                            {groundingLabel}
                          </span>
                          {showDiagnostics ? (
                            <span className="inline-flex rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-[9px] font-medium text-violet-800">
                              {`intent:${msg.grounding?.intent || 'general'} • source:${msg.grounding?.source || 'unknown'}`}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex justify-end gap-3 shrink-0">
                      <button onClick={() => onCopyText(msg.content, i)} className="text-[10px] text-slate-500 hover:text-slate-800 inline-flex items-center gap-1">
                        {copiedIndex === i ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedIndex === i ? 'Copied' : 'Copy'}
                      </button>
                      {resolvedContextProjectId !== 'all' && (onPinInsight || onUnpinInsight) ? (
                        <button
                          onClick={() => {
                            const projectId = resolvedContextProjectId as string;
                            if (modelMessagePinned) {
                              onUnpinInsight?.(projectId, msg.content);
                              return;
                            }
                            onPinInsight?.(projectId, msg.content);
                          }}
                          className="text-[10px] text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
                        >
                          {modelMessagePinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                          {modelMessagePinned ? 'Unpin insight' : 'Pin insight'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}

      {isLoading ? (
        <div className="flex justify-start">
          <div className="inline-flex items-center gap-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
          </div>
        </div>
      ) : null}
    </>
  );
};

export default CopilotMessages;
