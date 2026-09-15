import { useCallback, useRef, useState } from "preact/hooks";

interface HistoryControls<T> {
  state: T;
  set: (next: T | ((prev: T) => T), recordHistory?: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  pushState: (stateToPush: T) => void;
}

/** "undo" / "redo" for the standard keyboard shortcuts, null for any other key. */
export function historyKey(ev: KeyboardEvent): "undo" | "redo" | null {
  if (!(ev.ctrlKey || ev.metaKey)) return null;
  const key = ev.key.toLowerCase();
  if (key === "z") return ev.shiftKey ? "redo" : "undo";
  if (key === "y") return "redo";
  return null;
}

/** State with an undo/redo stack. `set(next, false)` changes without recording; `pushState`
 *  records a snapshot up front, e.g. before a drag that then sets without recording. */
export function useHistory<T>(initialState: T, maxDepth = 50): HistoryControls<T> {
  const [state, setStateInternal] = useState<T>(initialState);
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);
  const [, setRevision] = useState(0);

  const forceRender = () => setRevision((r) => r + 1);
  const remember = (snapshot: T) => {
    pastRef.current = [...pastRef.current.slice(-(maxDepth - 1)), snapshot];
    futureRef.current = [];
  };

  const pushState = useCallback(
    (stateToPush: T) => {
      remember(stateToPush);
      forceRender();
    },
    [maxDepth],
  );

  const set = useCallback(
    (action: T | ((prev: T) => T), recordHistory = true) => {
      setStateInternal((prev) => {
        const next = typeof action === "function" ? (action as (prev: T) => T)(prev) : action;
        if (recordHistory && JSON.stringify(prev) !== JSON.stringify(next)) remember(prev);
        return next;
      });
      forceRender();
    },
    [maxDepth],
  );

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    const previous = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
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
