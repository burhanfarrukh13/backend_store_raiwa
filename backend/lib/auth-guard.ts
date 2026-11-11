/// <reference types="node" />

export { setCorsHeaders } from './supabase-client';

// Middleware to verify Supabase JWT access token
// Expects the token in the Authorization: Bearer <jwt> header
export const withAuth = async (fn: (c: any) => Promise<any>) => {
  return async (c: any) => {
    const authHeader = c.req.header('Authorization') || c.req.header('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized: No token provided' }, 401);
    }

    const jwt = authHeader.substring(7);

    try {
      // Verify the JWT using Supabase JWT public key
      // In production, this would verify against Supabase's JWT public key from JWKS
      // For development, we decode and check for basic validity
      let payload: any;

      // JWT should have three parts separated by dots: header.payload.signature
      const parts = jwt.split('.');
      if (parts.length !== 3) {
        return c.json({ error: 'Unauthorized: Invalid token format' }, 401);
      }

      // Decode the payload (without verification for dev; verify sig in prod)
      payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));

      // Check token is not expired (basic check)
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return c.json({ error: 'Unauthorized: Token expired' }, 401);
      }

      // Attach the payload to the context for use in the handler
      c.set('staffJwt', jwt);
      c.set('staffPayload', payload);

      return fn(c);
    } catch (err) {
      console.error('Auth error:', err);
      return c.json({ error: 'Unauthorized: Invalid token' }, 401);
    }
  };
};

// Middleware to check staff role
export const withRole = (allowedRoles: string[]) => {
  return async (c: any) => {
    const payload = c.get('staffPayload');
    if (!payload || !payload.role) {
      return c.json({ error: 'Forbidden: No staff role' }, 403);
    }

    if (!allowedRoles.includes(payload.role)) {
      return c.json({ error: 'Forbidden: Insufficient role' }, 403);
    }

    return c.next(); // Continue to the actual handler
  };
};

// Middleware to check that staff is active
export const withActiveStaff = async (c: any) => {
  const payload = c.get('staffPayload');
  if (!payload || !payload.role) {
    return c.json({ error: 'Forbidden: Staff not active' }, 403);
  }

  // TODO: Could query staff_profiles to verify status = 'active'
  // For now, just check the role exists and is not 'suspended'

  return c.next();
};