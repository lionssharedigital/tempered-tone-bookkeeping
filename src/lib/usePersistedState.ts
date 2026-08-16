"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

/**
 * Like useState, but persists to localStorage under `key` so filter/sort/
 * selection state survives navigating away and back, or reloading the page.
 * The stored read is deferred to a post-mount effect (never read during the
 * initial render) to avoid an SSR/hydration mismatch, since these pages are
 * statically prerendered without access to localStorage.
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(defaultValue);
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      // One-time read of the persisted value after mount, replacing the
      // default so the first render still matches server output.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw !== null) setState(JSON.parse(raw));
    } catch {
      // malformed JSON or inaccessible storage (e.g. private browsing) -- keep default
    }
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated.current) return; // don't clobber storage with the default before we've read it
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // quota exceeded or storage unavailable -- persistence just silently no-ops
    }
  }, [key, state]);

  return [state, setState];
}
