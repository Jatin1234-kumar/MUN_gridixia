import { z } from 'zod';

// ── Step schemas ──────────────────────────────────────────────────────────────

export const personalSchema = z.object({
  firstName:   z.string().min(2, 'At least 2 characters').max(100),
  lastName:    z.string().min(2, 'At least 2 characters').max(100),
  email:       z.string().email('Valid email required'),
  phone:       z.string().min(7, 'Valid phone required').max(20),
  dateOfBirth: z.string().min(1, 'Required'),
  nationality: z.string().min(2, 'Required'),
  gender: z.enum(['male', 'female', 'non_binary', 'prefer_not_to_say'], {
    required_error: 'Required',
  }),
});

export const academicSchema = z.object({
  institution:    z.string().min(3, 'Required').max(200),
  degree:         z.string().min(2, 'Required').max(100),
  fieldOfStudy:   z.string().min(2, 'Required').max(100),
  yearOfStudy:    z.coerce.number().int().min(1).max(8),
  gpa:            z.string().optional(),
  graduationYear: z.coerce.number().int().min(2024).max(2035),
});

export const experienceSchema = z.object({
  munExperience:       z.enum(['none', 'beginner', 'intermediate', 'advanced'], { required_error: 'Required' }),
  conferencesAttended: z.coerce.number().int().min(0).max(100),
  positionsHeld:       z.string().max(500).optional(),
  awards:              z.string().max(500).optional(),
  motivationStatement: z.string().min(50, 'At least 50 characters').max(1000),
});

export const committeePreferenceSchema = z.object({
  preference1:      z.string().min(1, 'Select a committee'),
  preference2:      z.string().optional(),
  preference3:      z.string().optional(),
  whyThisCommittee: z.string().min(30, 'At least 30 characters').max(600),
});

export const countryPreferenceSchema = z.object({
  preference1:   z.string().min(1, 'Select a country'),
  preference2:   z.string().optional(),
  preference3:   z.string().optional(),
  priorResearch: z.string().min(20, 'At least 20 characters').max(600),
});

export const reviewSchema = z.object({
  agreeToCode:  z.literal(true, { errorMap: () => ({ message: 'You must agree to the Code of Conduct' }) }),
  agreeToTerms: z.literal(true, { errorMap: () => ({ message: 'You must agree to the Terms' }) }),
});

export const paymentSchema = z.object({
  paymentMethod: z.enum(['card', 'upi', 'netbanking'], { required_error: 'Select a payment method' }),
  promoCode:     z.string().max(30).optional(),
});

// ── Master draft type ─────────────────────────────────────────────────────────

export type PersonalData      = z.infer<typeof personalSchema>;
export type AcademicData      = z.infer<typeof academicSchema>;
export type ExperienceData    = z.infer<typeof experienceSchema>;
export type CommitteePrefData = z.infer<typeof committeePreferenceSchema>;
export type CountryPrefData   = z.infer<typeof countryPreferenceSchema>;
export type ReviewData        = z.infer<typeof reviewSchema>;
export type PaymentData       = z.infer<typeof paymentSchema>;

export interface ApplicationDraft {
  eventId:        string;
  currentStep:    number;
  completedSteps: number[];
  personal?:      Partial<PersonalData>;
  academic?:      Partial<AcademicData>;
  experience?:    Partial<ExperienceData>;
  committeePref?: Partial<CommitteePrefData>;
  countryPref?:   Partial<CountryPrefData>;
  review?:        Partial<ReviewData>;
  payment?:       Partial<PaymentData>;
  savedAt?:       string;
}

// ── Step metadata ─────────────────────────────────────────────────────────────

export interface StepMeta {
  index:      number;
  id:         keyof Omit<ApplicationDraft, 'eventId' | 'currentStep' | 'completedSteps' | 'savedAt'>;
  label:      string;
  shortLabel: string;
}

export const STEPS: StepMeta[] = [
  { index: 0, id: 'personal',      label: 'Personal Information', shortLabel: 'Personal'   },
  { index: 1, id: 'academic',      label: 'Academic Information', shortLabel: 'Academic'   },
  { index: 2, id: 'experience',    label: 'MUN Experience',       shortLabel: 'Experience' },
  { index: 3, id: 'committeePref', label: 'Committee Preference', shortLabel: 'Committee'  },
  { index: 4, id: 'countryPref',   label: 'Country Preference',   shortLabel: 'Country'    },
  { index: 5, id: 'review',        label: 'Review & Confirm',     shortLabel: 'Review'     },
  { index: 6, id: 'payment',       label: 'Payment',              shortLabel: 'Payment'    },
];
