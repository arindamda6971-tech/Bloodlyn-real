import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '@/test-utils';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TrackingScreen from '@/pages/TrackingScreen';

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ supabaseUserId: 'user-1' })
}));

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => {
  const chainable = {
    select: () => chainable,
    eq: () => chainable,
    order: () => chainable,
    single: async () => ({
      data: { id: 'order-1', status: 'assigned', delivery_partner_name: 'Rahul Sharma', delivery_partner_phone: '9876543210' }, error: null
    }),
    then: async (cb: any) => cb({ data: [], error: null })
  };
  return {
    supabase: {
      from: () => chainable,
      channel: () => ({ on: () => ({ subscribe: () => ({ unsubscribe: vi.fn() }) }) }),
      removeChannel: vi.fn(),
    }
  };
});

describe('TrackingScreen', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  it('renders tracking screen correctly', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/tracking/order-1']}>
          <Routes>
            <Route path="/tracking/:orderId" element={<TrackingScreen />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText(/Order Details/i)).toBeInTheDocument();
  });
});
