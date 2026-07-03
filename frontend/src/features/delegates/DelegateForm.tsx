import { useEffect, useMemo, useState } from 'react';
import * as React from "react";
import type { ComponentType, ReactNode } from 'react';
import { useForm, useWatch, type FieldPath } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  CreditCard,
  GraduationCap,
  Globe2,
  LayoutList,
  MapPin,
  NotebookText,
  ShieldCheck,
  Sparkles,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn, formatDate } from '@/lib/utils';
import { useCommittees } from '@/hooks/useCommittees';
import { useEvents } from '@/hooks/useEvents';
import type { Committee, Event, DelegateApplicationDraft } from '@/types';

const draftStorageKey = 'mun-gridixia:delegate-application-draft:v1';

const applicationSchema = z.object({
  personal: z.object({
    fullName: z.string().min(2, 'Full name is required').max(120),
    email: z.string().email('Enter a valid email address'),
    phone: z.string().min(7, 'Phone number is required').max(20),
    dateOfBirth: z.string().min(1, 'Date of birth is required'),
    nationality: z.string().min(2, 'Nationality is required').max(100),
  }),
  academic: z.object({
    institution: z.string().min(2, 'Institution is required').max(160),
    degree: z.string().min(2, 'Degree is required').max(120),
    yearOfStudy: z.string().min(1, 'Year of study is required'),
    major: z.string().min(2, 'Major is required').max(120),
  }),
  experience: z.object({
    yearsOfExperience: z.string().min(1, 'Select your experience level'),
    previousConferences: z.string().min(1, 'Tell us about previous conferences'),
    awards: z.string().optional().default(''),
  }),
  committeePreference: z.object({
    preferredCommitteeId: z.string().min(1, 'Select a committee'),
    preferredCommitteeName: z.string().min(1, 'Committee name is required'),
    secondChoiceCommitteeId: z.string().optional().default(''),
    positionPreference: z.string().min(2, 'Position preference is required').max(120),
  }),
  countryPreference: z.object({
    firstChoiceCountry: z.string().min(2, 'First choice country is required').max(120),
    secondChoiceCountry: z.string().optional().default(''),
    thirdChoiceCountry: z.string().optional().default(''),
    reasonForCountry: z.string().min(20, 'Explain your preference in at least 20 characters').max(1000),
  }),
  review: z.object({
    termsAccepted: z.boolean().refine((value) => value, 'You must confirm the information is accurate'),
    marketingOptIn: z.boolean().optional().default(false),
  }),
  payment: z.object({
    paymentMethod: z.enum(['card', 'upi', 'netbanking']),
    billingName: z.string().min(2, 'Billing name is required').max(120),
    couponCode: z.string().optional().default(''),
  }),
});

type ApplicationFormValues = z.infer<typeof applicationSchema>;
type StepKey = 'personal' | 'academic' | 'experience' | 'committeePreference' | 'countryPreference' | 'review' | 'payment';

const stepLabels: { key: StepKey; title: string; icon: LucideIcon }[] = [
  { key: 'personal', title: 'Personal Information', icon: UserRound },
  { key: 'academic', title: 'Academic Information', icon: GraduationCap },
  { key: 'experience', title: 'MUN Experience', icon: NotebookText },
  { key: 'committeePreference', title: 'Committee Preference', icon: LayoutList },
  { key: 'countryPreference', title: 'Country Preference', icon: Globe2 },
  { key: 'review', title: 'Review', icon: ShieldCheck },
  { key: 'payment', title: 'Payment', icon: CreditCard },
];

const defaultValues: ApplicationFormValues = {
  personal: { fullName: '', email: '', phone: '', dateOfBirth: '', nationality: '' },
  academic: { institution: '', degree: '', yearOfStudy: '', major: '' },
  experience: { yearsOfExperience: '', previousConferences: '', awards: '' },
  committeePreference: {
    preferredCommitteeId: '',
    preferredCommitteeName: '',
    secondChoiceCommitteeId: '',
    positionPreference: '',
  },
  countryPreference: {
    firstChoiceCountry: '',
    secondChoiceCountry: '',
    thirdChoiceCountry: '',
    reasonForCountry: '',
  },
  review: { termsAccepted: false, marketingOptIn: false },
  payment: { paymentMethod: 'card', billingName: '', couponCode: '' },
};

