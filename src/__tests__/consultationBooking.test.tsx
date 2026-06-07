import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@/test-utils';
import { MemoryRouter } from 'react-router-dom';
import ConsultationBookingScreen from '@/pages/ConsultationBookingScreen';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ supabaseUserId: 'test-user-id' })
}));

describe('ConsultationBookingScreen', () => {
  it('renders correctly without crashing', () => {
    const { container } = render(
      <MemoryRouter>
        <ConsultationBookingScreen />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
