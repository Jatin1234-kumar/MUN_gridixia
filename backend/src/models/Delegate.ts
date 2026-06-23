import { model, Schema, type HydratedDocument } from 'mongoose';
import { applyCommonSchemaBehavior, type SoftDeleteFields } from './shared';

export const delegateStatuses = ['confirmed', 'pending', 'waitlisted'] as const;
export type DelegateStatus = (typeof delegateStatuses)[number];

export interface Delegate extends SoftDeleteFields {
  name: string;
  country: string;
  committee: string;
  status: DelegateStatus;
  registeredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const delegateSchema = new Schema<Delegate>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 200 },
    country: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    committee: { type: String, required: true, trim: true, minlength: 1, maxlength: 50 },
    status: { type: String, enum: delegateStatuses, default: 'pending', required: true },
    registeredAt: { type: Date, default: Date.now },
  },
  { optimisticConcurrency: true },
);

delegateSchema.index({ committee: 1, status: 1 }, { name: 'delegate_committee_status_idx' });
delegateSchema.index({ country: 1, committee: 1 }, { name: 'delegate_country_committee_idx' });

applyCommonSchemaBehavior(delegateSchema);

export const DelegateModel = model<Delegate>('Delegate', delegateSchema);
export type DelegateDocument = HydratedDocument<Delegate>;
