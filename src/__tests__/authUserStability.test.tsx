import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';

type AuthCallback = (event: string, session: { user: Record<string, unknown> } | null) => unknown;
const auth = vi.hoisted(() => ({ cb: null as AuthCallback | null }));
const emit = async (event: string, session: { user: Record<string, unknown> } | null) => {
  await act(async () => {
    await auth.cb?.(event, session);
  });
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb: AuthCallback) => {
        auth.cb = cb;
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signOut: () => Promise.resolve({}),
    },
  },
}));

import { AuthProvider, useAuth } from '@/hooks/useAuth';

const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-1',
  email: 'a@example.com',
  phone: '',
  updated_at: '2026-10-01T00:00:00Z',
  ...overrides,
});

describe('AuthProvider user stability (egress)', () => {
  let userChanges: number;

  const Probe = () => {
    const { user } = useAuth();
    useEffect(() => {
      if (user) userChanges++;
    }, [user]);
    return null;
  };

  beforeEach(() => {
    userChanges = 0;
  });

  it('keeps the same user object when Supabase re-emits an unchanged user (app resume, token refresh)', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await emit('SIGNED_IN', { user: makeUser() });
    await waitFor(() => expect(userChanges).toBe(1));

    // Each of these arrives with a freshly parsed object, as supabase-js does.
    await emit('SIGNED_IN', { user: makeUser() });
    await emit('TOKEN_REFRESHED', { user: makeUser() });
    await emit('SIGNED_IN', { user: makeUser() });

    expect(userChanges).toBe(1);
  });

  it('still applies real user changes (profile edit, different account)', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await emit('SIGNED_IN', { user: makeUser() });
    await waitFor(() => expect(userChanges).toBe(1));

    await emit('USER_UPDATED', { user: makeUser({ updated_at: '2026-10-02T00:00:00Z' }) });
    await waitFor(() => expect(userChanges).toBe(2));

    await emit('SIGNED_IN', { user: makeUser({ id: 'user-2' }) });
    await waitFor(() => expect(userChanges).toBe(3));
  });
});
