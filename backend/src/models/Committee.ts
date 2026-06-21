import { model, Schema, type HydratedDocument, Types } from 'mongoose';
import { applyCommonSchemaBehavior, type SoftDeleteFields } from './shared';
import { eventTypes } from './Event';

export const committeeDifficulties = ['beginner', 'intermediate', 'advanced'] as const;
export type CommitteeDifficulty = (typeof committeeDifficulties)[number];

export interface Committee extends SoftDeleteFields {
  eventId: Types.ObjectId;
  name: string;
  abbr: string;
  agenda: string;
  topic: string;
  type: (typeof eventTypes)[number];
  difficulty: CommitteeDifficulty;
  capacity: number;
  filledSeats: number;
  chairId?: Types.ObjectId | null;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const committeeSchema = new Schema<Committee>(
  {
    eventId:    { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    name:       { type: String, required: true, trim: true, minlength: 3, maxlength: 200 },
    abbr:       { type: String, required: true, trim: true, uppercase: true, minlength: 2, maxlength: 20 },
    agenda:     { type: String, required: true, trim: true, minlength: 5, maxlength: 2000 },
    topic:      { type: String, required: true, trim: true, minlength: 5, maxlength: 1000 },
    type:       { type: String, enum: eventTypes, required: true },
    difficulty: { type: String, enum: committeeDifficulties, required: true, default: 'intermediate' },
    capacity:   { type: Number, required: true, min: 1, max: 1000 },
    filledSeats:{ type: Number, default: 0, min: 0 },
    chairId:    { type: Schema.Types.ObjectId, ref: 'User', default: null },
    isLocked:   { type: Boolean, default: false },
  },
  { optimisticConcurrency: true },
);

// filledSeats must never exceed capacity
committeeSchema.path('filledSeats').validate({
  validator(this: Committee, value: number) { return value <= this.capacity; },
  message: 'filledSeats cannot exceed capacity',
});

committeeSchema.index({ eventId: 1, abbr: 1 },  { unique: true, name: 'uniq_committee_event_abbr_active',  partialFilterExpression: { deletedAt: null } });
committeeSchema.index({ eventId: 1, name: 1 },  { unique: true, name: 'uniq_committee_event_name_active',  partialFilterExpression: { deletedAt: null } });
committeeSchema.index({ eventId: 1, isDeleted: 1 },             { name: 'committee_event_deleted_idx' });
committeeSchema.index({ eventId: 1, difficulty: 1, isDeleted: 1 }, { name: 'committee_event_difficulty_idx' });
committeeSchema.index({ eventId: 1, capacity: -1 },             { name: 'committee_event_capacity_idx' });
committeeSchema.index({ chairId: 1, isDeleted: 1 },             { name: 'committee_chair_idx' });

applyCommonSchemaBehavior(committeeSchema);

export const CommitteeModel = model<Committee>('Committee', committeeSchema);
export type CommitteeDocument = HydratedDocument<Committee>;
