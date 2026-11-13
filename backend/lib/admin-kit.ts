import { z } from 'zod';
import { createSupabaseServerClient } from './supabase-client';

// Shared building blocks for the admin API.
//
// Admin routes talk to Postgres with the service-role key (RLS is bypassed), so every
// route must (1) rely on the dispatcher's role matrix in ./access, (2) accept only
// whitelisted, validated fields, and (3) never leak raw database errors to the browser.

export type Ctx = any;

export const slug = z.string().trim().min(1).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'lowercase letters, digits and hyphens only');
export const money = z.number().min(0).max(100_000_000);
export const uuid = z.string().uuid();
export const ntext = (max: number) => z.string().trim().max(max).nullable();
export const isoDate = z.string().datetime({ offset: true }).nullable();

export function staffOf(c: Ctx): { id: string; role: string } {
  const payload = c.get('staffPayload') ?? c.staffPayload;
  return { id: String(payload?.sub ?? payload?.id ?? ''), role: String(payload?.role ?? '') };
}

export async function readBody(c: Ctx): Promise<any | undefined> {
  try {
    const body = await c.req.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? body : undefined;
  } catch {
    return undefined;
  }
}

export function badInput(c: Ctx, error: z.ZodError | string) {
  if (typeof error === 'string') return c.json({ error }, 400);
  const details = [...new Set(error.issues.map((issue) => issue.path.join('.') || 'body'))];
  return c.json({ error: 'Invalid input', details }, 400);
}

/** Translate a Postgres/PostgREST error into a safe response. */
export function dbFail(c: Ctx, error: { code?: string; message?: string } | null | undefined, fallback = 'Request failed') {
  const code = error?.code || '';
  if (code === '23505') return c.json({ error: 'A record with the same unique value already exists' }, 409);
  if (code === '23503') return c.json({ error: 'A referenced record does not exist, or this record is still in use' }, 409);
  if (['23502', '23514', '22P02', '22007', '22003', '22023'].includes(code)) {
    return c.json({ error: 'One or more values are invalid' }, 400);
  }
  console.error('Admin database error:', c.req?.method, code, error?.message);
  return c.json({ error: fallback }, 500);
}

export function getSupabase(): any {
  return createSupabaseServerClient();
}

export type CrudConfig = {
  table: string;
  /** Primary key column (default "id"). */
  pk?: string;
  /** Columns/embeds returned to the client (default "*"). */
  select?: string;
  /** Fields accepted on create. `null` disables POST-create. */
  create?: z.ZodObject<any> | null;
  /** Fields accepted on update. Default: create.partial(). `null` disables PUT. */
  update?: z.ZodObject<any> | null;
  /** Soft delete through deleted_at (default true). */
  softDelete?: boolean;
  /** Extra columns written together with deleted_at on soft delete. */
  softDeletePatch?: Record<string, unknown>;
  allowDelete?: boolean;
  /** Set updated_at on update (only for tables that have the column). */
  touch?: boolean;
  /** Query parameters usable as exact-match list filters. */
  filters?: string[];
  order?: { column: string; ascending?: boolean };
  limit?: number;
  createDefaults?: Record<string, unknown>;
  injectOnCreate?: (c: Ctx) => Record<string, unknown>;
  /** Cross-field checks / derived columns. Return a string to reject with HTTP 400. */
  prepare?: (row: Record<string, any>, mode: 'create' | 'update', c: Ctx) => string | void;
  afterCreate?: (args: { c: Ctx; supabase: any; row: any; input: any }) => Promise<Response | void>;
  /** POST ?action=name handlers. */
  actions?: Record<string, (args: { c: Ctx; supabase: any; id: string; body: any }) => Promise<Response>>;
};

