export type EventType = 'MUN' | 'YOUTH_PARLIAMENT';
export type EventStatus = 'draft' | 'pending' | 'active' | 'inactive' | 'archived';

export interface Event {
  id: string;
  name: string;
  slug: string;
  startAt: string;
  endAt: string;
  type: EventType;
  status: EventStatus;
  location: string;
  description: string;
  capacity: number;
  isPublic: boolean;
  delegateCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type CommitteeDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type CommitteeStatus = 'open' | 'filling' | 'full' | 'waitlist';

export interface Committee {
  id: string;
  name: string;
  abbr: string;
  topic: string;
  agenda: string;
  type: EventType;
  difficulty: CommitteeDifficulty;
  status: CommitteeStatus;
  filledSeats: number;
  capacity: number;
  eventId: string;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Delegate {
  id: string;
  name: string;
  country: string;
  committee: string;
  status: 'confirmed' | 'pending' | 'waitlisted';
  registeredAt: string;
}

export interface DelegateApplicationDraft {
  personal: {
    fullName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    nationality: string;
  };
  academic: {
    institution: string;
    degree: string;
    yearOfStudy: string;
    major: string;
  };
  experience: {
    yearsOfExperience: string;
    previousConferences: string;
    awards?: string;
  };
  committeePreference: {
    preferredCommitteeId: string;
    preferredCommitteeName: string;
    secondChoiceCommitteeId?: string;
    positionPreference: string;
  };
  countryPreference: {
    firstChoiceCountry: string;
    secondChoiceCountry?: string;
    thirdChoiceCountry?: string;
    reasonForCountry: string;
  };
  review: {
    termsAccepted: boolean;
    marketingOptIn?: boolean;
  };
  payment: {
    paymentMethod: 'card' | 'upi' | 'netbanking';
    billingName: string;
    couponCode?: string;
  };
}

export type PaymentStatus = 'pending' | 'processing' | 'success' | 'failed';
export type PaymentMethod = 'card' | 'upi' | 'netbanking';

export interface PaymentSession {
  orderId: string;
  receiptId: string;
  registrationId?: string;
  paymentId?: string;
  keyId?: string;
  currency?: string;
  status: PaymentStatus;
  attempts: number;
  applicantName: string;
  email: string;
  committeeId: string;
  committeeName: string;
  committeeAbbr: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  paymentMethod: PaymentMethod;
  amount: number;
  baseFee: number;
  committeeFee: number;
  serviceFee: number;
  tax: number;
  discount: number;
  createdAt: string;
  updatedAt: string;
  failureReason?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
