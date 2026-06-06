// Double-click guard + loading state for async handlers
// Usage:
//   const [guard, busy] = useGuardState();
//   onClick={() => guard(async () => { ... })}
//   {busy && <LoadingSpinner />}

import { useState, useRef, useCallback } from "react";

export function createGuard() {
  let busy = false;
  return async (fn: () => Promise<void>) => {
    if (busy) return;
    busy = true;
    try {
      await fn();
    } finally {
      busy = false;
    }
  };
}

export function useGuardState(): [(fn: () => Promise<void>) => Promise<void>, boolean] {
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);

  const guard = useCallback(async (fn: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await fn();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  return [guard, busy];
}
