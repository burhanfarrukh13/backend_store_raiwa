import { z } from 'zod';
import { crudHandler, ntext } from '../../lib/admin-kit';

const fields = {
  question: z.string().trim().min(1).max(500),
  answer: z.string().trim().min(1).max(10000),
  category: ntext(100),
  sort_order: z.number().int().min(0).max(100000),
  status: z.enum(['draft', 'published']),
};

export default crudHandler({
  table: 'faqs',
  create: z.object(fields).partial().extend({ question: fields.question, answer: fields.answer }),
  touch: true,
  filters: ['category', 'status'],
  order: { column: 'sort_order', ascending: true },
});
