import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '@/test-utils';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LoginScreen from '@/pages/LoginScreen';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-123' } }),
}));

describe('LoginScreen redirect after auth', () => {
  it('redirects to the original `from` location after login (if present)', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: { pathname: '/cart' } } }]}> 
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/cart" element={<div>Cart page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/Cart page/i)).toBeInTheDocument());
  });
});
