import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ApplicationDraft } from './apply.schemas';

interface SubmitPayload {
  eventId:      string;
  personal:     ApplicationDraft['personal'];
  academic:     ApplicationDraft['academic'];
  experience:   ApplicationDraft['experience'];
  committeePref: ApplicationDraft['committeePref'];
  countryPref:  ApplicationDraft['countryPref'];
  payment:      ApplicationDraft['payment'];
}

async function submitApplication(payload: SubmitPayload) {
  const { data } = await api.post<{ data: { id: string; status: string } }>(
    `/events/${payload.eventId}/applications`,
    payload,
  );
  return data.data;
}

export function useSubmitApplication() {
  return useMutation({ mutationFn: submitApplication });
}
