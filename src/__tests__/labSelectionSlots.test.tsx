import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@/test-utils';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ supabaseUserId: 'test-user-id', user: { id: 'test-user-id' } }),
}));

vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({
    items: [{ id: 't-1', name: 'CBC', price: 100, quantity: 1, labId: 'lab-1', vendorId: 'v-1' }],
    subtotal: 100,
    currentLabId: 'lab-1',
    currentLabName: 'Lab One',
    updateLabForItems: vi.fn(),
  }),
}));

vi.mock('@/hooks/useUserPincode', () => ({
  useUserPincode: () => ({ pincode: '110001' }),
  labServesPincode: () => true,
}));

vi.mock('@/integrations/supabase/client', () => {
  const chainable: any = {
    select: () => chainable, eq: () => chainable, in: () => chainable, order: () => chainable,
    maybeSingle: async () => ({ data: null, error: null }),
    then: (cb: any) => Promise.resolve({ data: [], error: null }).then(cb),
  };
  return {
    supabase: {
      from: () => chainable,
      functions: { invoke: async () => ({ data: { rows: [] }, error: null }) },
      channel: () => ({ on: () => ({ subscribe: () => ({ unsubscribe: vi.fn() }) }) }),
      removeChannel: vi.fn(),
    },
  };
});

describe('LabSelectionScreen', () => {
  it('renders without crashing', async () => {
    console.log('importing');
    const { default: LabSelectionScreen } = await import('@/pages/LabSelectionScreen');
    console.log('rendering');
    const { container } = render(<MemoryRouter><LabSelectionScreen /></MemoryRouter>);
    console.log('done');
    expect(container).toBeTruthy();
  });
}, 10000);
