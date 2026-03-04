import { useEffect, useRef, useState } from 'react';
import { defaultColumnWidths, TICKET_TABLE_COLUMNS, TICKETS_TABLE_PREFS_PREFIX, TicketTableSortKey } from '../ticketConstants';

interface UseTicketTablePrefsArgs {
  orgId: string;
  userId: string;
}

export const useTicketTablePrefs = ({ orgId, userId }: UseTicketTablePrefsArgs) => {
  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const resizeStateRef = useRef<{
    key: TicketTableSortKey;
    nextKey: TicketTableSortKey;
    startX: number;
    startCurrent: number;
    startNext: number;
    wrapWidth: number;
  } | null>(null);

  const [tableSort, setTableSort] = useState<{ key: TicketTableSortKey; direction: 'asc' | 'desc' }>({
    key: 'createdAt',
    direction: 'desc'
  });
  const [columnWidths, setColumnWidths] = useState<Record<TicketTableSortKey, number>>(defaultColumnWidths);

  useEffect(() => {
    const storageKey = `${TICKETS_TABLE_PREFS_PREFIX}:${orgId}:${userId}`;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        sort?: { key: TicketTableSortKey; direction: 'asc' | 'desc' };
        widths?: Record<TicketTableSortKey, number>;
      };
      if (parsed.sort && TICKET_TABLE_COLUMNS.includes(parsed.sort.key) && (parsed.sort.direction === 'asc' || parsed.sort.direction === 'desc')) {
        setTableSort(parsed.sort);
      }
      if (parsed.widths) {
        const next: Record<TicketTableSortKey, number> = { ...defaultColumnWidths };
        let valid = true;
        let sum = 0;
        for (const key of TICKET_TABLE_COLUMNS) {
          const value = parsed.widths[key];
          if (typeof value !== 'number' || !Number.isFinite(value)) {
            valid = false;
            break;
          }
          next[key] = value;
          sum += value;
        }
        if (valid && sum > 99 && sum < 101) setColumnWidths(next);
      }
    } catch {
      // ignore invalid prefs
    }
  }, [orgId, userId]);

  useEffect(() => {
    const storageKey = `${TICKETS_TABLE_PREFS_PREFIX}:${orgId}:${userId}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ sort: tableSort, widths: columnWidths }));
    } catch {
      // ignore
    }
  }, [columnWidths, orgId, tableSort, userId]);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      const state = resizeStateRef.current;
      if (!state) return;
      const pxDelta = event.clientX - state.startX;
      const pctDelta = (pxDelta / Math.max(1, state.wrapWidth)) * 100;
      const minPct = 8;
      const maxCurrent = state.startCurrent + state.startNext - minPct;
      const nextCurrent = Math.max(minPct, Math.min(maxCurrent, state.startCurrent + pctDelta));
      const nextNeighbor = state.startCurrent + state.startNext - nextCurrent;
      setColumnWidths((prev) => ({ ...prev, [state.key]: nextCurrent, [state.nextKey]: nextNeighbor }));
    };
    const onUp = () => {
      resizeStateRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  return {
    tableWrapRef,
    resizeStateRef,
    tableSort,
    setTableSort,
    columnWidths,
    setColumnWidths
  };
};
