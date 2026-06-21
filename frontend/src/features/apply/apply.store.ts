import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApplicationDraft } from './apply.schemas';

const DRAFT_KEY = (eventId: string) => `mun_apply_draft_${eventId}`;
const AUTOSAVE_DELAY = 800;

export function useDraft(eventId: string) {
  const [draft, setDraftState] = useState<ApplicationDraft>(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY(eventId));
      if (raw) return JSON.parse(raw) as ApplicationDraft;
    } catch { /* ignore */ }
    return { eventId, currentStep: 0, completedSteps: [] };
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setDraft = useCallback((updater: (prev: ApplicationDraft) => ApplicationDraft) => {
    setDraftState((prev) => {
      const next = updater(prev);
      // Debounced autosave
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(DRAFT_KEY(eventId), JSON.stringify({ ...next, savedAt: new Date().toISOString() }));
        } catch { /* quota exceeded — silently ignore */ }
      }, AUTOSAVE_DELAY);
      return next;
    });
  }, [eventId]);

  const saveStepData = useCallback(
    <K extends keyof Omit<ApplicationDraft, 'eventId' | 'currentStep' | 'completedSteps' | 'savedAt'>>(
      stepKey: K,
      data: ApplicationDraft[K],
    ) => {
      setDraft((prev) => ({
        ...prev,
        [stepKey]: data,
        completedSteps: prev.completedSteps.includes(STEP_INDEX[stepKey])
          ? prev.completedSteps
          : [...prev.completedSteps, STEP_INDEX[stepKey]],
      }));
    },
    [setDraft],
  );

  const goToStep = useCallback(
    (step: number) => setDraft((prev) => ({ ...prev, currentStep: step })),
    [setDraft],
  );

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY(eventId));
    setDraftState({ eventId, currentStep: 0, completedSteps: [] });
  }, [eventId]);

  const hasSavedDraft = Boolean(
    (() => { try { return localStorage.getItem(DRAFT_KEY(eventId)); } catch { return null; } })(),
  );

  // Flush on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return { draft, setDraft, saveStepData, goToStep, clearDraft, hasSavedDraft };
}

// Map step keys to their numeric index for completedSteps tracking
const STEP_INDEX: Record<string, number> = {
  personal:      0,
  academic:      1,
  experience:    2,
  committeePref: 3,
  countryPref:   4,
  review:        5,
  payment:       6,
};
