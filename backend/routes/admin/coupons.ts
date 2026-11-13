import { z } from 'zod';
import { crudHandler, isoDate, ntext } from '../../lib/admin-kit';

const fields = {
  code: z.string().trim().min(3).max(32).regex(/^[A-Za-z0-9_-]+$/, 'letters, digits, - and _ only').transform((value) => value.toUpperCase()),
  description: ntext(500),
  type: z.enum(['percentage', 'fixed']),
  discount_value: z.number().positive().max(100_000_000),
  minimum_order: z.number().min(0).max(100_000_000),
  maximum_uses: z.number().int().min(1).max(10_000_000).nullable(),
  start_date: isoDate,
  expiration_date: isoDate,
  status: z.enum(['active', 'inactive', 'expired']),
};

const { code, ...mutable } = fields;

export default crudHandler({
  table: 'coupons',
  create: z.object({ code, ...mutable }).partial().extend({ code, type: fields.type, discount_value: fields.discount_value }),
  // The code identifies the coupon in customer carts and cannot be changed after creation.
  update: z.object(mutable).partial(),
  touch: true,
  filters: ['status'],
  softDeletePatch: { status: 'inactive' },
  prepare: (row) => {
    if (row.type === 'percentage' && typeof row.discount_value === 'number' && row.discount_value > 100) {
      return 'A percentage discount cannot exceed 100';
    }
    if (row.start_date && row.expiration_date && new Date(row.expiration_date) <= new Date(row.start_date)) {
      return 'The expiration date must be after the start date';
    }
  },
});