const stepFields: Record<StepKey, FieldPath<ApplicationFormValues>[]> = {
  personal: ['personal.fullName', 'personal.email', 'personal.phone', 'personal.dateOfBirth', 'personal.nationality'],
  academic: ['academic.institution', 'academic.degree', 'academic.yearOfStudy', 'academic.major'],
  experience: ['experience.yearsOfExperience', 'experience.previousConferences', 'experience.awards'],
  committeePreference: ['committeePreference.preferredCommitteeId', 'committeePreference.preferredCommitteeName', 'committeePreference.secondChoiceCommitteeId', 'committeePreference.positionPreference'],
  countryPreference: ['countryPreference.firstChoiceCountry', 'countryPreference.secondChoiceCountry', 'countryPreference.thirdChoiceCountry', 'countryPreference.reasonForCountry'],
  review: ['review.termsAccepted', 'review.marketingOptIn'],
  payment: ['payment.paymentMethod', 'payment.billingName', 'payment.couponCode'],
};

function loadDraft(): ApplicationFormValues | undefined {
  if (typeof window === 'undefined') return undefined;

  try {
    const raw = window.localStorage.getItem(draftStorageKey);
    if (!raw) return undefined;

    const parsed = JSON.parse(raw) as Partial<DelegateApplicationDraft>;
    return { ...defaultValues, ...parsed } as ApplicationFormValues;
  } catch {
    return undefined;
  }
}

function saveDraft(values: Partial<ApplicationFormValues>) {
  window.localStorage.setItem(draftStorageKey, JSON.stringify(values));
  window.localStorage.setItem(`${draftStorageKey}:savedAt`, new Date().toISOString());
}

function clearDraft() {
  window.localStorage.removeItem(draftStorageKey);
  window.localStorage.removeItem(`${draftStorageKey}:savedAt`);
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-300">{message}</p>;
}

function SectionShell({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <Card className="glass-card overflow-hidden border-white/[0.08]">
      <CardHeader className="space-y-3 border-b border-white/[0.06] bg-white/[0.015] pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-500/20 bg-gold-500/10 text-gold-400">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base text-foreground">{title}</CardTitle>
            <CardDescription className="mt-1 text-sm">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-5 sm:grid-cols-2">{children}</CardContent>
    </Card>
  );
}

const SelectField = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string; children: ReactNode }
>(({ label, error, children, ...props }, ref) => {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={props.id}>{label}</Label>
      <select
        ref={ref}
        {...props}
        className={cn(
          'flex h-9 w-full rounded-lg border border-white/[0.08] bg-navy-800/60 px-3 text-sm text-foreground shadow-sm',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/50 focus-visible:border-gold-500/40',
          'transition-colors duration-200',
          props.className,
        )}
      >
        {children}
      </select>
      <FieldError message={error} />
    </div>
  );
});

SelectField.displayName = 'SelectField';

function TextareaField({
  label,
  error,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }) {
  return (
    <div className="space-y-1.5 sm:col-span-2">
      <Label htmlFor={props.id}>{label}</Label>
      <textarea
        {...props}
        className={cn(
          'min-h-28 w-full rounded-lg border border-white/[0.08] bg-navy-800/60 px-3 py-2 text-sm text-foreground shadow-sm',
          'placeholder:text-muted-foreground/50',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/50 focus-visible:border-gold-500/40',
          'transition-colors duration-200',
          props.className,
        )}
      />
      <FieldError message={error} />
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value || 'Not filled yet'}</p>
    </div>
  );
}

