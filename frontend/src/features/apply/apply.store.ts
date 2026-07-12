import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApplicationDraft } from './apply.schemas';

const DRAFT_KEY = (userId: string, eventId: string) => `mun_apply_draft_${userId}_${eventId}`;
const AUTOSAVE_DELAY = 800;

export function useDraft(userId: string, eventId: string) {
  const [draft, setDraftState] = useState<ApplicationDraft>(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY(userId, eventId));
      if (raw) return JSON.parse(raw) as ApplicationDraft;
    } catch { /* ignore */ }
    return { eventId, currentStep: 0, completedSteps: [] };
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-initialise draft when the user or event changes (e.g. after login switch)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY(userId, eventId));
      setDraftState(raw ? (JSON.parse(raw) as ApplicationDraft) : { eventId, currentStep: 0, completedSteps: [] });
    } catch {
      setDraftState({ eventId, currentStep: 0, completedSteps: [] });
    }
  }, [userId, eventId]);

  const setDraft = useCallback((updater: (prev: ApplicationDraft) => ApplicationDraft) => {
    setDraftState((prev) => {
      const next = updater(prev);
      // Debounced autosave
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(DRAFT_KEY(userId, eventId), JSON.stringify({ ...next, savedAt: new Date().toISOString() }));
        } catch { /* quota exceeded — silently ignore */ }
      }, AUTOSAVE_DELAY);
      return next;
    });
  }, [userId, eventId]);

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
    localStorage.removeItem(DRAFT_KEY(userId, eventId));
    setDraftState({ eventId, currentStep: 0, completedSteps: [] });
  }, [userId, eventId]);

  const hasSavedDraft = Boolean(
    (() => { try { return localStorage.getItem(DRAFT_KEY(userId, eventId)); } catch { return null; } })(),
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
