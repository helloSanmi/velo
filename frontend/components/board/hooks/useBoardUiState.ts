import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

export type BoardViewMode = 'kanban' | 'checklist' | 'table' | 'timeline' | 'calendar' | 'gantt' | 'workload';
export type ChecklistDensity = 'comfortable' | 'compact';

interface UseBoardUiStateArgs {
  compactMode: boolean;
}

interface UseBoardUiStateResult {
  showBoardOnboarding: boolean;
  setShowBoardOnboarding: Dispatch<SetStateAction<boolean>>;
  boardView: BoardViewMode;
  setBoardView: Dispatch<SetStateAction<BoardViewMode>>;
  checklistDensity: ChecklistDensity;
  setChecklistDensity: Dispatch<SetStateAction<ChecklistDensity>>;
}

export function useBoardUiState({ compactMode }: UseBoardUiStateArgs): UseBoardUiStateResult {
  const [showBoardOnboarding, setShowBoardOnboarding] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('velo_board_views_onboarding_v1') !== 'seen';
  });

  const [boardView, setBoardView] = useState<BoardViewMode>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('velo_board_view') : null;
    return saved === 'table'
      ? 'table'
      : saved === 'checklist'
        ? 'checklist'
      : saved === 'timeline'
        ? 'timeline'
        : saved === 'calendar'
          ? 'calendar'
          : saved === 'gantt'
            ? 'gantt'
          : saved === 'workload'
            ? 'workload'
            : 'kanban';
  });

  const [checklistDensity, setChecklistDensity] = useState<ChecklistDensity>(() => {
    if (typeof window === 'undefined') return compactMode ? 'compact' : 'comfortable';
    const saved = window.localStorage.getItem('velo_checklist_density');
    if (saved === 'comfortable' || saved === 'compact') return saved;
    return compactMode ? 'compact' : 'comfortable';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('velo_board_view', boardView);
  }, [boardView]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('velo_checklist_density', checklistDensity);
  }, [checklistDensity]);

  useEffect(() => {
    if (!showBoardOnboarding || typeof window === 'undefined') return;
    window.localStorage.setItem('velo_board_views_onboarding_v1', 'seen');
  }, [showBoardOnboarding]);

  return {
    showBoardOnboarding,
    setShowBoardOnboarding,
    boardView,
    setBoardView,
    checklistDensity,
    setChecklistDensity
  };
}
