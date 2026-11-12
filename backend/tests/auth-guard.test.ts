import { describe, expect, it, vi } from 'vitest';
import { authenticateStaff } from '../lib/auth-guard';

describe('authenticateStaff', () => {
  it('rejects missing and malformed tokens without creating a database client', async () => {
    const factory = vi.fn();
    expect(await authenticateStaff(null, factory)).toMatchObject({ ok: false, status: 401 });
    expect(await authenticateStaff('Bearer not-a-jwt', factory)).toMatchObject({ ok: false, status: 401 });
    expect(factory).not.toHaveBeenCalled();
  });

  it('stops after the auth server rejects the signature', async () => {
    const client = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('invalid token') }) },
    };
    const factory = vi.fn(() => client as any);
    const result = await authenticateStaff('Bearer a.b.c', factory);
    expect(result).toMatchObject({ ok: false, status: 401 });
    expect(client.auth.getUser).toHaveBeenCalledWith('a.b.c');
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('denies inactive staff using a JWT-scoped client before any service-role client exists', async () => {
    const authClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
    };
    const profileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const userClient = { from: vi.fn(() => profileQuery) };
    const factory = vi.fn((token?: string) => token ? userClient as any : authClient as any);

    const result = await authenticateStaff('Bearer a.b.c', factory);
    expect(result).toMatchObject({ ok: false, status: 403 });
    expect(factory).toHaveBeenCalledTimes(2);
    expect(factory).toHaveBeenLastCalledWith('a.b.c');
    expect(profileQuery.eq).toHaveBeenNthCalledWith(1, 'id', 'user-1');
    expect(profileQuery.eq).toHaveBeenNthCalledWith(2, 'status', 'active');
  });

  it('uses the database role for an active staff member, not the JWT role claim', async () => {
    const authClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-2' } }, error: null }) },
    };
    const profileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'user-2', role: 'support', status: 'active' },
        error: null,
      }),
    };
    const userClient = { from: vi.fn(() => profileQuery) };
    const factory = vi.fn((token?: string) => token ? userClient as any : authClient as any);

    const result = await authenticateStaff('Bearer a.b.c', factory);
    expect(result).toMatchObject({ ok: true, staff: { id: 'user-2', role: 'support' } });
  });
});
