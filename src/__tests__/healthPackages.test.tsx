import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@/test-utils';
import { MemoryRouter } from 'react-router-dom';
import Index from '@/pages/Index';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ supabaseUserId: 'test-user-id' })
}));

describe('HealthPackages', () => {
  it('renders correctly without crashing', () => {
    const { container } = render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