export function DelegateForm() {
  const queryClient = useQueryClient();
  const { data: committees = [] } = useCommittees();
  const { data: events = [] } = useEvents();
  const loadedDraft = useMemo(() => loadDraft(), []);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Draft ready to autosave locally.');
  const [submittedPayload, setSubmittedPayload] = useState<ApplicationFormValues | null>(null);

  useEffect(() => {
    setSavedAt(window.localStorage.getItem(`${draftStorageKey}:savedAt`));
  }, []);

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: loadedDraft ?? defaultValues,
    mode: 'onTouched',
    shouldUnregister: false,
  });

  const values = useWatch({ control: form.control });

  useEffect(() => {
    if (!values) return;

    const timer = window.setTimeout(() => {
      saveDraft(form.getValues());
      setSavedAt(window.localStorage.getItem(`${draftStorageKey}:savedAt`));
      setStatusMessage('Draft autosaved locally.');
    }, 500);

    return () => window.clearTimeout(timer);
  }, [values]);

  useEffect(() => {
    if (loadedDraft) {
      setStatusMessage('Draft restored from local storage.');
    }
  }, [loadedDraft]);

  const selectedCommittee = committees.find((committee: Committee) => committee.id === form.watch('committeePreference.preferredCommitteeId'));
  const selectedEvent = events.find((event: Event) => event.id === selectedCommittee?.eventId);
  const progress = ((stepIndex + 1) / stepLabels.length) * 100;
  const step = stepLabels[stepIndex];

  const goToStep = async (nextStep: number) => {
    const currentKey = stepLabels[stepIndex]?.key;
    const valid = await form.trigger(stepFields[currentKey], { shouldFocus: true });
    if (!valid) return;

    setStepIndex(Math.max(0, Math.min(nextStep, stepLabels.length - 1)));
  };

  const onSubmit = form.handleSubmit(async (formValues) => {
    const parsed = applicationSchema.parse(formValues);
    setSubmittedPayload(parsed);
    saveDraft(parsed);
    setSavedAt(window.localStorage.getItem(`${draftStorageKey}:savedAt`));
    setStatusMessage('Application ready for payment. Draft retained locally.');
    setStepIndex(stepLabels.length - 1);
    await queryClient.invalidateQueries({ queryKey: ['delegates'] });
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-8">
      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <Card className="glass-card overflow-hidden border-white/[0.08]">
          <CardHeader className="space-y-4 border-b border-white/[0.06] bg-white/[0.015] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <Badge variant="default" className="w-fit gap-1.5">
                  <Sparkles size={12} /> Premium Delegate Application
                </Badge>
                <CardTitle className="text-2xl sm:text-3xl">Build your delegate application in seven steps.</CardTitle>
                <CardDescription className="max-w-2xl text-sm sm:text-base">
                  Save progress locally, validate each step before moving forward, and resume your application later from the same browser.
                </CardDescription>
              </div>
              <div className="rounded-2xl border border-gold-500/20 bg-gold-500/10 px-4 py-3 text-right">
                <p className="text-[10px] uppercase tracking-[0.32em] text-gold-400">Current Step</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{step.title}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{stepIndex + 1} of {stepLabels.length}</span>
              </div>
              <Progress value={progress} />
            </div>
          </CardHeader>

          <CardContent className="space-y-5 p-5 sm:p-6">
            <div className="overflow-x-auto pb-1">
              <Tabs value={step.key} className="w-full">
                <TabsList className="grid h-auto w-max min-w-full grid-cols-7 gap-0.5 rounded-2xl bg-navy-900/70 p-1">
                  {stepLabels.map(({ key, title, icon: Icon }, index) => (
                    <TabsTrigger
                      key={key}
                      value={key}
                      onClick={() => setStepIndex(index)}
                      className="flex min-w-[8rem] flex-col gap-1.5 py-3 text-center data-[state=active]:shadow-gold-glow"
                    >
                      <Icon size={13} />
                      <span className="text-[11px] leading-4">{title}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
                {stepLabels.map(({ key }) => (
                  <TabsContent key={key} value={key} className="mt-0">
                    <AnimatePresence mode="wait">
                      {step.key === key && (
                        <motion.div
                          key={key}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.22 }}
                        >
                          {key === 'personal' && (
                            <SectionShell title="Personal Information" description="Tell us who you are and how to reach you." icon={UserRound}>
                              <div className="space-y-1.5">
                                <Label htmlFor="personal.fullName">Full Name</Label>
                                <Input id="personal.fullName" {...form.register('personal.fullName')} placeholder="Alexandra Chen" />
                                <FieldError message={form.formState.errors.personal?.fullName?.message} />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="personal.email">Email</Label>
                                <Input id="personal.email" type="email" {...form.register('personal.email')} placeholder="alexandra@example.com" />
                                <FieldError message={form.formState.errors.personal?.email?.message} />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="personal.phone">Phone</Label>
                                <Input id="personal.phone" {...form.register('personal.phone')} placeholder="+1 555 0100" />
                                <FieldError message={form.formState.errors.personal?.phone?.message} />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="personal.dateOfBirth">Date of Birth</Label>
                                <Input id="personal.dateOfBirth" type="date" {...form.register('personal.dateOfBirth')} />
                                <FieldError message={form.formState.errors.personal?.dateOfBirth?.message} />
                              </div>
                              <div className="space-y-1.5 sm:col-span-2">
                                <Label htmlFor="personal.nationality">Nationality</Label>
                                <Input id="personal.nationality" {...form.register('personal.nationality')} placeholder="Indian" />
                                <FieldError message={form.formState.errors.personal?.nationality?.message} />
                              </div>
                            </SectionShell>
                          )}

                          {key === 'academic' && (
                            <SectionShell title="Academic Information" description="Share your institution and current academic profile." icon={GraduationCap}>
                              <div className="space-y-1.5">
                                <Label htmlFor="academic.institution">Institution</Label>
                                <Input id="academic.institution" {...form.register('academic.institution')} placeholder="St. Stephen's College" />
                                <FieldError message={form.formState.errors.academic?.institution?.message} />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="academic.degree">Degree</Label>
                                <Input id="academic.degree" {...form.register('academic.degree')} placeholder="Bachelor of Arts" />
                                <FieldError message={form.formState.errors.academic?.degree?.message} />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="academic.yearOfStudy">Year of Study</Label>
                                <SelectField id="academic.yearOfStudy" label="Year of Study" error={form.formState.errors.academic?.yearOfStudy?.message} {...form.register('academic.yearOfStudy')}>
                                  <option value="">Select year</option>
                                  <option value="1">First year</option>
                                  <option value="2">Second year</option>
                                  <option value="3">Third year</option>
                                  <option value="4">Fourth year</option>
                                  <option value="graduate">Graduate</option>
                                </SelectField>
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="academic.major">Major</Label>
                                <Input id="academic.major" {...form.register('academic.major')} placeholder="Political Science" />
                                <FieldError message={form.formState.errors.academic?.major?.message} />
                              </div>
                            </SectionShell>
                          )}

                          {key === 'experience' && (
                            <SectionShell title="MUN Experience" description="Summarize your prior debate and conference experience." icon={NotebookText}>
                              <div className="space-y-1.5">
                                <Label htmlFor="experience.yearsOfExperience">Experience Level</Label>
                                <SelectField id="experience.yearsOfExperience" label="Experience Level" error={form.formState.errors.experience?.yearsOfExperience?.message} {...form.register('experience.yearsOfExperience')}>
                                  <option value="">Select level</option>
                                  <option value="new">New delegate</option>
                                  <option value="1-2">1-2 conferences</option>
                                  <option value="3-5">3-5 conferences</option>
                                  <option value="6+">6+ conferences</option>
                                </SelectField>
                              </div>
                              <TextareaField id="experience.previousConferences" label="Previous Conferences" placeholder="List conferences, awards, and notable committees you've participated in." error={form.formState.errors.experience?.previousConferences?.message} {...form.register('experience.previousConferences')} />
                              <TextareaField id="experience.awards" label="Awards or Achievements" placeholder="Optional: note any distinctions, chairs, or best delegate awards." error={form.formState.errors.experience?.awards?.message} {...form.register('experience.awards')} />
                            </SectionShell>
                          )}

                          {key === 'committeePreference' && (
                            <SectionShell title="Committee Preference" description="Select your first and second choice committee preferences." icon={LayoutList}>
                              <div className="space-y-1.5">
                                <Label htmlFor="committeePreference.preferredCommitteeId">First Choice Committee</Label>
                                <SelectField id="committeePreference.preferredCommitteeId" label="First Choice Committee" error={form.formState.errors.committeePreference?.preferredCommitteeId?.message} {...form.register('committeePreference.preferredCommitteeId')}>
                                  <option value="">Select committee</option>
                                  {committees.map((committee: Committee) => (
                                    <option key={committee.id} value={committee.id}>
                                      {committee.abbr} - {committee.name}
                                    </option>
                                  ))}
                                </SelectField>
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="committeePreference.preferredCommitteeName">Why this committee?</Label>
                                <Input id="committeePreference.preferredCommitteeName" {...form.register('committeePreference.preferredCommitteeName')} placeholder="Explain your top choice" />
                                <FieldError message={form.formState.errors.committeePreference?.preferredCommitteeName?.message} />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="committeePreference.secondChoiceCommitteeId">Second Choice Committee</Label>
                                <SelectField id="committeePreference.secondChoiceCommitteeId" label="Second Choice Committee" error={form.formState.errors.committeePreference?.secondChoiceCommitteeId?.message} {...form.register('committeePreference.secondChoiceCommitteeId')}>
                                  <option value="">Optional</option>
                                  {committees.map((committee: Committee) => (
                                    <option key={committee.id} value={committee.id}>
                                      {committee.abbr} - {committee.name}
                                    </option>
                                  ))}
                                </SelectField>
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="committeePreference.positionPreference">Position Preference</Label>
                                <Input id="committeePreference.positionPreference" {...form.register('committeePreference.positionPreference')} placeholder="Delegate, chair, or press" />
                                <FieldError message={form.formState.errors.committeePreference?.positionPreference?.message} />
                              </div>
                            </SectionShell>
                          )}

                          {key === 'countryPreference' && (
                            <SectionShell title="Country Preference" description="Rank your preferred countries and explain the reasoning." icon={MapPin}>
                              <div className="space-y-1.5">
                                <Label htmlFor="countryPreference.firstChoiceCountry">First Choice</Label>
                                <Input id="countryPreference.firstChoiceCountry" {...form.register('countryPreference.firstChoiceCountry')} placeholder="France" />
                                <FieldError message={form.formState.errors.countryPreference?.firstChoiceCountry?.message} />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="countryPreference.secondChoiceCountry">Second Choice</Label>
                                <Input id="countryPreference.secondChoiceCountry" {...form.register('countryPreference.secondChoiceCountry')} placeholder="Germany" />
                                <FieldError message={form.formState.errors.countryPreference?.secondChoiceCountry?.message} />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="countryPreference.thirdChoiceCountry">Third Choice</Label>
                                <Input id="countryPreference.thirdChoiceCountry" {...form.register('countryPreference.thirdChoiceCountry')} placeholder="Japan" />
                                <FieldError message={form.formState.errors.countryPreference?.thirdChoiceCountry?.message} />
                              </div>
                              <TextareaField id="countryPreference.reasonForCountry" label="Reason for Country Preference" placeholder="Why do these countries align with your strengths and the committee topic?" error={form.formState.errors.countryPreference?.reasonForCountry?.message} {...form.register('countryPreference.reasonForCountry')} />
                            </SectionShell>
                          )}

                          {key === 'review' && (
                            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                              <SectionShell title="Review and Confirm" description="Check the compiled information before payment." icon={ShieldCheck}>
                                <div className="space-y-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:col-span-2">
                                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Application Summary</p>
                                  <div className="grid gap-3 pt-2 sm:grid-cols-2">
                                    <SummaryItem label="Applicant" value={form.watch('personal.fullName')} />
                                    <SummaryItem label="Email" value={form.watch('personal.email')} />
                                    <SummaryItem label="Committee" value={selectedCommittee ? `${selectedCommittee.abbr} - ${selectedCommittee.name}` : 'Not selected'} />
                                    <SummaryItem label="Event" value={selectedEvent ? `${selectedEvent.name} • ${formatDate(selectedEvent.date)}` : 'Auto-linked from committee'} />
                                    <SummaryItem label="Country" value={form.watch('countryPreference.firstChoiceCountry')} />
                                    <SummaryItem label="Payment Method" value={form.watch('payment.paymentMethod').toUpperCase()} />
                                  </div>
                                </div>

                                <div className="space-y-3 sm:col-span-2">
                                  <label className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                                    <input type="checkbox" className="mt-1 h-4 w-4 rounded border-white/[0.12] bg-navy-800 text-gold-500 focus:ring-gold-500/50" {...form.register('review.termsAccepted')} />
                                    <span>
                                      <span className="block text-sm font-medium text-foreground">I confirm the information is accurate.</span>
                                      <span className="block text-xs text-muted-foreground">You can edit and resave before final submission.</span>
                                    </span>
                                  </label>
                                  <FieldError message={form.formState.errors.review?.termsAccepted?.message} />
                                  <label className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                                    <input type="checkbox" className="mt-1 h-4 w-4 rounded border-white/[0.12] bg-navy-800 text-gold-500 focus:ring-gold-500/50" {...form.register('review.marketingOptIn')} />
                                    <span>
                                      <span className="block text-sm font-medium text-foreground">Send me event updates and reminders.</span>
                                      <span className="block text-xs text-muted-foreground">Optional product communication only.</span>
                                    </span>
                                  </label>
                                </div>
                              </SectionShell>

                              <Card className="glass-card border-white/[0.08]">
                                <CardHeader>
                                  <CardTitle className="text-base">Draft Status</CardTitle>
                                  <CardDescription>{savedAt ? `Last saved ${formatDate(savedAt)}` : 'Not yet saved'}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm text-muted-foreground">
                                  <div className="flex items-start gap-2">
                                    <Clock3 size={14} className="mt-0.5 text-gold-400" />
                                    <p>{statusMessage}</p>
                                  </div>
                                  <div className="rounded-xl border border-white/[0.06] bg-navy-900/60 p-4">
                                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Resume Later</p>
                                    <p className="mt-2 text-sm text-foreground">Your draft stays in this browser until you clear it or submit a final application.</p>
                                  </div>
                                </CardContent>
                                <CardFooter className="flex flex-wrap gap-2">
                                  <Button type="button" variant="outline" onClick={() => form.reset(loadDraft() ?? defaultValues)}>Restore Draft</Button>
                                  <Button type="button" variant="ghost" onClick={clearDraft}>Clear Draft</Button>
                                </CardFooter>
                              </Card>
                            </div>
                          )}

                                          {key === 'payment' && (
                                            <SectionShell title="Payment Handoff" description="Continue into the dedicated payment experience with recovery support and status tracking." icon={CreditCard}>
                                              <div className="sm:col-span-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-muted-foreground">
                                                <p className="text-foreground">Your application draft is saved locally. The dedicated payment page shows the registration summary, fee breakdown, committee selection, and payment status controls.</p>
                                                <p className="mt-2">Use the link below to continue, or keep editing the draft before proceeding.</p>
                                              </div>
                                              <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row">
                                                <Button asChild className="w-full sm:w-auto">
                                                  <Link to="/payments">Go to Payment Experience</Link>
                                                </Button>
                                                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onSubmit} disabled={form.formState.isSubmitting}>
                                                  Save Draft and Prepare Payment
                                                </Button>
                                              </div>
                                            </SectionShell>
                                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 border-t border-white/[0.06] p-5 sm:flex-row sm:justify-between sm:p-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck size={13} className="text-gold-400" />
              {stepIndex === 0 ? 'Start with your personal details.' : 'Every step is validated before continuing.'}
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button type="button" variant="secondary" onClick={() => setStepIndex((current) => Math.max(0, current - 1))} disabled={stepIndex === 0}>
                <ArrowLeft size={14} />
                Back
              </Button>
              {stepIndex < stepLabels.length - 1 ? (
                <Button type="button" onClick={() => goToStep(stepIndex + 1)}>
                  Next
                  <ArrowRight size={14} />
                </Button>
              ) : (
                <Button type="button" onClick={onSubmit}>
                  <Check size={14} />
                  Submit Application
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>

        <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Card className="glass-card border-white/[0.08]">
            <CardHeader>
              <CardTitle className="text-base">Step Tracker</CardTitle>
              <CardDescription>Complete each stage to unlock the next.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {stepLabels.map(({ key, title, icon: Icon }, index) => {
                const active = index === stepIndex;
                const complete = index < stepIndex;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStepIndex(index)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all',
                      active ? 'border-gold-500/30 bg-gold-500/10' : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]',
                    )}
                  >
                    <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl border', complete || active ? 'border-gold-500/30 bg-gold-500/10 text-gold-400' : 'border-white/[0.06] bg-navy-900/60 text-muted-foreground')}>
                      {complete ? <Check size={14} /> : <Icon size={14} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{title}</p>
                      <p className="text-[11px] text-muted-foreground">{complete ? 'Completed' : active ? 'In progress' : 'Pending'}</p>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card className="glass-card border-white/[0.08]">
            <CardHeader>
              <CardTitle className="text-base">Local Resume</CardTitle>
              <CardDescription>Continue where you left off from the same browser.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Autosave writes your progress to local storage after each change.</p>
              <p>Use the restore button on the review step if you need to recover a saved draft.</p>
            </CardContent>
          </Card>

          {submittedPayload && (
            <Card className="glass-card border-white/[0.08]">
              <CardHeader>
                <CardTitle className="text-base">Submission Snapshot</CardTitle>
                <CardDescription>Latest validated payload.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 text-foreground">
                  <Check size={14} className="text-emerald-400" />
                  <span>{submittedPayload.personal.fullName}</span>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <MapPin size={14} className="text-gold-400" />
                  <span>{submittedPayload.countryPreference.firstChoiceCountry}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