export function crudHandler(cfg: CrudConfig) {
  const pk = cfg.pk ?? 'id';
  const select = cfg.select ?? '*';
  const soft = cfg.softDelete !== false;

  return async function handler(c: Ctx): Promise<Response> {
    const method: string = c.req.method;
    let supabase: any;
    try {
      supabase = getSupabase();
    } catch {
      return c.json({ error: 'Server configuration error' }, 500);
    }
    const id = String(c.req.query('id') || '');

    if (method === 'GET') {
      let query = supabase.from(cfg.table).select(select);
      if (soft) query = query.is('deleted_at', null);
      if (id) {
        const { data, error } = await query.eq(pk, id).maybeSingle();
        if (error) return dbFail(c, error, 'Unable to load record');
        if (!data) return c.json({ error: 'Not found' }, 404);
        return c.json({ data }, 200);
      }
      for (const name of cfg.filters ?? []) {
        const value = String(c.req.query(name) || '');
        if (value) query = query.eq(name, value);
      }
      const { data, error } = await query
        .order(cfg.order?.column ?? 'created_at', { ascending: cfg.order?.ascending ?? false })
        .limit(cfg.limit ?? 200);
      if (error) return dbFail(c, error, 'Unable to load records');
      return c.json({ data }, 200);
    }

    if (method === 'POST') {
      const body = await readBody(c);
      const action = String(c.req.query('action') || '');
      if (action) {
        const run = cfg.actions?.[action];
        if (!run) return c.json({ error: 'Unknown action' }, 400);
        return run({ c, supabase, id, body: body ?? {} });
      }
      if (!cfg.create) return c.json({ error: 'Method not allowed' }, 405);
      if (body === undefined) return badInput(c, 'A JSON object body is required');
      const parsed = cfg.create.safeParse(body);
      if (!parsed.success) return badInput(c, parsed.error);
      const row: Record<string, any> = { ...cfg.createDefaults, ...parsed.data, ...cfg.injectOnCreate?.(c) };
      const rejection = cfg.prepare?.(row, 'create', c);
      if (rejection) return badInput(c, rejection);
      const { data, error } = await supabase.from(cfg.table).insert(row).select(select).single();
      if (error) return dbFail(c, error, 'Unable to create record');
      if (cfg.afterCreate) {
        const early = await cfg.afterCreate({ c, supabase, row: data, input: parsed.data });
        if (early) return early;
      }
      return c.json({ data }, 201);
    }

    if (method === 'PUT' || method === 'PATCH') {
      if (!id) return badInput(c, 'id is required');
      const schema = cfg.update === undefined ? cfg.create?.partial() : cfg.update;
      if (!schema) return c.json({ error: 'Method not allowed' }, 405);
      const body = await readBody(c);
      if (body === undefined) return badInput(c, 'A JSON object body is required');
      const parsed = schema.safeParse(body);
      if (!parsed.success) return badInput(c, parsed.error);
      const patch: Record<string, any> = { ...parsed.data };
      if (Object.keys(patch).length === 0) return badInput(c, 'No changes supplied');
      const rejection = cfg.prepare?.(patch, 'update', c);
      if (rejection) return badInput(c, rejection);
      if (cfg.touch) patch.updated_at = new Date().toISOString();
      let query = supabase.from(cfg.table).update(patch).eq(pk, id);
      if (soft) query = query.is('deleted_at', null);
      const { data, error } = await query.select(select).maybeSingle();
      if (error) return dbFail(c, error, 'Unable to update record');
      if (!data) return c.json({ error: 'Not found' }, 404);
      return c.json({ data }, 200);
    }

    if (method === 'DELETE') {
      if (cfg.allowDelete === false) return c.json({ error: 'Method not allowed' }, 405);
      if (!id) return badInput(c, 'id is required');
      let query = soft
        ? supabase.from(cfg.table).update({ deleted_at: new Date().toISOString(), ...cfg.softDeletePatch }).eq(pk, id).is('deleted_at', null)
        : supabase.from(cfg.table).delete().eq(pk, id);
      const { data, error } = await query.select(pk).maybeSingle();
      if (error) return dbFail(c, error, 'Unable to delete record');
      if (!data) return c.json({ error: 'Not found' }, 404);
      return c.json({ success: true }, 200);
    }

    return c.json({ error: 'Method not allowed' }, 405);
  };
}

/** Public URL of an object in the public "media" bucket. */
export function mediaPublicUrl(path: string): string {
  return `${(process.env.SUPABASE_URL || '').replace(/\/+$/, '')}/storage/v1/object/public/media/${path}`;
}
