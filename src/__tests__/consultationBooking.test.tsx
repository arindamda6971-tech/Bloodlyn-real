import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@/test-utils';
import { MemoryRouter } from 'react-router-dom';
import DoctorConsultScreen from '@/pages/DoctorConsultScreen';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ supabaseUserId: 'test-user-id' })
}));

describe('ConsultationBookingScreen replacement (DoctorConsultScreen)', () => {
  it('renders correctly without crashing', () => {
    const { container } = render(
      <MemoryRouter>
        <DoctorConsultScreen />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
