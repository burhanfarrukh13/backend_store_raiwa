import { z } from 'zod';
import { crudHandler, ntext } from '../../lib/admin-kit';

const fields = {
  name: z.string().trim().min(1).max(200),
  phone: ntext(40),
  notes: ntext(2000),
};

export default crudHandler({
  table: 'suppliers',
  create: z.object(fields).partial().extend({ name: fields.name }),
  touch: true,
  order: { column: 'name', ascending: true },
});
