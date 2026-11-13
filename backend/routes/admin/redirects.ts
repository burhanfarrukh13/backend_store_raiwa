import { z } from 'zod';
import { crudHandler } from '../../lib/admin-kit';

const fields = {
  from_path: z.string().trim().min(1).max(500).regex(/^\/\S*$/, 'must start with / and contain no spaces'),
  to_path: z.string().trim().min(1).max(2000).regex(/^(\/|https?:\/\/)\S*$/, 'must be a path or an http(s) URL'),
  type: z.enum(['301', '302']),
  status: z.enum(['active', 'disabled']),
};

export default crudHandler({
  table: 'redirects',
  create: z.object(fields).partial().extend({ from_path: fields.from_path, to_path: fields.to_path, type: fields.type }),
  touch: true,
  filters: ['status'],
  prepare: (row) => {
    if (row.from_path && row.to_path && row.from_path === row.to_path) return 'A redirect cannot point to itself';
  },
});
