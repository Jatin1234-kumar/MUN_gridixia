import { Schema, type HydratedDocument, type Schema as MongooseSchema, Types } from 'mongoose';

export interface SoftDeleteFields {
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: Types.ObjectId | null;
}

export interface BaseDocument extends SoftDeleteFields {
  createdAt: Date;
  updatedAt: Date;
}

export const softDeleteSchemaFields = {
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null, index: true },
  deletedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
} as const;

export function applyCommonSchemaBehavior(schema: MongooseSchema): void {
  schema.set('timestamps', true);
  schema.set('minimize', false);
  schema.set('toJSON', {
    virtuals: true,
    transform(_doc, ret) {
      const transformed = ret as Record<string, unknown> & {
        _id?: { toString(): string };
        id?: string;
      };

      if (transformed._id != null) {
        transformed.id = transformed._id.toString();
        delete transformed._id;
      }

      return transformed;
    },
  });
  schema.set('toObject', {
    virtuals: true,
    transform(_doc, ret) {
      const transformed = ret as Record<string, unknown> & {
        _id?: { toString(): string };
        id?: string;
      };

      if (transformed._id != null) {
        transformed.id = transformed._id.toString();
        delete transformed._id;
      }

      return transformed;
    },
  });

  schema.add(softDeleteSchemaFields as never);
  schema.index({ isDeleted: 1, deletedAt: 1 }, { name: 'soft_delete_lookup_idx' });

  schema.pre(
    /^find/,
    function (
      this: { getOptions(): { includeDeleted?: boolean }; where(filter: object): void },
      next,
    ) {
      const options = this.getOptions();

      if (!options.includeDeleted) {
        this.where({ isDeleted: false, deletedAt: null });
      }

      next();
    },
  );

  schema.pre(
    'countDocuments',
    function (
      this: { getOptions(): { includeDeleted?: boolean }; where(filter: object): void },
      next,
    ) {
      const options = this.getOptions();

      if (!options.includeDeleted) {
        this.where({ isDeleted: false, deletedAt: null });
      }

      next();
    },
  );
}

export type DocumentOf<T> = HydratedDocument<T>;
