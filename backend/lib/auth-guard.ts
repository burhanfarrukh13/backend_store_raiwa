import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseAnonClient } from './supabase-client';

export { setCorsHeaders } from './supabase-client';

export class AuthorizationError extends Error {
  constructor() {
    super('Forbidden');
    this.name = 'AuthorizationError';
  }
}

export type StaffIdentity = { id: string; role: string };

export async function authenticateStaff(
  authorization: string | null,
  clientFactory: (token?: string) => SupabaseClient = createSupabaseAnonClient,
): Promise<
  | { ok: true; token: string; staff: StaffIdentity }
  | { ok: false; status: 401 | 403; error: string }
> {
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
  const token = authorization.slice(7).trim();
  if (!token || token.split('.').length !== 3) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  try {
    const supabase = clientFactory();
    // Auth server verification validates signature, issuer, expiration, and revocation.
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return { ok: false, status: 401, error: 'Unauthorized' };

    const userClient = clientFactory(token);
    const { data: staff, error: staffError } = await userClient
      .from('staff_profiles')
      .select('id, role, status')
      .eq('id', user.id)
      .eq('status', 'active')
      .is('deleted_at', null)
      .maybeSingle();

    if (staffError || !staff || staff.id !== user.id) {
      return { ok: false, status: 403, error: 'Active staff account required' };
    }
    return { ok: true, token, staff: { id: staff.id, role: staff.role } };
  } catch (error) {
    console.error('Staff authorization failed:', error);
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
}

// Compatibility guard used by legacy route modules. The dispatcher has already
// verified the JWT and staff profile before these functions can run.
export const withAuth = async (context: any) => {
  if (!context?.staffPayload?.sub) throw new AuthorizationError();
  return null;
};

export const withRole = (allowedRoles: string[]) => async (context: any) => {
  if (!context?.staffPayload || !allowedRoles.includes(context.staffPayload.role)) {
    throw new AuthorizationError();
  }
  return null;
};

export const withActiveStaff = async (context: any) => {
  if (!context?.staffPayload?.sub) throw new AuthorizationError();
  return null;
};
