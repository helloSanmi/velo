import { RefObject, useEffect } from 'react';
import { ChatMessage, ChatSession } from '../../services/aiChatHistoryService';
import { toastService } from '../../services/toastService';

interface UseCopilotUiEffectsArgs {
  isOpen: boolean;
  activeProjectId?: string;
  chatActorKey: string;
  reloadSessions: () => void;
  setContextProjectId: (value: string | 'all') => void;
  inputRef: RefObject<HTMLInputElement | null>;
  selectedSession: ChatSession | null;
  messages: ChatMessage[];
  isLoading: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  setShowDiagnostics: (value: ((prev: boolean) => boolean) | boolean) => void;
}

export const useCopilotUiEffects = ({
  isOpen,
  activeProjectId,
  chatActorKey,
  reloadSessions,
  setContextProjectId,
  inputRef,
  selectedSession,
  messages,
  isLoading,
  scrollRef,
  setShowDiagnostics
}: UseCopilotUiEffectsArgs) => {
  useEffect(() => {
    if (!isOpen) return;
    reloadSessions();
    setContextProjectId(activeProjectId || 'all');
    setTimeout(() => inputRef.current?.focus(), 10);
  }, [isOpen, activeProjectId, chatActorKey, reloadSessions, setContextProjectId, inputRef]);

  useEffect(() => {
    if (!isOpen) return;
    if (selectedSession) {
      setContextProjectId(selectedSession.contextProjectId || 'all');
      return;
    }
    setContextProjectId(activeProjectId || 'all');
  }, [isOpen, selectedSession?.id, selectedSession?.contextProjectId, activeProjectId, setContextProjectId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading, scrollRef]);

  useEffect(() => {
    if (!isOpen) window.speechSynthesis?.cancel();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        setShowDiagnostics((prev) => {
          const next = !prev;
          toastService.info('Copilot diagnostics', next ? 'Diagnostics enabled' : 'Diagnostics disabled');
          return next;
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, setShowDiagnostics]);
};
