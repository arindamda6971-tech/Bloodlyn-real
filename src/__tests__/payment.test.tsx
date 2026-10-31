import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test-utils';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CartScreen from '@/pages/CartScreen';

// Mock useCart for CartScreen
vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({
    items: [{ id: 'test-1', name: 'CBC', price: 300, quantity: 1 }],
    refreshItemRules: () => {},
    subtotal: 300,
    currentLabId: 'lab-1',
    isLoading: false,
    updateFamilyMember: vi.fn(),
  })
}));

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ supabaseUserId: 'user-1' }) }));

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => {
  const chainable = {
    select: () => chainable,
    eq: () => chainable,
    order: () => chainable,
    maybeSingle: async () => ({ data: { full_name: 'John', date_of_birth: '1990-01-01', gender: 'Male', phone: '9876543210' }, error: null }),
    then: async (cb: any) => cb({ data: [{ id: 'addr-1', address_line1: '123 Main St', city: 'Testville', is_default: true }], error: null }),
  };
  return {
    supabase: {
      from: () => chainable,
      channel: () => ({ on: () => ({ subscribe: () => ({ unsubscribe: vi.fn() }) }) }),
      removeChannel: vi.fn(),
    }
  };
});

describe('CartScreen', () => {
  it('renders correctly', async () => {
    render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartScreen />} />
        </Routes>
      </MemoryRouter>
    );

    const checkoutBtn = await screen.findByRole('button', { name: /Checkout/i });
    expect(checkoutBtn).toBeInTheDocument();
  });
});
