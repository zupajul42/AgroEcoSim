import { useCallback, useRef, useState } from "preact/hooks";

export interface HistoryControls<T> {
  state: T;
  set: (next: T | ((prev: T) => T), recordHistory?: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  pushState: (stateToPush: T) => void;
}

export function useHistory<T>(initialState: T, maxDepth = 50): HistoryControls<T> {
  const [state, setStateInternal] = useState<T>(initialState);
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);
  const [, setRevision] = useState(0);

  const forceRender = () => setRevision((r) => r + 1);

  const pushState = useCallback((stateToPush: T) => {
    pastRef.current = [...pastRef.current.slice(-(maxDepth - 1)), stateToPush];
    futureRef.current = [];
    forceRender();
  }, [maxDepth]);

  const set = useCallback(
    (action: T | ((prev: T) => T), recordHistory = true) => {
      setStateInternal((prev) => {
        const next = typeof action === "function" ? (action as (prev: T) => T)(prev) : action;
        if (recordHistory && JSON.stringify(prev) !== JSON.stringify(next)) {
          pastRef.current = [...pastRef.current.slice(-(maxDepth - 1)), prev];
          futureRef.current = [];
        }
        return next;
      });
      forceRender();
    },
    [maxDepth]
  );

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    const previous = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, pastRef.current.length - 1);

    setStateInternal((current) => {
      futureRef.current = [current, ...futureRef.current];
      return previous;
    });
    forceRender();
  }, []);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current[0];
    futureRef.current = futureRef.current.slice(1);

    setStateInternal((current) => {
      pastRef.current = [...pastRef.current, current];
      return next;
    });
    forceRender();
  }, []);

  return {
    state,
    set,
    undo,
    redo,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
    pushState,
  };
}
