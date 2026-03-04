import { useEffect, useRef, useState } from 'react';

export const useSidebarProjectMenu = () => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuProjectId, setMenuProjectId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  const closeProjectMenu = () => {
    setMenuProjectId(null);
    setMenuPosition(null);
  };

  const openProjectMenu = (projectId: string, trigger: HTMLButtonElement) => {
    const rect = trigger.getBoundingClientRect();
    if (menuProjectId === projectId) {
      closeProjectMenu();
      return;
    }
    setMenuProjectId(projectId);
    setMenuPosition({
      top: rect.bottom + 6,
      left: Math.max(12, rect.right - 176)
    });
  };

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      closeProjectMenu();
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return {
    menuRef,
    menuProjectId,
    menuPosition,
    closeProjectMenu,
    openProjectMenu
  };
};
